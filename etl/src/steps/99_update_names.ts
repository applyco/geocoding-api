/**
 * Script para actualizar nombres en Elasticsearch desde overrides.yaml
 * Uso: ES_URL=... ES_USERNAME=... ES_PASSWORD=... npm run step:update-names
 */

import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { getESClient } from "../es/client";

const SCRIPT_DIR = import.meta.dirname || process.cwd();
const OVERRIDES_PATH = path.resolve(SCRIPT_DIR, "..", "..", "data", "overrides.yaml");

interface Overrides {
  countries?: Record<string, NameOverride>;
  admin1?: Record<string, NameOverride>;
  zones?: Record<string, NameOverride>;
  cities?: Record<string, NameOverride>;
}

interface NameOverride {
  names: Record<string, string>;
  canonical?: string;
}

async function updateNamesInElasticsearch() {
  console.log("📝 Updating names in Elasticsearch from overrides.yaml\n");

  // Load overrides
  const overridesContent = fs.readFileSync(OVERRIDES_PATH, "utf-8");
  const overrides = (yaml.load(overridesContent) as Overrides) || {};

  const client = getESClient();

  const updates = {
    countries: overrides.countries || {},
    admin1: overrides.admin1 || {},
    zones: overrides.zones || {},
    cities: overrides.cities || {},
  };

  let totalUpdated = 0;

  // Update countries
  console.log("🌍 Updating countries...");
  for (const [countryCode, override] of Object.entries(updates.countries)) {
    const doc = {
      names: override.names,
      canonical: override.canonical || override.names.en,
    };

    try {
      await client.update({
        index: "geo_countries",
        id: countryCode,
        body: { doc },
        retry_on_conflict: 3,
      });
      totalUpdated++;
    } catch (e: any) {
      if (e.statusCode !== 404) {
        console.error(`  ✗ Error updating ${countryCode}:`, e.message);
      }
    }
  }
  console.log(`  ✓ Updated ${totalUpdated} countries`);

  // Update admin1
  console.log("\n📍 Updating admin1...");
  let admin1Updated = 0;
  for (const [admin1Code, override] of Object.entries(updates.admin1)) {
    const doc = {
      names: override.names,
      canonical: override.canonical || override.names.en,
    };

    try {
      await client.update({
        index: "geo_admin1",
        id: admin1Code,
        body: { doc },
        retry_on_conflict: 3,
      });
      admin1Updated++;
    } catch (e: any) {
      if (e.statusCode !== 404) {
        console.error(`  ✗ Error updating ${admin1Code}:`, e.message);
      }
    }
  }
  console.log(`  ✓ Updated ${admin1Updated} admin1 regions`);

  // Update zones
  console.log("\n🗺️  Updating zones...");
  let zonesUpdated = 0;
  for (const [zoneId, override] of Object.entries(updates.zones)) {
    const doc = {
      names: override.names,
      canonical: override.canonical || override.names.en,
    };

    try {
      await client.update({
        index: "geo_zones",
        id: zoneId,
        body: { doc },
        retry_on_conflict: 3,
      });
      zonesUpdated++;
    } catch (e: any) {
      if (e.statusCode !== 404) {
        console.error(`  ✗ Error updating ${zoneId}:`, e.message);
      }
    }
  }
  console.log(`  ✓ Updated ${zonesUpdated} zones`);

  // Update cities
  console.log("\n🏙️  Updating cities...");
  let citiesUpdated = 0;
  for (const [cityId, override] of Object.entries(updates.cities)) {
    const doc = {
      names: override.names,
      canonical: override.canonical || override.names.en,
    };

    try {
      await client.update({
        index: "geo_cities",
        id: cityId,
        body: { doc },
        retry_on_conflict: 3,
      });
      citiesUpdated++;
    } catch (e: any) {
      if (e.statusCode !== 404) {
        console.error(`  ✗ Error updating ${cityId}:`, e.message);
      }
    }
  }
  console.log(`  ✓ Updated ${citiesUpdated} cities`);

  console.log(`\n✅ Total updated: ${totalUpdated + admin1Updated + zonesUpdated + citiesUpdated} documents`);
}

updateNamesInElasticsearch().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
