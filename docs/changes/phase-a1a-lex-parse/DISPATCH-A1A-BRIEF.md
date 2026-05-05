# Dispatch A1a — Lexer + Parser (Phase A1, first of three)

**Status:** DRAFT (S59, 2026-05-05). Awaiting user ratification.
**Predecessor:** Stage 0b complete (D1-D4 + scrml:oauth + L21 lock landed). v0.next SPEC frozen as engineering target. Compiler does NOT yet implement the new shapes.
**Successors in Phase A1:** A1b (resolve+type), A1c (codegen + PIPELINE.md prose pass).
**Authorization (S59):** scope ratified by user. Per-batch test-rewrite authorization is **pre-authorized** by user under S56 destructive-ops directive — single CHANGELOG enumeration at close.
**Wall-time est:** 8-15h focused work.

---

## §1 What this dispatch is

Phase A1a is the first of three sequential dispatches that bring the compiler in line with v0.next as defined in `compiler/SPEC.md` post-Stage-0b. A1a's scope is **lexer + parser only**: tokenize the new shapes, parse them into AST nodes, and STOP. It does NOT enforce semantic rules that require symbol-table or type information; those are A1b's domain. It does NOT emit JavaScript for the new shapes; that's A1c's domain.

The dispatch is **strictly additive at the AST layer:** extend existing AST node types with v0.next-shape variants. Do NOT introduce parallel node hierarchies. The downstream phases (A1b/A1c) will see one AST shape that handles both pre-v0.next code paths (still in tests/samples until they're rewritten) and v0.next code paths (kickstarter v2 §3 examples).

---

## §2 Spec authority

- **§1 — Pillars** (markup-as-first-class-value, state-as-declaration-primitive, V5-strict access principle).
- **§3 — Context model** (V5-strict-per-context table; how `<x>` and `@x` parse in different markup-vs-expression contexts).
- **§6 — Reactivity, V5-strict, RHS shapes, compound state** — the centerpiece. Cover **§6.1** (two access forms), **§6.2** (three RHS shapes), **§6.3** (Variant C compound), **§6.4** (render-by-tag), **§6.5** (mutable arrays — A1a notes only, no enforcement), **§6.6** (derived `const <name>`), **§6.6.16** (in-compound derived), **§6.6.17** (markup-typed derived), **§6.6.18** (E-DERIVED-VALUE-MUTATE — A1a parses MemberCall/MemberAssignment/UnaryDelete shapes; semantic check is A1b), **§6.7** (lifecycle — out of A1a scope, but `<timer>`, `<poll>`, `<request>`, `<timeout>` decls already work; do not regress), **§6.8** (`default=` attribute + `reset(@cell)` keyword).
- **§11 — folded** by Dispatch 1; A1a parser must accept the unified §6 shapes.
- **§34 — error code catalog**. A1a fires only the ones detectable at lex/parse time: `E-RESERVED-IDENTIFIER`, `E-RESET-NO-ARG`. All other §34 entries (E-NAME-COLLIDES-STATE, E-DERIVED-WRITE, E-DERIVED-VALUE-MUTATE, E-STATE-PINNED-FORWARD-REF, E-CELL-NO-RENDER-SPEC, E-CELL-RENDER-SPEC-NOT-BINDABLE, E-SYNTHESIZED-WRITE) are A1b/A1c work.

---

## §3 Compiler subsystems touched

### §3.1 Lexer — `compiler/src/tokenizer.ts` (~1,340 LOC)

**Token disambiguation:**
- Continue tokenizing `<ident>` as the structural form when at decl-site or markup-tag position.
- Continue tokenizing `@ident` as the canonical-access form.
- These already exist in the tokenizer; verify they remain stable under v0.next shapes (no regression tests should drop).

**Reserved keywords:**
- `reset` — already partially recognized; ensure it's a reserved word (lexer-level), so `function reset() {}` and `let reset = ...` produce a `reset`-keyword token at the use site (parser then emits `E-RESERVED-IDENTIFIER`). The reservation is a LEXER concern; the error emission is a PARSER concern.
- `not` — already recognized as a unary operator in expressions (per Stage 0b D3). Verify it's still recognized; ensure no parser regression.

**Attribute names with semantic meaning (parser-level — these are tokenized as plain identifiers; the parser interprets them):**
- `default=` — parses as a generic attribute on any state-cell decl (`<x default=expr> = init`).
- `pinned` — parses as a bare modifier on state-cell decls and import items.
- `req` — parses as a bare validator attribute on Shape 2 cells.

These are NOT lexer-level reservations — they're regular identifiers that the parser recognizes contextually.

**Out of scope:** semantic checks on tokens; symbol-table interactions; whether `@ident` resolves to a state cell (that's A1b).

### §3.2 Parser / AST builder — `compiler/src/ast-builder.js` (~8,270 LOC)

The bulk of the dispatch. Specifically:

#### §3.2.1 Three RHS shapes for state declarations (§6.2)

The decl shape is `<name [attrs]> = <RHS>`. Three RHS variants:

- **Shape 1 — plain reactive cell.** RHS is a literal or expression. `<count> = 0`, `<items> = []`, `<name> = ""`. Already supported; verify no regression.
- **Shape 2 — decl-coupled-with-render-spec.** RHS is bindable markup. `<userName req length(>=2)> = <input type="text"/>`. Validators ride as bare attributes (`req`, `length(>=2)`) on the decl. **A1a parses the decl + validator-attribute syntax.** The bindable-classification is A1b/A1c.
- **Shape 3 — derived (read-only).** `const` modifier; RHS is an expression that recomputes on dep change. `const <doubled> = @count * 2`. **A1a parses the `const` modifier on `<name>` decl form and the RHS expression.** The reactivity wiring is A1c.

**AST node strategy (additive extension):**
- Existing state-decl AST nodes get a new `shape` field: `"plain" | "decl-with-spec" | "derived"`.
- Existing `validators` field (or equivalent) on decl nodes carries the bare validator-attribute list for Shape 2.
- A new `kind: "render-spec"` sub-node holds the bindable-markup RHS for Shape 2 (so it's distinguishable from a plain expression RHS). Codegen (A1c) needs this sub-node to dispatch `bind:value/checked/files`.
- For Shape 3, the `const` flag is a boolean field on the decl node.

#### §3.2.2 Variant C compound state (§6.3)

```scrml
<formRes>
    <name>  = ""
    <email> = ""
    <error> = ""
</>
```

- **Structural-children body.** Compound state's children are state-decl nodes (each is itself one of the three RHS shapes).
- **Field access via `@compound.field`** — already standard expression parsing (member-access); no new parser work beyond confirming it parses cleanly.
- **In-compound derived (§6.6.16):** `const <displayName> = @signup.name.toUpperCase()` inside a `<compound>` body. Uses Shape 3 parser path; no new node type.
- **Tier 3 predefined-shape positional sugar** (`<userInfo>: UserInfo = ("alice", 30, true)`) — already supported via type-annotation + tuple-literal parse. Verify no regression.

#### §3.2.3 Render-by-tag in markup body (§6.4)

```scrml
<form>
    <userName/>      <!-- render-by-tag: invokes the render-spec declared on the cell -->
</form>
```

- Lexer already tokenizes `<userName/>` as a self-closing tag.
- Parser builds a markup-tag node with `name = "userName"`. The disambiguation "is this a HTML element, a component instance, or a render-by-tag?" is a RESOLVER decision (A1b).
- **A1a's job:** emit a markup-tag node consistently, with enough metadata for A1b's resolver to disambiguate (likely already present — confirm).

#### §3.2.4 `default=` attribute (§6.8)

```scrml
<startTime default=null> = Date.now()
```

- Parser must recognize `default=` as an attribute on any state-cell decl form.
- AST: add a `defaultExpr` field on the decl node (null if absent).
- Note: `default=` on a `const` derived decl is `E-DERIVED-WRITE` per §6.8.1 — but that's A1b semantic enforcement. A1a just records the attribute.

#### §3.2.5 `pinned` modifier (§6.10, §21.8)

```scrml
<name pinned> = init                     // state-cell pinned
import { foo pinned } from './mod.scrml' // import pinned
```

- Parser must recognize `pinned` as a bare modifier on:
  - State-cell decls (`<name pinned> = init`).
  - Import items (`import { foo pinned } from '...'`).
  - Type-decl synthesis sites where `pinned` is meaningful (per §21.8.1).
- AST: add a `pinned: boolean` field on the relevant nodes (decl, import-item).
- Semantic enforcement (`E-STATE-PINNED-FORWARD-REF`, `E-IMPORT-PINNED-INVALID`) is A1b.

#### §3.2.6 `reset(@cell)` keyword (§6.8.2)

- `reset` is a LANGUAGE KEYWORD per §6.8.2; not a function call.
- Parser builds a `kind: "reset"` node with the cell argument.
- `reset()` with NO argument SHALL be a parse error: `E-RESET-NO-ARG`. The error fires HERE because the no-arg form is syntactically invalid (the keyword is defined as `reset(@cell)` only).

#### §3.2.7 Shape-1 / Shape-2 / Shape-3 worked examples (parser must produce correct AST for each)

Every example in `docs/articles/llm-kickstarter-v2-2026-05-04.md` §3 must parse cleanly, producing the correct AST shape. Snapshot tests (see §5.1) lock these.

#### §3.2.8 What A1a does NOT parse-validate

- `<x>` decls outside their permitted positions — that's a structural-elements-registry concern, A1b/A1c.
- Markup-element bindable classifier (`E-CELL-RENDER-SPEC-NOT-BINDABLE`) — that's typer (A1b).
- Validator semantics (`req`, `length(>=2)`) — A1a parses; A1b validates.
- Engine / match / channels / schema shapes — those are A2/A3 work; A1a parser must NOT regress them but is not extending them.

### §3.3 Expression parser — `compiler/src/expression-parser.ts` (~2,559 LOC)

**`@cell.method(...)` and `@cell.prop = expr` shape preservation.** A1a must ensure the expression parser produces AST nodes that A1b can later check for L21 (E-DERIVED-VALUE-MUTATE):

- `MemberCall`: receiver = `@cell` chain, method = identifier, args = expr list.
- `MemberAssignment`: target = `@cell.path` chain, op ∈ {`=`, `+=`, `-=`, …, `??=`, `||=`, `&&=`}, value = expr.
- `UnaryDelete`: operand = `@cell.path` chain.

These shapes likely ALREADY exist; A1a verifies them and adds tests. No new node types needed unless the existing parser collapses these into a single generic shape that loses the distinction.

### §3.4 Body pre-parser / component expander — `compiler/src/body-pre-parser.ts`, `compiler/src/component-expander.ts`

**No expected work.** Touch only if a new shape from §3.2 forces an interaction. If touched, document why in `progress.md`.

### §3.5 Attribute registry — `compiler/src/attribute-registry.js` (~227 LOC)

If the registry tracks "known attributes per element type," ensure `default=`, `pinned`, `req`, and the universal-core validator names (`length`, `pattern`, `min`, `max`, `gte`, `lte`, `eq`, `oneOf`, `email`, `url`, `numeric`, `integer`, `custom`) are NOT rejected at the parser level for state-cell decls (Shape 2). A1a's role is to PARSE these — A2 will validate them semantically.

---

## §4 Error codes A1a emits

| Code | Trigger | Reference |
|---|---|---|
| `E-RESERVED-IDENTIFIER` | A user-declared identifier shadows a reserved keyword. Specific A1a case: `function reset(...) {...}` or `fn reset {...}` — the local-function name `reset` collides with the language keyword. | §6.8 + §34 |
| `E-RESET-NO-ARG` | `reset()` called with no argument. The `reset` keyword requires an explicit cell argument: `reset(@cell)` or `reset(@compound.field)`. | §6.8.2 + §34 |

All other v0.next codes defer to A1b (resolver/typer work) or A1c (codegen/runtime work).

---

## §5 Test work

### §5.1 New tests A1a adds

**Snapshot-style AST tests** at `compiler/tests/integration/parse-shapes-v0next.test.js` (single file, grows across A1a/A1b/A1c).

Required test groups:

1. **Shape 1 (plain reactive cell).** ~5 cases covering literal-int / literal-string / array / object / expression RHS.
2. **Shape 2 (decl-coupled-with-render-spec).** ~8 cases covering `<input type="text"/>`, `<input type="checkbox"/>`, `<input type="email"/>`, `<input type="number"/>`, `<input type="file"/>`, `<textarea/>`, `<select>...</>`, plus one with multiple validator attributes (`req length(>=2) pattern(/^[A-Z]/)`).
3. **Shape 3 (derived).** ~6 cases covering `const <x> = @y * 2`, multi-dep, in-compound (§6.6.16), markup-typed (§6.6.17), no-deps `W-DERIVED-001` shape (lint is A1b; A1a just parses the no-dep RHS), self-reference shape (cycle detection is A1b).
4. **Variant C compound.** ~4 cases covering plain compound, compound + Shape-2 children, compound + Shape-3 children, nested compound.
5. **Render-by-tag in markup body.** ~3 cases covering self-closing `<x/>`, in-loop, in-component-body.
6. **`default=` attribute.** ~3 cases covering `default=null`, `default=42`, `default=@otherCell`.
7. **`pinned` modifier.** ~4 cases covering pinned state-cell, pinned import item, pinned engine import (§21.8.1 — parse-only, no semantic check), unpinned baseline.
8. **`reset(@cell)` keyword.** ~3 cases covering `reset(@x)`, `reset(@compound.field)`, `reset()` (E-RESET-NO-ARG positive trigger).
9. **`E-RESERVED-IDENTIFIER` triggers.** ~2 cases: `function reset() {...}` and `fn reset {...}`.
10. **MemberCall / MemberAssignment / UnaryDelete shape preservation.** ~6 cases covering `@arr.push(x)`, `@obj.foo = 1`, `@obj.foo += 1`, `delete @obj.foo`, chained `@form.field.push(x)`, deeply-chained `@a.b.c.d = e`. (No semantic validation here; A1b uses these to fire E-DERIVED-VALUE-MUTATE.)
11. **Kickstarter v2 §3 example smoke.** Each of the §3 example snippets (the ones that demonstrate baseline scrml shape — not the recipes in §11) parses without error. Compile-only; no runtime.

**Negative-no-trigger guard tests:** ~3 cases that LOOK similar but should NOT trigger A1a's two error codes (e.g., `let x = reset(@cell)` parses fine; `function notReset() {}` parses fine).

Estimated total: ~50-60 new test cases.

### §5.2 Existing tests — KEEP / REWRITE / DROP

**Pre-authorization (S56 directive, S59 specific authorization):** A1a may freely REWRITE or DROP existing parser tests that bake in pre-v0.next access patterns. Closing CHANGELOG entry must enumerate the dropped/rewritten suite. PA reviews the enumeration before next push.

- **KEEP:** parser tests at the token-stream / lower-AST level that don't pin specific access syntax.
- **REWRITE:** parser tests that hard-code old-shape declarations (e.g., `const @x = ...` instead of `const <x> = ...`).
- **DROP:** any test asserting pre-v0.next access patterns as ground truth (e.g., bare-name reactive reads such as `count + 1` resolving to `@count + 1`).

The full lex+parse+resolve test surface today (`compiler/tests/parser/`, `compiler/tests/unit/`, `compiler/tests/integration/`) is large; do NOT rewrite anything that touches resolver/typer/codegen behavior — leave that to A1b/A1c. If a test mixes parser + downstream behavior, leave it as-is; A1b will revisit.

### §5.3 Validation gates (A1a definition-of-done)

1. **`bun test` passes** — pre-commit suite green; full suite (excl. browser) green if reachable. No `--no-verify`.
2. **All ~50-60 new snapshot tests green.**
3. **Both new error codes** (`E-RESERVED-IDENTIFIER`, `E-RESET-NO-ARG`) have ≥1 positive trigger test green AND ≥1 negative-no-trigger guard test green.
4. **Kickstarter v2 §3 every example snippet** parses cleanly via a compile-only smoke gate.
5. **Existing test deltas enumerated** in `progress.md` (drop list + rewrite list with reason per entry).
6. **Worktree clean** at dispatch end; final commit message follows the family pattern.

---

## §6 What A1a does NOT do

- **No resolver work.** Symbol tables, V5-strict bare-name-is-local enforcement, hoisting topo-sort, pinned forward-ref detection, name-collision detection — all A1b.
- **No typer work.** Markup-as-first-class typing, render-spec-bindable classifier, markup-typed derived cells, refinement-type predicate inference — all A1b.
- **No codegen work.** Render-by-tag expansion, `bind:*` dispatch, `reset()` lowering, derived-cell wiring, MemberCall/MemberAssignment/UnaryDelete L21 enforcement — all A1c.
- **No PIPELINE.md edits.** Folded into A1c.
- **No SPEC.md edits.** SPEC is the engineering target as of Stage 0b close + S59 L21 lock; A1a aligns code to spec, not the other way.
- **No engine / match / channel / schema parser changes.** Those are A2/A3 work.
- **No stdlib / examples / samples edits.** Those are B-track work.
- **No `pa.md` / `master-list.md` / `hand-off.md` edits.** PA-only files.

---

## §7 Operational discipline

### §7.1 Worktree-isolated

Per pa.md F4 mandate. Branch name: `phase-a1a-lex-parse`.

**Startup verification block** (paste verbatim into agent prompt with absolute path filled in):

```
# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

Your worktree path is: <ABSOLUTE-WORKTREE-PATH>

## Startup verification (do this BEFORE any other tool call)

1. Run `pwd` via Bash. Output MUST equal the worktree path above. Save the
   output as your WORKTREE_ROOT for the rest of the dispatch.
2. Run `git rev-parse --show-toplevel` via Bash. Output MUST equal WORKTREE_ROOT.
3. Run `git status --short` via Bash. Confirm tree is clean.
4. Run `bun install` via Bash. Worktrees do NOT inherit `node_modules` from main.

If ANY check fails: DO NOT proceed. Report the mismatch and exit.

## Path discipline (enforce on EVERY Read/Write/Edit call)

- For Write/Edit: ALWAYS use ABSOLUTE paths under WORKTREE_ROOT. Do NOT use
  relative paths. Do NOT use absolute paths starting with the main repo root.
```

### §7.2 Crash-recovery

- **Incremental commits.** After each meaningful unit (e.g., "add Shape-2 AST node + ~5 tests"), commit. WIP commits are fine: `WIP(a1a): shape-2 AST node`. The branch is the checkpoint.
- **Progress file.** `docs/changes/phase-a1a-lex-parse/progress.md`. Append a timestamped line per major step. Do NOT rewrite — append-only.
- **Pre-commit hook ALWAYS runs** (`bun test`). Never `--no-verify`. If the hook fails, fix the cause; commits-with-failing-tests are not acceptable.

### §7.3 Tier classification

A1a is **T2** (cross-pass, invariant-bearing). The lexer/parser changes ripple through downstream phases that A1a does NOT touch — but the AST shape A1a produces is the contract A1b/A1c rely on. T2 means careful, test-anchored, with explicit AST-shape contracts documented in `progress.md`.

### §7.4 Final commit message

Suggested form:

```
compile(phase-a1a): lexer + parser for v0.next shapes

- Lexer: reserve `reset` keyword (E-RESERVED-IDENTIFIER trigger); confirm `not`
  + `<ident>` + `@ident` + new attribute-name awareness (`default=`, `pinned`,
  `req`).
- Parser: three RHS shapes (plain / decl-with-render-spec / derived) on
  state-cell decls; Variant C compound (structural-children body); render-by-tag
  `<x/>` in markup; in-compound `const <x>` (§6.6.16); markup-typed derived
  (§6.6.17); `default=` attribute (§6.8); `pinned` modifier on decls + imports
  (§6.10, §21.8); `reset(@cell)` keyword + E-RESET-NO-ARG (§6.8.2).
- Expression parser: MemberCall / MemberAssignment / UnaryDelete shape
  preservation (A1b uses these for L21 E-DERIVED-VALUE-MUTATE).
- AST strategy: ADDITIVE — extended existing node types with shape/const/
  pinned/defaultExpr fields; new `render-spec` sub-node for Shape 2.
- New tests: ~50-60 snapshot cases at
  compiler/tests/integration/parse-shapes-v0next.test.js + ~3 negative guards.
- Existing tests: <N> kept / <N> rewritten / <N> dropped (enumerated in
  progress.md and CHANGELOG).
- E-codes added: E-RESERVED-IDENTIFIER, E-RESET-NO-ARG.
- Tests: <baseline> → <after-a1a>. 0 failures contract maintained.

Phase A1a of three (A1b: resolver+typer; A1c: codegen + PIPELINE.md prose).
SPEC authority: §1 / §3 / §6 (centerpiece) / §11 (folded) / §34.
```

---

## §8 Risks (A1a-specific)

- **Existing parser is large** (8,270 LOC ast-builder + 2,559 LOC expression-parser). The additive strategy minimizes blast radius but the v0.next-shape variants must coexist cleanly with pre-v0.next code paths still in tests/samples.
- **`pinned` modifier appears in multiple positions** (state-cell decl + import item + engine import per §21.8.1). Coverage must hit all three.
- **Validator-attributes bare-form** (`<x req length(>=2)>`) needs care to not collide with HTML attribute parsing rules. Confirm the parser distinguishes "validator attribute on a state-cell decl" from "HTML attribute on a markup element."
- **Render-by-tag self-closing `<x/>`** vs **HTML self-closing element** — at parse time they're indistinguishable. A1a emits one node shape; A1b's resolver disambiguates. Confirm A1a does not commit to a category prematurely.
- **`reset` keyword status** — already partially recognized; the v0.next shape requires it be a true reserved word. May collide with stdlib usage (e.g., a method named `reset` on some module). Stdlib audit (B3) handles cross-cutting collisions; A1a only enforces the LOCAL-binding case (`function reset() {}`).

---

## §9 Estimated wall-time

| Sub-task | Est. |
|---|---|
| §3.1 Lexer changes | 1-2 h |
| §3.2.1 Three RHS shapes (parser + AST) | 3-5 h |
| §3.2.2-3 Variant C + render-by-tag | 1-2 h |
| §3.2.4-6 `default=` / `pinned` / `reset(@cell)` | 1-2 h |
| §3.3 Expression-parser shape verification | 1-2 h |
| §5.1 New snapshot tests (~50-60 cases) | 2-3 h |
| §5.2 Existing-test rewrites + drops | 1-2 h |
| Integration + commit hygiene + progress file | 1 h |

**Total: 11-19 h focused work.** PA confidence: medium-high. The largest risk is hidden coupling in `ast-builder.js` between pre-v0.next and v0.next shapes that surfaces during integration; budget includes contingency for that.

---

## §10 Success criteria checklist (final)

- [ ] All §5.3 validation gates green
- [ ] No `--no-verify` in any commit on `phase-a1a-lex-parse` branch
- [ ] `progress.md` complete with timestamped entries
- [ ] AST-shape contracts documented in `progress.md` (one section per new field, names + permitted values)
- [ ] Existing-test deltas enumerated (drop / rewrite / keep) with reason per row
- [ ] Final commit message follows §7.4 form
- [ ] Worktree clean
- [ ] CHANGELOG entry drafted (PA review at integration)

---

## §11 Cross-references

- v0.next implementation roadmap: `docs/changes/v0next-spec-impact/IMPLEMENTATION-ROADMAP.md` §2.1
- SPEC engineering target: `compiler/SPEC.md` §1 / §3 / §6 / §11 / §34
- L21 lock landed S59: `compiler/SPEC.md` §6.6.18 + §34 entry; sibling rename §6.6.8
- Stage 0b dispatch ledger: `docs/changes/v0next-spec-impact/DISPATCH-{1..4}-BRIEF-*.md`
- Kickstarter v2 (anchor for §3 examples): `docs/articles/llm-kickstarter-v2-2026-05-04.md`
- PA scrml expert primer: `docs/PA-SCRML-PRIMER.md`
- F4 path discipline: `pa.md` §"Worktree-isolation: startup verification + path discipline"
- This dispatch progress file: `docs/changes/phase-a1a-lex-parse/progress.md` (created at dispatch start)

---

## §12 Tags

#dispatch-a1a #phase-a1 #lex-parse #v0next-implementation #compiler-source #t2-tier
