import Modal from './Modal';

/**
 * Reusable Confirmation Delete Modal
 * @param {boolean} open - Trạng thái mở modal
 * @param {string} [title] - Tiêu đề modal
 * @param {string} [itemName] - Tên đối tượng cần xóa
 * @param {string} [itemType] - Loại đối tượng (sản phẩm, danh mục, kho hàng...)
 * @param {string} [warningText] - Dòng cảnh báo chi tiết
 * @param {Function} onConfirm - Callback khi bấm nút Xác nhận xóa
 * @param {Function} onClose - Callback khi hủy / đóng
 * @param {boolean} [loading] - Trạng thái đang xóa
 */
export default function ConfirmDeleteModal({
  open,
  title = 'Xác nhận xóa dữ liệu',
  itemName = '',
  itemType = 'bản ghi',
  warningText = 'Hành động này không thể hoàn tác và sẽ xóa vĩnh viễn dữ liệu khỏi hệ thống.',
  onConfirm,
  onClose,
  loading = false,
}) {
  if (!open) return null;

  return (
    <Modal
      title={`🗑 ${title}`}
      wide={500}
      onClose={loading ? undefined : onClose}
      footer={
        <div className="modal-actions" style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={loading}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={loading}
            style={{ minWidth: 90, fontWeight: 700 }}
          >
            {loading ? 'Đang xóa…' : 'Xóa'}
          </button>
        </div>
      }
    >
      <div style={{ padding: '6px 2px 2px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            padding: '14px 18px',
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>⚠️</span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 14.5,
                fontWeight: 700,
                color: '#991b1b',
                marginBottom: itemName ? 4 : 0,
                whiteSpace: 'nowrap',
              }}
            >
              Bạn có chắc chắn muốn xóa {itemType} này?
            </div>
            {itemName && (
              <div style={{ fontSize: 13.5, color: '#7f1d1d', fontWeight: 700, wordBreak: 'break-word' }}>
                « {itemName} »
              </div>
            )}
          </div>
        </div>

        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          {warningText}
        </div>
      </div>
    </Modal>
  );
}
