/**
 * Elasticsearch client for Cloudflare Workers
 * Uses raw fetch() since @elastic/elasticsearch requires Node.js
 */

import type { Env, GeoFeature, ESResponse } from "../types";

const INDICES = ["continents", "zones", "countries", "admin1", "cities"] as const;

// ISO 2-letter to 3-letter country code mapping (GeoNames to Natural Earth)
const ISO2_TO_ISO3: Record<string, string> = {
  "AD": "AND", "AE": "ARE", "AF": "AFG", "AG": "ATG", "AI": "AIA",
  "AL": "ALB", "AM": "ARM", "AO": "AGO", "AQ": "ATA", "AR": "ARG",
  "AS": "ASM", "AT": "AUT", "AU": "AUS", "AW": "ABW", "AX": "ALA",
  "AZ": "AZE", "BA": "BIH", "BB": "BRB", "BD": "BGD", "BE": "BEL",
  "BF": "BFA", "BG": "BGR", "BH": "BHR", "BI": "BDI", "BJ": "BEN",
  "BL": "BLM", "BM": "BMU", "BN": "BRN", "BO": "BOL", "BQ": "BES",
  "BR": "BRA", "BS": "BHS", "BT": "BTN", "BV": "BVT", "BW": "BWA",
  "BY": "BLR", "BZ": "BLZ", "CA": "CAN", "CC": "CCK", "CD": "COD",
  "CF": "CAF", "CG": "COG", "CH": "CHE", "CI": "CIV", "CK": "COK",
  "CL": "CHL", "CM": "CMR", "CN": "CHN", "CO": "COL", "CR": "CRI",
  "CU": "CUB", "CV": "CPV", "CW": "CUW", "CX": "CXR", "CY": "CYP",
  "CZ": "CZE", "DE": "DEU", "DJ": "DJI", "DK": "DNK", "DM": "DMA",
  "DO": "DOM", "DZ": "DZA", "EC": "ECU", "EE": "EST", "EG": "EGY",
  "EH": "ESH", "ER": "ERI", "ES": "ESP", "ET": "ETH", "FI": "FIN",
  "FJ": "FJI", "FK": "FLK", "FM": "FSM", "FO": "FRO", "FR": "FRA",
  "GA": "GAB", "GB": "GBR", "GD": "GRD", "GE": "GEO", "GF": "GUF",
  "GG": "GGY", "GH": "GHA", "GI": "GIB", "GL": "GRL", "GM": "GMB",
  "GN": "GIN", "GP": "GLP", "GQ": "GNQ", "GR": "GRC", "GS": "SGS",
  "GT": "GTM", "GU": "GUM", "GW": "GNB", "GY": "GUY", "HK": "HKG",
  "HM": "HMD", "HN": "HND", "HR": "HRV", "HT": "HTI", "HU": "HUN",
  "ID": "IDN", "IE": "IRL", "IL": "ISR", "IM": "IMN", "IN": "IND",
  "IO": "IOT", "IQ": "IRQ", "IR": "IRN", "IS": "ISL", "IT": "ITA",
  "JE": "JEY", "JM": "JAM", "JO": "JOR", "JP": "JPN", "KE": "KEN",
  "KG": "KGZ", "KH": "KHM", "KI": "KIR", "KM": "COM", "KN": "KNA",
  "KP": "PRK", "KR": "KOR", "KW": "KWT", "KY": "CYM", "KZ": "KAZ",
  "LA": "LAO", "LB": "LBN", "LC": "LCA", "LI": "LIE", "LK": "LKA",
  "LR": "LBR", "LS": "LSO", "LT": "LTU", "LU": "LUX", "LV": "LVA",
  "LY": "LBY", "MA": "MAR", "MC": "MCO", "MD": "MDA", "ME": "MNE",
  "MF": "MAF", "MG": "MDG", "MH": "MHL", "MK": "MKD", "ML": "MLI",
  "MM": "MMR", "MN": "MNG", "MO": "MAC", "MP": "MNP", "MQ": "MTQ",
  "MR": "MRT", "MS": "MSR", "MT": "MLT", "MU": "MUS", "MV": "MDV",
  "MW": "MWI", "MX": "MEX", "MY": "MYS", "MZ": "MOZ", "NA": "NAM",
  "NC": "NCL", "NE": "NER", "NF": "NFK", "NG": "NGA", "NI": "NIC",
  "NL": "NLD", "NO": "NOR", "NP": "NPL", "NR": "NRU", "NU": "NIU",
  "NZ": "NZL", "OM": "OMN", "PA": "PAN", "PE": "PER", "PF": "PYF",
  "PG": "PNG", "PH": "PHL", "PK": "PAK", "PL": "POL", "PM": "SPM",
  "PN": "PCN", "PR": "PRI", "PS": "PSE", "PT": "PRT", "PW": "PLW",
  "PY": "PRY", "QA": "QAT", "RE": "REU", "RO": "ROU", "RS": "SRB",
  "RU": "RUS", "RW": "RWA", "SA": "SAU", "SB": "SLB", "SC": "SYC",
  "SD": "SDN", "SE": "SWE", "SG": "SGP", "SH": "SHN", "SI": "SVN",
  "SJ": "SJM", "SK": "SVK", "SL": "SLE", "SM": "SMR", "SN": "SEN",
  "SO": "SOM", "SR": "SUR", "SS": "SSD", "ST": "STP", "SV": "SLV",
  "SX": "SXM", "SY": "SYR", "SZ": "SWZ", "TC": "TCA", "TD": "TCD",
  "TF": "ATF", "TG": "TGO", "TH": "THA", "TJ": "TJK", "TK": "TKL",
  "TL": "TLS", "TM": "TKM", "TN": "TUN", "TO": "TON", "TR": "TUR",
  "TT": "TTO", "TV": "TUV", "TW": "TWN", "TZ": "TZA", "UA": "UKR",
  "UG": "UGA", "UM": "UMI", "US": "USA", "UY": "URY", "UZ": "UZB",
  "VA": "VAT", "VC": "VCT", "VE": "VEN", "VG": "VGB", "VI": "VIR",
  "VN": "VNM", "VU": "VUT", "WF": "WLF", "WS": "WSM", "YE": "YEM",
  "YT": "MYT", "ZA": "ZAF", "ZM": "ZMB", "ZW": "ZWE"
};

