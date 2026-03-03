/**
 * Step 01: Download data files from online sources
 * Natural Earth + GeoNames
 */

import * as path from "path";
import { downloadFiles, verifyFile } from "../utils/download";

const DATA_DIR = path.join(import.meta.dirname || process.cwd(), "..", "data", "raw");

const DOWNLOADS = [
  {
    name: "Natural Earth Admin-0 Countries",
    url: "https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_0_countries.zip",
    filePath: path.join(DATA_DIR, "ne_10m_admin_0_countries.zip"),
  },
  {
    name: "Natural Earth Admin-1 States/Provinces",
    url: "https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_1_states_provinces.zip",
    filePath: path.join(DATA_DIR, "ne_10m_admin_1_states_provinces.zip"),
  },
  {
    name: "GeoNames Cities (population >= 1000)",
    url: "https://download.geonames.org/export/dump/cities1000.zip",
    filePath: path.join(DATA_DIR, "cities1000.zip"),
  },
  {
    name: "GeoNames Admin1 Codes",
    url: "https://download.geonames.org/export/dump/admin1CodesASCII.txt",
    filePath: path.join(DATA_DIR, "admin1CodesASCII.txt"),
  },
  {
    name: "GeoNames Alternate Names",
    url: "https://download.geonames.org/export/dump/alternateNamesV2.zip",
    filePath: path.join(DATA_DIR, "alternateNamesV2.zip"),
  },
  {
    name: "GeoNames Country Info",
    url: "https://download.geonames.org/export/dump/countryInfo.txt",
    filePath: path.join(DATA_DIR, "countryInfo.txt"),
  },
];

async function main() {
  console.log("📥 Step 01: Downloading data files\n");

  try {
    const downloadOptions = DOWNLOADS.map((dl) => ({
      url: dl.url,
      filePath: dl.filePath,
      force: false,
    }));

    await downloadFiles(downloadOptions);

    console.log("\n✓ All downloads completed\n");

    // Verify critical files
    console.log("Verifying downloads...");
    for (const dl of DOWNLOADS) {
      if (verifyFile(dl.filePath)) {
        console.log(`  ✓ ${dl.name}`);
      }
    }

    console.log("\n✓ Step 01 complete");
  } catch (err) {
    console.error("✗ Step 01 failed:", err);
    process.exit(1);
  }
}

main();
