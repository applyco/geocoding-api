/**
 * GeoNames data file parsing utilities
 * Source: https://download.geonames.org/export/dump/
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

/**
 * GeoNames cities1000.txt format:
 * 0: geonameid
 * 1: name
 * 2: asciiname
 * 3: alternatenames (comma-separated)
 * 4: latitude
 * 5: longitude
 * 6: feature class
 * 7: feature code
 * 8: country code
 * 9: cc2
 * 10: admin1 code
 * 11: admin2 code
 * 12: admin3 code
 * 13: admin4 code
 * 14: population
 * 15: elevation
 * 16: dem
 * 17: timezone
 * 18: modification date
 */
export interface GeonamesCity {
  geonameid: number;
  name: string;
  asciiname: string;
  latitude: number;
  longitude: number;
  featureClass: string;
  featureCode: string;
  countryCode: string;
  admin1Code: string;
  population: number;
  timezone: string;
  alternatenames: AlternateName[];
}

export interface AlternateName {
  name: string;
  lang: string;
  preferred?: boolean;
  short?: boolean;
}

/**
 * Parse a single line from cities1000.txt
 */
export function parseCitiesLine(line: string): GeonamesCity | null {
  const parts = line.split("\t");
  if (parts.length < 19) return null;

  return {
    geonameid: parseInt(parts[0], 10),
    name: parts[1],
    asciiname: parts[2],
    latitude: parseFloat(parts[4]),
    longitude: parseFloat(parts[5]),
    featureClass: parts[6],
    featureCode: parts[7],
    countryCode: parts[8],
    admin1Code: parts[10],
    population: parseInt(parts[14], 10) || 0,
    timezone: parts[17],
    alternatenames: [],
  };
}

/**
 * Parse alternateNamesV2.txt to get multilingual names
 * Format: alternatenameid | geonameid | isolanguage | alternate name | isPreferredName | isShortName | isColloquial | isHistoric | from | to
 */
export interface AlternateNameRecord {
  alternatenameid: number;
  geonameid: number;
  isolanguage: string;
  alternatename: string;
  isPreferredName: boolean;
  isShortName: boolean;
}

export function parseAlternateNamesLine(line: string): AlternateNameRecord | null {
  const parts = line.split("\t");
  if (parts.length < 4) return null;

  return {
    alternatenameid: parseInt(parts[0], 10),
    geonameid: parseInt(parts[1], 10),
    isolanguage: parts[2],
    alternatename: parts[3],
    isPreferredName: parts[4] === "1",
    isShortName: parts[5] === "1",
  };
}

/**
 * Load cities from TSV file (line-based using readline for large files)
 */
export async function loadCitiesFromFile(
  filePath: string,
  filterFn?: (city: GeonamesCity) => boolean
): Promise<GeonamesCity[]> {
  const cities: GeonamesCity[] = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const city = parseCitiesLine(line.trim());
    if (!city) continue;

    // Default filter: populated places with population >= 1000
    // Includes: PPL (populated place), PPLA* (capitals of admin divisions), PPLC (capital)
    if (filterFn) {
      if (filterFn(city)) cities.push(city);
    } else if (
      ["P"].includes(city.featureClass) &&
      ["PPL", "PPLA", "PPLA2", "PPLA3", "PPLA4", "PPLA5", "PPLC"].includes(city.featureCode) &&
      city.population >= 1000
    ) {
      cities.push(city);
    }
  }

  return cities;
}

/**
 * Load alternate names and index by geonameid (line-based using readline)
 */
export async function loadAlternateNamesFromFile(
  filePath: string,
  geonameids: Set<number>
): Promise<Map<number, AlternateName[]>> {
  const alternateNames = new Map<number, AlternateName[]>();
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const record = parseAlternateNamesLine(line.trim());
    if (!record) continue;

    if (!geonameids.has(record.geonameid)) continue;

    if (!alternateNames.has(record.geonameid)) {
      alternateNames.set(record.geonameid, []);
    }

    // Filter for Spanish, English, Portuguese
    if (["es", "en", "pt"].includes(record.isolanguage)) {
      alternateNames.get(record.geonameid)!.push({
        name: record.alternatename,
        lang: record.isolanguage,
        preferred: record.isPreferredName,
        short: record.isShortName,
      });
    }
  }

  return alternateNames;
}

/**
 * Admin1 codes mapping: countrycode.admin1code → name
 * Format: countrycode.admin1code | admin1 name | asciiname | geonameid
 */
export interface Admin1Code {
  code: string;
  name: string;
  asciiname: string;
  geonameid: number;
}

export function parseAdmin1CodeLine(line: string): Admin1Code | null {
  const parts = line.split("\t");
  if (parts.length < 4) return null;

  const [code, name, asciiname, geonameid] = parts;
  return {
    code,
    name,
    asciiname,
    geonameid: parseInt(geonameid, 10),
  };
}

export async function loadAdmin1CodesFromFile(filePath: string): Promise<Map<string, Admin1Code>> {
  const admin1Codes = new Map<string, Admin1Code>();
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (line.startsWith("#")) continue;
    const code = parseAdmin1CodeLine(line.trim());
    if (!code) continue;
    admin1Codes.set(code.code, code);
  }

  return admin1Codes;
}
