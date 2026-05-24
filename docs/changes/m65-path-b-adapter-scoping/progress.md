# M6.5 path-b — within-node AST adapter SCOPING progress

Dispatch: S125 survey-only diagnostic agent
Worktree: `.claude/worktrees/agent-a9b1c45720e36604d`
Base SHA after merge main: `404fc619` (the M6.7 STOP commit — the revert that triggered this dispatch)

## Timeline

- **Step 0 — startup.** Verified pwd, worktree root, status clean. Merged main forward (already at 404fc619 post-merge, no new commits). bun install OK. Created `docs/changes/m65-path-b-adapter-scoping/`.
- **Step 1 — required-reading.** Read M6.7 STOP doc + M5-divergence-ledger + M5-ast-bridge-scoping + M6 cutover plan §M6.5 + api.js routing site (line 844) + parse-file.js + b.2 walker test. Key prior context: M5 ledger was about getting native → FileAST shape at all (catalog-rename); the F-units F1-F9 closed BLOCK-PAYLOAD divergence + statement-catalog (A1 translate-stmt) + hoist gap (A3 collect-hoisted). M6.7 STOP confirmed that even with those closed, WITHIN-NODE field-level divergences remained that the canary's top-kind / hoist-count / deep-seq-kind metrics never measured.
- **Step 2 — empirical diff runner.** Built `scratch/m65-ast-diff.js` (a parallel dual-pipeline walker that classifies divergences by class: KIND-NAME / FIELD-SHAPE / MISSING-FIELD / EXTRA-FIELD / COUNT-LENGTH / SPAN-COORD) plus `scratch/m65-dump.js` (raw-JSON dual-dump). Ran on the 3 brief-cited fixtures + 5 isolated reproducer fixtures (sql top-level, sql-in-logic, const-derived, import, match, engine).
- **Step 3 — empirical catalog complete.** Findings: 01-hello (clean both) → 53 divergences. 14-mario (live-clean, native 43 errors) → 781 divergences inc 33 KIND-NAME. 22-multifile (live-clean, native-clean!) → 186 divergences inc 1 KIND-NAME + COUNT-LENGTH=2 (the hoist gap). Each isolated reproducer pinned ONE divergence class. M6.7 STOP example (`bare-expr+sql-ref` envelope) CONFIRMED reproduced on sql-in-logic fixture; root cause is `emitStringFromTree({kind:"sql-ref"})` returns `"?{ /* sql */ }"` which fails the `SQL_SIGIL_PATTERN = /\?\{` /` regex.
- **Step 4 — drafting SCOPING.md.** Done. 477-line deliverable at `docs/changes/m65-path-b-adapter-scoping/SCOPING.md`. Empirical catalog (7 divergence classes), per-class adapter sizing, 7-unit decomposition (M6.5.b.0 — M6.5.b.7), 5 named PA decisions, 29-54h re-estimate vs plan's 30-60h. Pre-commit gate cleanly passed (14135 tests).
- **Step 5 — closure.** SCOPING.md committed `d2cb042a`. WORKTREE clean. Final report follows.

## Final summary

**WORKTREE_PATH:** `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a9b1c45720e36604d`
**FINAL_SHA:** `d2cb042a`
**BRANCH:** `worktree-agent-a9b1c45720e36604d`

**Divergence classes:** 7 (A bodyChildren, B sql-ref envelope, C hoist-gap, D match-arm separator, E structural-decl LHS, F shape-formatting, G span-coord).

**Sub-unit decomposition:** 8 dispatchable units (.b.0 canary, .b.1-.b.6 parallel-eligible class fixes, .b.7 closure). DAG: .b.0 gates all; .b.1-.b.6 file-disjoint parallel; .b.7 verifies. Class A folded to M6.6 closure (not M6.5.b).

**Re-estimate:** 29-54h (excluding folded Class A) vs plan's 30-60h — slight depth-of-survey shrink (~10%). Within the M6.5 path-b budget; no v0.8 deferral trigger.

**PA decisions surfaced (5):**
1. Adapter site = api.js boundary for ADAPT classes; FIX-NATIVE bypasses adapter entirely.
2. FIX-NATIVE recommended for Classes B/C/D/E (4 of 5 loud classes are native parser GAPS/BUGS, not shape differences).
3. Within-node parity canary extension required FIRST (M6.5.b.0).
4. M6.7 re-flip MUST gate on full `bun run test` clean under native parser, not just canary.
5. Class A (engine bodyChildren) folds to M6.6 closure dispatch, not M6.5.b.

---

# M6.5.b.1 — FIX-NATIVE match-arm newline separator (S125+)

Dispatch: M6.5.b.1
Worktree: `.claude/worktrees/agent-a8bb97501fe5a8629`
Base SHA after merge main: HEAD `5b1afb9d` (post the M6.5.b.0 + M6.6.b.3 + M6.7 STOP landings)

## Step 0 — startup
- `pwd` = worktree root; `git rev-parse --show-toplevel` matches.
- `git merge main --no-edit` absorbed live HEAD; tree clean post-merge.
- `bun install`, `bun run pretest` clean.
- Baseline within-node canary: 1004 pass / 0 fail / 133054 total divergences across 1000 files.

## Step 1 — Bug site located
- `compiler/native-parser/parse-expr.js:2546-2557` — `parseMatchExpr` arm-list loop:
  only `TokenKind.Comma` is consumed between arms. No semicolon support, no newline support.
- `parseMatchArm:2569-2605` consumes the body via `parseAssignmentExpr` (concise form)
  or `parseBlockStub` (block form). When body finishes on line N, next arm pattern
  starts on line N+1 — ASI-style newline-between-arms is the canonical scrml form.

## Step 2 — SPEC normative reference
- §18.2 grammar `match-expr ::= 'match' expression '{' match-arm+ '}'` —
  `match-arm+` with NO inter-arm separator token in the production.
- §18.0.1 + §17 worked examples all use newline-separated arms.
- The native parser already documented "newline- or comma-separated in practice" in
  comment on line 2552 — only the comma branch was implemented.

## Step 3 — landing (S125 PA)
- Agent stalled on response stream after 5.3h of work; all substantive work was
  committed to the worktree branch BEFORE the stall. PA-side recovery via S89
  §13.2 partial-recovery protocol — branch-tip work coherent + complete.
- Landed via standard S67 file-delta as commit `afbc566c` on main.

---

## M6.5.b.2 — FIX-NATIVE structural-decl `<ident>` LHS binding

**Dispatch SHA at start:** `5b1afb9d` (post-merge main)
**Worktree:** `.claude/worktrees/agent-ac5bb60eda1a55282`

### Step 0 — startup verification

- pwd: `.claude/worktrees/agent-ac5bb60eda1a55282` (verified prefix OK)
- git rev-parse: matches WORKTREE_ROOT
- git merge main: clean, fast-forward from 404fc619 to 5b1afb9d
- git status: clean
- bun install: 117 packages OK
- bun run pretest: dist populated, 13 test samples compiled
- Baseline: `bun test compiler/tests/parser-conformance-within-node.test.js` → 1004 pass, corpus aggregate 133054 divergences over 1000 files. Class histogram: KIND-NAME:3398, FIELD-SHAPE:14164, MISSING:42464, EXTRA:19097, COUNT-LENGTH:1562, SPAN-COORD:52369.

### Step 1 — required reading + analysis

- SCOPING.md §1 Class E read in full + §3 .b.2 + §4 Decision B.
- SPEC §6.1-§6.2 (V5-strict + 3 RHS shapes) read in full at lines 1923-2200.
- SPEC §6.6 derived at lines 2620-2740. SPEC §6.10 pinned at 5182-5220. SPEC §32 tilde-decl at 14832-14920.
- Reference impl: `compiler/src/ast-builder.js` lines 3550-4200 (`tryParseStructuralDecl` + `scanStructuralDeclLookahead`) + lines 4790-4840 (the `const <ident>` dispatch arm) + lines 6400-6420 (the bare `<` arm).
- Live `state-decl` contract: `compiler/src/types/ast.ts` lines 502-624 (ReactiveDeclNode interface).
- Live state-decl fields needed: name, init, initExpr, structuralForm:true, isConst, shape ("plain"|"derived"|"decl-with-spec"), defaultExpr, pinned, typeAnnotation, reactivity (debounced/throttled), validators (Shape 2), renderSpec (Shape 2), children (compound).

### Step 2 — empirical reproduction of bug

Ran the fixture `m65-fixture-const-derived.scrml`:
- LIVE produces 2 state-decl nodes (a plain + a derived).
- NATIVE produces 1 const-decl with empty name + empty init. The `<a> = 1` is also LOST entirely (translate-stmt drops native `StateDecl` via default arm).

### Three-layer fix plan

1. **parse-stmt.js dispatcher** — when `const` keyword leads and next token is `<`, route into `parseStructuralStateDecl` with isConst=true (mirrors live ast-builder.js:4828). Currently parseVarDecl is invoked unconditionally on `const`.
2. **parse-stmt.js parseStructuralStateDecl** — extend to:
   - accept and surface `isConst` argument (passed via context-arg or wrapper)
   - capture attribute-region fields raw: `pinned`, `server`, `default=expr`, `debounced=`, `throttled=`
   - shape: "derived" when isConst else "plain"
   - structuralForm: true
3. **translate-stmt.js** — add `case "StateDecl":` arm that maps the native StateDecl object to live `state-decl` shape with all fields. Currently dropped via default.

### Sizing/scope decisions

- **Validators (Shape 2)** + **renderSpec** + **compound children (Variant C)** — DEFERRED. Class E's SCOPING is the LHS-binding form for Shape 1/3 (plain + derived). Shape 2 has a separate divergence class (Class A bodyChildren is the engine-only one; markup-RHS on state-decls is its own sub-class — would expand scope by ~50% per fixture). If detected by a corpus fixture beyond const-derived, surface as STOP condition.
- **`~ <x>` / `~snapshot <x>`** — the brief mentions these as productions to support, but SPEC §32 defines `~` as the pipeline accumulator, NOT a state-decl prefix. The existing `~name = pipeline` tilde-decl (B3 landed) is the actual SPEC §32 surface. The `~ <x>` shape does not appear in SPEC. NOT IMPLEMENTING; will surface as a NOTE.
- **`<x>! = expr` pinned variant** — the brief lists `<x>!` (bang-pinned). SPEC §6.10 normative form is `<x pinned>` (bareword inside opener), not `<x>!`. The bang-pinned form does not appear in SPEC. NOT IMPLEMENTING the bang form; the `<x pinned> = init` form is captured via the attribute-region.

### Step 3 — implementation landed

Three commits:
- `dcb69cb3` parse-stmt extends parseStructuralStateDecl + const<x> dispatch
- `c04ca41d` translate-stmt adds StateDecl arm + ast-stmt StmtKind.StateDecl
- `ab1eecb9` refine translate-stmt + refresh within-node allowlist
- `97203ec0` 28 unit tests + Kw-attr support (server / default hard-keyword names)

### Step 4 — verification

- New unit tests: `compiler/tests/unit/m65-b2-structural-state-decl.test.js` — 28/28 pass.
- Within-node-canary: 1004/1004 pass after allowlist regen. Corpus aggregate
  133054 → 134394 (+1340). KIND-NAME shifted: 3398 → 3487 (+89 from alignment
  shifts in fixtures where the new state-decl emit changes downstream body[]
  indices in fixtures with pre-existing native bugs e.g. Mario match-arm
  cluster). FIELD-SHAPE +426 (new state-decl legacy `init:''` vs raw text
  divergence; pre-existing native debt acknowledged in live `init` field
  docs). COUNT-LENGTH -94, MISSING-FIELD -8 (improvements: state-decls now
  surface so body counts align).
- Sister canary (parser-conformance-corpus): 1018/1018 pass. Strict 999/1000
  preserved; 35 files reclassified EXACT → DEFERRAL-test-block (21) +
  LIVE-DEGENERATE (12) + LIVE-HOIST-MISCLASSIFY (2). All still "explained".
- Full pre-commit gate: 14074 pass, 88 skip, 1 todo, 0 fail across 14163
  tests in 718 files (68.87s).

### STOP conditions evaluated

- **STOP-1 (productions surface as N×M with existing native AST shape)** —
  NOT TRIGGERED. The live `state-decl` shape was directly representable. The
  PARTIAL fixes (defaultExpr / reactivity duration-grammar parse) are sibling
  feature gaps surfaced as NOTES, not blockers.
- **STOP-2 (cascade in downstream consumers relying on const-decl{name:''})** —
  NOT TRIGGERED. The full pre-commit gate (~14074 tests including
  symbol-table, codegen, integration, conformance) is clean.
- **STOP-3 (overlap with M6.5.b.1 parse-expr)** — NOT TRIGGERED. All changes
  in parse-stmt.js + translate-stmt.js + ast-stmt.js.
- **STOP-4 (pre-commit gate fails outside this dispatch's scope)** — NOT
  TRIGGERED. Full gate clean.

### Productions supported (8 listed in brief vs 6 actually supported)

| Production | Supported | Notes |
|---|---|---|
| `<x> = expr` | YES | Shape 1 plain (SPEC §6.2) |
| `<x>:T = expr` | YES | typed Shape 1 |
| `const <x> = expr` | YES | Shape 3 derived (SPEC §6.6) |
| `const <x>:T = expr` | YES | typed derived |
| `<x pinned> = expr` | YES | pinned (SPEC §6.10) bareword |
| `<x default=e> = expr` | YES | reset-target raw captured (parsing deferred) |
| `<x debounced=Nms> = expr` | YES | reactivity raw captured (duration-grammar parse deferred) |
| `<x throttled=Nms> = expr` | YES | reactivity raw captured |
| `<x server> = expr` | YES | server bareword (SPEC §52) → isServer:true |
| `<x req length(>=2)> = expr` | YES | validators captured (call-form + bareword) |
| `<x>` (bare, no `=`) | NOT SUPPORTED | SPEC has no normative form; live parser declines too — bare `<x>` falls through to markup |
| `<x>! = expr` (bang-pinned) | NOT SUPPORTED | SPEC §6.10 normative form is `<x pinned>`, NOT `<x>!`; bang form not in SPEC |
| `~ <x>` / `~snapshot <x>` | NOT SUPPORTED | SPEC §32 defines `~` as pipeline accumulator + `~name = pipeline` tilde-decl (already landed as B3); `~ <x>` is NOT in SPEC |

### Surfaced to PA (sibling unit candidates)

- **defaultExpr ExprNode synthesis** — native parser captured raw text, but
  the live ast-builder uses `safeParseExprToNode` (Acorn-backed) to produce
  the parsed ExprNode used by codegen (`usage-analyzer.ts`, `emit-bindings.ts`).
  The native parser DOES have its own expression parser (`parseExpression(ctx)`)
  — invoking it inline at the `default=` attr position would produce a
  parsed ExprNode but requires care to respect the attribute-region boundary.
- **reactivity duration-grammar parse** — native captured raw text; live
  parses via `parseAfterDuration` into an AfterDurationResult consumed by
  B14 typer. Native module pool doesn't include a duration parser; adding
  one widens M6.5.b.2 scope.
- **Shape 2 markup-RHS** — `<x req length(>=2)> = <input/>` form. Native
  parses LHS+attrs correctly but the RHS markup parsing requires invoking
  the markup layer mid-statement; not in M6.5.b.2 scope. Validators are
  captured on native StateDecl for the future Shape 2 sub-unit.

### Files touched

- compiler/native-parser/parse-stmt.js (+~280 LOC: extended parseStructural\
  StateDecl, new constStructuralStateDeclLeadFollows, new helpers
  collectAttrValueRaw / collectBalancedParenContents / isAttrNameToken /
  attrNameOf)
- compiler/native-parser/ast-stmt.js (+16 LOC: +StmtKind.StateDecl entry)
- compiler/native-parser/translate-stmt.js (+~50 LOC: +case StmtKind.StateDecl
  arm, +makeStateDeclNode function)
- compiler/tests/unit/m65-b2-structural-state-decl.test.js (NEW: 28 tests,
  ~298 LOC)
- compiler/tests/parser-conformance-within-node-allowlist.json (regenerated:
  1000 entries refreshed to current measurements)

### Step 5 — landing (S125 PA)

- Agent stalled on response stream after substantive work. PA-side recovery
  via S89 §13.2 — branch-tip work coherent + complete.
- Landed via S67 file-delta; allowlist regen skipped at PA-side landing
  (b.1's permissive baseline lets b.2's improvements pass without explicit
  allowlist update — verified by pre-commit gate).
- Progress.md b.2 section appended via manual merge over b.1's landing.

