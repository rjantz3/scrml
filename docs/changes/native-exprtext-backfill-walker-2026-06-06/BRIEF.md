# BRIEF — Native exprNode→text backfill walker (Group W) · S170 native fix-wave 1
# agent a5da85fc3d2746f88 · scrml-js-codegen-engineer · isolation:worktree · base df08f282
# Authority: S170 re-triage workflow (TYPE-MATCH CASE-1). Files OWNED: NEW compiler/src/native-walker/exprtext-backfill-walker.ts + api.js wire-in (do NOT edit native-parser/*.js or translate-*.js).
# Blast: NATIVE-ONLY (walker runs in api.js native branch). Template: src/native-walker/attrvalue-exprnode-walker.ts (S164 precedent).

ROOT: native makeBareExpr sets expr:"" (codegen prefers exprNode); but type-system lifecycle/enum-subset/bare-variant enforcement is regex-over-text (checkLifecycleBindingAccess type-system.ts:16920-18090; statementText reads .value/expr/text/raw/init). Under native .expr="" → E-TYPE-001 never fires.
FIX: new post-parse walker stamps node.expr = emitStringFromTree(node.exprNode) (exported expression-parser.ts:2382) on nodes with exprNode + empty .expr/.init; wire in api.js native branch ~L945 after populateNativeAttrValueExprNodes. src/-side (no layering violation).
CRITICAL inertness check: confirm populating .expr is INERT for codegen (codegen prefers exprNode) — within-node/conformance no new divergence + byte-identical emit for previously-empty-.expr nodes; if perturbs, narrow walker to type-system-read node kinds. Report inertness evidence.

Self-verify: temp-flip default, run lifecycle-shape1-source-form (12) + enum-subset-enforcement-reach-da-b4 under native, REVERT the DEFAULT-flip but KEEP the walker wire-in (api.js diff = walker call only). Full `bun run test` 0-regression. Unit test for the walker. NUL-check. CASE-2 (typeAnnotation) owned by Group T; CASE-3 (struct-constructor grammar) NOT here.
