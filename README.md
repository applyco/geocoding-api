# Geocoding API

Reverse geocoding API built on Cloudflare Workers & Elasticsearch. Given coordinates (latitude, longitude), returns a hierarchical place name breadcrumb.

**Key feature**: Canonical name sovereignty. You define once how each place should be named (Spanish, English, Portuguese), and that name is consistent across all queries regardless of upstream data provider changes.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  Cloudflare Worker (TypeScript)              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ GET /reverse?lat=X&lon=Y&lang=es|en|pt              │   │
│  │ → _msearch to Elasticsearch (5 indices in 1 call)    │   │
│  │ → Assemble breadcrumb                                │   │
│  │ → Return: "América del Sur > Brasil > ..."           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↑
                          │ HTTPS
                          │
┌─────────────────────────────────────────────────────────────┐
│        Elasticsearch (5 indices with geo_shape/geo_point)   │
│                                                               │
│  geo_continents     (6 docs)      - Polygon boundaries      │
│  geo_zones          (~22 docs)    - Unioned country polys   │
│  geo_countries      (~250 docs)   - Natural Earth Admin-0   │
│  geo_admin1         (~3500 docs)  - Natural Earth Admin-1   │
│  geo_cities         (~80K docs)   - GeoNames cities         │
└─────────────────────────────────────────────────────────────┘

                 ↓ ETL (offline, Node.js scripts)

   Natural Earth Shapefiles + GeoNames TSV
   ↓
   Step 01: Download
   ↓
   Step 02: Convert SHP→GeoJSON, TSV→JSON
   ↓
   Step 03: Build Zone polygons (union by UN M.49 subregion)
   ↓
   Step 04: Apply canonical name overrides (overrides.yaml)
   ↓
   Step 05: Validate geometries
   ↓
   Step 06: Bulk-index into Elasticsearch
```

## Project Structure

```
geocoding-api/
├── worker/                         # Cloudflare Worker
│   ├── src/
│   │   ├── index.ts                # Entry point, route wiring
│   │   ├── routes/
│   │   │   └── geocode.ts          # GET /reverse handler
│   │   ├── services/
│   │   │   └── elasticsearch.ts    # ES client (fetch-based)
│   │   ├── utils/
│   │   │   └── breadcrumb.ts       # Assemble hierarchical names
│   │   └── types/
│   │       └── index.ts            # TypeScript interfaces
│   ├── wrangler.toml               # Worker config
│   ├── tsconfig.json
│   └── package.json
│
├── etl/                            # ETL pipeline (Node.js, offline)
│   ├── src/
│   │   ├── pipeline.ts             # Orchestrator (runs all steps)
│   │   ├── steps/
│   │   │   ├── 01_download.ts      # Download Natural Earth + GeoNames
│   │   │   ├── 02_convert.ts       # SHP→GeoJSON, TSV→JSON
│   │   │   ├── 03_build_zones.ts   # Union countries by UN M.49
│   │   │   ├── 04_apply_overrides.ts  # Apply overrides.yaml
│   │   │   ├── 05_validate.ts      # Validate geometries
│   │   │   └── 06_index.ts         # Bulk-index to ES
│   │   ├── es/
│   │   │   ├── client.ts           # Elasticsearch client
│   │   │   ├── mappings.ts         # Index mappings
│   │   │   └── create_index.ts     # Index creation
│   │   └── utils/
│   │       ├── m49.ts              # UN M.49 region codes
│   │       ├── geonames_parser.ts  # Parse GeoNames TSV
│   │       └── download.ts         # Download utilities
│   ├── data/
│   │   ├── raw/                    # Downloaded files (gitignored)
│   │   ├── processed/              # Intermediate GeoJSON (gitignored)
│   │   └── overrides.yaml          # ← CANONICAL NAMES (committed)
│   ├── tsconfig.json
│   └── package.json
│
├── shared/
│   └── types.ts                    # Shared TypeScript types
│
├── scripts/
│   └── run_etl.sh                  # One-command ETL runner
│
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 22+
- Elasticsearch 8.x (cloud or self-hosted)
- `gdal/ogr2ogr` (for shapefile conversion)
- Cloudflare account (for Workers deployment)

