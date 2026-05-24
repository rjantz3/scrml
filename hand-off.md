# scrmlTS — Session 127 (CLOSE)

**Date:** 2026-05-24
**Previous:** `handOffs/hand-off-129.md` (S126 CLOSE)
**Machine:** same as S126 (no switch).
**HEAD at S127 OPEN:** `8cccc0f6` · **HEAD at S127 CLOSE:** `6f452eeb` (C2) + the wrap-docs commit on top.
**pkg.json:** 0.6.0 (no tag this session).
**Wrap:** full 8-step. **PUSH: see below — C2 + wrap-docs + scrml-support user-voice to push at close.**

---

## S127 CLOSE SUMMARY — read first

**A momentum session under the user's "keep momentum until I stop you / do everything right" directive.** 9 native-parser/shape units landed + the M6.7 flip-harness diagnostic. **Zero regressions, zero path-discipline leaks across 8 worktree dispatches.** Full `bun run test` **21,337 pass / 0 fail / 174 skip / 1 todo / 780 files**.

**Landed (all S67 file-delta, PA-authored, EXACT-hold-gated, PA-dual-verified):**
- `0e0b4498` **M6.5.b.2.1** — newline-as-statement-separator boundary for consecutive state-decls (native parseBinary ctx-flag).
- `319dbf26` **M6.5.b.3** — Rule-4 win: Class-C hoist-gap ALREADY CLOSED at HEAD; landed a 14-test regression-lock (no source change).
- `db2d4c28` **M6.5.b.4** — SECURITY (M6.7-STOP root cause): promote bare `?{}` stmt → `kind:"sql"`; closes the server-SQL-to-client leak + isServerOnlyNode hardening.
- `65621fab` **M6.5.b.5+b.6** — native→live shape (Class F) + span.file (Class G) normalize in parse-file.js; within-node −48022.
- `cce66699` **M6.7-D1** — null/undefined literal parse (the dominant `no statement begins here` cluster; NSBH 820→474).
- `15f4a2f2` **M6.7-D2** — `server`/`pure` modifier on `function` (PRIMER §6 recipe form); all 82 server/pure-function files clean.
- `868a1cad` **M6.7-C1** — component-def `raw` bodyText-relative span fix; same-file E-COMPONENT-020 19→0. (cross-file split to follow-on.)
- `6f452eeb` **M6.7-C2** — `server @var = expr` (§52.4) native production; mount-hydrate cluster closed (was an upstream parse failure, not codegen).

**✅ M6.5 path-b FIX/ADAPT WORK COMPLETE.** within-node 137,834 → ~95,351 net (b.5/b.6 dropped −48k; D1/D2 parse-completeness rose +5.5k; C1 flat; C2 dropped content-classes). **strict-pass EXACT held at 964 through every unit.**

**✅ M6.7 top-3 levers (D1+D2+C1) + C2-dominant CLOSED.**

---

## ⚠ PUSH STATE — surface at S128 OPEN
- Pushed mid-session through `868a1cad` (path-b + D1+D2+C1; pre-push 21,270/0). scrml-support user-voice S126 pushed earlier.
- **TO PUSH at this wrap:** scrmlTS `6f452eeb` (C2) + the wrap-docs commit; scrml-support `user-voice-scrmlTS.md` (S127 append). [PA pushes these as the final wrap step — if interrupted, S128 must push.]

---

