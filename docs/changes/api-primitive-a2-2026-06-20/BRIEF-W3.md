# A2 W3 — `<api>` TYPER wave — dispatch brief (agent a80f17c2cb0c3c4bc, S210)

scrml-js-codegen-engineer · isolation:worktree · opus · dispatched S210 2026-06-20 (user "fire W3").

## Scope (resolve + CHECK; NO codegen — that's W4)
1. Resolve api-decl endpoint type-refs (reqShape/responseType, RAW from W2) against §53/§14 declared types.
2. PATH-PARAM-UNBOUND — each path `${param}` ↔ a reqShape field (api-decl-level).
3. Recognize `<request api="name" args=>` (W2 deferred) + ENDPOINT-UNKNOWN + REQ-SHAPE-MISMATCH.
4. §12.2 client-only confirm (`<api>`/`<request api=>` do NOT escalate to server; READ route-inference, don't add a trigger).
5. §34 +3 rows (ENDPOINT-UNKNOWN/REQ-SHAPE-MISMATCH/PATH-PARAM-UNBOUND), Rule 4; §60.9 mark wired.
6. NO codegen/emission — valid <api>+<request api=> still emits nothing; §60 banner stays Nominal. DEFER to W4: fetch-callable codegen + parseVariant wiring + <request> runtime integration.

## Standard blocks (full text in the dispatched prompt)
MAPS-first (5c68e87e; type-system.ts/ast-builder.js stale-since) · F4 startup + merge main first (verify api-decl node + §60 present) + bun install + pretest · S126 Bash-edit/no-cd · S83 commit (incremental, clean tree, pwd in first commit, progress.md) · S138 R26 (compile valid/invalid → assert E-API-* diagnostics) · full bun run test · report WORKTREE_PATH/FINAL_SHA/FILES_TOUCHED/§34/deferred/compile-verify/full-suite/maps. PA lands S67 file-delta; agent does NOT push/touch main. Boundary flag: recognition+check is W3, emission is W4.