### 1. Install Dependencies

```bash
cd geocoding-api

# Worker
cd worker && npm install && cd ..

# ETL
cd etl && npm install && cd ..
```

### 2. Run ETL Pipeline

```bash
# Set your Elasticsearch credentials
export ES_URL="https://your-es-cloud:9243"
export ES_API_KEY="VnV..."

# Run the pipeline (downloads ~2GB of data)
bash scripts/run_etl.sh
```

Steps:
1. **Download** (~10min): Natural Earth + GeoNames datasets
2. **Convert** (~5min): SHP→GeoJSON, TSV→JSON
3. **Build Zones** (1min): Union countries by UN M.49 subregion + US Census divisions
4. **Apply Overrides** (30s): Apply canonical names from `overrides.yaml`
5. **Validate** (30s): Check geometry validity
6. **Index** (~10min): Bulk-index to Elasticsearch

### 3. Deploy Worker

```bash
cd worker

# Set secrets
wrangler secret put ES_URL --env production
wrangler secret put ES_API_KEY --env production

# Deploy
wrangler deploy --env production
```

### 4. Test the API

```bash
# Local dev
cd worker && npm run dev

# Test queries
curl "http://localhost:8787/reverse?lat=-43.9&lon=171.5&lang=es"
curl "http://localhost:8787/reverse?lat=36.9&lon=-111.5&lang=es"
curl "http://localhost:8787/reverse?lat=-22.4&lon=-44.8&lang=es"
```

## API Endpoints

### `GET /`

Info and examples.

```bash
curl https://geocoding-api.example.com/
```

### `GET /health`

Health check. Returns Elasticsearch cluster status.

```bash
curl https://geocoding-api.example.com/health
```

### `GET /reverse`

Main reverse geocoding endpoint.

**Query Parameters:**
- `lat` (number, required): Latitude (-90 to 90)
- `lon` (number, required): Longitude (-180 to 180)
- `lang` (string, optional): Language code (`es`, `en`, `pt`). Default: `es`

**Response:**

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

## Canonical Names

The `overrides.yaml` file is the single source of truth for place names. It's committed to git and applied during every ETL run.

```yaml
countries:
  NZL:
    names:
      es: "Nueva Zelanda"
      en: "New Zealand"
      pt: "Nova Zelândia"
    canonical: "New Zealand"

admin1:
  NZ-CAN:
    names:
      es: "Canterbury"
      en: "Canterbury"
      pt: "Canterbury"
    canonical: "Canterbury"

cities:
  "2179542":  # Ashburton, NZ - GeoNames ID
    names:
      es: "Ashburton"
      en: "Ashburton"
      pt: "Ashburton"
```

**To add or update a name:**
1. Find the feature's unique ID (feature_id or geonames_id)
2. Add/update entry in `overrides.yaml`
3. Re-run ETL: `bash scripts/run_etl.sh`

## Example Queries

### New Zealand - Ashburton

```bash
curl "https://geocoding-api.example.com/reverse?lat=-43.9&lon=171.5&lang=es"

# Response:
# Oceanía > Australia y Nueva Zelanda > Nueva Zelanda > Canterbury > Ashburton
```

### USA - Arizona

```bash
curl "https://geocoding-api.example.com/reverse?lat=36.9&lon=-111.5&lang=es"

# Response:
# América del Norte > Región Montañosa > Estados Unidos de América > Arizona > Page
```

### Brazil - Minas Gerais

```bash
curl "https://geocoding-api.example.com/reverse?lat=-22.4&lon=-44.8&lang=es"

# Response:
# América del Sur > Brasil > Minas Gerais > Ibitirama
```

