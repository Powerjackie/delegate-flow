---
name: delegate-flow
description: Run a delegate-kit brief on the Workflow engine (Claude Code) for deterministic fan-out, ownership-gated parallelism, and schema-enforced returns. Use after delegate-orchestrate has classified the task and you want the work RUN — not just briefed — as a parallel batch, a research→verify pipeline, or a multi-dimension review panel. Picks engine mode (Workflow tool) vs prose fallback (any tool). Do not use to decide whether to delegate (use delegate-orchestrate) or for a single inline subagent that needs no orchestration.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Agent
  - Workflow
---

## 0) What this skill is for

`delegate-orchestrate` decides *whether/what/who*. This skill decides *how to run it*
and then runs it. You are the MAIN agent holding the runtime.

Two execution modes:

- **Engine mode** (default in Claude Code): drive a `flows/*.flow.js` through the
  `Workflow` tool. Use when there are ≥2 parallel branches, a loop, a verify pass,
  or a merge you want done in code rather than by hand.
- **Prose fallback**: when the `Workflow` tool is unavailable (OpenCode, Codex, a
  bare chat), follow `prose/RUNBOOK.md` — same briefs, same schemas, hand-merged.

## 1) Pick the flow

| If the task is… | Flow | args |
|---|---|---|
| several bounded, **non-overlapping** edits to apply at once | `fanout-execute` | `[ <executorBrief>, … ]` |
| gather evidence you must be able to trust | `research-verify` | `{parent_task, objective, questions:[…]}` |
| pre-merge audit across several quality dimensions | `review-panel` | `{parent_task, artifacts:[…], dimensions:[{key,rubric:[…]}]}` |

If none fit, author a new flow under `flows/` reusing `lib/` and rebuild — do not
hand-roll orchestration in prose when the engine is available.

## 2) Build the briefs, then run

Engine mode is two steps:

```bash
# once per change to flows/ or schemas:
node tools/build-flows.mjs        # → dist/<name>.flow.js (self-contained)
```

```
# then, from Claude Code:
Workflow({ scriptPath: "repos/delegate-flow/dist/<name>.flow.js", args: <see table> })
```

Construct `args` brief objects with the fields documented in `flows/lib/briefs.js`
(or fill `briefs/<role>.brief.md` and translate). Every Executor brief MUST carry
`file_ownership.exclusive_write` and `validation_commands`, or the builder throws.

## 3) Non-negotiables the engine enforces (so you don't have to police them)

- **Disjoint writes or serial.** `fanout-execute` refuses to dispatch executors whose
  `exclusive_write` sets overlap. If you hit the error, narrow ownership or run serially.
- **Schema-enforced returns.** Flows pass the role schema to `agent({schema})`; you
  never parse a transcript. Read the returned object's fields directly.
- **Self-contained briefs.** No "as discussed", no parent-chat references — the builders
  reject obviously-incomplete briefs; you must still keep prose self-contained.

## 4) After the run (MAIN agent responsibilities)

- Read the flow's returned object first; consult prose only if a field is ambiguous.
- Run the final sanity gate yourself (`bash tools/check.sh`, plus the project's tests)
  before reporting — a green subagent is not a green repo.
- If durable state changed, update the project `.agent-memory/HANDOVER.md`.

## 5) Relationship to the other skills

`delegate-orchestrate` (classify) → `delegate-{research,execute,review}` (write one
brief) → **`delegate-flow`** (run many, deterministically). The first three are
delegate-kit and are tool-agnostic; this one is the Claude-Code engine layer.
