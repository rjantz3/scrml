# BRIEF — Native-parser leaf-gap fixes (Group P) · S170 native fix-wave 1
# agent a59473ace86ddb4b1 · scrml-js-codegen-engineer · isolation:worktree · base df08f282
# Authority: S170 native-parser re-triage workflow (wf_fcf9da39-782) — 605 native-only flip-failures; default 0-fail.
# Files OWNED: compiler/native-parser/parse-stmt.js + parse-expr.js (file-disjoint from Group T/W).
# Blast radius: NATIVE-ONLY (opt-in --parser=scrml-native; default BS+Acorn green). Do NOT touch each/match structural-promotion (M6.7-STOP).

FIX 1 (~52+cascade) — `on mount`/`on dismount` blocks: add parseStatement arm (parse-stmt.js:482, ~547-580); desugar mirror ast-builder.js:7226-7248 (mount→bare-expr body; dismount→cleanup(()=>{body})). Closes E-SCOPE-001 on/mount + the publish*Event cross-file cascade.
FIX 2 (~40+21+cascade) — `@`-declarator binding: add TokenKind.ScrmlAt branch to parseBindingIdent (parse-expr.js:4043-4052); verify name-shape vs translate-stmt bridge (~L980).
FIX 3 (~9) — arrow-shorthand fn body: Arrow-token branch in parseScrmlFunctionDecl (parse-stmt.js:2013)/parseFunctionBodyInline (1628); implicit-return wrap.
FIX 4 (CONDITIONAL) — `export <cell>` parse arm: parseExportedDeclaration (parse-stmt.js:2621); mirror parseStatement structural-cell dispatch (callees @3289/3343/3432). GOAL = parse-without-erroring parity with legacy (legacy also doesn't register export<cell>); defer if it bloats.

.scrml mirrors FEATURE-stale → land .js; conditional re-sync only. Self-verify: temp-flip api.js default in-worktree, run named fixtures under native, REVERT flip (don't commit), per-fix --parser=scrml-native repro symptom-gone + node --check, full `bun run test` 0-regression. S83 per-fix commits; NUL-check new tests. Report per-fix evidence + FIX-2 name-shape + FIX-4 done/deferred.
