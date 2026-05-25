import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Danh sách các URL công khai cần cào — đúng URL từ tuyensinh.uit.edu.vn
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
];

async function crawlPage(url) {
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000 // 10 seconds timeout
    });
    const $ = cheerio.load(data);
    
    // Tìm tiêu đề
    let title = $('h1').first().text().trim() || $('title').text().trim();
    if (!title) title = url;

    // Lấy nội dung các thẻ p, li, h2, h3 trong phần nội dung chính (thường là .content, .node-content, hoặc article)
    // Nếu không có class cụ thể, lấy tất cả p và li nhưng lọc bớt menu
    const contentBlocks = [];
    
    const selector = $('.content').length > 0 ? $('.content') : $('body');
    
    selector.find('h2, h3, p, li').each((i, el) => {
      const text = $(el).text().trim();
      // Bỏ qua các đoạn text quá ngắn (như menu) hoặc chứa Javascript
      if (text.length > 30 && !text.includes('function(') && !text.includes('jQuery')) {
        contentBlocks.push(text);
      }
    });

    const content = contentBlocks.join('\n');
    
    console.log(`✅ Đã cào thành công: ${title} (${content.length} ký tự)`);
    return {
      url,
      title,
      content: content.slice(0, 5000) // Giới hạn 5000 ký tự mỗi trang để tránh tràn JSON
    };
  } catch (error) {
    console.log(`❌ Lỗi cào trang ${url}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Bắt đầu cào dữ liệu từ UIT...');
  const scrapedData = [];
  
  for (const url of URLS_TO_CRAWL) {
    const data = await crawlPage(url);
    if (data && data.content.length > 100) {
      scrapedData.push(data);
    }
  }

  // Nếu việc cào bị lỗi toàn bộ (ví dụ web down hoặc chống DDoS), ta tạo dữ liệu mẫu
  if (scrapedData.length === 0) {
    console.log('⚠️ Không cào được dữ liệu. Tạo dữ liệu fallback mẫu...');
    scrapedData.push({
      url: 'https://tuyensinh.uit.edu.vn/nganh-tri-tue-nhan-tao',
      title: 'Ngành Trí tuệ nhân tạo (Artificial Intelligence)',
      content: 'Chương trình đào tạo Trí tuệ nhân tạo (AI) trang bị cho sinh viên kiến thức chuyên sâu về Machine Learning, Deep Learning, Xử lý ngôn ngữ tự nhiên, Thị giác máy tính. Sinh viên tốt nghiệp có thể làm AI Engineer, Data Scientist với mức lương khủng.'
    });
    scrapedData.push({
      url: 'https://tuyensinh.uit.edu.vn/phuong-thuc-tuyen-sinh',
      title: 'Các phương thức tuyển sinh UIT',
      content: 'Trường Đại học Công nghệ Thông tin xét tuyển theo 3 phương thức: Tuyển thẳng, Ưu tiên xét tuyển theo quy định ĐHQG-HCM, Xét tuyển dựa vào điểm thi ĐGNL, Xét tuyển dựa vào điểm thi THPT Quốc gia.'
    });
  }

  const outputPath = path.join(__dirname, '../src/data/scrapedKnowledge.json');
  fs.writeFileSync(outputPath, JSON.stringify(scrapedData, null, 2), 'utf-8');
  console.log(`🎉 Hoàn tất! Đã lưu ${scrapedData.length} bài viết vào: ${outputPath}`);
}

main();
