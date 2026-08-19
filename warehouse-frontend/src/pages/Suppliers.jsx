import SimpleCrudPage from './SimpleCrudPage';

export default function Suppliers() {
  return (
    <SimpleCrudPage
      resource="suppliers"
      eyebrow="Đối tác"
      title="Nhà cung cấp"
      fields={[
        { key: 'name', label: 'Tên nhà cung cấp', required: true },
        { key: 'phone', label: 'Điện thoại' },
        { key: 'email', label: 'Email' },
        { key: 'address', label: 'Địa chỉ' },
      ]}
    />
  );
}
