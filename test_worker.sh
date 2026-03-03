#!/usr/bin/env bash

cd C:/Users/Eric/geocoding-api/worker

echo "📋 GEOCODING API - WORKER TEST SCRIPT"
echo "===================================="
echo ""

# Kill previous instances
echo "Stopping previous instances..."
ps aux | grep "wrangler dev" | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null
sleep 2

# Start worker with environment variables
echo "Starting Worker dev server..."
ES_URL="http://elasticsearch-vgo88gk400s4osw4csso8koc.46.183.118.221.sslip.io" \
ES_USERNAME="elastic" \
ES_PASSWORD="U3TGKEHPJrzOyjT8lFa3iN69r9WbvB9y" \
ES_INDEX_PREFIX="geo_" \
DEFAULT_LANG="es" \
npm run dev > worker_test.log 2>&1 &

WORKER_PID=$!
echo "✓ Worker started (PID: $WORKER_PID)"
echo ""

# Wait for server to start
echo "Waiting for server to start (15 seconds)..."
sleep 15

echo ""
echo "📡 TESTING API ENDPOINTS"
echo "======================="
echo ""

# Test 1: Root endpoint
echo "1️⃣  GET / - API Info"
echo "---"
curl -s http://localhost:8787/ | head -c 300
echo ""
echo ""

# Test 2: Health endpoint
echo "2️⃣  GET /health - Elasticsearch Health"
echo "---"
curl -s http://localhost:8787/health | head -c 300
echo ""
echo ""

# Test 3: Reverse geocoding
echo "3️⃣  GET /reverse?lat=-43.9&lon=171.5&lang=es"
echo "---"
curl -s "http://localhost:8787/reverse?lat=-43.9&lon=171.5&lang=es" | head -c 300
echo ""
echo ""

echo "✅ Tests complete!"
echo ""
echo "Worker is running on: http://localhost:8787"
echo "Press Ctrl+C to stop"
