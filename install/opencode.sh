#!/usr/bin/env bash
# Install delegate-flow for OpenCode / Codex / any non-Claude-Code tool (PROSE mode).
# These tools have no Workflow engine, so they run the same briefs + schemas by hand
# per prose/RUNBOOK.md. We just generate the schema files and surface the docs.
set -euo pipefail
cd "$(dirname "$0")/.."
REPO="$(pwd)"

command -v node >/dev/null 2>&1 || { echo "node is required" >&2; exit 1; }
node tools/gen-schemas.mjs >/dev/null

echo "Prose-mode assets ready:"
echo "  schemas → $REPO/schemas/*.json   (paste into each brief)"
echo "  briefs  → $REPO/briefs/*.brief.md (templates)"
echo "  runbook → $REPO/prose/RUNBOOK.md  (the hand-merge loop)"
echo
echo "No engine here: gate parallelism and merge results yourself per the runbook."
