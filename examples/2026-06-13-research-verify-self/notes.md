# 2026-06-13 — research-verify against delegate-flow itself

A live run of `research-verify` over this repo's own source.

## Run it

```bash
npm run build
```
Then from Claude Code (replace `<repo>` with the absolute repo path):
```
Workflow({ scriptPath: "repos/delegate-flow/dist/research-verify.flow.js",
           args: <args.json, with <repo> substituted> })
```

## What the flow did

1. **Research** — one read-only Researcher answered the three questions with
   `path:line` citations.
2. **Verify** — one independent skeptic per finding re-opened the cited files and
   tried to refute the claim (`holds=false` by default).
3. Only `holds=true` findings landed in `confirmed`; the rest went to `refuted`.

## Why this run is a good demo

6 findings confirmed, **1 refuted**. The refuted finding asserted that `check.sh`'s
drift check was weak — the verifier re-read the file, found the `git diff` gate, and
**demoted the claim with line citations**. That is the whole point of the verify pass:
the engine gates output on independent re-checking, not on the researcher's say-so.
(The claim was stale because the drift gate had just been strengthened; the verifier
caught up to current state.)
