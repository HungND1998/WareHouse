import { useEffect, useState, useMemo } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { useAuth } from '../auth/AuthContext';
import StatCard from '../components/StatCard';
import TableState from '../components/TableState';
import Pagination from '../components/Pagination';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

/**
 * Trang CRUD chung cho các bảng đơn giản: categories, suppliers, warehouses.
 * fields: [{ key, label, type, required, placeholder }]
 */
export default function SimpleCrudPage({ resource, eyebrow, title, fields, canDelete = true }) {
  const { user } = useAuth();
  const { push } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    api
      .get(`/${resource}`)
      .then((res) => {
        setRows(res.data || []);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || `Không thể tải dữ liệu ${title.toLowerCase()}.`);
        push(err.message, 'error');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setPage(1);
  }, [search, resource]);

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

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await api.del(`/${resource}/${deleting.id}`);
      push(`Đã xóa ${title.toLowerCase()} "${deleting.name || deleting[fields[0]?.key]}".`);
      setDeleting(null);
      load();
    } catch (err) {
      push(err.message || 'Không thể xóa dữ liệu.', 'error');
    } finally {
      setDeleteLoading(false);
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

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  // Thống kê nghiệp vụ thực tế theo từng loại danh mục
  const businessStats = useMemo(() => {
    const total = rows.length;
    if (resource === 'categories') {
      const withDesc = rows.filter((r) => r.description && r.description.trim()).length;
      return {
        card1: {
          label: 'Tổng số danh mục',
          value: total,
          icon: '🗂',
          color: 'blue',
          subtext: 'Phân loại hàng hóa trong hệ thống',
        },
        card2: {
          label: 'Có mô tả chi tiết',
          value: withDesc,
          icon: '📝',
          color: 'green',
          subtext: `${withDesc} / ${total} danh mục có ghi chú`,
        },
      };
    }
    if (resource === 'suppliers') {
      const withContact = rows.filter((r) => r.phone || r.email).length;
      const withAddress = rows.filter((r) => r.address && r.address.trim()).length;
      return {
        card1: {
          label: 'Tổng nhà cung cấp',
          value: total,
          icon: '🏢',
          color: 'blue',
          subtext: 'Đối tác cung ứng hàng hóa',
        },
        card2: {
          label: 'Có thông tin liên hệ',
          value: withContact,
          icon: '📞',
          color: 'green',
          subtext: `${withContact} / ${total} đối tác có SĐT hoặc Email`,
        },
        card3: {
          label: 'Có địa chỉ chi tiết',
          value: withAddress,
          icon: '📍',
          color: 'purple',
          subtext: `${withAddress} / ${total} đối tác có địa chỉ`,
        },
      };
    }
    if (resource === 'warehouses') {
      const withAddress = rows.filter((r) => r.address && r.address.trim()).length;
      return {
        card1: {
          label: 'Tổng cơ sở kho',
          value: total,
          icon: '▥',
          color: 'blue',
          subtext: 'Địa điểm lưu trữ & luân chuyển hàng',
        },
        card2: {
          label: 'Có địa chỉ cụ thể',
          value: withAddress,
          icon: '📍',
          color: 'green',
          subtext: `${withAddress} / ${total} kho có địa chỉ định vị`,
        },
      };
    }
    return {
      card1: {
        label: `Tổng số ${title.toLowerCase()}`,
        value: total,
        icon: '📦',
        color: 'blue',
        subtext: `Danh mục ${eyebrow.toLowerCase()} đã tạo`,
      },
      card2: {
        label: 'Dữ liệu hoàn chỉnh',
        value: total,
        icon: '✓',
        color: 'green',
        subtext: 'Sẵn sàng liên kết & sử dụng',
      },
    };
  }, [resource, rows, title, eyebrow]);

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <span>+</span> Thêm {title.toLowerCase()}
        </button>
      </div>

      {/* Stats Row */}
      <div className="stats-grid">
        {businessStats.card1 && (
          <StatCard
            label={businessStats.card1.label}
            value={businessStats.card1.value}
            icon={businessStats.card1.icon}
            color={businessStats.card1.color}
            subtext={businessStats.card1.subtext}
          />
        )}
        {businessStats.card2 && (
          <StatCard
            label={businessStats.card2.label}
            value={businessStats.card2.value}
            icon={businessStats.card2.icon}
            color={businessStats.card2.color}
            subtext={businessStats.card2.subtext}
          />
        )}
        {businessStats.card3 && !Boolean(search.trim()) && (
          <StatCard
            label={businessStats.card3.label}
            value={businessStats.card3.value}
            icon={businessStats.card3.icon}
            color={businessStats.card3.color}
            subtext={businessStats.card3.subtext}
          />
        )}
        {Boolean(search.trim()) && (
          <StatCard
            label="Kết quả tìm kiếm"
            value={filteredRows.length}
            icon="🔍"
            color="amber"
            subtext={`Lọc theo từ khóa "${search}"`}
          />
        )}
      </div>

      {/* Toolbar / Search */}
      <div className="filter-bar">
        <div className="toolbar">
          <div style={{ display: 'flex', gap: 10, flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              className="search-input"
              placeholder={`🔍 Tìm ${title.toLowerCase()}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: 280 }}
            />
            {Boolean(search) && (
              <button
                type="button"
                className="btn-reset-filter"
                onClick={() => setSearch('')}
                title="Xóa từ khóa tìm kiếm"
              >
                <span>✕</span> Xóa tìm kiếm
              </button>
            )}
          </div>
          <div className="record-count">
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
                <th style={{ width: 120, textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <TableState
                loading={loading}
                error={error}
                rows={filteredRows}
                colSpan={fields.length + 2}
                emptyIcon="📄"
                emptyTitle={search ? `Không tìm thấy ${title.toLowerCase()} phù hợp` : `Chưa có ${title.toLowerCase()} nào`}
                emptySubtext={
                  search
                    ? 'Vui lòng kiểm tra lại từ khóa tìm kiếm.'
                    : `Bắt đầu thêm bản ghi ${title.toLowerCase()} đầu tiên vào hệ thống.`
                }
                actionText={!search ? `+ Thêm ${title.toLowerCase()}` : undefined}
                onAction={!search ? openCreate : undefined}
                onRetry={load}
              />
              {!loading && !error && paginatedRows.map((row, idx) => (
                <tr key={row.id}>
                  <td style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 12.5, fontWeight: 600 }}>
                    {(page - 1) * pageSize + idx + 1}
                  </td>
                  {fields.map((f, fIdx) => (
                    <td key={f.key}>
                      {fIdx === 0 ? (
                        <strong style={{ color: 'var(--ink)', fontSize: 14 }}>{row[f.key]}</strong>
                      ) : (
                        row[f.key] || <span className="text-faint">—</span>
                      )}
                    </td>
                  ))}
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(row)} style={{ marginRight: 6 }}>
                      ✏️ Sửa
                    </button>
                    {canDelete && user?.role === 'admin' && (
                      <button className="btn btn-danger btn-sm" onClick={() => setDeleting(row)}>
                        🗑️ Xóa
                      </button>
                    )}
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

      {/* Form Modal */}
      {modalOpen && (
        <Modal
          title={editing ? `Sửa: ${editing.name}` : `Thêm ${title.toLowerCase()} mới`}
          wide={600}
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

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        open={Boolean(deleting)}
        title={`Xóa ${title.toLowerCase()}`}
        itemName={deleting?.name || deleting?.[fields[0]?.key] || ''}
        itemType={title.toLowerCase()}
        warningText={`Hành động này sẽ xóa ${title.toLowerCase()} và không thể hoàn tác.`}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
        loading={deleteLoading}
      />
    </div>
  );
}
