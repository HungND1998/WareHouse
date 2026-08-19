// Sinh mã phiếu dạng: PREFIX-YYYYMMDD-XXXX (XXXX = số ngẫu nhiên)
function generateCode(prefix) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${y}${m}${d}-${rand}`;
}

module.exports = generateCode;
