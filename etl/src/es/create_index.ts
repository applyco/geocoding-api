/**
 * Create or update Elasticsearch indices and templates
 */

import { getESClient } from "./client";
import { GEO_INDEX_TEMPLATE, INDICES, getIndexName } from "./mappings";

export async function createIndexTemplate(): Promise<void> {
  const client = getESClient();

  try {
    console.log("Creating Elasticsearch index template...");
    await client.indices.putIndexTemplate(GEO_INDEX_TEMPLATE);
    console.log("✓ Index template created/updated");
  } catch (err) {
    console.error("Failed to create index template:", err);
    throw err;
  }
}

export async function createOrUpdateIndex(indexType: (typeof INDICES)[number]): Promise<void> {
  const client = getESClient();
  const indexName = getIndexName(indexType);

  try {
    // Delete existing index if it exists
    await client.indices.delete({ index: indexName, ignore_unavailable: true });
    console.log(`Deleted existing index: ${indexName}`);

    // Create new index (will use the template settings/mappings)
    await client.indices.create({ index: indexName });
    console.log(`✓ Created index: ${indexName}`);
  } catch (err) {
    console.error(`Failed to create index ${indexName}:`, err);
    throw err;
  }
}

export async function recreateAllIndices(): Promise<void> {
  // Create template first (applies to all indices)
  await createIndexTemplate();

  // Then create individual indices
  for (const indexType of INDICES) {
    await createOrUpdateIndex(indexType);
  }

  console.log(`✓ All indices created: ${INDICES.join(", ")}`);
}

/**
 * Refresh indices to make new documents searchable
 */
export async function refreshIndices(prefix = "geo_"): Promise<void> {
  const client = getESClient();

  try {
    await client.indices.refresh({ index: `${prefix}*` });
    console.log("✓ Indices refreshed");
  } catch (err) {
    console.error("Failed to refresh indices:", err);
    throw err;
  }
}
