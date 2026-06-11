# DISPATCH BRIEF — enforce E-FN-001 (`?{}` SQL in a `fn` body) + fix I-FN-PROMOTABLE inferred-server false-fire

**change-id:** `e-fn-001-sql-enforce-2026-06-10`
**Agent:** scrml-js-codegen-engineer · **isolation:** worktree · **model:** opus
**Gap:** `g-fn-sql-unenforced` (MED)

## MISSION (one line)
Two coupled fixes for the same keyword-vs-inference blind spot: (A) fire `E-FN-001` when a `fn`-declared function contains a `?{}` SQL block (§48.3.1 — currently SILENTLY unenforced), and (B) stop `I-FN-PROMOTABLE` from recommending promotion of a body-escalated *inferred-server* function (e.g. one with `?{}`) to `fn`.

## WHY (the grounded finding — surfaced by S179 dog-fooding, PA-verified)
§48.3.1 / `E-FN-001` says `?{}` SQL inside a `fn` body SHALL be a compile error. But a live `export fn f() -> R[] { return ?{ select id from t }.all() }` **compiles CLEAN** — no `E-FN-001`. This is a spec-vs-impl divergence (BUG), the sibling of today's E-ROUTE-003 finding.

**Scope is NARROW (PA-probed — confirm in Phase 0):** `E-FN-003` (reactive-state mutation in a `fn`) and `E-FN-004` (non-determinism, e.g. `Date.now()` in a `fn`) BOTH fire correctly. ONLY `E-FN-001` (SQL) is unenforced. So this is NOT a broad "all fn-purity checks broken" fix — it is specifically the `?{}` path.

**Mechanism (PA hypothesis — confirm + correct in Phase 0):** the `?{}` server-escalates the `fn` at Route Inference (`api.js` Stage 5, BEFORE the TS Stage 6 purity check). The function is reclassified as a server function, so the fn-purity walker `checkFnBodyProhibitions` (`compiler/src/type-system.ts:17325`, which DOES contain the E-FN-001 check at ~:17666) is skipped for it / never sees it as a `fn`. So the SQL escalates the fn instead of erroring. (E-FN-003/004 fire because their triggers do NOT server-escalate, so the walker still runs.)

