import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { QdrantClient } from "@qdrant/js-client-rest";
import crypto from "crypto";
import "dotenv/config";

const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const BOOKS_DIR = path.join(process.cwd(), "../books");
const COLLECTION_NAME = "books_collection";
const BATCH_SIZE = 50;
const START_BATCH = 1; // ⬅️ change this if you want to resume later

function chunkText(text, chunkSize = 500) {
  const sentences = text.split(/(?<=[.!?])\s+/);
  let chunks = [], current = [];
  for (let sentence of sentences) {
    if (current.join(" ").length + sentence.length > chunkSize) {
      chunks.push(current.join(" "));
      current = [];
    }
    current.push(sentence);
  }
  if (current.length) chunks.push(current.join(" "));
  return chunks;
}

// embedding with retry + safe fallback
async function getEmbedding(text, retries = 2) {
  if (!text.trim()) return null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch("http://localhost:12434/engines/llama.cpp/v1/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "ai/embeddinggemma", input: text }),
      });

      const data = await res.json();

      if (data?.data?.[0]?.embedding) {
        return data.data[0].embedding;
      } else {
        console.warn(`⚠️ No embedding returned (attempt ${attempt + 1})`);
      }
    } catch (err) {
      console.warn(`❌ Error fetching embedding (attempt ${attempt + 1}):`, err.message);
    }
    await new Promise(r => setTimeout(r, 500)); // wait a bit before retry
  }

  return null; // skip if still failing
}

async function ensureCollection(vectorSize) {
  try {
    await client.getCollection(COLLECTION_NAME);
  } catch {
    await client.createCollection(COLLECTION_NAME, {
      vectors: { size: vectorSize, distance: "Cosine" },
    });
  }
}

(async () => {
  const files = fs.readdirSync(BOOKS_DIR).filter(f => f.endsWith(".txt"));
  if (!files.length) return console.error("❌ No TXT files found!");

  for (const file of files) {
    if(file=="book2.txt"){
    const text = fs.readFileSync(path.join(BOOKS_DIR, file), "utf-8");
    const chunks = chunkText(text);
    console.log(`📖 Processing ${file} ➡️ ${chunks.length} chunks`);

    for (let i = (START_BATCH - 1) * BATCH_SIZE; i < chunks.length; i += BATCH_SIZE) {
      const batchIndex = i / BATCH_SIZE + 1;
      const batch = chunks.slice(i, i + BATCH_SIZE);

      const embeddings = await Promise.all(batch.map(c => getEmbedding(c)));

      const points = embeddings
        .map((vec, idx) =>
          vec
            ? {
                id: crypto.randomUUID(),
                vector: vec,
                payload: { book: file, text: batch[idx] },
              }
            : null
        )
        .filter(Boolean);

      if (!points.length) {
        console.warn(`⚠️ Skipping empty batch ${batchIndex}`);
        continue;
      }

      await ensureCollection(points[0].vector.length);
      await client.upsert(COLLECTION_NAME, { points });
      console.log(`⬆️ Uploaded batch ${batchIndex}`);
    }
  }

  console.log("✅ All chunks uploaded!");
  }
})();
