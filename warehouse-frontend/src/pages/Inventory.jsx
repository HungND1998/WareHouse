import { useEffect, useState, useMemo } from 'react';
import { api } from '../api/client';
import { formatNumber, formatDate } from '../components/Badge';
import { useToast } from '../components/Toast';
import StatCard from '../components/StatCard';

export default function Inventory() {
  const { push } = useToast();
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/warehouses').then((res) => setWarehouses(res.data || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .get('/inventory', { warehouse_id: warehouseId })
      .then((res) => setRows(res.data || []))
      .catch((err) => push(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [warehouseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const term = search.toLowerCase();
    return rows.filter((r) => {
      return (
        r.product_name?.toLowerCase().includes(term) ||
        r.sku?.toLowerCase().includes(term) ||
        r.warehouse_name?.toLowerCase().includes(term)
      );
    });
  }, [rows, search]);

  const stats = useMemo(() => {
    const totalLines = rows.length;
    const totalUnits = rows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
    const zeroStock = rows.filter((r) => r.quantity <= 0).length;
    return { totalLines, totalUnits, zeroStock };
  }, [rows]);

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="eyebrow">Quản lý kho vận · Tồn kho</div>
          <h1>Tồn kho theo vị trí</h1>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
        <StatCard
          label="Mặt hàng lưu kho"
          value={stats.totalLines}
          icon="📦"
          color="blue"
          subtext="Tổng số mục hàng ghi nhận"
        />
        <StatCard
          label="Tổng số lượng tồn"
          value={formatNumber(stats.totalUnits)}
          icon="▦"
          color="green"
          subtext="Tổng chiếc/hộp thực tế"
        />
        <StatCard
          label="Kho hàng đang lọc"
          value={warehouseId ? warehouses.find((w) => String(w.id) === String(warehouseId))?.name || 'Đã chọn kho' : 'Tất cả các kho'}
          icon="🏬"
          color="purple"
          valueStyle={{ fontSize: 18 }}
          subtext={`${warehouses.length} cơ sở kho`}
        />
      </div>

      {/* Toolbar / Search & Filter */}
      <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
        <div className="toolbar" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 10, flex: 1, flexWrap: 'wrap' }}>
            <input
              type="text"
              className="search-input"
              placeholder="🔍 Tìm theo SKU, tên sản phẩm, kho…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: 260 }}
            />
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              style={{
                border: '1px solid var(--line-strong)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px',
                background: 'var(--surface)',
              }}
            >
              <option value="">Tất cả các kho</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <div className="text-faint mono" style={{ fontSize: 12 }}>
            Hiển thị <strong>{filteredRows.length}</strong> dòng tồn kho
          </div>
        </div>
      </div>

      {loading && <div className="loading-bar" style={{ marginBottom: 16 }} />}

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 140 }}>Mã SKU</th>
                <th>Tên sản phẩm</th>
                <th>Kho hàng</th>
                <th className="num" style={{ width: 140 }}>Số lượng tồn</th>
                <th style={{ width: 180 }}>Cập nhật lần cuối</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 && !loading && (
                <tr className="empty-row">
                  <td colSpan={5}>
                    {search || warehouseId ? 'Không tìm thấy dữ liệu tồn kho phù hợp.' : 'Chưa có dữ liệu tồn kho.'}
                  </td>
                </tr>
              )}
              {filteredRows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span className="sku-chip">{r.sku}</span>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--ink)' }}>{r.product_name}</strong>
                  </td>
                  <td className="text-muted">{r.warehouse_name}</td>
                  <td className="num" style={{ fontWeight: 700, color: r.quantity <= 0 ? 'var(--warn)' : 'var(--ink)' }}>
                    {formatNumber(r.quantity)} {r.unit}
                  </td>
                  <td className="text-faint" style={{ fontSize: 12.5 }}>
                    {formatDate(r.updated_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
