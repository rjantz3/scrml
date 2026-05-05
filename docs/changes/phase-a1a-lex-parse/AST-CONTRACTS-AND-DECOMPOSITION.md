# A1a — AST contracts + task decomposition

**Status:** Drafted by S60 dispatch agent at survey time. Not yet implemented. Surfaced to PA so the implementation can be dispatched as 6-7 sequential single-file sub-agents (each with its own PRE-BRIEF) per the dev-pipeline PHASE 0.5 protocol.

**Why a draft instead of an implementation:** the brief estimates 11-19 h focused work over `tokenizer.ts` (1,340 LOC), `ast-builder.js` (8,270 LOC), `expression-parser.ts` (2,559 LOC) plus 50-60 new snapshot tests + existing-test rewrites. A single-agent monolithic run on this surface is the textbook context-overflow scenario the dev-pipeline doctrine specifically warns against. The honest move is decomposition + AST-contract anchoring, then sub-agent dispatch.

---

## §1 AST contracts (the A1b/A1c-facing interface)

These are the additive shape changes to existing AST node kinds. **No new node kinds for state declarations** — only field extensions on `kind: "state"`. New node kinds are introduced only for `render-spec` (Shape 2 RHS) and `reset-expr` (the `reset(@cell)` expression).

### §1.1 `kind: "state"` — extended

Currently carries: `stateType`, `attrs`, `children`, `openerHadSpaceAfterLt`, `span`, plus optional `isSubstate`/`parentState`.

A1a adds:

| Field | Type | Permitted values | Set by | A1b/A1c consumes |
|---|---|---|---|---|
| `shape` | string | `"plain"` \| `"decl-with-spec"` \| `"derived"` | parser, after RHS classification | A1b resolver/typer; A1c codegen dispatch |
| `isConst` | boolean | true iff `const <x> = ...` form | parser, when `const` modifier seen on the decl | A1b derived-cell wiring; A1b L21 enforcement |
| `validators` | array of `{name: string, args: ExprNode[] \| null, span}` \| null | parser, from bareword-attrs on Shape 2 decls | parsed contextually during Shape 2 attr scan | A1b validator typer; A2 reactive validity surface |
| `defaultExpr` | ExprNode \| null | RHS of `default=` attribute when present | parser, when `default=` attr seen | A1c codegen for `reset(@cell)` lowering |
| `pinned` | boolean | true iff `pinned` bareword modifier present | parser, when `pinned` bareword attr seen | A1b forward-ref check; A1c hoisting |
| `renderSpec` | RenderSpecNode \| null | Shape 2 only; the bindable markup RHS | parser, when RHS is a markup element | A1b bindable classifier; A1c bind:* dispatch |
| `initExpr` | ExprNode \| null | Shape 1 + Shape 3 RHS expression | parser, when RHS is an expression | A1b deps inference; A1c init wiring |

**Invariant:** exactly one of `renderSpec` / `initExpr` is non-null on a non-compound-parent state node. Compound parents (Variant C) have neither — their RHS is the `children[]` of nested state-decl nodes.

