import Modal from './Modal';
import { formatMoney, formatDate, formatNumber } from './Badge';

/**
 * Component xem chi tiết phiếu chứng từ kho dùng chung (Nhập kho / Xuất kho)
 * @param {'in' | 'out'} type - 'in' (Phiếu nhập) hoặc 'out' (Phiếu xuất)
 * @param {Object} data - Dữ liệu chi tiết phiếu
 * @param {Array} warehouses - Danh sách kho hàng để map tên
 * @param {Function} onClose - Hàm đóng modal
 */
export default function StockDocumentDetailModal({ type = 'out', data, warehouses = [], onClose }) {
  if (!data) return null;

  const isIn = type === 'in';
  const typeLabel = isIn ? 'Phiếu nhập kho' : 'Phiếu xuất kho';
  const partnerLabel = isIn ? 'Nhà cung cấp' : 'Khách hàng / Đối tác';
  const partnerValue = isIn ? data.supplier_name : data.customer_name;
  const warehouseName =
    warehouses.find((w) => w.id === data.warehouse_id)?.name || data.warehouse_name || '—';

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
            {formatDate(data.created_at)}
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
                  <td style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 12 }}>{i + 1}</td>
                  <td>
                    <span className="sku-chip">{it.sku}</span>
                  </td>
                  <td>
                    <strong>{it.product_name}</strong>
                  </td>
                  <td className="num">
                    <strong>{formatNumber(it.quantity)}</strong>
                  </td>
                  <td className="num">{formatMoney(it.price)}</td>
                  <td className="num" style={{ fontWeight: 700, color: 'var(--ink)' }}>
                    {formatMoney((it.quantity || 0) * (it.price || 0))}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 20 }}>
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
            <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13 }}>
              <div className="text-faint mono" style={{ fontSize: 11, marginBottom: 4, textTransform: 'uppercase' }}>Ghi chú</div>
              <div>{data.note}</div>
            </div>
          )}
        </div>
        <div style={{ background: '#fafbfa', border: '1.5px solid var(--line-strong)', borderRadius: 'var(--radius)', padding: '12px 18px', minWidth: 260, textAlign: 'right' }}>
          <div className="text-faint mono" style={{ fontSize: 11, textTransform: 'uppercase', marginBottom: 4 }}>
            Tổng cộng thanh toán
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--ink)' }}>
            {formatMoney(data.total_amount)}
          </div>
        </div>
      </div>
    </Modal>
  );
}
