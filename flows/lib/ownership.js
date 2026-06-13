// delegate-flow — file-ownership as the parallel-safety primitive.
//
// delegate-kit's key insight: two subagents may run concurrently IFF their
// `exclusive_write` sets are disjoint. delegate-kit states this as a rule the
// main agent must remember; here we MAKE IT EXECUTABLE — the flow refuses to
// dispatch a parallel batch whose write sets overlap, instead of trusting the
// model to have checked.
//
// Globs are compared structurally (no filesystem expansion — Workflow scripts
// have no fs). Each pattern reduces to the literal directory PREFIX it owns; two
// patterns conflict when their prefixes are equal, one is a directory-ancestor of
// the other, or either could match anywhere (whole-tree / leading-wildcard
// tokens). This is deliberately conservative: a false "conflict" only costs you
// serial execution; a false "safe" would cost you a corrupted parallel write.

// Reduce a path/glob to the concrete directory PREFIX it owns, plus a `whole`
// flag for patterns that could match anywhere (and so conflict with everything).
//
// Conservative by construction: we keep only the literal prefix before the first
// `*`. A pattern owns its prefix and everything beneath it. Whole-tree tokens
// ('', '.', '*', '**') and any pattern whose prefix collapses to empty (e.g.
// '*.js') are treated as `whole` — they could touch any file, so they conflict
// with every other owner. Over-conservative (a false "conflict") only costs
// serial execution; a false "safe" would corrupt a parallel write.
function normalize(p) {
  let s = String(p).trim().replace(/\/+$/, '');
  if (s === '' || s === '.' || s === '*' || s === '**') return { prefix: '', whole: true };
  const star = s.indexOf('*');
  if (star === -1) return { prefix: s, whole: false };
  const prefix = s.slice(0, star).replace(/\/+$/, '');
  if (prefix === '') return { prefix: '', whole: true }; // leading wildcard: matches anywhere
  return { prefix, whole: false };
}

// Does owning `a` conflict with owning `b`? True when their owned file sets may
// intersect: either side matches anywhere, the prefixes are equal, or one prefix
// is a directory-ancestor of the other.
function patternsConflict(a, b) {
  const x = normalize(a);
  const y = normalize(b);
  if (x.whole || y.whole) return true;
  if (x.prefix === y.prefix) return true;
  if (y.prefix.startsWith(x.prefix + '/')) return true;
  if (x.prefix.startsWith(y.prefix + '/')) return true;
  return false;
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
