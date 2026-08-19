import SimpleCrudPage from './SimpleCrudPage';

export default function Categories() {
  return (
    <SimpleCrudPage
      resource="categories"
      eyebrow="Danh mục"
      title="Danh mục sản phẩm"
      fields={[
        { key: 'name', label: 'Tên danh mục', required: true },
        { key: 'description', label: 'Mô tả', type: 'textarea' },
      ]}
    />
  );
}
