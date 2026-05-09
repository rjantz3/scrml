# C20 — `pinned` import hoisting — progress

**Phase:** A1c Wave 5a · **Session:** S75 · **Date:** 2026-05-09

**Status:** SHIPPED · **Disposition:** no-op + tests (implicit-via-JS-hoist).

---

## §1 Phase 0 SURVEY findings (load-bearing)

See `SURVEY.md` for the full analysis. One-line: SPEC §6.10.4 / §21.8.1
normative requirements for `pinned` imports are entirely compile-time (B4
already implements E-STATE-PINNED-FORWARD-REF source-position rule +
E-IMPORT-PINNED-INVALID best-effort fire). The runtime ordering implicit
in §6.10.4's "initialized at import position" wording is satisfied by ES
module loader hoisting — every `import` statement the codegen emits is
statically hoisted to module-init time, before any importing-module body
code runs. Cross-file forward-ref cycles cannot occur because circular
imports are forbidden at MOD (E-IMPORT-002, `module-resolver.js:248`).

The dispatch's framing "hoists imports flagged `pinned: true` to break
forward-ref cycles in emitted JS" is technically inert — the only "hoist"
the spec requires is already done by JS module semantics, and the only
forward-ref check is a single-file source-order rule that B4 enforces.

---

## §2 Implementation

**Codegen changes:** NONE.

**Test additions:** `compiler/tests/unit/c20-pinned-import-codegen.test.js`
— 14 tests across 5 sections:

| Section | Tests | Coverage |
|---|---|---|
| §C20.1 | 4 | pinned import emits as standard ES `import` declaration |
| §C20.2 | 3 | mixed pinned + non-pinned specifiers preserved |
| §C20.3 | 2 | pinned engine import (M18) emits identically to non-pinned |
| §C20.4 | 2 | server-side emission mirrors client |
| §C20.5 | 3 | `pinned` keyword does NOT leak into emitted output |

These tests lock in the contract that:
- The `pinned` flag on import specifiers is codegen-inert.
- Pinned imports compile to the SAME ES `import` shape as non-pinned.
- The `pinned` token NEVER appears in emitted JS (it has no JS equivalent).
- ES-module-loader-hoist ordering (imports above runtime body) is preserved.

---

## §3 Test deltas

- Baseline: 10551 pass / 69 skip / 1 todo / 3 fail
- After C20: 10565 pass / 69 skip / 1 todo / 3 fail
- Delta: +14 pass, 0 regressions.

---

## §4 Spec amendments

NONE. Spec is correct as written; implementation leans on JS module semantics
+ B4's compile-time validation. The "implicit-correctness" branch of the
dispatch is the right outcome.

---

## §5 Files touched (relative)

- `docs/changes/phase-a1c-step-c20-pinned-import-hoist/SURVEY.md` (new)
- `docs/changes/phase-a1c-step-c20-pinned-import-hoist/progress.md` (this file, new)
- `compiler/tests/unit/c20-pinned-import-codegen.test.js` (new, 14 tests)

No source files modified.

---

## §6 Deferred items

NONE. All §21.8.1 + §6.10.4 normative requirements for `pinned` imports are
satisfied by the existing compile-time machinery (B4) + JS module semantics.
A future tightening might add:

- **Browser-runtime gauntlet integration test** — actual cross-file `.scrml`
  fixture with pinned engine import, compiled and loaded in a real module
  graph, verifying the singleton mount via `<engineVarName/>` use-site.
  Out of C20's unit-test scope; would integrate naturally into A1c Wave 6
  end-to-end browser tests if/when that wave runs.

- **B14 follow-on for engine-form const distinction** — when `export <engine
  var=...>` Form 1 lands, B4's E-IMPORT-PINNED-INVALID will tighten from
  Option A (accept const/let) to strict (recognize engine-typed const exports).
  This is upstream of C20 and tracked separately at B4's primer specifics.

---

## §7 Load-bearing answer (per dispatch §"DELIVERABLES")

**Was this implicit-via-JS-hoist, a small flag-aware reorder, or real work?**

**Implicit-via-JS-hoist.** The pinned-on-imports semantic is compile-time
validation only (B4); ES module loader hoisting satisfies the runtime
ordering implicit in spec §6.10.4. No codegen text changed. C20 closes
with regression tests locking the implicit correctness contract.
