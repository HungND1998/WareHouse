import { useEffect, useState, useMemo, useCallback } from 'react';
import { api } from '../api/client';
import { formatNumber, formatDate, DateTime } from '../components/Badge';
import { useToast } from '../components/Toast';
import StatCard from '../components/StatCard';
import TableState from '../components/TableState';
import Pagination from '../components/Pagination';

export default function Inventory() {
  const { push } = useToast();
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get('/inventory', { warehouse_id: warehouseId })
      .then((res) => {
        setRows(res.data || []);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || 'Không thể tải dữ liệu tồn kho.');
        push(err.message, 'error');
      })
      .finally(() => setLoading(false));
  }, [warehouseId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPage(1);
  }, [search, warehouseId]);

  useEffect(() => {
    api.get('/warehouses').then((res) => setWarehouses(res.data || []));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

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
      <div className="stats-grid">
        <StatCard
          label="Mặt hàng lưu kho"
          value={stats.totalLines}
          icon="📦"
          color="blue"
          to="/products"
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
          to="/warehouses"
          valueStyle={{ fontSize: 18 }}
          subtext={`${warehouses.length} cơ sở kho`}
        />
      </div>

      {/* Toolbar / Search & Filter */}
      <div className="filter-bar">
        <div className="toolbar">
          <div style={{ display: 'flex', gap: 10, flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              className="search-input"
              placeholder="🔍 Tìm SKU hoặc tên sản phẩm…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: 280 }}
            />
            <select
              className="filter-select"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
            >
              <option value="">Tất cả các kho</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            {Boolean(search || warehouseId) && (
              <button
                type="button"
                className="btn-reset-filter"
                onClick={() => {
                  setSearch('');
                  setWarehouseId('');
                }}
                title="Xóa tất cả điều kiện lọc"
              >
                <span>✕</span> Xóa bộ lọc
              </button>
            )}
          </div>
          <div className="record-count">
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
              <TableState
                loading={loading}
                error={error}
                rows={filteredRows}
                colSpan={5}
                emptyTitle={search || warehouseId ? 'Không tìm thấy sản phẩm phù hợp' : 'Chưa có dữ liệu tồn kho'}
                emptySubtext={
                  search || warehouseId
                    ? 'Vui lòng kiểm tra lại từ khóa tìm kiếm hoặc kho hàng đã chọn.'
                    : 'Hãy tạo phiếu nhập kho để ghi nhận số lượng tồn kho đầu tiên.'
                }
                onRetry={load}
              />
              {!loading && !error && paginatedRows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span className="sku-chip">{r.sku}</span>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--ink)', fontSize: 14 }}>{r.product_name}</strong>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{r.warehouse_name}</td>
                  <td className="num" style={{ fontWeight: 800, fontSize: 14, color: r.quantity <= 0 ? 'var(--warn)' : 'var(--ink)' }}>
                    {formatNumber(r.quantity)} {r.unit}
                  </td>
                  <td>
                    <DateTime value={r.updated_at} prefix="Cập nhật" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          pageSize={pageSize}
          total={filteredRows.length}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          pageSizeOptions={[20, 50, 100]}
        />
      </div>
    </div>
  );
}
