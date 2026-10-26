export function StockBadge({ quantity, minStock }) {
  const qty = Number(quantity) || 0;
  if (qty <= 0) return <span className="badge badge-danger">Hết hàng</span>;
  if (minStock != null && qty <= Number(minStock)) return <span className="badge badge-warn">Sắp hết</span>;
  return <span className="badge badge-ok">Còn hàng</span>;
}

export function formatMoney(n) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(n || 0)) + ' đ';
}

export function formatNumber(n) {
  return new Intl.NumberFormat('vi-VN').format(n || 0);
}

/**
 * Chuyển đổi timestamp / ISO string từ SQLite/API thành đối tượng Date chuẩn
 */
function parseDate(s) {
  if (!s) return null;
  if (s instanceof Date) return s;
  const str = String(s).trim();
  // Nếu đã có ký hiệu múi giờ (Z hoặc +07:00 / -05:00) thì giữ nguyên, ngược lại mặc định là UTC từ server
  const hasTimezone = /[Zz]$|[+-]\d{2}(:\d{2})?$/.test(str);
  const isoStr = str.replace(' ', 'T') + (hasTimezone ? '' : 'Z');
  const d = new Date(isoStr);
  return isNaN(d.getTime()) ? new Date(str) : d;
}

/**
 * Định dạng ngày giờ chuẩn thống nhất toàn hệ thống: DD/MM/YYYY HH:mm
 * Ví dụ: "26/10/2026 14:15"
 */
export function formatDateTime(s) {
  const d = parseDate(s);
  if (!d || isNaN(d.getTime())) return '—';
  const pad = (n) => String(n).padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function formatDate(s) {
  return formatDateTime(s);
}

/**
 * Tính toán thời gian tương đối
 * Ví dụ: "vừa xong", "5 phút trước", "2 giờ trước", "1 ngày trước"
 */
export function getRelativeTime(s) {
  const d = parseDate(s);
  if (!d || isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHour < 24) return `${diffHour} giờ trước`;
  if (diffDay === 1) return 'hôm qua';
  if (diffDay < 30) return `${diffDay} ngày trước`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth} tháng trước`;
  return `${Math.floor(diffDay / 365)} năm trước`;
}

/**
 * Component hiển thị ngày giờ chuẩn kèm thời gian tương đối rõ ràng
 */
export function DateTime({ value, prefix = 'Tạo lúc' }) {
  if (!value) return <span className="text-faint">—</span>;
  const formatted = formatDateTime(value);
  const relative = getRelativeTime(value);
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 1 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
        {formatted}
      </span>
      {relative && (
        <span style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 500 }}>
          {relative}
        </span>
      )}
    </div>
  );
}
