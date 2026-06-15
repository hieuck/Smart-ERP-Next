#!/bin/sh
# Smart ERP Next — Health Check
# Usage: ./scripts/health-check.sh
set -e

API_URL="${API_URL:-http://localhost:3456}"
WEB_URL="${WEB_URL:-http://localhost:3457}"
ALL_PASS=0

check() {
  label="$1"
  url="$2"
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null || echo "000")
  if [ "$code" = "200" ] || [ "$code" = "302" ]; then
    echo "  ✅ $label ($code)"
  else
    echo "  ❌ $label ($code)"
    ALL_PASS=1
  fi
}

echo "Smart ERP Next — Health Check"
echo "=============================="
echo ""
echo "API:  $API_URL"
echo "Web:  $WEB_URL"
echo ""

check "API /health"       "$API_URL/health"
check "API /health/ready"  "$API_URL/health/ready"
check "API /health/live"   "$API_URL/health/live"
check "Web /login"         "$WEB_URL/login"

echo ""
if [ "$ALL_PASS" = "0" ]; then
  echo "✅ All services healthy"
else
  echo "❌ Some services unhealthy"
fi
exit $ALL_PASS
