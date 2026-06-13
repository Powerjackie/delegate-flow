<!--
Executor brief template (protocol layer). Fill every field. In engine mode, the
equivalent object is built by flows/lib/briefs.js::executorBrief and validated; in
prose mode, paste schemas/executor.schema.json and demand that exact return shape.
A brief without file_ownership.exclusive_write + validation_commands is BROKEN.
-->
task_id: <slug-YYYYMMDD-N>
parent_task: <one-sentence goal in the MAIN agent's terms>
subagent_role: executor

objective: |
  <what specific change to make, 1-3 lines>

problem_statement: |
  <the bug or gap, with a concrete repro or symptom>

acceptance_criteria:
  - [ ] <criterion 1 — must be testable>
  - [ ] <criterion 2>
  - [ ] All listed validation commands pass.

file_ownership:
  exclusive_write:
    - <narrow path or glob — NOT src/**>
  read_only_allowed:
    - <path you may read but not edit>
  forbidden:
    - <VERSION, migrations, .env, secrets/**, unrelated tests, public contracts>

scope:
  you_may_not:
    - modify public API names, exported types, or schemas
    - introduce new dependencies
    - reformat unrelated code
    - bump versions, tag, push, merge
  you_must:
    - keep the diff minimal
    - preserve existing behavior except where acceptance_criteria require change
    - add or update tests for new behavior
    - never delete tests to make work pass

validation_commands:
  - <repo-relative, e.g. `pytest tests/<module> -q`>

escalation_rules:
  - If you must edit a forbidden path, STOP and report — do not edit.
  - If validation fails twice with no progress, STOP and report — do not expand scope.
  - If you find a related bug outside exclusive_write, list it in followups; do not fix inline.

# Return: schemas/executor.schema.json (exactly one fenced JSON block).
