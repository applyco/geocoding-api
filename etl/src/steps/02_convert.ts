/**
 * Step 02: Convert shapefile and TSV data to GeoJSON and JSON
 * SHP → GeoJSON using shapefile module
 * TSV → JSON via parsing
 */

import * as fs from "fs";
import * as path from "path";
import decompress from "decompress";
import { loadCitiesFromFile, loadAdmin1CodesFromFile } from "../utils/geonames_parser";

const SCRIPT_DIR = import.meta.dirname || process.cwd();
const RAW_DATA_DIR = path.resolve(SCRIPT_DIR, "..", "..", "data", "raw");
const PROCESSED_DATA_DIR = path.resolve(SCRIPT_DIR, "..", "..", "data", "processed");

// Helper function to clean null-padded strings from shapefile properties
function cleanProperties(props: any): any {
  const cleaned: any = {};
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === "string") {
      cleaned[key] = (value as string).replace(/\0/g, "").trim();
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

function generateCountryFeatureId(props: any): string {
  // Skip -99 (Natural Earth placeholder for invalid/disputed areas)
  if (props.ISO_A3 && props.ISO_A3 !== "-99") return props.ISO_A3;
  if (props.SOV_A3 && props.SOV_A3 !== "-99") return props.SOV_A3;
  // Try BRK_A3 (breakaway territory code) as fallback
  if (props.BRK_A3 && props.BRK_A3 !== "-99") return props.BRK_A3;
  // Fallback to admin name
  if (props.ADMIN) return props.ADMIN.replace(/\s+/g, "_");
  return `country_${Math.random().toString(36).substr(2, 9)}`;
}

function generateAdmin1FeatureId(props: any): string {
  // iso_3166_2 or iso_3166_2 from Natural Earth
  if (props.iso_3166_2) return props.iso_3166_2;
  if (props.ISO_3166_2) return props.ISO_3166_2;
  // Fallback: use adm0_a3 + name
  if (props.adm0_a3 && props.name) {
    return `${props.adm0_a3}-${(props.name as string).replace(/\s+/g, "_")}`;
  }
  if (props.ADM0_A3 && props.NAME) {
    return `${props.ADM0_A3}-${(props.NAME as string).replace(/\s+/g, "_")}`;
  }
  return `admin1_${Math.random().toString(36).substr(2, 9)}`;
}

// Add multilingual names from Natural Earth properties
function addMultilingualNames(props: any): any {
  const names: Record<string, string> = {};

  // Map Natural Earth name_* properties to our language codes
  names.es = props.name_es || props.name || props.ADMIN || "Unknown";
  names.en = props.name_en || props.name || props.ADMIN || "Unknown";
  names.pt = props.name_pt || props.name || props.ADMIN || "Unknown";

  // Also preserve original name in case of fallback
  props.names = names;
  props.canonical = names.es; // Default to Spanish for canonical

  return props;
}

async function extractZips() {
  console.log("  Extracting ZIP files...");
  const zips = ["ne_10m_admin_0_countries.zip", "ne_10m_admin_1_states_provinces.zip", "cities1000.zip", "alternateNamesV2.zip"];

  for (const zip of zips) {
    const zipPath = path.join(RAW_DATA_DIR, zip);
    if (!fs.existsSync(zipPath)) {
      console.log(`    ⊘ Skipping ${zip} (not found)`);
      continue;
    }
    console.log(`    Extracting ${zip}...`);
    await decompress(zipPath, RAW_DATA_DIR);
  }
}

async function convertShapefilesToGeoJSON() {
  console.log("  Converting shapefiles to GeoJSON...");

  let shapefile: any;
  try {
    shapefile = await import("shapefile");
  } catch {
    console.log(`    ⊘ Skipping shapefile conversion (module not available)`);
    return;
  }

  // Normalize ESM import (may be wrapped under .default in some contexts)
  const sf = (shapefile.default ?? shapefile) as any;

  // Countries
  const countriesPath = path.join(RAW_DATA_DIR, "ne_10m_admin_0_countries.shp");
  if (fs.existsSync(countriesPath)) {
    try {
      console.log(`    Converting Admin-0 Countries...`);
      const source = await sf.open(countriesPath);
      const collection: any = { type: "FeatureCollection", features: [] };

      let result = await source.read();
      while (result.done === false) {
        if (result.value) {
          const feature = result.value;
          const cleanedProps = cleanProperties(feature.properties || {});
          cleanedProps.feature_id = generateCountryFeatureId(cleanedProps);
          addMultilingualNames(cleanedProps);
          feature.properties = cleanedProps;
          collection.features.push(feature);
        }
        result = await source.read();
      }

      const outPath = path.join(PROCESSED_DATA_DIR, "countries.geojson");
      fs.writeFileSync(outPath, JSON.stringify(collection, null, 2));
      console.log(`    ✓ Converted Admin-0 Countries (${collection.features.length} features)`);
    } catch (err) {
      console.error(`    ✗ Failed to convert Admin-0 Countries:`, err);
    }
  }

  // Admin1
  const admin1Path = path.join(RAW_DATA_DIR, "ne_10m_admin_1_states_provinces.shp");
  if (fs.existsSync(admin1Path)) {
    try {
      console.log(`    Converting Admin-1 States/Provinces...`);
      const source = await sf.open(admin1Path);
      const collection: any = { type: "FeatureCollection", features: [] };

      let result = await source.read();
      while (result.done === false) {
        if (result.value) {
          const feature = result.value;
          const cleanedProps = cleanProperties(feature.properties || {});
          cleanedProps.feature_id = generateAdmin1FeatureId(cleanedProps);
          addMultilingualNames(cleanedProps);
          feature.properties = cleanedProps;
          collection.features.push(feature);
        }
        result = await source.read();
      }

      const outPath = path.join(PROCESSED_DATA_DIR, "admin1.geojson");
      fs.writeFileSync(outPath, JSON.stringify(collection, null, 2));
      console.log(`    ✓ Converted Admin-1 States/Provinces (${collection.features.length} features)`);
    } catch (err) {
      console.error(`    ✗ Failed to convert Admin-1:`, err);
    }
  }
}

async function convertGeonamesData() {
  console.log("  Converting GeoNames data to JSON...");

  // Load cities
  const citiesPath = path.join(RAW_DATA_DIR, "cities1000.txt");
  if (fs.existsSync(citiesPath)) {
    try {
      const cities = await loadCitiesFromFile(citiesPath);
      const output = path.join(PROCESSED_DATA_DIR, "cities.json");
      fs.writeFileSync(output, JSON.stringify(cities, null, 2));
      console.log(`    ✓ Loaded ${cities.length} cities`);

      // Also generate cities.geojson with Point geometries for Elasticsearch
      const citiesGeojson = {
        type: "FeatureCollection",
        features: cities.map((city) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [city.longitude, city.latitude],
          },
          properties: {
            feature_id: `geonames_${city.geonameid}`,
            names: {
              es: city.name,
              en: city.name,
              pt: city.name,
            },
            canonical: city.name,
            population: city.population,
            geonameid: city.geonameid,
            countryCode: city.countryCode,
            admin1Code: city.admin1Code,
          },
        })),
      };
      const geojsonOutput = path.join(PROCESSED_DATA_DIR, "cities.geojson");
      fs.writeFileSync(geojsonOutput, JSON.stringify(citiesGeojson, null, 2));
      console.log(`    ✓ Generated cities.geojson`);
    } catch (err) {
      console.error("    ✗ Failed to load cities:", err);
      throw err;
    }
  }

  // Load admin1 codes
  const admin1Path = path.join(RAW_DATA_DIR, "admin1CodesASCII.txt");
  if (fs.existsSync(admin1Path)) {
    try {
      const admin1Codes = await loadAdmin1CodesFromFile(admin1Path);
      const output = path.join(PROCESSED_DATA_DIR, "admin1_codes.json");
      const admin1Array = Array.from(admin1Codes.values());
      fs.writeFileSync(output, JSON.stringify(admin1Array, null, 2));
      console.log(`    ✓ Loaded ${admin1Codes.size} admin1 codes`);
    } catch (err) {
      console.error("    ✗ Failed to load admin1 codes:", err);
      throw err;
    }
  }
}

async function main() {
  console.log("🔄 Step 02: Converting data formats\n");

  try {
    // Create processed data directory
    if (!fs.existsSync(PROCESSED_DATA_DIR)) {
      fs.mkdirSync(PROCESSED_DATA_DIR, { recursive: true });
    }

    await extractZips();
    await convertShapefilesToGeoJSON();
    await convertGeonamesData();

    console.log("\n✓ Step 02 complete");
  } catch (err) {
    console.error("✗ Step 02 failed:", err);
    process.exit(1);
  }
}

main();
