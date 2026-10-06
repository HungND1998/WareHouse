import * as XLSX from 'xlsx';

/**
 * Tính toán độ dài hiển thị của một giá trị (hỗ trợ tiếng Việt, số, ngày tháng)
 */
function getDisplayLength(val) {
  if (val === null || val === undefined) return 0;
  const str = String(val);
  // Nếu chuỗi có ký tự dấu tiếng Việt, str.length vẫn cho số ký tự chính xác
  return str.length;
}

/**
 * Xuất dữ liệu ra file Excel (.xlsx) chuyên nghiệp:
 * - Có tiêu đề báo cáo in hoa nổi bật ở dòng đầu tiên
 * - Có thông tin thời gian xuất / ghi chú ở dòng thứ hai
 * - Hàng tiêu đề các cột rõ ràng
 * - Tự động tính toán độ rộng (auto-fit width) cho từng cột để dữ liệu không bị che khuất
 * 
 * @param {Object} options
 * @param {string} options.filename - Tên file tải về (ví dụ: 'Danh_sach_san_pham_2026-08-25')
 * @param {string} [options.sheetName='Dữ liệu'] - Tên worksheet trong Excel
 * @param {string} options.title - Tiêu đề báo cáo hiển thị ở đầu bảng (ví dụ: 'DANH SÁCH SẢN PHẨM')
 * @param {string[]} [options.subtitleInfo] - Các dòng thông tin bổ sung (ví dụ: ['Thời gian xuất: ...', 'Tổng số: ...'])
 * @param {string[]} options.headers - Danh sách tên cột (ví dụ: ['Mã SKU', 'Tên sản phẩm', ...])
 * @param {Array<Array<any>>} options.data - Dữ liệu các dòng, mỗi dòng là một mảng theo thứ tự headers
 */
export function exportToExcel({
  filename = 'Xuat_du_lieu',
  sheetName = 'Dữ liệu',
  title = 'DANH SÁCH DỮ LIỆU',
  subtitleInfo = [],
  headers = [],
  data = [],
}) {
  const aoa = [];

  // 1. Dòng 1: Tiêu đề chính của báo cáo (in hoa)
  if (title) {
    aoa.push([title.toUpperCase()]);
  }

  // 2. Dòng 2+: Thông tin phụ (thời gian xuất, số lượng bản ghi, bộ lọc...)
  const defaultSubtitles = [
    `Thời gian xuất: ${new Date().toLocaleString('vi-VN')}`,
  ];
  const subtitles = subtitleInfo && subtitleInfo.length > 0 ? subtitleInfo : defaultSubtitles;
  subtitles.forEach((sub) => {
    aoa.push([sub]);
  });

  // 3. Dòng trống ngăn cách giữa phần tiêu đề và bảng dữ liệu
  aoa.push([]);

  // 4. Dòng Header cột
  aoa.push(headers);

  // 5. Các dòng Dữ liệu thực tế
  data.forEach((row) => {
    aoa.push(row);
  });

  // Tạo Worksheet từ Array of Arrays
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // 6. Tự động tính toán độ rộng của các cột để hiển thị hết nội dung
  const colCount = headers.length;
  const colWidths = headers.map((headerText, colIdx) => {
    // Độ dài của tiêu đề cột
    let maxLength = getDisplayLength(headerText);

    // Duyệt qua tất cả các dòng dữ liệu để tìm độ dài lớn nhất
    data.forEach((row) => {
      const cellVal = row[colIdx];
      const len = getDisplayLength(cellVal);
      if (len > maxLength) {
        maxLength = len;
      }
    });

    // Thêm khoảng đệm (padding) 5 ký tự để không bị khít chữ và đặt min width tối thiểu 14
    return {
      wch: Math.max(maxLength + 5, 14),
    };
  });

  ws['!cols'] = colWidths;

  // 7. Merge ô cho tiêu đề báo cáo qua toàn bộ số cột
  if (colCount > 1) {
    const merges = [];
    let currentRow = 0;

    if (title) {
      merges.push({
        s: { r: currentRow, c: 0 },
        e: { r: currentRow, c: colCount - 1 },
      });
      currentRow += 1;
    }

    subtitles.forEach(() => {
      merges.push({
        s: { r: currentRow, c: 0 },
        e: { r: currentRow, c: colCount - 1 },
      });
      currentRow += 1;
    });

    ws['!merges'] = merges;
  }

  // 8. Tạo Workbook và xuất file .xlsx
  const wb = XLSX.utils.book_new();
  const safeSheetName = (sheetName || 'Sheet1').slice(0, 31); // Tên sheet tối đa 31 ký tự trong Excel
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

  const cleanFilename = filename.toLowerCase().endsWith('.xlsx')
    ? filename
    : `${filename}.xlsx`;

  XLSX.writeFile(wb, cleanFilename);
}
