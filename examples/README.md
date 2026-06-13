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
