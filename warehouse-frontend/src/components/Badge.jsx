export function StockBadge({ quantity, minStock }) {
  if (quantity <= 0) return <span className="badge badge-warn">Hết hàng</span>;
  if (minStock != null && quantity <= minStock) return <span className="badge badge-warn">Sắp hết</span>;
  return <span className="badge badge-ok">Còn hàng</span>;
}

export function formatMoney(n) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(n || 0)) + ' đ';
}

export function formatNumber(n) {
  return new Intl.NumberFormat('vi-VN').format(n || 0);
}

export function formatDate(s) {
  if (!s) return '—';
  const d = new Date(s.replace(' ', 'T') + 'Z');
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
