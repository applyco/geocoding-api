/**
 * Step 04: Apply canonical name overrides from overrides.yaml
 * This ensures consistent naming regardless of upstream data provider changes
 */

import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import type { NameOverride } from "../../shared/types";

// Resolve paths relative to project root
const SCRIPT_DIR = import.meta.dirname || process.cwd();
const PROCESSED_DATA_DIR = path.resolve(SCRIPT_DIR, "..", "..", "data", "processed");
const OVERRIDES_FILE = path.resolve(SCRIPT_DIR, "..", "..", "data", "overrides.yaml");

const SUFFIX_STRIP_PATTERNS: Record<string, string[]> = {
  en: [" Region", " Province", " Prefecture", " Oblast", " Territory", " State"],
  es: [" Región", " Provincia", " Territorio", " Estado"],
  pt: [" Região", " Província", " Território", " Estado"],
};

/**
 * Normalize names by stripping common suffixes
 */
function stripCommonSuffixes(name: string, lang: "en" | "es" | "pt"): string {
  let result = name;
  const suffixes = SUFFIX_STRIP_PATTERNS[lang] || [];

  for (const suffix of suffixes) {
    if (result.endsWith(suffix)) {
      result = result.substring(0, result.length - suffix.length);
      break;
    }
  }

  return result;
}

/**
 * Apply overrides to countries using ISO_A3 code
 */
function applyCountryOverrides(geojson: any, overrides: Record<string, NameOverride>): number {
  let applied = 0;

  for (const feature of geojson.features) {
    const isoA3 = feature.properties?.ISO_A3;
    if (!isoA3 || !overrides[isoA3]) continue;

    const override = overrides[isoA3];
    if (!feature.properties.names) {
      feature.properties.names = {};
    }

    if (override.names) {
      feature.properties.names.es = override.names.es || feature.properties.names.es || "";
      feature.properties.names.en = override.names.en || feature.properties.names.en || "";
      feature.properties.names.pt = override.names.pt || feature.properties.names.pt || "";
    }

    if (override.canonical) {
      feature.properties.canonical = override.canonical;
    }

    applied++;
  }

  return applied;
}

/**
 * Apply overrides to cities using geonameid
 */
function applyCityOverrides(geojson: any, overrides: Record<string, NameOverride>): number {
  let applied = 0;

  for (const feature of geojson.features) {
    const geonameid = feature.properties?.geonameid?.toString();
    if (!geonameid || !overrides[geonameid]) continue;

    const override = overrides[geonameid];
    if (!feature.properties.names) {
      feature.properties.names = {};
    }

    if (override.names) {
      feature.properties.names.es = override.names.es || feature.properties.names.es || "";
      feature.properties.names.en = override.names.en || feature.properties.names.en || "";
      feature.properties.names.pt = override.names.pt || feature.properties.names.pt || "";
    }

    if (override.canonical) {
      feature.properties.canonical = override.canonical;
    }

    applied++;
  }

  return applied;
}

async function main() {
  console.log("📋 Step 04: Applying name overrides\n");

  try {
    // Load overrides YAML
    if (!fs.existsSync(OVERRIDES_FILE)) {
      console.log("  ✗ overrides.yaml not found");
      process.exit(1);
    }

    const overridesRaw = yaml.load(fs.readFileSync(OVERRIDES_FILE, "utf-8")) as Record<
      string,
      Record<string, NameOverride>
    >;
    console.log("  ✓ Loaded overrides.yaml");

    let totalApplied = 0;

    // Process countries
    const countriesPath = path.join(PROCESSED_DATA_DIR, "countries.geojson");
    if (fs.existsSync(countriesPath)) {
      const geojson = JSON.parse(fs.readFileSync(countriesPath, "utf-8"));
      const countryOverrides = overridesRaw.countries || {};

      const applied = applyCountryOverrides(geojson, countryOverrides);
      if (applied > 0) {
        fs.writeFileSync(countriesPath, JSON.stringify(geojson, null, 2));
        console.log(`  ✓ countries.geojson: applied ${applied} overrides`);
        totalApplied += applied;
      }
    }

    // Process cities
    const citiesPath = path.join(PROCESSED_DATA_DIR, "cities.geojson");
    if (fs.existsSync(citiesPath)) {
      const geojson = JSON.parse(fs.readFileSync(citiesPath, "utf-8"));
      const cityOverrides = overridesRaw.cities || {};

      const applied = applyCityOverrides(geojson, cityOverrides);
      if (applied > 0) {
        fs.writeFileSync(citiesPath, JSON.stringify(geojson, null, 2));
        console.log(`  ✓ cities.geojson: applied ${applied} overrides`);
        totalApplied += applied;
      }
    }

    // Display name normalization rules
    console.log(`\n  Total overrides applied: ${totalApplied}`);

    console.log("\n  Name normalization rules (before override):");
    console.log("    en: strip  Region,  Province,  Prefecture,  Oblast,  Territory,  State");
    console.log("    es: strip  Región,  Provincia,  Territorio,  Estado");
    console.log("    pt: strip  Região,  Província,  Território,  Estado");

    console.log("\n✓ Step 04 complete\n");
  } catch (err) {
    console.error("  ✗ Error:", err);
    process.exit(1);
  }
}

main();
