import React from 'react';

/**
 * Reusable Pagination Component
 * @param {number} page - Current page (1-indexed)
 * @param {number} pageSize - Number of items per page
 * @param {number} total - Total number of items
 * @param {Function} onPageChange - Function(newPage)
 * @param {Function} onPageSizeChange - Function(newPageSize)
 * @param {number[]} [pageSizeOptions] - [10, 20, 50, 100]
 */
export default function Pagination({
  page = 1,
  pageSize = 20,
  total = 0,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  hideOnSinglePage = true,
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const startRecord = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, total);

  // Ẩn toàn bộ thanh phân trang nếu không có dữ liệu hoặc dữ liệu chỉ nằm trong 1 trang
  if (total === 0 || (hideOnSinglePage && total <= pageSize)) return null;

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  return (
    <div className="pagination-bar">
      <div className="pagination-info">
        Hiển thị <strong>{startRecord}</strong>–<strong>{endRecord}</strong> trên tổng số <strong>{total}</strong> bản ghi
      </div>

      <div className="pagination-controls">
        <div className="pagination-size">
          <span>Hiển thị:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange && onPageSizeChange(Number(e.target.value))}
            className="pagination-select"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt} / trang
              </option>
            ))}
          </select>
        </div>

        <div className="pagination-pages">
          <button
            type="button"
            className="pagination-btn"
            disabled={currentPage <= 1}
            onClick={() => onPageChange && onPageChange(1)}
            title="Trang đầu"
          >
            «
          </button>
          <button
            type="button"
            className="pagination-btn"
            disabled={currentPage <= 1}
            onClick={() => onPageChange && onPageChange(currentPage - 1)}
            title="Trang trước"
          >
            ‹
          </button>

          {getPageNumbers().map((p, idx) =>
            p === '...' ? (
              <span key={`dots-${idx}`} className="pagination-dots">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                className={`pagination-btn ${p === currentPage ? 'active' : ''}`}
                onClick={() => onPageChange && onPageChange(p)}
              >
                {p}
              </button>
            )
          )}

          <button
            type="button"
            className="pagination-btn"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange && onPageChange(currentPage + 1)}
            title="Trang sau"
          >
            ›
          </button>
          <button
            type="button"
            className="pagination-btn"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange && onPageChange(totalPages)}
            title="Trang cuối"
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
}
