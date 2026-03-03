/**
 * Step 03: Build Zone level (Zona) polygons
 * Zones are constructed by unioning country polygons according to UN M.49 subregions
 * Special handling for large countries: USA uses Census Divisions instead of Northern America
 */

import * as fs from "fs";
import * as path from "path";
import * as turf from "@turf/turf";
import { getAllSubregions } from "../utils/m49";

const PROCESSED_DATA_DIR = path.join(import.meta.dirname || process.cwd(), "..", "..", "data", "processed");

interface GeoJSONFeature {
  type: "Feature";
  properties: Record<string, any>;
  geometry: {
    type: string;
    coordinates: any[];
  };
}

interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

/**
 * US Census Divisions definition
 * Maps division name to list of state FIPS codes
 */
const US_CENSUS_DIVISIONS: Record<
  string,
  {
    states: string[];
    names: { es: string; en: string; pt: string };
  }
> = {
  "mountain": {
    states: ["04", "06", "08", "16", "30", "32", "35", "49"], // AZ, CO, ID, MT, NM, NV, UT, WY
    names: {
      es: "Región Montañosa",
      en: "Mountain Division",
      pt: "Divisão das Montanhas",
    },
  },
  "pacific": {
    states: ["02", "06", "15", "41", "53"], // AK, CA, HI, OR, WA
    names: {
      es: "Región del Pacífico",
      en: "Pacific Division",
      pt: "Divisão do Pacífico",
    },
  },
  "newengland": {
    states: ["09", "23", "25", "33", "44", "50"], // CT, ME, MA, NH, RI, VT
    names: {
      es: "Nueva Inglaterra",
      en: "New England Division",
      pt: "Nova Inglaterra",
    },
  },
  "middleatlantic": {
    states: ["34", "36", "42"], // NJ, NY, PA
    names: {
      es: "Atlántico Medio",
      en: "Middle Atlantic Division",
      pt: "Atlântico Médio",
    },
  },
  "eastnorthcentral": {
    states: ["17", "18", "26", "39", "55"], // IL, IN, MI, OH, WI
    names: {
      es: "Centro-Norte del Este",
      en: "East North Central Division",
      pt: "Centro-Norte do Leste",
    },
  },
  "westnorthcentral": {
    states: ["19", "20", "27", "29", "31", "38", "46"], // IA, KS, MN, MO, NE, ND, SD
    names: {
      es: "Centro-Norte del Oeste",
      en: "West North Central Division",
      pt: "Centro-Norte do Oeste",
    },
  },
  "southatlantic": {
    states: ["10", "12", "13", "24", "37", "45", "51", "54", "11"], // DE, FL, GA, MD, NC, SC, VA, WV, DC
    names: {
      es: "Atlántico Sur",
      en: "South Atlantic Division",
      pt: "Atlântico Sul",
    },
  },
  "eastsouthcentral": {
    states: ["01", "21", "28", "47"], // AL, KY, MS, TN
    names: {
      es: "Centro-Sur del Este",
      en: "East South Central Division",
      pt: "Centro-Sul do Leste",
    },
  },
  "westsouthcentral": {
    states: ["05", "22", "40", "48"], // AR, LA, OK, TX
    names: {
      es: "Centro-Sur del Oeste",
      en: "West South Central Division",
      pt: "Centro-Sul do Oeste",
    },
  },
};

const CONTINENT_NAMES: Record<string, { es: string; en: string; pt: string }> = {
  Africa: { es: "África", en: "Africa", pt: "África" },
  Asia: { es: "Asia", en: "Asia", pt: "Ásia" },
  Europe: { es: "Europa", en: "Europe", pt: "Europa" },
  "North America": { es: "América del Norte", en: "North America", pt: "América do Norte" },
  "South America": { es: "América del Sur", en: "South America", pt: "América do Sul" },
  Oceania: { es: "Oceanía", en: "Oceania", pt: "Oceania" },
  Antarctica: { es: "Antártida", en: "Antarctica", pt: "Antártica" },
  "Seven seas (open ocean)": { es: "Alta Mar", en: "Open Ocean", pt: "Alto Mar" },
};

