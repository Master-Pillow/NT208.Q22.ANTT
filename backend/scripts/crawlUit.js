import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFParse } from 'pdf-parse';
import Tesseract from 'tesseract.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Ngưỡng để phán đoán file PDF là ảnh scan (dưới 100 ký tự thì dùng OCR) ───
const OCR_FALLBACK_THRESHOLD = 100;

// ─── Giới hạn ký tự mỗi bài để tránh tràn JSON ─────────────────────────────
const MAX_CONTENT_LENGTH = 1000000; // 1 triệu ký tự, gần như không giới hạn để lấy trọn vẹn PDF

// ─── Danh sách URL cần cào (HTML + PDF) ────────────────────────────────────
const URLS_TO_CRAWL = [
  'https://tuyensinh.uit.edu.vn/phuong-thuc-tuyen-sinh',
  'https://tuyensinh.uit.edu.vn/de-an-tuyen-sinh',
  'https://tuyensinh.uit.edu.vn/nganh-dao-tao',
  'https://tuyensinh.uit.edu.vn/nganh-dao-tao/nganh-khoa-hoc-may-tinh',
  'https://tuyensinh.uit.edu.vn/nganh-dao-tao/nganh-tri-tue-nhan-tao',
  'https://tuyensinh.uit.edu.vn/nganh-dao-tao/nganh-ky-thuat-phan-mem',
  'https://tuyensinh.uit.edu.vn/nganh-dao-tao/nganh-ky-thuat-may-tinh',
  'https://tuyensinh.uit.edu.vn/nganh-dao-tao/nganh-mang-may-tinh-truyen-thong-du-lieu',
  'https://tuyensinh.uit.edu.vn/nganh-dao-tao/nganh-an-toan-thong-tin',
  'https://tuyensinh.uit.edu.vn/nganh-dao-tao/nganh-he-thong-thong-tin',
  'https://tuyensinh.uit.edu.vn/nganh-dao-tao/nganh-thuong-mai-dien-tu',
  'https://tuyensinh.uit.edu.vn/nganh-dao-tao/nganh-khoa-hoc-du-lieu',
  'https://tuyensinh.uit.edu.vn/nganh-dao-tao/nganh-cong-nghe-thong-tin',
  'https://tuyensinh.uit.edu.vn/nganh-dao-tao/nganh-thiet-ke-vi-mach',
  'https://tuyensinh.uit.edu.vn/nganh-dao-tao/nganh-truyen-thong-da-phuong-tien',
  'https://tuyensinh.uit.edu.vn/diem-chuan-cua-truong-dh-cong-nghe-thong-tin-qua-cac-nam',
  'https://tuyensinh.uit.edu.vn/truong-dai-hoc-cong-nghe-thong-tin-dhqg-hcm',
  'https://daa.uit.edu.vn/content/cac-nganh-dao-tao',
  // ─── PDF: Quy chế đào tạo (văn bản text-based) ───────────────────────────
  'https://daa.uit.edu.vn/sites/daa/files/202309/790-qd-dhcntt_28-9-22_quy_che_dao_tao.pdf',
  // ─── PDF: Cập nhật quy chế (file scan ảnh, sẽ kích hoạt OCR tự động) ─────
  'https://daa.uit.edu.vn/sites/daa/files/202401/1393-qd-dhcntt_29-12-2023_cap_nhat_quy_che_dao_tao_theo_hoc_che_tin_chi_cho_he_dai_hoc_chinh_quy.pdf',
];

// ─── Trích xuất nội dung từ trang HTML ──────────────────────────────────────
async function crawlHtml(url) {
  const { data } = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    },
    timeout: 10000,
  });
  const $ = cheerio.load(data);

  let title = $('h1').first().text().trim() || $('title').text().trim() || url;

  const contentBlocks = [];
  const selector = $('.content').length > 0 ? $('.content') : $('body');
  selector.find('h2, h3, p, li').each((i, el) => {
    const text = $(el).text().trim();
    if (text.length > 30 && !text.includes('function(') && !text.includes('jQuery')) {
      contentBlocks.push(text);
    }
  });

  return { title, content: contentBlocks.join('\n').slice(0, MAX_CONTENT_LENGTH) };
}

