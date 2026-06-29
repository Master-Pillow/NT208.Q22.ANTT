// utils/uitEmail.js
// Sinh địa chỉ email theo quy ước UIT.
//
//  • Sinh viên:  <MSSV>@gm.uit.edu.vn
//      vd: 24521896 -> 24521896@gm.uit.edu.vn
//
//  • Giảng viên: <tên> + <chữ cái đầu của họ và tên đệm> + @uit.edu.vn
//      Mặc định mỗi chữ trong họ/tên đệm đóng góp 1 chữ cái đầu (đã bỏ dấu).
//      Một vài chữ "đặc biệt" đóng góp cả cụm phụ âm thay vì 1 ký tự — vd "Trần" -> "tr".
//      vd: Nguyễn Bùi Kim Ngân -> ngannbk@uit.edu.vn
//          Trần Tuấn Dũng       -> dungtrt@uit.edu.vn  (Trần là chữ đặc biệt)

const STUDENT_EMAIL_DOMAIN = 'gm.uit.edu.vn';
const LECTURER_EMAIL_DOMAIN = 'uit.edu.vn';

// Họ/tên đệm "đặc biệt": dùng cả cụm phụ âm đầu thay vì 1 ký tự.
// Key viết thường & đã bỏ dấu. Thêm chữ mới vào đây khi cần (vd 'truong': 'tr').
const SPECIAL_PREFIXES = {
  tran: 'tr',
};

// Học hàm/học vị đứng trước tên — bỏ trước khi tính email (GS. PGS. TS. ThS. CN. KS. Dr. ...).
const TITLE_RE = /^(?:(?:gs|pgs|ts|ths|th\.s|cn|ks|bs|dr|prof)\.?\s*)+/i;

// Bỏ dấu tiếng Việt (gồm cả đ/Đ) -> ASCII.
export function removeDiacritics(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

// Email sinh viên từ MSSV.
export function studentEmail(mssv) {
  return `${String(mssv || '').trim()}@${STUDENT_EMAIL_DOMAIN}`;
}

// Chữ cái đầu (hoặc cụm đặc biệt) của 1 chữ trong họ/tên đệm.
function initialOf(word) {
  const normalized = removeDiacritics(word).toLowerCase().replace(/[^a-z]/g, '');
  if (!normalized) return '';
  return SPECIAL_PREFIXES[normalized] || normalized[0];
}

// Email giảng viên từ họ tên đầy đủ (có thể kèm học hàm/học vị).
export function lecturerEmail(fullName) {
  const words = String(fullName || '')
    .replace(TITLE_RE, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return `@${LECTURER_EMAIL_DOMAIN}`;

  const given = removeDiacritics(words[words.length - 1])
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  const initials = words.slice(0, -1).map(initialOf).join('');

  return `${given}${initials}@${LECTURER_EMAIL_DOMAIN}`;
}
