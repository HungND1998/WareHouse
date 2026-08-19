import { useEffect, useState } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { formatMoney, formatDate } from '../components/Badge';

function emptyItem() {
  return { product_id: '', quantity: '', price: '' };
}

export default function StockOut() {
  const { push } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(null);
  const [saving, setSaving] = useState(false);

  const [warehouseId, setWarehouseId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [note, setNote] = useState('');
  const [items, setItems] = useState([emptyItem()]);

  function load() {
    setLoading(true);
    api.get('/stock-out').then((res) => setRows(res.data)).catch((err) => push(err.message, 'error')).finally(() => setLoading(false));
  }

  useEffect(load, []);
  useEffect(() => {
    api.get('/warehouses').then((res) => setWarehouses(res.data));
    api.get('/products', { limit: 500 }).then((res) => setProducts(res.data));
  }, []);

  function openCreate() {
    setWarehouseId(warehouses[0]?.id || '');
    setCustomerName('');
    setNote('');
    setItems([emptyItem()]);
    setModalOpen(true);
  }

  function updateItem(idx, patch) {
    setItems((cur) => cur.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function addRow() {
    setItems((cur) => [...cur, emptyItem()]);
  }
  function removeRow(idx) {
    setItems((cur) => cur.filter((_, i) => i !== idx));
  }

  const total = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.price) || 0), 0);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!warehouseId) return push('Vui lòng chọn kho xuất.', 'error');
    const cleanItems = items
      .filter((it) => it.product_id && Number(it.quantity) > 0)
      .map((it) => ({ product_id: Number(it.product_id), quantity: Number(it.quantity), price: Number(it.price) || 0 }));
    if (cleanItems.length === 0) return push('Cần ít nhất 1 sản phẩm hợp lệ.', 'error');

    setSaving(true);
    try {
      await api.post('/stock-out', { warehouse_id: Number(warehouseId), customer_name: customerName, note, items: cleanItems });
      push('Đã tạo phiếu xuất kho.');
      setModalOpen(false);
      load();
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function openDetail(row) {
    const res = await api.get(`/stock-out/${row.id}`);
    setDetailOpen(res.data);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Xuất hàng khỏi kho</div>
          <h1>Phiếu xuất kho</h1>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Tạo phiếu xuất</button>
      </div>

      {loading && <div className="loading-bar" style={{ marginBottom: 16 }} />}

      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã phiếu</th>
                <th>Kho xuất</th>
                <th>Khách hàng</th>
                <th>Người tạo</th>
                <th className="num">Tổng tiền</th>
                <th>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && (
                <tr className="empty-row"><td colSpan={6}>Chưa có phiếu xuất nào.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} onClick={() => openDetail(r)} style={{ cursor: 'pointer' }}>
                  <td><span className="sku-chip">{r.code}</span></td>
                  <td>{r.warehouse_name}</td>
                  <td className="text-muted">{r.customer_name || '—'}</td>
                  <td className="text-muted">{r.created_by || '—'}</td>
                  <td className="num" style={{ fontWeight: 700 }}>{formatMoney(r.total_amount)}</td>
                  <td className="text-faint" style={{ fontSize: 12.5 }}>{formatDate(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <Modal
          title="Tạo phiếu xuất kho"
          wide
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <div style={{ marginRight: 'auto', alignSelf: 'center', fontSize: 13 }}>
                Tổng: <strong className="mono">{formatMoney(total)}</strong>
              </div>
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Đang lưu…' : 'Tạo phiếu'}
              </button>
            </>
          }
        >
          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <div className="field">
                <label>Kho xuất *</label>
                <select value={warehouseId} required onChange={(e) => setWarehouseId(e.target.value)}>
                  <option value="">— Chọn kho —</option>
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Khách hàng</label>
                <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Tên khách hàng" />
              </div>
            </div>
            <div className="field">
              <label>Ghi chú</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Danh sách hàng xuất
            </label>
            <div style={{ marginTop: 8 }}>
              {items.map((it, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <select value={it.product_id} onChange={(e) => updateItem(idx, { product_id: e.target.value })}>
                    <option value="">— Chọn sản phẩm —</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name} (tồn: {p.total_stock})</option>)}
                  </select>
                  <input type="number" min="1" placeholder="SL" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: e.target.value })} />
                  <input type="number" min="0" placeholder="Đơn giá" value={it.price} onChange={(e) => updateItem(idx, { price: e.target.value })} />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeRow(idx)} disabled={items.length === 1}>×</button>
                </div>
              ))}
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={addRow}>+ Thêm dòng hàng</button>
          </form>
        </Modal>
      )}

      {detailOpen && (
        <Modal title={`Phiếu xuất ${detailOpen.code}`} onClose={() => setDetailOpen(null)}>
          <div className="field-hint" style={{ marginBottom: 12 }}>
            Kho: <strong>{warehouses.find((w) => w.id === detailOpen.warehouse_id)?.name}</strong> · {formatDate(detailOpen.created_at)}
          </div>
          <table className="data-table">
            <thead><tr><th>SKU</th><th>Sản phẩm</th><th className="num">SL</th><th className="num">Đơn giá</th></tr></thead>
            <tbody>
              {detailOpen.items.map((it) => (
                <tr key={it.id}>
                  <td><span className="sku-chip">{it.sku}</span></td>
                  <td>{it.product_name}</td>
                  <td className="num">{it.quantity}</td>
                  <td className="num">{formatMoney(it.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {detailOpen.note && <div className="field-hint" style={{ marginTop: 12 }}>Ghi chú: {detailOpen.note}</div>}
        </Modal>
      )}
    </div>
  );
}
