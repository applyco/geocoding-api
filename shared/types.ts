/**
 * Shared type definitions for both ETL and Worker
 */

export type SupportedLang = "es" | "en" | "pt";

export type GeoLevel = "continent" | "zone" | "country" | "admin1" | "city";

export interface GeoFeature {
  feature_id: string;
  level: GeoLevel;
  boundary?: {
    type: "Polygon" | "MultiPolygon" | "Point";
    coordinates: any[];
  };
  centroid?: {
    type: "Point";
    coordinates: [number, number];
  };
  names: Record<SupportedLang, string>;
  canonical: string;
  hierarchy: {
    continent_id: string | null;
    zone_id: string | null;
    country_id: string | null;
    admin1_id: string | null;
    city_id?: string | null;
  };
  priority: number;
  population?: number;
  geonames_id?: number;
  country_code?: string; // ISO2 country code (for fallback lookup)
  admin1_code?: string; // Admin1 code (for fallback lookup)
}

export interface ReverseGeocodeResult {
  breadcrumb: string;
  parts: {
    continent?: string;
    zone?: string;
    country?: string;
    admin1?: string;
    city?: string;
  };
  lang: SupportedLang;
  coordinates: { lat: number; lon: number };
}

export interface QueryParams {
  lat: number;
  lon: number;
  lang: SupportedLang;
}

/**
 * UN M.49 Geographic Region structure
 */
export interface UN_M49_Region {
  code: string;
  name_en: string;
  name_es: string;
  name_pt: string;
  parent?: string;
  type: "region" | "subregion" | "country";
  members?: string[]; // ISO3 country codes for subregions
}

/**
 * ETL Processing stage
 */
export interface ProcessingStage {
  name: string;
  timestamp: string;
  status: "pending" | "running" | "completed" | "failed";
  error?: string;
}

/**
 * Name override entry from overrides.yaml
 */
export interface NameOverride {
  names: Record<SupportedLang, string>;
  canonical?: string;
}
