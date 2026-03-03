# Geocoding API Reference

**Production URL:** `https://geocoding-api-production.tortugo-raw.workers.dev`

Reverse geocoding API built on Cloudflare Workers & Elasticsearch. Given coordinates (latitude, longitude), returns a hierarchical place name breadcrumb in your preferred language.

## Quick Start

```bash
# Get the geographic hierarchy for a location
curl "https://geocoding-api-production.tortugo-raw.workers.dev/reverse?lat=-43.9&lon=171.5&lang=es"
```

Response:
```json
{
  "breadcrumb": "Oceanía > Australia y Nueva Zelanda > Nueva Zelanda > Canterbury > Ashburton",
  "parts": {
    "continent": "Oceanía",
    "zone": "Australia y Nueva Zelanda",
    "country": "Nueva Zelanda",
    "admin1": "Canterbury",
    "city": "Ashburton"
  },
  "lang": "es",
  "coordinates": { "lat": -43.9, "lon": 171.5 }
}
```

## Supported Languages

| Code | Language  | Example                                            |
|------|-----------|---------------------------------------------------|
| `es` | Español   | "Nueva Zelanda" (default)                         |
| `en` | English   | "New Zealand"                                     |
| `pt` | Português | "Nova Zelândia"                                   |

## Authentication

**No authentication required.** The API is publicly accessible.

**CORS:** Enabled for all origins (`*`)

## Endpoints

### GET /

Returns API metadata and available endpoints.

**Request:**
```bash
curl "https://geocoding-api-production.tortugo-raw.workers.dev/"
```

**Response (200):**
```json
{
  "name": "Geocoding API",
  "version": "1.0.0",
  "description": "Reverse geocoding with hierarchical place names",
  "endpoints": {
    "root": "/",
    "health": "/health",
    "reverse": "/reverse?lat=X&lon=Y&lang=es|en|pt"
  },
  "examples": [
    {
      "url": "/reverse?lat=-43.9&lon=171.5&lang=es",
      "name": "Ashburton, New Zealand"
    },
    {
      "url": "/reverse?lat=36.9&lon=-111.5&lang=es",
      "name": "Page, Arizona, USA"
    },
    {
      "url": "/reverse?lat=-22.4&lon=-44.8&lang=es",
      "name": "Ibitirama, Minas Gerais, Brazil"
    }
  ]
}
```

---

### GET /health

Checks the health status of the Elasticsearch cluster.

**Request:**
```bash
curl "https://geocoding-api-production.tortugo-raw.workers.dev/health"
```

**Response (200 — Healthy):**
```json
{
  "status": "ok",
  "elasticsearch": {
    "cluster": "docker-cluster",
    "status": "yellow",
    "nodes": 1,
    "indices": 8
  }
}
```

**Response (503 — Unhealthy):**
```json
{
  "status": "error",
  "elasticsearch": "HTTP 503 Service Unavailable"
}
```

---

### GET /reverse

Reverse geocoding endpoint. Returns the geographic hierarchy for the given coordinates.

**Query Parameters:**

| Parameter | Type   | Required | Range      | Default | Description                                              |
|-----------|--------|----------|------------|---------|----------------------------------------------------------|
| `lat`     | number | Yes      | -90 to 90  | —       | Latitude of the point to geocode                        |
| `lon`     | number | Yes      | -180 to 180| —       | Longitude of the point to geocode                       |
| `lang`    | string | No       | es, en, pt | es      | Language of the returned place names (Spanish, English, Portuguese) |

**Request Examples:**

Spanish (default):
```bash
curl "https://geocoding-api-production.tortugo-raw.workers.dev/reverse?lat=-43.9&lon=171.5&lang=es"
```

English:
```bash
curl "https://geocoding-api-production.tortugo-raw.workers.dev/reverse?lat=-43.9&lon=171.5&lang=en"
```

Portuguese:
```bash
curl "https://geocoding-api-production.tortugo-raw.workers.dev/reverse?lat=-43.9&lon=171.5&lang=pt"
```

**Response (200 — Success):**

```json
{
  "breadcrumb": "Oceanía > Australia y Nueva Zelanda > Nueva Zelanda > Canterbury > Ashburton",
  "parts": {
    "continent": "Oceanía",
    "zone": "Australia y Nueva Zelanda",
    "country": "Nueva Zelanda",
    "admin1": "Canterbury",
    "city": "Ashburton"
  },
  "lang": "es",
  "coordinates": { "lat": -43.9, "lon": 171.5 }
}
```

**Response (400 — Invalid Parameters):**

