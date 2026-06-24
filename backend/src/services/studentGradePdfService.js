import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse/lib/pdf-parse.js');

const PDF_PARSE_OPTIONS = {
  version: 'v1.10.100',
  pagerender: async (pageData) => {
    const textContent = await pageData.getTextContent({
      normalizeWhitespace: false,
      disableCombineTextItems: false,
    });

    return JSON.stringify(
      textContent.items.map((item) => ({
        text: item.str,
        x: Number(item.transform[4].toFixed(1)),
        y: Number(item.transform[5].toFixed(1)),
      }))
    );
  },
};

const COURSE_CODE_RE = /^[A-Z]{2,}\d{2,4}$/;
const GRADE_STATUS = {
  GRADED: 'GRADED',
  IN_PROGRESS: 'IN_PROGRESS',
  ABSENT: 'ABSENT',
  EXEMPT: 'EXEMPT',
};

function normalizeSpaces(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function parseNumber(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim().replace(',', '.');
  if (!normalized || !/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  return Number(normalized);
}

function parsePageItems(rawText) {
  return rawText
    .split('\n\n')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      try {
        return JSON.parse(chunk);
      } catch {
        return [];
      }
    });
}

function groupRows(items) {
  const rows = new Map();

  for (const item of items) {
    const key = item.y.toFixed(1);
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(item);
  }

  return [...rows.entries()]
    .map(([y, rowItems]) => ({
      y: Number(y),
      items: rowItems.sort((a, b) => a.x - b.x),
      text: normalizeSpaces(rowItems.map((item) => item.text).join(' ')),
    }))
    .sort((a, b) => b.y - a.y);
}

function textAt(items, minX, maxX, centerY, tolerance = 3) {
  return normalizeSpaces(
    items
      .filter((item) => item.x >= minX && item.x < maxX && Math.abs(item.y - centerY) <= tolerance)
      .map((item) => item.text)
      .join(' ')
  );
}

function nameAt(items, centerY) {
  const fragments = items
    .filter((item) => item.x >= 100 && item.x < 245 && Math.abs(item.y - centerY) <= 13)
    .filter((item) => normalizeSpaces(item.text))
    .sort((a, b) => {
      if (Math.abs(b.y - a.y) > 1) return b.y - a.y;
      return a.x - b.x;
    })
    .map((item) => item.text);

  return normalizeSpaces(fragments.join(' '));
}

function findCourseRows(items) {
  return items
    .filter((item) => item.x >= 55 && item.x <= 85 && COURSE_CODE_RE.test(normalizeSpaces(item.text)))
    .sort((a, b) => b.y - a.y);
}

function parseSemesterHeading(text) {
  const match = text.match(/Học kỳ\s+(\d+)\s+-\s+Năm học\s+(\d{4})-(\d{4})/i);
  if (!match) return null;

  return {
    term: Number(match[1]),
    academic_year: `${match[2]}-${match[3]}`,
    semester: `HK${match[1]}-${match[2]}`,
    label: `Học kỳ ${match[1]} - Năm học ${match[2]}-${match[3]}`,
  };
}

function numericToLetter(numericGrade) {
  if (numericGrade === null || numericGrade === undefined) return null;
  if (numericGrade >= 8.5) return 'A';
  if (numericGrade >= 7) return 'B';
  if (numericGrade >= 5.5) return 'C';
  if (numericGrade >= 4) return 'D';
  return 'F';
}

export function numericToGpaPoints(numericGrade) {
  if (numericGrade === null || numericGrade === undefined) return null;
  if (numericGrade >= 8.5) return 4;
  if (numericGrade >= 7) return 3;
  if (numericGrade >= 5.5) return 2;
  if (numericGrade >= 4) return 1;
  return 0;
}

function detectStatus({ numericGrade, pointText, note }) {
  const merged = normalizeSpaces(`${pointText || ''} ${note || ''}`).toLowerCase();

  if (/vắng|vang|bỏ thi|bo thi|cấm thi|cam thi/.test(merged)) return GRADE_STATUS.ABSENT;
  if (/miễn|mien/.test(merged)) return GRADE_STATUS.EXEMPT;
  if (numericGrade === null || numericGrade === undefined) return GRADE_STATUS.IN_PROGRESS;
  return GRADE_STATUS.GRADED;
}

