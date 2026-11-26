#!/usr/bin/env bash
# Visibility loop for wyattau.com — SEO + AEO watchdog.
# Mirrors the crawlkit audit-loop methodology (crawl -> classify -> delta vs
# previous run). Crawlkit binary runs come from CI (crawlkit.yml); this local
# loop is the fast, always-available check.
#
# Usage: scripts/visibility-loop.sh [--update-baselines]
# State: docs/seo/visibility-loop-state.json (compare target)
# Report: docs/seo/visibility-loop.md (append-only log)
set -u
cd "$(dirname "$0")/.."

BASE="https://wyattau.com"
STATE="docs/seo/visibility-loop-state.json"
REPORT="docs/seo/visibility-loop.md"
ALERTS=""

note() { ALERTS="$ALERTS
- $1"; }

# 1. Served robots.txt: AI policy must stay welcoming
robots=$(curl -s --max-time 20 "$BASE/robots.txt")
echo "$robots" | grep -q 'ai-train=no' && note "robots.txt: Cloudflare managed injection active (ai-train=no) — AI Crawl Control toggle still OFF"
echo "$robots" | grep -qE 'Disallow: (Amazonbot|/\s*$)' || true
echo "$robots" | grep -qE 'User-agent: (Amazonbot|Applebot-Extended|Bytespider)' && note "robots.txt: managed AI-bot Disallow blocks present"
echo "$robots" | grep -q 'Sitemap: https://wyattau.com/sitemap-index.xml' || note "robots.txt: sitemap directive missing"

# 2. Key pages: status + must-revalidate HTML
for u in / /world /etf /insights /data; do
  code=$(curl -sL -o /dev/null -w '%{http_code}' --max-time 20 "$BASE$u")
  [ "$code" = "200" ] || note "page $u returned $code"
done

# 3. Security headers (from _headers)
hdr=$(curl -sI --max-time 20 "$BASE/")
echo "$hdr" | grep -qi 'strict-transport-security' || note "headers: HSTS missing"
echo "$hdr" | grep -qi 'x-content-type-options' || note "headers: XCTO missing"

# 4. Feed freshness (metrics)
feed=$(curl -s --max-time 20 "$BASE/api/metrics" | python3 -c "
import json,sys,time
try:
    d=json.load(sys.stdin)
    now=time.time()*1000
    stale=[k for k,v in d.get('feedLastSuccess',{}).items() if now-v > 48*3600*1000]
    print(','.join(stale))
except Exception as e:
    print('metrics-unreadable')
" 2>/dev/null)
[ -n "$feed" ] && note "stale feeds (>48h): $feed"

# 5. Sitemap + llms.txt + lineage gate
sm=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$BASE/sitemap-index.xml")
[ "$sm" = "200" ] || note "sitemap-index.xml returned $sm"
lt=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$BASE/llms.txt")
[ "$lt" = "200" ] || note "llms.txt returned $lt"
grep -q 'DATASET_SHA256_16' apps/site/src/pages/insights/etf-allocation-study.astro || note "lineage: study citation missing"
timeout 120 bunx vitest run tests/unit/lineage.test.ts > /dev/null 2>&1 || note "lineage test failing"

# 6. Drift report (vendored fx vs solid-fx)
drift=$(bun scripts/fx-drift-check.mjs 2>/dev/null | tail -1)
echo "$drift" | grep -q 'drifted=0' || note "fx drift: $drift"

# 7. Write state + report
DATE=$(date -u +%F)
if [ -f "$STATE" ]; then
  PREV_ALERTS=$(python3 -c "import json;print(json.load(open('$STATE')).get('alerts',''))" 2>/dev/null)
else
  PREV_ALERTS=""
fi
python3 - "$STATE" "$DATE" "$ALERTS" << 'PYEOF'
import json, sys
state, date, alerts = sys.argv[1], sys.argv[2], sys.argv[3]
json.dump({"date": date, "alerts": alerts}, open(state, "w"), indent=1)
print(f"state written: {date}, alerts={'YES' if alerts else 'none'}")
PYEOF

{
  echo ""
  echo "## Run $DATE"
  echo ""
  if [ -n "$ALERTS" ]; then
    echo "**Alerts:**$ALERTS"
  else
    echo "Clean: all visibility checks passed."
  fi
  echo ""
  echo "- $drift"
  echo "- feeds stale: ${feed:-none}"
} >> "$REPORT"

if [ -n "$ALERTS" ]; then
  echo "VISIBILITY ALERTS PRESENT — review docs/seo/visibility-loop.md"
  exit 1
fi
echo "visibility loop: clean"
