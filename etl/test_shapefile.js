import shapefile from "shapefile";
import fs from "fs";
import path from "path";

const shapefilePath = "data/raw/ne_10m_admin_0_countries.shp";

if (!fs.existsSync(shapefilePath)) {
  console.error("Shapefile not found:", shapefilePath);
  process.exit(1);
}

console.log("Opening shapefile:", shapefilePath);

try {
  const source = await shapefile.open(shapefilePath);
  console.log("Source type:", typeof source);
  console.log("Source keys:", Object.keys(source || {}));
  
  // Try reading first feature
  const result = await source.read();
  console.log("First read result:", JSON.stringify(result, null, 2).slice(0, 500));
  
} catch (err) {
  console.error("Error:", err.message);
}
