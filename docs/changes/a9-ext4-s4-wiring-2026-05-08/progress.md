# Progress — a9-ext4-s4-wiring-2026-05-08

- [16:17] Started — branch `worktree-agent-a7d0d371cdfdaf640`, base `479ec1a` (S72 ratification).
- [16:17] Startup verification PASS: pwd OK, clean, `bun install` OK, `bun run pretest` OK, `bun run test` baseline 9822/64/1/3 confirmed.
- [16:17] Trigger 5 verification PASS: lines 1810-1914 in route-inference.ts.
- [16:17] Pre-snapshot written + committed (5eb7942).
- [16:24] D1 (always-`!`-wrap CPS stubs) — emit-functions.ts + emit-server.ts edited. First Edit attempt didn't persist (tool-state weirdness via worktree symlink); re-applied with absolute path under `.claude/worktrees/...` and verified via stat. Tests 9822/64/1/3 (no regressions). Committed (d9dbf41).
- [16:35] D2 (caller-context auto-`!`-propagation) — type-system.ts: extended RouteMap interface with cpsSplit, added fnCpsImplicitFailable set, populated from routeMap during collectFnErrorTypes. Tests 9822/64/1/3 (no regressions).
- [16:35] D3 (static-reject corner + W-CPS-NEEDS-FAILABLE) — type-system.ts function-body bare-expr site routes CPS-implicit-failable callees to W-CPS-NEEDS-FAILABLE warning. D2+D3+tests committed (e6d9d14).
- [16:50] D4 (SPEC amendments) — added §19.6.7 + §19.9.5 + §34 entries. Section-number REROUTE: dispatch + integration design dive cite "§47 server functions" but §47 is "Output Name Encoding"; correct locus is §19.9 (Server Function Errors). Documented in pre-snapshot + commit message. Committed (3dffcc0).
- [17:05] Manual verification via /tmp/scrml-cps-warn-test.scrml — W-CPS-NEEDS-FAILABLE fires correctly. /tmp/scrml-cps-warn-suppression-test.scrml revealed BUG: warning STILL fires when caller is `!`-typed. Per body-split soundness design dive §3.4, caller-`!` should suppress. Implemented suppression via __enclosingFnCanFail flag stamped by function-decl visitor. Committed (7b8a8f5).
- [17:15] Extended test file with D3 suppression coverage + D4 SPEC amendment coverage. Tests 9838/64/1/3 (+16 from new test file). Committed (4f124f9).
- [17:20] Final verification: pretest OK, full suite 9838/64/1/3 (+16 new pass; 0 regressions). Ready to SHIP.

## Plan (DONE)

1. ✓ WIP(a9-ext4): pre-snapshot + survey of compiler-side changes (5eb7942)
2. ✓ WIP(a9-ext4): D1 — always-`!`-wrap CPS stubs (d9dbf41)
3. ✓ WIP(a9-ext4): D2+D3+tests — caller-context !-propagation + W-CPS-NEEDS-FAILABLE (e6d9d14)
4. ✓ WIP(a9-ext4): D4 — SPEC amendments (3dffcc0)
5. ✓ WIP(a9-ext4): D3 polish — suppression for `!`-typed callers (7b8a8f5)
6. ✓ WIP(a9-ext4): tests — D3 suppression + D4 SPEC coverage (4f124f9)
7. PENDING: SHIP commit

## Decisions / Surprises (running log)

- **§47 → §19.9 reroute (decision):** dispatch + integration design dive cite "§47 server functions" but §47 in SPEC.md is "Output Name Encoding". The actual server-functions-and-CPS section is §19.9 (line 10962 of SPEC.md). Worked-example amendment ROUTED to §19.9 (added as new §19.9.5), not §47. Documented in pre-snapshot + each commit message. PA can re-evaluate if this is wrong; the spec remains internally consistent.
- **CpsError synthetic enum (decision):** the design dive said `T \| SqlError \| NetworkError`. For Cycle 1 implementation, the simplest tagged-shape is `{ __scrml_error: true, type: "CpsError", variant: "NetworkError"|"ServerError", data: {...} }`. The synthetic enum name is `CpsError` with two variants (NetworkError client-side; ServerError server-side). Documented in §19.9.5. Adopters who want richer error variants add `!` explicitly with a custom errorType.
- **Pre-existing E-ERROR-002 dual-fire (surprise):** the existing E-ERROR-002 fires twice for the same bare-expr call site (once from function-body visitStmt, once from top-level visitLogicNode case "bare-expr"). My W-CPS-NEEDS-FAILABLE inherits the same dual-fire pattern. Suppression works correctly — both fires are simultaneously suppressed when caller is `!`-typed. Fix to the duplication is OUT-OF-SCOPE for Ext 4.
- **Markup-context `<errorBoundary>` detection deferred to cycle 2 (decision):** the design dive verdict says callers inside `<errorBoundary>` markup wrappers also satisfy the handling requirement. Detecting markup-context call sites at TS stage is non-trivial (call-site provenance not currently threaded through). For Cycle 1, I implemented ONLY the caller-`!` suppression. Markup-context callers receive the warning today; resolution is to wrap in `<errorBoundary>` (which the warning's resolution-message #1 advises). Cycle 2 (when promoting to E-CPS-NEEDS-FAILABLE) MUST handle markup-context detection or the error will hit valid code.
- **D2 (caller-context auto-`!`-propagation) implemented as unconditional escalation (decision):** the dispatch + design dive say "function called only from `!`-typed callers + body has CPS-eligible call → escalates to `!`-typed automatically". For Cycle 1, the simpler implementation is "EVERY CPS-eligible function is implicitly `!`-typed". This is conservative — over-escalates compared to the strict "called only from !-typed" condition — but never under-escalates. Documented in §19.9.5 ("treated AS IF declared `!`"). Caller-context strict propagation could refine this in later cycles.
