# 🚀 Quick Start Guide

## Status: ETL Pipeline Running in Background

El ETL se está ejecutando en `etl.log`. Monitoñéalo con:

```bash
cd /c/Users/Eric/geocoding-api
tail -f etl.log
```

**Tiempo estimado**: 15-30 minutos (dependiendo de tu conexión internet)

---

## Test Local del Worker (mientras corre el ETL)

### 1. Iniciar servidor de desarrollo

```bash
cd C:\Users\Eric\geocoding-api\worker
npm run dev
```

Esto abre http://localhost:8787

### 2. Probar endpoints

En otra terminal:

```bash
# Info de la API
curl http://localhost:8787/

# Health check (verifica conexión a Elasticsearch)
curl http://localhost:8787/health

# Reverse geocoding (una vez que el ETL termine e indexe)
curl "http://localhost:8787/reverse?lat=-43.9&lon=171.5&lang=es"
# Esperado: "Oceanía > Australia y Nueva Zelanda > Nueva Zelanda > Canterbury > Ashburton"

curl "http://localhost:8787/reverse?lat=36.9&lon=-111.5&lang=es"
# Esperado: "América del Norte > Región Montañosa > Estados Unidos de América > Arizona > Page"

curl "http://localhost:8787/reverse?lat=-22.4&lon=-44.8&lang=es"
# Esperado: "América del Sur > Brasil > Minas Gerais > Ibitirama"
```

---

## Verificar Estado del ETL

### Opción A: Ver log en vivo
```bash
tail -f C:\Users\Eric\geocoding-api\etl.log
```

### Opción B: Ver últimas 50 líneas
```bash
tail -50 C:\Users\Eric\geocoding-api\etl.log
```

### Opción C: Buscar errores
```bash
grep -i "error" C:\Users\Eric\geocoding-api\etl.log
```

### Opción D: Ver índices en Elasticsearch

```bash
curl -s -u elastic:'U3TGKEHPJrzOyjT8lFa3iN69r9WbvB9y' \
  http://elasticsearch-vgo88gk400s4osw4csso8koc.46.183.118.221.sslip.io/_cat/indices/geo_*?v&h=index,docs.count,store.size

# Esperado una vez que termine:
# index          docs.count store.size
# geo_continents 6          15KB
# geo_zones      22         200KB
# geo_countries  250        5MB
# geo_admin1     3500       150MB
# geo_cities     80000      800MB (más o menos)
```

---

## Una Vez que el ETL Termine

### 1. Confirmar indexación exitosa

```bash
curl -s -u elastic:'U3TGKEHPJrzOyjT8lFa3iN69r9WbvB9y' \
  http://elasticsearch-vgo88gk400s4osw4csso8koc.46.183.118.221.sslip.io/_cat/indices/geo_*?v

# Si ves 5 índices (geo_continents, geo_zones, geo_countries, geo_admin1, geo_cities) ✓
```

### 2. Test del Worker

```bash
cd C:\Users\Eric\geocoding-api\worker
npm run dev

# En otra terminal, prueba:
curl "http://localhost:8787/reverse?lat=-43.9&lon=171.5&lang=es"
```

### 3. Deploy a Cloudflare Workers

```bash
cd C:\Users\Eric\geocoding-api\worker

# Guardar credenciales como secretos
wrangler secret put ES_URL --env production
# Pega: http://elasticsearch-vgo88gk400s4osw4csso8koc.46.183.118.221.sslip.io

wrangler secret put ES_USERNAME --env production
# Pega: elastic

wrangler secret put ES_PASSWORD --env production
# Pega: U3TGKEHPJrzOyjT8lFa3iN69r9WbvB9y

# Deploy
wrangler deploy --env production

# Ver URL desplegada
wrangler deployments list
```

---

## Estructura del Proyecto

```
C:\Users\Eric\geocoding-api\
├── worker/              # API Cloudflare (TypeScript)
│   ├── src/            # Código fuente
│   ├── wrangler.toml   # Configuración
│   └── package.json
│
├── etl/                 # Pipeline (Node.js)
│   ├── src/            # 6 pasos: download → convert → build_zones → apply_overrides → validate → index
│   ├── data/
│   │   ├── raw/        # Descargas (Natural Earth, GeoNames)
│   │   ├── processed/  # GeoJSON intermedios
│   │   └── overrides.yaml  # ← NOMBRES CANÓNICOS
│   └── package.json
│
├── README.md           # Documentación completa
├── DEVELOPMENT.md      # Guía para developers
└── .env               # Credenciales Elasticsearch
```

---

## Pasos ETL en Detalle

El pipeline ejecuta 6 pasos automáticamente:

1. **Download** (~5min): Descarga Natural Earth (Admin-0/1) + GeoNames (ciudades, nombres)
2. **Convert** (~2min): SHP→GeoJSON, TSV→JSON
3. **Build Zones** (1min): Construye polígonos de Zona por UN M.49 subregiones
4. **Apply Overrides** (30s): Aplica nombres canónicos desde `overrides.yaml`
5. **Validate** (30s): Valida geometrías (winding-order, coordenadas)
6. **Index** (~15min): Bulk-indexa a Elasticsearch

**Tiempo total**: 15-30 minutos

---

## Comandos Útiles

```bash
# Ver estado del ETL
ps aux | grep "npm run etl"

# Matar el ETL si es necesario
kill <PID>

# Ver primeras 100 líneas del log
head -100 C:\Users\Eric\geocoding-api\etl.log

# Ver últimas 100 líneas
tail -100 C:\Users\Eric\geocoding-api\etl.log

# Contar líneas (útil para ver progreso)
wc -l C:\Users\Eric\geocoding-api\etl.log

# Buscar paso completado
grep "Step.*complete" C:\Users\Eric\geocoding-api\etl.log

# Ver si hubo errores
grep "✗\|error\|Error" C:\Users\Eric\geocoding-api\etl.log
```

---

## Troubleshooting

### "✗ Failed to connect to Elasticsearch"
- Verifica que tu Elasticsearch está corriendo
- Verifica credenciales en `.env`
- Prueba manualmente: `curl -u elastic:PASSWORD http://ELASTICSEARCH_URL/_cluster/health`

### "No geographic feature found for these coordinates"
- Espera a que el ETL termine de indexar
- Verifica que los índices se crearon: `curl -u elastic:PASSWORD ES_URL/_cat/indices/geo_*`

### ETL se detiene en un paso
- Ver el log: `tail -f C:\Users\Eric\geocoding-api\etl.log`
- Buscar el paso que falló
- Verificar el error específico

### GDAL/ogr2ogr no encontrado
- Windows: Descarga desde https://trac.osgeo.org/gdal/wiki/DownloadingGdalBinaries
- macOS: `brew install gdal`
- Ubuntu: `sudo apt-get install gdal-bin`

---

## Próximas Optimizaciones

Una vez que todo funcione:

1. **GitHub Actions** para re-ejecutar ETL automáticamente en cambios a `overrides.yaml`
2. **CI/CD** para auto-deploy del Worker en cambios a `worker/src`
3. **Monitoring** en Cloudflare Workers con `wrangler tail`
4. **Load testing** con Apache Bench o k6

---

## Documentación Completa

- [README.md](README.md) - Arquitectura, API endpoints, ejemplos
- [DEVELOPMENT.md](DEVELOPMENT.md) - Guía para developers, agregar idiomas, debug
- [Plan de Implementación](.claude/plans/indexed-chasing-barto.md) - Decisiones arquitectónicas

---

**Última actualización**: 2025-03-02
**Status**: ETL en background, Worker listo para testing
