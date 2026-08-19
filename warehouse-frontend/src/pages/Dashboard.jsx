import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { formatMoney, formatNumber } from '../components/Badge';

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
      <div className="page-header">
        <div>
          <div className="eyebrow">Bảng điều khiển</div>
          <h1>Tổng quan kho hàng</h1>
        </div>
        <div className="toolbar">
          <Link to="/stock-in" className="btn btn-ink btn-sm">↓ Tạo phiếu nhập</Link>
          <Link to="/stock-out" className="btn btn-primary btn-sm">↑ Tạo phiếu xuất</Link>
        </div>
      </div>

      {loading && <div className="loading-bar" />}

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 26 }}>
          <div className="stat-tile">
            <div className="stat-label">Sản phẩm</div>
            <div className="stat-value">{formatNumber(stats.totalProducts)}</div>
          </div>
          <div className="stat-tile">
            <div className="stat-label">Kho hàng</div>
            <div className="stat-value">{formatNumber(stats.totalWarehouses)}</div>
          </div>
          <div className="stat-tile">
            <div className="stat-label">Giá trị tồn kho</div>
            <div className="stat-value" style={{ fontSize: 22 }}>{formatMoney(stats.totalStockValue)}</div>
          </div>
          <div className={`stat-tile ${stats.lowStockCount > 0 ? 'alert' : ''}`}>
            <div className="stat-label">SP sắp hết</div>
            <div className="stat-value">{formatNumber(stats.lowStockCount)}</div>
          </div>
          <div className="stat-tile">
            <div className="stat-label">Phiếu nhập hôm nay</div>
            <div className="stat-value">{formatNumber(stats.todayIn)}</div>
          </div>
          <div className="stat-tile">
            <div className="stat-label">Phiếu xuất hôm nay</div>
            <div className="stat-value">{formatNumber(stats.todayOut)}</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18 }}>
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 13.5 }}>⚠ Sắp hết hàng</h3>
            <Link to="/products" className="text-faint mono" style={{ fontSize: 11 }}>XEM TẤT CẢ</Link>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <tbody>
                {lowStock.length === 0 && !loading && (
                  <tr className="empty-row"><td>Không có sản phẩm sắp hết hàng.</td></tr>
                )}
                {lowStock.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}<div className="text-faint mono" style={{ fontSize: 11 }}>{p.sku}</div></td>
                    <td className="num" style={{ color: 'var(--warn)', fontWeight: 700 }}>
                      {p.total_stock}/{p.min_stock}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 13.5 }}>↓ Nhập kho gần đây</h3>
            <Link to="/stock-in" className="text-faint mono" style={{ fontSize: 11 }}>XEM TẤT CẢ</Link>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <tbody>
                {recentIn.length === 0 && !loading && (
                  <tr className="empty-row"><td>Chưa có phiếu nhập.</td></tr>
                )}
                {recentIn.map((s) => (
                  <tr key={s.id}>
                    <td><span className="mono" style={{ fontSize: 12 }}>{s.code}</span><div className="text-faint" style={{ fontSize: 11.5 }}>{s.warehouse_name}</div></td>
                    <td className="num">{formatMoney(s.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 13.5 }}>↑ Xuất kho gần đây</h3>
            <Link to="/stock-out" className="text-faint mono" style={{ fontSize: 11 }}>XEM TẤT CẢ</Link>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <tbody>
                {recentOut.length === 0 && !loading && (
                  <tr className="empty-row"><td>Chưa có phiếu xuất.</td></tr>
                )}
                {recentOut.map((s) => (
                  <tr key={s.id}>
                    <td><span className="mono" style={{ fontSize: 12 }}>{s.code}</span><div className="text-faint" style={{ fontSize: 11.5 }}>{s.customer_name || '—'}</div></td>
                    <td className="num">{formatMoney(s.total_amount)}</td>
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
