import axios from 'axios';
import * as cheerio from 'cheerio';
import { validateDaaCookie } from './daaGradeSyncService.js';

// ============================================================================
// daaScheduleSyncService — đồng bộ Thời khoá biểu (TKB) + Lịch thi từ DAA UIT.
//
// Đã verify với HTML thật của DAA (Drupal, theme uitpb_daa):
//  - TKB:     GET https://daa.uit.edu.vn/sinhvien/tkb           (không tham số → học kỳ hiện tại)
//             form POST nhận hocky/namhoc, nhưng GET trả sẵn HK hiện tại.
//             Bảng .tkb-table, mỗi ô .tkb-card gồm .title (mã lớp, tên môn) + .sub (phòng, GV, ngày).
//  - Lịch thi: GET https://daa.uit.edu.vn/sinhvien/lichhoc/lichthi?lanthi={1|2}&hocky={1|2|3}&namhoc={năm}
//             lanthi: 1=GK, 2=CK. Bảng phẳng 8 cột cố định:
//             STT | Mã MH | Mã lớp | Ca/Tiết thi | Thứ thi | Ngày thi | Phòng thi | Ghi chú/Hình thức thi
// ============================================================================

const COURSE_CODE_RE = /^[A-Z]{2,}\d{2,4}$/i;
const CLASS_CODE_RE = /^[A-Z]{2,}\d{2,4}(?:\.[A-Z0-9.]+)?$/i;

const DEFAULT_TKB_URL =
  process.env.DAA_TKB_URL_TEMPLATE || 'https://daa.uit.edu.vn/sinhvien/tkb';
const DEFAULT_EXAM_URL =
  process.env.DAA_EXAM_URL_TEMPLATE ||
  'https://daa.uit.edu.vn/sinhvien/lichhoc/lichthi';

const ALLOWED_HOSTS = ['daa.uit.edu.vn', 'student.uit.edu.vn'];

