// delegate-flow — brief builders.
//
// A brief is the PROTOCOL artifact (delegate-kit ships them as Markdown templates
// humans fill in). Here we compile a brief OBJECT into the self-contained prompt
// string a subagent receives. Same fields, same discipline — but now the engine
// constructs it deterministically, and the matching role schema (schemas.js) is
// attached at the call site so the return shape is enforced, not requested.
//
// Hard rules enforced here (delegate-kit §1 / SUBAGENT_PLAYBOOK §1):
//   - briefs are self-contained: no "as discussed", no parent-chat references.
//   - paths are absolute or repo-relative; never assume `cd` persists.
//   - every Executor brief carries file_ownership + validation_commands +
//     escalation_rules, or build() throws (an unverifiable brief is a broken one).

function bullets(items, indent = '  ') {
  return (items || []).map((s) => `${indent}- ${s}`).join('\n') || `${indent}- (none)`;
}

function checklist(items, indent = '  ') {
  return (items || []).map((s) => `${indent}- [ ] ${s}`).join('\n') || `${indent}- [ ] (none)`;
}

const RETURN_CONTRACT =
  'Return your result by calling the StructuredOutput tool with the role schema. ' +
  'Your final text is the return value to the orchestrator, not a message to a human — ' +
  'put all results in the structured fields, prose only where a field asks for it.';

// ----- Research -------------------------------------------------------------
export function researchBrief(b) {
  must(b, ['task_id', 'parent_task', 'objective', 'questions']);
  return [
    `task_id: ${b.task_id}`,
    `parent_task: ${b.parent_task}`,
    `subagent_role: research`,
    ``,
    `objective:`,
    `  ${b.objective}`,
    ``,
    `questions to answer:`,
    checklist(b.questions),
    ``,
    `search_scope:`,
    bullets(b.search_scope || ['(whole repo unless narrowed)']),
    ``,
    `constraints:`,
    bullets([
      'READ ONLY — make no edits, run no mutating commands.',
      'Cite evidence as path:line-range for every claim.',
      'Mark confidence high/medium/low; do not assert what you did not verify.',
      ...(b.constraints || []),
    ]),
    ``,
    RETURN_CONTRACT,
  ].join('\n');
}

// ----- Executor -------------------------------------------------------------
export function executorBrief(b) {
  must(b, ['task_id', 'parent_task', 'objective', 'acceptance_criteria', 'file_ownership', 'validation_commands']);
  const own = b.file_ownership;
  if (!own.exclusive_write || own.exclusive_write.length === 0) {
    throw new Error(`executorBrief(${b.task_id}): file_ownership.exclusive_write is required and non-empty`);
  }
  return [
    `task_id: ${b.task_id}`,
    `parent_task: ${b.parent_task}`,
    `subagent_role: executor`,
    ``,
    `objective:`,
    `  ${b.objective}`,
    ``,
    `problem_statement:`,
    `  ${b.problem_statement || b.objective}`,
    ``,
    `acceptance_criteria:`,
    checklist([...b.acceptance_criteria, 'All listed validation commands pass.']),
    ``,
    `file_ownership:`,
    `  exclusive_write:`,
    bullets(own.exclusive_write, '    '),
    `  read_only_allowed:`,
    bullets(own.read_only_allowed || ['(repo, read-only)'], '    '),
    `  forbidden:`,
    bullets(own.forbidden || ['everything not listed above — VERSION, migrations, .env, secrets/**, unrelated tests'], '    '),
    ``,
    `scope:`,
    `  you_may_not:`,
    bullets(b.you_may_not || [
      'modify public API names, exported types, or schemas',
      'introduce new dependencies',
      'reformat unrelated code',
      'bump versions, tag, push, merge',
    ], '    '),
    `  you_must:`,
    bullets(b.you_must || [
      'keep the diff minimal',
      'preserve existing behavior except where acceptance_criteria require change',
      'add or update tests for new behavior',
      'never delete tests to make work pass',
    ], '    '),
    ``,
    `validation_commands:`,
    bullets(b.validation_commands, '  '),
    ``,
    `escalation_rules:`,
    bullets(b.escalation_rules || [
      'If you must edit a forbidden path, STOP and report — do not edit.',
      'If validation fails twice with no progress, STOP and report — do not expand scope.',
      'If you find a related bug outside exclusive_write, list it in followups; do not fix inline.',
    ], '  '),
    ``,
    RETURN_CONTRACT,
  ].join('\n');
}

// ----- Reviewer -------------------------------------------------------------
export function reviewerBrief(b) {
  must(b, ['task_id', 'parent_task', 'artifacts', 'rubric']);
  return [
    `task_id: ${b.task_id}`,
    `parent_task: ${b.parent_task}`,
    `subagent_role: reviewer`,
    ``,
    `objective:`,
    `  ${b.objective || 'Validate the listed artifacts against the rubric. Do not fix anything.'}`,
    ``,
    `artifacts_to_review:`,
    bullets(b.artifacts),
    ``,
    `rubric (score each artifact on each dimension: pass | concern | fail):`,
    bullets(b.rubric),
    ``,
    `constraints:`,
    bullets([
      'READ ONLY — report findings, do not edit. Fixes are dispatched separately.',
      'Every score needs evidence as path:line or hunk reference.',
      'Surface conflicts between artifacts explicitly with a recommended resolution.',
      ...(b.constraints || []),
    ]),
    ``,
    RETURN_CONTRACT,
  ].join('\n');
}

function must(obj, keys) {
  const missing = keys.filter((k) => obj[k] === undefined || obj[k] === null);
  if (missing.length) {
    throw new Error(`brief missing required field(s): ${missing.join(', ')}`);
  }
}

export const BRIEFS = { research: researchBrief, executor: executorBrief, reviewer: reviewerBrief };
