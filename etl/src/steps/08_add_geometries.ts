/**
 * Add geometries to indexed documents for geo_shape queries
 */

import { getESClient } from "../es/client";

const client = getESClient();

async function addGeometries() {
  console.log("🗺️  Adding geometries to indexed documents\n");

  // Approximate boundaries (simplified rectangles for testing)
  const geometries = [
    // New Zealand continent/zone/country
    {
      indices: ["geo_continents"],
      ids: ["OC"],
      boundary: {
        type: "MultiPolygon",
        coordinates: [
          [[[110, -10], [180, -10], [180, -50], [110, -50], [110, -10]]]
        ],
      },
    },
    {
      indices: ["geo_zones"],
      ids: ["m49-053"],
      boundary: {
        type: "MultiPolygon",
        coordinates: [
          [[[110, -10], [180, -10], [180, -50], [110, -50], [110, -10]]]
        ],
      },
    },
    {
      indices: ["geo_countries"],
      ids: ["NZL"],
      boundary: {
        type: "MultiPolygon",
        coordinates: [
          [[[166, -34], [178, -34], [178, -47], [166, -47], [166, -34]]]
        ],
      },
    },
    {
      indices: ["geo_admin1"],
      ids: ["NZ-CAN"],
      boundary: {
        type: "MultiPolygon",
        coordinates: [
          [[[170, -43], [173, -43], [173, -45], [170, -45], [170, -43]]]
        ],
      },
    },

    // USA continent/zone/country/admin1
    {
      indices: ["geo_continents"],
      ids: ["NA"],
      boundary: {
        type: "MultiPolygon",
        coordinates: [
          [[[-170, 15], [-50, 15], [-50, 75], [-170, 75], [-170, 15]]]
        ],
      },
    },
    {
      indices: ["geo_zones"],
      ids: ["m49-021"],
      boundary: {
        type: "MultiPolygon",
        coordinates: [
          [[[-170, 15], [-50, 15], [-50, 75], [-170, 75], [-170, 15]]]
        ],
      },
    },
    {
      indices: ["geo_countries"],
      ids: ["USA"],
      boundary: {
        type: "MultiPolygon",
        coordinates: [
          [[[-125, 24], [-66, 24], [-66, 49], [-125, 49], [-125, 24]]]
        ],
      },
    },
    {
      indices: ["geo_admin1"],
      ids: ["US-AZ"],
      boundary: {
        type: "MultiPolygon",
        coordinates: [
          [[[-114.8, 31.3], [-109.0, 31.3], [-109.0, 37.0], [-114.8, 37.0], [-114.8, 31.3]]]
        ],
      },
    },

    // Brazil continent/zone/country/admin1
    {
      indices: ["geo_continents"],
      ids: ["SA"],
      boundary: {
        type: "MultiPolygon",
        coordinates: [
          [[[-82, -56], [-30, -56], [-30, 13], [-82, 13], [-82, -56]]]
        ],
      },
    },
    {
      indices: ["geo_zones"],
      ids: ["m49-005"],
      boundary: {
        type: "MultiPolygon",
        coordinates: [
          [[[-82, -56], [-30, -56], [-30, 13], [-82, 13], [-82, -56]]]
        ],
      },
    },
    {
      indices: ["geo_countries"],
      ids: ["BRA"],
      boundary: {
        type: "MultiPolygon",
        coordinates: [
          [[[-74, -33], [-29, -33], [-29, 5], [-74, 5], [-74, -33]]]
        ],
      },
    },
    {
      indices: ["geo_admin1"],
      ids: ["BR-MG"],
      boundary: {
        type: "MultiPolygon",
        coordinates: [
          [[[-48.6, -22.5], [-39.5, -22.5], [-39.5, -14.8], [-48.6, -14.8], [-48.6, -22.5]]]
        ],
      },
    },
  ];

  let updated = 0;
  for (const { indices, ids, boundary } of geometries) {
    for (const index of indices) {
      for (const id of ids) {
        try {
          await client.update({
            index,
            id,
            body: { doc: { boundary } },
            retry_on_conflict: 3,
          });
          updated++;
          console.log(`  ✓ Added geometry to ${index}/${id}`);
        } catch (e: any) {
          console.error(`  ✗ Error updating ${index}/${id}:`, e.message);
        }
      }
    }
  }

  // Refresh indices
  console.log(`\n✅ Updated ${updated} documents with geometries`);
  console.log("\n🔄 Refreshing indices...");
  try {
    await client.indices.refresh({ index: "geo_*" });
    console.log("  ✓ Indices refreshed");
  } catch (e: any) {
    console.error("  ✗ Error refreshing indices:", e.message);
  }
}

addGeometries().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
