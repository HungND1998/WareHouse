import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Reusable TableState component for Data Tables
 * Displays animated spinner for Loading, clear messages with custom icons & CTA buttons for Empty, and error box with Retry button.
 *
 * @param {boolean} loading - Trạng thái đang tải dữ liệu
 * @param {string|null} error - Nội dung thông báo lỗi
 * @param {Array} rows - Dữ liệu danh sách dòng để kiểm tra rỗng
 * @param {number} colSpan - Số cột gom dòng (colspan)
 * @param {string|React.ReactNode} [emptyIcon='🔍'] - Biểu tượng hiển thị khi rỗng (vd: 📤, 📥, 📦)
 * @param {string} [emptyTitle='Không tìm thấy dữ liệu phù hợp'] - Tiêu đề khi rỗng
 * @param {string} [emptySubtext] - Mô tả chi tiết khi rỗng
 * @param {string} [actionText] - Nhãn nút CTA (vd: '+ Tạo phiếu xuất')
 * @param {string} [actionTo] - Đường dẫn router cho nút CTA
 * @param {Function} [onAction] - Callback khi bấm nút CTA
 * @param {Function} [onRetry] - Callback khi bấm thử lại lỗi
 */
export default function TableState({
  loading,
  error,
  rows = [],
  colSpan = 1,
  emptyIcon = '🔍',
  emptyTitle = 'Không tìm thấy dữ liệu phù hợp',
  emptySubtext,
  actionText,
  actionTo,
  onAction,
  onRetry,
}) {
  if (loading && (!rows || rows.length === 0)) {
    return (
      <tr className="table-state-row">
        <td colSpan={colSpan}>
          <div className="table-state-box loading">
            <div className="spinner" />
            <div className="state-title">Đang tải dữ liệu…</div>
            <div className="state-subtext">Hệ thống đang kết nối và lấy thông tin mới nhất.</div>
          </div>
        </td>
      </tr>
    );
  }

  if (error && (!rows || rows.length === 0)) {
    return (
      <tr className="table-state-row">
        <td colSpan={colSpan}>
          <div className="table-state-box error">
            <span className="state-icon">⚠️</span>
            <div className="state-title">Không thể tải dữ liệu.</div>
            <div className="state-subtext">{error || 'Đã có lỗi xảy ra trong quá trình kết nối API.'}</div>
            {onRetry && (
              <button type="button" className="btn btn-primary btn-sm" onClick={onRetry} style={{ marginTop: 10 }}>
                🔄 Thử lại
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  if (!loading && (!rows || rows.length === 0)) {
    return (
      <tr className="table-state-row">
        <td colSpan={colSpan}>
          <div className="table-state-box empty">
            <span className="state-icon" style={{ fontSize: 34, lineHeight: 1, marginBottom: 4 }}>
              {emptyIcon}
            </span>
            <div className="state-title">{emptyTitle}</div>
            {emptySubtext && <div className="state-subtext">{emptySubtext}</div>}
            {actionText && actionTo && (
              <Link
                to={actionTo}
                className="btn btn-primary btn-sm"
                style={{ marginTop: 10, textDecoration: 'none', fontWeight: 600 }}
              >
                {actionText}
              </Link>
            )}
            {actionText && onAction && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={onAction}
                style={{ marginTop: 10, fontWeight: 600 }}
              >
                {actionText}
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  return null;
}
