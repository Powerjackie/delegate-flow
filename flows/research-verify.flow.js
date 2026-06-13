export const meta = {
  name: 'research-verify',
  description: 'Read-only research, then adversarially verify each key finding before trusting it',
  phases: [
    { title: 'Research', detail: 'one read-only Researcher gathers evidence-cited findings' },
    { title: 'Verify', detail: 'an independent skeptic tries to refute each finding; survivors are kept' },
  ],
}
// @uses lib/schemas.js lib/briefs.js
import { researchSchema } from './lib/schemas.js'
import { researchBrief } from './lib/briefs.js'

// args: { task_id?, parent_task, objective, questions:[...], search_scope?:[...] }
// Accept either an object or a JSON-encoded string (some callers stringify args).
let a = args ?? {}
if (typeof a === 'string') { try { a = JSON.parse(a) } catch { /* reported below */ } }
if (!a || !a.objective || !a.questions) {
  throw new Error(`research-verify: pass args={parent_task, objective, questions:[...]}. Received typeof args=${typeof args}.`)
}
const task_id = a.task_id ?? 'research-verify'

phase('Research')
const found = await agent(
  researchBrief({
    task_id,
    parent_task: a.parent_task ?? a.objective,
    objective: a.objective,
    questions: a.questions,
    search_scope: a.search_scope,
  }),
  { label: `research:${task_id}`, phase: 'Research', schema: researchSchema },
)

phase('Verify')
// Each finding is independently attacked. A skeptic that refutes (or can't reproduce the
// evidence) demotes the finding. This is the delegate-flow value-add over a bare research
// brief: the engine forces verification instead of trusting a single pass.
const verdictSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    claim: { type: 'string' },
    holds: { type: 'boolean', description: 'true only if the cited evidence actually supports the claim' },
    reason: { type: 'string' },
    corrected_evidence: { type: 'array', items: { type: 'string' }, default: [] },
  },
  required: ['claim', 'holds', 'reason'],
}
const verified = await parallel(
  found.key_findings.map((f) => () =>
    agent(
      [
        `task_id: ${task_id}-verify`,
        `subagent_role: reviewer (verification)`,
        ``,
        `A prior read-only investigation produced this finding:`,
        `  claim: ${f.claim}`,
        `  evidence: ${JSON.stringify(f.evidence)}`,
        `  stated confidence: ${f.confidence}`,
        ``,
        `Independently verify it. Open the cited files at the cited lines. Default to holds=false`,
        `unless the evidence plainly supports the claim. If the evidence is wrong but the claim`,
        `is still true via other evidence, set holds=true and supply corrected_evidence.`,
        `Do not edit anything. Return the verdict schema.`,
      ].join('\n'),
      { label: `verify:${f.claim.slice(0, 32)}`, phase: 'Verify', schema: verdictSchema },
    ).then((v) => ({ finding: f, verdict: v })),
  ),
)

const ok = verified.filter(Boolean)
return {
  task_id,
  summary: found.summary,
  confirmed: ok.filter((x) => x.verdict.holds).map((x) => ({
    claim: x.finding.claim,
    evidence: x.verdict.corrected_evidence?.length ? x.verdict.corrected_evidence : x.finding.evidence,
    confidence: x.finding.confidence,
  })),
  refuted: ok.filter((x) => !x.verdict.holds).map((x) => ({ claim: x.finding.claim, reason: x.verdict.reason })),
  gaps: found.gaps,
  followups: found.followups,
}
