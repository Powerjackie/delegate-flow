# 2026-06-13 — review-panel finds a real bug in ownership.js

A live run of `review-panel` over this repo's own parallel-safety library. It is the
best kind of example: the tool **caught a genuine block-level defect** in the code that
the rest of delegate-flow depends on for correctness.

## Run it

```bash
npm run build
```
Then from Claude Code (replace `<repo>` with the absolute repo path):
```
Workflow({ scriptPath: "repos/delegate-flow/dist/review-panel.flow.js",
           args: <args.json, with <repo> substituted> })
```

## What the flow did

One Reviewer per rubric dimension (correctness / robustness / docs) ran in parallel,
each scoring only its dimension. The flow merged the scorecards and computed
`overall_recommendation` as worst-signal-wins.

## What it found (and why it mattered)

- **correctness + robustness → request_changes**, **overall → block.**
- The real defect: `checkDisjoint` reported `['src']` vs `['src/foo.js']` as **safe**,
  and likewise for bare `'*'`, `'**'`, `'.'`. In a parallel-write guard, a false "safe"
  is the one error that corrupts data — exactly the failure mode the file's own header
  warns against.
- docs → approve (headers were directionally right; one inaccuracy noted).

## The fix (same day)

Every reviewer follow-up was implemented:

1. `ownership.js` matcher rewritten (prefix + `whole` flag); the four false-safe cases
   now report **CONFLICT**, genuinely-disjoint sets stay safe.
2. `executorBrief` now rejects an empty `validation_commands` array.
3. `ownership.js` header rewritten to match the implemented rule.
4. `tools/test-lib.mjs` added with a regression test per false-safe case, wired into
   `tools/check.sh` and CI so it can't come back.

See [output.json](output.json) for the captured result.
