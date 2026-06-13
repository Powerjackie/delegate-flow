export const meta = {
  name: 'fanout-execute',
  description: 'Run N Executor subagents in parallel, gated by disjoint file-ownership, each schema-enforced',
  phases: [
    { title: 'Gate', detail: 'verify exclusive_write sets are disjoint — refuse unsafe parallelism' },
    { title: 'Execute', detail: 'one Executor per brief, parallel, returning the executor schema' },
  ],
}
// @uses lib/schemas.js lib/briefs.js lib/ownership.js
import { executorSchema } from './lib/schemas.js'
import { executorBrief } from './lib/briefs.js'
import { assertDisjoint } from './lib/ownership.js'

// args: an array of Executor brief objects (see briefs.js executorBrief / briefs/executor.brief.md).
// Each must carry task_id, objective, acceptance_criteria, file_ownership.exclusive_write, validation_commands.
// Accept either a real array/object or a JSON-encoded string (some callers stringify args).
let input = args
if (typeof input === 'string') {
  try { input = JSON.parse(input) } catch { /* leave as-is; reported below */ }
}
const tickets = Array.isArray(input) ? input : (input?.tickets ?? [])
if (!tickets.length) {
  throw new Error(
    `fanout-execute: no tickets. Pass args=[<executorBrief>, ...] or {tickets:[...]}. ` +
      `Received typeof args=${typeof args}${typeof args === 'string' ? ` len=${args.length}` : ''}.`,
  )
}

phase('Gate')
// The parallel-safety primitive, made executable: refuse to dispatch overlapping writers.
assertDisjoint(tickets.map((t) => ({ id: t.task_id, exclusive_write: t.file_ownership.exclusive_write })))
log(`ownership OK — ${tickets.length} executors have disjoint write sets, dispatching in parallel`)

phase('Execute')
const results = await parallel(
  tickets.map((t) => () =>
    agent(executorBrief(t), { label: `exec:${t.task_id}`, phase: 'Execute', schema: executorSchema }),
  ),
)

const done = results.filter(Boolean)
const merged = {
  dispatched: tickets.length,
  returned: done.length,
  changed_files: done.flatMap((r) => r.changed_files.map((f) => ({ ...f, by: r.task_id }))),
  failing: done.filter((r) => r.tests_run.some((t) => t.result === 'fail')).map((r) => r.task_id),
  unmet: done.flatMap((r) =>
    r.acceptance_check.filter((a) => a.met !== 'yes').map((a) => ({ task_id: r.task_id, criterion: a.criterion, met: a.met })),
  ),
  blocked: done.filter((r) => r.status === 'blocked').map((r) => ({ task_id: r.task_id, blocked_on: r.blocked_on })),
  followups: done.flatMap((r) => r.followups),
  results: done,
}
log(`merged: ${merged.changed_files.length} files changed, ${merged.failing.length} with failing tests, ${merged.unmet.length} unmet criteria`)
return merged