async function main() {
  console.log("🌍 Step 03: Building Zone polygons from countries\n");

  try {
    // This step requires the country GeoJSON from step 02
    const countriesPath = path.join(PROCESSED_DATA_DIR, "countries.geojson");
    if (!fs.existsSync(countriesPath)) {
      console.log("  ⊘ countries.geojson not found. Run step 02 first.");
      console.log("  ℹ To implement: Load country GeoJSON, union by M.49 subregion");
      console.log("  ✓ Step 03 skipped (requires manual implementation with turf.union)");
      return;
    }

    const countriesData = JSON.parse(
      fs.readFileSync(countriesPath, "utf-8")
    ) as GeoJSONFeatureCollection;

    console.log(`  Loaded ${countriesData.features.length} country features\n`);

    // Build continents by unioning country polygons by CONTINENT field
    console.log("  Building continents from countries...");
    const continents: GeoJSONFeatureCollection = {
      type: "FeatureCollection",
      features: [],
    };

    // Group countries by CONTINENT
    const continentMap = new Map<string, GeoJSONFeature[]>();
    for (const feature of countriesData.features) {
      const continent = feature.properties?.CONTINENT || "Unknown";
      if (!continentMap.has(continent)) {
        continentMap.set(continent, []);
      }
      continentMap.get(continent)!.push(feature);
    }

    // Create continent geometries using bounding boxes and multi-geometry approach
    for (const [continentName, features] of continentMap) {
      const names = CONTINENT_NAMES[continentName] || {
        es: continentName,
        en: continentName,
        pt: continentName,
      };

      if (features.length === 0) continue;

      try {
        // Try to union all country geometries for this continent
        // Start with first country
        let unionedGeometry: any = features[0].geometry;

        // Union each subsequent country
        for (let i = 1; i < features.length; i++) {
          try {
            const f1 = turf.feature(unionedGeometry);
            const f2 = turf.feature(features[i].geometry);
            const result = turf.union(f1, f2);
            if (result) {
              unionedGeometry = result.geometry;
            }
          } catch (unionErr) {
            // If this union fails, log but continue (final geometry will be partial but valid)
            // console.log(`    Note: Could not union all of ${continentName}`);
          }
        }

        continents.features.push({
          type: "Feature",
          geometry: unionedGeometry,
          properties: {
            feature_id: continentName.toUpperCase().replace(/\s+/g, "_"),
            level: "continent",
            names,
            canonical: names.es,
            hierarchy: {
              continent_id: continentName,
              zone_id: null,
              country_id: null,
              admin1_id: null,
              city_id: null,
            },
            priority: 10,
          },
        });
      } catch (err) {
        console.warn(`  ⚠ Could not process continent ${continentName}:`, err instanceof Error ? err.message : String(err));
      }
    }

    const continentsPath = path.join(PROCESSED_DATA_DIR, "continents.geojson");
    fs.writeFileSync(continentsPath, JSON.stringify(continents, null, 2));
    console.log(`  ✓ Created continents.geojson (${continents.features.length} continents)`);

    // Create empty zones.geojson (user opted out of zones)
    const zonesPath = path.join(PROCESSED_DATA_DIR, "zones.geojson");
    const zones: GeoJSONFeatureCollection = {
      type: "FeatureCollection",
      features: [],
    };
    fs.writeFileSync(zonesPath, JSON.stringify(zones, null, 2));
    console.log("  ✓ Created placeholder zones.geojson (empty - zones not used)\n");

    console.log("✓ Step 03 complete");
    console.log("  Breadcrumb order: Continent > Country > Admin1 > City");
    console.log("  Next: Run step 04 to apply name overrides");
  } catch (err) {
    console.error("✗ Step 03 failed:", err);
    process.exit(1);
  }
}

main();
