import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { useAuth } from '../auth/AuthContext';
import { StockBadge, formatMoney, formatNumber } from '../components/Badge';
import StatCard from '../components/StatCard';
import TableState from '../components/TableState';
import Pagination from '../components/Pagination';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import { exportToExcel } from '../utils/excelExport';

const EMPTY_FORM = {
  sku: '',
  name: '',
  category_id: '',
  unit: 'cái',
  cost_price: '',
  sale_price: '',
  min_stock: '',
  description: '',
};

export default function Products() {
  const { user, hasPerm } = useAuth();
  const { push } = useToast();
  const isAdmin = user?.role === 'admin';
  const canCreate = hasPerm('products.create');
  const canEdit = hasPerm('products.edit');
  const canDelete = hasPerm('products.delete');
  const canViewCost = hasPerm('products.view_cost');

  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get('/products', { search, category_id: categoryFilter, limit: 1000 })
      .then((res) => {
        setRows(res.data || []);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || 'Không thể tải dữ liệu sản phẩm.');
        push(err.message, 'error');
      })
      .finally(() => setLoading(false));
  }, [search, categoryFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter]);

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data || []));
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  function openCreate() {
    if (!canCreate) {
      return push('Bạn không có quyền thêm mới sản phẩm.', 'error');
    }
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(row) {
    if (!canEdit) {
      return push('Bạn không có quyền chỉnh sửa sản phẩm.', 'error');
    }
    setEditing(row);
    setForm({
      ...EMPTY_FORM,
      ...row,
      category_id: row.category_id || '',
      cost_price: row.cost_price ?? '',
      sale_price: row.sale_price ?? '',
      min_stock: row.min_stock ?? '',
      description: row.description || '',
    });
    setModalOpen(true);
  }

  async function openView(product) {
    try {
      const res = await api.get(`/products/${product.id}`);
      setViewingProduct({ ...product, ...res.data });
    } catch {
      setViewingProduct(product);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (editing && !canEdit) {
      return push('Bạn không có quyền cập nhật sản phẩm.', 'error');
    }
    if (!editing && !canCreate) {
      return push('Bạn không có quyền thêm mới sản phẩm.', 'error');
    }
    if (!form.sku || !form.name) {
      return push('Vui lòng điền đủ SKU và Tên sản phẩm.', 'error');
    }
    setSaving(true);
    try {
      const payload = {
        sku: form.sku.trim(),
        name: form.name.trim(),
        category_id: form.category_id ? Number(form.category_id) : null,
        unit: form.unit?.trim() || 'cái',
        cost_price: Number(form.cost_price) || 0,
        sale_price: Number(form.sale_price) || 0,
        min_stock: Number(form.min_stock) || 0,
        description: form.description?.trim() || null,
      };

      if (editing) {
        await api.put(`/products/${editing.id}`, payload);
        push('Cập nhật sản phẩm thành công!');
      } else {
        await api.post('/products', payload);
        push('Tạo sản phẩm mới thành công!');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting || !canDelete) {
      return push('Bạn không có quyền xóa sản phẩm.', 'error');
    }
    setDeleteLoading(true);
    try {
      await api.del(`/products/${deleting.id}`);
      push(`Đã xóa sản phẩm "${deleting.name}".`);
      setDeleting(null);
      load();
    } catch (err) {
      push(err.message || 'Không thể xóa sản phẩm.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  }

  // Stats
  const stats = useMemo(() => {
    const total = rows.length;
    const outOfStock = rows.filter((p) => (Number(p.total_stock) || 0) <= 0).length;
    const lowStock = rows.filter((p) => {
      const qty = Number(p.total_stock) || 0;
      return p.min_stock != null && qty > 0 && qty <= Number(p.min_stock);
    }).length;
    const totalInventoryQty = rows.reduce((sum, p) => sum + (Number(p.total_stock) || 0), 0);
    return { total, outOfStock, lowStock, totalInventoryQty };
  }, [rows]);

  function handleExportExcel() {
    if (rows.length === 0) return push('Không có dữ liệu để xuất.', 'error');
    const headers = canViewCost
      ? ['Mã SKU', 'Tên sản phẩm', 'Danh mục', 'Giá vốn (đ)', 'Giá bán (đ)', 'Tồn kho', 'Đơn vị']
      : ['Mã SKU', 'Tên sản phẩm', 'Danh mục', 'Giá bán (đ)', 'Tồn kho', 'Đơn vị'];
    const data = rows.map((p) =>
      canViewCost
        ? [
            p.sku || '',
            p.name || '',
            p.category_name || '',
            Number(p.cost_price) || 0,
            Number(p.sale_price) || 0,
            Number(p.total_stock) || 0,
            p.unit || '',
          ]
        : [
            p.sku || '',
            p.name || '',
            p.category_name || '',
            Number(p.sale_price) || 0,
            Number(p.total_stock) || 0,
            p.unit || '',
          ]
    );
    const dateStr = new Date().toISOString().slice(0, 10);
    exportToExcel({
      filename: `Danh_sach_san_pham_${dateStr}`,
      sheetName: 'Sản phẩm',
      title: 'BÁO CÁO DANH SÁCH SẢN PHẨM',
      subtitleInfo: [
        `Thời gian xuất: ${new Date().toLocaleString('vi-VN')}`,
        `Tổng số lượng mặt hàng: ${rows.length} sản phẩm`,
      ],
      headers,
      data,
    });
    push('Đã xuất file Excel danh sách sản phẩm thành công!');
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>📄</span>
          <div>
            <div className="eyebrow">Quản lý hàng hóa</div>
            <h1>Danh sách sản phẩm</h1>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-excel" onClick={handleExportExcel} title="Tải file Excel / CSV">
            <span>📊</span> Xuất excel
          </button>
          {canCreate && (
            <button className="btn btn-primary" onClick={openCreate}>
              <span>+</span> Thêm mới
            </button>
          )}
        </div>
      </div>

      {/* Stats Tiles */}
      <div className="stats-grid">
        <StatCard
          label="Tổng mặt hàng"
          value={stats.total}
          icon="📦"
          color="blue"
          subtext="Sản phẩm trong danh mục"
        />
        <StatCard
          label="Hết hàng"
          value={stats.outOfStock}
          icon="🚫"
          color={stats.outOfStock > 0 ? 'red' : 'green'}
          subtext={stats.outOfStock > 0 ? 'Tồn kho bằng 0 (Cần nhập)' : 'Không có sản phẩm hết hàng'}
        />
        <StatCard
          label="Sản phẩm sắp hết"
          value={stats.lowStock}
          icon="⚠️"
          color={stats.lowStock > 0 ? 'amber' : 'green'}
          subtext={stats.lowStock > 0 ? 'Dưới mức tồn an toàn' : 'Tồn kho ổn định'}
        />
        <StatCard
          label="Tổng số lượng tồn kho"
          value={formatNumber(stats.totalInventoryQty)}
          icon="▦"
          color="purple"
          subtext="Tổng số lượng chiếc/hộp"
        />
      </div>

      {/* Toolbar / Search & Filter */}
      <div className="filter-bar">
        <div className="toolbar">
          <div style={{ display: 'flex', gap: 10, flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              className="search-input"
              placeholder="🔍 Tìm SKU hoặc tên sản phẩm…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: 280 }}
            />
            <select
              className="filter-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {Boolean(search || categoryFilter) && (
              <button
                type="button"
                className="btn-reset-filter"
                onClick={() => {
                  setSearch('');
                  setCategoryFilter('');
                }}
                title="Xóa tất cả điều kiện lọc"
              >
                <span>✕</span> Xóa bộ lọc
              </button>
            )}
          </div>
          <div className="record-count">
            Hiển thị <strong>{rows.length}</strong> sản phẩm
          </div>
        </div>
      </div>

      {loading && <div className="loading-bar" style={{ marginBottom: 16 }} />}

      {/* Products Table */}
      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 50, textAlign: 'center' }}>#</th>
                <th style={{ width: 130, minWidth: 120, whiteSpace: 'nowrap' }}>Mã SKU</th>
                <th style={{ minWidth: 200 }}>Tên sản phẩm</th>
                <th style={{ width: 170, minWidth: 160, whiteSpace: 'nowrap' }}>Danh mục</th>
                {canViewCost && <th className="num" style={{ width: 130, minWidth: 120, whiteSpace: 'nowrap' }}>Giá vốn</th>}
                <th className="num" style={{ width: 130, minWidth: 120, whiteSpace: 'nowrap' }}>Giá bán</th>
                <th className="num" style={{ width: 120, minWidth: 110, whiteSpace: 'nowrap' }}>Tồn kho</th>
                <th style={{ width: 130, minWidth: 120, whiteSpace: 'nowrap' }}>Trạng thái</th>
                <th style={{ width: 150, minWidth: 150, textAlign: 'right', whiteSpace: 'nowrap' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <TableState
                loading={loading}
                error={error}
                rows={rows}
                colSpan={canViewCost ? 9 : 8}
                emptyIcon="📦"
                isFiltered={Boolean(search.trim() || categoryFilter)}
                onClearFilter={() => {
                  setSearch('');
                  setCategoryFilter('');
                }}
                emptyTitle="Chưa có sản phẩm nào trong kho"
                emptySubtext={
                  canCreate
                    ? 'Bắt đầu thêm mặt hàng mới để quản lý tồn kho và giá bán.'
                    : 'Hệ thống hiện chưa ghi nhận sản phẩm nào.'
                }
                actionText={canCreate ? '+ Thêm sản phẩm mới' : undefined}
                onAction={canCreate ? openCreate : undefined}
                onRetry={load}
              />
              {!loading && !error && paginatedRows.map((p, idx) => (
                <tr key={p.id}>
                  <td style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 13, fontWeight: 600 }}>
                    {(page - 1) * pageSize + idx + 1}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span className="sku-chip">{p.sku}</span>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--ink)', fontSize: 14.5 }}>{p.name}</strong>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>{p.category_name || '—'}</td>
                  {canViewCost && <td className="num" style={{ whiteSpace: 'nowrap' }}>{p.cost_price != null ? formatMoney(p.cost_price) : '—'}</td>}
                  <td className="num" style={{ fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{formatMoney(p.sale_price)}</td>
                  <td className="num" style={{ fontWeight: 800, color: 'var(--ink)', fontSize: 14.5, whiteSpace: 'nowrap' }}>
                    {formatNumber(p.total_stock)} {p.unit}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <StockBadge quantity={p.total_stock} minStock={p.min_stock} />
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end' }}>
                      {canEdit && (
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>
                          ✏️ Sửa
                        </button>
                      )}
                      {canDelete && (
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleting(p)}>
                          🗑️ Xóa
                        </button>
                      )}
                      {!canEdit && !canDelete && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => openView(p)}
                          style={{ padding: '4px 10px', fontSize: 12, fontWeight: 600 }}
                        >
                          👁️ Chi tiết
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          pageSize={pageSize}
          total={rows.length}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          pageSizeOptions={[5, 10, 20, 50, 100]}
          hideOnSinglePage={false}
        />
      </div>

      {/* Product Form Modal */}
      {modalOpen && (
        <Modal
          title={editing ? `Sửa sản phẩm: ${editing.name}` : 'Thêm sản phẩm mới'}
          wide={700}
          onClose={() => setModalOpen(false)}
          footer={
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={saving}
                style={{ minWidth: 130, fontWeight: 700 }}
              >
                {saving ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : '+ Thêm sản phẩm'}
              </button>
            </div>
          }
        >
          <form onSubmit={handleSubmit}>
            {/* Thẻ 1: Thông tin cơ bản */}
            <div className="form-card">
              <div className="form-card-title">
                <span>1. Thông tin định danh</span>
                <span className="tag">BẮT BUỘC</span>
              </div>

              <div className="grid-2">
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>
                    Mã SKU <span style={{ color: 'var(--warn)' }}>*</span>
                  </label>
                  <input
                    value={form.sku}
                    required
                    placeholder="VD: SKU-001, PRD-A01..."
                    onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
                    style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                  />
                </div>

                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Đơn vị tính</label>
                  <input
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    placeholder="cái, hộp, thùng, kg…"
                  />
                </div>
              </div>

              <div className="field" style={{ marginTop: 12, marginBottom: 0 }}>
                <label>
                  Tên sản phẩm <span style={{ color: 'var(--warn)' }}>*</span>
                </label>
                <input
                  value={form.name}
                  required
                  placeholder="Nhập tên sản phẩm đầy đủ..."
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="field" style={{ marginTop: 12, marginBottom: 0 }}>
                <label>Danh mục hàng hóa</label>
                <select
                  value={form.category_id || ''}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                >
                  <option value="">— Không chọn danh mục —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Thẻ 2: Giá cả & Định mức tồn kho */}
            <div className="form-card">
              <div className="form-card-title">
                <span>2. Giá trị & Cảnh báo tồn kho</span>
              </div>

              <div className="grid-2">
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Giá vốn nhập (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    placeholder="0"
                    value={form.cost_price}
                    onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                  {Number(form.cost_price) > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                      {formatMoney(form.cost_price)}
                    </div>
                  )}
                </div>

                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Giá bán niêm yết (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    placeholder="0"
                    value={form.sale_price}
                    onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                  {Number(form.sale_price) > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                      {formatMoney(form.sale_price)}
                    </div>
                  )}
                </div>
              </div>

              <div className="field" style={{ marginTop: 12, marginBottom: 0 }}>
                <label>Mức tồn kho tối thiểu (Cảnh báo)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="VD: 5, 10..."
                  value={form.min_stock}
                  onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
                />
                <div className="field-hint">
                  Hệ thống sẽ gắn nhãn cảnh báo vàng/đỏ khi tồn kho khả dụng ≤ mức này.
                </div>
              </div>
            </div>

            {/* Thẻ 3: Mô tả */}
            <div className="form-card" style={{ marginBottom: 0 }}>
              <div className="form-card-title">
                <span>3. Ghi chú & Mô tả chi tiết</span>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <textarea
                  rows={3}
                  value={form.description}
                  placeholder="Thông số kỹ thuật, quy cách đóng gói, xuất xứ..."
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirm Delete Product Modal */}
      <ConfirmDeleteModal
        open={Boolean(deleting)}
        title="Xóa sản phẩm"
        itemName={deleting ? `${deleting.sku} — ${deleting.name}` : ''}
        itemType="sản phẩm"
        warningText="Xóa sản phẩm sẽ loại bỏ thông tin sản phẩm và các bản ghi tồn kho liên quan khỏi danh mục quản lý."
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
        loading={deleteLoading}
      />

      {/* Product Detail Modal for Staff / Read-Only */}
      {viewingProduct && (
        <Modal
          title={`Chi tiết sản phẩm: ${viewingProduct.name}`}
          wide={680}
          onClose={() => setViewingProduct(null)}
          footer={
            <div className="modal-actions">
              <button type="button" className="btn btn-primary" onClick={() => setViewingProduct(null)}>
                Đóng
              </button>
            </div>
          }
        >
          <div className="form-card" style={{ marginBottom: 14 }}>
            <div className="form-card-title">
              <span>Thông tin định danh & giá</span>
              <span className="tag" style={{ background: '#f1f5f9', color: '#475569' }}>CHẾ ĐỘ XEM</span>
            </div>

            <div className="grid-2">
              <div className="field" style={{ marginBottom: 10 }}>
                <label style={{ color: 'var(--text-muted)' }}>Mã SKU</label>
                <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 6, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {viewingProduct.sku}
                </div>
              </div>
              <div className="field" style={{ marginBottom: 10 }}>
                <label style={{ color: 'var(--text-muted)' }}>Đơn vị tính</label>
                <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 6, fontWeight: 600 }}>
                  {viewingProduct.unit || 'cái'}
                </div>
              </div>
            </div>

            <div className="field" style={{ marginBottom: 10 }}>
              <label style={{ color: 'var(--text-muted)' }}>Tên sản phẩm</label>
              <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 6, fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>
                {viewingProduct.name}
              </div>
            </div>

            <div className="grid-2">
              <div className="field" style={{ marginBottom: 10 }}>
                <label style={{ color: 'var(--text-muted)' }}>Danh mục hàng hóa</label>
                <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 6, fontWeight: 500 }}>
                  {viewingProduct.category_name || '—'}
                </div>
              </div>
              <div className="field" style={{ marginBottom: 10 }}>
                <label style={{ color: 'var(--text-muted)' }}>Giá bán niêm yết</label>
                <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 6, fontWeight: 700, color: 'var(--ink)' }}>
                  {formatMoney(viewingProduct.sale_price)}
                </div>
              </div>
            </div>

            {viewingProduct.description && (
              <div className="field" style={{ marginTop: 4, marginBottom: 0 }}>
                <label style={{ color: 'var(--text-muted)' }}>Mô tả sản phẩm</label>
                <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 6, fontSize: 13, whiteSpace: 'pre-wrap' }}>
                  {viewingProduct.description}
                </div>
              </div>
            )}
          </div>

          {/* Phân bố tồn kho theo từng kho */}
          <div className="form-card" style={{ marginBottom: 0 }}>
            <div className="form-card-title">
              <span>Tồn kho tại các cơ sở</span>
              <span className="tag" style={{ background: 'var(--primary)', color: '#fff' }}>
                Tổng: {formatNumber(viewingProduct.total_stock)} {viewingProduct.unit || 'cái'}
              </span>
            </div>

            {viewingProduct.stockByWarehouse && viewingProduct.stockByWarehouse.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                {viewingProduct.stockByWarehouse.map((w) => (
                  <div
                    key={w.warehouse_id}
                    style={{
                      padding: '10px 14px',
                      background: '#f8fafc',
                      borderRadius: 6,
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 600 }}>{w.warehouse_name}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: w.quantity > 0 ? 'var(--ink)' : 'var(--warn)' }}>
                      {formatNumber(w.quantity)} <span style={{ fontSize: 12, fontWeight: 500 }}>{viewingProduct.unit || 'cái'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-faint)', fontStyle: 'italic', padding: 8 }}>
                Hiện chưa có tồn kho tại cơ sở nào.
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
