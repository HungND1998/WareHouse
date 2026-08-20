/**
 * Reusable StatCard / Metric Tile Component
 * @param {string} label - Tiêu đề chỉ số (VD: 'Sản phẩm', 'Giá trị tồn kho')
 * @param {string|number} value - Giá trị hiển thị
 * @param {string|ReactNode} icon - Icon biểu tượng (VD: '📦', '🏬', '💰', '⚠️', '📥', '📤')
 * @param {'blue'|'purple'|'green'|'amber'|'cyan'|'red'} color - Màu chủ đạo hài hòa
 * @param {string} [subtext] - Ghi chú phụ dưới số
 * @param {Object} [valueStyle] - Tùy chỉnh style cho value
 */
export default function StatCard({ label, value, icon, color = 'blue', subtext, valueStyle }) {
  return (
    <div className={`stat-tile stat-${color}`}>
      <div className="stat-tile-top">
        <span className="stat-label">{label}</span>
        {icon && <div className="stat-icon">{icon}</div>}
      </div>
      <div className="stat-value" style={valueStyle}>
        {value}
      </div>
      {subtext && <div className="stat-subtext">{subtext}</div>}
    </div>
  );
}
