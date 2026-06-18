# BRIEF — fix g-colon-shorthand-markup-misparse (MED, block-splitter)
# Dispatched S205 (2026-06-18). Agent scrml-js-codegen-engineer, isolation:worktree, opus, bg.
# Agent id: ab4fe40551c515110. change-id: g-colon-shorthand-markup-misparse-2026-06-18.

BUG: an engine state-child `:`-shorthand with a MARKUP body (`<Idle> : <button>…</button>`) confuses the
block-splitter (can't disambiguate the opener `>` from the markup-body tags) → loses logic-body
close-tracking → engine seen inside a ${} logic body → MISLEADING E-STRUCTURAL-ELEMENT-MISPLACED cascade
(blames <engine>, + E-STATE-UNDECLARED + E-VARIANT-AMBIGUOUS). Fire ast-builder.js ~8524/~11918 (SYMPTOM);
ROOT = block-splitter mis-tracking. Bare-body children clear it.

SCOPE: block-splitter.js (+ maybe engine-statechild-parser.ts). MUST NOT touch type-system.ts /
symbol-table.ts (g-engine-autodecl agent) or examples/23-trucking-dispatch/* (slice-2 agent).

Rule 4 + Rule 3: read §4.14/§51.0.B/§51.0.I/§18.0.1/§4.18; resolve if markup-valued `:`-shorthand body is
valid (L1 → likely yes). If yes → (a) teach block-splitter to disambiguate the `>` (right answer, parses).
If bare-body-only → (b) fire a CLEAR diagnostic instead of the misleading cascade. Either way the
wrong-construct diagnostic is the bug.

Verify (R26, full suite): repro compiles (a) or gives the clear diagnostic (b), NOT the cascade; bare-body
still compiles; W-COLON-SHORTHAND-LEGACY-PLACEMENT still fires; inside-opener non-markup `:`-shorthand
intact (§160); genuine E-STRUCTURAL still fires; full `bun run test` 0-new-fail; any OVER-BUDGET REPORTED
not edited (PA owns allowlist at landing). Add regression test. Flip gap → resolved + state.ts --write.

PA landing: S67 file-delta block-splitter changes; reconcile known-gaps targeted; PA-independent repro;
merge-before-push gate; push. F3 bridges if PA wraps first.
