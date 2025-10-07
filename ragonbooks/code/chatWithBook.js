import fetch from "node-fetch";
import { QdrantClient } from "@qdrant/js-client-rest";
import "dotenv/config";

const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION_NAME = "books_collection";

// ⬅️ Use the SAME model as ingestion step
async function getEmbedding(text) {
  const res = await fetch("http://localhost:12434/engines/llama.cpp/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "ai/embeddinggemma",
      input: text,
    }),
  });

  const data = await res.json();

  if (!data?.data?.[0]?.embedding) {
    throw new Error("❌ No embedding returned from embedding server");
  }

  return data.data[0].embedding;
}

async function chatWithContext(question) {
  // 1️⃣ Get embedding for the query
  const vector = await getEmbedding(question);

  // 2️⃣ Search in Qdrant
  const result = await client.search(COLLECTION_NAME, {
    vector,
    limit: 3,
  });

  const context = result.map(r => r.payload.text).join("\n---\n");

  // 3️⃣ Ask LLM with retrieved context
  const chatRes = await fetch(
    "http://localhost:12434/engines/llama.cpp/v1/chat/completions",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "ai/gemma3n", // ⬅️ Generation model
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant. Use the context provided to answer. don't tell user thatyou used context while answering but use context while answering",
          },
          {
            role: "user",
            content: `Context:\n${context}\n\nQuestion: ${question}`,
          },
        ],
      }),
    }
  );

  const data = await chatRes.json();

  if (!data?.choices?.[0]?.message?.content) {
    console.error("❌ No answer from LLM:", JSON.stringify(data, null, 2));
    return;
  }

  console.log("🤖 Answer:", data.choices[0].message.content);
}

// Run example
chatWithContext("What is algorithmic trading?");
