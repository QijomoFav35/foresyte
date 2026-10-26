#!/usr/bin/env bash
# Pulls PayBox plugin starter 1.0.4 tooling into this repo. Run from the repo root: bash scripts/update-starter.sh
# Only the starter-owned tooling is replaced. Foresyte's own src/, tests, package.json and paybox-plugin.json stay.
# src/paybox.ts is already identical to 1.0.4.
set -euo pipefail
BASE=https://developer.paybox.sh/plugin-starter/v1.0.4
for f in scripts/conformance.mjs scripts/process.mjs scripts/report.mjs scripts/schema.mjs scripts/test.mjs starter-version.json src/paybox.ts; do
  curl -fsSL "$BASE/$f.txt" -o "$f"
  echo "updated $f"
done
echo
git diff --stat
echo
echo "Now run: pnpm install && pnpm test"