**`shape` discriminant rule:**
- `shape: "plain"` ↔ `isConst === false` AND `renderSpec === null` AND has `initExpr` AND no validators
- `shape: "decl-with-spec"` ↔ `isConst === false` AND `renderSpec !== null` AND `initExpr === null`
- `shape: "derived"` ↔ `isConst === true` AND `initExpr !== null` AND `renderSpec === null` (markup-typed derived per §6.6.17 still has the markup expression as `initExpr` not `renderSpec` — it's an expression that *evaluates to* markup, not a render-spec for a writable cell)

**Compound (Variant C) parent:** `shape: "plain"` (default), `children[]` non-empty, no `initExpr` no `renderSpec`. Field children are themselves `kind: "state"` nodes with their own `shape`.

### §1.2 `kind: "render-spec"` — NEW

```
{
  kind: "render-spec",
  element: MarkupNode,       // the bindable markup AST node (input/textarea/select)
  span
}
```

Used as the value of `renderSpec` on a Shape-2 state node. Wraps the existing markup AST node so A1b/A1c have a stable type-tag for "this markup is a render-spec for a state cell," distinct from "this markup is a value being assigned to a state cell."

### §1.3 `kind: "reset-expr"` — NEW (in expression-parser)

```
{
  kind: "reset-expr",
  target: ExprNode,    // must be @cell or @compound.field; A1b validates the shape
  span
}
```

Parser-level invariant: `reset` keyword followed by `(` followed by exactly one expression argument, followed by `)`. Zero-arg form fires `E-RESET-NO-ARG`. Multi-arg or complex argument is allowed at parse time; A1b validates that the target resolves to a state cell.

### §1.4 `kind: "import-item"` — extended

Add `pinned: boolean` field. Set when `pinned` bareword modifier appears in the import-list item.

### §1.5 Expression nodes — shape preservation only

`MemberCall`, `MemberAssignment` (with `op` field), `UnaryDelete` already exist (need to verify in `expression-parser.ts` — see §3 task list step 4 below). A1a confirms they survive the v0.next changes; no new fields added. A1b uses these to fire L21 (E-DERIVED-VALUE-MUTATE).

---

## §2 Lexer contracts

### §2.1 Reserved keyword additions

- `reset` — add to `KEYWORDS` set in `tokenizer.ts` line ~55-85. Currently absent. Effects:
  - Tokenized as a `keyword`-kind token at every site (not a generic identifier).
  - `function reset() {...}` → parser sees `function` `keyword(reset)` → `E-RESERVED-IDENTIFIER`.
  - `reset(@x)` → expression-parser sees `keyword(reset)` `(` `expr` `)` → `kind: "reset-expr"`.
- `pinned` — **NOT** added to global `KEYWORDS`. Per brief §3.1 it's a contextual bareword. The parser recognizes it inside attribute lists of state-decl + import-item only.
- `default` — already in `KEYWORDS` (line 58). Parser recognizes `default=` form contextually inside state-decl attribute lists.
- `req` — **NOT** a reserved keyword. Bareword-attribute on Shape 2 decls. Parser recognizes contextually.
- `not` — already in `KEYWORDS` (line 78). No A1a work.

### §2.2 No-op verification

Per brief §3.1, verify `<ident>` (structural decl-site / markup-tag) and `@ident` (canonical access) tokenize unchanged. Smoke-test with the kickstarter v2 §3 examples in §5.1.

---

## §3 Task decomposition (sequential sub-agent dispatches)

Each step is a focused sub-agent with its own PRE-BRIEF, single-file scope, and incremental commits.

| # | Step | Files | Est | Out |
|---|---|---|---|---|
| 1 | Lexer: reserve `reset` | `tokenizer.ts` (lines ~55-85; add `reset` to KEYWORDS); add 4-6 unit tests in a new `compiler/tests/unit/tokenizer-reset-keyword.test.js` | 1 h | Branch tip with `reset` reserved + tests green |
| 2 | Parser: state-decl `shape` discriminant + `isConst` + `initExpr` for Shapes 1 + 3 | `ast-builder.js` only — extend `kind: "state"` build-block at lines ~7349-7407; add `parseStateDeclRhs` helper that classifies RHS into plain expr / markup / const-prefixed | 3-4 h | Shapes 1 + 3 tagged correctly; no Shape 2 yet; ~15 snapshot tests added |
| 3 | Parser: Shape 2 `renderSpec` + bareword validators + `req` | `ast-builder.js` only — extend `parseStateDeclRhs` to detect markup-RHS, wrap in `kind: "render-spec"` node; extend attr scan to collect bareword validators (incl. `length(>=2)`-style call-form) into `validators[]` | 3-4 h | Shape 2 tagged; ~10 snapshot tests added |
| 4 | Parser: `default=` attribute + `pinned` bareword on state-decl | `ast-builder.js` only — extend attr scan to extract `default=expr` → `defaultExpr` field, and `pinned` bareword → `pinned: true` field | 1-1.5 h | ~6 snapshot tests added |
| 5 | Parser: `pinned` on import items | `ast-builder.js` only — extend import-decl parser to recognize `pinned` bareword inside `{ name pinned, ... }` import lists | 0.5-1 h | ~3 snapshot tests added |
| 6 | Expression parser: `reset(@cell)` keyword + `E-RESET-NO-ARG` | `expression-parser.ts` only — recognize `keyword(reset)` `(` `expr?` `)` → `kind: "reset-expr"`; emit `E-RESET-NO-ARG` on zero-arg form | 1-2 h | ~4 snapshot tests added |
| 7 | Expression parser: shape verification for `MemberCall` / `MemberAssignment` (incl. compound-assign ops) / `UnaryDelete` | `expression-parser.ts` only — verify these node kinds exist; if collapsed, split them; add `op` field to `MemberAssignment` carrying the operator text | 1-2 h | ~6 snapshot tests added |
| 8 | E-RESERVED-IDENTIFIER trigger | `ast-builder.js` only — emit error when `function` / `fn` declarator uses `reset` as the name. **Dependency from Step 1 (logged S60):** `compiler/src/commands/init.js:65` contains `function reset() { @count = 0 }` inside the init starter template + corresponding `<button onclick=reset()>` on line 77. When E-RESERVED-IDENTIFIER lands, the init test (`compiler/tests/commands/init.test.js:313` "app.scrml compiles without errors") will regress. Step 8 PRE-BRIEF must include: rename `function reset()` → `function clearCount()` (or similar) in init.js and update the onclick callsite. | 0.5 h | ~2 trigger tests + ~2 negative-guard tests |
| 9 | Compound (Variant C) verification + render-by-tag verification + kickstarter v2 §3 smoke tests | new test file additions only — likely no source changes | 1-1.5 h | ~7 snapshot tests + ~10 smoke tests |
| 10 | Existing-test deltas: rewrite + drop | enumerate in `progress.md`; per brief §5.2 freely rewrite tests baking in pre-v0.next access patterns | 1-2 h | All ~50-60 new tests + drops/rewrites enumerated |
| 11 | Final commit + CHANGELOG draft | aggregate; final commit per brief §7.4 template | 0.5 h | Branch ready for PA review |

**Total: 13-19 h focused work.** Aligns with brief §9 estimate.

**Sequencing rationale:** Step 1 (lexer) is foundational. Steps 2-3 are the core parser work; Step 3 depends on Step 2 (`shape` discriminant). Steps 4-5 are independent but share the attr-scan code path with Step 3. Step 6 depends on Step 1 (lexer reservation). Step 7 is independent. Step 8 depends on Step 1. Step 9 is integration; Step 10 is cleanup; Step 11 is wrap.

---

## §4 What this dispatch agent (S60) committed

1. Branch `phase-a1a-lex-parse` created at `3c9748e`.
2. `bun install` + `bun run pretest` ran clean.
3. `bun run test` baseline: run-1 had 2 transient ECONNREFUSED-tail failures (8719 / 43 / 2 / 8764); run-2 + run-3 clean at expected (8720 / 43 / 0 / 8763). Per rev-3 flake protocol: BASELINE STABLE.
4. `progress.md` opened.
5. This file (`AST-CONTRACTS-AND-DECOMPOSITION.md`) drafted.
6. No source files modified.

## §5 What this dispatch agent did NOT do — and why

Did not begin implementation of any of the 11 task steps above. Reason: the brief requested a single-dispatch-agent monolithic implementation, but the dev-pipeline doctrine in this agent's system prompt (Pitfall 4 — Context Overflow + PHASE 0.5 TASK DECOMPOSITION) requires sequential single-file dispatches when (a) total LOC under change exceeds ~10k, (b) the change touches 3+ files across pipeline stages, or (c) the work is estimated at 10+ hours. All three apply. The honest call was: produce the contracts + decomposition, surface to PA, let PA dispatch the per-step sub-agents.

## §6 Recommendation to PA

Dispatch Step 1 next as a fresh sub-agent on this same `phase-a1a-lex-parse` branch with a focused PRE-BRIEF that points at:
- `compiler/src/tokenizer.ts` lines 55-85 (KEYWORDS set)
- This file (`AST-CONTRACTS-AND-DECOMPOSITION.md`) §2.1 (lexer contract)
- New test file path: `compiler/tests/unit/tokenizer-reset-keyword.test.js`

After Step 1 lands, dispatch Step 2 with PRE-BRIEF pointing at `ast-builder.js` lines 7349-7407 + this file §1.1.

Continue through Step 11. Each step is a separate commit (or set of WIP commits) on the branch. Final aggregate commit per brief §7.4 closes the dispatch.

---

## §7 Tags

#dispatch-a1a #ast-contracts #task-decomposition #phase-a1 #context-discipline
