/**
 * UN M.49 Geographic regions and subregions
 * Used to build the "Zona" level of the hierarchy
 */

import type { UN_M49_Region } from "../../shared/types";

/**
 * UN M.49 subregions mapping
 * Source: https://unstats.un.org/unsd/methodology/m49/
 */
export const UN_M49_SUBREGIONS: Record<string, UN_M49_Region> = {
  // Africa
  "002": {
    code: "002",
    name_en: "Africa",
    name_es: "África",
    name_pt: "África",
    type: "region",
  },
  "015": {
    code: "015",
    name_en: "Northern Africa",
    name_es: "África Septentrional",
    name_pt: "África Setentrional",
    parent: "002",
    type: "subregion",
    members: ["DZA", "EGY", "LBY", "MAR", "SDN", "TUN", "ESH"],
  },
  "011": {
    code: "011",
    name_en: "Western Africa",
    name_es: "África Occidental",
    name_pt: "África Ocidental",
    parent: "002",
    type: "subregion",
    members: ["BEN", "BFA", "CPV", "CIV", "GMB", "GHA", "GIN", "GNB", "LBR", "MLI", "MRT", "NER", "NGA", "SHN", "SLE", "SEN", "TGO"],
  },
  "017": {
    code: "017",
    name_en: "Middle Africa",
    name_es: "África Central",
    name_pt: "África Central",
    parent: "002",
    type: "subregion",
    members: ["AGO", "CMR", "CAF", "TCD", "COD", "COG", "GNQ", "GAB", "STP"],
  },
  "014": {
    code: "014",
    name_en: "Eastern Africa",
    name_es: "África Oriental",
    name_pt: "África Oriental",
    parent: "002",
    type: "subregion",
    members: ["BDI", "COM", "DJI", "ERI", "ETH", "KEN", "MDG", "MWI", "MUS", "MOZ", "RWA", "SOM", "SSD", "TZA", "UGA", "ZMB", "ZWE"],
  },
  "018": {
    code: "018",
    name_en: "Southern Africa",
    name_es: "África Meridional",
    name_pt: "África Meridional",
    parent: "002",
    type: "subregion",
    members: ["BWA", "LSO", "NAM", "SWZ", "ZAF"],
  },

  // Americas
  "019": {
    code: "019",
    name_en: "Americas",
    name_es: "Américas",
    name_pt: "Américas",
    type: "region",
  },
  "021": {
    code: "021",
    name_en: "Northern America",
    name_es: "América Septentrional",
    name_pt: "América do Norte",
    parent: "019",
    type: "subregion",
    members: ["BMU", "CAN", "GRL", "SPM", "USA"],
  },
  "013": {
    code: "013",
    name_en: "Central America",
    name_es: "América Central",
    name_pt: "América Central",
    parent: "019",
    type: "subregion",
    members: ["BLZ", "CRI", "SLV", "GTM", "HND", "NIC", "PAN"],
  },
  "029": {
    code: "029",
    name_en: "Caribbean",
    name_es: "Caribe",
    name_pt: "Caraíbas",
    parent: "019",
    type: "subregion",
    members: ["ATG", "BHS", "BRB", "CUB", "DMA", "DOM", "GRD", "HTI", "JAM", "KNA", "LCA", "VCT", "TTO"],
  },
  "005": {
    code: "005",
    name_en: "South America",
    name_es: "América del Sur",
    name_pt: "América do Sul",
    parent: "019",
    type: "subregion",
    members: ["ARG", "BOL", "BRA", "CHL", "COL", "ECU", "GUY", "PRY", "PER", "SUR", "URY", "VEN"],
  },

  // Asia
  "142": {
    code: "142",
    name_en: "Asia",
    name_es: "Asia",
    name_pt: "Ásia",
    type: "region",
  },
  "143": {
    code: "143",
    name_en: "Central Asia",
    name_es: "Asia Central",
    name_pt: "Ásia Central",
    parent: "142",
    type: "subregion",
    members: ["KAZ", "KGZ", "TJK", "TKM", "UZB"],
  },
  "030": {
    code: "030",
    name_en: "Eastern Asia",
    name_es: "Asia Oriental",
    name_pt: "Ásia Oriental",
    parent: "142",
    type: "subregion",
    members: ["CHN", "HKG", "JPN", "MAC", "MNG", "PRK", "KOR", "TWN"],
  },
  "035": {
    code: "035",
    name_en: "South-Eastern Asia",
    name_es: "Asia Sudoriental",
    name_pt: "Sudeste Asiático",
    parent: "142",
    type: "subregion",
    members: ["BRN", "KHM", "IDN", "LAO", "MYS", "MMR", "PHL", "SGP", "TLS", "THA", "VNM"],
  },
  "034": {
    code: "034",
    name_en: "Southern Asia",
    name_es: "Asia Meridional",
    name_pt: "Ásia Meridional",
    parent: "142",
    type: "subregion",
    members: ["AFG", "BGD", "BTN", "IND", "IRN", "MDV", "NPL", "PAK", "LKA"],
  },
  "145": {
    code: "145",
    name_en: "Western Asia",
    name_es: "Asia Occidental",
    name_pt: "Ásia Ocidental",
    parent: "142",
    type: "subregion",
    members: ["ARM", "AZE", "BHR", "CYP", "GEO", "IRQ", "ISR", "JOR", "KWT", "LBN", "OMN", "QAT", "SAU", "PSE", "SYR", "TUR", "ARE", "YEM"],
  },

  // Europe
  "150": {
    code: "150",
    name_en: "Europe",
    name_es: "Europa",
    name_pt: "Europa",
    type: "region",
  },
  "154": {
    code: "154",
    name_en: "Northern Europe",
    name_es: "Europa Septentrional",
    name_pt: "Europa Setentrional",
    parent: "150",
    type: "subregion",
    members: ["ALB", "BIH", "BGR", "HRV", "CZE", "DNK", "EST", "FIN", "FRA", "DEU", "GRC", "HUN", "ISL", "IRL", "ITA", "XKX", "LVA", "LIE", "LTU", "LUX", "MKD", "MLT", "MDA", "MCO", "MNE", "NLD", "NOR", "POL", "ROU", "RUS", "SMR", "SRB", "SVK", "SVN", "ESP", "SWE", "CHE", "UKR", "GBR"],
  },
  "155": {
    code: "155",
    name_en: "Western Europe",
    name_es: "Europa Occidental",
    name_pt: "Europa Ocidental",
    parent: "150",
    type: "subregion",
    members: ["AUT", "BEL", "FRA", "DEU", "IRL", "LUX", "MCO", "NLD", "CHE"],
  },
  "151": {
    code: "151",
    name_en: "Eastern Europe",
    name_es: "Europa Oriental",
    name_pt: "Europa Oriental",
    parent: "150",
    type: "subregion",
    members: ["BLR", "BGR", "CZE", "HUN", "MDA", "POL", "ROU", "RUS", "SVK", "UKR"],
  },
  "039": {
    code: "039",
    name_en: "Southern Europe",
    name_es: "Europa Meridional",
    name_pt: "Europa Meridional",
    parent: "150",
    type: "subregion",
    members: ["ALB", "AND", "BIH", "HRV", "CYP", "GRC", "VAT", "ITA", "XKX", "MKD", "MLT", "MNE", "PRT", "SMR", "SRB", "SVN", "ESP"],
  },

  // Oceania
  "009": {
    code: "009",
    name_en: "Oceania",
    name_es: "Oceanía",
    name_pt: "Oceania",
    type: "region",
  },
  "053": {
    code: "053",
    name_en: "Australia and New Zealand",
    name_es: "Australia y Nueva Zelanda",
    name_pt: "Austrália e Nova Zelândia",
    parent: "009",
    type: "subregion",
    members: ["AUS", "NZL", "NFK", "FJI"],
  },
  "054": {
    code: "054",
    name_en: "Melanesia",
    name_es: "Melanesia",
    name_pt: "Melanésia",
    parent: "009",
    type: "subregion",
    members: ["FJI", "PNG", "SLB", "VUT"],
  },
  "057": {
    code: "057",
    name_en: "Micronesia",
    name_es: "Micronesia",
    name_pt: "Micronésia",
    parent: "009",
    type: "subregion",
    members: ["GUM", "KIR", "MHL", "FSM", "NRU", "MNP", "PLW"],
  },
  "061": {
    code: "061",
    name_en: "Polynesia",
    name_es: "Polinesia",
    name_pt: "Polinésia",
    parent: "009",
    type: "subregion",
    members: ["ASM", "COK", "PYF", "NIU", "WSM", "TKL", "TON", "TUV", "WLF"],
  },
};

/**
 * Get subregion info by code
 */
export function getSubregionByCode(code: string): UN_M49_Region | undefined {
  return UN_M49_SUBREGIONS[code];
}

/**
 * Find subregion containing a country (ISO3 code)
 */
export function findSubregionForCountry(iso3: string): UN_M49_Region | undefined {
  return Object.values(UN_M49_SUBREGIONS).find(
    (region) => region.type === "subregion" && region.members?.includes(iso3)
  );
}

/**
 * Get all subregions (for building Zona level)
 */
export function getAllSubregions(): UN_M49_Region[] {
  return Object.values(UN_M49_SUBREGIONS).filter((r) => r.type === "subregion");
}