```json
{
  "error": "Invalid query parameters",
  "details": [
    {
      "field": "lat",
      "message": "Latitude must be between -90 and 90"
    },
    {
      "field": "lang",
      "message": "Invalid enum value. Expected 'es' | 'en' | 'pt', received 'fr'"
    }
  ]
}
```

**Response (404 — No Feature Found):**

Occurs when coordinates are in international waters or unmapped territory.

```json
{
  "error": "No geographic feature found for these coordinates",
  "coordinates": { "lat": 0, "lon": 0 }
}
```

**Response (500 — Internal Server Error):**

```json
{
  "error": "Geocoding service error",
  "message": "Elasticsearch _msearch failed: 503 Service Unavailable"
}
```

---

## Response Format

### Breadcrumb

The `breadcrumb` field is a hierarchical string representation of the location:

```
continent > zone > country > admin1 > city
```

Each level is optional and only included if available:
- If only country is found: `"Nueva Zelanda"`
- If country + admin1 are found: `"Nueva Zelanda > Canterbury"`
- If all levels are found: `"Oceanía > Australia y Nueva Zelanda > Nueva Zelanda > Canterbury > Ashburton"`
- If no features are found: `"Unknown location"`

### Parts Object

The `parts` object provides individual components:

| Field       | Type   | Present When                                   | Description                    |
|-------------|--------|------------------------------------------------|--------------------------------|
| `continent` | string | Always, when geographic data is found        | Continent name (6 total)       |
| `zone`      | string | When country is in a UN M.49 subregion       | Geographic zone / subregion (~22 total) |
| `country`   | string | When country is found                        | Country name (~250 total)      |
| `admin1`    | string | When state/province/region is found          | Admin division 1 (~3,500 total) |
| `city`      | string | When city/town is found (pop >= 5,000)      | City / populated place (~80,000 total) |

**Note:** All fields in `parts` are optional strings; they may be omitted if not applicable.

### Response Headers

All successful responses include:

```
Cache-Control: public, max-age=604800, immutable
Content-Type: application/json
```

The cache is set to 1 week (604800 seconds) because geographic coordinates rarely change regions.

---

## Hierarchy Levels

The API returns results across 5 geographic hierarchy levels:

| Level      | Count | Data Source                | Description                          |
|------------|-------|----------------------------|--------------------------------------|
| Continent  | 6     | Custom (UN M.49)          | Africa, Americas, Asia, Europe, Oceania, Antarctica |
| Zone       | ~22   | UN M.49 Subregions        | Geographic regions (e.g., "South America", "East Asia") |
| Country    | ~250  | Natural Earth Admin-0     | Sovereign states                    |
| Admin1     | ~3,500| Natural Earth Admin-1     | States, provinces, regions          |
| City       | ~80,000| GeoNames cities1000.txt  | Cities with population >= 5,000     |

---

## Canonical Names

Place names are pulled from `overrides.yaml` at the time of data indexing. This ensures name consistency:

- A location always has a single canonical English name
- The same location can have names in Spanish, English, and Portuguese
- Names are updated by re-running the ETL pipeline

Example canonical name definitions:

```yaml
countries:
  NZL:
    names:
      es: "Nueva Zelanda"
      en: "New Zealand"
      pt: "Nova Zelândia"
    canonical: "New Zealand"
```

---

## Examples

### Example 1: Ashburton, New Zealand

Coordinates: **lat=-43.9, lon=171.5**

**Spanish:**
```bash
curl "https://geocoding-api-production.tortugo-raw.workers.dev/reverse?lat=-43.9&lon=171.5&lang=es"
```
Response: `"Oceanía > Australia y Nueva Zelanda > Nueva Zelanda > Canterbury > Ashburton"`

**English:**
```bash
curl "https://geocoding-api-production.tortugo-raw.workers.dev/reverse?lat=-43.9&lon=171.5&lang=en"
```
Response: `"Oceania > Australia and New Zealand > New Zealand > Canterbury > Ashburton"`

**Portuguese:**
```bash
curl "https://geocoding-api-production.tortugo-raw.workers.dev/reverse?lat=-43.9&lon=171.5&lang=pt"
```
Response: `"Oceania > Austrália e Nova Zelândia > Nova Zelândia > Canterbury > Ashburton"`

---

### Example 2: Page, Arizona, USA

Coordinates: **lat=36.9, lon=-111.5**

**Spanish:**
```bash
curl "https://geocoding-api-production.tortugo-raw.workers.dev/reverse?lat=36.9&lon=-111.5&lang=es"
```
Response: `"América del Norte > Región Montañosa > Estados Unidos de América > Arizona > Page"`

