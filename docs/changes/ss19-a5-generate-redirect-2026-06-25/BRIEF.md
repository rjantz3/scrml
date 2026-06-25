# Dispatch BRIEF — ss19 A5: #14 g-generate-auth-redirect-mismatch (MED)

**Agent:** scrml-js-codegen-engineer · **isolation:** worktree · **opus** · **change-id:** ss19-a5-generate-redirect-2026-06-25 · land-on `spa/ss19` (sPA file-delta) · base origin/main `26ffea4e` (auth-graph.ts/generate.js unchanged by the landed ss19 fixes → file-delta clean).

`scrml generate auth` scaffolds `pages/auth/login.scrml` (route `/auth/login`), but the default `loginRedirect` is `/login` → `I-AUTH-REDIRECT-UNRESOLVED` + `W-AUTH-LOGIN-MISSING` fire, and the auth gate 302s to a route no page serves (→ 404). Following the generator produces a non-working auth flow. RYAN-ISSUES #11 (lowest-priority convention mismatch). Repro `/tmp/ryan-verify/proj-gen/`.

[STARTUP-VERIFICATION + PATH-DISCIPLINE — standard: pwd starts `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`; toplevel==WORKTREE_ROOT, remote scrml.git; status clean; `bun install`; `bun run pretest`. Edits via Bash on worktree-absolute paths, NEVER `cd` into main, never Edit/Write tool, never `--no-verify`. One logical fix = one commit, coupled code+test.]

## Loci
- Default redirect: `route-inference.ts:3872` (`loginRedirect: authConfig.loginRedirect ?? "/login"`) + `auth-graph.ts` (loginRedirect handling). Comment cites **SPEC §52.13** as the source of the `/login` default.
- Generator scaffold: `commands/generate.js` (`:28-29` "default /login per §52.13 … lands at pages/auth/login.scrml"; `:295` "default: pages/auth/login.scrml"; `:372/:381` help text). The generator writes the login page to `pages/auth/login.scrml`.
- Lint: `I-AUTH-REDIRECT-UNRESOLVED` / `W-AUTH-LOGIN-MISSING` in `auth-graph.ts` (+ api.js surfacing).

## Fix — R4 FIRST, then align to the SPEC (do NOT invent a convention)
**Read SPEC §52.13 (and any §47.9.2 routing rule) IN FULL first.** The fix is to make the generator scaffold and the default redirect CONSISTENT. The issue lists three ways:
- (a) generator scaffolds `pages/login.scrml` (route `/login`, matching the §52.13 default) — **likely correct** since §52.13 makes `/login` the documented default; this just fixes the generator's path.
- (b) change the default `loginRedirect` to `/auth/login` (matching the current generator).
- (c) special-case the `auth/` segment so `pages/auth/login.scrml` serves `/login`.

**Choose the option SPEC §52.13 supports.** If §52.13 says the default login route is `/login` (most likely), do (a): change `generate.js` to scaffold `pages/login.scrml` (+ update its echo/help text), so following the generator yields a page at the default redirect target and the lints don't fire. Do NOT change the SPEC-documented default unless the SPEC itself prescribes `/auth/login`.

**ESCALATE (park + report, don't guess):** if SPEC §52.13 is SILENT/ambiguous on the scaffold path, or the three options genuinely trade off in a way the SPEC doesn't settle, STOP #14 and report — this becomes a PA convention ruling, not an sPA fix.

## Verify (R26 + adversarial)
1. Repro `proj-gen`: `scrml generate auth` then compile with `<program auth="required">` → the scaffolded login page resolves to the default redirect target; `I-AUTH-REDIRECT-UNRESOLVED` + `W-AUTH-LOGIN-MISSING` no longer fire.
2. Adversarial: an explicit `loginRedirect="/custom"` + a page at `/custom` still resolves (no regression); a genuinely-missing login page still warns.
3. Regression test (grep existing generate / auth-graph tests). Full `bun run test` GREEN, 0 regressions (report baseline + after).

## Scope / report
ONLY #14. **FLAG any shared baseline shifted** (S211). Report: commit SHA · the SPEC §52.13 finding + which option (a/b/c) you chose and why · red→green · repro before/after lint state · escalate-or-fixed · git status clean + agent branch + tip SHA.
