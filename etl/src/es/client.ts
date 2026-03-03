/**
 * Elasticsearch client for ETL operations
 */

import { Client } from "@elastic/elasticsearch";

let esClient: Client | null = null;

export function createESClient(): Client {
  const esUrl = process.env.ES_URL;
  const esUsername = process.env.ES_USERNAME;
  const esPassword = process.env.ES_PASSWORD;
  const esApiKey = process.env.ES_API_KEY;

  if (!esUrl) {
    throw new Error(
      "ES_URL environment variable is required. " +
        "Example: ES_URL=http://localhost:9200 npm run etl"
    );
  }

  // Support both API Key and Basic Auth
  if (esApiKey) {
    return new Client({
      node: esUrl,
      auth: {
        apiKey: esApiKey,
      },
    });
  }

  if (esUsername && esPassword) {
    return new Client({
      node: esUrl,
      auth: {
        username: esUsername,
        password: esPassword,
      },
    });
  }

  throw new Error(
    "Either ES_API_KEY or (ES_USERNAME + ES_PASSWORD) environment variables are required. " +
      "Example: ES_URL=http://localhost:9200 ES_USERNAME=elastic ES_PASSWORD=... npm run etl"
  );
}

export function getESClient(): Client {
  if (!esClient) {
    esClient = createESClient();
  }
  return esClient;
}

export async function closeESClient() {
  if (esClient) {
    await esClient.close();
    esClient = null;
  }
}

/**
 * Verify ES cluster is accessible
 */
export async function verifyESConnection(): Promise<boolean> {
  try {
    const client = getESClient();
    const health = await client.cluster.health();
    console.log(`✓ Elasticsearch cluster health: ${health.status}`);
    return true;
  } catch (err) {
    console.error("✗ Failed to connect to Elasticsearch:", err);
    return false;
  }
}

/**
 * Get statistics about indexed documents
 */
export async function getIndexStats(prefix = "geo_") {
  try {
    const client = getESClient();
    const response = await client.indices.stats({
      index: `${prefix}*`,
    });

    const indices = response.indices || {};
    const stats: Record<string, { docs: number; size: string }> = {};

    for (const [indexName, indexStats] of Object.entries(indices)) {
      const docCount = indexStats.primaries?.docs?.count || 0;
      const storeSize = indexStats.primaries?.store?.size_in_bytes || 0;
      stats[indexName] = {
        docs: docCount,
        size: formatBytes(storeSize),
      };
    }

    return stats;
  } catch (err) {
    console.error("Failed to get index stats:", err);
    return {};
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
