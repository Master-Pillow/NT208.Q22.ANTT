import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFParse } from 'pdf-parse';
import Tesseract from 'tesseract.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── CẤU HÌNH TỐI ƯU ──────────────────────────────────────────────────────────
const OCR_FALLBACK_THRESHOLD = 100;
const MAX_CONTENT_LENGTH = 1000000; // 1 triệu ký tự (gần như không giới hạn để lấy trọn vẹn PDF)
const CONCURRENCY_LIMIT = 3; // Số lượng URL cào đồng thời cùng lúc (tối ưu tốc độ & RAM)

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
  // ─── PDF
  'https://daa.uit.edu.vn/sites/daa/files/202309/790-qd-dhcntt_28-9-22_quy_che_dao_tao.pdf',
  'https://daa.uit.edu.vn/sites/daa/files/202401/1393-qd-dhcntt_29-12-2023_cap_nhat_quy_che_dao_tao_theo_hoc_che_tin_chi_cho_he_dai_hoc_chinh_quy.pdf',
  'https://daa.uit.edu.vn/thongbao/02-quyet-dinh-ve-viec-ban-hanh-qui-dinh-ve-cong-tac-giao-trinh',
  'https://daa.uit.edu.vn/sites/daa/files/202309/172-qd-dhcntt_08-3-2023_quy_che_van_bang_chung_chi.pdf',
];

// ─── QUẢN LÝ TESSERACT WORKER GLOBAL (Khởi tạo 1 lần duy nhất) ──────────────
let globalWorker = null;

async function getTesseractWorker() {
  if (!globalWorker) {
    console.log('    🤖 Đang khởi tạo Global OCR Worker (vie+eng)...');
    globalWorker = await Tesseract.createWorker('vie+eng');
  }
  return globalWorker;
}

// ─── TRÍCH XUẤT HTML ────────────────────────────────────────────────────────
async function crawlHtml(url) {
  const { data } = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    timeout: 15000,
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

// ─── TRÍCH XUẤT OCR BẰNG GLOBAL WORKER ──────────────────────────────────────
async function ocrPages(parser) {
  console.log('    🔍 Đang render PDF thành ảnh...');
  const screenshots = await parser.getScreenshot({ scale: 2.0 });
  const worker = await getTesseractWorker();

  let fullText = '';
  for (let i = 0; i < screenshots.pages.length; i++) {
    console.log(`    📖 OCR trang ${i + 1}/${screenshots.pages.length}...`);
    const { data: { text } } = await worker.recognize(Buffer.from(screenshots.pages[i].data));
    fullText += text + '\n';
    if (fullText.length >= MAX_CONTENT_LENGTH) break;
  }
  
  // KHÔNG gọi terminate ở đây để tái sử dụng worker cho PDF sau
  return fullText;
}

// ─── TRÍCH XUẤT PDF ─────────────────────────────────────────────────────────
async function crawlPdf(url) {
  const title = decodeURIComponent(url.split('/').pop() || 'Tài liệu PDF');
  const parser = new PDFParse({ url });

  let content = '';
  try {
    const result = await parser.getText();
    content = result.text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

    if (content.length < OCR_FALLBACK_THRESHOLD) {
      console.log(`  ⚠️  Phát hiện PDF scan: [${title}] (${content.length} ký tự), đang kích hoạt OCR...`);
      const ocrText = await ocrPages(parser);
      content = ocrText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    }
  } finally {
    await parser.destroy();
  }

  return { title, content: content.slice(0, MAX_CONTENT_LENGTH) };
}

// ─── ĐIỀU PHỐI TỪNG URL ─────────────────────────────────────────────────────
async function crawlPage(url) {
  try {
    const result = url.toLowerCase().endsWith('.pdf')
      ? await crawlPdf(url)
      : await crawlHtml(url);

    console.log(`✅ Đã cào: ${result.title.substring(0, 70)}... (${result.content.length} ký tự)`);
    return { url, title: result.title, content: result.content };
  } catch (error) {
    console.log(`❌ Lỗi cào [${url}]:`, error.message);
    return null;
  }
}

// ─── HÀM CHIA LÔ (CHUNKING) CHO CONCURRENCY ─────────────────────────────────
async function processInBatches(urls, batchSize) {
  const results = [];
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    console.log(`\n⏳ Đang xử lý lô ${Math.floor(i / batchSize) + 1}/${Math.ceil(urls.length/batchSize)} (${batch.length} URL)...`);
    const batchResults = await Promise.all(batch.map(url => crawlPage(url)));
    results.push(...batchResults.filter(r => r && r.content.length > 100));
  }
  return results;
}

// ─── MAIN SCRIPT ────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 BẮT ĐẦU CÀO DỮ LIỆU TỪ UIT (ĐA LUỒNG TỐI ƯU)...\n');
  
  const startTime = Date.now();
  const scrapedData = await processInBatches(URLS_TO_CRAWL, CONCURRENCY_LIMIT);

  // Fallback nếu cào thất bại hoàn toàn
  if (scrapedData.length === 0) {
    console.log('\n⚠️  Không cào được dữ liệu. Tạo dữ liệu fallback mẫu...');
    scrapedData.push({
      url: 'https://tuyensinh.uit.edu.vn/nganh-tri-tue-nhan-tao',
      title: 'Ngành Trí tuệ nhân tạo (Artificial Intelligence)',
      content: 'Chương trình đào tạo Trí tuệ nhân tạo (AI)...',
    });
  }

  // Ghi kết quả
  const outputPath = path.join(__dirname, '../src/data/scrapedKnowledge.json');
  fs.writeFileSync(outputPath, JSON.stringify(scrapedData, null, 2), 'utf-8');
  
  // Dọn dẹp tài nguyên
  if (globalWorker) {
    await globalWorker.terminate();
    console.log('\n🧹 Đã giải phóng OCR Worker.');
  }

  const timeTaken = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`🎉 HOÀN TẤT! Đã lưu ${scrapedData.length} bài viết vào: ${outputPath}`);
  console.log(`⏱️ Thời gian chạy: ${timeTaken} giây.`);
}

main();
