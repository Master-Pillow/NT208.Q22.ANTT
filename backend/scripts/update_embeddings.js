import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HF_API_URL = 'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getEmbedding(text) {
  for (let i = 0; i < 3; i++) {
    try {
      const response = await fetch(HF_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: text, options: { wait_for_model: true } })
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          const vec = Array.isArray(data[0]) ? (Array.isArray(data[0][0]) ? data[0][0] : data[0]) : data;
          if (Array.isArray(vec) && vec.length > 10) return vec;
        }
      } else {
        console.warn(`HF error ${response.status}: ${await response.text()}`);
      }
    } catch (e) {
      console.warn(`Attempt ${i + 1} failed:`, e.message);
    }
    await delay(3000); // wait and retry
  }
  return null;
}

async function updateEmbeddings() {
  const chunksPath = path.join(__dirname, 'chunks.json');
  const embeddedPath = path.join(__dirname, 'chunks_with_embeddings.json');
  
  const allChunks = JSON.parse(fs.readFileSync(chunksPath, 'utf8'));
  let embeddedChunks = [];
  
  if (fs.existsSync(embeddedPath)) {
    embeddedChunks = JSON.parse(fs.readFileSync(embeddedPath, 'utf8'));
  }
  
  const existingIds = new Set(embeddedChunks.map(c => c.id));
  const newChunks = allChunks.filter(c => !existingIds.has(c.id));
  
  console.log(`Found ${allChunks.length} total chunks.`);
  console.log(`Found ${embeddedChunks.length} existing embeddings.`);
  console.log(`Need to generate embeddings for ${newChunks.length} new chunks...`);
  
  if (newChunks.length === 0) {
    console.log('Nothing to do!');
    return;
  }
  
  let successCount = 0;
  for (let i = 0; i < newChunks.length; i++) {
    const chunk = newChunks[i];
    console.log(`[${i + 1}/${newChunks.length}] Embedding: ${chunk.id}...`);
    
    const vec = await getEmbedding(chunk.content);
    if (vec) {
      embeddedChunks.push({ ...chunk, embedding: vec });
      successCount++;
    } else {
      console.error(`Failed to embed ${chunk.id}`);
    }
    
    // Save incrementally
    fs.writeFileSync(embeddedPath, JSON.stringify(embeddedChunks, null, 2), 'utf8');
    await delay(200); // short delay between successful requests
  }
  
  console.log(`✅ Finished! Added ${successCount} new embeddings. Total is now ${embeddedChunks.length}.`);
}

updateEmbeddings();