function normalizeText(value) {
  return String(value || '')
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function looksLikeLoginPage(html, pageText) {
  return (
    /name=["']pass|type=["']password|user-pass-block|đăng nhập tài khoản/i.test(html) &&
    !/thời khoá biểu|thời khóa biểu|lịch thi|tkb-table|ngày thi/i.test(pageText)
  );
}

// "Thứ 2".."Thứ 7" -> 2..7 ; "Chủ nhật"/"CN" -> 8 ; số trần "2".."7" -> 2..7
function parseDayOfWeek(text) {
  const normalized = normalizeText(text).toLowerCase();
  if (/chủ nhật|chu nhat|\bcn\b/.test(normalized)) return 8;
  const match = normalized.match(/thứ\s*(\d)|thu\s*(\d)|\b([2-7])\b/);
  const day = Number(match?.[1] || match?.[2] || match?.[3]);
  return day >= 2 && day <= 7 ? day : null;
}

function parsePeriod(text) {
  const match = normalizeText(text).match(/tiết\s*(\d{1,2})|tiet\s*(\d{1,2})/i);
  const period = Number(match?.[1] || match?.[2]);
  return Number.isFinite(period) && period > 0 ? period : null;
}

// "26/01/26" hoặc "26/01/2026" -> "2026-01-26"
function parseSlashDate(text) {
  const match = normalizeText(text).match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!match) return null;
  const [, d, m, y] = match;
  const year = y.length === 2 ? `20${y}` : y;
  return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

// "12-06-2026" -> "2026-06-12"
function parseDashDate(text) {
  const match = normalizeText(text).match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (!match) return null;
  const [, d, m, y] = match;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

// Lấy "HK{kỳ}-{năm}" từ tiêu đề trang.
// TKB:    "THỜI KHOÁ BIỂU HỌC KỲ 2 NĂM 2025 - 2026"
// Lịch thi: "LỊCH THI CK 2 NĂM 2025 - 2026"
function parseSemester($, pageText) {
  const titleText = normalizeText($('.title_thongtindangky').first().text()) || pageText;
  const match = titleText.match(/(?:học kỳ|hk|ck|gk)\s*(\d)\s*năm\s*(\d{4})/i);
  if (match) return `HK${match[1]}-${match[2]}`;
  // fallback: quét toàn trang
  const alt = normalizeText(pageText).match(/(?:học kỳ|hk)\s*(\d)\s*năm\s*học?\s*(\d{4})/i);
  return alt ? `HK${alt[1]}-${alt[2]}` : null;
}

// ── Mở rộng 1 <table> HTML (rowspan/colspan) thành ma trận ô ────────────────
function expandTableToMatrix($, table) {
  const matrix = [];
  const rows = $(table).find('tr').toArray();

  rows.forEach((tr, rowIndex) => {
    if (!matrix[rowIndex]) matrix[rowIndex] = [];
    let colIndex = 0;

    $(tr)
      .children('td,th')
      .each((_i, cell) => {
        while (matrix[rowIndex][colIndex]) colIndex += 1;

        const $cell = $(cell);
        const colspan = Math.max(1, parseInt($cell.attr('colspan') || '1', 10));
        const rowspan = Math.max(1, parseInt($cell.attr('rowspan') || '1', 10));

        for (let r = 0; r < rowspan; r += 1) {
          const targetRow = rowIndex + r;
          if (!matrix[targetRow]) matrix[targetRow] = [];
          for (let c = 0; c < colspan; c += 1) {
            matrix[targetRow][colIndex + c] = {
              text: normalizeText($cell.text()),
              $el: $cell,
              isOrigin: r === 0 && c === 0,
              rowspan,
            };
          }
        }
        colIndex += colspan;
      });
  });

  return matrix;
}

// Parse 1 ô .tkb-card -> thông tin môn học (đọc trực tiếp cấu trúc div).
function parseTimetableCard($, card) {
  const titles = $(card)
    .find('.title')
    .map((_i, e) => normalizeText($(e).text()))
    .get();
  const subs = $(card)
    .find('.sub')
    .map((_i, e) => normalizeText($(e).text()))
    .get();

  const classCode = (titles[0] || '').toUpperCase();
  if (!CLASS_CODE_RE.test(classCode)) return null;

  let room = null;
  let lecturer = null;
  let lecturerCode = null;
  let startDate = null;
  let endDate = null;
  let weeksNote = null;

  for (const sub of subs) {
    const dateRange = sub.match(
      /(\d{1,2}\/\d{1,2}\/\d{2,4})\s*(?:->|→|-)\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/
    );
    const lecturerMatch = sub.match(/^(\d{4,6})\s*-\s*(.+)$/);

    if (dateRange) {
      startDate = parseSlashDate(dateRange[1]);
      endDate = parseSlashDate(dateRange[2]);
    } else if (lecturerMatch) {
      lecturerCode = lecturerMatch[1];
      lecturer = normalizeText(lecturerMatch[2]);
    } else if (/^P[.\s]/.test(sub) || /phòng/i.test(sub)) {
      if (/cách\s*2\s*tuần|cach\s*2\s*tuan/i.test(sub)) weeksNote = 'Cách 2 tuần';
      room = normalizeText(
        sub
          .replace(/^P\.?\s*/, '')
          .replace(/\s*-\s*cách\s*2\s*tuần.*$/i, '')
          .replace(/\s*-\s*cach\s*2\s*tuan.*$/i, '')
      );
    }
  }

  return {
    course_code: classCode.split('.')[0],
    class_code: classCode,
    course_name: titles[1] || null,
    room,
    lecturer,
    lecturer_code: lecturerCode,
    start_date: startDate,
    end_date: endDate,
    weeks_note: weeksNote,
  };
}

export function parseDaaTimetableHtml(html, semesterOverride = null) {
  const $ = cheerio.load(html);
  $('script,style,noscript').remove();
  const pageText = normalizeText($('body').text());

  if (looksLikeLoginPage(html, pageText)) {
    throw new Error('Phiên DAA đã hết hạn hoặc chưa đăng nhập (TKB).');
  }

  const semester = semesterOverride || parseSemester($, pageText);
  const entries = [];

  $('table').each((_i, table) => {
    const matrix = expandTableToMatrix($, table);
    if (matrix.length < 2) return; // bảng sticky-header chỉ có thead -> bỏ

    // Cột -> Thứ (đọc 3 hàng đầu, chỉ nhận ô có chữ "Thứ")
    const dayByCol = {};
    matrix.slice(0, 3).forEach((row) => {
      (row || []).forEach((cell, col) => {
        if (cell?.text && /thứ|thu\b/i.test(cell.text)) {
          const day = parseDayOfWeek(cell.text);
          if (day) dayByCol[col] = day;
        }
      });
    });
    if (Object.keys(dayByCol).length === 0) return; // không phải bảng TKB

    // Hàng -> Tiết (cột nhãn "Tiết N")
    const periodByRow = {};
    matrix.forEach((row, r) => {
      for (const cell of row || []) {
        const period = cell?.text ? parsePeriod(cell.text) : null;
        if (period) {
          periodByRow[r] = period;
          break;
        }
      }
    });

    const seen = new Set();
    matrix.forEach((row, r) => {
      (row || []).forEach((cell, col) => {
        if (!cell?.isOrigin || dayByCol[col] === undefined) return;
        const cards = cell.$el.find('.tkb-card');
        if (!cards.length) return;

        const cellStart = periodByRow[r] || null;
        const cellEnd = periodByRow[r + (cell.rowspan || 1) - 1] || cellStart;

        cards.each((_j, cardEl) => {
          const info = parseTimetableCard($, $(cardEl));
          if (!info) return;

          // Tinh chỉnh tiết theo grid-row của .tkb-slot (cho ô có nhiều card)
          let startPeriod = cellStart;
          let endPeriod = cellEnd;
          const slotStyle =
            $(cardEl).closest('.tkb-slot').attr('style') || '';
          const gr = slotStyle.match(/grid-row:\s*(\d+)\s*\/\s*span\s*(\d+)/i);
          if (gr && cellStart) {
            const offset = parseInt(gr[1], 10) - 1;
            const span = parseInt(gr[2], 10);
            startPeriod = cellStart + offset;
            endPeriod = cellStart + offset + span - 1;
          }

          const key = `${dayByCol[col]}:${startPeriod}:${info.class_code}`;
          if (seen.has(key)) return;
          seen.add(key);

          entries.push({
            semester,
            day_of_week: dayByCol[col],
            start_period: startPeriod,
            end_period: endPeriod,
            ...info,
          });
        });
      });
    });
  });

  return { source: 'uit-daa-session', type: 'timetable', semester, entries };
}

export function parseDaaExamHtml(html, { semesterOverride = null, examTermOverride = null } = {}) {
  const $ = cheerio.load(html);
  $('script,style,noscript').remove();
  const pageText = normalizeText($('body').text());

  if (looksLikeLoginPage(html, pageText)) {
    throw new Error('Phiên DAA đã hết hạn hoặc chưa đăng nhập (lịch thi).');
  }

  const semester = semesterOverride || parseSemester($, pageText);
  const titleText = normalizeText($('.title_thongtindangky').first().text());
  const examTerm =
    examTermOverride ||
    (/lịch thi ck|thi cuối kỳ/i.test(titleText) || /lịch thi ck/i.test(pageText)
      ? 'CK'
      : /lịch thi gk|giữa kỳ/i.test(titleText) || /lịch thi gk/i.test(pageText)
        ? 'GK'
        : null);

  // Cột cố định theo DAA: STT | Mã MH | Mã lớp | Ca/Tiết thi | Thứ thi | Ngày thi | Phòng thi | Ghi chú
  const entries = [];
  $('table').each((_i, table) => {
    $(table)
      .find('tr')
      .each((_j, tr) => {
        const cells = $(tr)
          .find('td')
          .map((_k, c) => normalizeText($(c).text()))
          .get();
        if (cells.length < 7) return; // bỏ hàng tiêu đề (th) và hàng thiếu cột
        const courseCode = (cells[1] || '').toUpperCase();
        if (!COURSE_CODE_RE.test(courseCode)) return;

        const note = cells[7] || null;
        entries.push({
          semester,
          exam_term: examTerm,
          course_code: courseCode,
          class_code: cells[2] || null,
          exam_slot: cells[3] || null,
          day_of_week: parseDayOfWeek(cells[4]),
          exam_date: parseDashDate(cells[5]),
          room: cells[6] || null,
          exam_format: note,
          note,
        });
      });
  });

  return { source: 'uit-daa-session', type: 'exam', semester, exam_term: examTerm, entries };
}

// ── Fetch HTML từ DAA bằng cookie phiên ─────────────────────────────────────
async function fetchDaaHtml({ cookie, url }) {
  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== 'https:' || !ALLOWED_HOSTS.includes(parsedUrl.hostname)) {
    throw new Error('URL DAA không thuộc Portal UIT hợp lệ.');
  }

  const response = await axios.get(url, {
    timeout: 20_000,
    maxRedirects: 5,
    responseType: 'text',
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      Cookie: cookie,
      Referer: 'https://daa.uit.edu.vn/',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
    },
    validateStatus: (status) => status >= 200 && status < 400,
  });

  return response.data;
}

function appendParams(url, params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  if (!query) return url;
  return url + (url.includes('?') ? '&' : '?') + query;
}

// Đăng nhập không truyền hocky/namhoc -> DAA trả TKB học kỳ hiện tại.
export async function fetchDaaTimetablePayload({ cookie, mssv, hocky, namhoc }) {
  const safeCookie = validateDaaCookie(cookie);
  const base = DEFAULT_TKB_URL.replace('{mssv}', encodeURIComponent(String(mssv)));
  const url = appendParams(base, { hocky, namhoc });
  const html = await fetchDaaHtml({ cookie: safeCookie, url });
  const semesterOverride = hocky && namhoc ? `HK${hocky}-${namhoc}` : null;
  return parseDaaTimetableHtml(html, semesterOverride);
}

// lanthi: 1=GK, 2=CK. Không truyền -> DAA trả lịch thi mặc định (hiện tại).
export async function fetchDaaExamPayload({ cookie, mssv, lanthi, hocky, namhoc }) {
  const safeCookie = validateDaaCookie(cookie);
  const base = DEFAULT_EXAM_URL.replace('{mssv}', encodeURIComponent(String(mssv)));
  const url = appendParams(base, { lanthi, hocky, namhoc });
  const html = await fetchDaaHtml({ cookie: safeCookie, url });
  const semesterOverride = hocky && namhoc ? `HK${hocky}-${namhoc}` : null;
  const examTermOverride = lanthi ? (String(lanthi) === '1' ? 'GK' : 'CK') : null;
  return parseDaaExamHtml(html, { semesterOverride, examTermOverride });
}
