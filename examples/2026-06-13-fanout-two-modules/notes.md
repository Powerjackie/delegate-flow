# 2026-06-13 — fanout-two-modules

Two bounded fixes in different modules, applied at once.

## Run it

```bash
npm run build   # produces dist/fanout-execute.flow.js
```
Then from Claude Code:
```
Workflow({ scriptPath: "repos/delegate-flow/dist/fanout-execute.flow.js",
           args: <contents of args.json> })
```

## What the flow does

1. **Gate** — `assertDisjoint` checks the two `exclusive_write` sets:
   `src/auth/login.ts` vs `src/billing/charge.ts`. Disjoint → parallel dispatch proceeds.
   (If you change `auth`'s `exclusive_write` to `src/**`, the flow THROWS instead of
   risking a clobbered write — that is the point.)
2. **Execute** — two Executors run in parallel, each editing only its file, each
   returning the executor schema (changed_files / tests_run / acceptance_check).
3. **Merge** — the flow returns combined `changed_files`, plus `failing` (tasks with a
   failing test) and `unmet` (acceptance criteria not met), so the main agent reads one
   object instead of two transcripts.

## What to check in the return

- `merged.returned == 2`
- `merged.failing` is empty
- `merged.unmet` is empty
- each `changed_files[].by` attributes the edit to the right task_id

`output.json` will be captured here after the first live run (absent in v0.1).
