# MAP BUILD — PHASE C — DISPATCH D2: parser ([:]/[k:v] literal + iteration `as (k,v)` sugar)

(Verbatim archive of the dispatch prompt, per S136.)

---

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full + **`docs/changes/map-build-phase-c-2026-06-06/SURVEY-SYNTHESIS.md` (the D2 section — exact fire-sites + the pattern-to-mirror for BOTH parser paths)**. Maps reflect `4c8063b6`; source is current (D0 + D1 + §59.8 are in your base after merge-startup). Report `Maps consulted: …; load-bearing finding: …`.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. Else STOP (S90). Save `WORKTREE_ROOT`.
2. `git rev-parse --show-toplevel` == `WORKTREE_ROOT`.
3. **`git -C "$WORKTREE_ROOT" merge main` (S112) — inherit D1 (the `MapType` typer recognition).** Confirm `grep -c 'function findMapEntryColon' "$WORKTREE_ROOT"/compiler/src/type-system.ts` == 1 post-merge. Conflicts → STOP.
4. `git status --short` clean. 5. `bun install`. 6. `bun run pretest`.
**Path discipline (S99/S126):** edits via Bash (`perl`/`python`/heredoc) on worktree-absolute paths; NEVER `cd` into main; `git -C "$WORKTREE_ROOT"` + `--cwd "$WORKTREE_ROOT"` + worktree-absolute paths only. First commit: `WIP(d2): start at <pwd>`.

# TASK — parse the value-native map literal (§59.3) in BOTH parser paths + the iteration `as (k,v)` sugar (§59.8)
Read SPEC §59.3 (literals + disambiguation) + §59.8 (iteration, as amended S169) + the SURVEY-SYNTHESIS D2 section IN FULL FIRST (Rule 4). This dispatch is PARSER-ONLY. The map-vs-array distinction for READS/WRITES is at the typer (D1, done) — the parser is map-agnostic for `@m[k]` read/write/method-calls. Your ONLY net-new parser work is the **map LITERAL** + the optional **`as (k,v)` destructure**.

## Scope

