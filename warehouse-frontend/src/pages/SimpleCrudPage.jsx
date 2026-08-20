import { useEffect, useState, useMemo } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { useAuth } from '../auth/AuthContext';
import StatCard from '../components/StatCard';

/**
 * Trang CRUD chung cho các bảng đơn giản: categories, suppliers, warehouses.
 * fields: [{ key, label, type, required, placeholder }]
 */
export default function SimpleCrudPage({ resource, eyebrow, title, fields, canDelete = true }) {
  const { user } = useAuth();
  const { push } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api
      .get(`/${resource}`)
      .then((res) => setRows(res.data || []))
      .catch((err) => push(err.message, 'error'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [resource]);

  function openCreate() {
    setEditing(null);
    setForm({});
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm(row);
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/${resource}/${editing.id}`, form);
        push('Đã cập nhật thành công!');
      } else {
        await api.post(`/${resource}`, form);
        push('Đã thêm mới thành công!');
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
    if (!confirm(`Xóa "${row.name}"? Hành động này không thể hoàn tác.`)) return;
    try {
      await api.del(`/${resource}/${row.id}`);
      push('Đã xóa dữ liệu.');
      load();
    } catch (err) {
      push(err.message, 'error');
    }
  }

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const term = search.toLowerCase();
    return rows.filter((r) => {
      return fields.some((f) => {
        const val = r[f.key];
        return val && String(val).toLowerCase().includes(term);
      });
    });
  }, [rows, search, fields]);

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="eyebrow">Quản lý kho vận · {eyebrow}</div>
          <h1>{title}</h1>
        </div>
        <button className="btn btn-primary" onClick={openCreate} style={{ padding: '10px 20px' }}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Thêm {title.toLowerCase()}
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
        <StatCard
          label={`Tổng số ${title.toLowerCase()}`}
          value={rows.length}
          icon="📦"
          color="blue"
          subtext={`Danh mục ${eyebrow.toLowerCase()} đã tạo`}
        />
        <StatCard
          label="Kết quả tìm kiếm"
          value={filteredRows.length}
          icon="✓"
          color="green"
          subtext={search ? `Lọc theo từ khóa "${search}"` : 'Tất cả dữ liệu hiển thị'}
        />
        <StatCard
          label="Trạng thái hệ thống"
          value="Hoạt động"
          icon="⚡"
          color="purple"
          valueStyle={{ fontSize: 20 }}
          subtext="Sẵn sàng thao tác & lưu trữ"
        />
      </div>

      {/* Toolbar / Search */}
      <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
        <div className="toolbar" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 10, flex: 1, flexWrap: 'wrap' }}>
            <input
              type="text"
              className="search-input"
              placeholder={`🔍 Tìm kiếm ${title.toLowerCase()}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: 280 }}
            />
          </div>
          <div className="text-faint mono" style={{ fontSize: 12 }}>
            Tổng số: <strong>{filteredRows.length}</strong> / {rows.length} bản ghi
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
                <th style={{ width: 50, textAlign: 'center' }}>#</th>
                {fields.map((f) => (
                  <th key={f.key}>{f.label}</th>
                ))}
                <th style={{ width: 110, textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 && !loading && (
                <tr className="empty-row">
                  <td colSpan={fields.length + 2}>
                    {search ? 'Không tìm thấy kết quả phù hợp.' : 'Chưa có dữ liệu. Nhấn "+ Thêm mới" để bắt đầu.'}
                  </td>
                </tr>
              )}
              {filteredRows.map((row, idx) => (
                <tr key={row.id}>
                  <td style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 12 }}>{idx + 1}</td>
                  {fields.map((f, fIdx) => (
                    <td key={f.key}>
                      {fIdx === 0 ? (
                        <strong style={{ color: 'var(--ink)' }}>{row[f.key]}</strong>
                      ) : (
                        row[f.key] || <span className="text-faint">—</span>
                      )}
                    </td>
                  ))}
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(row)}>
                      Sửa
                    </button>{' '}
                    {canDelete && user?.role === 'admin' && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(row)}>
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

      {/* Form Modal */}
      {modalOpen && (
        <Modal
          title={editing ? `Sửa: ${editing.name}` : `Thêm ${title.toLowerCase()} mới`}
          wide={600}
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
                style={{ minWidth: 120, fontWeight: 700 }}
              >
                {saving ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : '+ Thêm mới'}
              </button>
            </div>
          }
        >
          <form onSubmit={handleSubmit}>
            <div className="form-card" style={{ marginBottom: 0 }}>
              <div className="form-card-title">
                <span>Thông tin {title.toLowerCase()}</span>
                <span className="tag">{editing ? 'CHỈNH SỬA' : 'TẠO MỚI'}</span>
              </div>

              {fields.map((f) => (
                <div className="field" key={f.key} style={{ marginBottom: 14 }}>
                  <label>
                    {f.label} {f.required && <span style={{ color: 'var(--warn)' }}>*</span>}
                  </label>
                  {f.type === 'textarea' ? (
                    <textarea
                      rows={3}
                      placeholder={f.placeholder || `Nhập ${f.label.toLowerCase()}…`}
                      value={form[f.key] || ''}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    />
                  ) : (
                    <input
                      value={form[f.key] || ''}
                      required={f.required}
                      placeholder={f.placeholder || `Nhập ${f.label.toLowerCase()}…`}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
