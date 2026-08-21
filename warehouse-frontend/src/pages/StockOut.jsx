import { useEffect, useState, useMemo } from 'react';
import { api } from '../api/client';
import { useToast } from '../components/Toast';
import { formatMoney, formatDate, DateTime } from '../components/Badge';
import StockDocumentModal from '../components/StockDocumentModal';
import StockDocumentDetailModal from '../components/StockDocumentDetailModal';
import StatCard from '../components/StatCard';
import TableState from '../components/TableState';
import Pagination from '../components/Pagination';

export default function StockOut() {
  const { push } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(null);

  function load() {
    setLoading(true);
    setError(null);
    api
      .get('/stock-out')
      .then((res) => {
        setRows(res.data || []);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || 'Không thể tải lịch sử xuất kho.');
        push(err.message, 'error');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setPage(1);
  }, [search, warehouseFilter]);

  useEffect(() => {
    load();
    api.get('/warehouses').then((res) => setWarehouses(res.data || []));
    api.get('/products', { limit: 500 }).then((res) => setProducts(res.data || []));
  }, []);

  async function openDetail(row) {
    try {
      const res = await api.get(`/stock-out/${row.id}`);
      setDetailOpen({ ...row, ...res.data });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  // Filtered rows
  const filteredRows = useMemo(() => {
    if (!search.trim() && !warehouseFilter) return rows;
    const term = search.toLowerCase();
    return rows.filter((r) => {
      const matchSearch =
        !term ||
        r.code?.toLowerCase().includes(term) ||
        r.customer_name?.toLowerCase().includes(term) ||
        r.warehouse_name?.toLowerCase().includes(term);
      const matchWarehouse = !warehouseFilter || String(r.warehouse_id) === String(warehouseFilter);
      return matchSearch && matchWarehouse;
    });
  }, [rows, search, warehouseFilter]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  // Stats
  const stats = useMemo(() => {
    const totalOut = rows.length;
    const totalValue = rows.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);
    return { totalOut, totalValue };
  }, [rows]);

  function handleExportExcel() {
    if (rows.length === 0) return push('Không có dữ liệu để xuất.', 'error');
    const header = ['Mã phiếu', 'Kho xuất', 'Khách hàng', 'Người tạo', 'Tổng tiền (đ)', 'Thời gian'];
    const lines = rows.map((r) => [
      `"${r.code}"`,
      `"${r.warehouse_name || ''}"`,
      `"${r.customer_name || ''}"`,
      `"${r.created_by || ''}"`,
      r.total_amount || 0,
      `"${r.created_at || ''}"`,
    ].join(','));
    const csv = '\uFEFF' + [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Danh_sach_phieu_xuat_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    push('Đã xuất file dữ liệu phiếu xuất thành công!');
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>📤</span>
          <div>
            <div className="eyebrow">Quản lý kho hàng</div>
            <h1>Danh sách phiếu xuất kho</h1>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-excel" onClick={handleExportExcel} title="Tải file Excel / CSV">
            <span>📊</span> Xuất excel
          </button>
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <span>+</span> Tạo phiếu xuất
          </button>
        </div>
      </div>

      {/* Stats Tiles */}
      <div className="stats-grid">
        <StatCard
          label="Tổng số phiếu xuất"
          value={stats.totalOut}
          icon="📤"
          color="amber"
          subtext="Lịch sử xuất kho"
        />
        <StatCard
          label="Tổng giá trị xuất kho"
          value={formatMoney(stats.totalValue)}
          icon="💰"
          color="green"
          valueStyle={{ fontSize: 22 }}
          subtext="Tổng doanh thu xuất"
        />
        <StatCard
          label="Kho hàng đang hoạt động"
          value={warehouses.length}
          icon="🏬"
          color="purple"
          to="/warehouses"
          subtext="Cơ sở xuất hàng"
        />
      </div>

      {/* Toolbar / Search & Filter */}
      <div className="filter-bar">
        <div className="toolbar">
          <div style={{ display: 'flex', gap: 10, flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              className="search-input"
              placeholder="🔍 Tìm mã phiếu, khách hàng…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: 280 }}
            />
            <select
              className="filter-select"
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
            >
              <option value="">Tất cả kho xuất</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            {Boolean(search || warehouseFilter) && (
              <button
                type="button"
                className="btn-reset-filter"
                onClick={() => {
                  setSearch('');
                  setWarehouseFilter('');
                }}
                title="Xóa tất cả điều kiện lọc"
              >
                <span>✕</span> Xóa bộ lọc
              </button>
            )}
          </div>
          <div className="record-count">
            Hiển thị <strong>{filteredRows.length}</strong> / {rows.length} phiếu
          </div>
        </div>
      </div>

      {loading && <div className="loading-bar" style={{ marginBottom: 16 }} />}

      {/* Data Table */}
      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 175, whiteSpace: 'nowrap' }}>Mã phiếu</th>
                <th>Kho xuất</th>
                <th>Khách hàng / Đối tác</th>
                <th>Người tạo</th>
                <th className="num" style={{ width: 150 }}>Tổng tiền</th>
                <th style={{ width: 170 }}>Thời gian</th>
                <th style={{ width: 100, textAlign: 'center' }}>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              <TableState
                loading={loading}
                error={error}
                rows={filteredRows}
                colSpan={7}
                emptyIcon="📤"
                emptyTitle={search || warehouseFilter ? 'Không tìm thấy phiếu xuất phù hợp' : 'Chưa có phiếu xuất kho nào'}
                emptySubtext={
                  search || warehouseFilter
                    ? 'Vui lòng kiểm tra lại từ khóa tìm kiếm hoặc kho hàng đã chọn.'
                    : 'Bắt đầu quản lý xuất kho bằng cách lập phiếu xuất kho đầu tiên.'
                }
                actionText={!search && !warehouseFilter ? '+ Tạo phiếu xuất mới' : undefined}
                onAction={!search && !warehouseFilter ? () => setModalOpen(true) : undefined}
                onRetry={load}
              />
              {!loading && !error && paginatedRows.map((r) => (
                <tr key={r.id} onClick={() => openDetail(r)} style={{ cursor: 'pointer' }}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span className="sku-chip">{r.code}</span>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--ink)', fontSize: 14 }}>{r.warehouse_name}</strong>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                    {r.customer_name ? <span>{r.customer_name}</span> : <span className="text-faint">—</span>}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{r.created_by || '—'}</td>
                  <td className="num" style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>
                    {formatMoney(r.total_amount)}
                  </td>
                  <td>
                    <DateTime value={r.created_at} prefix="Tạo lúc" />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetail(r);
                      }}
                      style={{ padding: '4px 10px', fontSize: 12, fontWeight: 600 }}
                    >
                      👁️ Xem
                    </button>
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

      {/* Shared Create Stock Document Modal */}
      <StockDocumentModal
        type="out"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={load}
        warehouses={warehouses}
        products={products}
        pushToast={push}
      />

      {/* Shared Detail Modal */}
      <StockDocumentDetailModal
        type="out"
        data={detailOpen}
        warehouses={warehouses}
        onClose={() => setDetailOpen(null)}
      />
    </div>
  );
}
