import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiKey = process.env.GEMINI_API_KEY?.trim();
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`;

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getGeminiEmbedding(text) {
  for (let i = 0; i < 3; i++) {
    try {
      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/gemini-embedding-001',
          content: { parts: [{ text }] },
          taskType: 'RETRIEVAL_DOCUMENT'
        })
      });
      if (response.ok) {
        const data = await response.json();
        const vec = data?.embedding?.values;
        if (Array.isArray(vec) && vec.length > 10) return vec;
      } else {
        console.warn(`Gemini error ${response.status}: ${await response.text()}`);
      }
    } catch (e) {
      console.warn(`Attempt ${i + 1} failed:`, e.message);
    }
    await delay(1000);
  }
  return null;
}

async function run() {
  const chunksPath = path.join(__dirname, 'chunks.json');
  const embeddedPath = path.join(__dirname, 'chunks_with_embeddings.json');
  
  if (!apiKey) {
    console.error("No GEMINI_API_KEY found!");
    return;
  }
  
  const chunks = JSON.parse(fs.readFileSync(chunksPath, 'utf8'));
  const results = [];
  
  console.log(`Bắt đầu tạo embeddings cho ${chunks.length} chunks bằng Gemini...`);
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const vec = await getGeminiEmbedding(chunk.content);
    if (vec) {
      results.push({ ...chunk, embedding: vec });
      process.stdout.write('.');
    } else {
      console.error(`\nFailed to embed chunk ${chunk.id}`);
    }
    
    // rate limit prevention
    await delay(200); 
  }
  
  fs.writeFileSync(embeddedPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\n✅ Xong! Kích thước vector: ${results[0]?.embedding?.length}. Lưu vào ${embeddedPath}`);
}

run();
