import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Reusable TableState component for Data Tables
 * Displays animated spinner for Loading, clear messages with custom icons & CTA buttons for Empty,
 * and error box with Retry button. Also supports active background loading indicator bar.
 *
 * @param {boolean} loading - Trạng thái đang tải dữ liệu
 * @param {string|null} error - Nội dung thông báo lỗi
 * @param {Array} rows - Dữ liệu danh sách dòng để kiểm tra rỗng
 * @param {number} colSpan - Số cột gom dòng (colspan)
 * @param {string|React.ReactNode} [emptyIcon='🔍'] - Biểu tượng hiển thị khi rỗng (vd: 📤, 📥, 📦, 👥)
 * @param {string} [emptyTitle='Không tìm thấy dữ liệu phù hợp'] - Tiêu đề khi rỗng
 * @param {string} [emptySubtext] - Mô tả chi tiết khi rỗng
 * @param {string} [actionText] - Nhãn nút CTA (vd: '+ Tạo phiếu xuất')
 * @param {string} [actionTo] - Đường dẫn router cho nút CTA
 * @param {Function} [onAction] - Callback khi bấm nút CTA
 * @param {Function} [onRetry] - Callback khi bấm thử lại lỗi
 * @param {boolean} [isFiltered=false] - Cờ báo đang áp dụng tìm kiếm hoặc bộ lọc
 * @param {Function} [onClearFilter] - Callback khi bấm nút "✕ Xóa bộ lọc"
 * @param {string} [loadingTitle] - Tiêu đề tùy chỉnh khi đang tải
 * @param {string} [loadingSubtext] - Mô tả tùy chỉnh khi đang tải
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
  isFiltered = false,
  onClearFilter,
  loadingTitle = 'Đang tải dữ liệu…',
  loadingSubtext = 'Hệ thống đang kết nối và đồng bộ dữ liệu mới nhất.',
}) {
  // Case 1: Initial or Full Loading when list is empty
  if (loading && (!rows || rows.length === 0)) {
    return (
      <tr className="table-state-row">
        <td colSpan={colSpan}>
          <div className="table-state-box loading">
            <div className="spinner-wrap">
              <div className="spinner-pulse" />
              <div className="spinner" />
            </div>
            <div className="state-title">{loadingTitle}</div>
            <div className="state-subtext">{loadingSubtext}</div>
            <span className="state-badge-loading">⏳ Đang xử lý...</span>
          </div>
        </td>
      </tr>
    );
  }

  // Case 2: Error state when list is empty
  if (error && (!rows || rows.length === 0)) {
    return (
      <tr className="table-state-row">
        <td colSpan={colSpan}>
          <div className="table-state-box error">
            <div className="state-icon-wrap">⚠️</div>
            <div className="state-title">Không thể tải dữ liệu</div>
            <div className="state-subtext">
              {error || 'Đã có lỗi xảy ra trong quá trình kết nối tới máy chủ. Vui lòng thử lại.'}
            </div>
            {onRetry && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={onRetry}
                style={{ marginTop: 12, fontWeight: 700 }}
              >
                🔄 Thử lại ngay
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  // Case 3: Empty State (No rows)
  if (!loading && (!rows || rows.length === 0)) {
    // Sub-case 3A: Empty due to filters or search
    if (isFiltered) {
      return (
        <tr className="table-state-row">
          <td colSpan={colSpan}>
            <div className="table-state-box empty is-filtered">
              <div className="state-icon-wrap">🔍</div>
              <div className="state-title">Không tìm thấy kết quả phù hợp</div>
              <div className="state-subtext">
                {emptySubtext || 'Không có bản ghi nào khớp với điều kiện tìm kiếm hoặc bộ lọc đang áp dụng.'}
              </div>
              {onClearFilter && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={onClearFilter}
                  style={{
                    marginTop: 12,
                    fontWeight: 700,
                    borderColor: '#cbd5e1',
                    background: '#ffffff',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                >
                  ✕ Xóa bộ lọc & Đặt lại
                </button>
              )}
            </div>
          </td>
        </tr>
      );
    }

    // Sub-case 3B: Truly empty list (zero database records)
    return (
      <tr className="table-state-row">
        <td colSpan={colSpan}>
          <div className="table-state-box empty">
            <div className="state-icon-wrap">{emptyIcon}</div>
            <div className="state-title">{emptyTitle}</div>
            {emptySubtext && <div className="state-subtext">{emptySubtext}</div>}
            {actionText && actionTo && (
              <Link
                to={actionTo}
                className="btn btn-primary btn-sm"
                style={{ marginTop: 12, textDecoration: 'none', fontWeight: 700 }}
              >
                {actionText}
              </Link>
            )}
            {actionText && onAction && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={onAction}
                style={{ marginTop: 12, fontWeight: 700 }}
              >
                {actionText}
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  // Case 4: Active background reloading when rows are already present
  if (loading && rows && rows.length > 0) {
    return (
      <tr className="table-loading-bar-row">
        <td colSpan={colSpan}>
          <div className="table-loading-bar" />
        </td>
      </tr>
    );
  }

  return null;
}
