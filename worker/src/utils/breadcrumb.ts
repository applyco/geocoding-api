/**
 * Breadcrumb assembly utilities
 * Constructs hierarchical place names from Elasticsearch results
 */

import type { GeoFeature, ReverseGeocodeResult, SupportedLang } from "../types";
import countryToContinentMap from "../data/country_to_continent.json";

/**
 * Assemble breadcrumb from multiple GeoFeature results
 * Returns a hierarchical string like "América del Sur > Brasil > Minas Gerais > Ibitirama"
 */
export function assembleBreadcrumb(
  features: GeoFeature[],
  lang: SupportedLang,
  lat: number,
  lon: number
): ReverseGeocodeResult {
  // Index features by level for O(1) lookup
  const byLevel = new Map<string, GeoFeature>();

  for (const feature of features) {
    byLevel.set(feature.level, feature);
  }

  // Hierarchical order: continent > zone > country > admin1 > city
  const hierarchyOrder: GeoFeature["level"][] = ["continent", "zone", "country", "admin1", "city"];

  // Extract names for each level
  const parts: Record<string, string | undefined> = {
    continent: undefined,
    zone: undefined,
    country: undefined,
    admin1: undefined,
    city: undefined,
  };

  for (const level of hierarchyOrder) {
    if (level === "continent") {
      // Try to get continent from the country via mapping
      const countryFeature = byLevel.get("country");
      if (countryFeature && countryFeature.feature_id) {
        const continentData = (countryToContinentMap as any)[countryFeature.feature_id];
        if (continentData) {
          parts.continent = continentData[lang] ?? continentData.es;
        }
      }
      continue;
    }

    const feature = byLevel.get(level);
    if (!feature) continue;

    // Prefer language-specific name, fallback to canonical
    const name = feature.names[lang] ?? feature.canonical;
    parts[level] = name;
  }

  // Build breadcrumb string from defined parts only (skip missing levels)
  const breadcrumbParts = hierarchyOrder
    .map((level) => parts[level])
    .filter(Boolean) as string[];

  const breadcrumb = breadcrumbParts.join(" > ");

  return {
    breadcrumb: breadcrumb || "Unknown location",
    parts: {
      continent: parts.continent,
      zone: parts.zone,
      country: parts.country,
      admin1: parts.admin1,
      city: parts.city,
    },
    lang,
    coordinates: { lat, lon },
  };
}

/**
 * Get the most specific level available
 */
export function getMostSpecificLevel(features: GeoFeature[]): GeoFeature["level"] | undefined {
  const levels: Record<GeoFeature["level"], number> = {
    continent: 1,
    zone: 2,
    country: 3,
    admin1: 4,
    city: 5,
  };

  let mostSpecific: GeoFeature["level"] | undefined;
  let maxLevel = 0;

  for (const feature of features) {
    const levelValue = levels[feature.level];
    if (levelValue > maxLevel) {
      maxLevel = levelValue;
      mostSpecific = feature.level;
    }
  }

  return mostSpecific;
}

/**
 * Check if a location is a populated place (city/town)
 */
export function isPopulatedPlace(feature: GeoFeature): boolean {
  return feature.level === "city" && (feature.population ?? 0) > 0;
}

/**
 * Format population for display
 */
export function formatPopulation(population?: number): string | undefined {
  if (!population || population < 1000) return undefined;

  if (population >= 1000000) {
    return `${(population / 1000000).toFixed(1)}M`;
  }
  if (population >= 1000) {
    return `${(population / 1000).toFixed(0)}K`;
  }

  return population.toString();
}
