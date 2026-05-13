# §36 Phase 4 — Conformance + DESIGN-AND-SHIP gate — Progress

## 2026-05-13 (open)

- Reconnaissance: confirmed `compiler/tests/conformance/conf-INPUT-*` does not exist.
- Confirmed `compiler/tests/integration/input-*` does not exist.
- Confirmed `samples/compilation-tests/input-canvas-demo.scrml` does not exist (only `comp-015-search-input.scrml` and `func-009-oninput.scrml` mention "input").
- Rebased worktree onto main (bdbf810).
- `bun install` + `bun run pretest` clean.
- Source-of-truth files identified:
  - `compiler/src/codegen/emit-html.ts` (fire site for E-INPUT-001..005)
  - `compiler/tests/unit/input-state-types.test.js` (existing 47-test baseline pattern)
  - `compiler/tests/conformance/conf-AUTH-003.test.js` (conformance test template)

Sub-phase 4.A: 5 conformance test files to create.
Sub-phase 4.B: frame-accurate integration test using mocked rAF + document.
Sub-phase 4.C: canvas demo `.scrml` fixture + JSDOM integration test (OQ-C γ ratified).

## 2026-05-13 (4.A close)
- Created 5 `conf-INPUT-NNN.test.js` files mirroring `conf-AUTH-003` pattern.
- 12 tests / 12 pass.
- Commit: `test(s89-§36-4A): conformance suite for E-INPUT-001..005`.

## 2026-05-13 (4.B close)
- Created `compiler/tests/integration/input-frame-accurate.test.js`.
- Compiles a minimal `<keyboard>` fixture, then drives runtime through a
  mocked frame loop. Asserts `justPressed("Space")` returns `true` for
  exactly ONE frame post-keydown (Insight 31 Gate 1 positive test).
- 4 tests / 4 pass.
- Commit: `test(s89-§36-4B): frame-accurate-edge-detection integration test`.

## 2026-05-13 (4.C close)
- Created `samples/compilation-tests/input-canvas-demo.scrml` — canvas
  sprite movement via WASD + Space-fire + mouse drawing (debate-04
  conclusion 4 canonical shape).
- Created `compiler/tests/integration/input-canvas-integration.test.js`
  — JSDOM-based integration per OQ-C γ ratified. Compiles sample,
  drives runtime via happy-dom, asserts keyboard/mouse semantics +
  cleanup-no-leak.
- 7 tests / 7 pass. Full suite 11,983 pass / 0 fail (no regressions).
- DESIGN-AND-SHIP gate: CLOSED.
- Commit: `feat(s89-§36-4C): input-canvas-demo sample app + JSDOM integration test`.
