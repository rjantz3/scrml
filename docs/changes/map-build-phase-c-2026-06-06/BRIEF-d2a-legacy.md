# MAP BUILD — PHASE C — DISPATCH D2a: LEGACY parser map literal ([:]/[k:v])

(Verbatim archive of the dispatch prompt, per S136. This is the SPLIT of the original D2 — legacy path only; native + `as (k,v)` sugar deferred to D2b/D2c. The original D2 dispatch stalled mid-scanner [watchdog]; this narrower scope reaches verify/DONE faster.)

---

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full + **`docs/changes/map-build-phase-c-2026-06-06/SURVEY-SYNTHESIS.md` (the D2 section — exact fire-sites for the LEGACY path)**. Maps reflect `4c8063b6`; source current (D0/D1/§59.8 in your base after merge-startup). Report `Maps consulted: …; load-bearing finding: …`.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
1. `pwd` starts with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. Else STOP (S90). Save `WORKTREE_ROOT`.
2. `git rev-parse --show-toplevel` == `WORKTREE_ROOT`.
3. **`git -C "$WORKTREE_ROOT" merge main` (S112) — inherit D1.** Confirm `grep -c 'function findMapEntryColon' "$WORKTREE_ROOT"/compiler/src/type-system.ts` == 1. Conflicts → STOP.
4. `git status --short` clean. 5. `bun install`. 6. `bun run pretest`.
**Path discipline (S99/S126):** edits via Bash on worktree-absolute paths; NEVER `cd` into main; `git -C "$WORKTREE_ROOT"` + worktree-absolute paths only. First commit: `WIP(d2a): start at <pwd>`.
**⚠ CRASH-RECOVERY — COMMIT TINY + OFTEN.** The prior D2 agent STALLED (600s no-output watchdog) mid-scanner after a long silent stretch. Commit each unit the MOMENT it compiles — do NOT batch a long edit. After unit 1 (the AST node) commit IMMEDIATELY before starting the scanner. Update `progress.md` after each step. Keep output flowing (short edits + frequent `git diff`/test runs) — a long silent edit risks the watchdog.

# TASK — parse the value-native map literal (§59.3) on the LEGACY (Acorn) pipeline ONLY
Read SPEC §59.3 (literals + disambiguation) + the SURVEY-SYNTHESIS D2 section FIRST (Rule 4). PARSER-ONLY, LEGACY-PATH-ONLY. The map-vs-array distinction for reads/writes is at the typer (D1, done). Your net-new work is the **map LITERAL** on the Acorn pipeline.

## Scope — do these IN ORDER, commit each immediately

