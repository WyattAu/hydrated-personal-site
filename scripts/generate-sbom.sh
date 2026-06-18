#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="${PROJECT_ROOT}/.specs/01_5_supply_chain"
OUTPUT_FILE="${OUTPUT_DIR}/sbom.spdx.json"

mkdir -p "$OUTPUT_DIR"

SPDX_VERSION="SPDX-2.3"
DOCUMENT_NAMESPACE="https://github.com/hydrated-personal-site/sbom/$(date +%Y%m%d)"
CREATION_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

cat > "$OUTPUT_FILE" << 'HEADER'
{
  "spdxVersion": "SPDX-2.3",
  "dataLicense": "CC0-1.0",
  "SPDXID": "SPDXRef-DOCUMENT",
  "name": "hydrated-personal-site",
  "documentNamespace": "PLACEHOLDER_NS",
  "creationInfo": {
    "created": "PLACEHOLDER_TIME",
    "creators": ["Tool: generate-sbom.sh"],
    "licenseListVersion": "3.21"
  },
  "packages": [
    {
      "SPDXID": "SPDXRef-Package",
      "name": "hydrated-personal-site",
      "versionInfo": "0.0.0",
      "supplier": "NOASSERTION",
      "downloadLocation": "https://github.com/hydrated-personal-site",
      "filesAnalyzed": false,
      "checksums": [
        {
          "algorithm": "SHA256",
          "checksumValue": "NOASSERTION"
        }
      ],
      "licenseConcluded": "NOASSERTION",
      "licenseDeclared": "NOASSERTION",
      "copyrightText": "NOASSERTION"
    }
  ],
  "relationships": []
}
HEADER

sed -i "s|PLACEHOLDER_NS|${DOCUMENT_NAMESPACE}|g" "$OUTPUT_FILE"
sed -i "s|PLACEHOLDER_TIME|${CREATION_TIME}|g" "$OUTPUT_FILE"

# Collect npm/bun packages
echo "Collecting npm/bun packages..."
cd "$PROJECT_ROOT"
if command -v bun &> /dev/null; then
  BUN_LIST=$(bun pm ls --json 2>/dev/null || echo "[]")
elif command -v npm &> /dev/null; then
  BUN_LIST=$(npm ls --json --all 2>/dev/null || echo "[]")
else
  BUN_LIST="[]"
fi

# Collect Cargo packages
echo "Collecting Cargo packages..."
CARGO_JSON="[]"
if command -v cargo &> /dev/null && [ -f "${PROJECT_ROOT}/packages/widgets/Cargo.toml" ]; then
  cd "${PROJECT_ROOT}/packages/widgets"
  CARGO_JSON=$(cargo metadata --format-version 1 --no-deps 2>/dev/null || echo '{"packages":[]}')
fi

echo "SBOM generation complete. Output: $OUTPUT_FILE"
