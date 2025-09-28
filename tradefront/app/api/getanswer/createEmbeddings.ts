// import fetch from "node-fetch";
// import OpenAI from "openai";
// import { QdrantClient } from "@qdrant/js-client-rest";
// import "dotenv/config";

// const client = new QdrantClient({
//   url: "https://08b0f820-57f7-4caf-962c-47aad2cd3760.us-east-1-1.aws.cloud.qdrant.io:6333",
//   apiKey: process.env.QDRANT_API_KEY,
// });

// const COLLECTION_NAME = "books_collection";

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// let useOpenAI = false;

// export function setEmbeddingSource(flag: boolean) {
//   useOpenAI = flag;
// }

// interface OpenAIEmbeddingResponse {
//   data: {
//     embedding: number[];
//   }[];
// }

// interface LocalEmbeddingResponse {
//   data: {
//     embedding: number[];
//   }[];
// }

// export async function getEmbedding(text: string): Promise<{embeds:number[],error:boolean}> {
//   if (useOpenAI) {
//     const response = (await openai.embeddings.create({
//       model: "text-embedding-3-large",
//       input: text,
//     })) as OpenAIEmbeddingResponse;

//     if (!response.data?.[0]?.embedding) {
//     //   throw new Error("❌ No embedding returned from OpenAI");
//         return {embeds:[],error:true}
//     }
//     // return response.data[0].embedding;
//     return {embeds:response.data[0].embedding,error:false}
//   } else {
//     const res = await fetch("http://localhost:12434/engines/llama.cpp/v1/embeddings", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         model: "ai/embeddinggemma",
//         input: text,
//       }),
//     });

//     const data = (await res.json()) as LocalEmbeddingResponse;

//     if (!data?.data?.[0]?.embedding) {
//     //   throw new Error("❌ No embedding returned from local server");
//     return {embeds:[],error:true}
//     }


//     return {embeds:data.data[0].embedding,error:false}
//   }
// }




// interface QdrantSearchPoint {
//   id: string | number;
//   payload?: Record<string, unknown> | null;
//   score?: number;
// }

// interface SearchResult {
//   rank: number;
//   text: string;
//   score: number;
// }

// export async function searchQdrant(vector: number[], limit = 3): Promise<SearchResult[]> {
//   // response is directly an array of points
//   const points: QdrantSearchPoint[] = await client.search(COLLECTION_NAME, {
//     vector,
//     limit,
//   });

//   return points.map((r, i) => ({
//     rank: i + 1,
//     text: (r.payload?.text as string) ?? "No text",
//     score: r.score ?? 0,
//   }));
// }












import fetch from "node-fetch";
import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";
import "dotenv/config";

const client = new QdrantClient({
  url: "https://08b0f820-57f7-4caf-962c-47aad2cd3760.us-east-1-1.aws.cloud.qdrant.io:6333",
  apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION_NAME = "books_collection";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

let useOpenAI = false;

export function setEmbeddingSource(flag: boolean) {
  useOpenAI = flag;
}

interface EmbeddingResponse {
  data: {
    embedding: number[];
  }[];
}

export async function getEmbedding(
  text: string
): Promise<{ vector: number[]; error: boolean }> {
  if (useOpenAI) {
    const response = (await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: text,
    })) as unknown as EmbeddingResponse;

    const vector = response.data?.[0]?.embedding;
    if (!vector) return { vector: [], error: true };

    return { vector, error: false };
  } else {
    const res = await fetch(
      "http://localhost:12434/engines/llama.cpp/v1/embeddings",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "ai/embeddinggemma",
          input: text,
        }),
      }
    );

    const data = (await res.json()) as EmbeddingResponse;
    const vector = data?.data?.[0]?.embedding;

    if (!vector) return { vector: [], error: true };

    return { vector, error: false };
  }
}

interface SearchResult {
  rank: number;
  text: string;
  score: number;
}

export async function searchQdrant(
  vector: number[],
  limit = 3
): Promise<SearchResult[]> {
  const points = await client.search(COLLECTION_NAME, {
    vector,
    limit,
  });

  return points.map((r, i) => ({
    rank: i + 1,
    text: (r.payload?.text as string) ?? "No text",
    score: r.score ?? 0,
  }));
}
