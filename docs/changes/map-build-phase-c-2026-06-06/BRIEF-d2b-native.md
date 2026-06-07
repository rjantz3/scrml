# MAP BUILD — PHASE C — DISPATCH D2b: NATIVE parser map literal ([:]/[k:v])

(Verbatim archive of the dispatch prompt, per S136. Native-path follow-on to D2a — brings the shadow-only native parser to map-literal parity.)

---

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full + **`docs/changes/map-build-phase-c-2026-06-06/SURVEY-SYNTHESIS.md` (the D2 section, NATIVE column)**. Maps reflect `4c8063b6`; source current (D1/D2a/D3/D4/§59-currency all landed — your base after merge-startup). Report `Maps consulted: …; load-bearing finding: …`.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
1. `pwd` starts with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. Else STOP (S90). Save `WORKTREE_ROOT`.
2. `git rev-parse --show-toplevel` == `WORKTREE_ROOT`.
3. **`git -C "$WORKTREE_ROOT" merge main` (S112)** — inherit D2a's `MapLitExpr` (the live AST node native must produce). Confirm `grep -c '"map-lit"' "$WORKTREE_ROOT"/compiler/src/expression-parser.ts` ≥ 1. Conflicts → STOP.
4. `git status --short` clean. 5. `bun install`. 6. `bun run pretest`.
**Path discipline (S99/S126):** edits via Bash on worktree-absolute paths; NEVER `cd` into main; worktree-absolute paths only. First commit `WIP(d2b): start at <pwd>`. ⚠ COMMIT TINY + OFTEN (two phase-c agents hit the 600s watchdog — keep output flowing, commit each unit).

# TASK — native-parser map literal (§59.3) — parity with D2a's legacy path
The native parser (`compiler/native-parser/`) is shadow-only (`--parser=scrml-native`) but is the canonical-enforcer; the within-node parity test compares native vs default output byte-for-byte. D2a landed the map literal on the LEGACY/Acorn path; D2b lands it on NATIVE so the two paths agree.

## Scope (SURVEY-SYNTHESIS D2 native section — the lexer already emits a clean `Colon`, no lexer change)
1. **`parseArrayLiteral` (`compiler/native-parser/parse-expr.js` ~3327)** — add: an empty-`[:]` peek (LBracket→Colon→RBracket) + a depth-1 entry-colon (ternary-excluded) branch that switches to map-entry parsing (`key : value` pairs). Use the SAME §59.3 disambiguation as D1's `findMapEntryColon` / D2a's `findMapEntryColonInLiteral` (depth-1 colon, not a ternary alt-colon; track `{}`/`()`/`[]` depth + a `?`-pending counter; string-interior-aware). Note the existing `withInAllowedSubExpr` no-`In` carve-out is for `[a in b]` and is orthogonal (keys use `:` not `in`).
2. **`MapLit`/`MapEntry` ExprKind + `makeMapLit`/`makeMapEntry` constructors** in `compiler/native-parser/ast-expr.js`.
3. **`translate-expr.js` arm** — translate the native `MapLit` → the LIVE `MapLitExpr` (D2a's shape in `compiler/src/types/ast.ts`: `{ kind:"map-lit", span, entries:[{key,value}], diagnostics? }`) so the downstream (typer/D4-codegen) is identical to the legacy path.
4. **Diagnostics:** the native path SHOULD surface `E-MAP-LITERAL-MALFORMED` (malformed) + `W-MAP-STRUCT-KEY-LITERAL` / `W-MAP-DUPLICATE-LITERAL-KEY` (Info) — mirror D2a's logic if the native diagnostic plumbing supports it; if native diagnostic-attachment is non-trivial, scope to producing a correct `MapLitExpr` (the typer/codegen handle the rest) + note the diagnostic gap as deferred (native is shadow-only). Do NOT block on it.

## DEFER (NOT this dispatch)
- The native bracket-WRITE→COW promotion gap (pre-existing; native doesn't promote `@arr[i]=x` at all — SURVEY-SYNTHESIS D2 native req 4). Orthogonal; do not scope-creep.
- `as (k,v)` sugar (D2c — separate concurrent dispatch; do NOT touch the `<each>` opener / `readAsName`).

## VERIFICATION (before DONE)
1. Full `bun run test` — baseline ~**23,285/0** (post-D4 + currency; confirm the actual baseline via `bun run test` FIRST). ZERO regressions.
2. NEW native parser-unit tests (via `--parser=scrml-native` OR direct native-parser invocation): `[:]` → empty `MapLitExpr`; `["DAL": 4500, "HOU": 5]` → 2-entry `MapLitExpr`; `[1,2,3]` → ARRAY; `[ @cond ? a : b ]` → ARRAY (ternary excluded); malformed → `E-MAP-LITERAL-MALFORMED` (if wired).
3. **within-node parity — the key D2b gate.** D4 REMOVED a standalone map parity sample (native couldn't parse it). **RE-ADD a small map parity sample** to `samples/compilation-tests/` now that native parses map literals (e.g. `map-001-fare-by-lane.scrml`: a `<m>: [string: int] = ["a": 1]` cell + a `.insert` + an `@m[k]` read). Confirm native output == default output on it (within-node parity; the count may legitimately grow by 1 — confirm native≡default byte-for-byte, NOT a regression). If native diverges on the map sample, that's the D2b gap to close (report it).

## COMMIT DISCIPLINE (S83): commit per unit; `git status` clean before DONE; update `progress-d2b.md` per unit.

## REPORT (raw structured text)
`WORKTREE_PATH` · `FINAL_SHA` · `FILES_TOUCHED` · merge-startup (map-lit present?) · full-suite + within-node counts · per-unit status (1-4) · the map parity sample result (native≡default?) · deferred (diagnostics if punted, native-bracket-write) · maps feedback.
