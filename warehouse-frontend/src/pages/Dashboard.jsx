import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { formatMoney, formatNumber } from '../components/Badge';
import StatCard from '../components/StatCard';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [recentIn, setRecentIn] = useState([]);
  const [recentOut, setRecentOut] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="eyebrow">Bảng điều khiển trung tâm</div>
          <h1>Tổng quan kho hàng</h1>
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

      {/* Metrics Row */}
      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 14,
            marginBottom: 26,
          }}
        >
          <StatCard
            label="Sản phẩm"
            value={formatNumber(stats.totalProducts)}
            icon="📦"
            color="blue"
            subtext="Mặt hàng đang quản lý"
          />
          <StatCard
            label="Kho hàng"
            value={formatNumber(stats.totalWarehouses)}
            icon="🏬"
            color="purple"
            subtext="Cơ sở đang hoạt động"
          />
          <StatCard
            label="Giá trị tồn kho"
            value={formatMoney(stats.totalStockValue)}
            icon="💰"
            color="green"
            valueStyle={{ fontSize: 20 }}
            subtext="Tổng vốn lưu kho"
          />
          <StatCard
            label="SP sắp hết"
            value={formatNumber(stats.lowStockCount)}
            icon="⚠️"
            color={stats.lowStockCount > 0 ? 'red' : 'green'}
            subtext={stats.lowStockCount > 0 ? 'Cần nhập bổ sung' : 'Tồn kho ổn định'}
          />
          <StatCard
            label="Phiếu nhập hôm nay"
            value={formatNumber(stats.todayIn)}
            icon="📥"
            color="cyan"
            subtext="Lượt nhập trong ngày"
          />
          <StatCard
            label="Phiếu xuất hôm nay"
            value={formatNumber(stats.todayOut)}
            icon="📤"
            color="amber"
            subtext="Lượt xuất trong ngày"
          />
        </div>
      )}

      {/* Tables Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
        {/* Sắp hết hàng */}
        <div className="card">
          <div className="card-header" style={{ background: '#fff9f9', borderBottomColor: '#fee2e2' }}>
            <h3 style={{ fontSize: 14, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>⚠️</span> Sắp hết hàng
            </h3>
            <Link to="/products" className="text-faint mono" style={{ fontSize: 11, fontWeight: 600 }}>
              XEM TẤT CẢ →
            </Link>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <tbody>
                {lowStock.length === 0 && !loading && (
                  <tr className="empty-row">
                    <td>Tất cả sản phẩm đều đủ tồn kho an toàn.</td>
                  </tr>
                )}
                {lowStock.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.name}</strong>
                      <div className="text-faint mono" style={{ fontSize: 11 }}>
                        {p.sku}
                      </div>
                    </td>
                    <td className="num" style={{ color: 'var(--warn)', fontWeight: 700 }}>
                      {p.total_stock} / {p.min_stock} {p.unit || ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Nhập kho gần đây */}
        <div className="card">
          <div className="card-header" style={{ background: '#f8fcff', borderBottomColor: '#e0f2fe' }}>
            <h3 style={{ fontSize: 14, color: '#0369a1', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📥</span> Nhập kho gần đây
            </h3>
            <Link to="/stock-in" className="text-faint mono" style={{ fontSize: 11, fontWeight: 600 }}>
              XEM TẤT CẢ →
            </Link>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <tbody>
                {recentIn.length === 0 && !loading && (
                  <tr className="empty-row">
                    <td>Chưa có phiếu nhập nào.</td>
                  </tr>
                )}
                {recentIn.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span className="sku-chip">{s.code}</span>
                      <div className="text-faint" style={{ fontSize: 11.5, marginTop: 2 }}>
                        {s.warehouse_name}
                      </div>
                    </td>
                    <td className="num" style={{ fontWeight: 700 }}>
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
          <div className="card-header" style={{ background: '#fffdf5', borderBottomColor: '#fef3c7' }}>
            <h3 style={{ fontSize: 14, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📤</span> Xuất kho gần đây
            </h3>
            <Link to="/stock-out" className="text-faint mono" style={{ fontSize: 11, fontWeight: 600 }}>
              XEM TẤT CẢ →
            </Link>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <tbody>
                {recentOut.length === 0 && !loading && (
                  <tr className="empty-row">
                    <td>Chưa có phiếu xuất nào.</td>
                  </tr>
                )}
                {recentOut.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span className="sku-chip">{s.code}</span>
                      <div className="text-faint" style={{ fontSize: 11.5, marginTop: 2 }}>
                        {s.customer_name || '—'}
                      </div>
                    </td>
                    <td className="num" style={{ fontWeight: 700 }}>
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
