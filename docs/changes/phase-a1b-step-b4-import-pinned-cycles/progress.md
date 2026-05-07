# Progress: A1b Step B4 — Import binding registration + pinned forward-ref check

**Re-scoped per S66 Phase 0 STOP findings.** Two PA-brief corrections govern this re-dispatch:

1. Algorithm is a SOURCE-POSITION forward-reference rule (NOT cycle/SCC detection). Spec §6.9.3, §6.10.2, §6.10.5, §7.6.1, §21.8.1 are uniform on this.
2. E-IMPORT-PINNED-INVALID best-effort scope (Option A): fire on `pinned` imports of definitively-not-cell-not-engine kinds (function/fn/type/channel); accept const/let with deferral comment for B14.

Path note: directory name retained from original brief framing for traceability; content describes the actually-shipped source-position rule.

---

## Plan

- Phase 1 — `importBindings` per-scope registry; SYM PASS-1 extension. WIP commit.
- Phase 2 — Source-position forward-ref check in SYM PASS-3 (extends B3 walker). WIP commit.
- Phase 3 — E-IMPORT-PINNED-INVALID best-effort fire (Option A). WIP commit.
- Phase 4 — Primer §13.7 update + this progress.md final state.
- Phase 5 — Final verification (full `bun run test`).

## Baseline

- Branch: `changes/phase-a1b-step-b4-import-binding-pinned-forward-ref`
- Pre-snapshot: `bun run test` baseline 9018-9019 pass / 44 skip / 1 todo / 0 stable fail (2 transient ECONNREFUSED, network-flaky, pre-existing).

## Log

- [start] Branch created. Baseline test run captured. Worktree clean. `bun install` + `bun run pretest` complete.
- [phase-1] Commit 74fb855 — `WIP(a1b-b4): Phase 1 — importBindings registration in SYM PASS-1`. Adds `ImportBindingRecord`, extends `Scope` with `importBindings: Map<string, ImportBindingRecord>`, wires `registerImportBindings()` as PASS 1.b in `runSYM`. Public API: `lookupImportBinding(scope, localName)`. New stat: `SYMStats.totalImportBindings`. 8 unit tests in `compiler/tests/unit/import-binding-pinned.test.js`. Sanity SYM-adjacent suites (B1/B2/B3/B5) green.
- [phase-2] Commit c997b8f — `WIP(a1b-b4): Phase 2 — E-STATE-PINNED-FORWARD-REF source-position check`. Source-position rule: read fires when `enclosing-node.span.start < pinned.declNode.span.end`. Same rule applies to imported pinned bindings via `lookupImportBinding` fallback. Threaded `readPos` through `walkResolveAtNames`. Documented IdentExpr-span-not-reliable in source comment + designed `readPos = enclosing-node.span.start` substitute (exact for every spec-normative case because pinned decls live only at file/program/compound scope). 12 new tests cover before/after pinned + before/after non-pinned (controls), self-init pinned (fires), self-init non-pinned (no fire), multiple forward-reads, mixed pinned/non-pinned, pinned-import variants, diagnostic shape.
- [phase-3] Commit ab59a8e — `WIP(a1b-b4): Phase 3 — E-IMPORT-PINNED-INVALID best-effort fire (Option A)`. `runSYM` accepts optional `exportRegistry`; new PASS 2.b `fireImportPinnedInvalid` walks `fileScope.importBindings` and fires on pinned imports of `{function, fn, type, channel}` kinds. const/let accepted with documented B14 deferral comment in code (engine exports desugar to const, indistinguishable today). `api.js` Stage 3.06 wiring updated. Allowlist update for `p3-follow-no-isComponent-routing.test.js` (symbol-table.ts type-signature mentions only — no routing reads). 12 new tests.

## Final state

- All 32 unit tests in `compiler/tests/unit/import-binding-pinned.test.js` pass.
- Full suite: **9051 pass / 44 skip / 1 todo / 0 fail** (baseline 9018-9019; +32 B4 tests + 1 from allowlist update). Browser pre-commit hook green on every commit.
- Commits on `changes/phase-a1b-step-b4-import-binding-pinned-forward-ref` (in order):
  - `897c91d` — branch + progress.md + baseline
  - `74fb855` — Phase 1: importBindings registration
  - `c997b8f` — Phase 2: E-STATE-PINNED-FORWARD-REF source-position check
  - `ab59a8e` — Phase 3: E-IMPORT-PINNED-INVALID best-effort fire
  - (Phase 4 final commit follows)
- Primer §13.7 updated with B4 row + B4 specifics block (importBindings shape, source-position rule, read-position approximation note, E-IMPORT-PINNED-INVALID Option A scope).
- No SPEC amendments (Phase 0 confirmed both rows already exist in §34: lines 14202 + 14232).
- Working tree clean after Phase 4 commit.

## Known limits / follow-ups

- **B14 will tighten E-IMPORT-PINNED-INVALID for engine vs. arbitrary const exports.** Today's exportRegistry kind enum collapses both into `"const"` (Form 1 engine-export desugar). When B14 / M18 cross-file engine import lands, the registry can be annotated with engine-vs-const and the const branch can move from "ACCEPT" to "FIRE if not engine." In-code TODO comment present at the const/let accept-branch.
- **Read-position is approximate at the IdentExpr level.** A future B-step that propagates absolute baseOffsets through `compiler/src/expression-parser.ts → spanFromEstree` will let diagnostic spans report exact column. Today the diagnostic correctly identifies file + severity + cell name + read-vs-decl ordering.
- **Re-export chasing not implemented.** When the source's exportRegistry entry has `kind:"re-export"` or similar, B4 conservatively accepts. Full transitive chasing belongs with the next module-resolver enhancement; the spec doesn't normatively require it for B4.
