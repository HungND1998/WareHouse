import Modal from './Modal';
import { formatMoney, formatDate, formatNumber, DateTime } from './Badge';

/**
 * Component xem chi tiết phiếu chứng từ kho dùng chung (Nhập kho / Xuất kho)
 * @param {'in' | 'out'} type - 'in' (Phiếu nhập) hoặc 'out' (Phiếu xuất)
 * @param {Object} data - Dữ liệu chi tiết phiếu
 * @param {Array} warehouses - Danh sách kho hàng để map tên
 * @param {Function} onClose - Hàm đóng modal
 */
export default function StockDocumentDetailModal({ type = 'out', data, warehouses = [], suppliers = [], onClose }) {
  if (!data) return null;

  const isIn = type === 'in';
  const typeLabel = isIn ? 'Phiếu nhập kho' : 'Phiếu xuất kho';
  const partnerLabel = isIn ? 'Nhà cung cấp' : 'Khách hàng / Đối tác';
  const partnerValue = isIn
    ? data.supplier_name || suppliers.find((s) => Number(s.id) === Number(data.supplier_id))?.name
    : data.customer_name;
  const warehouseName =
    data.warehouse_name || warehouses.find((w) => Number(w.id) === Number(data.warehouse_id))?.name || '—';

  return (
    <Modal
      title={`Chi tiết ${typeLabel}: ${data.code}`}
      wide={800}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => window.print()}
            style={{ marginRight: 'auto' }}
          >
            🖨 In phiếu
          </button>
          <button type="button" className="btn btn-ink" onClick={onClose}>
            Đóng
          </button>
        </>
      }
    >
      {/* Header Metadata Card */}
      <div className="detail-header-card">
        <div className="detail-meta-item">
          <div className="meta-label">Mã chứng từ</div>
          <div className="meta-val">
            <span className="sku-chip">{data.code}</span>
          </div>
        </div>
        <div className="detail-meta-item">
          <div className="meta-label">{isIn ? 'Kho nhập' : 'Kho xuất'}</div>
          <div className="meta-val">{warehouseName}</div>
        </div>
        <div className="detail-meta-item">
          <div className="meta-label">{partnerLabel}</div>
          <div className="meta-val">{partnerValue || '—'}</div>
        </div>
        <div className="detail-meta-item">
          <div className="meta-label">Thời gian lập</div>
          <div className="meta-val" style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>
            <DateTime value={data.created_at} prefix="Lập phiếu" />
          </div>
        </div>
        <div className="detail-meta-item">
          <div className="meta-label">Người lập phiếu</div>
          <div className="meta-val">{data.created_by || 'Hệ thống'}</div>
        </div>
        <div className="detail-meta-item">
          <div className="meta-label">Trạng thái</div>
          <div className="meta-val">
            <span className={`badge ${isIn ? 'badge-info' : 'badge-ok'}`}>
              {isIn ? 'Đã nhập kho' : 'Đã xuất kho'}
            </span>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 16 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40, textAlign: 'center' }}>#</th>
              <th>Mã SKU</th>
              <th>Tên sản phẩm</th>
              <th className="num" style={{ width: 100 }}>Số lượng</th>
              <th className="num" style={{ width: 130 }}>Đơn giá</th>
              <th className="num" style={{ width: 140 }}>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {data.items && data.items.length > 0 ? (
              data.items.map((it, i) => (
                <tr key={it.id || i}>
                  <td style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 12.5, fontWeight: 600 }}>{i + 1}</td>
                  <td>
                    <span className="sku-chip">{it.sku}</span>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--ink)', fontSize: 13.5 }}>{it.product_name}</strong>
                  </td>
                  <td className="num">
                    <strong style={{ color: 'var(--ink)', fontSize: 13.5 }}>{formatNumber(it.quantity)}</strong>
                  </td>
                  <td className="num" style={{ color: 'var(--text-muted)' }}>{formatMoney(it.price)}</td>
                  <td className="num" style={{ fontWeight: 800, color: 'var(--ink)', fontSize: 14 }}>
                    {formatMoney((it.quantity || 0) * (it.price || 0))}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-faint)' }}>
                  Không có dữ liệu mặt hàng
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Note & Summary */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          {data.note && (
            <div style={{ background: '#f8fafc', border: '1px solid var(--line-strong)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', fontSize: 13 }}>
              <div className="mono" style={{ fontSize: 11.5, marginBottom: 4, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Ghi chú</div>
              <div style={{ color: 'var(--ink)', fontWeight: 500 }}>{data.note}</div>
            </div>
          )}
        </div>
        <div style={{ background: '#f8fafc', border: '1.5px solid var(--line-strong)', borderRadius: 'var(--radius)', padding: '14px 20px', minWidth: 260, textAlign: 'right' }}>
          <div className="mono" style={{ fontSize: 11.5, textTransform: 'uppercase', marginBottom: 4, color: 'var(--text-muted)', fontWeight: 700 }}>
            Tổng cộng thanh toán
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: 'var(--ink)' }}>
            {formatMoney(data.total_amount)}
          </div>
        </div>
      </div>
    </Modal>
  );
}
