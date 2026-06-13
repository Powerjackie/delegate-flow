# delegate-flow

[![check](https://github.com/Powerjackie/delegate-flow/actions/workflows/check.yml/badge.svg)](https://github.com/Powerjackie/delegate-flow/actions/workflows/check.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![runtime for](https://img.shields.io/badge/runtime%20for-delegate--kit-blue)](https://github.com/Powerjackie/delegate-kit)
[![engine](https://img.shields.io/badge/engine-Claude%20Code%20Workflow-8A2BE2)](https://docs.claude.com/en/docs/claude-code)
![status: v0.1](https://img.shields.io/badge/status-v0.1-orange)

**A deterministic runtime for delegated subagent work.** delegate-flow takes the
*protocol* that [delegate-kit](https://github.com/Powerjackie/delegate-kit) defines
— self-contained briefs, file-ownership contracts, role output schemas — and runs
it on a real orchestration **engine** instead of trusting the main agent to follow
the convention by hand.

> delegate-kit answers *what to say to a subagent*.
> delegate-flow answers *how to run a fleet of them, deterministically*.

## The two-layer model

| Layer | Owns | Where it lives | Failure it prevents |
|---|---|---|---|
| **Protocol** (from delegate-kit) | brief fields, `file_ownership`, role JSON schema, escalation rules | `briefs/`, `schemas/` | context loss, output-shape ambiguity, write conflicts |
| **Runtime** (delegate-flow adds) | loops, parallel/pipeline fan-out, ownership gating, schema-enforced returns, resume, budget | `flows/` | "soft" rules the model silently skips; unverifiable merges; wasted wall-clock |

Same briefs, two ways to execute them:

- **Engine mode (primary)** — Claude Code's `Workflow` tool runs a `flows/*.flow.js`
  script. Control flow is JavaScript: the disjoint-ownership check *refuses* unsafe
  parallelism, `agent({schema})` *enforces* the return shape at the tool layer, and
  merges are code, not hand-parsing.
- **Prose fallback (portable)** — the same briefs and schemas drive any tool
  (OpenCode, Codex, a bare chat) via [`prose/RUNBOOK.md`](prose/RUNBOOK.md). You lose
  determinism; you keep portability. This is delegate-kit's original mode, preserved.

## Why this is more than either half

delegate-kit's own README states its rules are *soft* — "not yet validated against
production workflows," enforced only by the model's compliance. Three of its core
guarantees become *executable* here:

1. **Parallel safety.** delegate-kit: "run in parallel only if `exclusive_write`
   sets are disjoint." delegate-flow: [`lib/ownership.js`](flows/lib/ownership.js)
   computes disjointness and `fanout-execute` **throws** rather than dispatch an
   overlapping batch.
2. **Output shape.** delegate-kit: "every subagent MUST return this JSON." delegate-flow:
   the schema is passed to `agent({schema})`, so a wrong shape is *retried by the
   engine* — the main agent never parses a transcript.
3. **Verification.** delegate-kit returns a research finding; `research-verify`
   spawns an independent skeptic per finding and **drops the unverified ones**.

## Flows

| Flow | Shape | Use for |
|---|---|---|
| [`fanout-execute`](flows/fanout-execute.flow.js) | N executors in parallel, ownership-gated | apply several bounded, non-overlapping changes at once |
| [`research-verify`](flows/research-verify.flow.js) | research → adversarial verify pipeline | gather evidence you can actually trust |
| [`review-panel`](flows/review-panel.flow.js) | one reviewer per rubric dimension → merged scorecard | pre-merge audit with diverse coverage |

## Quickstart (engine mode)

```bash
npm run build            # = node tools/gen-schemas.mjs && node tools/build-flows.mjs
bash tools/check.sh      # drift + sanity gate
```

Then, inside Claude Code, hand a bundled script to the `Workflow` tool:

```
Workflow({ scriptPath: "repos/delegate-flow/dist/fanout-execute.flow.js",
           args: [ <executor brief object>, <executor brief object> ] })
```

Build the brief objects with the helpers in [`flows/lib/briefs.js`](flows/lib/briefs.js)
or fill the Markdown templates in [`briefs/`](briefs/). See
[`examples/`](examples/) for a worked run.

## Layout

```
schemas/      role JSON Schemas — GENERATED from flows/lib/schemas.js (canonical)
briefs/       Markdown brief templates (protocol layer, human-fillable)
flows/        Workflow engine scripts (runtime layer)
  lib/        schemas.js (source of truth) · briefs.js (brief→prompt) · ownership.js (parallel gate)
dist/         bundled, self-contained flows ready for the Workflow tool (generated)
prose/        RUNBOOK.md — run the same briefs on any tool, no engine
skills/       delegate-flow skill — picks engine vs prose, routes to a flow
tools/        build-flows.mjs · gen-schemas.mjs · check.sh
install/      per-platform installers
```

## Relationship to delegate-kit

delegate-flow **depends on delegate-kit as the protocol source** and does not vendor
it. When delegate-kit's brief fields or envelope change, mirror them in
`flows/lib/schemas.js` / `flows/lib/briefs.js` and run `tools/check.sh`. The split is
deliberate: delegate-kit stays tool-agnostic and portable; delegate-flow is the
Claude-Code-first engine that makes the protocol bite.

## License

MIT — see [LICENSE](LICENSE).