## M6.7 FLIP-HARNESS DIAGNOSTIC (S127, the load-bearing finding)
Ran the full suite under a native default in a THROWAWAY worktree (discarded; main never touched). **567 deterministic failures (vs S124's 845, −33%), ZERO flaky.** Classified:
- **A=128 engine bodyChildren → M6.6-EXPECTED** (NOT flip-blockers; native parses engine state-child bodies as code-default → E-UNQUOTED-DISPLAY-TEXT + stub render — that's the M6.6 walker work, Decision E).
- **B=2 within-node-residual** (not blockers).
- **C=255 codegen/shape→consumer divergence** (NEEDS FIX — C1 closed the same-file E-COMPONENT-020 chunk; C2 closed the mount-hydrate chunk).
- **D=142 native parse-error** (NEEDS FIX — D1 closed null/undefined; D2 closed server-function).
- **E=42 cascade** (expected to shrink after C+D).
- conformance/self-host/lsp/parser-conformance = 0 fails (don't route the default parser path).

**Flip flip site = the single default `parser = null` at api.js:604.** **The default-flip is a USER decision** — PA reserved it, did NOT autonomous-land. **NOT flip-ready: a full flip-harness RE-MEASURE should precede any flip** (gets the real post-D1/D2/C1/C2 number — the per-unit proxies suggest substantial progress but the exact flip-failure count is unconfirmed since the diagnostic).

---

## NAMED FOLLOW-ON UNITS (the M6.7 pre-flip remainder — queue for S128+)
From the C2 Phase-0 decomposition + the per-unit splits (all recorded in `docs/changes/m67-phase-a-flag-flip/*.md`):
- **M6.7-C2-sql-loop-hoist** — §8.10 N+1 loop-hoist scaffolding absent under native.
- **M6.7-C2-tablefor-clientjs** — tableFor incidental clientJs/html length drift (needles match; likely benign — audit).
- **M6.7-C2-residual-audit** — server-eq-helper (needle matches; likely zero real flips — confirm).
- **M6.7-C2-reactivity-grammar** — `debounced=`/`throttled=` native parse gap.
- **M6.7-C1-followon** — cross-file `export const Name = <markup>` component (synthExportDecl raw slice, off by opener-width; ALSO serves non-component exports — regression-guard those).
- **M6.7-D3** — `:>` transition-arm (~42, from D1 split).
- **M6.7-D4** — object-literal-in-call-arg (~32, from D1 split).
- **C3/E cascade** (~76) — re-measure after the above; expected to largely collapse.
- **M6.6 Class-A engine bodyChildren** (128) — SEPARATE M6.6 work (not flip-blockers).
**Next-session path: knock down the C2/D3/D4 + C1-followon units → full flip-harness RE-MEASURE → flip decision (user).**

---

## KEY INSIGHTS BANKED (S127 — watch/apply)
1. **within-node canary is NON-MONOTONIC for parse-completeness fixes.** A fix that makes native PARSE more (D1 null/undefined, D2 server-function) RAISES the within-node total (more AST to compare). A shape-normalize (b.5/b.6) LOWERS it. A textual-raw fix (C1) leaves it flat. **The within-node total is NOT the flip gate.** The per-unit gate is **strict-pass EXACT** (held 964 all session); the definitive flip-readiness gate is the **flip-harness re-measure** (test-failure count under native default).
2. **Verify-don't-trust-the-diagnostic-bucket-label.** The S125 SCOPING + the M6.7 diagnostic bucket labels were imprecise/wrong **4× this wave**: b.3 (hoist-gap already closed), D1 (not arrows — null/undefined), C1 (not generic CE — a bodyText-relative span slice), C2 (not codegen — an upstream `server @var` parse gap). Every dev brief mandated Phase-0 root-cause confirmation BEFORE fixing; it paid off every time. Keep mandating it.
3. **EXACT-held + KIND-NAME/COUNT-LENGTH-flat = the rebaseline-hiding gate.** When an allowlist goes UP, EXACT-held (strict-pass) proves it's not a masked regression (a wrong shape would drop an EXACT fixture). Used on D1 (+4599) + D2 (+940).
4. **Minor recurring brief-non-compliance:** ~half the agents (C1, C2) committed the fix as the FIRST commit WITHOUT the WIP-start-pwd-echo the brief mandates. The actual leak gate (PA main-clean + diff-scoped check) held every time, so no leak — but the pwd-in-first-commit aid isn't reliably honored. Not blocking; the main-clean dual-verify is the real gate.

---

## State-as-of-close
| Item | Value |
|---|---|
| HEAD | `6f452eeb` (C2) + wrap-docs commit |
| pkg.json | 0.6.0 (no tag) |
| Full test | 21,337 pass / 0 fail / 174 skip / 1 todo / 780 files |
| strict-pass canary | 1000/1001 (EXACT 964) — held all session |
| within-node canary | ~95,351 (non-monotonic; not the flip gate) |
| Worktrees | main only (8 cleaned at wrap) |
| scrmlTS origin | C2 + wrap-docs unpushed at this write (PA pushes at wrap close) |
| scrml-support origin | user-voice S127 unpushed (PA pushes at wrap close) |
| S99 path-discipline counter | 15 (ZERO new this session across 8 dispatches) |

---

## Pre-existing carry-forwards (unchanged from S126 — still open)
compiler-managed-async gap (phantom `route.functionName` → A9-class transitive async-coloring, first-class deferred item; the dashboard/full-stack-runtime cluster) · 6nz-V (MED, GENUINE — class:NAME on for-lift reused DOM nodes) · GITI-015 (LOW) · 6nz-U (LOW, M6-subsumed) · 6nz-L/T (M6-deferred) · MCP-V0.D/E (parallel-eligible, no M6 dep; Tool-7 needs A-side serverFnNodeIds) · build-story arc (6 open Qs, M6-gated) · V-kill READ-side fire · dev.to articles · Living Compiler retraction · §29 vanilla-interop · Generator policy · `~snapshot` tilde raw-sigil · adopter corpus migration · v0.7 cut (gated on M6.7 flip + M6.8 deletion) · **versioning drift (pkg.json 0.6.0 vs changelog — reconcile before any tag).**

## v0.7 critical path (post-S127)
M6.7 pre-flip remainder (C2-followons + D3 + D4 + C1-followon, ~est 15-30h) → **full flip-harness re-measure** → flip decision (USER) → M6.6 Class-A engine-bodyChildren (~15-30h) → SOAK → M6.8 deletion (~12-20h) → v0.7 cut.

## Tags
#session-127 #CLOSE #m6.5-path-b-complete #m6.7-top3+c2-closed #flip-harness-845to567 #not-flip-ready #9-units-0-regressions #within-node-non-monotonic #verify-dont-trust-bucket
