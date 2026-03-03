import type { SupportedLang, GeoLevel, GeoFeature, ReverseGeocodeResult, QueryParams } from "../../shared/types";

export type { SupportedLang, GeoLevel, GeoFeature, ReverseGeocodeResult, QueryParams };

export interface Env {
  ES_URL: string;
  ES_INDEX_PREFIX: string;
  DEFAULT_LANG: string;
  // Authentication: either ES_API_KEY or (ES_USERNAME + ES_PASSWORD)
  ES_API_KEY?: string;
  ES_USERNAME?: string;
  ES_PASSWORD?: string;
}

export interface ESResponse {
  responses: Array<{
    hits?: {
      hits: Array<{
        _id: string;
        _source: GeoFeature;
      }>;
    };
    error?: any;
  }>;
}

export interface HealthResponse {
  status: "ok" | "error";
  elasticsearch?: any;
}
