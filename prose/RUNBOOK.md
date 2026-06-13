# Prose fallback runbook

When the `Workflow` engine is unavailable (OpenCode, Codex, a bare chat, or any
non-Claude-Code tool), you run the **same protocol by hand**. You lose the engine's
guarantees — disjointness checking, schema-enforced retries, automatic merge — so you
take them on as discipline. This is delegate-kit's original mode, written down.

## The loop

For each subagent:

1. **Write the brief** from `briefs/<role>.brief.md`. Self-contained — no parent-chat
   references. For executors, fill `file_ownership.exclusive_write` and
   `validation_commands`; an executor brief without them is broken.
2. **Attach the contract.** Paste the matching `schemas/<role>.schema.json` into the
   brief and instruct: *"Return exactly one fenced JSON block matching this schema."*
3. **Gate parallelism yourself.** Before running two executors at once, confirm their
   `exclusive_write` sets are disjoint (no shared file, no glob covering another's
   path). If you can't confirm in one sentence, run them serially.
4. **Dispatch** the subagent.
5. **Validate the return.** Read the JSON first. If it doesn't match the schema, send
   it back — do not paper over a malformed return.

## Merging (what the flows do for you in engine mode)

- **fanout-execute** → collect each executor's `changed_files`, `tests_run`,
  `acceptance_check`. Flag any `met != yes` and any failing test before reporting done.
- **research-verify** → for each `key_findings[]` entry, run a *second, independent*
  subagent that opens the cited evidence and tries to refute the claim. Keep only
  findings that survive. Never report an unverified single-pass finding as fact.
- **review-panel** → run one reviewer per rubric dimension, concatenate `scorecard[]`,
  surface `conflicts[]`, and compute the overall recommendation as worst-signal-wins
  (any `fail`/`block` ⇒ block; any `concern`/`request_changes` ⇒ request_changes).

## When to stop using prose mode

The moment ≥3 subagents, a loop, or a verify pass appears, prose mode's hand-merge
cost dominates. If you're in Claude Code, switch to engine mode (`skills/delegate-flow`).
Prose mode exists for portability, not for scale.
