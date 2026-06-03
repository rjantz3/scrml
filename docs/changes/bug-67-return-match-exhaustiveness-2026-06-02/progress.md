# Bug 67 — `return match` exhaustiveness — progress (append-only)

## 2026-06-02T23:51:13-06:00 — start at /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a9135185503ef9156
- Startup: pwd under worktrees/agent-, toplevel match, tree clean at 57edc794.
- Merged main (fast-forward) → HEAD 8226d304 (Bug 63/65/68 landed). bun install + pretest OK.
- Read .claude/maps/primary.map.md (parser/grammar fix + compiler-source bug-fix routing).

## Reproduction + layer finding
- Confirmed: A (`return match` missing .Done) silent (exit 0); B (`let r = match`) fires E-TYPE-020.
- AST dump via parseLogicBody:
  - A return-stmt.exprNode.kind="match-expr" with rawArms=true, hasHeader=false, hasBody=false (ExprNode form — never visited by exhaustiveness path).
  - B let-decl.matchExpr.kind="match-expr" with hasHeader=true, hasBody=true (STRUCTURAL form — visited by typer let-decl case → checkMatchDiagnostics).
- LAYER = PARSER gap. The return-stmt builder (ast-builder.js ~5730) had no match-as-expr hook; let/const builders (~4985 / ~5095) do.

## Fix (3 files)
- ast-builder.js: return-stmt builder — detect `match`/`partial match`, build STRUCTURAL match-expr via parseOneMatchAsExpr, store as return-stmt.matchExpr (mirrors let/const hook).
- type-system.ts: return-stmt typer case — visit node.matchExpr → routes through case "match-expr" → checkMatchDiagnostics → E-TYPE-020.
- codegen/emit-logic.ts: return-stmt case — when node.matchExpr present, emit via emitMatchExpr (shared IIFE form, same clean output the exprNode path produced).

## Verification
- A → fires E-TYPE-020 "Missing variants: ::Done". B → still fires (parity). Cexh (exhaustive) → clean, valid IIFE codegen.
- fn-PARAM `return match p` → SAME-root, covered (fires E-TYPE-020; clean when exhaustive).
- canonical const-<x>=match (D1) non-fire is PRE-EXISTING baseline (separate derived-decl gap, NOT a Bug 67 regression — deferred note).
- <match for=Phase> block-form → E-MATCH-NOT-EXHAUSTIVE unaffected.
- S95 payload+wildcard + bug-h rettype tests: 26 pass. New unit test: 6 pass.

## 2026-06-03T00:03:02-06:00 — DONE
- Within-node parity regression (5 fixtures with `return match`): LIVE shape changed vs lagging NATIVE parser → +1/+1 MISSING/EXTRA-FIELD per site. Native parser is out-of-scope (M5-swap precondition). Bumped within-node allowlist (the documented divergence-baseline lever). Shape-parity sister canary unaffected.
- Pre-commit gate (unit+integration+conformance): 22794 pass / 0 fail (baseline 22787 + 6 Bug 67 tests + 1 pre-existing lin C5).
- Commits: 8983a20e (core fix + tests), 2bee0c0b (allowlist). HEAD 2bee0c0b, ancestry includes 8226d304. git status clean.
- DEFERRED: top-level derived `const <x> = match @cell { ... }` (D1) does NOT fire E-TYPE-020 — PRE-EXISTING (confirmed via stash baseline), separate state-decl-derived gap, NOT a Bug 67 regression.
