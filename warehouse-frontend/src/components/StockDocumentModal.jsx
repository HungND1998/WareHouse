import { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client';
import Modal from './Modal';
import { formatMoney, formatNumber, formatDateTime } from './Badge';

function emptyItem() {
  return { product_id: '', quantity: 1, price: '' };
}

/**
 * Component tạo phiếu chứng từ kho dùng chung (Nhập kho / Xuất kho)
 * @param {'in' | 'out'} type - Loại phiếu ('in': Nhập kho, 'out': Xuất kho)
 * @param {boolean} open - Trạng thái mở modal
 * @param {Function} onClose - Hàm đóng modal
 * @param {Function} onSuccess - Callback khi tạo phiếu thành công
 * @param {Array} warehouses - Danh sách kho hàng
 * @param {Array} products - Danh sách sản phẩm
 * @param {Array} [suppliers] - Danh sách nhà cung cấp (chỉ dùng cho type='in')
 * @param {Function} pushToast - Hàm bắn thông báo toast
 */
export default function StockDocumentModal({
  type = 'out',
  open,
  onClose,
  onSuccess,
  warehouses = [],
  products = [],
  suppliers = [],
  pushToast,
}) {
  const isIn = type === 'in';
  const docTitle = isIn ? 'Tạo phiếu nhập kho' : 'Tạo phiếu xuất kho';
  const codePrefix = isIn ? 'PN' : 'PX';

  const [saving, setSaving] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');
  const [partnerValue, setPartnerValue] = useState(''); // supplier_id nếu 'in', customer_name nếu 'out'
  const [note, setNote] = useState('');
  const [items, setItems] = useState([emptyItem()]);
  const [warehouseInventory, setWarehouseInventory] = useState({});

  // Reset form khi mở modal
  useEffect(() => {
    if (open) {
      setWarehouseId(warehouses[0]?.id || '');
      setPartnerValue('');
      setNote('');
      setItems([emptyItem()]);
    }
  }, [open, warehouses]);

  // Lấy tồn kho theo kho xuất được chọn (đặc biệt quan trọng cho Xuất kho)
  useEffect(() => {
    if (!warehouseId) {
      setWarehouseInventory({});
      return;
    }
    api
      .get('/inventory', { warehouse_id: warehouseId })
      .then((res) => {
        const map = {};
        (res.data || []).forEach((inv) => {
          map[inv.product_id] = inv.quantity;
        });
        setWarehouseInventory(map);
      })
      .catch(() => setWarehouseInventory({}));
  }, [warehouseId]);

  function getStock(productId) {
    if (!productId || !warehouseId) return 0;
    return warehouseInventory[productId] ?? 0;
  }

  function updateItem(idx, patch) {
    setItems((cur) =>
      cur.map((it, i) => {
        if (i !== idx) return it;
        const updated = { ...it, ...patch };

        // Tự động gợi ý giá khi chọn sản phẩm
        if (patch.product_id !== undefined && patch.product_id !== it.product_id) {
          const selectedProd = products.find((p) => String(p.id) === String(patch.product_id));
          if (selectedProd) {
            if (isIn) {
              // Nhập kho: ưu tiên giá vốn cost_price
              updated.price = selectedProd.cost_price ?? 0;
            } else {
              // Xuất kho: ưu tiên giá bán sale_price, fallback cost_price
              updated.price = selectedProd.sale_price || selectedProd.cost_price || 0;
            }
            if (!updated.quantity || Number(updated.quantity) <= 0) {
              updated.quantity = 1;
            }
          }
        }
        return updated;
      })
    );
  }

  function addRow() {
    setItems((cur) => [...cur, emptyItem()]);
  }

  function removeRow(idx) {
    if (items.length <= 1) {
      setItems([emptyItem()]);
      return;
    }
    setItems((cur) => cur.filter((_, i) => i !== idx));
  }

  // Kiểm tra cảnh báo vượt tồn kho khi xuất
  const hasStockError = useMemo(() => {
    if (isIn) return false;
    return items.some((it) => {
      if (!it.product_id || !it.quantity) return false;
      const available = getStock(it.product_id);
      return Number(it.quantity) > available;
    });
  }, [isIn, items, warehouseInventory, warehouseId]);

  // Thống kê tổng tiền và số lượng
  const totalAmount = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.price) || 0), 0);
  }, [items]);

  const totalQuantity = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  }, [items]);

  const validItemsCount = useMemo(() => {
    return items.filter((it) => it.product_id && Number(it.quantity) > 0).length;
  }, [items]);

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    if (!warehouseId) {
      return pushToast?.(isIn ? 'Vui lòng chọn kho nhập hàng.' : 'Vui lòng chọn kho xuất hàng.', 'error');
    }

    const cleanItems = items
      .filter((it) => it.product_id && Number(it.quantity) > 0)
      .map((it) => ({
        product_id: Number(it.product_id),
        quantity: Number(it.quantity),
        price: Number(it.price) || 0,
      }));

    if (cleanItems.length === 0) {
      return pushToast?.('Cần ít nhất 1 dòng sản phẩm hợp lệ (chọn sản phẩm và số lượng > 0).', 'error');
    }

    // Kiểm tra tồn kho trước khi gửi yêu cầu xuất kho
    if (!isIn) {
      for (const it of cleanItems) {
        const available = getStock(it.product_id);
        if (it.quantity > available) {
          const prod = products.find((p) => p.id === it.product_id);
          return pushToast?.(
            `Sản phẩm "${prod?.name || it.product_id}" không đủ tồn kho (tồn: ${available}, yêu cầu: ${it.quantity}).`,
            'error'
          );
        }
      }
    }

    setSaving(true);
    try {
      if (isIn) {
        await api.post('/stock-in', {
          warehouse_id: Number(warehouseId),
          supplier_id: partnerValue ? Number(partnerValue) : null,
          note: note?.trim() || null,
          items: cleanItems,
        });
        pushToast?.('Tạo phiếu nhập kho thành công!');
      } else {
        await api.post('/stock-out', {
          warehouse_id: Number(warehouseId),
          customer_name: partnerValue?.trim() || null,
          note: note?.trim() || null,
          items: cleanItems,
        });
        pushToast?.('Tạo phiếu xuất kho thành công!');
      }

      onClose();
      onSuccess?.();
    } catch (err) {
      pushToast?.(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <Modal
      title={docTitle}
      wide={880}
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="text-muted" style={{ fontSize: 13 }}>
              Mặt hàng: <strong className="mono" style={{ color: 'var(--ink)' }}>{validItemsCount}</strong>
            </span>
            <span className="text-muted" style={{ fontSize: 13 }}>·</span>
            <span className="text-muted" style={{ fontSize: 13 }}>
              Tổng SL: <strong className="mono" style={{ color: 'var(--ink)' }}>{formatNumber(totalQuantity)}</strong>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Hủy bỏ
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={saving || hasStockError || validItemsCount === 0}
              style={{ minWidth: 140, fontWeight: 700 }}
            >
              {saving ? 'Đang lưu…' : isIn ? '✓ Hoàn tất nhập kho' : '✓ Hoàn tất xuất kho'}
            </button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit}>
        {/* 1. Card thông tin chung */}
        <div className="form-card">
          <div className="form-card-title">
            <span>1. Thông tin phiếu {isIn ? 'nhập kho' : 'xuất kho'}</span>
            <span className="tag">MÃ TỰ ĐỘNG TẠO: {codePrefix}-…</span>
          </div>

          <div className="grid-3">
            <div className="field" style={{ marginBottom: 0 }}>
              <label>
                {isIn ? 'Kho nhập hàng' : 'Kho xuất hàng'} <span style={{ color: 'var(--warn)' }}>*</span>
              </label>
              <select
                value={warehouseId}
                required
                onChange={(e) => setWarehouseId(e.target.value)}
                style={{ fontWeight: 600 }}
              >
                <option value="">— Chọn kho hàng —</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    🏢 {w.name} {w.location || w.address ? `(${w.location || w.address})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <label>{isIn ? 'Nhà cung cấp' : 'Khách hàng / Đối tác'}</label>
              {isIn ? (
                <select value={partnerValue} onChange={(e) => setPartnerValue(e.target.value)}>
                  <option value="">— Chọn nhà cung cấp (nếu có) —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={partnerValue}
                  onChange={(e) => setPartnerValue(e.target.value)}
                  placeholder="VD: Cửa hàng ABC, Đại lý XYZ..."
                />
              )}
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <label>Thời gian tạo</label>
              <input
                type="text"
                readOnly
                disabled
                value={formatDateTime(new Date())}
                style={{ background: '#eef0ec', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>

          <div className="field" style={{ marginTop: 12, marginBottom: 0 }}>
            <label>Ghi chú</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={isIn ? 'Số hóa đơn, hợp đồng mua hàng, ghi chú nhập...' : 'Lý do xuất kho, số hợp đồng, phương thức vận chuyển...'}
            />
          </div>
        </div>

        {/* Cảnh báo lỗi vượt tồn kho (khi xuất) */}
        {!isIn && hasStockError && (
          <div className="alert-box alert-danger">
            <span>⚠️</span>
            <span>
              <strong>Cảnh báo:</strong> Có mặt hàng có số lượng xuất vượt quá tồn kho khả dụng trong kho này. Vui lòng kiểm tra lại.
            </span>
          </div>
        )}

        {/* 2. Card danh sách sản phẩm */}
        <div className="form-card" style={{ marginBottom: 14 }}>
          <div className="form-card-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>2. Danh sách hàng {isIn ? 'nhập' : 'xuất'}</span>
              <span className="badge badge-neutral" style={{ textTransform: 'none' }}>
                {items.length} dòng
              </span>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={addRow}
              style={{ fontSize: 12, padding: '4px 10px' }}
            >
              + Thêm dòng hàng
            </button>
          </div>

          <div className="items-table-container">
            <table className="items-table">
              <thead>
                <tr>
                  <th className="row-num">#</th>
                  <th style={{ minWidth: 260 }}>Sản phẩm / Mặt hàng</th>
                  <th style={{ width: 110, textAlign: 'center' }}>Tồn kho</th>
                  <th style={{ width: 120 }}>{isIn ? 'Số lượng nhập' : 'Số lượng xuất'}</th>
                  <th style={{ width: 140 }}>Đơn giá (đ)</th>
                  <th style={{ width: 130, textAlign: 'right' }}>Thành tiền</th>
                  <th style={{ width: 44, textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const prod = products.find((p) => String(p.id) === String(it.product_id));
                  const stockAvailable = it.product_id ? getStock(it.product_id) : 0;
                  const qty = Number(it.quantity) || 0;
                  const price = Number(it.price) || 0;
                  const lineTotal = qty * price;
                  const isOverStock = !isIn && it.product_id && warehouseId && qty > stockAvailable;

                  return (
                    <tr key={idx}>
                      {/* STT */}
                      <td className="row-num">{idx + 1}</td>

                      {/* Chọn sản phẩm */}
                      <td>
                        <select
                          value={it.product_id}
                          onChange={(e) => updateItem(idx, { product_id: e.target.value })}
                        >
                          <option value="">— Chọn sản phẩm —</option>
                          {products.map((p) => {
                            const curStock = warehouseId ? (warehouseInventory[p.id] ?? 0) : p.total_stock;
                            return (
                              <option key={p.id} value={p.id}>
                                [{p.sku}] {p.name} {p.unit ? `(${p.unit})` : ''} — Tồn: {curStock}
                              </option>
                            );
                          })}
                        </select>
                        {prod && (
                          <div style={{ display: 'flex', gap: 6, marginTop: 4, fontSize: 11.5, color: 'var(--text-faint)' }}>
                            <span>Đơn vị: <strong>{prod.unit || 'cái'}</strong></span>
                            {prod.category_name && <span>· Nhóm: <strong>{prod.category_name}</strong></span>}
                          </div>
                        )}
                      </td>

                      {/* Tồn kho tại kho đã chọn */}
                      <td style={{ textAlign: 'center' }}>
                        {!warehouseId ? (
                          <span className="text-faint" style={{ fontSize: 12 }}>Chọn kho</span>
                        ) : !it.product_id ? (
                          <span className="text-faint" style={{ fontSize: 12 }}>—</span>
                        ) : stockAvailable > 0 ? (
                          <span className={`stock-pill ${stockAvailable <= 5 ? 'low' : 'available'}`}>
                            {formatNumber(stockAvailable)} {prod?.unit || ''}
                          </span>
                        ) : (
                          <span className="stock-pill empty">Hết hàng (0)</span>
                        )}
                      </td>

                      {/* Số lượng */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <input
                            type="number"
                            min="1"
                            placeholder="SL"
                            className={isOverStock ? 'is-invalid' : ''}
                            value={it.quantity}
                            onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                            style={{ fontWeight: 600 }}
                          />
                          {!isIn && stockAvailable > 0 && (
                            <button
                              type="button"
                              onClick={() => updateItem(idx, { quantity: stockAvailable })}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--info)',
                                fontSize: 10.5,
                                padding: '0 2px',
                                textAlign: 'left',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                              }}
                            >
                              Tối đa ({stockAvailable})
                            </button>
                          )}
                          {isOverStock && (
                            <span style={{ fontSize: 10.5, color: 'var(--warn)', fontWeight: 600 }}>
                              Vượt tồn ({stockAvailable})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Đơn giá */}
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="500"
                          placeholder="0"
                          value={it.price}
                          onChange={(e) => updateItem(idx, { price: e.target.value })}
                          style={{ fontFamily: 'var(--font-mono)' }}
                        />
                        {price > 0 && (
                          <div style={{ fontSize: 10.5, color: 'var(--text-faint)', marginTop: 2, textAlign: 'right' }}>
                            {formatMoney(price)}
                          </div>
                        )}
                      </td>

                      {/* Thành tiền */}
                      <td style={{ textAlign: 'right' }}>
                        <strong className="mono" style={{ fontSize: 13, color: lineTotal > 0 ? 'var(--ink)' : 'var(--text-faint)' }}>
                          {formatMoney(lineTotal)}
                        </strong>
                      </td>

                      {/* Xóa dòng */}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-icon-del"
                          onClick={() => removeRow(idx)}
                          title="Xóa dòng này"
                          disabled={items.length === 1 && !it.product_id && !it.price}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={addRow}>
              + Thêm dòng sản phẩm
            </button>
            {items.length > 1 && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setItems([emptyItem()])}
                style={{ color: 'var(--text-faint)' }}
              >
                Xóa tất cả các dòng
              </button>
            )}
          </div>
        </div>

        {/* 3. Khung tổng kết nổi bật */}
        <div className="order-summary-box">
          <div className="order-summary-left">
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Số mặt hàng</div>
              <strong style={{ fontSize: 16 }}>{validItemsCount} sản phẩm</strong>
            </div>
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tổng số lượng</div>
              <strong style={{ fontSize: 16 }}>{formatNumber(totalQuantity)} chiếc/đơn vị</strong>
            </div>
          </div>
          <div className="order-summary-right">
            <div className="label">Tổng giá trị phiếu {isIn ? 'nhập' : 'xuất'}</div>
            <div className="amount">{formatMoney(totalAmount)}</div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
