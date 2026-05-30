# BRIEF — giti-027a-auth-content-not-gated-warning-2026-05-30

> Archived verbatim per pa.md S136. Dispatched S145 (2026-05-30) via `scrml-dev-pipeline`, `isolation: "worktree"`, `model: opus`, background. Agent ID `aa0d8d6903be67b98`. From main HEAD `3b825808`. Verified GENUINE by workflow `wf_272f8c8d-68e`. SCOPE = PART (A) ONLY — the warning. Part (B) (per-role SSR content-stripping) is a separate design deliberation.

---

scrml COMPILER diagnostic addition (TypeScript + SPEC §34). Change-id: `giti-027a-auth-content-not-gated-warning-2026-05-30`. SCOPE = PART (A) ONLY of GITI-027 (security-flagged); verified GENUINE on HEAD by a PA workflow. The deeper content-stripping fix (B) is a SEPARATE design deliberation — DO NOT attempt it.

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full; Task-Shape Routing for a diagnostic + SPEC change. Maps reflect `9ab7aa38` (~32 behind); verify file-claims. PA gave loci (below).
Feedback line in report: maps load-bearing or not.

# STARTUP + PATH DISCIPLINE (BEFORE any other tool call)
S99=20; don't make #21.
1. `pwd` starts with `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-` (else STOP, S90). Save WORKTREE_ROOT.
2. `git rev-parse --show-toplevel`==WORKTREE_ROOT. 3. `git status --short` clean. 4. `bun install`. 5. `bun run pretest`. Baselines via `bun run test`. ANY fail → STOP.
PATH (S126): ALL edits via Bash on worktree-absolute paths incl `.claude/worktrees/agent-<id>/`; NOT Edit/Write; echo path before write; re-verify. NEVER `cd` outside WORKTREE_ROOT; `git -C "$WORKTREE_ROOT"`, bun from WORKTREE_ROOT. SPEC.md is ~30k lines — NEVER full-read; grep -n + targeted Read.

# THE BUG — `<auth role>` gives NO warning that it doesn't gate content (HIGH, security footgun)

Repro sidecar (committed): `handOffs/incoming/2026-05-30-1126-giti-to-scrmlTS-giti-027-auth-role-no-gating-default-mode.scrml` (a `<program>` with `type UserRole:enum = { Anonymous, Owner }`, a public `<p>`, and `<auth role="Owner">` containing an owner button + `<p class="secret">owner-only-marker-12345</>`).

PA-verified facts:
- `<auth role>` is currently a JS-CHUNK-SPLITTING optimization, NOT a content-visibility control. emit-html.ts emits `<auth>` as a passthrough literal + renders all children as static markup. The reachability solver DOES compute per-role visibility (reachability-solver.ts:200-223 `computeAuthGatedBoundariesVisibleTo`/`isVisibleForRole`) but that verdict is consumed ONLY by the route-splitter for JS mount sets — HTML emission never consults it.
- DEFAULT mode (no --emit-per-route): complete no-op — gated markup + handler ship to everyone; UserRole never consulted at runtime; NO `W-AUTH-*` warning. Existing W-AUTH codes: W-AUTH-LOGIN-MISSING, W-AUTH-PAGE-INFERRED, W-AUTH-RUNTIME-FALLBACK — none covers inert-content-gate.
- PER-ROUTE mode: JS mount gated per-role ✓ BUT the served HTML still carries the secret markup verbatim (content leaks; only behavior withheld).

# SCOPE — PART (A): the warning ONLY

Add a NEW compile-time warning (e.g. `W-AUTH-CONTENT-NOT-GATED`) that fires whenever a `<auth role>` element is present, telling the author the gate does NOT withhold served HTML content. The message MUST be honest + not mislead:
- It must NOT say "--emit-per-route fixes it" — because per-route mode STILL leaks HTML content (only JS behavior is role-split).
- Suggested message shape: "`<auth role="X">` gates only JS mount/behavior (and only under --emit-per-route), NOT served HTML content — the gated markup remains in the HTML payload visible to all viewers. Do not rely on `<auth role>` for content secrecy; enforce sensitive gating server-side." Refine wording for clarity + actionability.
- Fire it whenever an `<auth role>` element exists in the compile (both modes) — the content always leaks. (If you judge a per-mode message split is clearly better, do it, but keep it honest in BOTH modes.)
- Severity: Warning (W-) — it's security-relevant; an Info lint is too quiet for a footgun. Use Warning.

Locus: the auth-graph / reachability diagnostic stream where W-AUTH-* already originate (`compiler/src/auth-graph.ts` and/or `compiler/src/reachability-solver.ts`). Add the §34 row for the new code (SPEC normative, R4) + a §40 cross-ref. Verify §34 / §40 line numbers via grep before editing.

# OUT OF SCOPE — DO NOT TOUCH
- Part (B): actual content withholding (per-role HTML emission / SSR subtree stripping). That's a design deliberation. Do NOT build it. Do NOT modify emit-html.ts / route-splitter.ts to strip content.
- Do not change the existing W-AUTH-* codes' behavior.

# ACCEPTANCE (R26 empirical)
- Compile the GITI-027 sidecar (default mode): `W-AUTH-CONTENT-NOT-GATED` fires (in result.warnings, non-fatal, exit 0).
- Compile a `<program>` WITHOUT any `<auth role>`: the warning does NOT fire (no false positive).
- The warning message is clear + does not over-promise.
- No regressions: full `bun run test` green (+N). NB the 3 known flakes — re-run isolated; no `--no-verify`.
- Write a regression test (fires with `<auth role>`, silent without).

# COMMIT DISCIPLINE (S83+S99): commit per edit via `git -C "$WORKTREE_ROOT"`; FIRST msg has verbatim `pwd`; NO `--no-verify`; clean `git status` before DONE.

# FINAL REPORT: WORKTREE_PATH·BRANCH·FINAL_SHA·FILES_TOUCHED·the warning code + final message text + where it fires·SPEC §sections touched·R26 result (fires-with / silent-without)·test delta·maps line·deferred (note (B) untouched).
