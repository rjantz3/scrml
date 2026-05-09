# C20 Phase 0 Survey — `pinned` import hoisting

**Dispatch:** A1c Wave 5a, S75, 2026-05-09.

**Source-of-truth anchors consulted:**
- SPEC §21.3 (Import Syntax, normative statements)
- SPEC §21.6 (Error codes including E-IMPORT-PINNED-INVALID)
- SPEC §21.8 + §21.8.1 (cross-file engine import + `pinned` on imports)
- SPEC §6.10 + §6.10.4 (`pinned` keyword semantics including import declarations)
- SPEC §7.6.1 (file-level scope under V5-strict + hoisting + `pinned`)
- SPEC §34 (E-STATE-PINNED-FORWARD-REF + E-IMPORT-PINNED-INVALID catalog rows)
- SCOPE-AND-DECOMPOSITION.md row C20 (DERIVED — SPEC wins per pa.md Rule 4)
- PA-SCRML-PRIMER §13.7 B4 specifics (load-bearing for cross-file pinning + B14)

---

## §1 Conclusion (load-bearing)

**This is "no-op + tests."** No codegen change is required. B4 already implements
the entire spec-normative surface for `pinned` imports, and the JavaScript module
loader's static-import hoisting satisfies the runtime ordering guarantee implicit
in §6.10.4 / §21.8.1. C20 closes by adding regression tests covering the
end-to-end pinned-import path.

The dispatch's framing — "hoists imports flagged `pinned: true` to break
forward-ref cycles in emitted JS" — is technically inert because:

1. **scrml forbids cross-file circular imports** at the module-resolver level
   (E-IMPORT-002, `module-resolver.js:detectCircularImports`). There is no
   "forward-ref cycle" to break at codegen time — cycles are rejected at MOD.
2. **Within-file forward-refs through pinned imports are validated at A1b/B4**
   (E-STATE-PINNED-FORWARD-REF source-position rule, `symbol-table.ts:1357-1383`).
   This is a compile-time error, not a runtime concern.
3. **JS module imports are statically hoisted by the runtime** — every `import { X }
   from '...'` declaration in the emitted JS is evaluated to a binding before any
   of the importing module's body code runs. The pinned semantics §6.10.4 talks
   about ("not hoisted but initialized at import position") refer to the IMPORTING
   FILE'S SOURCE-POSITION view (i.e., reads before the import line are forbidden),
   not to JS-module-loader hoisting.

So the only thing C20 needs to "hoist" is already hoisted by ES module semantics,
and the only "forward-ref cycle" the spec cares about is a single-file source-order
check that B4 already enforces.

---

## §2 Spec re-read — what does §21.8.1 actually require at codegen?

§21.8.1 normative statements (verbatim):

> - A `pinned` modifier on an imported name applies the §6.10 rules to that import's binding in the importing file's scope.
> - A `pinned` import behaves identically to a same-file `pinned` declaration at the file scope: forward-references through the `pinned` cell are `E-STATE-PINNED-FORWARD-REF` (§34); identity is hard-stable.
> - `pinned` on a non-engine non-state-cell import (e.g., `pinned` on a regular function) is `E-IMPORT-PINNED-INVALID` (§34) — `pinned` is only meaningful for cell-typed and engine-typed names.

All three normative statements are about **compile-time validation**:
- Statement 1: source-position forward-ref guard → B4 PASS.
- Statement 2: same as #1, restated for emphasis → B4 PASS.
- Statement 3: best-effort kind check via MOD's exportRegistry → B4 PASS (Option A).

§6.10.4 (the "hoist" wording the SCOPE row leans on):

> `pinned` on imports: `import { MarioMachine pinned } from './engines.scrml'` —
> signals that `MarioMachine` should not be hoisted but initialized at import position.
> See §21 for import hoisting rules.

This sentence's "should not be hoisted" is about scrml's own SAME-FILE hoisting
model (§6.9 — non-pinned cells are reachable from earlier source positions; pinned
cells are NOT). It is NOT about JS-module-loader hoisting. The "initialized at import
position" semantics is enforced by B4's source-position rule (read-before-import-line
fires E-STATE-PINNED-FORWARD-REF).

§7.6.1 confirms: "A `pinned` cell whose initialiser depends on a cell that has not
yet been declared in source order is `E-STATE-PINNED-FORWARD-REF` … `pinned` makes
the cell's identity-stability into a hard contract, and the compiler refuses to
evaluate forward-references through `pinned` cells."

**No codegen runtime ordering requirement is stated anywhere in §6.10, §7.6.1, §21.3,
§21.6, §21.8, or §21.8.1.** The pinned semantic is entirely a compile-time validation
contract, satisfied by B4.

---

## §3 Current import codegen behavior

### §3.1 Import collection

`compiler/src/ast-builder.js:9292-9347` (`collectHoisted`) walks the file AST and
extracts every `import-decl` node into `FileAST.imports[]` in **source order**.
Per-specifier `pinned: boolean` flags are populated at parse time
(`ast-builder.js:5488-5529`).

### §3.2 Import emission — client

