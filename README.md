# delegate-flow

[![check](https://github.com/Powerjackie/delegate-flow/actions/workflows/check.yml/badge.svg)](https://github.com/Powerjackie/delegate-flow/actions/workflows/check.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![runtime for](https://img.shields.io/badge/runtime%20for-delegate--kit-blue)](https://github.com/Powerjackie/delegate-kit)
[![engine](https://img.shields.io/badge/engine-Claude%20Code%20Workflow-8A2BE2)](https://docs.claude.com/en/docs/claude-code)
[![portable](https://img.shields.io/badge/portable-OpenCode%20%C2%B7%20Codex%20%C2%B7%20any%20agent-2ea44f)](prose/RUNBOOK.md)
![status: v0.1](https://img.shields.io/badge/status-v0.1-orange)

**A deterministic, multi-tool runtime for delegated subagent work.** delegate-flow takes a
tool-agnostic *protocol* — self-contained briefs, file-ownership contracts, role output
schemas (defined by our companion project
[delegate-kit](https://github.com/Powerjackie/delegate-kit)) — and runs it two ways: a
deterministic **engine** on Claude Code, and a **portable** mode on any other agent tool.
Either way the rules are enforced by structure, not by hoping the main agent follows a
convention by hand.

> The protocol answers *what to say to a subagent*.
> delegate-flow answers *how to run a fleet of them — deterministically where it can,
> portably everywhere else.*

## The two-layer model

| Layer | Owns | Where it lives | Failure it prevents |
|---|---|---|---|
| **Protocol** (from delegate-kit) | brief fields, `file_ownership`, role JSON schema, escalation rules | `briefs/`, `schemas/` | context loss, output-shape ambiguity, write conflicts |
| **Runtime** (delegate-flow adds) | loops, parallel/pipeline fan-out, ownership gating, schema-enforced returns, resume, budget | `flows/` | "soft" rules the model silently skips; unverifiable merges; wasted wall-clock |

Same briefs, two ways to execute them:

- **Engine mode** — Claude Code's `Workflow` tool runs a `flows/*.flow.js` script.
  Control flow is JavaScript: the disjoint-ownership check *refuses* unsafe parallelism,
  `agent({schema})` *enforces* the return shape at the tool layer, and merges are code,
  not hand-parsing.
- **Portable mode** — the same briefs and schemas drive any other tool (OpenCode, Codex,
  a bare chat) via [`prose/RUNBOOK.md`](prose/RUNBOOK.md). It trades the engine's
  determinism for universal portability; the protocol and contracts are identical.

### Supported tools

| Tool | Mode | What you get |
|---|---|---|
| **Claude Code** | engine (`Workflow`) | full determinism — ownership gating, schema-enforced returns, resume, budget |
| **OpenCode · Codex · any agent / bare chat** | portable (`prose/RUNBOOK.md`) | the same briefs, schemas, and contracts, run by hand — portability over determinism |

Only the *engine* is Claude-Code-specific; the protocol layer (`briefs/`, `schemas/`) and
the contracts are tool-agnostic, so a brief written for one tool runs on the other.

## Why this is more than either half

The protocol's rules are *soft* by design — enforced only by the model's compliance. In
engine mode, delegate-flow makes three of them *executable*:

1. **Parallel safety.** Protocol: "run in parallel only if `exclusive_write` sets are
   disjoint." delegate-flow: [`lib/ownership.js`](flows/lib/ownership.js) computes
   disjointness and `fanout-execute` **throws** rather than dispatch an overlapping batch.
2. **Output shape.** Protocol: "every subagent MUST return this JSON." delegate-flow:
   the schema is passed to `agent({schema})`, so a wrong shape is *retried by the
   engine* — the main agent never parses a transcript.
3. **Verification.** Protocol: trust a returned research finding. delegate-flow:
   `research-verify` spawns an independent skeptic per finding and **drops the unverified
   ones**.

(In portable mode the same three rules hold, enforced by the operator following
[`prose/RUNBOOK.md`](prose/RUNBOOK.md) rather than by the engine.)

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

## Quickstart (portable mode — any other tool)

No build step, no `Workflow` tool. Open [`prose/RUNBOOK.md`](prose/RUNBOOK.md), fill a
template from [`briefs/`](briefs/), paste the matching contract from
[`schemas/`](schemas/) into the brief, and dispatch the subagent in OpenCode, Codex, or a
bare chat. You gate ownership and merge the returned JSON by hand, following the runbook —
same protocol, no engine required.

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

## Two-layer toolchain

delegate-kit and delegate-flow are companion projects that split one job across two layers.
**delegate-kit** owns the tool-agnostic *protocol* — brief fields, `file_ownership`, role
schemas. **delegate-flow** owns *execution* — a deterministic engine on Claude Code plus a
portable mode for every other tool. They share one contract: when a brief field or the
output envelope changes in delegate-kit, mirror it in `flows/lib/schemas.js` /
`flows/lib/briefs.js` and run `tools/check.sh` to catch drift.

## License

MIT — see [LICENSE](LICENSE).
