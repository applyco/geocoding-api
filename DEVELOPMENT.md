# Development Guide

## Project Overview

This is a full-stack geocoding API with separated concerns:

- **Worker** (TypeScript, Hono): Cloudflare Workers endpoint that serves HTTP requests
- **ETL** (TypeScript, Node.js): Offline data pipeline that processes and indexes geographic data
- **Shared** (TypeScript): Common type definitions used by both

## Quick Dev Setup

```bash
# Clone and install
git clone ...
cd geocoding-api

# Install dependencies
cd worker && npm install && cd ..
cd etl && npm install && cd ..
```

## Running Locally

### Worker Dev Server

```bash
cd worker
npm run dev
# Opens http://localhost:8787
```

Test the API:

```bash
curl "http://localhost:8787/"
curl "http://localhost:8787/health"
curl "http://localhost:8787/reverse?lat=-43.9&lon=171.5&lang=es"
```

You'll need ES_URL and ES_API_KEY in your `.env` or as environment variables.

### ETL Pipeline

```bash
export ES_URL="https://your-es.cloud:9243"
export ES_API_KEY="VnV..."

cd etl

# Run all steps
npm run etl

# Or run individual steps
npm run step:download
npm run step:convert
npm run step:zones
npm run step:overrides
npm run step:validate
npm run step:index
```

## File Structure Reference

### Worker Files

| File | Purpose |
|---|---|
| `worker/src/index.ts` | Hono app entry point, route wiring, middleware |
| `worker/src/routes/geocode.ts` | GET /reverse handler with Zod validation |
| `worker/src/services/elasticsearch.ts` | fetch()-based ES client for Workers |
| `worker/src/utils/breadcrumb.ts` | Assemble hierarchical names from ES results |
| `worker/src/types/index.ts` | TypeScript interfaces |
| `worker/wrangler.toml` | Worker configuration, secrets bindings |

### ETL Files

| File | Purpose |
|---|---|
| `etl/src/pipeline.ts` | Orchestrator, runs steps 01-06 in sequence |
| `etl/src/steps/01_download.ts` | Download Natural Earth + GeoNames |
| `etl/src/steps/02_convert.ts` | SHP→GeoJSON, TSV→JSON |
| `etl/src/steps/03_build_zones.ts` | Union country polygons by UN M.49 |
| `etl/src/steps/04_apply_overrides.ts` | Apply canonical names from YAML |
| `etl/src/steps/05_validate.ts` | Validate geometry validity |
| `etl/src/steps/06_index.ts` | Bulk-index to Elasticsearch |
| `etl/src/es/client.ts` | Elasticsearch client (Node.js) |
| `etl/src/es/mappings.ts` | Index mappings definition |
| `etl/src/es/create_index.ts` | Index creation logic |
| `etl/data/overrides.yaml` | **Canonical names source of truth** |

## Key Design Decisions

### Why separate Worker and ETL?

- **Worker**: Must be ultra-fast (10-50ms CPU limit). Does only read queries.
- **ETL**: Can take 30+ minutes. Processes data offline, runs on schedule or manual trigger.
- **Separation**: ETL can be rerun without affecting production queries. Worker never needs to process data.

### Why `_msearch` instead of separate queries?

One HTTP round-trip to Elasticsearch fetches all 5 hierarchy levels in parallel. Instead of:

```
Query 1: /geo_continents/_search  (5ms)
Query 2: /geo_zones/_search        (5ms)
Query 3: /geo_countries/_search    (10ms)
Query 4: /geo_admin1/_search       (15ms)
Query 5: /geo_cities/_search       (20ms)
= 5 round-trips, 55ms total
```

We do:

```
POST /_msearch with 5 queries (20ms, 1 round-trip)
```

### Why `overrides.yaml` is committed to git?

- Names are code. Version control them.
- Easy review: "Updated Canterbury from 'Canterbury Region' to 'Canterbury'"
- Easy rollback: Revert a commit if a name decision was wrong.
- Human-readable: YAML is easy to read and edit.

### Why separate indices per hierarchy level?

- Independent scaling: Cities index can be 10x larger than continents.
- Independent reindexing: Update cities without touching countries.
- Independent optimization: Zone index uses different settings than admin1.

## Common Tasks

### Add a new place name

Edit `etl/data/overrides.yaml`:

```yaml
admin1:
  FR-IDF:  # France, Île-de-France
    names:
      es: "Isla de Francia"
      en: "Île-de-France"
      pt: "Ilha de França"
    canonical: "Île-de-France"
```

Then run ETL:

```bash
bash scripts/run_etl.sh
```

### Fix an incorrect city name

