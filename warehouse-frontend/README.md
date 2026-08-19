# KhoVận — Frontend quản lý kho

Giao diện React (Vite) cho hệ thống quản lý kho, kết nối trực tiếp với
backend Warehouse Management API.

## Thiết kế

Tông "vận hành kho công nghiệp" thay vì giao diện SaaS chung chung: navy đậm +
vàng an toàn (như vạch kẻ sàn/biển báo trong kho thật), tiêu đề dùng font
condensed kiểu nhãn vận đơn (Oswald), số liệu/mã SKU dùng font mono (IBM Plex Mono)
để dễ scan nhanh. Chip mã SKU có gạch chéo nhạt mô phỏng nhãn dán thùng hàng —
đây là điểm nhấn thị giác xuyên suốt app.

## Cài đặt & chạy

Yêu cầu: backend đã chạy tại `http://localhost:4000` (xem README của backend).

```bash
npm install
cp .env.example .env      # chỉnh VITE_API_URL nếu backend chạy ở địa chỉ khác
npm run dev                # http://localhost:5173
```

Đăng nhập bằng tài khoản đã tạo ở bước seed của backend: **admin / admin123**

Build production:
```bash
npm run build      # xuất ra thư mục dist/
npm run preview    # xem thử bản build
```

## Cấu trúc

```
src/
├── api/client.js         # Wrapper fetch, tự đính kèm JWT token
├── auth/                 # AuthContext + RequireAuth (route bảo vệ)
├── components/
│   ├── Layout.jsx        # Sidebar + khung trang chính
│   ├── Modal.jsx, Toast.jsx, Badge.jsx
│   └── ui.css             # Toàn bộ design tokens & component styles
├── pages/
│   ├── Login.jsx
│   ├── Dashboard.jsx      # Số liệu tổng quan
│   ├── Products.jsx       # CRUD sản phẩm, tìm kiếm, lọc danh mục
│   ├── Inventory.jsx      # Tồn kho theo từng kho
│   ├── StockIn.jsx        # Danh sách + tạo phiếu nhập (nhiều dòng hàng)
│   ├── StockOut.jsx       # Danh sách + tạo phiếu xuất (chặn xuất vượt tồn)
│   └── SimpleCrudPage.jsx # CRUD dùng chung cho Danh mục/NCC/Kho
└── App.jsx                # Định tuyến
```

## Ghi chú

- Token JWT lưu ở `localStorage` (`khovan_token`).
- Nếu đổi cổng backend, sửa `VITE_API_URL` trong `.env`.
- Toàn bộ text hiển thị bằng tiếng Việt, khớp với thông điệp lỗi từ backend.
