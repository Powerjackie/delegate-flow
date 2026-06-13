#!/usr/bin/env bash
# Install the delegate-flow skill into Claude Code (engine mode) and build artifacts.
# Cross-platform (macOS/Linux). Windows: run under WSL.
set -euo pipefail
cd "$(dirname "$0")/.."
REPO="$(pwd)"

command -v node >/dev/null 2>&1 || { echo "node is required" >&2; exit 1; }

echo "Building schemas + flows..."
node tools/gen-schemas.mjs >/dev/null
node tools/build-flows.mjs >/dev/null

DEST="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
mkdir -p "$DEST"
ln -sfn "$REPO/skills/delegate-flow" "$DEST/delegate-flow"

echo "Installed:"
echo "  skill   → $DEST/delegate-flow  (symlink → $REPO/skills/delegate-flow)"
echo "  flows   → $REPO/dist/*.flow.js  (hand to the Workflow tool via scriptPath)"
echo
echo "Engine mode is ready. delegate-flow assumes delegate-kit is also installed for"
echo "the orchestrate/research/execute/review skills it composes with."
