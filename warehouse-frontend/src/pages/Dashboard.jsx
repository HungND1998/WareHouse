import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { formatMoney, formatNumber } from '../components/Badge';
import StatCard from '../components/StatCard';
import TableState from '../components/TableState';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [recentIn, setRecentIn] = useState([]);
  const [recentOut, setRecentOut] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.get('/reports/dashboard'),
      api.get('/products/low-stock'),
      api.get('/stock-in'),
      api.get('/stock-out'),
    ])
      .then(([dash, low, sin, sout]) => {
        setStats(dash.data);
        setLowStock(low.data.slice(0, 5));
        setRecentIn(sin.data.slice(0, 5));
        setRecentOut(sout.data.slice(0, 5));
        setError(null);
      })
      .catch((err) => {
        setError(err.message || 'Không thể tải dữ liệu bảng điều khiển.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Tổng quan kho</h1>
          <div className="sub-desc">Theo dõi tồn kho và hoạt động hôm nay</div>
        </div>
        <div className="toolbar">
          <Link
            to="/stock-in"
            className="btn btn-ghost"
            style={{
              borderColor: '#0e7490',
              color: '#0e7490',
              background: '#ecfeff',
              fontWeight: 600,
            }}
          >
            📥 Tạo phiếu nhập
          </Link>
          <Link to="/stock-out" className="btn btn-primary" style={{ fontWeight: 600 }}>
            📤 Tạo phiếu xuất
          </Link>
        </div>
      </div>

      {loading && <div className="loading-bar" style={{ marginBottom: 16 }} />}

      {error && (
        <div className="card" style={{ padding: 24, marginBottom: 20, textAlign: 'center', borderColor: '#fecaca', background: '#fef2f2' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#b91c1c', marginBottom: 4 }}>Không thể tải dữ liệu bảng điều khiển</div>
          <div style={{ fontSize: 13, color: '#7f1d1d', marginBottom: 12 }}>{error}</div>
          <button type="button" className="btn btn-primary" onClick={load}>
            🔄 Thử lại
          </button>
        </div>
      )}

      {/* 4 Main KPI Cards */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: 22 }}>
          <StatCard
            label="Tổng sản phẩm"
            value={formatNumber(stats.totalProducts)}
            icon="📦"
            color="blue"
            to="/products"
            subtext={`${stats.totalWarehouses || 0} cơ sở kho đang hoạt động`}
          />
          <StatCard
            label="Tổng tồn kho"
            value={formatNumber(stats.totalStockQty || 0)}
            icon="▦"
            color="purple"
            to="/inventory"
            subtext={
              (stats.totalStockQty || 0) > 0
                ? `${stats.inStockCount || 0} / ${stats.totalProducts || 0} mặt hàng có tồn`
                : 'Chưa có hàng lưu kho'
            }
          />
          <StatCard
            label="Giá trị tồn kho"
            value={formatMoney(stats.totalStockValue)}
            icon="💰"
            color="green"
            to="/inventory"
            valueStyle={{ fontSize: 20 }}
            subtext="Tổng vốn lưu kho hiện tại"
          />
          <StatCard
            label="Cảnh báo tồn"
            value={formatNumber((stats.outOfStockCount || 0) + (stats.lowStockCount || 0))}
            icon="⚠️"
            color={(stats.outOfStockCount > 0 || stats.lowStockCount > 0) ? (stats.outOfStockCount > 0 ? 'red' : 'amber') : 'green'}
            to="/products"
            subtext={
              stats.outOfStockCount > 0
                ? `${stats.outOfStockCount} hết hàng • ${stats.lowStockCount} sắp hết`
                : (stats.lowStockCount > 0 ? `${stats.lowStockCount} sản phẩm sắp hết` : 'Tất cả đạt mức an toàn')
            }
          />
        </div>
      )}

      {/* Nhóm: Hoạt động hôm nay */}
      {stats && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>⚡</span> Hoạt động hôm nay
            </h2>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Theo dõi biến động kho trong ngày
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            <div
              className="card"
              style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderLeft: '4px solid #0284c7',
                background: '#ffffff',
              }}
            >
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                  📥 Lượt nhập kho hôm nay
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#0369a1', fontFamily: 'var(--font-mono)' }}>
                  {formatNumber(stats.todayIn)}{' '}
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>phiếu</span>
                </div>
              </div>
              <Link to="/stock-in" className="btn btn-ghost btn-sm" style={{ fontWeight: 600, color: '#0284c7' }}>
                Quản lý nhập →
              </Link>
            </div>

            <div
              className="card"
              style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderLeft: '4px solid #7c3aed',
                background: '#ffffff',
              }}
            >
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                  📤 Lượt xuất kho hôm nay
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#6d28d9', fontFamily: 'var(--font-mono)' }}>
                  {formatNumber(stats.todayOut)}{' '}
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>phiếu</span>
                </div>
              </div>
              <Link to="/stock-out" className="btn btn-ghost btn-sm" style={{ fontWeight: 600, color: '#7c3aed' }}>
                Quản lý xuất →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Tables Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
        {/* Sắp hết hàng */}
        <div className="card">
          <div className="card-header" style={{ background: '#fef2f2', borderBottomColor: '#fecaca' }}>
            <h3 style={{ fontSize: 14, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
              <span>⚠️</span> Sắp hết hàng
            </h3>
            <Link to="/products" className="mono" style={{ fontSize: 11.5, fontWeight: 700, color: '#b91c1c' }}>
              XEM TẤT CẢ →
            </Link>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <tbody>
                <TableState
                  loading={loading}
                  error={error}
                  rows={lowStock}
                  colSpan={2}
                  emptyIcon="✨"
                  emptyTitle="Tồn kho ổn định"
                  emptySubtext="Tất cả sản phẩm đều đạt mức tồn an toàn."
                  actionText="Xem danh mục hàng hóa"
                  actionTo="/products"
                  onRetry={load}
                />
                {!loading && !error && lowStock.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong style={{ color: 'var(--ink)' }}>{p.name}</strong>
                      <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-faint)', fontWeight: 600 }}>
                        {p.sku}
                      </div>
                    </td>
                    <td className="num" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ color: p.total_stock <= 0 ? '#b91c1c' : '#b45309', fontWeight: 800, fontSize: 13.5 }}>
                        {p.total_stock} / {p.min_stock} {p.unit || ''}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: p.total_stock <= 0 ? '#b91c1c' : '#b45309' }}>
                        {p.total_stock <= 0 ? '🚫 Hết hàng' : '⚠️ Sắp hết'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Nhập kho gần đây */}
        <div className="card">
          <div className="card-header" style={{ background: '#f0f9ff', borderBottomColor: '#bae6fd' }}>
            <h3 style={{ fontSize: 14, color: '#0369a1', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
              <span>📥</span> Nhập kho gần đây
            </h3>
            <Link to="/stock-in" className="mono" style={{ fontSize: 11.5, fontWeight: 700, color: '#0369a1' }}>
              XEM TẤT CẢ →
            </Link>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <tbody>
                <TableState
                  loading={loading}
                  error={error}
                  rows={recentIn}
                  colSpan={2}
                  emptyIcon="📥"
                  emptyTitle="Chưa có phiếu nhập kho nào"
                  emptySubtext="Lịch sử các đợt nhập hàng gần nhất sẽ hiển thị tại đây."
                  actionText="+ Tạo phiếu nhập mới"
                  actionTo="/stock-in"
                  onRetry={load}
                />
                {!loading && !error && recentIn.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span className="sku-chip">{s.code}</span>
                      <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text-muted)', fontWeight: 500 }}>
                        {s.warehouse_name}
                      </div>
                    </td>
                    <td className="num" style={{ fontWeight: 800, color: 'var(--ink)', fontSize: 13.5 }}>
                      {formatMoney(s.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Xuất kho gần đây */}
        <div className="card">
          <div className="card-header" style={{ background: '#fffbeb', borderBottomColor: '#fde68a' }}>
            <h3 style={{ fontSize: 14, color: '#b45309', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
              <span>📤</span> Xuất kho gần đây
            </h3>
            <Link to="/stock-out" className="mono" style={{ fontSize: 11.5, fontWeight: 700, color: '#b45309' }}>
              XEM TẤT CẢ →
            </Link>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <tbody>
                <TableState
                  loading={loading}
                  error={error}
                  rows={recentOut}
                  colSpan={2}
                  emptyIcon="📤"
                  emptyTitle="Chưa có phiếu xuất kho nào"
                  emptySubtext="Lịch sử các đợt xuất hàng gần nhất sẽ hiển thị tại đây."
                  actionText="+ Tạo phiếu xuất mới"
                  actionTo="/stock-out"
                  onRetry={load}
                />
                {!loading && !error && recentOut.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span className="sku-chip">{s.code}</span>
                      <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text-muted)', fontWeight: 500 }}>
                        {s.customer_name || '—'}
                      </div>
                    </td>
                    <td className="num" style={{ fontWeight: 800, color: 'var(--ink)', fontSize: 13.5 }}>
                      {formatMoney(s.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
