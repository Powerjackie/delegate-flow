// delegate-flow — canonical role output schemas (JSON Schema, draft 2020-12).
//
// THIS FILE IS THE SOURCE OF TRUTH for both layers:
//   - the runtime layer (flows/*.flow.js) imports these objects and passes them
//     to Workflow's `agent({ schema })` — validation happens at the tool layer,
//     so a subagent that returns the wrong shape is retried by the engine, not
//     parsed-by-hand by the main agent.
//   - the protocol / prose-fallback layer (schemas/*.json) is GENERATED from this
//     file via `tools/gen-schemas.mjs`, so cross-tool consumers read identical
//     contracts. Run `tools/check.sh` to detect drift.
//
// Field lineage: every role schema is `base` (the delegate-kit universal envelope)
// merged with role-specific fields. The envelope is intentionally byte-identical
// to delegate-kit's §5 universal output schema so a delegate-kit brief and a
// delegate-flow flow are interchangeable.

const ENVELOPE_PROPS = {
  task_id: { type: 'string', description: 'short stable id, echoed from the brief' },
  status: { enum: ['done', 'blocked', 'partially_done'] },
  summary: { type: 'string', description: 'one-paragraph plain-text summary' },
  risks: { type: 'array', items: { type: 'string' }, default: [] },
  followups: { type: 'array', items: { type: 'string' }, default: [] },
  blocked_on: { type: 'string', description: 'populated only when status=blocked, else ""' },
};
const ENVELOPE_REQUIRED = ['task_id', 'status', 'summary', 'risks', 'followups', 'blocked_on'];

// Compose base envelope + role extension into one schema object.
function role(extraProps, extraRequired = []) {
  return {
    type: 'object',
    additionalProperties: false,
    properties: { ...ENVELOPE_PROPS, ...extraProps },
    required: [...ENVELOPE_REQUIRED, ...extraRequired],
  };
}

export const baseSchema = role({}, []);

export const researchSchema = role(
  {
    key_findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          claim: { type: 'string', description: 'one-line finding' },
          evidence: { type: 'array', items: { type: 'string' }, description: 'path:line-range refs' },
          confidence: { enum: ['high', 'medium', 'low'] },
        },
        required: ['claim', 'evidence', 'confidence'],
      },
    },
    gaps: { type: 'array', items: { type: 'string' }, default: [] },
  },
  ['key_findings'],
);

export const executorSchema = role(
  {
    changed_files: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          path: { type: 'string' },
          change: { type: 'string', description: 'one-line description of what changed' },
        },
        required: ['path', 'change'],
      },
    },
    tests_run: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          command: { type: 'string' },
          result: { enum: ['pass', 'fail', 'not_run'] },
          log_excerpt: { type: 'string', description: 'last ~10 lines if fail, else ""' },
        },
        required: ['command', 'result', 'log_excerpt'],
      },
    },
    acceptance_check: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          criterion: { type: 'string', description: 'verbatim from brief' },
          met: { enum: ['yes', 'no', 'partial'] },
          evidence: { type: 'string', description: 'file:line or test name' },
        },
        required: ['criterion', 'met', 'evidence'],
      },
    },
  },
  ['changed_files', 'tests_run', 'acceptance_check'],
);

export const reviewerSchema = role(
  {
    recommendation: { enum: ['approve', 'request_changes', 'block'] },
    recommendation_reason: { type: 'string' },
    scorecard: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          artifact: { type: 'string', description: 'ref from brief' },
          dimension: { type: 'string', description: 'from rubric' },
          score: { enum: ['pass', 'concern', 'fail'] },
          evidence: { type: 'string', description: 'path:line or hunk ref' },
          note: { type: 'string' },
        },
        required: ['artifact', 'dimension', 'score', 'evidence', 'note'],
      },
    },
    conflicts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          field_or_decision: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          recommendation: { type: 'string' },
        },
        required: ['field_or_decision', 'options', 'recommendation'],
      },
      default: [],
    },
  },
  ['recommendation', 'recommendation_reason', 'scorecard'],
);

export const SCHEMAS = {
  base: baseSchema,
  research: researchSchema,
  executor: executorSchema,
  reviewer: reviewerSchema,
};
