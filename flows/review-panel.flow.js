export const meta = {
  name: 'review-panel',
  description: 'One Reviewer per rubric dimension in parallel, then merge scorecards and surface conflicts',
  phases: [
    { title: 'Review', detail: 'each dimension reviewed independently for diverse coverage' },
    { title: 'Merge', detail: 'combine scorecards, resolve conflicts, compute overall recommendation' },
  ],
}
// @uses lib/schemas.js lib/briefs.js
import { reviewerSchema } from './lib/schemas.js'
import { reviewerBrief } from './lib/briefs.js'

// args: { task_id?, parent_task, artifacts:[...], dimensions:[{key, rubric:[...]}] }
const a = args ?? {}
if (!a.artifacts || !a.dimensions) throw new Error('review-panel: pass args={parent_task, artifacts:[...], dimensions:[{key,rubric:[...]}]}')
const task_id = a.task_id ?? 'review-panel'

phase('Review')
// Perspective-diverse panel: each reviewer owns ONE dimension so coverage is broad and the
// reviews are independent (no anchoring on each other's findings).
const reviews = await parallel(
  a.dimensions.map((d) => () =>
    agent(
      reviewerBrief({
        task_id: `${task_id}-${d.key}`,
        parent_task: a.parent_task ?? 'review artifacts',
        artifacts: a.artifacts,
        rubric: d.rubric,
        objective: `Score the artifacts ONLY on the "${d.key}" dimension. Ignore other dimensions.`,
      }),
      { label: `review:${d.key}`, phase: 'Review', schema: reviewerSchema },
    ),
  ),
)

phase('Merge')
const got = reviews.filter(Boolean)
const scorecard = got.flatMap((r) => r.scorecard)
const conflicts = got.flatMap((r) => r.conflicts)
// Overall recommendation = worst signal wins: any fail/block ⇒ block; any concern/request ⇒ request_changes.
const recs = got.map((r) => r.recommendation)
const hasFail = scorecard.some((s) => s.score === 'fail') || recs.includes('block')
const hasConcern = scorecard.some((s) => s.score === 'concern') || recs.includes('request_changes')
const overall = hasFail ? 'block' : hasConcern ? 'request_changes' : 'approve'

return {
  task_id,
  overall_recommendation: overall,
  by_dimension: got.map((r) => ({ task_id: r.task_id, recommendation: r.recommendation, reason: r.recommendation_reason })),
  fails: scorecard.filter((s) => s.score === 'fail'),
  concerns: scorecard.filter((s) => s.score === 'concern'),
  conflicts,
  scorecard,
  followups: got.flatMap((r) => r.followups),
}
