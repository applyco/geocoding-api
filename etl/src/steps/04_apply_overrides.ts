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
 * Apply a set of overrides to features
 */
function applyOverridesToFeature(
  feature: any,
  overrides: Record<string, NameOverride> | undefined
): void {
  if (!overrides) return;

  const featureId = feature.properties?.feature_id || feature.id;
  const override = overrides[featureId];

  if (!override) return;

  // Update names
  if (!feature.properties.names) {
    feature.properties.names = {};
  }

  if (override.names) {
    feature.properties.names.es = override.names.es || feature.properties.names.es;
    feature.properties.names.en = override.names.en || feature.properties.names.en;
    feature.properties.names.pt = override.names.pt || feature.properties.names.pt;
  }

  // Update canonical if provided
  if (override.canonical) {
    feature.properties.canonical = override.canonical;
  }
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

    // Process each GeoJSON file
    const files = ["countries", "admin1", "zones", "cities"];
    let totalApplied = 0;

    for (const fileBase of files) {
      const filePath = path.join(PROCESSED_DATA_DIR, `${fileBase}.geojson`);
      if (!fs.existsSync(filePath)) {
        console.log(`  ⊘ ${fileBase}.geojson not found, skipping`);
        continue;
      }

      const geojson = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const overrides = overridesRaw[fileBase];

      if (!overrides || Object.keys(overrides).length === 0) {
        console.log(`  ${fileBase}.geojson: no overrides defined`);
        continue;
      }

      let applied = 0;
      for (const feature of geojson.features) {
        const before = feature.properties.canonical;
        applyOverridesToFeature(feature, overrides);
        const after = feature.properties.canonical;

        if (before !== after) {
          applied++;
        }
      }

      if (applied > 0) {
        fs.writeFileSync(filePath, JSON.stringify(geojson, null, 2));
        console.log(`  ✓ ${fileBase}.geojson: applied ${applied} overrides`);
        totalApplied += applied;
      }
    }

    // Also demonstrate name normalization
    console.log(`\n  Total overrides applied: ${totalApplied}`);
    console.log("\n  Name normalization rules (before override):");
    for (const [lang, suffixes] of Object.entries(SUFFIX_STRIP_PATTERNS)) {
      console.log(`    ${lang}: strip ${suffixes.join(", ")}`);
    }

    console.log("\n✓ Step 04 complete");
  } catch (err) {
    console.error("✗ Step 04 failed:", err);
    process.exit(1);
  }
}

main();
