import { useEffect, useState } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { useAuth } from '../auth/AuthContext';

/**
 * Trang CRUD chung cho các bảng đơn giản: categories, suppliers, warehouses.
 * fields: [{ key, label, type }]
 */
export default function SimpleCrudPage({ resource, eyebrow, title, fields, canDelete = true }) {
  const { user } = useAuth();
  const { push } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api
      .get(`/${resource}`)
      .then((res) => setRows(res.data))
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
        push('Đã cập nhật.');
      } else {
        await api.post(`/${resource}`, form);
        push('Đã thêm mới.');
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
      push('Đã xóa.');
      load();
    } catch (err) {
      push(err.message, 'error');
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Thêm mới</button>
      </div>

      {loading && <div className="loading-bar" style={{ marginBottom: 16 }} />}

      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {fields.map((f) => (
                  <th key={f.key}>{f.label}</th>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && (
                <tr className="empty-row">
                  <td colSpan={fields.length + 1}>Chưa có dữ liệu. Nhấn "+ Thêm mới" để bắt đầu.</td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id}>
                  {fields.map((f) => (
                    <td key={f.key}>{row[f.key] || <span className="text-faint">—</span>}</td>
                  ))}
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(row)}>Sửa</button>{' '}
                    {canDelete && user?.role === 'admin' && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(row)}>Xóa</button>
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
          title={editing ? `Sửa: ${editing.name}` : `Thêm ${title.toLowerCase()}`}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Đang lưu…' : 'Lưu'}
              </button>
            </>
          }
        >
          <form onSubmit={handleSubmit}>
            {fields.map((f) => (
              <div className="field" key={f.key}>
                <label>{f.label}{f.required && ' *'}</label>
                {f.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    value={form[f.key] || ''}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  />
                ) : (
                  <input
                    value={form[f.key] || ''}
                    required={f.required}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  />
                )}
              </div>
            ))}
          </form>
        </Modal>
      )}
    </div>
  );
}
