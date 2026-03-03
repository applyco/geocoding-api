/**
 * Cloudflare Worker - Geocoding API
 * Reverse geocoding: coordinates → hierarchical place names
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { geocodeRouter } from "./routes/geocode";
import { checkElasticsearchHealth } from "./services/elasticsearch";
import type { Env, HealthResponse } from "./types";

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use("*", cors({ origin: "*" }));

/**
 * GET / - API info
 */
app.get("/", (c) =>
  c.json({
    name: "Geocoding API",
    version: "1.0.0",
    description: "Reverse geocoding with hierarchical place names (continent > zone > country > admin1 > city)",
    endpoints: {
      reverse: "/reverse?lat=X&lon=Y&lang=es|en|pt",
      health: "/health",
    },
    examples: [
      {
        url: "/reverse?lat=-43.9&lon=171.5&lang=es",
        name: "Ashburton, New Zealand",
      },
      {
        url: "/reverse?lat=36.9&lon=-111.5&lang=es",
        name: "Page, Arizona, USA",
      },
      {
        url: "/reverse?lat=-22.4&lon=-44.8&lang=es",
        name: "Ibitirama, Minas Gerais, Brazil",
      },
    ],
  })
);

/**
 * GET /health - Health check
 */
app.get("/health", async (c) => {
  const result = await checkElasticsearchHealth(c.env);

  if (!result.ok) {
    return c.json(
      {
        status: "error",
        elasticsearch: result.error || "Unknown error",
      },
      503
    );
  }

  const health = result.health;
  const healthResponse: HealthResponse = {
    status: "ok",
    elasticsearch: {
      cluster: health.cluster_name,
      status: health.status,
      nodes: health.number_of_nodes,
      indices: health.active_shards,
    },
  };

  return c.json(healthResponse);
});

/**
 * Mount reverse geocoding routes
 */
app.route("/", geocodeRouter);

/**
 * 404 handler
 */
app.notFound((c) =>
  c.json(
    {
      error: "Not found",
      message: "Available endpoints: /, /health, /reverse",
    },
    404
  )
);

/**
 * Error handler
 */
app.onError((err, c) => {
  console.error("Worker error:", err);
  return c.json(
    {
      error: "Internal server error",
      message: err instanceof Error ? err.message : "Unknown error",
    },
    500
  );
});

export default app;
