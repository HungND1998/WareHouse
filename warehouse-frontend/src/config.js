/**
 * Cấu hình tập trung cho ứng dụng Frontend
 * 
 * Lưu ý bảo mật:
 * Các biến môi trường có tiền tố VITE_ (như VITE_API_URL) được Vite đóng gói công khai
 * vào mã nguồn chạy trên trình duyệt (client-side).
 * Điều này an toàn vì đây chỉ là địa chỉ Public API Backend, KHÔNG chứa secret key hay mật khẩu.
 */
export const CONFIG = {
  API_URL: (import.meta.env.VITE_API_URL || 'https://warehouse-wvbb.onrender.com/api').trim(),
};
