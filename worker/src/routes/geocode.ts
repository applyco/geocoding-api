/**
 * Reverse geocoding route
 * GET /reverse?lat=X&lon=Y&lang=es|en|pt
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { queryAllLevels, queryCountryByCode } from "../services/elasticsearch";
import { assembleBreadcrumb } from "../utils/breadcrumb";
import type { Env, GeoFeature } from "../types";

// Query parameter schema
const querySchema = z.object({
  lat: z.coerce
    .number()
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),
  lon: z.coerce
    .number()
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),
  lang: z.enum(["es", "en", "pt"]).default("es"),
});

export const geocodeRouter = new Hono<{ Bindings: Env }>();

/**
 * GET /reverse
 * Reverse geocode coordinates to hierarchical place names
 */
geocodeRouter.get("/reverse", zValidator("query", querySchema), async (c) => {
  const { lat, lon, lang } = c.req.valid("query");

  try {
    // Query Elasticsearch for all matching features
    let features = await queryAllLevels(c.env, lat, lon);

    if (features.length === 0) {
      return c.json(
        {
          error: "No geographic feature found for these coordinates",
          coordinates: { lat, lon },
        },
        404
      );
    }

    // Fallback: if city found but no country, use city's country_code to look up country
    const cityFeature = features.find((f) => f.level === "city");
    const countryFeature = features.find((f) => f.level === "country");

    if (cityFeature && !countryFeature && cityFeature.country_code) {
      try {
        const fallbackCountry = await queryCountryByCode(c.env, cityFeature.country_code);
        if (fallbackCountry) {
          features.push(fallbackCountry);
        }
      } catch (err) {
        // Log but continue with what we have
        console.warn(`Fallback country lookup failed for ${cityFeature.country_code}:`, err);
      }
    }

    // Assemble breadcrumb from features
    const result = assembleBreadcrumb(features, lang, lat, lon);

    // Add caching header - coordinates rarely change their containing regions
    c.header("Cache-Control", "public, max-age=604800, immutable");

    return c.json(result);
  } catch (err) {
    console.error(`Reverse geocode error for (${lat}, ${lon}):`, err);

    return c.json(
      {
        error: "Geocoding service error",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * Error handling for validation
 */
geocodeRouter.onError((err, c) => {
  if (err instanceof z.ZodError) {
    return c.json(
      {
        error: "Invalid query parameters",
        details: err.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      },
      400
    );
  }

  return c.json(
    {
      error: "Internal server error",
      message: err instanceof Error ? err.message : "Unknown error",
    },
    500
  );
});