Find the GeoNames ID (search at https://www.geonames.org/), then add to overrides:

```yaml
cities:
  "3014476":  # GeoNames ID
    names:
      es: "Ámsterdam"
      en: "Amsterdam"
      pt: "Amsterdão"
    canonical: "Amsterdam"
```

### Add a new language

1. Update `SupportedLang` type in `shared/types.ts`:

```typescript
export type SupportedLang = "es" | "en" | "pt" | "de";  // Add "de"
```

2. Add language to all overrides in `etl/data/overrides.yaml`:

```yaml
admin1:
  NZ-CAN:
    names:
      es: "Canterbury"
      en: "Canterbury"
      pt: "Canterbury"
      de: "Canterbury"  # Add here
```

3. Update Worker route to accept new language:

```typescript
const querySchema = z.object({
  lang: z.enum(["es", "en", "pt", "de"]).default("es"),  // Add "de"
});
```

4. Re-run ETL and redeploy Worker.

### Debug a query

```bash
# Check what Elasticsearch returns for a coordinate
curl -X POST http://localhost:9200/geo_countries/_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "geo_shape": {
        "boundary": {
          "shape": {
            "type": "point",
            "coordinates": [171.5, -43.9]
          },
          "relation": "contains"
        }
      }
    },
    "size": 1
  }'
```

### Check index stats

```bash
curl "${ES_URL}/_cat/indices/geo_*?v&h=index,docs.count,store.size"
```

## Testing

### Type checking

```bash
cd worker && npm run typecheck
cd etl && npx tsc --noEmit
```

### Manual API tests

```bash
cd worker && npm run dev

# In another terminal
curl "http://localhost:8787/reverse?lat=-43.9&lon=171.5&lang=es"
curl "http://localhost:8787/reverse?lat=36.9&lon=-111.5&lang=en"
curl "http://localhost:8787/health"
```

### Load testing

After deployment:

```bash
# Using Apache Bench
ab -n 1000 -c 10 "https://geocoding-api.example.com/reverse?lat=-43.9&lon=171.5"

# Using k6
k6 run - <<'EOF'
import http from 'k6/http';
export default function() {
  http.get('https://geocoding-api.example.com/reverse?lat=-43.9&lon=171.5');
}
EOF
```

## Deployment

### Cloudflare Workers

```bash
cd worker

# Set secrets
wrangler secret put ES_URL --env production
wrangler secret put ES_API_KEY --env production

# Deploy
wrangler deploy --env production

# View logs
wrangler tail --env production
```

### ETL via GitHub Actions

The `.github/workflows/etl.yml` runs:
- On every push to `etl/data/overrides.yaml` (catch name errors immediately)
- Weekly (Mondays 02:00 UTC) to pick up data updates
- On manual trigger

To enable, set these secrets in your GitHub repo:
- `ES_URL`
- `ES_API_KEY`

## Troubleshooting

### "Worker error: Elasticsearch configuration missing"

Set secrets:

```bash
wrangler secret put ES_URL --env production
wrangler secret put ES_API_KEY --env production
```

### "Cannot connect to Elasticsearch" during ETL

Check credentials:

```bash
curl -H "Authorization: ApiKey ${ES_API_KEY}" "${ES_URL}/_cluster/health"
```

### "ogr2ogr not found"

Install GDAL:

```bash
# macOS
brew install gdal

# Ubuntu
sudo apt-get install gdal-bin

# Windows
# Download: https://trac.osgeo.org/gdal/wiki/DownloadingGdalBinaries
```

### ETL runs out of memory

The GeoNames alternate names file (~500MB) can cause memory issues. Increase Node.js heap:

```bash
export NODE_OPTIONS="--max-old-space-size=2048"
npm run etl
```

## Performance Tips

### Worker

- Responses are cached (1 week TTL)
- One `_msearch` call instead of 5 separate queries
- Only essential fields are fetched (`_source` filtering)

### Elasticsearch

- `geo_shape` queries use BKD tree indexing (fast for point-in-polygon)
- Dedicated index per hierarchy level (independent scaling)
- Bulk indexing in batches of 500 (balanced memory/throughput)

## Architecture Decisions (ADR)

### Decision: fetch() instead of Elasticsearch SDK in Worker

**Why**: @elastic/elasticsearch requires Node.js APIs unavailable in Cloudflare Workers.

**Trade-off**: Manual NDJSON construction for _msearch, but simpler overall.

### Decision: One index per hierarchy level

**Why**: Independent scaling, reindexing, and optimization.

**Trade-off**: 5 separate queries (mitigated by _msearch, one HTTP call).

### Decision: overrides.yaml committed to git

**Why**: Names are code. Version control, review, rollback.

**Trade-off**: Requires ETL re-run to apply changes.

## Contributing

1. Make changes to code or `overrides.yaml`
2. Test locally: `npm run dev` (Worker) and `npm run etl` (ETL)
3. Commit and push
4. Create PR
5. On merge, GitHub Actions runs ETL (if names changed) and Worker redeployment