**Sibling symptom (Fix B) — I-FN-PROMOTABLE false-fire:** `compiler/src/lint-i-fn-promotable.js:230` skips a candidate only when `node.isServer` is true — and `isServer` is the deprecated `server` KEYWORD flag (set by `ast-builder.js scan.server`), NOT route-inference's body-content-escalation. So a keyword-free `function` with `?{}` (server-by-INFERENCE) has `isServer === false` → the lint does NOT skip it → it wrongly recommends "promote to `fn`", a promotion that would (once Fix A lands) error E-FN-001. Same keyword-vs-inference blind spot behind `g-server-keyword-drift`. The lint runs post-TS as `api.js` Stage 6.4b, so it CAN consume `riResult.routeMap` to learn the inferred-server set.

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full; follow its "compiler-source bug fix" / "diagnostic-authoring" task-shape routing (error + structure maps load-bearing). Map currency: watermark `c48c4f71` (2026-06-09); HEAD is now `81c84282` (E-ROUTE wire-serializability gate just landed in `type-system.ts` — read the CURRENT `type-system.ts`, it has the new `isWireSerializable`/`checkRouteWireSerializability` near the route-map consumers; your E-FN work is a DIFFERENT region, `checkFnBodyProhibitions`). Report the MAPS feedback line.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (S42 F4 + S90 + S99 + S126)
## Startup (BEFORE any other tool call)
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-` (else STOP — S90 wrong-repo routing). Save as `WORKTREE_ROOT`.
2. `git rev-parse --show-toplevel` == `WORKTREE_ROOT`.
3. `git status --short` clean.
4. `bun install` (worktrees don't inherit node_modules).
5. `bun run pretest` (populates samples dist; use `bun run test` for baseline, chains pretest).
6. Baseline `bun run test`, record pass/skip/fail.
## Path discipline (EVERY edit)
- Apply ALL edits via Bash (`perl -0pi`/`python3`/heredoc) on worktree-absolute paths including the `.claude/worktrees/agent-<id>/` segment — NOT Edit/Write (S126 main-leak class). Echo path before each write; re-verify with `git diff`/`grep`.
- NEVER `cd` into main or anywhere outside `WORKTREE_ROOT`. Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths.
- First commit message includes verified `pwd`: `WIP(e-fn-sql): start at $(pwd)`.
- Use `git commit` WITHOUT `--no-verify` — the pre-commit gate is mandatory (a prior dispatch this session used `--no-verify` on a docs commit; do not repeat — if the hook fails, investigate, do not bypass).

# THE WORK — phased

**Phase 0 — survey + confirm-gate (report back ONLY if a premise is wrong; else proceed).**
- Confirm: `export fn f() { return ?{...}.all() }` compiles with NO `E-FN-001` (the bug). Confirm `E-FN-003`/`E-FN-004` DO fire (narrow scope).
- Pin the MECHANISM: does RI escalate the `fn` to server (inspect `route-inference.ts` + how `checkFnBodyProhibitions` is gated/reached in `type-system.ts`)? Is the walker skipped because the fn is reclassified server, or because the `?{}` node is consumed/removed before the walker? State what you find.
- Confirm `lint-i-fn-promotable.js:230` `node.isServer` is keyword-only (does not reflect inferred-server). Confirm the lint has (or can get) access to the inferred-server set at its Stage 6.4b call site.

**Phase 1 — Fix A: enforce E-FN-001 on `fn`+SQL.**
- A `fn`-DECLARED function (fnKind `fn`, NOT bare `function`, NOT `server function`) whose body contains a `?{}` SQL block SHALL fire `E-FN-001`, REGARDLESS of route-inference server-escalation. The `fn` keyword is a purity contract; SQL in it is the contradiction §48.3.1 names. The fix should ensure `checkFnBodyProhibitions`' existing E-FN-001 check (type-system.ts:~17666) actually RUNS for `fn`-declared functions even when RI would escalate them — OR fire E-FN-001 earlier, independent of escalation. (The existing E-FN-001 message + the §44.4/E-SQL-007 "SQL needs async context" interplay: a `fn` with SQL should get E-FN-001 [the fn-purity violation], the primary + actionable diagnostic — "use `function`/`server function`".) Do NOT touch the E-FN-003/004 paths (they work).
- Watch for: do not regress the legitimate `server function` / `function`-with-`?{}` paths (those correctly escalate to server and must keep working). The fire is gated on the `fn` keyword specifically.

**Phase 2 — Fix B: I-FN-PROMOTABLE skip inferred-server functions.**
- Extend the `lint-i-fn-promotable.js` skip-list (currently `if (node.isServer) return false` at :230) so it ALSO skips a function that route-inference escalated to server (has `?{}` / `Bun.*` / file-IO / caller-context). The lint runs post-TS (Stage 6.4b) — thread the inferred-server set (from `riResult.routeMap.functions`) into the lint, OR detect the body-escalation triggers structurally. After the fix, a keyword-free `function` with `?{}` must NOT get the promote-to-`fn` suggestion.

**Phase 3 — SPEC (light).** §48.3.1 already mandates E-FN-001; add a one-line normative note that the prohibition fires regardless of route-inference escalation (the `fn` keyword is checked at the declaration, not gated on placement). §56.9.1 (I-FN-PROMOTABLE skip-list): add "inferred-server (body-content-escalated) functions" alongside the existing keyword-`server` skip. Regen SPEC-INDEX only if line ranges shift materially.

**Phase 4 — tests.** Unit tests: `fn`+`?{}` → E-FN-001 fires (live exported + a called one); `function`+`?{}` → NO E-FN-001 (correctly escalates server, control); `fn`+state-mutation → E-FN-003 still fires (no regression); a keyword-free `function`+`?{}` → NO I-FN-PROMOTABLE; a genuinely-pure `function` (no SQL/effects) → I-FN-PROMOTABLE STILL fires (no over-suppression).

**Phase 5 — EMPIRICAL (mandatory before DONE; S138).** Compile real `.scrml` repros via `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile`: (1) `export fn f() -> R[] { return ?{ select id from t }.all() }` → `E-FN-001` fires; (2) a `function` with `?{}` (e.g. `function loadTickets() -> Ticket[] { return ?{...}.all() }`) → compiles clean, NO I-FN-PROMOTABLE; (3) a pure `function double(n: int) -> int { return n * 2 }` → I-FN-PROMOTABLE STILL fires. Capture outputs in progress.md. DO NOT mark DONE without these.

## COMMIT DISCIPLINE (S83) + CRASH RECOVERY
- Commit per sub-unit (Fix A / Fix B / spec / tests), `git -C "$WORKTREE_ROOT"`, no `--no-verify`. Update `$WORKTREE_ROOT/docs/changes/e-fn-001-sql-enforce-2026-06-10/progress.md` per step (append-only). `git status` clean before DONE.

## FINAL REPORT
`WORKTREE_PATH`, `FINAL_SHA`, `BRANCH`, `FILES_TOUCHED`, baseline-vs-final test counts, the confirmed MECHANISM (how SQL bypassed E-FN-001), the Phase-5 empirical outputs (all 3), any deferral, MAPS feedback line, any path-discipline incident.