`compiler/src/codegen/emit-client.ts:494-515` iterates `fileAST.imports[]` and
emits one ES `import` declaration per import-decl. The emission is positioned
near the top of the generated JS file, after the runtime preamble and before
any logic-emitted code. `.scrml` extensions are rewritten to `.client.js`;
`scrml:` and `vendor:` specifiers pass through unchanged.

### §3.3 Import emission — server

`compiler/src/codegen/emit-server.ts:111-131` mirrors the client path with
`.scrml` rewritten to `.server.js`.

### §3.4 Effective ordering

Two layers of hoisting compose to put pinned imports in the right place at
runtime:

1. **scrml emits imports at the top of the generated JS** (before any runtime
   body code, per §3.2 / §3.3 emission position).
2. **JS module loader hoists all `import` declarations** to module-init time
   per ES module spec — they execute before any of the module's own body code,
   regardless of where they appear lexically in the source.

Result: imported binding identities are established before any logic emitted
from a `${ ... }` block runs. Forward-ref cycles between scrml files are
broken (cycles are rejected at MOD; within-file forward-refs are caught by
B4 at compile time).

---

## §4 `pinned: true` flag flow B4 → codegen

The flag flows correctly through every stage:

| Stage | Carrier | Field |
|---|---|---|
| Parse (TAB) | `ImportDeclNode.specifiers[i]` | `pinned: boolean` |
| File AST | `FileAST.imports[i].specifiers[j]` | `pinned: boolean` |
| Symbol table (B4) | `Scope.importBindings.get(localName)` | `pinned: boolean` (mirrors specifier) |
| Codegen | `fileAST.imports[i].specifiers[j].pinned` AND/OR `fileAST._scope.importBindings.get(name).pinned` | both readable |

`compiler/src/codegen/emit-engine.ts:1024` already type-mirrors the
`importBindings` shape including the `pinned?: boolean` field — so the
flag is reachable from C15-style codegen if a future pass needs it.

For C20, the flag's READ is unnecessary because emission semantics are
identical for pinned and non-pinned imports — both become standard ES
`import` declarations at the top of the emitted JS. No flag-aware reorder
is required.

---

## §5 Test corpus inventory

Existing pinned coverage at A1b layer:
- `compiler/tests/integration/parse-import-pinned.test.js` — parser-level pinned modifier recognition.
- `compiler/tests/unit/import-binding-pinned.test.js` — B4's importBindings registration + E-STATE-PINNED-FORWARD-REF source-position rule + E-IMPORT-PINNED-INVALID best-effort fire (~40 tests across §B4.1.x / §B4.2.x / §B4.3.x).
- `compiler/tests/integration/symbol-table.test.js` — pinned references in broader integration coverage.
- `compiler/tests/unit/engine-binding-b14.test.js` — pinned engine import via B14.

What's NOT covered today (C20's test scope):
- Codegen-level emission of imports with pinned specifiers — verifies pinned imports compile to the same standard ES `import` shape as non-pinned imports (no extra reorder, no extra runtime hook, no extra annotation).
- Mixed pinned + non-pinned specifier imports — the emitted ES import preserves all specifiers.
- Cross-file pinned engine import (M18 from B14) — emission baseline regression.
- End-to-end: a scrml file that imports a pinned cell-typed/engine-typed name compiles successfully (positive control), and the emitted `.client.js` / `.server.js` contains the import line.

---

## §6 Estimated revised scope

**Original estimate:** 3-4 h (real-work assumption).

**Revised estimate:** ~30-60 min (no-op + targeted regression tests).

**Test-delta forecast:** +6 to +10 tests (codegen regression coverage of the
implicit-via-JS-hoist correctness path).

---

## §7 Open questions surfaced (per dispatch §"OPEN QUESTIONS")

### §7.1 JS-module-hoist already satisfies §21 — confirmed

Yes. ES module imports are statically hoisted; pinned imports get the same
treatment as non-pinned. SPEC §6.10.4 / §21.8.1 normative requirements are
all compile-time (B4) and need no runtime support.

### §7.2 Does §21 demand any runtime ordering JS doesn't natively give?

No. The spec's pinned-on-imports surface is entirely compile-time validation
plus the inherent ES-module-load-order guarantee (which JS already provides).
There is no requirement like "pinned imports must execute before non-pinned
imports" or "pinned must be available DURING the importing module's body
evaluation" beyond what ES modules already guarantee for ALL static imports.

### §7.3 Is the `pinned: true` flag reaching codegen?

Yes — via two paths (`fileAST.imports[i].specifiers[j].pinned` and
`fileAST._scope.importBindings.get(localName).pinned`). The flag is currently
read by `emit-engine.ts` (type-mirror declaration only — not yet a behavioural
read) but does not need to be read by import-emission code, because pinned
imports compile to the same ES `import` shape as non-pinned.

### §7.4 Action requested

Per the dispatch's "STOP after Phase 0 if survey reveals scope is materially
different" guidance, I am pausing here to flag that C20 is implicit-via-JS-hoist
and proposing the revised plan: add regression tests to lock in the implicit
correctness, document the survey finding in `progress.md`, mark C20 closed.

Spec amendments: NONE. Spec is already correct; the implementation simply leans
on JS module semantics + B4's compile-time validation, and no codegen text is
needed to bridge the two.
