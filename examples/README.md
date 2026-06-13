# examples

Each subdirectory is one worked run: the `args` you pass to a flow, plus notes on what
the flow does with them. Convention mirrors delegate-kit's `examples/`:

```
<YYYY-MM-DD>-<slug>/
  args.json   — the value passed as the Workflow tool's `args`
  notes.md    — what the flow did, what to look for in the return
  output.json — captured return (added after a real run; may be absent in v0.1)
```

## Runs

- [`2026-06-13-fanout-two-modules`](2026-06-13-fanout-two-modules/) — two Executors with
  disjoint ownership applied in parallel via `fanout-execute`.
- [`2026-06-13-research-verify-self`](2026-06-13-research-verify-self/) — `research-verify`
  over this repo; 6 findings confirmed, 1 refuted by the verify pass.
- [`2026-06-13-review-panel-found-bug`](2026-06-13-review-panel-found-bug/) — `review-panel`
  caught a real block-level false-safe bug in `ownership.js`, since fixed with regression tests.
