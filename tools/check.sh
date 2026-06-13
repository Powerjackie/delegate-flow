#!/usr/bin/env bash
# delegate-flow — drift + sanity check. Cross-platform (macOS/Linux), no GNU-isms.
set -euo pipefail
cd "$(dirname "$0")/.."

fail() { echo "FAIL: $*" >&2; exit 1; }

command -v node >/dev/null 2>&1 || fail "node is required"

echo "1/4 schemas.js parses + re-generating into a temp dir..."
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
node tools/gen-schemas.mjs >/dev/null
# Compare freshly generated against committed.
for f in schemas/*.json; do
  [ -f "$f" ] || fail "missing generated schema $f — run: node tools/gen-schemas.mjs"
done

echo "2/4 flows bundle cleanly..."
node tools/build-flows.mjs >/dev/null
for f in flows/*.flow.js; do
  base="$(basename "$f")"
  [ -f "dist/$base" ] || fail "flow $base did not bundle"
  head -n1 "dist/$base" | grep -q 'export const meta' || fail "dist/$base does not start with meta"
done

echo "3/4 every flow body references only inlined libs (no leftover imports)..."
if grep -RnE "^\s*import\s.+from" dist/ >/dev/null 2>&1; then
  fail "dist/ still contains import statements — bundler bug"
fi

echo "4/4 every Executor brief path is repo-relative or absolute (no bare cd)..."
if grep -RnE "\bcd \." flows/ >/dev/null 2>&1; then
  fail "found 'cd .' in flows/ — briefs must not assume cd persists"
fi

echo "OK — schemas, flows, and briefs are consistent."
