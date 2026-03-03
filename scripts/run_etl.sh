#!/usr/bin/env bash
# ETL Pipeline Runner
# Requires: Node.js 22+, ES_URL and ES_API_KEY environment variables

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check environment variables
if [ -z "${ES_URL:-}" ]; then
  echo -e "${RED}Error: ES_URL environment variable is not set${NC}"
  echo "Usage: ES_URL=https://... ES_API_KEY=... bash scripts/run_etl.sh"
  exit 1
fi

if [ -z "${ES_API_KEY:-}" ]; then
  echo -e "${RED}Error: ES_API_KEY environment variable is not set${NC}"
  echo "Usage: ES_URL=https://... ES_API_KEY=... bash scripts/run_etl.sh"
  exit 1
fi

echo -e "${GREEN}🚀 Starting geocoding ETL pipeline${NC}\n"
echo "Elasticsearch URL: $ES_URL"
echo ""

# Change to ETL directory
cd "$(dirname "$0")/../etl"

# Check dependencies
if ! command -v node &> /dev/null; then
  echo -e "${RED}Error: Node.js is not installed${NC}"
  exit 1
fi

if ! command -v npm &> /dev/null; then
  echo -e "${RED}Error: npm is not installed${NC}"
  exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}Installing dependencies...${NC}"
  npm install
  echo ""
fi

# Run the pipeline
npm run etl

# Check final status
if [ $? -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✅ ETL pipeline completed successfully${NC}"
  echo ""
  echo "Index statistics:"
  curl -s -H "Authorization: ApiKey $ES_API_KEY" \
    "${ES_URL}/_cat/indices/geo_*?v&h=index,docs.count,store.size" 2>/dev/null || echo "  (unable to fetch stats)"
else
  echo -e "${RED}❌ ETL pipeline failed${NC}"
  exit 1
fi
