import fetch from "node-fetch";
import { QdrantClient } from "@qdrant/js-client-rest";
import "dotenv/config";

const client = new QdrantClient({
  url:process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION_NAME = "books_collection";

async function getEmbedding(text) {
  const res = await fetch("http://localhost:12434/engines/llama.cpp/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "ai/embeddinggemma", // ⬅️ must match upload step
      input: text,
    }),
  });

  const data = await res.json();

  if (!data?.data?.[0]?.embedding) {
    throw new Error("❌ No embedding returned from server");
  }

  return data.data[0].embedding;
}

(async () => {
  const query = "Explain algorithmic trading basics";

  const vector = await getEmbedding(query);

  const result = await client.search(COLLECTION_NAME, {
    vector,
    limit: 3,
  });

  console.log("🔍 Top results:");
  result.forEach((r, i) =>
    console.log(`${i + 1}.`, r.payload.text, "...")
  );
})();
