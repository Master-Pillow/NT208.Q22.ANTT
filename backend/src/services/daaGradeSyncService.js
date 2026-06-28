import axios from 'axios';
import * as cheerio from 'cheerio';

const COURSE_CODE_RE = /^[A-Z]{2,}\d{2,4}$/i;
const SESSION_COOKIE_RE = /(?:^|;\s*)S?SESS[a-z0-9_]*=/i;
const DEFAULT_GRADE_URL =
  'https://daa.uit.edu.vn/print/sinhvien/kqhoctap/?sid={mssv}';

function normalizeText(value) {
  return String(value || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseNumber(value) {
  const normalized = normalizeText(value).replace(',', '.');
  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function numericToLetter(numericGrade) {
  if (numericGrade === null) return null;
  if (numericGrade >= 8.5) return 'A';
  if (numericGrade >= 7) return 'B';
  if (numericGrade >= 5.5) return 'C';
  if (numericGrade >= 4) return 'D';
  return 'F';
}

function numericToGpaPoints(numericGrade) {
  if (numericGrade === null) return null;
  if (numericGrade >= 8.5) return 4;
  if (numericGrade >= 7) return 3;
  if (numericGrade >= 5.5) return 2;
  if (numericGrade >= 4) return 1;
  return 0;
}

function detectStatus(numericGrade, text) {
  const normalized = normalizeText(text).toLowerCase();
  if (/vắng|vang|bỏ thi|bo thi|cấm thi|cam thi/.test(normalized)) return 'ABSENT';
  if (/miễn|mien/.test(normalized)) return 'EXEMPT';
  return numericGrade === null ? 'IN_PROGRESS' : 'GRADED';
}

function parseSemester(text) {
  const normalized = normalizeText(text);
  const fullMatch = normalized.match(
    /học kỳ\s*(\d+)\s*[-–]\s*năm học\s*(\d{4})\s*[-–]\s*(\d{4})/i
  );
  if (fullMatch) return `HK${fullMatch[1]}-${fullMatch[2]}`;

  const shortMatch = normalized.match(/\bHK\s*(\d+)\s*[-–/]\s*(\d{4})/i);
  if (shortMatch) return `HK${shortMatch[1]}-${shortMatch[2]}`;
  return null;
}

function extractStudentInfo(pageText) {
  const mssvMatch = pageText.match(
    /(?:mã\s*(?:sinh viên|sv)|mssv)\s*:?\s*([0-9]{6,12})/i
  );
  const nameMatch = pageText.match(
    /họ\s*(?:và)?\s*tên\s*:?\s*(.+?)(?=\s+(?:ngày sinh|mã\s*(?:sinh viên|sv)|mssv|lớp)\b)/i
  );
  const classMatch = pageText.match(
    /lớp\s*(?:sinh hoạt)?\s*:?\s*([A-Z0-9._-]+)/i
  );

  return {
    mssv: mssvMatch?.[1] || null,
    full_name: normalizeText(nameMatch?.[1]) || null,
    class_code: classMatch?.[1] || null,
  };
}

function getSemesterBeforeRow($, row) {
  const ownSemester = parseSemester($(row).text());
  if (ownSemester) return ownSemester;

  const table = $(row).closest('table');
  const tableSemester = parseSemester(
    [
      table.find('caption').first().text(),
      table.prevAll('h1,h2,h3,h4,h5,p,div').slice(0, 4).text(),
    ].join(' ')
  );
  if (tableSemester) return tableSemester;

  let current = $(row).prev();
  for (let index = 0; index < 12 && current.length; index += 1) {
    const semester = parseSemester(current.text());
    if (semester) return semester;
    current = current.prev();
  }
  return null;
}

function parseCourseRow($, row, fallbackSemester) {
  const cells = $(row)
    .find('th,td')
    .map((_index, cell) => normalizeText($(cell).text()))
    .get();
  const codeIndex = cells.findIndex((cell) => COURSE_CODE_RE.test(cell));
  if (codeIndex < 0) return null;

  const courseCode = cells[codeIndex].toUpperCase();
  const courseName = cells[codeIndex + 1];
  const credits = parseNumber(cells[codeIndex + 2]);
  if (!courseName || credits === null || credits <= 0 || credits > 20) return null;

  const numericCandidates = cells
    .slice(codeIndex + 3)
    .map((cell) => parseNumber(cell))
    .filter((value) => value !== null && value >= 0 && value <= 10);
  const numericGrade = numericCandidates.length
    ? numericCandidates[numericCandidates.length - 1]
    : null;
  const rowText = cells.join(' ');
  const status = detectStatus(numericGrade, rowText);
  const semester = getSemesterBeforeRow($, row) || fallbackSemester;

  return {
    semester,
    academic_year: semester?.replace(/^HK\d+-/, '') || null,
    course_code: courseCode,
    course_name: courseName,
    credits,
    numeric_grade: numericGrade,
    letter_grade: status === 'GRADED' ? numericToLetter(numericGrade) : null,
    gpa_points: status === 'GRADED' ? numericToGpaPoints(numericGrade) : null,
    status,
    note: status === 'GRADED' ? '' : rowText,
  };
}

export function validateDaaCookie(cookie) {
  const normalized = normalizeText(cookie);
  if (!normalized || normalized.length > 16_384) {
    throw new Error('Cookie DAA không hợp lệ.');
  }
  if (/[\r\n]/.test(String(cookie))) {
    throw new Error('Cookie DAA chứa ký tự không hợp lệ.');
  }
  if (!SESSION_COOKIE_RE.test(normalized)) {
    throw new Error('Không tìm thấy cookie phiên SESS/SSESS của DAA.');
  }
  return normalized;
}

export function parseDaaGradeHtml(html, expectedMssv) {
  const $ = cheerio.load(html);
  $('script,style,noscript').remove();
  const pageText = normalizeText($('body').text());

  if (
    /đăng nhập|dang nhap|name=["']pass|type=["']password/i.test(html) &&
    !/kết quả học tập|ket qua hoc tap/i.test(pageText)
  ) {
    throw new Error('Phiên DAA đã hết hạn hoặc chưa đăng nhập.');
  }

  const student = extractStudentInfo(pageText);
  if (student.mssv && String(student.mssv) !== String(expectedMssv)) {
    throw new Error(
      `MSSV từ DAA (${student.mssv}) không trùng với tài khoản AdvisorHub (${expectedMssv}).`
    );
  }

  const pageSemester = parseSemester(pageText);
  const courses = [];
  $('tr').each((_index, row) => {
    const course = parseCourseRow($, row, pageSemester);
    if (course?.semester) courses.push(course);
  });

  const uniqueCourses = [
    ...new Map(
      courses.map((course) => [
        `${course.semester}:${course.course_code}`,
        course,
      ])
    ).values(),
  ];

  if (!uniqueCourses.length) {
    throw new Error(
      'Không tìm thấy bảng điểm trong phản hồi DAA. Cookie có thể đã hết hạn hoặc cấu trúc Portal đã thay đổi.'
    );
  }

  return {
    source: 'uit-daa-session',
    student: {
      ...student,
      mssv: student.mssv || String(expectedMssv),
    },
    summary: {},
    semester_summaries: [],
    courses: uniqueCourses,
  };
}

export async function fetchDaaGradePayload({ cookie, mssv }) {
  const safeCookie = validateDaaCookie(cookie);
  const template = process.env.DAA_GRADE_URL_TEMPLATE || DEFAULT_GRADE_URL;
  const url = template.replace('{mssv}', encodeURIComponent(String(mssv)));
  const parsedUrl = new URL(url);

  if (
    parsedUrl.protocol !== 'https:' ||
    !['daa.uit.edu.vn', 'student.uit.edu.vn'].includes(parsedUrl.hostname)
  ) {
    throw new Error('DAA_GRADE_URL_TEMPLATE không thuộc Portal UIT hợp lệ.');
  }

  const response = await axios.get(url, {
    timeout: 20_000,
    maxRedirects: 5,
    responseType: 'text',
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      Cookie: safeCookie,
      Referer: 'https://daa.uit.edu.vn/',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
    },
    validateStatus: (status) => status >= 200 && status < 400,
  });

  return parseDaaGradeHtml(response.data, mssv);
}