/**
 * Build point-in-polygon query for geo_shape
 */
function buildPointInPolygonQuery(lat: number, lon: number) {
  return {
    query: {
      geo_shape: {
        boundary: {
          shape: {
            type: "point",
            coordinates: [lon, lat], // GeoJSON: [longitude, latitude]
          },
          relation: "contains",
        },
      },
    },
    _source: ["feature_id", "level", "names", "canonical", "hierarchy", "priority"],
    size: 1,
    sort: [{ priority: { order: "asc" } }],
  };
}

/**
 * Build geo_distance query for cities (nearest N km)
 */
function buildGeoDistanceQuery(lat: number, lon: number, distance: string = "10km") {
  return {
    query: {
      geo_distance: {
        distance,
        centroid: {
          lat,
          lon,
        },
      },
    },
    sort: [
      {
        _geo_distance: {
          centroid: { lat, lon },
          order: "asc",
        },
      },
      { population: { order: "desc" } },
    ],
    _source: ["feature_id", "level", "names", "canonical", "hierarchy", "priority", "country_code", "admin1_code"],
    size: 1,
  };
}

/**
 * Build authorization header (supports both API Key and Basic Auth)
 */
function buildAuthHeader(env: Env): string {
  // Try API Key first
  if (env.ES_API_KEY) {
    return `ApiKey ${env.ES_API_KEY}`;
  }

  // Fall back to Basic Auth
  const username = (env as any).ES_USERNAME || "elastic";
  const password = (env as any).ES_PASSWORD || "";

  if (!password) {
    throw new Error(
      "Elasticsearch authentication missing. Set either ES_API_KEY or (ES_USERNAME + ES_PASSWORD)"
    );
  }

  const credentials = btoa(`${username}:${password}`);
  return `Basic ${credentials}`;
}

/**
 * Query all hierarchy levels using _msearch
 * Returns features from all levels that contain the point
 */
