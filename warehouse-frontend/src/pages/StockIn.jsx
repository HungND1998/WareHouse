import { useEffect, useState, useMemo } from 'react';
import { api } from '../api/client';
import { useToast } from '../components/Toast';
import { formatMoney, formatDate } from '../components/Badge';
import StockDocumentModal from '../components/StockDocumentModal';
import StockDocumentDetailModal from '../components/StockDocumentDetailModal';
import StatCard from '../components/StatCard';

export default function StockIn() {
  const { push } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(null);

  function load() {
    setLoading(true);
    api
      .get('/stock-in')
      .then((res) => setRows(res.data || []))
      .catch((err) => push(err.message, 'error'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    api.get('/warehouses').then((res) => setWarehouses(res.data || []));
    api.get('/suppliers').then((res) => setSuppliers(res.data || []));
    api.get('/products', { limit: 500 }).then((res) => setProducts(res.data || []));
  }, []);

  async function openDetail(row) {
    try {
      const res = await api.get(`/stock-in/${row.id}`);
      setDetailOpen(res.data);
    } catch (err) {
      push(err.message, 'error');
    }
  }

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchSearch =
        !search ||
        r.code?.toLowerCase().includes(search.toLowerCase()) ||
        r.supplier_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.warehouse_name?.toLowerCase().includes(search.toLowerCase());
      const matchWh = !warehouseFilter || String(r.warehouse_id) === String(warehouseFilter);
      return matchSearch && matchWh;
    });
  }, [rows, search, warehouseFilter]);

  // Stats
  const stats = useMemo(() => {
    const totalIn = rows.length;
    const totalValue = rows.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);
    return { totalIn, totalValue };
  }, [rows]);

  function handleExportExcel() {
    if (rows.length === 0) return push('Không có dữ liệu để xuất.', 'error');
    const header = ['Mã phiếu', 'Kho nhập', 'Nhà cung cấp', 'Người tạo', 'Tổng tiền (đ)', 'Thời gian'];
    const lines = rows.map((r) => [
      `"${r.code}"`,
      `"${r.warehouse_name || ''}"`,
      `"${r.supplier_name || ''}"`,
      `"${r.created_by || ''}"`,
      r.total_amount || 0,
      `"${r.created_at || ''}"`,
    ].join(','));
    const csv = '\uFEFF' + [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Danh_sach_phieu_nhap_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    push('Đã xuất file dữ liệu phiếu nhập thành công!');
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>📥</span>
          <div>
            <div className="eyebrow">Quản lý kho hàng</div>
            <h1>Danh sách phiếu nhập kho</h1>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-excel" onClick={handleExportExcel} title="Tải file Excel / CSV">
            <span>📊</span> Xuất excel
          </button>
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <span>+</span> Tạo phiếu nhập
          </button>
        </div>
      </div>

      {/* Stats Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
        <StatCard
          label="Tổng số phiếu nhập"
          value={stats.totalIn}
          icon="📥"
          color="cyan"
          subtext="Lịch sử nhập kho"
        />
        <StatCard
          label="Tổng giá trị nhập kho"
          value={formatMoney(stats.totalValue)}
          icon="💰"
          color="green"
          valueStyle={{ fontSize: 22 }}
          subtext="Tổng vốn hàng nhập"
        />
        <StatCard
          label="Nhà cung cấp đối tác"
          value={suppliers.length}
          icon="🏬"
          color="purple"
          subtext="Đối tác cung ứng"
        />
      </div>

      {/* Toolbar / Search & Filter */}
      <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
        <div className="toolbar" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 10, flex: 1, flexWrap: 'wrap' }}>
            <input
              type="text"
              className="search-input"
              placeholder="🔍 Tìm theo mã phiếu, nhà cung cấp..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: 260 }}
            />
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              style={{
                border: '1px solid var(--line-strong)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px',
                background: 'var(--surface)',
              }}
            >
              <option value="">Tất cả kho nhập</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <div className="text-faint mono" style={{ fontSize: 12 }}>
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
                <th style={{ width: 140 }}>Mã phiếu</th>
                <th>Kho nhập</th>
                <th>Nhà cung cấp</th>
                <th>Người tạo</th>
                <th className="num" style={{ width: 150 }}>Tổng tiền</th>
                <th style={{ width: 170 }}>Thời gian</th>
                <th style={{ width: 90, textAlign: 'center' }}>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 && !loading && (
                <tr className="empty-row">
                  <td colSpan={7}>
                    {search || warehouseFilter ? 'Không tìm thấy phiếu nhập nào phù hợp.' : 'Chưa có phiếu nhập nào được tạo.'}
                  </td>
                </tr>
              )}
              {filteredRows.map((r) => (
                <tr key={r.id} onClick={() => openDetail(r)} style={{ cursor: 'pointer' }}>
                  <td>
                    <span className="sku-chip">{r.code}</span>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--ink)' }}>{r.warehouse_name}</strong>
                  </td>
                  <td>{r.supplier_name ? <span>{r.supplier_name}</span> : <span className="text-faint">—</span>}</td>
                  <td className="text-muted">{r.created_by || '—'}</td>
                  <td className="num" style={{ fontWeight: 700, color: 'var(--ink)' }}>
                    {formatMoney(r.total_amount)}
                  </td>
                  <td className="text-faint" style={{ fontSize: 12.5 }}>
                    {formatDate(r.created_at)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetail(r);
                      }}
                      style={{ padding: '3px 8px', fontSize: 11 }}
                    >
                      Xem
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shared Create Stock Document Modal */}
      <StockDocumentModal
        type="in"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={load}
        warehouses={warehouses}
        products={products}
        suppliers={suppliers}
        pushToast={push}
      />

      {/* Shared Detail Modal */}
      <StockDocumentDetailModal
        type="in"
        data={detailOpen}
        warehouses={warehouses}
        onClose={() => setDetailOpen(null)}
      />
    </div>
  );
}