**Unit 1 — `MapLitExpr` / `MapEntry` AST node** (`compiler/src/types/ast.ts`). A new ExprNode kind `MapLitExpr` (holding an ordered list of `MapEntry { key: ExprNode, value: ExprNode }`; an empty list = `[:]`) + the ExprNode union arm. (The prior agent drafted exactly this as a +36-line addition — recreate it; it's small.) Commit. **A new ExprNode kind must not break exhaustive switches** — grep for `ExprNode` switches that would now have an unhandled `MapLitExpr` and confirm they have a `default` (bun won't fail at runtime, but a missing-case that throws would). Note any switch that needs a benign default (codegen's real handling is D4 — for now an unhandled MapLitExpr in codegen may throw a clear "not yet lowered" or fall to default; ensure the FULL SUITE stays green — there are no map literals in the corpus yet, so nothing exercises it).

**Unit 2 — legacy Acorn scanner** (`compiler/src/expression-parser.ts`). Acorn REJECTS `:` inside `[...]` (verified). Add `preprocessMapLiterals` to `preprocessForAcorn` (~1009-1268), **modeled exactly on `preprocessMatchExprs` (~1271-1325)** — a hand-written balanced scanner (NOT a flat regex) that rewrites a recognized map literal to a placeholder call (e.g. `__scrml_map_lit__(...)`):
  - recognizes `[:]` (empty) and `[ k : v , … ]`.
  - §59.3 disambiguation: a bracketed expr is a MAP iff `[:]` OR contains a **depth-1 entry-colon that is NOT a ternary alternative-colon** (a depth-1 `:` not preceded at the same depth by an unmatched `?`). Track `{}`/`()`/`[]` depth + a `?`-pending counter (REUSE the algorithm shape from D1's `findMapEntryColon` in `type-system.ts`). Colons inside `{a:1}` are depth-2 (ignored).
  - **Ordering**: run the map-literal rewrite BEFORE the bare-variant (`.Variant`) rewrite and `not`-lowering, but the entry key/value text is re-parsed later by the full pipeline (mirror how `preprocessMatchExprs` round-trips arm text via `JSON.stringify` + the unmask).
  Commit.

**Unit 3 — `esTreeToExprNode` unmask arm** for the `__scrml_map_lit__(...)` placeholder → `MapLitExpr` (mirror the `__scrml_match__` / `__scrml_bare_variant__` unmask logic). Each entry's key/value text is re-parsed to ExprNodes. Commit.

**Unit 4 — `E-MAP-LITERAL-MALFORMED`** (§59.11, already in §34) — depth-1 colon with a missing key/value, trailing colon, odd/even count error. Fire from the scanner. Commit.

**Unit 5 — `W-MAP-STRUCT-KEY-LITERAL` + `W-MAP-DUPLICATE-LITERAL-KEY`** (Info, §59.11). A struct/enum-key literal (`[ {a:1}: {b:2} ]`) PARSE-ACCEPTS (codegen-deferred to v1, M-cut) + surfaces `W-MAP-STRUCT-KEY-LITERAL`. Duplicate depth-1 keys → last-wins + `W-MAP-DUPLICATE-LITERAL-KEY`. Info → `W-` prefix auto-partitions into `result.warnings` (api.js:2403). Commit.

**Unit 6 — legacy parser-unit tests.** Commit.

## DEFER (NOT this dispatch)
- **Native path** (`parse-expr.js parseArrayLiteral` branch) → D2b follow-on.
- **`as (k,v)` iteration sugar** → D2c follow-on (the `as e` + `e.key`/`e.value` baseline already works, no parser change).
- Runtime (D3) + codegen (D4) lowering — out of scope. Your `MapLitExpr` node is consumed by D4. A map literal will NOT compile end-to-end yet (codegen has no map-literal lowering) — that is EXPECTED; do NOT add map samples to the compile-test corpus.

## VERIFICATION (before DONE)
1. Full `bun run test` — baseline **23,143/0/220/1/918** (post-D1). ZERO regressions.
2. NEW legacy parser-unit tests: `[:]` → empty `MapLitExpr`; `["DAL": 4500, "HOU": 5]` → `MapLitExpr` 2 entries; `[ {a:1}: {b:2} ]` → parse-accepted + `W-MAP-STRUCT-KEY-LITERAL`; `[1,2,3]` → still ARRAY; `[ @cond ? a : b ]` → still ARRAY (ternary-colon excluded); malformed (`["k":]`, `[:5]`, `["a":1,"b"]`) → `E-MAP-LITERAL-MALFORMED`; duplicate key → last-wins + `W-MAP-DUPLICATE-LITERAL-KEY`.
3. within-node parity 1005/0 (no map samples exist → should be unchanged; verify).
4. R26: N/A (no end-to-end map compile until D4). Parser-unit tests + 0-regression are the gate.

## COMMIT DISCIPLINE (S83) — reinforced
Commit per unit (1-6 above), each the moment it compiles. `git diff`→`git add`→commit. Clean `git status` before DONE. Update `progress.md` per unit.

## REPORT (raw structured text)
`WORKTREE_PATH` · `FINAL_SHA` · `FILES_TOUCHED` · merge-startup (findMapEntryColon present?) · full-suite + within-node counts · per-unit status (1-6) · any ExprNode-switch that needed a default · deferred (native, `as (k,v)`) · maps feedback.
