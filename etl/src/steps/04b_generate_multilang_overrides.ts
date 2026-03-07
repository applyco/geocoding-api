/**
 * Step 04b: Generate multilingual overrides from GeoNames alternateNames
 * Reads alternateNamesV2.txt and creates a complete overrides.yaml with es/en/pt names
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import * as yaml from "js-yaml";

const SCRIPT_DIR = import.meta.dirname || process.cwd();
const PROCESSED_DATA_DIR = path.resolve(SCRIPT_DIR, "..", "..", "data", "processed");
const RAW_DATA_DIR = path.resolve(SCRIPT_DIR, "..", "..", "data", "raw");
const OVERRIDES_FILE = path.resolve(SCRIPT_DIR, "..", "..", "data", "overrides.yaml");

// Map geonameid -> { es?, en?, pt? }
const namesByGeoId: Record<string, Record<string, string>> = {};

// Load countries.geojson and cities.geojson to get their IDs
function loadGeoIds() {
  const geoIds = new Set<number>();

  // Load country IDs
  const countriesPath = path.join(PROCESSED_DATA_DIR, "countries.geojson");
  if (fs.existsSync(countriesPath)) {
    const countries = JSON.parse(fs.readFileSync(countriesPath, "utf-8"));
    countries.features?.forEach((f: any) => {
      if (f.properties?.geonameid) {
        geoIds.add(f.properties.geonameid);
      }
    });
  }

  // Load admin1 IDs
  const admin1Path = path.join(PROCESSED_DATA_DIR, "admin1.geojson");
  if (fs.existsSync(admin1Path)) {
    const admin1 = JSON.parse(fs.readFileSync(admin1Path, "utf-8"));
    admin1.features?.forEach((f: any) => {
      if (f.properties?.geonameid) {
        geoIds.add(f.properties.geonameid);
      }
    });
  }

  // Load city IDs
  const citiesPath = path.join(PROCESSED_DATA_DIR, "cities.geojson");
  if (fs.existsSync(citiesPath)) {
    const cities = JSON.parse(fs.readFileSync(citiesPath, "utf-8"));
    cities.features?.forEach((f: any) => {
      if (f.properties?.geonameid) {
        geoIds.add(f.properties.geonameid);
      }
    });
  }

  return geoIds;
}

async function readAlternateNames(geoIds: Set<number>) {
  const alternateNamesPath = path.join(RAW_DATA_DIR, "alternateNamesV2.txt");

  if (!fs.existsSync(alternateNamesPath)) {
    console.log("  ⊘ alternateNamesV2.txt not found");
    return;
  }

  console.log("  📖 Reading alternateNamesV2.txt...");

  const rl = readline.createInterface({
    input: fs.createReadStream(alternateNamesPath),
    crlfDelay: Infinity,
  });

  let processed = 0;
  let found = 0;

  for await (const line of rl) {
    processed++;
    if (processed % 1000000 === 0) {
      process.stdout.write(`\r    Processed: ${processed.toLocaleString()} lines, Found: ${found.toLocaleString()}`);
    }

    const parts = line.split("\t");
    if (parts.length < 4) continue;

    const geonameid = parseInt(parts[1], 10);
    if (!geoIds.has(geonameid)) continue;

    const isolanguage = parts[2];
    const alternateName = parts[3];
    const isPreferred = parts[4] === "1";
    const isShort = parts[5] === "1";

    // Only use preferred/short names for es, en, pt
    if (!["es", "en", "pt"].includes(isolanguage)) continue;

    if (!namesByGeoId[geonameid]) {
      namesByGeoId[geonameid] = {};
    }

    // Prefer short names, then preferred names, then any name
    if (isShort || isPreferred || !namesByGeoId[geonameid][isolanguage]) {
      namesByGeoId[geonameid][isolanguage] = alternateName;
    }

    found++;
  }

  console.log(`\r    Processed: ${processed.toLocaleString()} lines, Found: ${found.toLocaleString()}`);
  console.log(`  ✓ Loaded ${found.toLocaleString()} multilingual names`);
}

function buildOverridesFromGeoJSON() {
  const overrides: Record<string, Record<string, any>> = {
    countries: {},
    admin1: {},
    cities: {},
    zones: {},
  };

  // Map of country ISO3 codes to Spanish names (common translations)
  const countrySpanish: Record<string, string> = {
    GRC: "Grecia",
    DEU: "Alemania",
    FRA: "Francia",
    ITA: "Italia",
    ESP: "España",
    PRT: "Portugal",
    POL: "Polonia",
    NLD: "Países Bajos",
    BEL: "Bélgica",
    CHE: "Suiza",
    AUT: "Austria",
    CZE: "Chequia",
    SVK: "Eslovaquia",
    HUN: "Hungría",
    ROU: "Rumania",
    BGR: "Bulgaria",
    HRV: "Croacia",
    SVN: "Eslovenia",
    SRB: "Serbia",
    GBR: "Reino Unido",
    IRL: "Irlanda",
    DNK: "Dinamarca",
    SWE: "Suecia",
    NOR: "Noruega",
    FIN: "Finlandia",
    RUS: "Rusia",
    UKR: "Ucrania",
    BLR: "Bielorrusia",
    POL: "Polonia",
    TUR: "Turquía",
    GEO: "Georgia",
    ARM: "Armenia",
    AZE: "Azerbaiyán",
    KAZ: "Kazajistán",
    UZB: "Uzbekistán",
    TJK: "Tayikistán",
    KGZ: "Kirguistán",
    MNG: "Mongolia",
    JPN: "Japón",
    KOR: "Corea del Sur",
    PRK: "Corea del Norte",
    CHN: "China",
    IND: "India",
    PAK: "Pakistán",
    BGD: "Bangladesh",
    THA: "Tailandia",
    VNM: "Vietnam",
    IDN: "Indonesia",
    MYS: "Malasia",
    SGP: "Singapur",
    PHL: "Filipinas",
    MMR: "Birmania",
    LAO: "Laos",
    KHM: "Camboya",
    BRN: "Brunéi",
    TLS: "Timor Oriental",
    AUS: "Australia",
    NZL: "Nueva Zelanda",
    FJI: "Fiyi",
    USA: "Estados Unidos",
    CAN: "Canadá",
    MEX: "México",
    BRA: "Brasil",
    ARG: "Argentina",
    CHL: "Chile",
    PER: "Perú",
    COL: "Colombia",
    VEN: "Venezuela",
    ECU: "Ecuador",
    BOL: "Bolivia",
    PRY: "Paraguay",
    URY: "Uruguay",
    GUY: "Guyana",
    SUR: "Surinam",
    GUF: "Guayana Francesa",
    ZAF: "Sudáfrica",
    EGY: "Egipto",
    NGA: "Nigeria",
    KEN: "Kenia",
    TZA: "Tanzania",
  };

  // Map of country ISO3 codes to Portuguese names (common translations)
  const countryPortuguese: Record<string, string> = {
    GRC: "Grécia",
    DEU: "Alemanha",
    FRA: "França",
    ITA: "Itália",
    ESP: "Espanha",
    PRT: "Portugal",
    POL: "Polônia",
    NLD: "Países Baixos",
    BEL: "Bélgica",
    CHE: "Suíça",
    AUT: "Áustria",
    CZE: "República Tcheca",
    SVK: "Eslováquia",
    HUN: "Hungria",
    ROU: "Romênia",
    BGR: "Bulgária",
    HRV: "Croácia",
    SVN: "Eslovênia",
    SRB: "Sérvia",
    GBR: "Reino Unido",
    IRL: "Irlanda",
    DNK: "Dinamarca",
    SWE: "Suécia",
    NOR: "Noruega",
    FIN: "Finlândia",
    RUS: "Rússia",
    UKR: "Ucrânia",
    BLR: "Bielorrússia",
    TUR: "Turquia",
    GEO: "Geórgia",
    ARM: "Armênia",
    AZE: "Azerbaijão",
    KAZ: "Cazaquistão",
    UZB: "Uzbequistão",
    TJK: "Tajiquistão",
    KGZ: "Quirguistão",
    MNG: "Mongólia",
    JPN: "Japão",
    KOR: "Coréia do Sul",
    PRK: "Coréia do Norte",
    CHN: "China",
    IND: "Índia",
    PAK: "Paquistão",
    BGD: "Bangladesh",
    THA: "Tailândia",
    VNM: "Vietnã",
    IDN: "Indonésia",
    MYS: "Malásia",
    SGP: "Singapura",
    PHL: "Filipinas",
    MMR: "Mianmar",
    LAO: "Laos",
    KHM: "Camboja",
    BRN: "Brunei",
    TLS: "Timor Leste",
    AUS: "Austrália",
    NZL: "Nova Zelândia",
    FJI: "Fiji",
    USA: "Estados Unidos",
    CAN: "Canadá",
    MEX: "México",
    BRA: "Brasil",
    ARG: "Argentina",
    CHL: "Chile",
    PER: "Peru",
    COL: "Colômbia",
    VEN: "Venezuela",
    ECU: "Equador",
    BOL: "Bolívia",
    PRY: "Paraguai",
    URY: "Uruguai",
    GUY: "Guiana",
    SUR: "Suriname",
    ZAF: "África do Sul",
    EGY: "Egito",
    NGA: "Nigéria",
    KEN: "Quênia",
    TZA: "Tanzânia",
  };

  // Process countries
  const countriesPath = path.join(PROCESSED_DATA_DIR, "countries.geojson");
  if (fs.existsSync(countriesPath)) {
    const countries = JSON.parse(fs.readFileSync(countriesPath, "utf-8"));
    countries.features?.forEach((f: any) => {
      const geoId = f.properties?.geonameid;
      const featureId = f.properties?.ISO_A3;
      if (!featureId) return;

      const names = namesByGeoId[geoId] || {};
      const canonical = names.en || f.properties?.name || "";

      // Use hardcoded translations if available, otherwise use namesByGeoId or canonical
      const es = names.es || countrySpanish[featureId] || canonical;
      const en = names.en || canonical;
      const pt = names.pt || countryPortuguese[featureId] || canonical;

      overrides.countries[featureId] = {
        names: {
          es,
          en,
          pt,
        },
        canonical: en,
      };
    });
  }

  // Process admin1
  const admin1Path = path.join(PROCESSED_DATA_DIR, "admin1.geojson");
  if (fs.existsSync(admin1Path)) {
    const admin1 = JSON.parse(fs.readFileSync(admin1Path, "utf-8"));
    admin1.features?.forEach((f: any) => {
      const geoId = f.properties?.geonameid;
      const featureId = f.properties?.admin1code;
      if (!featureId) return;

      const names = namesByGeoId[geoId] || {};
      const canonical = names.en || f.properties?.name || "";

      overrides.admin1[featureId] = {
        names: {
          es: names.es || "",
          en: names.en || canonical,
          pt: names.pt || "",
        },
        canonical,
      };
    });
  }

  // Process cities
  const citiesPath = path.join(PROCESSED_DATA_DIR, "cities.geojson");
  if (fs.existsSync(citiesPath)) {
    const cities = JSON.parse(fs.readFileSync(citiesPath, "utf-8"));
    cities.features?.forEach((f: any) => {
      const geoId = f.properties?.geonameid;
      if (!geoId) return;

      const names = namesByGeoId[geoId] || {};
      const canonical = names.en || f.properties?.name || "";

      overrides.cities[geoId.toString()] = {
        names: {
          es: names.es || "",
          en: names.en || canonical,
          pt: names.pt || "",
        },
        canonical,
      };
    });
  }

  return overrides;
}

async function main() {
  console.log("\n🌍 Step 04b: Generating multilingual overrides from GeoNames\n");

  try {
    // Load IDs of features to process
    console.log("  Loading feature IDs...");
    const geoIds = loadGeoIds();
    console.log(`  ✓ Found ${geoIds.size.toLocaleString()} features to match`);

    // Read alternate names
    await readAlternateNames(geoIds);

    // Build overrides from GeoJSON
    console.log("\n  Building overrides structure...");
    const overrides = buildOverridesFromGeoJSON();

    console.log(
      `  ✓ Generated overrides:\n` +
        `    - Countries: ${Object.keys(overrides.countries).length}\n` +
        `    - Admin1: ${Object.keys(overrides.admin1).length}\n` +
        `    - Cities: ${Object.keys(overrides.cities).length}`
    );

    // Write overrides.yaml
    const overridesYaml = yaml.dump(overrides, {
      indent: 2,
      lineWidth: 120,
      quotes: "single",
      sortKeys: false,
    });

    fs.writeFileSync(OVERRIDES_FILE, overridesYaml, "utf-8");
    console.log(`\n  ✓ Written overrides.yaml (${(overridesYaml.length / 1024 / 1024).toFixed(2)} MB)`);

    console.log("\n✓ Step 04b complete\n");
  } catch (err) {
    console.error("  ✗ Error:", err);
    process.exit(1);
  }
}

main();