function parseSummary(text) {
  const summary = {};

  const creditsStudied = text.match(/Số tín chỉ đã học\s*(\d+)/i);
  const creditsAccumulated = text.match(/Số tín chỉ tích lũy\s*(\d+)/i);
  const avgGrade = text.match(/Điểm trung bình chung\s+([\d.]+)/i);
  const cumulativeAvgGrade = text.match(/Điểm trung bình chung tích lũy\s+([\d.]+)/i);

  if (creditsStudied) summary.credits_studied = Number(creditsStudied[1]);
  if (creditsAccumulated) summary.credits_accumulated = Number(creditsAccumulated[1]);
  if (avgGrade) summary.avg_grade = Number(avgGrade[1]);
  if (cumulativeAvgGrade) summary.cumulative_avg_grade = Number(cumulativeAvgGrade[1]);

  return summary;
}

function parseStudentInfo(text) {
  const fullName = text.match(/Họ và tên:\s*([^\n]+?)\s*Ngày sinh:/i);
  const mssv = text.match(/Mã SV:\s*([0-9]{6,12})/i);
  const classCode = text.match(/Lớp sinh hoạt:\s*([A-Z0-9.]+?)(?:\s*Khoa|Khoa:|$)/i);

  return {
    full_name: fullName ? normalizeSpaces(fullName[1]) : null,
    mssv: mssv ? normalizeSpaces(mssv[1]) : null,
    class_code: classCode ? normalizeSpaces(classCode[1]) : null,
  };
}

export async function parseStudentGradePdf(buffer) {
  const parsed = await pdf(buffer, PDF_PARSE_OPTIONS);
  const pages = parsePageItems(parsed.text);
  const allText = parsed.text.replace(/\n\n\[/g, '\n[');
  const plainText = (await pdf(buffer, { version: 'v1.10.100' })).text;
  const student = parseStudentInfo(plainText);
  const summary = parseSummary(plainText);
  const courses = [];
  const semesterSummaries = [];

  for (const pageItems of pages) {
    const rows = groupRows(pageItems);
    let currentSemester = null;

    for (const row of rows) {
      const semester = parseSemesterHeading(row.text);
      if (semester) {
        currentSemester = semester;
        continue;
      }

      if (/Trung bình học kỳ/i.test(row.text) && currentSemester) {
        semesterSummaries.push({
          ...currentSemester,
          credits: parseNumber(textAt(pageItems, 245, 280, row.y)),
          average: parseNumber(textAt(pageItems, 485, 530, row.y)),
        });
      }
    }

    const courseRows = findCourseRows(pageItems);
    for (const codeItem of courseRows) {
      const semesterRow = rows
        .filter((row) => row.y > codeItem.y && parseSemesterHeading(row.text))
        .sort((a, b) => a.y - b.y)[0];
      const semester = semesterRow ? parseSemesterHeading(semesterRow.text) : null;

      const pointText = textAt(pageItems, 485, 530, codeItem.y);
      const numericGrade = parseNumber(pointText);
      const note = textAt(pageItems, 535, 580, codeItem.y);
      const status = detectStatus({ numericGrade, pointText, note });

      courses.push({
        ...semester,
        course_code: normalizeSpaces(codeItem.text),
        course_name: nameAt(pageItems, codeItem.y),
        credits: parseNumber(textAt(pageItems, 245, 280, codeItem.y)),
        process_grade: parseNumber(textAt(pageItems, 285, 330, codeItem.y)),
        midterm_grade: parseNumber(textAt(pageItems, 335, 380, codeItem.y)),
        practice_grade: parseNumber(textAt(pageItems, 385, 430, codeItem.y)),
        final_grade: parseNumber(textAt(pageItems, 435, 480, codeItem.y)),
        numeric_grade: numericGrade,
        letter_grade: status === GRADE_STATUS.GRADED ? numericToLetter(numericGrade) : null,
        gpa_points: status === GRADE_STATUS.GRADED ? numericToGpaPoints(numericGrade) : null,
        status,
        note: normalizeSpaces(note || pointText),
      });
    }
  }

  const validCourses = courses.filter((course) => course.semester && course.course_code && course.course_name);

  return {
    source: 'uit-portal-pdf',
    student,
    summary,
    semester_summaries: semesterSummaries,
    courses: validCourses,
    raw_text_hash_basis: normalizeSpaces(plainText).slice(0, 1000),
    page_count: parsed.numpages,
    debug: {
      extracted_items_pages: pages.length,
      coordinate_text_length: allText.length,
    },
  };
}