**English:**
```bash
curl "https://geocoding-api-production.tortugo-raw.workers.dev/reverse?lat=36.9&lon=-111.5&lang=en"
```
Response: `"North America > Mountain Division > United States of America > Arizona > Page"`

---

### Example 3: Ibitirama, Minas Gerais, Brazil

Coordinates: **lat=-22.4, lon=-44.8**

**Spanish:**
```bash
curl "https://geocoding-api-production.tortugo-raw.workers.dev/reverse?lat=-22.4&lon=-44.8&lang=es"
```
Response: `"América del Sur > Brasil > Minas Gerais > Ibitirama"`

**Portuguese:**
```bash
curl "https://geocoding-api-production.tortugo-raw.workers.dev/reverse?lat=-22.4&lon=-44.8&lang=pt"
```
Response: `"América do Sul > Brasil > Minas Gerais > Ibitirama"`

---

## Performance

| Metric | Value |
|--------|-------|
| Query Latency | 5–20 ms (single `_msearch` with 5 parallel geo_shape queries) |
| Cache TTL | 604,800 seconds (1 week) — coordinates rarely change geographic regions |
| Throughput | ~1,000 requests/sec per Cloudflare edge location (autoscaled) |
| CORS | Enabled for all origins (`*`) |

---

## Implementation Details

### Query Strategy

The reverse geocoding query uses a single Elasticsearch `_msearch` request with 5 parallel queries:

1. **geo_continents** — geo_shape query (point-in-polygon)
2. **geo_zones** — geo_shape query (point-in-polygon)
3. **geo_countries** — geo_shape query (point-in-polygon)
4. **geo_admin1** — geo_shape query (point-in-polygon)
5. **geo_cities** — geo_distance query (25 km radius, ordered by distance then population)

Results are assembled in hierarchical order: continent → zone → country → admin1 → city.

### Fallback Logic

If a more specific level (e.g., country) is found but a parent level (e.g., continent) is missing, the API attempts to fill the gap:
- If a **city** is found but no **country**, the city's `country_code` (ISO2) is used to lookup the country.
- The **continent** is always derived from the country using a lookup table, never directly from Elasticsearch.

### Breadcrumb Assembly

The final breadcrumb is constructed by:
1. Filtering out undefined levels
2. Selecting the appropriate language name from each level's `names` object (with fallback to `canonical`)
3. Joining with ` > ` separator
4. If no levels are found, returning `"Unknown location"`

---

## Error Handling

| HTTP Status | Condition | Example Response |
|---|---|---|
| 200 | Successful geocoding | Feature found and hierarchy assembled |
| 400 | Invalid query parameters (validation failed) | `lat` out of range, invalid `lang` |
| 404 | Coordinates not in any geographic feature | Coordinates in international waters |
| 500 | Elasticsearch connection error, timeout, or internal error | Cluster down, network issue |

---

## Data Attribution

- **Natural Earth** (public domain): Countries (Admin-0), States/Provinces (Admin-1)
  - License: CC0 1.0 Universal
  - Source: https://www.naturalearthdata.com/

- **GeoNames** (CC BY 4.0 for non-commercial, ODbL for commercial)
  - Cities with population >= 5,000
  - Alternate names (multilingual)
  - Source: https://download.geonames.org/export/dump/

- **UN M.49** (public)
  - Geographic region codes and subregion classifications
  - Source: https://unstats.un.org/unsd/methodology/m49/

---

## FAQ

**Q: What happens if coordinates are in the ocean?**
A: The API returns a 404 with `"No geographic feature found for these coordinates"`. Only land features are indexed.

**Q: What's the most specific level returned?**
A: Cities (if population >= 5,000). Sub-city data (neighborhoods, buildings) is not available.

**Q: Can I use this API in commercial applications?**
A: Check the licenses of the underlying data sources (GeoNames commercial use requires ODbL compliance). The API itself is provided as-is.

**Q: How often is the data updated?**
A: Data is updated whenever the ETL pipeline is re-run. Trigger frequency depends on your data maintenance schedule.

**Q: Does the API support reverse lookups (place name → coordinates)?**
A: No, this API only supports reverse geocoding (coordinates → place names). Use a general geocoding API (Google Maps, Nominatim) for forward geocoding.

---

## Support

For issues or feature requests, see the repository:
https://github.com/yourusername/geocoding-api

For questions about data accuracy, refer to the individual data source documentation:
- Natural Earth: https://www.naturalearthdata.com/
- GeoNames: https://www.geonames.org/
