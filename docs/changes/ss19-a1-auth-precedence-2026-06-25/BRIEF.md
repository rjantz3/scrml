# Dispatch BRIEF — ss19 A1: auth-precedence pair (#6 + #7, the login wall)

**Agent:** scrml-js-codegen-engineer · **isolation:** worktree · **model:** opus · **change-id:** ss19-a1-auth-precedence-2026-06-25
**Land-on (sPA):** `spa/ss19`. **Base:** `23601835` (== local main; == origin/main `26ffea4e` + 2 ingest commits, no code).

ONE fix closes TWO GH issues. `protect=` on a `<db>` wrongly overrides an explicit `<page auth="optional">`, force-injecting `auth="required"` → installs `_scrml_auth_check` on the login page's own RPC → 302 /login → **you can never authenticate.** Confirmed (PA S215 dual-verify + sPA R26).

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

Your worktree path is the `isolation: "worktree"` path the harness assigns you, under `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-<id>/`.

## Startup verification (BEFORE any other tool call)
1. `pwd` via Bash. MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`. If under any other repo (`scrml-support/...`, `scrml-spa-ss19/...`), STOP and report — CWD-routing failure. Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` MUST equal WORKTREE_ROOT; `git remote -v` shows scrml.git (NOT scrml-support.git).
3. `git status --short` — clean.
4. `bun install` — worktrees don't inherit node_modules (else "cannot find package 'acorn'").
5. `bun run pretest` — populates gitignored `samples/compilation-tests/dist/`. Use `bun run test` for full-suite baselines.
If ANY check fails: STOP, report, exit.

## Path discipline (EVERY edit)
- **S126:** edits via **Bash** (`perl`/`python3`/heredoc) on worktree-absolute paths incl. the `.claude/worktrees/agent-<id>/` segment — NOT Edit/Write. Echo path before; `git diff` after.
- **NEVER `cd` into the main repo**; use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths.
- Read only under WORKTREE_ROOT.

## Commit discipline
- One logical fix = one commit (coupled code+test together, S113). `git status --short` clean before DONE. NEVER `--no-verify`.

---

## Root cause (sPA-located — verify, then fix)

`compiler/src/route-inference.ts`, Step 8 (auth middleware collection), **L3781-3831**:
- **8a (L3781-3793):** registers `authMiddleware` ONLY for files whose `authConfig.auth === "required"` (L3784 `continue` otherwise). So an explicit `<page auth="optional">` (or `"none"`) is NOT registered here.
- **8b (L3795-3831):** for every file with `protect=` fields, `if (authMiddleware.has(filePath)) continue; // explicit auth= takes precedence` (L3812) then auto-escalates to `auth="required"` + fires W-AUTH-001 (L3813-3829).

**The bug:** the L3812 guard + its "explicit auth= takes precedence" comment is a LIE for `auth="optional"`/`"none"` — those were never registered in 8a, so `.has()` is false, so they get escalated to `required` AND get the false W-AUTH-001 ("no explicit auth= attribute" — but the page HAS one).

**Confirmed (sPA R26, repro `/tmp/ryan-verify/proj-auth/`):**
- `pages/login.scrml` (`<page auth="optional">` + `<db protect="label">`): **W-AUTH-001 fires + 2 `_scrml_auth_check`** in login.server.js.
- `pages/login-noprotect.scrml` (same, no protect=): 0 auth_check, no warning.

## The fix

In Step 8b, before escalating + warning, consult the file's EXPLICIT auth declaration (`authConfig.auth`, the same source 8a reads at L3783 — incl. the `fileAST.ast?.authConfig` fallback; **verify `<page auth=>` populates it** — page-level, not just `<program>`):
- explicit `"optional"` or `"none"` → **do NOT escalate, do NOT fire W-AUTH-001.** The page keeps its declared auth. (protect= still strips the column from client serialization — that's the protect-analyzer's job, independent of authMiddleware; confirm it still happens.)
- explicit `"required"` → already registered in 8a; skip (current behavior).
- **absent** (no explicit auth=) → auto-escalate + W-AUTH-001 (CURRENT behavior — preserve it; the warning text is correct in this case only).

This closes **#7** too (no escalation → no `_scrml_auth_check` prologue installed on the login RPC; the prologue comes from the authMiddleware entry via emit-server.ts). Confirm by re-compiling — login.server.js drops to 0 `_scrml_auth_check`.

**Belt-and-suspenders (optional, only if low-risk):** a redirect-target-RPC exemption in `emit-server.ts` — RPC handlers on the page that IS the `loginRedirect` target should not auth-gate themselves (so even an `auth="required"` login page can bootstrap a session). Implement only if it's clean; otherwise note it as a follow-on.

## ALSO OBSERVED — out of scope, characterize don't fix

Compiling `login.scrml` (with protect=) ALSO emits **E-CG-001** ("Protected field `label` found in client JS output"). But sPA verified `label` does NOT appear in the final `login.client.js` (0 occurrences) — so this looks like a **protect-invariant over-fire / check-ordering false-positive**, NOT a real client leak and NOT the auth bug. **Do NOT expand A1 to fix it.** Determine only: does your #6 fix incidentally clear E-CG-001? If YES, note it. If NO/independent, REPORT it as a new finding (`g-ecg001-protect-invariant-overfire`) with a one-paragraph characterization (where the check fires vs when the field is actually stripped) so the sPA can file it. A1 success does NOT depend on E-CG-001 (write:true still emits; verify auth_check=0 from the emitted server.js).

## Verification (R26 + adversarial)
Compile the repros via `compileScrml` (or `scrml compile`) and assert on emitted server.js:
1. `proj-auth/pages/login.scrml` (auth=optional + protect=) → **0 `_scrml_auth_check`**, **no W-AUTH-001**.
2. `proj-auth/pages/login-noprotect.scrml` → still 0 / clean (no regression).
3. **Adversarial — preserve correct escalation:** a page with `protect=` and NO explicit `auth=` → STILL escalates to required + W-AUTH-001 (construct this fixture). A `<program auth="required">` + protect= → still required.
4. Add a regression test (unit or integration) asserting the precedence matrix: {explicit optional, explicit none, explicit required, absent} × {protect= present}. Place near the existing auth-graph/route-inference tests (grep `W-AUTH-001` in compiler/tests/).
5. Full `bun run test` GREEN, 0 regressions vs your startup baseline (report both counts). The auth-graph/route-inference/emit-server suites are the high-signal ones.

## Scope boundaries
- ONLY #6+#7 (auth precedence + the W-AUTH-001 message correctness). Do NOT touch the compound-bind / if-guard render-codegen (those are ss19 Group B, parked) or the stdlib-client-leak / pure-fn-async items (separate ss19 dispatches).
- If the fix's blast radius exceeds route-inference Step 8 + the emit-server prologue, STOP and report.

## Report back
Commit SHA · the precedence-matrix test red→green · before/after `_scrml_auth_check` counts + W-AUTH-001 presence on both repros · E-CG-001 disposition (cleared / independent-new-finding char) · whether you added the emit-server redirect-target exemption · `git status --short` clean + agent branch + tip SHA.
