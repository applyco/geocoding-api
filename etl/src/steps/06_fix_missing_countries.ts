/**
 * Fix missing countries by re-indexing them
 * Run manually when some countries failed to index
 */

import * as fs from "fs";
import * as path from "path";
import { Client } from "@elastic/elasticsearch";

const SCRIPT_DIR = import.meta.dirname || process.cwd();
const PROCESSED_DATA_DIR = path.resolve(SCRIPT_DIR, "..", "..", "data", "processed");

async function main() {
  console.log("🔧 Fixing missing countries\n");

  const esUrl = process.env.ES_URL;
  const username = process.env.ES_USERNAME;
  const password = process.env.ES_PASSWORD;

  if (!esUrl || !username || !password) {
    console.error("✗ Missing ES_URL, ES_USERNAME, or ES_PASSWORD");
    process.exit(1);
  }

  const client = new Client({
    node: esUrl,
    auth: { username, password },
  });

  try {
    // Load countries
    const countriesPath = path.join(PROCESSED_DATA_DIR, "countries.geojson");
    if (!fs.existsSync(countriesPath)) {
      console.error("✗ countries.geojson not found");
      process.exit(1);
    }

    const countriesData = JSON.parse(fs.readFileSync(countriesPath, "utf-8"));

    // Index each country individually to catch errors
    console.log(`Indexing ${countriesData.features.length} countries...\n`);

    let indexed = 0;
    let failed = 0;
    const failedCountries: string[] = [];

    for (const feature of countriesData.features) {
      const props = feature.properties;
      const featureId = props.ADM0_A3 || props.ISO_A3;

      if (!featureId) {
        console.log(`⚠ Skipping country with no ID`);
        continue;
      }

      try {
        await client.index({
          index: "geo_countries",
          id: featureId,
          document: {
            feature_id: featureId,
            level: "country",
            names: props.names || {
              es: props.ADMIN || props.name || "",
              en: props.ADMIN || props.name || "",
              pt: props.ADMIN || props.name || "",
            },
            canonical: props.canonical || props.ADMIN || props.name || "",
            boundary: feature.geometry,
            priority: 1,
          },
        });
        indexed++;
        console.log(`  ✓ ${featureId} (${props.ADMIN})`);
      } catch (err) {
        failed++;
        failedCountries.push(featureId);
        console.error(`  ✗ ${featureId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Refresh index
    await client.indices.refresh({ index: "geo_countries" });

    console.log(`\n✓ Indexed: ${indexed}, Failed: ${failed}`);
    if (failedCountries.length > 0) {
      console.log(`Failed countries: ${failedCountries.join(", ")}`);
    }

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

main();
