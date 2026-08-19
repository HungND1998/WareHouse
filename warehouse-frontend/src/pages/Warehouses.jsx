import SimpleCrudPage from './SimpleCrudPage';

export default function Warehouses() {
  return (
    <SimpleCrudPage
      resource="warehouses"
      eyebrow="Cơ sở"
      title="Kho hàng"
      fields={[
        { key: 'name', label: 'Tên kho', required: true },
        { key: 'address', label: 'Địa chỉ' },
      ]}
    />
  );
}
