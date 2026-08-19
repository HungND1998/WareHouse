# Warehouse Management API — Phần mềm quản lý kho

Backend REST API đầy đủ cho hệ thống quản lý kho: sản phẩm, danh mục, nhà cung cấp,
nhiều kho hàng, nhập kho, xuất kho, tồn kho theo từng kho, lịch sử biến động, và báo cáo.

## Công nghệ sử dụng

- **Node.js + Express** — REST API
- **SQLite (better-sqlite3)** — cơ sở dữ liệu, chạy nhanh, không cần cài server DB riêng.
  Có thể đổi sang PostgreSQL/MySQL sau này vì các câu SQL đều chuẩn, không dùng cú pháp lạ (trừ `datetime('now')` và `ON CONFLICT`).
- **JWT (jsonwebtoken)** — xác thực đăng nhập, phân quyền `admin` / `staff`
- **bcryptjs** — mã hoá mật khẩu

## Cấu trúc dự án

```
warehouse-management/
├── database/
│   └── schema.sql          # Toàn bộ schema (10 bảng, có ràng buộc khóa ngoại)
├── src/
│   ├── config/db.js         # Kết nối + tự khởi tạo schema
│   ├── middleware/
│   │   ├── auth.js          # Xác thực JWT + phân quyền
│   │   └── errorHandler.js  # Xử lý lỗi tập trung
│   ├── controllers/         # Logic nghiệp vụ
│   ├── routes/               # Định tuyến API
│   └── utils/generateCode.js
├── server.js                 # Điểm khởi động
├── seed.js                   # Tạo tài khoản admin + dữ liệu mẫu
└── .env.example
```

## Sơ đồ dữ liệu (tóm tắt)

| Bảng | Mô tả |
|---|---|
| `users` | Tài khoản đăng nhập, phân quyền admin/staff |
| `categories` | Danh mục sản phẩm |
| `suppliers` | Nhà cung cấp |
| `warehouses` | Danh sách kho (hỗ trợ nhiều kho) |
| `products` | Sản phẩm, giá vốn, giá bán, mức tồn tối thiểu |
| `inventory` | Số lượng tồn **theo từng kho** cho từng sản phẩm |
| `stock_in` / `stock_in_items` | Phiếu nhập kho + chi tiết |
| `stock_out` / `stock_out_items` | Phiếu xuất kho + chi tiết |
| `stock_transactions` | Nhật ký (audit trail) mọi biến động tồn kho |

Khi tạo phiếu nhập/xuất, hệ thống **tự động cập nhật `inventory`** và ghi log vào
`stock_transactions`, tất cả trong 1 database transaction — nếu có lỗi giữa chừng,
toàn bộ được rollback (không bao giờ có dữ liệu tồn kho sai lệch).
Phiếu xuất còn tự kiểm tra đủ tồn kho trước khi cho xuất, tránh âm kho.

## Cài đặt & chạy

```bash
npm install
cp .env.example .env      # chỉnh JWT_SECRET nếu cần
npm run seed               # tạo tài khoản admin + dữ liệu mẫu
npm start                  # chạy server tại http://localhost:4000
# hoặc: npm run dev  (tự restart khi sửa code)
```

Tài khoản mặc định sau khi seed: **admin / admin123**

## Danh sách API chính

Tất cả API (trừ `/api/auth/login`) yêu cầu header:
`Authorization: Bearer <token>`

### Auth
| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/auth/login` | Đăng nhập, trả về JWT |
| POST | `/api/auth/register` | Tạo user mới |
| GET | `/api/auth/me` | Thông tin user hiện tại |

### Danh mục / Nhà cung cấp / Kho (CRUD chuẩn)
```
GET/POST     /api/categories
GET/PUT/DEL  /api/categories/:id
GET/POST     /api/suppliers
GET/PUT/DEL  /api/suppliers/:id
GET/POST     /api/warehouses      (chỉ admin được tạo/sửa/xóa)
GET/PUT/DEL  /api/warehouses/:id
```

### Sản phẩm
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/products?search=&category_id=&page=&limit=` | Danh sách + tìm kiếm + phân trang |
| GET | `/api/products/:id` | Chi tiết + tồn kho theo từng kho |
| GET | `/api/products/low-stock` | Sản phẩm dưới mức tồn tối thiểu |
| POST | `/api/products` | Tạo sản phẩm |
| PUT | `/api/products/:id` | Cập nhật |
| DELETE | `/api/products/:id` | Xóa (chỉ admin) |

### Nhập kho
```
GET  /api/stock-in           - danh sách phiếu nhập
GET  /api/stock-in/:id       - chi tiết 1 phiếu
POST /api/stock-in           - tạo phiếu nhập mới
```
Body ví dụ:
```json
{
  "warehouse_id": 1,
  "supplier_id": 1,
  "note": "Nhập hàng đợt 1",
  "items": [
    { "product_id": 1, "quantity": 50, "price": 150000 }
  ]
}
```

### Xuất kho
```
GET  /api/stock-out
GET  /api/stock-out/:id
POST /api/stock-out
```
Body ví dụ:
```json
{
  "warehouse_id": 1,
  "customer_name": "Khách A",
  "items": [
    { "product_id": 1, "quantity": 10, "price": 220000 }
  ]
}
```
Nếu số lượng xuất > tồn kho hiện có → trả lỗi 400, không cho xuất (tránh âm kho).

### Tồn kho & báo cáo
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/inventory?warehouse_id=` | Tồn kho hiện tại (theo kho hoặc tất cả) |
| GET | `/api/inventory/transactions?product_id=&warehouse_id=` | Lịch sử biến động (200 bản ghi gần nhất) |
| GET | `/api/reports/dashboard` | Tổng quan: tổng SP, tổng kho, giá trị tồn kho, SP sắp hết, số phiếu hôm nay |

## Ghi chú triển khai thực tế

- Đổi `JWT_SECRET` trong `.env` trước khi deploy production.
- File database nằm ở `database/warehouse.db` — backup định kỳ file này.
- Muốn chuyển sang PostgreSQL: thay `src/config/db.js` bằng driver `pg`, các câu SQL
  trong controllers gần như giữ nguyên (chỉ đổi cú pháp `datetime('now')` → `NOW()`
  và `ON CONFLICT` → cú pháp upsert tương ứng của Postgres, vốn khá giống).
- Có thể mở rộng thêm: chuyển kho nội bộ (stock_transfers), đơn vị tính quy đổi,
  in phiếu PDF, thông báo email khi sắp hết hàng.
