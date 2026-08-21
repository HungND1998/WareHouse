import { Link } from 'react-router-dom';

/**
 * Reusable StatCard Component
 * @param {string} label - Tiêu đề chỉ số
 * @param {string|number} value - Giá trị hiển thị
 * @param {string|React.ReactNode} [icon] - Icon biểu tượng
 * @param {string} [color] - 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'cyan'
 * @param {string} [subtext] - Mô tả chi tiết phụ
 * @param {Object} [valueStyle] - Custom style cho giá trị
 * @param {string} [to] - Đường dẫn router để click chuyển trang trực tiếp
 * @param {Function} [onClick] - Callback khi click vào card
 */
export default function StatCard({ label, value, icon, color = 'blue', subtext, valueStyle, to, onClick }) {
  const content = (
    <>
      <div className="stat-tile-top">
        <span className="stat-label">{label}</span>
        {icon && <div className="stat-icon">{icon}</div>}
      </div>
      <div className="stat-value" style={valueStyle}>
        {value}
      </div>
      <div className="stat-tile-bottom">
        {subtext && <div className="stat-subtext" style={{ margin: 0 }}>{subtext}</div>}
        {(to || onClick) && <div className="stat-arrow">Chi tiết →</div>}
      </div>
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className={`stat-tile stat-${color} stat-clickable`}
        style={{ textDecoration: 'none', color: 'inherit' }}
        title={`Xem chi tiết ${label.toLowerCase()}`}
      >
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
        className={`stat-tile stat-${color} stat-clickable`}
        title={`Xem chi tiết ${label.toLowerCase()}`}
      >
        {content}
      </div>
    );
  }

  return <div className={`stat-tile stat-${color}`}>{content}</div>;
}
