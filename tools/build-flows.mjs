#!/usr/bin/env node
// delegate-flow — flow bundler.
//
// WHY: Workflow-engine scripts are self-contained — the engine does NOT resolve
// `import` against the filesystem. We author flows DRY (importing from flows/lib/)
// and bundle them into single-file scripts ready to hand to the Workflow tool via
// `scriptPath: dist/<name>.flow.js`.
//
// HOW: each flow declares its deps with a `// @uses lib/a.js lib/b.js` line. The
// bundler inlines those files (stripping import/export keywords) RIGHT AFTER the
// `export const meta = {...}` block — which the engine requires to be first — then
// appends the flow body with its own import lines removed.
//
// Usage: node tools/build-flows.mjs   (writes dist/*.flow.js)

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const flowsDir = join(root, 'flows')
const distDir = join(root, 'dist')
mkdirSync(distDir, { recursive: true })

const stripModuleKeywords = (src) =>
  src
    .split('\n')
    .filter((l) => !/^\s*import\s.+from\s.+$/.test(l)) // drop import statements
    .filter((l) => !/^\s*export\s*\{[^}]*\}\s*;?\s*$/.test(l)) // drop `export { ... }`
    .map((l) => l.replace(/^(\s*)export\s+(const|function|class|let|var)\b/, '$1$2'))
    .join('\n')

function splitAfterMeta(src) {
  const lines = src.split('\n')
  // meta block ends at the first line that is exactly `}` (closing the object literal).
  let close = -1
  for (let i = 0; i < lines.length; i++) {
    if (/^}\s*;?\s*$/.test(lines[i])) { close = i; break }
  }
  if (close === -1) throw new Error('could not find end of `export const meta = {...}` block')
  const head = lines.slice(0, close + 1).join('\n')
  const body = lines
    .slice(close + 1)
    .filter((l) => !/^\s*import\s.+from\s.+$/.test(l))
    .filter((l) => !/^\s*\/\/\s*@uses\b/.test(l))
    .join('\n')
  return { head, body }
}

const built = []
for (const file of readdirSync(flowsDir).filter((f) => f.endsWith('.flow.js'))) {
  const src = readFileSync(join(flowsDir, file), 'utf8')
  const usesLine = src.split('\n').find((l) => /^\s*\/\/\s*@uses\b/.test(l)) || ''
  const deps = usesLine.replace(/^\s*\/\/\s*@uses\s*/, '').trim().split(/\s+/).filter(Boolean)
  const libCode = deps
    .map((d) => `// ---- inlined ${d} ----\n` + stripModuleKeywords(readFileSync(join(flowsDir, d), 'utf8')))
    .join('\n\n')
  const { head, body } = splitAfterMeta(src)
  const out = `${head}\n\n${libCode}\n${body}\n`
  writeFileSync(join(distDir, file), out)
  built.push(file)
}
console.log(`bundled ${built.length} flow(s) → dist/: ${built.join(', ')}`)
