# ============================================================
# GOOGLE COLAB NOTEBOOK — Tạo Embeddings cho UIT Chatbox RAG
# Dùng sentence-transformers (MIỄN PHÍ, không cần API key)
# Model: paraphrase-multilingual-MiniLM-L12-v2 (hỗ trợ tiếng Việt)
# ============================================================


# ─── CELL 1: Mount Google Drive ──────────────────────────────
from google.colab import drive
drive.mount('/content/drive')

import os
os.makedirs('/content/drive/MyDrive/uit_rag', exist_ok=True)
print("✅ Google Drive đã mount thành công!")


# ─── CELL 2: Upload chunks.json ──────────────────────────────
from google.colab import files

print("📤 Vui lòng upload file chunks.json từ máy tính...")
uploaded = files.upload()

for filename in uploaded.keys():
    import shutil
    shutil.move(filename, f'/content/drive/MyDrive/uit_rag/{filename}')
    print(f"✅ Đã lưu {filename} vào Google Drive!")


# ─── CELL 3: Cài thư viện ────────────────────────────────────
import subprocess
subprocess.run(['pip', 'install', 'sentence-transformers', 'tqdm', '-q'])
print("✅ Đã cài xong sentence-transformers!")


# ─── CELL 4: Tải model và kiểm tra ──────────────────────────
from sentence_transformers import SentenceTransformer
import numpy as np

# Model hỗ trợ tiếng Việt tốt nhất, miễn phí, nhẹ (90MB)
MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"

print(f"📥 Đang tải model '{MODEL_NAME}'...")
model = SentenceTransformer(MODEL_NAME)

# Kiểm tra
test_vec = model.encode("Kiểm tra model tiếng Việt UIT")
print(f"✅ Model sẵn sàng! Kích thước vector: {len(test_vec)} chiều")


# ─── CELL 5: Tạo Embeddings (CHÍNH) ─────────────────────────
import json
import time
from tqdm import tqdm

# Đọc chunks
with open('/content/drive/MyDrive/uit_rag/chunks.json', 'r', encoding='utf-8') as f:
    chunks = json.load(f)

print(f"📦 Đã đọc {len(chunks)} chunks. Bắt đầu tạo embeddings...")
print(f"⏱️  Ước tính thời gian: ~1-2 phút (chạy local trên Colab)\n")

results = []

# Encode theo batch để nhanh hơn
BATCH_SIZE = 32
texts = [chunk["content"] for chunk in chunks]

all_embeddings = model.encode(
    texts,
    batch_size=BATCH_SIZE,
    show_progress_bar=True,
    convert_to_numpy=True
)

for chunk, embedding in zip(chunks, all_embeddings):
    results.append({
        "id": chunk["id"],
        "category": chunk["category"],
        "content": chunk["content"],
        "embedding": embedding.tolist()  # Chuyển numpy array thành list
    })

print(f"\n✅ Tạo embedding thành công: {len(results)}/{len(chunks)} chunks")
print(f"📐 Mỗi embedding: {len(results[0]['embedding'])} chiều")


# ─── CELL 6: Lưu kết quả ─────────────────────────────────────
output_path = '/content/drive/MyDrive/uit_rag/chunks_with_embeddings.json'

with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False)

size = os.path.getsize(output_path) / 1024
print(f"✅ Đã lưu {len(results)} chunks vào Google Drive!")
print(f"📊 Kích thước file: {size:.1f} KB")

# Lưu thêm thông tin model để backend biết cách dùng
meta = {"model": MODEL_NAME, "vector_dim": len(results[0]["embedding"])}
with open('/content/drive/MyDrive/uit_rag/meta.json', 'w') as f:
    json.dump(meta, f)
print(f"✅ Đã lưu meta.json: model={MODEL_NAME}, dim={meta['vector_dim']}")


# ─── CELL 7: Tải file về máy ─────────────────────────────────
from google.colab import files

print("📥 Đang tải file về máy...")
files.download(output_path)
print("✅ Lưu file vào: backend/scripts/chunks_with_embeddings.json")
