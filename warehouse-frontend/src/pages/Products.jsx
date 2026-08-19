import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { useAuth } from '../auth/AuthContext';
import { StockBadge, formatMoney, formatNumber } from '../components/Badge';

const EMPTY_FORM = { sku: '', name: '', category_id: '', unit: 'cái', cost_price: '', sale_price: '', min_stock: '', description: '' };

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
      .get('/products', { search, category_id: categoryFilter })
      .then((res) => setRows(res.data))
      .catch((err) => push(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [search, categoryFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data));
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
    setForm({ ...EMPTY_FORM, ...row });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      category_id: form.category_id || null,
      cost_price: Number(form.cost_price) || 0,
      sale_price: Number(form.sale_price) || 0,
      min_stock: Number(form.min_stock) || 0,
    };
    try {
      if (editing) {
        await api.put(`/products/${editing.id}`, payload);
        push('Đã cập nhật sản phẩm.');
      } else {
        await api.post('/products', payload);
        push('Đã thêm sản phẩm.');
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

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Danh mục hàng hóa</div>
          <h1>Sản phẩm</h1>
        </div>
        <div className="toolbar">
          <input
            className="search-input"
            placeholder="Tìm theo tên hoặc SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ padding: '8px 10px', borderRadius: 4, border: '1px solid var(--line-strong)' }}>
            <option value="">Tất cả danh mục</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={openCreate}>+ Thêm sản phẩm</button>
        </div>
      </div>

      {loading && <div className="loading-bar" style={{ marginBottom: 16 }} />}

      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Tên sản phẩm</th>
                <th>Danh mục</th>
                <th className="num">Giá vốn</th>
                <th className="num">Giá bán</th>
                <th className="num">Tồn kho</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && (
                <tr className="empty-row"><td colSpan={8}>Không tìm thấy sản phẩm nào.</td></tr>
              )}
              {rows.map((p) => (
                <tr key={p.id}>
                  <td><span className="sku-chip">{p.sku}</span></td>
                  <td>{p.name}</td>
                  <td className="text-muted">{p.category_name || '—'}</td>
                  <td className="num">{formatMoney(p.cost_price)}</td>
                  <td className="num">{formatMoney(p.sale_price)}</td>
                  <td className="num">{formatNumber(p.total_stock)} {p.unit}</td>
                  <td><StockBadge quantity={p.total_stock} minStock={p.min_stock} /></td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>Sửa</button>{' '}
                    {user?.role === 'admin' && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p)}>Xóa</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <Modal
          title={editing ? `Sửa sản phẩm: ${editing.name}` : 'Thêm sản phẩm mới'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Đang lưu…' : 'Lưu sản phẩm'}
              </button>
            </>
          }
        >
          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <div className="field">
                <label>Mã SKU *</label>
                <input value={form.sku} required onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </div>
              <div className="field">
                <label>Đơn vị tính</label>
                <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="cái, hộp, kg…" />
              </div>
            </div>
            <div className="field">
              <label>Tên sản phẩm *</label>
              <input value={form.name} required onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label>Danh mục</label>
              <select value={form.category_id || ''} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">— Không chọn —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Giá vốn (đ)</label>
                <input type="number" min="0" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} />
              </div>
              <div className="field">
                <label>Giá bán (đ)</label>
                <input type="number" min="0" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Mức tồn kho tối thiểu</label>
              <input type="number" min="0" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} />
              <div className="field-hint">Hệ thống sẽ cảnh báo khi tồn kho ≤ mức này.</div>
            </div>
            <div className="field">
              <label>Mô tả</label>
              <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