// ─── Trích xuất text từ ảnh dùng OCR (Tesseract.js) ─────────────────────────
async function ocrPages(parser) {
  console.log('    🔍 Đang render PDF thành ảnh...');
  // scale: 2.0 = độ phân giải cao, OCR chính xác hơn
  const screenshots = await parser.getScreenshot({ scale: 2.0 });

  // Khởi tạo Tesseract worker 1 lần, dùng cho tất cả trang
  const worker = await Tesseract.createWorker('vie+eng');

  let fullText = '';
  for (let i = 0; i < screenshots.pages.length; i++) {
    console.log(`    📖 OCR trang ${i + 1}/${screenshots.pages.length}...`);
    const { data: { text } } = await worker.recognize(Buffer.from(screenshots.pages[i].data));
    fullText += text + '\n';

    // Dừng sớm nếu đã đủ 5000 ký tự (không cần quét hết tất cả trang)
    if (fullText.length >= MAX_CONTENT_LENGTH * 2) break;
  }

  await worker.terminate(); // Giải phóng bộ nhớ worker
  return fullText;
}

// ─── Trích xuất nội dung từ file PDF (text hoặc ảnh scan) ───────────────────
async function crawlPdf(url) {
  const title = decodeURIComponent(url.split('/').pop() || 'Tài liệu PDF');
  const parser = new PDFParse({ url });

  let content = '';

  try {
    // Bước 1: Thử đọc text bình thường trước (nhanh, không tốn CPU)
    const result = await parser.getText();
    content = result.text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

    // Bước 2: Nếu text quá ít → file dạng ảnh scan → kích hoạt OCR
    if (content.length < OCR_FALLBACK_THRESHOLD) {
      console.log(`  ⚠️  Phát hiện file scan (${content.length} ký tự), chuyển sang OCR tiếng Việt...`);
      const ocrText = await ocrPages(parser);
      content = ocrText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    }
  } finally {
    // Luôn giải phóng bộ nhớ dù thành công hay thất bại
    await parser.destroy();
  }

  return { title, content: content.slice(0, MAX_CONTENT_LENGTH) };
}

// ─── Điều phối: chọn hàm phù hợp theo loại URL ──────────────────────────────
async function crawlPage(url) {
  try {
    const result = url.toLowerCase().endsWith('.pdf')
      ? await crawlPdf(url)
      : await crawlHtml(url);

    console.log(`✅ Đã cào thành công: ${result.title} (${result.content.length} ký tự)`);
    return { url, title: result.title, content: result.content };
  } catch (error) {
    console.log(`❌ Lỗi cào ${url}:`, error.message);
    return null;
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Bắt đầu cào dữ liệu từ UIT...\n');
  const scrapedData = [];

  for (const url of URLS_TO_CRAWL) {
    const data = await crawlPage(url);
    if (data && data.content.length > 100) {
      scrapedData.push(data);
    }
  }

  // Fallback nếu cào thất bại toàn bộ (web down, chống DDoS...)
  if (scrapedData.length === 0) {
    console.log('\n⚠️  Không cào được dữ liệu. Tạo dữ liệu fallback mẫu...');
    scrapedData.push({
      url: 'https://tuyensinh.uit.edu.vn/nganh-tri-tue-nhan-tao',
      title: 'Ngành Trí tuệ nhân tạo (Artificial Intelligence)',
      content: 'Chương trình đào tạo Trí tuệ nhân tạo (AI) trang bị cho sinh viên kiến thức chuyên sâu về Machine Learning, Deep Learning, Xử lý ngôn ngữ tự nhiên, Thị giác máy tính. Sinh viên tốt nghiệp có thể làm AI Engineer, Data Scientist với mức lương khủng.',
    });
    scrapedData.push({
      url: 'https://tuyensinh.uit.edu.vn/phuong-thuc-tuyen-sinh',
      title: 'Các phương thức tuyển sinh UIT',
      content: 'Trường Đại học Công nghệ Thông tin xét tuyển theo 3 phương thức: Tuyển thẳng, Ưu tiên xét tuyển theo quy định ĐHQG-HCM, Xét tuyển dựa vào điểm thi ĐGNL, Xét tuyển dựa vào điểm thi THPT Quốc gia.',
    });
  }

  const outputPath = path.join(__dirname, '../src/data/scrapedKnowledge.json');
  fs.writeFileSync(outputPath, JSON.stringify(scrapedData, null, 2), 'utf-8');
  console.log(`\n🎉 Hoàn tất! Đã lưu ${scrapedData.length} bài viết vào: ${outputPath}`);
}

main();
