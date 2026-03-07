/**
 * Step 02b: Add missing cities with feature codes PPLA3/PPLA4/PPLA5
 * Reads cities1000.txt directly and indexes additional administrative capitals
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { Client } from "@elastic/elasticsearch";

const SCRIPT_DIR = import.meta.dirname || process.cwd();
const RAW_DATA_DIR = path.resolve(SCRIPT_DIR, "..", "..", "data", "raw");

async function main() {
  console.log("📍 Step 02b: Adding missing cities with PPLA3/PPLA4/PPLA5\n");

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

  const citiesPath = path.join(RAW_DATA_DIR, "cities1000.txt");

  if (!fs.existsSync(citiesPath)) {
    console.error(`✗ ${citiesPath} not found`);
    process.exit(1);
  }

  const rl = readline.createInterface({
    input: fs.createReadStream(citiesPath),
    crlfDelay: Infinity,
  });

  const featureCodesToAdd = ["PPLA3", "PPLA4", "PPLA5"];
  let processed = 0;
  let indexed = 0;
  let failed = 0;

  console.log(`Adding cities with feature codes: ${featureCodesToAdd.join(", ")}\n`);

  for await (const line of rl) {
    processed++;

    const fields = line.split("\t");
    if (fields.length < 16) continue;

    const geonameid = parseInt(fields[0], 10);
    const name = fields[1];
    const featureClass = fields[6];
    const featureCode = fields[7];
    const lat = parseFloat(fields[4]);
    const lon = parseFloat(fields[5]);
    const population = parseInt(fields[14], 10);
    const countryCode = fields[8];

    if (
      featureClass === "P" &&
      featureCodesToAdd.includes(featureCode) &&
      population >= 1000
    ) {
      try {
        await client.index({
          index: "geo_cities",
          id: `geonames_${geonameid}`,
          document: {
            feature_id: geonameid,
            level: "city",
            names: {
              es: name,
              en: name,
              pt: name,
            },
            canonical: name,
            centroid: {
              type: "Point",
              coordinates: [lon, lat],
            },
            priority: 100,
            country_code: countryCode,
            geonames_id: geonameid,
            population,
          },
        });
        indexed++;
      } catch (err) {
        failed++;
        console.error(`✗ Failed to index ${name}: ${err}`);
      }
    }

    if (processed % 50000 === 0) {
      process.stdout.write(
        `\rProcessed: ${processed.toLocaleString()} | Indexed: ${indexed} | Failed: ${failed}`
      );
    }
  }

  // Refresh index
  await client.indices.refresh({ index: "geo_cities" });

  console.log(`\n\n✓ Step 02b complete`);
  console.log(`  Processed: ${processed.toLocaleString()}`);
  console.log(`  Indexed: ${indexed.toLocaleString()}`);
  console.log(`  Failed: ${failed.toLocaleString()}`);

  process.exit(failed > 0 ? 1 : 0);
}

main();
