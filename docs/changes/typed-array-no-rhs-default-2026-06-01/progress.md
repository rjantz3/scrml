# progress — typed-array-no-rhs-default-2026-06-01

change-id: `typed-array-no-rhs-default-2026-06-01`
worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a1d9dba2ad69ce9f4
base: 893872e3 (after `git merge main`)

## 2026-06-01 — Phase 0 (reproduce + locate + draft SPEC)

### Step 1 — Bug reproduced
`<state><todos>: Todo[]</state>` (no RHS) + `<each in=@todos>`:
- Compiles with NO error/warning about the missing init.
- Emitted `repro.client.js` calls `_scrml_reactive_get("todos")` → returns `undefined`
  (NO `_scrml_reactive_set("todos", ...)` is emitted anywhere).
- `_scrml_reconcile_list(container, undefined, ...)` crashes at runtime: runtime line
  `if (newItems.length === 0)` → TypeError: Cannot read properties of undefined (reading 'length').

### Step 2 — SPEC read
- §6.2 "Three RHS Shapes" (lines 2066-2125): Shape 1 plain expr, Shape 2 render-spec, Shape 3 `const` derived.
  ALL three are RHS-bearing; the production at line 2050 lists `ws '=' ws expr` as a **required initializer**.
  The no-RHS typed form is NOT one of the three shapes today.
- §42.1.1 (lines 20759-20791): `[]` is a DEFINED value (an `Array<T>` of length zero), categorically
  distinct from `not`. `is some` TRUE for `[]`. Migrating `[]` → `not` is a SEMANTIC ERROR.
- §6.8 (lines 5121-5183): `default=` optional on any shape; when absent, `reset(@cell)` RE-EVALUATES the
  init expression. => If the no-RHS array init synthesizes to `[]`, `reset(@todos)` re-evaluates to `[]`
  automatically — consistent with §6.8, no special-casing needed.

### Step 4 — Impl site located (LOCALIZED — no balloon)
Root cause is NOT in codegen and NOT "reaches codegen with null init". The no-RHS typed decl is
NOT EVEN RECOGNIZED as a state-decl by the front-end — it falls through to an `html-fragment`
(garbage) in BOTH the `<state>`-block form and the bare top-level form.

Exact site: `compiler/src/ast-builder.js`, function `tryParseStructuralDecl`
(nested in `parseLogicBody`, which carries the `errors` array), lines 4169-4178:

```js
// Now expect `=`. If not present, decline (don't silently parse a
// typed-decl with no RHS — that's not in scope).
if (peek().kind !== "PUNCT" || peek().text !== "=") {
  i = cursorBeforeConsume;
  return null;   // <-- BUG: falls through to html-fragment; no diag, no init
}
```

The lookahead scan (`scanStructuralDeclLookahead`, line 4356) already returns `typedDecl:true`
for `<NAME>` + `:` WITHOUT requiring an `=` (it only checks `>` followed by `:`). So a no-RHS typed
decl reaches the `if (scan.typedDecl)` branch (line 4153), `collectTypeAnnotation()` succeeds with the
type string (e.g. `"Todo[]"`), then line 4171 declines because there is no `=`.

FIX (two prongs, both at this single site):
  (a) typeAnnotation is an array type (`/\[\s*\]\s*$/`) → synthesize `init:"[]"`,
      `initExpr:{kind:"array", elements:[]}`, build a plain state-decl node (skip the `=`-requiring
      RHS collection). Empty-array DEFINED value per §42.1.1.
  (b) typeAnnotation is NON-array → `errors.push(new TABError("E-DECL-NEEDS-INITIALIZER", msg, span))`
      then decline (return null). Closes the silent-undefined hole; scalar/struct zero-defaults OUT OF SCOPE.

Confirmed via AST probes:
  - no-RHS array  → html-fragment (NOT a state-decl)  [BUG]
  - `= []` array  → state-decl {init:"[ ]", initExpr:array, typeAnnotation:"Todo[]", shape:"plain"}  [correct]
  - no-RHS int    → html-fragment (NOT a state-decl)  [BUG]

### Corpus regression scan
`grep -rE '<NAME ...>: Type$'` (no `=`) across `examples/`, `samples/`, all `*.scrml`:
ZERO real no-RHS typed decls (one hit in `samples/quiz-app.scrml:40` is inside a `// FRICTION:` comment).
=> No corpus regression from prong (b).

## DRAFTED SPEC WORDING (for PA review — see final report)
(see report)

## 2026-06-01 — Implementation

### Commit 0372a7c6 — SPEC §6.2 Shape 4 amendment (landed)
- Added "#### Shape 4 — Typed Array, No RHS (`[]` Default)" after Shape 3.
- Updated the §6.1.5 production-parts note ("required initializer" → REQUIRED except Shape 4).
- Updated §6.2 cross-ref list (added E-DECL-NEEDS-INITIALIZER + §42.1.1).
- Added §34 row: `E-DECL-NEEDS-INITIALIZER | §6.2 | ... | Error`.

### ast-builder.js (tryParseStructuralDecl + collectTypeAnnotation)
- TWO localized edits:
  1. `tryParseStructuralDecl` no-`=` branch (was: decline → html-fragment):
     - array type (`/\[\s*\]\s*$/`) → synthesize state-decl with init "[]",
       initExpr {kind:"array", elements:[]}, shape "plain"; default=/pinned/server/
       reactivity/validators all composed.
     - non-array type → errors.push(TABError("E-DECL-NEEDS-INITIALIZER", ...)) + decline.
  2. `collectTypeAnnotation` — stop at a top-level `<`. The scrml type-expr grammar
     (§7.5) has NO top-level `<` (no angle-bracket generics), so a `<` is the
     annotation boundary. Without this, the no-RHS `<state>`-block compound child
     over-consumed `</state>` into the type string (`"Todo[]</state>"`), breaking
     array detection. Safe for ALL callers (let/const/fn-param) per §7.5.

### Test: compiler/tests/unit/typed-array-no-rhs-default.test.js (15 tests, all pass)
- §1-§9 AST: array no-RHS (top-level + <state>) → [] init; non-array → E-DECL-NEEDS-INITIALIZER.
- §10-§13 codegen: _scrml_reactive_set([]) emitted; _scrml_init_set(()=>[]); IDENTICAL to `=[]`; result.errors carries the code.
- §14-§15 runtime (happy-dom, init-first ordering): cell is DEFINED [] (not undefined); write populates list.

## PRE-EXISTING OUT-OF-SCOPE BUG (surfaced, NOT fixed)
Codegen emit-ordering: the `<each>` auto-render call + `_scrml_effect_static(...)`
wrapper are emitted BEFORE the cell-init `_scrml_reactive_set("todos", ...)` line.
So the first render runs against an uninitialized cell → `_scrml_reconcile_list`
gets `undefined` → `TypeError: ... newItems.length`. VERIFIED to affect the
explicit `<todos>: Todo[] = []` form AND the untyped `<todos> = []` form
IDENTICALLY (both crash). This is independent of Shape 4 — Shape 4's init synthesis
is byte-identical to the explicit form (test §12). The §14/§15 runtime tests
re-order init-before-render to isolate Shape 4's guarantee from this bug.
=> SURFACE to PA as a separate codegen-ordering bug (each-render-before-cell-init).
