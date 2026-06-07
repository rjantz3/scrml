# BRIEF — Native translate-bridge gaps (Group T) · S170 native fix-wave 1
# agent a748ebb3394fff5f6 · scrml-js-codegen-engineer · isolation:worktree · base df08f282
# Authority: S170 re-triage workflow. Files OWNED: compiler/native-parser/translate-stmt.js ONLY (do NOT edit parse-*.js — Group P owns those).
# Blast: NATIVE-ONLY. Do NOT touch each/match structural-promotion.

FIX A — deepset/array-mutation node-synth (a-parser variant): makeBareExpr (translate-stmt.js ~240/449) synthesizes LIVE node kinds `reactive-nested-assign` (member-target rooted at @cell) + `reactive-array-mutation` (array method on @cell). Mirror ast-builder.js:5629-5673 (collectAtPathSegments, AT_IDENT root gate) + ARRAY_MUTATIONS@5635. Routes to emit-logic.ts:3014/3079 (S170 Bug-B-extended → compound-leaf retarget for free). Verify synthesized node shape (target/path[string|{index}]/valueExpr; method/argsExpr). Gate strictly on @-cell root.
FIX B — destructured-param structuring: translateParams/paramName (translate-stmt.js:1864-1893) emit structured {name: translateArrayPattern|translateObjectPattern (exist @1125/1176)} for ObjectPat/ArrayPat instead of "[...]"/"{...}" string; plain idents stay strings. Closes E-SCOPE-001 on destructured names. No type-system change.
FIX C — typeAnnotation thread (1-liner): makeVarDeclNode (translate-stmt.js:873-907) copy declarator.typeAnnotation (mirror makeStateDeclNode ~1046). Fixes E-VARIANT-AMBIGUOUS→E-CONTRACT-001.

.scrml mirror FEATURE-stale → land .js. Self-verify: temp-flip+named fixtures (deepset-write-loss-position / paramlist-destructure / enum-subset-enforcement-reach-da-b4), REVERT flip, per-fix --parser=scrml-native repro (FIX A: emits _scrml_reactive_set("a.ref",..) not in-place), full `bun run test` 0-regression. S83 per-fix commits; NUL-check.
