/**
 * Elasticsearch index template and mappings for all geo_* indices
 */

export const GEO_INDEX_TEMPLATE = {
  name: "geo-index-template",
  index_patterns: ["geo_*"],
  template: {
    settings: {
      number_of_shards: 1,
      number_of_replicas: 1,
      "index.codec": "best_compression",
    },
    mappings: {
      dynamic: "strict",
      properties: {
        feature_id: {
          type: "keyword",
        },
        level: {
          type: "keyword",
        },
        boundary: {
          type: "geo_shape",
        },
        centroid: {
          type: "geo_point",
        },
        names: {
          type: "object",
          dynamic: false,
          properties: {
            es: { type: "keyword" },
            en: { type: "keyword" },
            pt: { type: "keyword" },
          },
        },
        canonical: {
          type: "keyword",
        },
        hierarchy: {
          type: "object",
          dynamic: false,
          properties: {
            continent_id: { type: "keyword" },
            zone_id: { type: "keyword" },
            country_id: { type: "keyword" },
            admin1_id: { type: "keyword" },
            city_id: { type: "keyword" },
          },
        },
        priority: {
          type: "integer",
        },
        population: {
          type: "long",
        },
        geonames_id: {
          type: "long",
        },
        country_code: {
          type: "keyword",
        },
        admin1_code: {
          type: "keyword",
        },
      },
    },
  },
};

/**
 * Individual index configurations for each hierarchy level
 */
export const INDICES = ["continents", "zones", "countries", "admin1", "cities"] as const;

export type IndexType = (typeof INDICES)[number];

export const getIndexName = (indexType: IndexType, prefix = "geo_") => `${prefix}${indexType}`;

/**
 * Priority for each geo level in point-in-polygon tie-breaking
 * Higher priority wins when a point falls in overlapping regions
 */
export const LEVEL_PRIORITY: Record<string, number> = {
  city: 5,
  admin1: 4,
  country: 3,
  zone: 2,
  continent: 1,
};
