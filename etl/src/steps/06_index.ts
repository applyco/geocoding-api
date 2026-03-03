/**
 * Step 06: Bulk-index processed GeoJSON features into Elasticsearch
 */

import * as fs from "fs";
import * as path from "path";
import { getESClient, verifyESConnection, getIndexStats } from "../es/client";
import { recreateAllIndices, refreshIndices } from "../es/create_index";
import { INDICES, LEVEL_PRIORITY, getIndexName } from "../es/mappings";
import type { GeoFeature, SupportedLang } from "../../shared/types";

// Resolve paths relative to project root
const SCRIPT_DIR = import.meta.dirname || process.cwd();
const PROCESSED_DATA_DIR = path.resolve(SCRIPT_DIR, "..", "..", "data", "processed");

const LEVEL_TO_INDEX: Record<string, string> = {
  continent: "continents",
  zone: "zones",
  country: "countries",
  admin1: "admin1",
  city: "cities",
};

/**
 * Convert a GeoJSON feature to an ES-indexable GeoFeature
 */
function featureToGeoFeature(
  feature: any,
  level: string,
  prefix = "geo_"
): GeoFeature | null {
  const props = feature.properties || {};

  if (!props.feature_id || !feature.geometry) {
    return null;
  }

  const names: Record<SupportedLang, string> = {
    es: props.names?.es || props.canonical || props.NAME || props.asciiname || "Unknown",
    en: props.names?.en || props.canonical || props.NAME || props.asciiname || "Unknown",
    pt: props.names?.pt || props.canonical || props.NAME || props.asciiname || "Unknown",
  };

  const geoFeature: GeoFeature = {
    feature_id: props.feature_id,
    level: level as any,
    canonical: props.canonical || names.en,
    names,
    hierarchy: {
      continent_id: props.hierarchy?.continent_id || null,
      zone_id: props.hierarchy?.zone_id || null,
      country_id: props.hierarchy?.country_id || null,
      admin1_id: props.hierarchy?.admin1_id || null,
      city_id: props.hierarchy?.city_id || null,
    },
    priority: LEVEL_PRIORITY[level] || 0,
    population: props.population || undefined,
    geonames_id: props.geonameid || undefined,
    country_code: props.countryCode || undefined,
    admin1_code: props.admin1Code || undefined,
  };

  // Add geometry
  if (level === "city") {
    // Cities use geo_point, not geo_shape
    if (feature.geometry.type === "Point") {
      geoFeature.centroid = {
        type: "Point",
        coordinates: feature.geometry.coordinates,
      };
    }
  } else {
    // Countries, admin1, zones, continents use geo_shape (polygon)
    geoFeature.boundary = feature.geometry;
  }

  return geoFeature;
}

async function indexFeatures(
  indexName: string,
  features: GeoFeature[],
  batchSize = 500
): Promise<{ indexed: number; failed: number }> {
  const client = getESClient();
  let indexed = 0;
  let failed = 0;

  for (let i = 0; i < features.length; i += batchSize) {
    const batch = features.slice(i, i + batchSize);
    const operations: any[] = [];

    for (const doc of batch) {
      operations.push(
        { index: { _index: indexName, _id: doc.feature_id } },
        doc
      );
    }

    try {
      const result = await client.bulk({ operations });
      if (!result.errors) {
        indexed += batch.length;
      } else {
        // Count actual failures
        for (const item of result.items || []) {
          const op = Object.values(item)[0] as any;
          if (op.error) {
            failed++;
          } else {
            indexed++;
          }
        }
      }
    } catch (err) {
      console.error(`  ✗ Bulk index failed for batch ${i}:`, err);
      failed += batch.length;
    }
  }

  return { indexed, failed };
}

async function main() {
  console.log("📤 Step 06: Indexing into Elasticsearch\n");

  try {
    // Verify ES connection
    console.log("  Verifying Elasticsearch connection...");
    if (!(await verifyESConnection())) {
      console.error("\n  ✗ Cannot connect to Elasticsearch");
      console.error("  Set ES_URL and ES_API_KEY environment variables");
      process.exit(1);
    }

    // Create or recreate indices
    console.log("\n  Creating indices...");
    await recreateAllIndices();

    // Index each level
    console.log("\n  Indexing features...");

    const fileToLevel: Record<string, string> = {
      continents: "continent",
      countries: "country",
      admin1: "admin1",
      zones: "zone",
      cities: "city",
    };

    let totalIndexed = 0;

    for (const [fileBase, level] of Object.entries(fileToLevel)) {
      const filePath = path.join(PROCESSED_DATA_DIR, `${fileBase}.geojson`);
      if (!fs.existsSync(filePath)) {
        console.log(`  ⊘ ${fileBase}.geojson not found`);
        continue;
      }

      const geojson = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const indexName = getIndexName(LEVEL_TO_INDEX[level]);

      const features: GeoFeature[] = [];
      for (const feature of geojson.features) {
        const geoFeature = featureToGeoFeature(feature, level);
        if (geoFeature) {
          features.push(geoFeature);
        }
      }

      console.log(`  Indexing ${fileBase} (${features.length} features)...`);
      const result = await indexFeatures(indexName, features);
      console.log(`    ✓ Indexed: ${result.indexed}, Failed: ${result.failed}`);
      totalIndexed += result.indexed;
    }

    // Refresh all indices
    console.log("\n  Refreshing indices...");
    await refreshIndices();

    // Show final stats
    console.log("\n  Index statistics:");
    const stats = await getIndexStats();
    for (const [indexName, indexStats] of Object.entries(stats)) {
      console.log(`    ${indexName}: ${indexStats.docs} docs, ${indexStats.size}`);
    }

    console.log(`\n✓ Step 06 complete (${totalIndexed} features indexed)`);
  } catch (err) {
    console.error("✗ Step 06 failed:", err);
    process.exit(1);
  }
}

main();
