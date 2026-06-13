<!--
Research brief template (protocol layer). READ ONLY. In engine mode, built by
flows/lib/briefs.js::researchBrief; in prose mode, paste schemas/research.schema.json.
-->
task_id: <slug-YYYYMMDD-N>
parent_task: <one-sentence goal in the MAIN agent's terms>
subagent_role: research

objective: |
  <what to find out, 1-3 lines>

questions to answer:
  - [ ] <question 1>
  - [ ] <question 2>

search_scope:
  - <dir / glob to focus on; or "whole repo unless narrowed">

constraints:
  - READ ONLY — make no edits, run no mutating commands.
  - Cite evidence as path:line-range for every claim.
  - Mark confidence high/medium/low; do not assert what you did not verify.

# Return: schemas/research.schema.json (exactly one fenced JSON block).
# In engine mode, research-verify.flow.js will independently re-check each finding.
