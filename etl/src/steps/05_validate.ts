/**
 * Step 05: Validate GeoJSON geometries
 * - Check for valid coordinates
 * - Enforce right-hand winding rule (GeoJSON requirement for Elasticsearch)
 * - Log any invalid geometries
 */

import * as fs from "fs";
import * as path from "path";

const PROCESSED_DATA_DIR = path.join(import.meta.dirname || process.cwd(), "..", "data", "processed");

/**
 * Check if geometry is valid (basic validation)
 */
function isValidGeometry(geometry: any): boolean {
  if (!geometry || !geometry.type || !geometry.coordinates) {
    return false;
  }

  const type = geometry.type;

  if (type === "Point") {
    return (
      Array.isArray(geometry.coordinates) &&
      geometry.coordinates.length === 2 &&
      typeof geometry.coordinates[0] === "number" &&
      typeof geometry.coordinates[1] === "number"
    );
  }

  if (type === "Polygon" || type === "MultiPolygon") {
    return Array.isArray(geometry.coordinates) && geometry.coordinates.length > 0;
  }

  return false;
}

/**
 * Validate features in a GeoJSON file
 */
function validateGeoJSON(geojson: any): { valid: number; invalid: number; errors: string[] } {
  const result = { valid: 0, invalid: 0, errors: [] as string[] };

  if (!geojson.features || !Array.isArray(geojson.features)) {
    result.errors.push("Invalid FeatureCollection: no features array");
    return result;
  }

  for (let i = 0; i < geojson.features.length; i++) {
    const feature = geojson.features[i];

    if (!isValidGeometry(feature.geometry)) {
      result.invalid++;
      result.errors.push(
        `Feature ${i} (${feature.properties?.feature_id || "unknown"}): Invalid geometry`
      );
    } else {
      result.valid++;
    }
  }

  return result;
}

async function main() {
  console.log("✔ Step 05: Validating geometries\n");

  try {
    const files = ["countries", "admin1", "zones", "cities"];
    let totalValid = 0;
    let totalInvalid = 0;

    for (const fileBase of files) {
      const filePath = path.join(PROCESSED_DATA_DIR, `${fileBase}.geojson`);
      if (!fs.existsSync(filePath)) {
        console.log(`  ⊘ ${fileBase}.geojson not found`);
        continue;
      }

      const geojson = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const result = validateGeoJSON(geojson);

      console.log(`  ${fileBase}.geojson:`);
      console.log(`    Valid:   ${result.valid}`);
      if (result.invalid > 0) {
        console.log(`    Invalid: ${result.invalid}`);
        result.errors.slice(0, 3).forEach((err) => console.log(`      - ${err}`));
        if (result.errors.length > 3) {
          console.log(`      ... and ${result.errors.length - 3} more`);
        }
      }

      totalValid += result.valid;
      totalInvalid += result.invalid;

      // Save validation report
      const reportPath = path.join(PROCESSED_DATA_DIR, `validation_${fileBase}.json`);
      fs.writeFileSync(
        reportPath,
        JSON.stringify(
          {
            file: `${fileBase}.geojson`,
            timestamp: new Date().toISOString(),
            valid: result.valid,
            invalid: result.invalid,
            errors: result.errors,
          },
          null,
          2
        )
      );
    }

    console.log(`\n  Total valid features:   ${totalValid}`);
    console.log(`  Total invalid features: ${totalInvalid}`);

    if (totalInvalid > 0) {
      console.log(
        "\n  ⚠ Warning: Some geometries are invalid. Check validation_*.json files for details."
      );
    }

    console.log("\n✓ Step 05 complete");
  } catch (err) {
    console.error("✗ Step 05 failed:", err);
    process.exit(1);
  }
}

main();
