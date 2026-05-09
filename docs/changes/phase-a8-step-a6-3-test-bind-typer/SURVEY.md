# A8 / A6-3 — `test-bind` typer support — Phase-0 Survey

**Authority chain (Rule 4 priority):**
- SPEC.md §19.12.6 (line 11358) — declaration grammar (NORMATIVE; A6-1 SPEC, S74).
  - LHS "SHALL name a server function (`server fn`, §12.5)".
  - RHS "SHALL be any expression legal in the surrounding logic context".
  - **Discrimination contract:** "If the expression resolves to a function value
    whose signature is assignable to the bound server function's signature, the
    test-mode dispatch SHALL invoke that function with the call-site arguments.
    Otherwise, the expression value `v` SHALL act as a return-stub."
- SPEC.md §19.12.7 (line 11385) — dispatch contract.
  - Test-mode dispatch table is keyed by §47-encoded names.
- SPEC.md §47.5 (line 18124) — encoded-name surface (cross-ref).
- SPEC.md §34 — E-TEST-001..006 catalog rows.
- S74 hand-off item 178 — typer makes the discrimination call at compile time.

**Worktree:** `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-a9fb2dccbea4e271b`
**Baseline tests:** 10,701 / 69 / 1 / 3 (3 pre-existing fails: F-BUILD-002, Bootstrap L3, Self-host tokenizer parity).

---

## §1. Walker placement decision: SYM PASS 18 (NEW)

**Decision: place A6-3 inside `compiler/src/symbol-table.ts` as PASS 18.**

Rationale:
1. **Precedent:** existing typer-style diagnostic walkers (PASS 16 = A5-3,
   PASS 17 = B17.3) live in SYM. The local term "typer" in this codebase
   refers to both SYM and TS; SPEC §19.12.6's "compiler stage TS" is loose
   enough to accommodate either and SYM is the established home for AST-shape
   diagnostics.
2. **Information availability:** SYM has direct access to `function-decl`
   nodes in `ast.nodes` and reads `isServer: boolean` directly (set by TAB
   when the source has `server fn`/`server function`). It also has
   `fileScope.importBindings` for imported names and `exportRegistry` for
   cross-file export kinds.
3. **No type-system dependency:** the discrimination rule we can actually
   enforce here is **shape-based** (function-literal vs identifier vs other),
   not full structural-signature assignability — TS's `FunctionType` is
   currently opaque (`params: []`, `returnType: tAsIs()` per
   `type-system.ts:3939`), so even if we ran inside TS, deep signature
   matching is out of reach at this revision.
4. **Test ergonomics:** a SYM-resident walker pairs with the existing
   `runSYM(input)` test helper (a5-3, b17.3 patterns), giving small focused
   tests without a full TS pipeline build.

**Walker name:** `walkAnnotateTestBindKinds` + per-test-block helper
`annotateTestBindsInBlock`.

---

## §2. AST entry points + data plumbing

### 2.1 Test-block AST shape (already populated by A6-2)

```ts
{
  kind: "test",
  testGroup: {
    name: string | null,
    line: number,
    tests: TestCase[],
    before: string[] | null,
    after: string[] | null,
    testBinds: TestBindDecl[],   // ← A6-2 added this; A6-3 annotates
  },
  span,
}

// TestBindDecl from compiler/src/codegen/ir.ts:171
interface TestBindDecl {
  identifier: string;     // LHS server-fn name
  expression: string;     // raw RHS source string
  line: number;
}
```

### 2.2 Server-fn lookup mechanism (load-bearing question)

**Same-file `server fn` / `server function` declarations:**
- `function-decl` nodes carry `isServer: boolean` (set by TAB when `server`
  keyword precedes the declaration; see `ast-builder.js:5604-5645`).
- A simple top-level walk of `ast.nodes` collects `{name → fnNode}` for every
  `function-decl` with `isServer === true`. Walker stops at function
  bodies (no nested fns are ever `server`-prefixed by spec).

**§47-encoded LHS lookup mechanism — answer to load-bearing question:**

> The §47-encoded surface is a CODEGEN concern (`compiler/src/codegen/`), not
> a typer concern. SPEC §47.5 says the dispatch *table* is keyed by encoded
> names — A6-4 codegen owns that. SPEC §19.12.6 itself does NOT require
> A6-3 to encode anything; the LHS is a plain SOURCE-LEVEL identifier.
>
> **A6-3's lookup is therefore source-level:**
>   1. find a same-file `function-decl` with matching `name` AND `isServer === true`
>   2. (cross-file imports — see §2.3 limitation below)
>
> **A6-3 stamps the source-level identifier on the annotation; A6-4 will
> consult `routeMap` / `exportRegistry` at codegen time to derive the encoded
> key.** No new infra is required for A6-3.

### 2.3 Cross-file `import { fooServerFn } from './server.scrml'` — deferred

