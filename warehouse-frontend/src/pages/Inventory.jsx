import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { formatNumber, formatDate } from '../components/Badge';
import { useToast } from '../components/Toast';

export default function Inventory() {
  const { push } = useToast();
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/warehouses').then((res) => setWarehouses(res.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .get('/inventory', { warehouse_id: warehouseId })
      .then((res) => setRows(res.data))
      .catch((err) => push(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [warehouseId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Số lượng hiện có</div>
          <h1>Tồn kho</h1>
        </div>
        <div className="toolbar">
          <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} style={{ padding: '8px 10px', borderRadius: 4, border: '1px solid var(--line-strong)' }}>
            <option value="">Tất cả các kho</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && <div className="loading-bar" style={{ marginBottom: 16 }} />}

      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Sản phẩm</th>
                <th>Kho</th>
                <th className="num">Số lượng</th>
                <th>Cập nhật lần cuối</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && (
                <tr className="empty-row"><td colSpan={5}>Chưa có dữ liệu tồn kho.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><span className="sku-chip">{r.sku}</span></td>
                  <td>{r.product_name}</td>
                  <td className="text-muted">{r.warehouse_name}</td>
                  <td className="num" style={{ fontWeight: 700 }}>{formatNumber(r.quantity)} {r.unit}</td>
                  <td className="text-faint" style={{ fontSize: 12.5 }}>{formatDate(r.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
