#!/usr/bin/env bash
# Monitor ETL progress in real-time

echo "📊 Geocoding API - ETL Progress Monitor"
echo "========================================"
echo ""

if [ ! -f "etl.log" ]; then
    echo "❌ etl.log not found. ETL may not be running."
    exit 1
fi

# Count completed steps
completed=$(grep -c "✓ Step.*complete" etl.log)
echo "Completed steps: $completed/6"
echo ""

# Show current step
echo "Current activity:"
tail -5 etl.log | grep -v "^$"
echo ""

# File sizes
echo "Data directory sizes:"
if [ -d "etl/data/raw" ]; then
    raw_size=$(du -sh etl/data/raw 2>/dev/null | awk '{print $1}')
    echo "  Raw data:       $raw_size"
fi

if [ -d "etl/data/processed" ]; then
    processed_size=$(du -sh etl/data/processed 2>/dev/null | awk '{print $1}')
    echo "  Processed data: $processed_size"
fi

echo ""

# Elasticsearch indices
echo "Elasticsearch indices:"
curl -s -u elastic:'U3TGKEHPJrzOyjT8lFa3iN69r9WbvB9y' \
    http://elasticsearch-vgo88gk400s4osw4csso8koc.46.183.118.221.sslip.io/_cat/indices/geo_*?v \
    2>/dev/null | head -10 || echo "  (Elasticsearch not ready yet)"

echo ""
echo "To follow logs live, run:"
echo "  tail -f etl.log"
echo ""
echo "To check for errors:"
echo "  grep -i error etl.log"
