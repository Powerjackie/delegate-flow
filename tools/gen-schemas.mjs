#!/usr/bin/env node
// delegate-flow — emit canonical JSON Schema files from the JS source of truth.
//
// flows/lib/schemas.js is canonical (engine-first). The prose-fallback layer and
// any cross-tool consumer read schemas/*.json. This generator keeps them in sync;
// tools/check.sh fails CI if they drift.
//
// Usage: node tools/gen-schemas.mjs   (writes schemas/*.json)

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SCHEMAS } from '../flows/lib/schemas.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'schemas')
mkdirSync(dir, { recursive: true })

const DIALECT = 'https://json-schema.org/draft/2020-12/schema'
for (const [role, schema] of Object.entries(SCHEMAS)) {
  const doc = { $schema: DIALECT, $id: `delegate-flow/${role}.schema.json`, title: `${role} output`, ...schema }
  writeFileSync(join(dir, `${role}.schema.json`), JSON.stringify(doc, null, 2) + '\n')
}
console.log(`wrote ${Object.keys(SCHEMAS).length} schema(s) → schemas/`)