export async function queryAllLevels(env: Env, lat: number, lon: number): Promise<GeoFeature[]> {
  const esUrl = env.ES_URL;
  const prefix = env.ES_INDEX_PREFIX || "geo_";

  if (!esUrl) {
    throw new Error("Elasticsearch configuration missing (ES_URL)");
  }

  // Build _msearch body: alternating header + query lines (NDJSON format)
  // Each search header and body on separate lines, final line is newline
  const msearchLines: string[] = [];

  // Add queries for polygon-based levels (continents, zones, countries, admin1)
  for (const indexType of ["continents", "zones", "countries", "admin1"]) {
    msearchLines.push(JSON.stringify({ index: `${prefix}${indexType}` }));
    msearchLines.push(JSON.stringify(buildPointInPolygonQuery(lat, lon)));
  }

  // Add query for city level (uses geo_distance, not geo_shape)
  msearchLines.push(JSON.stringify({ index: `${prefix}cities` }));
  msearchLines.push(JSON.stringify(buildGeoDistanceQuery(lat, lon)));

  const body = msearchLines.join("\n") + "\n";

  try {
    const authHeader = buildAuthHeader(env);
    const response = await fetch(`${esUrl}/_msearch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-ndjson",
        Authorization: authHeader,
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Elasticsearch _msearch failed: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as ESResponse;

    // Flatten results from all index queries
    const features: GeoFeature[] = [];

    if (data.responses) {
      for (const responseItem of data.responses) {
        if (responseItem.error) {
          // Log error but continue with other results
          console.warn("ES query error:", responseItem.error);
          continue;
        }

        if (responseItem.hits?.hits && responseItem.hits.hits.length > 0) {
          for (const hit of responseItem.hits.hits) {
            features.push(hit._source as GeoFeature);
          }
        }
      }
    }

    return features;
  } catch (err) {
    console.error("Elasticsearch query error:", err);
    throw err;
  }
}

/**
 * Query country by ISO code (fallback for boundary gap cases)
 * Converts 2-letter ISO code (from GeoNames) to 3-letter code (in Elasticsearch)
 */
export async function queryCountryByCode(
  env: Env,
  countryCode: string
): Promise<GeoFeature | null> {
  const esUrl = env.ES_URL;
  const prefix = env.ES_INDEX_PREFIX || "geo_";

  if (!esUrl) {
    throw new Error("Elasticsearch configuration missing (ES_URL)");
  }

  // Convert 2-letter code to 3-letter code if needed
  const iso3Code = ISO2_TO_ISO3[countryCode] || countryCode;

  try {
    const authHeader = buildAuthHeader(env);
    const response = await fetch(`${esUrl}/${prefix}countries/_search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        query: {
          term: {
            feature_id: iso3Code,
          },
        },
        _source: ["feature_id", "level", "names", "canonical", "hierarchy", "priority"],
        size: 1,
      }),
    });

    if (!response.ok) {
      console.warn(`Country code lookup failed: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as any;
    if (data.hits?.hits?.[0]) {
      return data.hits.hits[0]._source as GeoFeature;
    }

    return null;
  } catch (err) {
    console.warn(`Error querying country by code ${countryCode}:`, err);
    return null;
  }
}

/**
 * Fallback city query with custom distance
 * Used when initial query with 10km returns no city
 */
export async function queryCityFallback(env: Env, lat: number, lon: number, distance: string = "25km"): Promise<GeoFeature | null> {
  const esUrl = env.ES_URL;
  const prefix = env.ES_INDEX_PREFIX || "geo_";

  if (!esUrl) {
    throw new Error("Elasticsearch configuration missing (ES_URL)");
  }

  try {
    const authHeader = buildAuthHeader(env);
    const query = buildGeoDistanceQuery(lat, lon, distance);

    const response = await fetch(`${esUrl}/${prefix}cities/_search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(query),
    });

    if (!response.ok) {
      console.warn(`City fallback query failed: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as any;
    if (data.hits?.hits?.[0]) {
      return data.hits.hits[0]._source as GeoFeature;
    }

    return null;
  } catch (err) {
    console.warn(`Error querying city fallback (${distance}):`, err);
    return null;
  }
}

/**
 * Health check query - returns full health info
 */
export async function checkElasticsearchHealth(env: Env): Promise<{ ok: boolean; health?: any; error?: string }> {
  try {
    const esUrl = env.ES_URL;

    if (!esUrl) {
      return { ok: false, error: "ES_URL not configured" };
    }

    const authHeader = buildAuthHeader(env);
    const response = await fetch(`${esUrl}/_cluster/health`, {
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }

    const health = await response.json();
    return { ok: true, health };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