### Multi-language

```bash
# English
curl "https://geocoding-api.example.com/reverse?lat=-43.9&lon=171.5&lang=en"
# Oceania > Australia and New Zealand > New Zealand > Canterbury > Ashburton

# Portuguese
curl "https://geocoding-api.example.com/reverse?lat=-43.9&lon=171.5&lang=pt"
# Oceania > Austrália e Nova Zelândia > Nova Zelândia > Canterbury > Ashburton
```

## Hierarchy Levels

The breadcrumb has 5 levels:

1. **Continente** (6): Africa, Americas, Asia, Europe, Oceania
2. **Zona** (~22): UN M.49 subregions (e.g., "South America", "Northern America") + special cases (e.g., US Census Divisions)
3. **País** (~250): Countries from Natural Earth
4. **Admin1** (~3,500): States, provinces, regions from Natural Earth Admin-1
5. **Ciudad** (~80,000): Cities from GeoNames cities1000.txt (population >= 5,000)

Some locations may not have all 5 levels (e.g., a city in the ocean returns only continent).

## Performance

- **Query latency**: 5-20ms (single _msearch call with 5 indexed geo_shape queries)
- **Caching**: Worker adds `Cache-Control: max-age=604800` (1 week) since coordinates rarely change regions
- **Throughput**: ~1,000 req/sec per Worker edge location (Cloudflare autoscales)

## Data Sources

- **Natural Earth** (public domain): Admin-0 (countries), Admin-1 (states/provinces)
  - License: CC0 1.0 Universal
  - Source: https://www.naturalearthdata.com/

- **GeoNames** (free for non-commercial use, ODbL for commercial)
  - Cities (population >= 1,000)
  - Alternate names (multilingual)
  - Admin codes
  - Source: https://download.geonames.org/export/dump/

- **UN M.49** (public): Geographic subregion codes and member countries
  - Source: https://unstats.un.org/unsd/methodology/m49/

## Deployment Options

### Cloudflare Workers (Recommended)

Free tier: 100,000 req/day. Paid: $0.50/million requests.

```bash
cd worker && wrangler deploy --env production
```

### Self-hosted (e.g., Docker, Kubernetes)

Compatible runtimes: Miniflare, workerd, or any Node.js runtime via adaptation layer.

```bash
# Run with custom Elasticsearch endpoint
ES_URL=https://... ES_API_KEY=... npx wrangler dev
```

## Troubleshooting

### "Elasticsearch configuration missing"

Set `ES_URL` and `ES_API_KEY` secrets:

```bash
cd worker
wrangler secret put ES_URL
wrangler secret put ES_API_KEY
```

### "No geographic feature found for these coordinates"

Coordinates may be in international waters or unmapped territory. The API returns 404 if no containing feature is found at any level.

### ETL fails at download step

If downloads timeout:
1. Check internet connection
2. Manually download files to `etl/data/raw/`
3. Run `npm run step:convert` to continue

### Can't find `ogr2ogr`

Install GDAL:

```bash
# macOS
brew install gdal

# Ubuntu/Debian
sudo apt-get install gdal-bin

# Windows
# Download from https://trac.osgeo.org/gdal/wiki/DownloadingGdalBinaries
```

## Development

### Local worker dev server

```bash
cd worker
npm run dev
# Open http://localhost:8787
```

### Run individual ETL steps

```bash
cd etl
npm run step:download
npm run step:convert
npm run step:zones
npm run step:overrides
npm run step:validate
npm run step:index
```

### Type checking

```bash
cd worker && npm run typecheck
cd etl && npx tsc --noEmit
```

## License

This project is provided as-is. Data sources have their own licenses (see above).

## Contributing

1. Update `overrides.yaml` for name corrections
2. Submit pull request
3. ETL will be re-run on merge

---

**Built with** Cloudflare Workers, Elasticsearch, Natural Earth, GeoNames
