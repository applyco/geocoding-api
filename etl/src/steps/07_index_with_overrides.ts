/**
 * Index documents into Elasticsearch with names from overrides.yaml
 * This creates test data for the three key locations in examples
 */

import * as yaml from "js-yaml";
import * as fs from "fs";
import * as path from "path";
import { getESClient } from "../es/client";

const SCRIPT_DIR = import.meta.dirname || process.cwd();
const OVERRIDES_PATH = path.resolve(SCRIPT_DIR, "..", "..", "data", "overrides.yaml");

interface Overrides {
  countries?: Record<string, any>;
  admin1?: Record<string, any>;
  zones?: Record<string, any>;
  cities?: Record<string, any>;
}

async function indexWithOverrides() {
  console.log("📤 Indexing features with multilingual names from overrides.yaml\n");

  const overridesContent = fs.readFileSync(OVERRIDES_PATH, "utf-8");
  const overrides = (yaml.load(overridesContent) as Overrides) || {};

  const client = getESClient();

  // Create test data for countries
  const countriesToIndex: { id: string; data: any }[] = [
    {
      id: "NZL",
      data: {
        feature_id: "NZL",
        level: "country",
        names: overrides.countries?.NZL?.names || {
          es: "Nueva Zelanda",
          en: "New Zealand",
          pt: "Nova Zelândia",
        },
        canonical: "New Zealand",
        hierarchy: { continent_id: "OC", zone_id: "m49-053" },
        priority: 30,
      },
    },
    {
      id: "USA",
      data: {
        feature_id: "USA",
        level: "country",
        names: overrides.countries?.USA?.names || {
          es: "Estados Unidos de América",
          en: "United States of America",
          pt: "Estados Unidos da América",
        },
        canonical: "United States of America",
        hierarchy: { continent_id: "NA", zone_id: "m49-021" },
        priority: 30,
      },
    },
    {
      id: "BRA",
      data: {
        feature_id: "BRA",
        level: "country",
        names: overrides.countries?.BRA?.names || {
          es: "Brasil",
          en: "Brazil",
          pt: "Brasil",
        },
        canonical: "Brazil",
        hierarchy: { continent_id: "SA", zone_id: "m49-005" },
        priority: 30,
      },
    },
  ];

  // Index countries
  console.log("🌍 Indexing countries...");
  for (const { id, data } of countriesToIndex) {
    try {
      await client.index({
        index: "geo_countries",
        id,
        document: data,
      });
      console.log(`  ✓ ${id}: ${data.names.es}`);
    } catch (e: any) {
      console.error(`  ✗ Error indexing ${id}:`, e.message);
    }
  }

  // Index admin1 regions
  console.log("\n📍 Indexing admin1 regions...");
  const admin1ToIndex: { id: string; data: any }[] = [
    {
      id: "NZ-CAN",
      data: {
        feature_id: "NZ-CAN",
        level: "admin1",
        names: overrides.admin1?.["NZ-CAN"]?.names || {
          es: "Canterbury",
          en: "Canterbury",
          pt: "Canterbury",
        },
        canonical: "Canterbury",
        country_code: "NZL",
        hierarchy: { country_id: "NZL" },
        priority: 25,
      },
    },
    {
      id: "US-AZ",
      data: {
        feature_id: "US-AZ",
        level: "admin1",
        names: overrides.admin1?.["US-AZ"]?.names || {
          es: "Arizona",
          en: "Arizona",
          pt: "Arizona",
        },
        canonical: "Arizona",
        country_code: "USA",
        hierarchy: { country_id: "USA" },
        priority: 25,
      },
    },
    {
      id: "BR-MG",
      data: {
        feature_id: "BR-MG",
        level: "admin1",
        names: overrides.admin1?.["BR-MG"]?.names || {
          es: "Minas Gerais",
          en: "Minas Gerais",
          pt: "Minas Gerais",
        },
        canonical: "Minas Gerais",
        country_code: "BRA",
        hierarchy: { country_id: "BRA" },
        priority: 25,
      },
    },
  ];

  for (const { id, data } of admin1ToIndex) {
    try {
      await client.index({
        index: "geo_admin1",
        id,
        document: data,
      });
      console.log(`  ✓ ${id}: ${data.names.es}`);
    } catch (e: any) {
      console.error(`  ✗ Error indexing ${id}:`, e.message);
    }
  }

  // Index zones
  console.log("\n🗺️  Indexing zones...");
  const zonesToIndex: { id: string; data: any }[] = [
    {
      id: "m49-053",
      data: {
        feature_id: "m49-053",
        level: "zone",
        names: overrides.zones?.["m49-053"]?.names || {
          es: "Australia y Nueva Zelanda",
          en: "Australia and New Zealand",
          pt: "Austrália e Nova Zelândia",
        },
        canonical: "Australia and New Zealand",
        hierarchy: { continent_id: "OC" },
        priority: 20,
      },
    },
    {
      id: "m49-021",
      data: {
        feature_id: "m49-021",
        level: "zone",
        names: overrides.zones?.["m49-021"]?.names || {
          es: "América Septentrional",
          en: "Northern America",
          pt: "América do Norte",
        },
        canonical: "Northern America",
        hierarchy: { continent_id: "NA" },
        priority: 20,
      },
    },
    {
      id: "m49-005",
      data: {
        feature_id: "m49-005",
        level: "zone",
        names: overrides.zones?.["m49-005"]?.names || {
          es: "América del Sur",
          en: "South America",
          pt: "América do Sul",
        },
        canonical: "South America",
        hierarchy: { continent_id: "SA" },
        priority: 20,
      },
    },
  ];

  for (const { id, data } of zonesToIndex) {
    try {
      await client.index({
        index: "geo_zones",
        id,
        document: data,
      });
      console.log(`  ✓ ${id}: ${data.names.es}`);
    } catch (e: any) {
      console.error(`  ✗ Error indexing ${id}:`, e.message);
    }
  }

  // Index cities
  console.log("\n🏙️  Indexing cities...");
  const citiesToIndex: { id: string; data: any }[] = [
    {
      id: "2179542",
      data: {
        feature_id: "2179542",
        level: "city",
        geonames_id: 2179542,
        names: overrides.cities?.["2179542"]?.names || {
          es: "Ashburton",
          en: "Ashburton",
          pt: "Ashburton",
        },
        canonical: "Ashburton",
        country_code: "NZL",
        admin1_code: "NZ-CAN",
        hierarchy: { country_id: "NZL", admin1_id: "NZ-CAN" },
        priority: 15,
      },
    },
    {
      id: "2805344",
      data: {
        feature_id: "2805344",
        level: "city",
        geonames_id: 2805344,
        names: overrides.cities?.["2805344"]?.names || {
          es: "Page",
          en: "Page",
          pt: "Page",
        },
        canonical: "Page",
        country_code: "USA",
        admin1_code: "US-AZ",
        hierarchy: { country_id: "USA", admin1_id: "US-AZ" },
        priority: 15,
      },
    },
    {
      id: "3469034",
      data: {
        feature_id: "3469034",
        level: "city",
        geonames_id: 3469034,
        names: overrides.cities?.["3469034"]?.names || {
          es: "Ibitirama",
          en: "Ibitirama",
          pt: "Ibitirama",
        },
        canonical: "Ibitirama",
        country_code: "BRA",
        admin1_code: "BR-MG",
        hierarchy: { country_id: "BRA", admin1_id: "BR-MG" },
        priority: 15,
      },
    },
  ];

  for (const { id, data } of citiesToIndex) {
    try {
      await client.index({
        index: "geo_cities",
        id,
        document: data,
      });
      console.log(`  ✓ ${id}: ${data.names.es}`);
    } catch (e: any) {
      console.error(`  ✗ Error indexing ${id}:`, e.message);
    }
  }

  // Index continents
  console.log("\n🌎 Indexing continents...");
  const continentsToIndex: { id: string; data: any }[] = [
    {
      id: "OC",
      data: {
        feature_id: "OC",
        level: "continent",
        names: {
          es: "Oceanía",
          en: "Oceania",
          pt: "Oceania",
        },
        canonical: "Oceania",
        hierarchy: {},
        priority: 40,
      },
    },
    {
      id: "NA",
      data: {
        feature_id: "NA",
        level: "continent",
        names: {
          es: "América del Norte",
          en: "North America",
          pt: "América do Norte",
        },
        canonical: "North America",
        hierarchy: {},
        priority: 40,
      },
    },
    {
      id: "SA",
      data: {
        feature_id: "SA",
        level: "continent",
        names: {
          es: "América del Sur",
          en: "South America",
          pt: "América do Sul",
        },
        canonical: "South America",
        hierarchy: {},
        priority: 40,
      },
    },
  ];

  for (const { id, data } of continentsToIndex) {
    try {
      await client.index({
        index: "geo_continents",
        id,
        document: data,
      });
      console.log(`  ✓ ${id}: ${data.names.es}`);
    } catch (e: any) {
      console.error(`  ✗ Error indexing ${id}:`, e.message);
    }
  }

  // Refresh indices
  console.log("\n🔄 Refreshing indices...");
  try {
    await client.indices.refresh({ index: "geo_*" });
    console.log("  ✓ Indices refreshed");
  } catch (e: any) {
    console.error("  ✗ Error refreshing indices:", e.message);
  }

  console.log("\n✅ Indexing complete!");
}

indexWithOverrides().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
