#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

if [ -f "${PROJECT_ROOT}/monitoring.json" ]; then
  CONFIG="${PROJECT_ROOT}/monitoring.json"
else
  echo "ERROR: monitoring.json not found"
  exit 1
fi

check_endpoint() {
  local name="$1"
  local url="$2"
  local timeout="$3"

  local start_time
  start_time=$(date +%s%N)

  local http_code
  http_code=$(curl -s -o /dev/null -w '%{http_code}' --max-time "$timeout" "$url" 2>/dev/null || echo "000")

  local end_time
  end_time=$(date +%s%N)
  local duration_ms=$(( (end_time - start_time) / 1000000 ))

  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 400 ]; then
    echo "PASS ${name}: HTTP ${http_code} (${duration_ms}ms)"
    return 0
  else
    echo "FAIL ${name}: HTTP ${http_code} (${duration_ms}ms)"
    return 1
  fi
}

echo "=== Health Check ==="
echo "Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

FAILED=0

while IFS= read -r check; do
  name=$(echo "$check" | jq -r '.name')
  url=$(echo "$check" | jq -r '.url')
  timeout=$(echo "$check" | jq -r '.timeout // 10')

  if ! check_endpoint "$name" "$url" "$timeout"; then
    FAILED=$((FAILED + 1))
  fi
done < <(jq -c '.healthChecks[]' "$CONFIG")

echo ""
if [ "$FAILED" -gt 0 ]; then
  echo "FAILED: ${FAILED} endpoint(s) unhealthy"
  exit 1
else
  echo "PASSED: All endpoints healthy"
  exit 0
fi
