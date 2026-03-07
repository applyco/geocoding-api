import * as path from "path";
import { downloadFiles } from "./src/utils/download";

const DATA_DIR = path.join(import.meta.dirname || process.cwd(), "data", "raw");

const DOWNLOADS = [
  {
    url: "https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_0_countries.zip",
    filePath: path.join(DATA_DIR, "ne_10m_admin_0_countries.zip"),
    force: true,
  },
  {
    url: "https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_1_states_provinces.zip",
    filePath: path.join(DATA_DIR, "ne_10m_admin_1_states_provinces.zip"),
    force: true,
  },
  {
    url: "https://download.geonames.org/export/dump/cities1000.zip",
    filePath: path.join(DATA_DIR, "cities1000.zip"),
    force: true,
  },
  {
    url: "https://download.geonames.org/export/dump/admin1CodesASCII.txt",
    filePath: path.join(DATA_DIR, "admin1CodesASCII.txt"),
    force: true,
  },
  {
    url: "https://download.geonames.org/export/dump/alternateNamesV2.zip",
    filePath: path.join(DATA_DIR, "alternateNamesV2.zip"),
    force: true,
  },
  {
    url: "https://download.geonames.org/export/dump/countryInfo.txt",
    filePath: path.join(DATA_DIR, "countryInfo.txt"),
    force: true,
  },
];

console.log("📥 Forcing download of all data files...\n");
downloadFiles(DOWNLOADS)
  .then(() => {
    console.log("\n✓ All files downloaded successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("✗ Download failed:", err.message);
    process.exit(1);
  });