The export registry's per-name shape is `{kind, category, isComponent}` from
`module-resolver.js:397`. For server-fn exports, `kind === "function"` or
`"fn"` and `category === "function"` — there is **no `isServer` discriminator
on cross-file imports** at this revision. Adding one would require:
- `module-resolver.js:340-403` to emit `isServer` on each function export
- TAB to mark server-prefixed functions on their export-decl node (already done
  via `function-decl.isServer`; the export-registry build doesn't propagate it)

**A6-3 verdict:** restrict LHS resolution to **same-file** server-fn
declarations. A cross-file import binding whose name matches a `test-bind`
LHS is a documented A6-3 deferral (`E-TEST-005` not fired; the `_bindKind`
defaults to `"return-stub"` defensively so codegen sees something).

This deferral is **not** a regression — A6-2 / A6-1 already restricted
worked examples to same-file usage; cross-file server-fn `test-bind` is a
nice-to-have surfaced for A6-4 / A6-6.

### 2.4 RHS-shape discrimination rule

Per S74 hand-off item 178: "RHS is normal expression; if function-typed and
signature-assignable → invoke; else → return-stub". The **practical** rule
in this codebase, where TS's FunctionType doesn't carry rich signature info:

A6-3 uses a **syntactic + symbol-resolution heuristic** on the raw RHS source:

1. **Function-literal patterns** → `_bindKind: "handler"`:
   - Arrow function: matches `/^\s*(\(?[^=]*?\)?)\s*=>/` (arms with optional
     parens around params; e.g., `(id) => {…}`, `id => …`, `() => …`).
   - `function` expression: `/^\s*function\b\s*[A-Za-z_$]?[\w$]*\s*\(/`.
   - Concise method form is irrelevant in scrml RHS (no object-literal-method
     position here).
2. **Identifier whose binding is a function** → `_bindKind: "handler"`:
   - LHS-style identifier (single token, no operators) AND
   - `fileScope.importBindings.has(rhsIdent)` (imported function — accept
     defensively without distinguishing `kind`), OR
   - same-file `function-decl` exists with matching name (any kind,
     server or client).
3. **Otherwise** → `_bindKind: "return-stub"`.

**Strict signature-assignability check is OUT OF SCOPE for A6-3** — TS
infrastructure can't support it today (FunctionType is opaque). Surface as
OQ-A6-3-signature-strict for a future amendment.

**Negative-case handling (signature mismatch, wrong arg count, etc.):** A6-3
does NOT fire diagnostics on signature mismatch — the syntactic rule only
discriminates handler vs stub. **A future amendment** may tighten this when
TS gains structural function-type assignability. SPEC §19.12.7 is silent on
mismatched-handler-arity ("the dispatch SHALL invoke that function with the
call-site arguments" — runtime semantics; no compile-time constraint
prescribed).

---

## §3. Annotation placement

`TestBindDecl` (in `compiler/src/codegen/ir.ts`) gains a NEW optional field:

```typescript
export interface TestBindDecl {
  identifier: string;
  expression: string;
  line: number;
  /**
   * Discrimination annotation populated by A6-3 (SYM PASS 18) per SPEC
   * §19.12.6 RHS-shape discrimination contract:
   *   - "handler"     — RHS is a function value (literal or resolved
   *                     identifier-bound function); test-mode dispatch
   *                     invokes the binding with call-site arguments.
   *   - "return-stub" — RHS is a non-function value; test-mode dispatch
   *                     ignores arguments and returns the value verbatim.
   *
   * Absent until SYM PASS 18 runs. Codegen (A6-4) reads this to choose the
   * dispatch shape per §19.12.7. Defaults to "return-stub" if SYM is bypassed
   * (defensive — codegen still emits a usable hook).
   */
  bindKind?: "handler" | "return-stub";
}
```

The annotation is **on the existing `TestBindDecl`** (not a sibling registry).
This keeps the parser node the single source of truth — codegen consumes
`testGroup.testBinds[i].bindKind` directly.

**Why a stable named field, not `_bindKind`:** the codegen IR is exported
TypeScript and the field is a first-class part of the IR contract from A6-3
onward. The `_`-prefix is reserved for non-enumerable WeakMap-style annotations
(per `symbol-table.ts:1174-1179` `_scope` precedent). Since `bindKind` is
serialization-safe and consumed by codegen, the public-style name is correct.

### 3.1 LHS-resolution diagnostic

When LHS does NOT resolve to a same-file `function-decl` with
`isServer === true`:

- **Re-use E-TEST-005** ("invalid test structure") with a discriminator in the
  message: "`test-bind <ident>` does not resolve to a server function in
  scope. Per SPEC §19.12.6, the LHS must name a `server fn` declaration".
- Mirrors A6-2's diagnostic-code reuse strategy.
- **Edge case:** LHS resolves to a same-file `function-decl` that is NOT
  server-prefixed. Fire E-TEST-005 with a more specific message: "...
  resolves to function `<name>` declared without the `server` modifier; only
  `server fn`/`server function` declarations are valid `test-bind` targets".
- **Cross-file import** with matching name: silently skip (per §2.3 deferral).
  The annotation gets `bindKind: "return-stub"` defensively.

### 3.2 Scope-local lookup table

Per BRIEF: "Build a per-`~{}` block scope map of bound-name → discriminated
entry, consumable by A6-4 codegen at server-fn call sites."

The scope-local table IS the `testGroup.testBinds[]` array itself, indexed
by `identifier`. Codegen at A6-4 consumes this directly per `~{}` block —
no separate registry needed. The `bindKind` annotation transforms each
entry into a discriminated record. **Independent annotations across `~{}`
blocks** is naturally satisfied: each `testGroup` carries its own
`testBinds[]` array.

---

## §4. Diagnostic-code decisions

| Trigger | Code | Severity | Rationale |
|---|---|---|---|
| LHS unknown / not a server-fn (same-file) | **E-TEST-005** | error | reuse per A6-2 pattern; SPEC §19.12.6 LHS contract |
| RHS function-typed but mismatched signature | (none — deferred) | n/a | TS infrastructure absent; OQ surfaced |
| Same LHS in two `~{}` blocks (independent scope) | (none — non-error per spec) | n/a | block-local scope explicitly permits this |

**No new diagnostic codes** are introduced. SPEC §34 catalog is not modified.

---

## §5. Test corpus location

Create `compiler/tests/unit/test-bind-typer.test.js` modeled after
`b17-3-typer-diagnostics-ontransition-effect.test.js` and
`test-bind-parser.test.js`.

**Test sections:**
- §1 Positive — handler form (function literal RHS) annotation
- §2 Positive — return-stub form (literal RHS) annotation
- §3 Positive — handler form (identifier-bound function RHS) annotation
- §4 Positive — independent annotations across two `~{}` blocks
- §5 Negative — LHS unknown → E-TEST-005
- §6 Negative — LHS resolves to non-server local function → E-TEST-005
- §7 Edge — RHS is single-arg arrow without parens (`x => …`) → handler
- §8 Edge — RHS is empty array `[]` (per worked example) → return-stub
- §9 Edge — RHS is `function (x) { … }` expression → handler
- §10 Regression — A6-2 parser-level diagnostics still fire correctly
- §11 Default — `bindKind` always present after PASS 18

Test-delta forecast: ~+12 to +18 tests.

---

## §6. Surface area touched

| File | Change | Reason |
|------|--------|--------|
| `compiler/src/codegen/ir.ts` | Add `bindKind?: "handler" \| "return-stub"` to `TestBindDecl` | A6-3 annotation field |
| `compiler/src/symbol-table.ts` | Add PASS 18 — `walkAnnotateTestBindKinds` + `annotateTestBindsInBlock`; wire from `runSYM` | Walker + diagnostic firing |
| `compiler/tests/unit/test-bind-typer.test.js` | NEW unit-test file | Coverage |

**Out of scope (deferred to A6-4 or later):**
- Cross-file imported server-fn LHS resolution (§2.3 limitation).
- Strict structural-signature assignability check (§2.4 OQ).
- Codegen — A6-4 territory per BRIEF "HARDLY-EVER".
- Self-host parity in `compiler/self-host/ast.scrml` — A6-3's annotation
  field is consumed by codegen (A6-4); the self-hosted parser doesn't run
  the SYM walker. Self-host parity for the new IR field is A6-4's concern
  (or a documented later step) since the annotation is `_bindKind: "..."` —
  if the self-host AST never sets it, codegen gracefully defaults.

---

## §7. Open questions surfaced (per BRIEF)

### OQ-A6-3-signature-strict
SPEC §19.12.6 says "function value whose signature is assignable" — strict
structural assignability requires TS-side function-signature analysis that
doesn't exist (FunctionType is opaque). A6-3 ships syntactic-shape
discrimination as the practical interpretation; signature-strict is a future
amendment when TS infra arrives.

### OQ-A6-3-cross-file-server-fn
LHS resolving to a cross-file imported server-fn cannot today be
distinguished from a cross-file imported regular function (export-registry
lacks `isServer`). A6-3 silently defaults such imports to `bindKind:
"return-stub"`. Future enhancement: enrich `module-resolver.js` to propagate
`isServer` per export.

### Reaffirmed (per A6-2 SURVEY): drift in errors.ts comments
`compiler/src/codegen/errors.ts:30-48` still has stale comment-only
documentation for E-TEST-001..005 with meanings that diverge from SPEC §34
normative rows. Out of A6-3 scope (PA awareness item).

---

## §8. Phase 0 verdict

Scope confirmed and refined per §2.4 + §2.3. No materially-different scope
discovered that would require BRIEF revision. Two OQs surfaced as documented
deferrals, neither blocking A6-3 ship.

Estimated revised effort: **1.0–1.5h** (walker + ~15 tests).

**Proceeding to Phase 1.**
