import { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { useAuth } from '../auth/AuthContext';
import { StockBadge, formatMoney, formatNumber } from '../components/Badge';
import StatCard from '../components/StatCard';

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
  const { user } = useAuth();
  const { push } = useToast();
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/products', { search, category_id: categoryFilter, limit: 500 })
      .then((res) => setRows(res.data || []))
      .catch((err) => push(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [search, categoryFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data || []));
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(row) {
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

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.sku?.trim()) return push('Vui lòng nhập mã SKU.', 'error');
    if (!form.name?.trim()) return push('Vui lòng nhập tên sản phẩm.', 'error');

    setSaving(true);
    const payload = {
      ...form,
      sku: form.sku.trim().toUpperCase(),
      name: form.name.trim(),
      category_id: form.category_id ? Number(form.category_id) : null,
      cost_price: Number(form.cost_price) || 0,
      sale_price: Number(form.sale_price) || 0,
      min_stock: Number(form.min_stock) || 0,
      description: form.description?.trim() || null,
    };

    try {
      if (editing) {
        await api.put(`/products/${editing.id}`, payload);
        push('Đã cập nhật sản phẩm thành công!');
      } else {
        await api.post('/products', payload);
        push('Đã thêm sản phẩm mới thành công!');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row) {
    if (!confirm(`Xóa sản phẩm "${row.name}"?`)) return;
    try {
      await api.del(`/products/${row.id}`);
      push('Đã xóa sản phẩm.');
      load();
    } catch (err) {
      push(err.message, 'error');
    }
  }

  // Stats
  const stats = useMemo(() => {
    const total = rows.length;
    const lowStock = rows.filter((p) => p.min_stock != null && p.total_stock <= p.min_stock).length;
    const totalInventoryQty = rows.reduce((sum, p) => sum + (Number(p.total_stock) || 0), 0);
    return { total, lowStock, totalInventoryQty };
  }, [rows]);

  function handleExportExcel() {
    if (rows.length === 0) return push('Không có dữ liệu để xuất.', 'error');
    const header = ['Mã SKU', 'Tên sản phẩm', 'Danh mục', 'Giá vốn (đ)', 'Giá bán (đ)', 'Tồn kho', 'Đơn vị'];
    const lines = rows.map((p) => [
      `"${p.sku}"`,
      `"${p.name}"`,
      `"${p.category_name || ''}"`,
      p.cost_price || 0,
      p.sale_price || 0,
      p.total_stock || 0,
      `"${p.unit || ''}"`,
    ].join(','));
    const csv = '\uFEFF' + [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Danh_sach_san_pham_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    push('Đã xuất file dữ liệu thành công!');
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
          <button className="btn btn-primary" onClick={openCreate}>
            <span>+</span> Thêm mới
          </button>
        </div>
      </div>

      {/* Stats Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
        <StatCard
          label="Tổng mặt hàng"
          value={stats.total}
          icon="📦"
          color="blue"
          subtext="Sản phẩm trong danh mục"
        />
        <StatCard
          label="Cảnh báo tồn kho thấp"
          value={stats.lowStock}
          icon="⚠️"
          color={stats.lowStock > 0 ? 'red' : 'green'}
          subtext={stats.lowStock > 0 ? 'Dưới mức tối thiểu' : 'Đạt mức an toàn'}
        />
        <StatCard
          label="Tổng số lượng tồn trong kho"
          value={formatNumber(stats.totalInventoryQty)}
          icon="▦"
          color="purple"
          subtext="Tổng số lượng chiếc/hộp"
        />
      </div>

      {/* Toolbar / Search & Filter */}
      <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
        <div className="toolbar" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 10, flex: 1, flexWrap: 'wrap' }}>
            <input
              className="search-input"
              placeholder="🔍 Tìm theo tên hoặc mã SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: 260 }}
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                border: '1px solid var(--line-strong)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px',
                background: 'var(--surface)',
              }}
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="text-faint mono" style={{ fontSize: 12 }}>
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
                <th style={{ width: 140 }}>Mã SKU</th>
                <th>Tên sản phẩm</th>
                <th>Danh mục</th>
                <th className="num">Giá vốn</th>
                <th className="num">Giá bán</th>
                <th className="num">Tồn kho</th>
                <th style={{ width: 120 }}>Trạng thái</th>
                <th style={{ width: 110, textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && (
                <tr className="empty-row">
                  <td colSpan={8}>Không tìm thấy sản phẩm nào phù hợp.</td>
                </tr>
              )}
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className="sku-chip">{p.sku}</span>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--ink)' }}>{p.name}</strong>
                  </td>
                  <td className="text-muted">{p.category_name || '—'}</td>
                  <td className="num">{formatMoney(p.cost_price)}</td>
                  <td className="num" style={{ fontWeight: 600 }}>{formatMoney(p.sale_price)}</td>
                  <td className="num" style={{ fontWeight: 700 }}>
                    {formatNumber(p.total_stock)} {p.unit}
                  </td>
                  <td>
                    <StockBadge quantity={p.total_stock} minStock={p.min_stock} />
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>
                      Sửa
                    </button>{' '}
                    {user?.role === 'admin' && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p)}>
                        Xóa
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Form Modal */}
      {modalOpen && (
        <Modal
          title={editing ? `Sửa sản phẩm: ${editing.name}` : 'Thêm sản phẩm mới'}
          wide={700}
          onClose={() => setModalOpen(false)}
          footer={
            <div style={{ display: 'flex', width: '100%', justifyContent: 'flex-end', gap: 10 }}>
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
                    placeholder="VD: SP-001, PRD-A01..."
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
    </div>
  );
}