### A. Legacy (Acorn) path — `compiler/src/expression-parser.ts`
1. **`[k:v]` / `[:]` map literal.** Acorn REJECTS a `:` inside `[...]` (verified). Add a recognizer to `preprocessForAcorn` (the pre-Acorn rewrite, ~1009-1268) that detects a map literal and rewrites it to a placeholder call (e.g. `__scrml_map_lit__(...)`), **modeled exactly on `preprocessMatchExprs` (~1271-1325)** — a hand-written balanced scanner (NOT a flat regex) that:
   - recognizes `[:]` (empty map) and `[ k : v , … ]` (entries).
   - applies the §59.3 disambiguation: a bracketed expr is a MAP iff it is `[:]` OR contains a **depth-1 entry-colon that is NOT a ternary alternative-colon** (a depth-1 `:` not preceded at the same depth by an unmatched `?`). The scanner must track `{}`/`()`/`[]` depth AND a `?`-pending counter (mirror D1's `findMapEntryColon` logic in `type-system.ts` — reuse the algorithm shape). Colons inside a struct-value `{a:1}` are depth-2 (ignored).
   - rewrites the recognized span to a placeholder the `esTreeToExprNode` unmask arm turns into a new `MapLitExpr` AST node.
2. **`MapLitExpr` / `MapEntry` AST node** in `compiler/src/types/ast.ts` (new ExprNode kind) + the `esTreeToExprNode` unmask arm (mirror the `__scrml_match__` / `__scrml_bare_variant__` unmask logic).
3. **`E-MAP-LITERAL-MALFORMED`** (§59.11 — already in §34) — a depth-1 colon with a missing key/value, a trailing colon, or a count error. Fire from the scanner.
4. **`W-MAP-STRUCT-KEY-LITERAL`** (Info, §59.11) + **`W-MAP-DUPLICATE-LITERAL-KEY`** (Info) — a struct/enum-key literal (`[ {a:1}: {b:2} ]`) PARSE-ACCEPTS (the grammar admits it) but is codegen-deferred in v1 (M-cut); duplicate depth-1 keys are last-wins. These are Info → must partition into `result.warnings` (the `W-` prefix routes them automatically per api.js:2403).

### B. Native path — `compiler/native-parser/`
1. **`[:]`/`[k:v]` in `parseArrayLiteral` (`parse-expr.js` ~3327)** — the lexer ALREADY emits a clean `Colon` token (no lexer change). Add: an empty-`[:]` peek (LBracket→Colon→RBracket) + a depth-1 entry-colon (ternary-excluded) branch that switches to map-entry parsing. New `MapLit`/`MapEntry` ExprKind + constructors in `ast-expr.js` + a `translate-expr.js` arm → the live `MapLitExpr`.
2. **Do NOT** fix the pre-existing native bracket-WRITE→COW gap (native doesn't promote `@arr[i]=x` to `reactive-nested-assign` at all — SURVEY-SYNTHESIS D2 req 4). That's an orthogonal native-parity item; native is shadow-only. Note it as a deferred item; do not scope-creep.

### C. Iteration `as (k,v)` destructure (§59.8, S169) — BOTH paths, SMALL
The S169 baseline (`<each in=@m.entries() as e>` + `e.key`/`e.value`) needs **NO parser change** (shipped `as name` + struct field access already parse). Add ONLY the optional terse **`as (k, v)`** form: extend the `<each>` opener's `as`-clause parse (legacy `ast-builder.js` ~12097 `readAsName` single-ident; native `parse-file.js` ~967 `readAsName`) to also accept `as (name, name)` → bind the two names positionally to the entry struct's `.key`/`.value` (§14.11 positional binding). If this turns out non-trivial (more than a small opener-parse extension), STOP and report — it can be a deferred polish (the `as e` baseline ships regardless).

## DEFER (v1 — do NOT implement)
- Struct/enum-key literal CODEGEN (parse-accept only; D4 + the W-lint).
- Native bracket-write→COW parity.
- Runtime (D3) + codegen (D4) lowering of map literals — out of scope. Your `MapLitExpr` node is consumed by D4.

## VERIFICATION (before DONE)
1. Full `bun run test` — baseline **23,143/0/220/1/918** (post-D1). ZERO regressions.
2. NEW parser-unit tests (BOTH paths where applicable): `[:]` → empty `MapLitExpr`; `["DAL": 4500, "HOU": 5]` → `MapLitExpr` with 2 entries; `[ {a:1}: {b:2} ]` → parse-accepted MapLitExpr (struct-key) + `W-MAP-STRUCT-KEY-LITERAL`; `[1,2,3]` → still an ARRAY (not a map); `[ @cond ? a : b ]` → still an ARRAY (ternary colon excluded); malformed (`[ "k": ]`, `[ : 5 ]`, `["a": 1, "b"]`) → `E-MAP-LITERAL-MALFORMED`; duplicate key → last-wins + `W-MAP-DUPLICATE-LITERAL-KEY`. For native: assert the same shapes via `--parser=scrml-native`.
3. **within-node parity** — a parser change CAN shift it. Run the within-node test; if it shifts, investigate (a new literal form changes parser output on map-bearing samples — but there are NO map samples yet, so it should be 1005/0 unchanged). Report.
4. R26: there is no adopter map source yet; the parser-unit tests + 0-regression are the gate. (A map literal can't compile end-to-end until D3+D4 — codegen will error on the `MapLitExpr` node, which is EXPECTED; do not add map samples to the compile-test corpus yet.)

## COMMIT DISCIPLINE (S83)
Commit per unit (legacy scanner+node; native branch+node; the `as (k,v)` sugar; tests). `git diff`→`git add`→commit each. Clean `git status` before DONE. Update `progress.md` per step.

## REPORT (raw structured text)
`WORKTREE_PATH` · `FINAL_SHA` · `FILES_TOUCHED` · merge-startup (findMapEntryColon present?) · full-suite + within-node counts · per-piece status (A1-4 / B1-2 / C) · whether `as (k,v)` landed or was deferred · deferred items · maps feedback.
