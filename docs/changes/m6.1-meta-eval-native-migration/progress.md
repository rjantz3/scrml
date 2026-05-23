# Progress: m6.1-meta-eval-native-migration

Single-session run; no checkpoint required.

## Timeline

- [start] Startup discipline OK — pwd matches worktree, git status clean, bun install OK, pretest OK.
- [step 1] Read primary.map.md + domain.map.md — native-parser/parse-file.js identified as the C1 assembler with the right shape.
- [step 2] Surveyed meta-eval.ts:366 — confirmed splitBlocks+buildAST is the only synthesis re-invocation in the file.
- [step 3] Surveyed nativeParseFile signature — `(filePath, source) => { filePath, ast: FileAST, errors }` is a literal drop-in for `buildAST(splitBlocks(...))`.
- [step 4] Classified synthesized source: SCRML (markup + structural + logic). Per M6 cutover plan: parseMarkup-led path is correct. nativeParseFile composes parseMarkup + bridges + hoist, so it is strictly stronger than parseMarkup alone (gives the full FileAST shape downstream reparseEmitted consumers expect).
- [step 5] WIP commit: pre-snapshot.md baselines.
- [step 6] Migration applied at meta-eval.ts:366 — swap two-line pair (splitBlocks + buildAST) for single nativeParseFile call. Extended diagnostic filter to skip I- (native info) in addition to W- (legacy warn). Extended span accessor: tabSpan -> span -> synthetic fallback.
- [step 7] Pre-commit hook caught conformance/conf-META-EVAL-002 regression — POS case used `<p if=>broken</>` (live E-ATTR-001) which the native parser is permissive about (no E-ATTR-001 equivalent in §34.1).
- [step 8] Investigated divergence — confirmed native parser intentionally permissive for this malformed-attribute form. Updated exemplar to `<p>unclosed` (an unclosed-tag form which fires E-CTX-001 under native AND was equally rejected under legacy). Test intent preserved.
- [step 9] Commit: fix(M6.1) — migration + conformance exemplar update.
- [step 10] Added §27-§31 native-parser regression tests in meta-eval.test.js — pinning the new path's I- filter, error contract, and node-shape outputs.
- [step 11] Commit: test(M6.1) — 5 new regression tests.
- [step 12] Full suite gate: bun test unit + integration + conformance --bail → 13824 pass / 0 fail / 0 regressions.

## Final state

- Branch: changes/m6.1-meta-eval-native-migration
- Commits: 4 (WIP baseline, migration+conformance fix, new tests, final wrap)
- Files touched: 3
  - compiler/src/meta-eval.ts (migration site + filter + span fallback)
  - compiler/tests/conformance/conf-META-EVAL-002.test.js (exemplar swap)
  - compiler/tests/unit/meta-eval.test.js (§27-§31 added)
- Tests: 13824 pass / 0 fail (vs 13819 pre-change; +5 from new M6.1 tests)
- git status: clean (after commits)

## Tags
#scrmlts #m6.1 #meta-eval #native-parser #progress #complete

## Links
- [pre-snapshot.md](./pre-snapshot.md)
- [anomaly-report.md](./anomaly-report.md)
- [compiler/src/meta-eval.ts](../../../compiler/src/meta-eval.ts)
