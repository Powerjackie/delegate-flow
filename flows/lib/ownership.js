// delegate-flow — file-ownership as the parallel-safety primitive.
//
// delegate-kit's key insight: two subagents may run concurrently IFF their
// `exclusive_write` sets are disjoint. delegate-kit states this as a rule the
// main agent must remember; here we MAKE IT EXECUTABLE — the flow refuses to
// dispatch a parallel batch whose write sets overlap, instead of trusting the
// model to have checked.
//
// Globs are compared structurally (no filesystem expansion — Workflow scripts
// have no fs). We treat two patterns as conflicting when one is a prefix of the
// other under directory semantics, or they are equal. This is deliberately
// conservative: a false "conflict" only costs you serial execution; a false
// "safe" would cost you a corrupted parallel write.

// Normalize a path/glob for comparison: strip trailing slashes, collapse a
// trailing `/**` or `/*` to the directory prefix marked as a subtree.
function normalize(p) {
  let s = String(p).trim().replace(/\/+$/, '');
  const subtree = /\/\*\*?$/.test(s);
  s = s.replace(/\/\*\*?$/, '');
  return { base: s, subtree };
}

// Does owning `a` conflict with owning `b`?
function patternsConflict(a, b) {
  const x = normalize(a);
  const y = normalize(b);
  if (x.base === y.base) return true;
  // subtree owner conflicts with anything beneath it
  const xCoversY = y.base.startsWith(x.base + '/') && (x.subtree || x.base === '');
  const yCoversX = x.base.startsWith(y.base + '/') && (y.subtree || y.base === '');
  // a glob containing * inside (not just trailing) is treated as broad → conflict
  // with any sibling under the same directory; keep it simple and conservative.
  const xWild = x.base.includes('*');
  const yWild = y.base.includes('*');
  if (xWild || yWild) {
    const xd = x.base.split('*')[0].replace(/\/[^/]*$/, '');
    const yd = y.base.split('*')[0].replace(/\/[^/]*$/, '');
    if (xd && (yd.startsWith(xd) || xd.startsWith(yd))) return true;
  }
  return xCoversY || yCoversX;
}

// Given an array of ownership blocks ({ id, exclusive_write: [glob...] }),
// return { safe: boolean, conflicts: [{a, b, pattern_a, pattern_b}] }.
export function checkDisjoint(blocks) {
  const conflicts = [];
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const A = blocks[i];
      const B = blocks[j];
      for (const pa of A.exclusive_write || []) {
        for (const pb of B.exclusive_write || []) {
          if (patternsConflict(pa, pb)) {
            conflicts.push({ a: A.id, b: B.id, pattern_a: pa, pattern_b: pb });
          }
        }
      }
    }
  }
  return { safe: conflicts.length === 0, conflicts };
}

// Convenience: throw a readable error if a batch is not parallel-safe.
export function assertDisjoint(blocks) {
  const { safe, conflicts } = checkDisjoint(blocks);
  if (!safe) {
    const lines = conflicts.map(
      (c) => `  - "${c.a}" (${c.pattern_a})  ⨯  "${c.b}" (${c.pattern_b})`,
    );
    throw new Error(
      `ownership conflict — these subagents cannot run in parallel:\n${lines.join('\n')}\n` +
        `Either narrow exclusive_write to disjoint sets, or run them serially.`,
    );
  }
}
