import { MemoryEvent } from "../types";

export interface Embedding {
  vector: number[];
  confidence: number;
  source: string;
  timestamp: number;
}

// Generate a deterministic embedding for a memory event
export function generateEmbedding(event: MemoryEvent): Embedding {
  const embedding = new Array(128).fill(0);

  // Content-based features (dimensions 0-29)
  if (event.content) {
    const content = event.content.toLowerCase();
    const contentHash = content.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);

    for (let i = 0; i < 30; i++) {
      embedding[i] = Math.sin(contentHash + i) * 0.5 + 0.5;
    }
  }

  // Speech intent features (dimensions 30-49)
  if (event.facets["speech.intent"]) {
    const intent = String(event.facets["speech.intent"]).toLowerCase();
    const intentHash = intent.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    for (let i = 30; i < 50; i++) {
      embedding[i] = Math.sin(intentHash + i) * 0.5 + 0.5;
    }
  }

  // Affect features (dimensions 50-69)
  if (event.facets["affect.valence"]) {
    const valence = Number(event.facets["affect.valence"]);
    for (let i = 50; i < 60; i++) {
      embedding[i] = valence * (0.8 + 0.4 * Math.sin(i));
    }
  }

  if (event.facets["affect.arousal"]) {
    const arousal = Number(event.facets["affect.arousal"]);
    for (let i = 60; i < 70; i++) {
      embedding[i] = arousal * (0.8 + 0.4 * Math.cos(i));
    }
  }

  // Source type features (dimensions 70-79)
  const sourceHash = event.source.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
  for (let i = 70; i < 80; i++) {
    embedding[i] = Math.sin(sourceHash + i) * 0.5 + 0.5;
  }

  // STM/LTM specific features (dimensions 80-89)
  if (event.source === "stm" || event.source === "ltm") {
    const content = event.content || "";
    const contentHash = content.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    for (let i = 80; i < 90; i++) {
      embedding[i] = Math.cos(contentHash + i) * 0.5 + 0.5;
    }
  }

  // Temporal features (dimensions 90-99)
  const timeHash = event.ts
    .toString()
    .split("")
    .reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
  for (let i = 90; i < 100; i++) {
    embedding[i] = Math.sin(timeHash + i) * 0.5 + 0.5;
  }

  // Variation features (dimensions 100-127)
  const variationHash = (event.ts * 1000 + event.source.length) % 1000;
  for (let i = 100; i < 128; i++) {
    embedding[i] = Math.cos(variationHash + i) * 0.3 + 0.5;
  }

  // Calculate confidence based on facets
  const confidence = Number(event.facets["confidence"]) || 0.5;

  return {
    vector: embedding,
    confidence,
    source: event.source,
    timestamp: event.ts,
  };
}

export function generateEmbeddings(events: MemoryEvent[]): Embedding[] {
  return events.map(generateEmbedding);
}

export async function generateRealEmbedding(
  event: MemoryEvent
): Promise<Embedding> {
  try {
    const response = await fetch("http://localhost:8081/infer/text", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: event.content || "",
        facets: event.facets,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Ensure we have a 128-dimensional vector
    let vector = data.embedding || data.vector || [];
    if (vector.length !== 128) {
      // Pad or truncate to 128 dimensions
      const padded = new Array(128).fill(0);
      for (let i = 0; i < Math.min(vector.length, 128); i++) {
        padded[i] = vector[i];
      }
      vector = padded;
    }

    return {
      vector,
      confidence: data.confidence || 0.8,
      source: event.source,
      timestamp: event.ts,
    };
  } catch (error) {
    console.warn("Failed to generate real embedding, using fallback:", error);
    return generateEmbedding(event);
  }
}

export async function reduceDimensions(
  embeddings: Embedding[],
  targetDimensions: number = 3
): Promise<number[][]> {
  try {
    const response = await fetch("/api/embeddings/reduce-dimensions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        embeddings: embeddings.map((e) => e.vector),
        target_dimensions: targetDimensions,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.reduced_embeddings || data.coordinates || [];
  } catch (error) {
    console.warn(
      "Failed to reduce dimensions via service, using fallback:",
      error
    );

    // Simple fallback: use first N dimensions
    return embeddings.map((embedding) =>
      Array.from(
        { length: targetDimensions },
        (_, i) => embedding.vector[i] || 0
      )
    );
  }
}

const embeddingCache = new Map<string, Embedding>();

// Global preference for real vs fallback embeddings
let preferRealEmbeddings = true;

export function setPreferRealEmbeddings(prefer: boolean) {
  preferRealEmbeddings = prefer;
}

export function getPreferRealEmbeddings(): boolean {
  return preferRealEmbeddings;
}

export function getCachedEmbedding(event: MemoryEvent): Embedding {
  const cacheKey = `${event.ts}-${event.source}-${event.content || ""}`;

  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey)!;
  }

  const embedding = generateEmbedding(event);
  embeddingCache.set(cacheKey, embedding);
  return embedding;
}

export function clearEmbeddingCache(): void {
  embeddingCache.clear();
}

export async function getEmbeddingForEvent(
  event: MemoryEvent,
  options: { preferReal?: boolean } = {}
): Promise<Embedding> {
  const preferReal = options.preferReal ?? preferRealEmbeddings;
  const cacheKey = `${event.ts}-${event.source}-${event.content || ""}`;

  // Check cache first
  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey)!;
  }

  let embedding: Embedding;

  // Use existing embedding if available
  if (
    event.embedding &&
    Array.isArray(event.embedding) &&
    event.embedding.length > 0
  ) {
    embedding = {
      vector: event.embedding as number[],
      confidence: Number(event.facets["confidence"]) || 0.8,
      source: event.source,
      timestamp: event.ts,
    };
  } else if (preferReal) {
    // Try real embedding first, fall back to deterministic
    try {
      embedding = await generateRealEmbedding(event);
    } catch (error) {
      console.warn("Failed to generate real embedding, using fallback:", error);
      embedding = generateEmbedding(event);
    }
  } else {
    // Use deterministic generation
    embedding = generateEmbedding(event);
  }

  // Cache the result
  embeddingCache.set(cacheKey, embedding);
  return embedding;
}

export async function getEmbeddingsForEvents(
  events: MemoryEvent[],
  options: { preferReal?: boolean; concurrency?: number } = {
    concurrency: 6,
  }
): Promise<Embedding[]> {
  const preferReal = options.preferReal ?? preferRealEmbeddings;
  const { concurrency = 6 } = options;
  const results: Embedding[] = [];

  // Process in batches to control concurrency
  for (let i = 0; i < events.length; i += concurrency) {
    const batch = events.slice(i, i + concurrency);
    const batchPromises = batch.map((event) =>
      getEmbeddingForEvent(event, { preferReal })
    );

    try {
      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          console.warn(
            `Failed to get embedding for event ${batch[index].ts}:`,
            result.reason
          );
          // Fallback to deterministic generation
          results.push(generateEmbedding(batch[index]));
        }
      });
    } catch (error) {
      console.error("Batch embedding generation failed:", error);
      // Fallback to deterministic for the entire batch
      batch.forEach((event) => results.push(generateEmbedding(event)));
    }
  }

  return results;
}
