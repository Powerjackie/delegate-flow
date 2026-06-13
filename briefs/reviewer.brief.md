<!--
Reviewer brief template (protocol layer). READ ONLY — report, do not fix. In engine
mode, built by flows/lib/briefs.js::reviewerBrief; in prose mode, paste
schemas/reviewer.schema.json. Fixes are dispatched separately as executor briefs.
-->
task_id: <slug-YYYYMMDD-N>
parent_task: <one-sentence goal in the MAIN agent's terms>
subagent_role: reviewer

objective: |
  Validate the listed artifacts against the rubric. Do not fix anything.

artifacts_to_review:
  - <path / PR / diff / design-doc ref>

rubric (score each artifact on each dimension: pass | concern | fail):
  - <dimension 1, e.g. correctness: does it do what acceptance_criteria require?>
  - <dimension 2, e.g. safety: input validation, error handling, no secrets leaked>
  - <dimension 3, e.g. tests: coverage of the new behavior, no deleted tests>

constraints:
  - READ ONLY — report findings, do not edit.
  - Every score needs evidence as path:line or hunk reference.
  - Surface conflicts between artifacts explicitly with a recommended resolution.

# Return: schemas/reviewer.schema.json (exactly one fenced JSON block).
# In engine mode, review-panel.flow.js runs one reviewer PER dimension and merges.
