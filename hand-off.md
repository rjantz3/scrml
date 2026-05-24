# scrmlTS — Session 128 (OPEN)

**Date:** 2026-05-24
**Previous:** `handOffs/hand-off-130.md` (S127 CLOSE)
**Machine:** same as S127 (no switch).
**HEAD at S128 OPEN:** `003ee3a8` (S127 wrap-docs commit).
**pkg.json:** 0.6.0 (no tag).

---

## SESSION-OPEN STATE (verified at S128 OPEN)

- **scrmlTS:** clean tree · `0/0` with `origin/main` (S127 C2 + wrap-docs already pushed) · HEAD `003ee3a8`.
- **scrml-support:** `0/0` with origin (S127 user-voice push landed). Untracked: pre-existing 2026-05-09 voice-article drafts + `tools/` dir — NOT this session's concern.
- **Hooks:** configuration B (local-rich `.git/hooks` — pre-commit + post-commit + pre-push installed). Leave as-is.
- **Incoming messages:** none in `handOffs/incoming/`.
- **Worktrees:** main only (S127 cleaned 8).
- **S99 path-discipline counter:** 15 (zero new across S127's 8 dispatches).

---

## GOVERNING DIRECTIVES (carry-forward — load-bearing on the M6 arc)

1. **"Intentional & exacting through the rest of M6"** (S126 headline). One M6.5/M6.7 unit at a time (or genuinely-disjoint pairs only — NOT a fire-hose). Within-node canary re-run after EVERY parser-shape change (pre-commit gate EXCLUDES `parser-conformance-*` — the S125 false-green vector). Bash-edit + no-`cd` path-discipline in every M6 brief. Per-unit PA diff-review + dual-verify before each file-delta. M6.7 flag-flip ONLY after a full flip-harness re-measure. No premature M6.8 deletion.

2. **"Keep momentum until I stop you / do everything right"** (S127 headline). Authorizes autonomous multi-unit waves (dispatch → dual-verify → land → dispatch next) with NO per-unit confirmation — BUT checkpoint at irreversible / decision boundaries (the M6.7 default-flip is a USER decision, NOT autonomous-land). "Do everything right" is co-equal with momentum: keep the exacting discipline at speed.

3. **Verify-don't-trust-the-diagnostic-bucket-label** (validated 4× in S127: b.3 / D1 / C1 / C2 all had wrong/imprecise bucket labels). Every dev brief MUST mandate Phase-0 root-cause confirmation BEFORE the fix.

4. **Don't reflexively flag an already-live-accepted form as a design/subset decision** (S127 PA self-correction). If the LIVE parser accepts a form, it is IN the language; native matching it is parity-COMPLETENESS, not subset expansion. Class-D ("live accepts, native rejects") is by definition completeness work.

---

## NEXT PRIORITY — M6.7 pre-flip remainder (the v0.7 critical path)

Per S127 CLOSE: M6.5 path-b FIX/ADAPT is COMPLETE; M6.7 top-3 (D1+D2+C1) + C2-dominant are CLOSED. The remaining pre-flip work is the named follow-on units below, then a **full flip-harness RE-MEASURE** (the S127 diagnostic was 845→567 BEFORE D1/D2/C1/C2; the real post-fix count is unconfirmed), then the **default-flip decision (USER)**.

**NAMED FOLLOW-ON UNITS** (from C2 Phase-0 decomposition + per-unit splits; recorded in `docs/changes/m67-phase-a-flag-flip/*.md`):
- **M6.7-C2-sql-loop-hoist** — §8.10 N+1 loop-hoist scaffolding absent under native.
- **M6.7-C2-tablefor-clientjs** — tableFor incidental clientJs/html length drift (needles match; likely benign — audit).
- **M6.7-C2-residual-audit** — server-eq-helper (needle matches; likely zero real flips — confirm).
- **M6.7-C2-reactivity-grammar** — `debounced=`/`throttled=` native parse gap.
- **M6.7-C1-followon** — cross-file `export const Name = <markup>` component (synthExportDecl raw slice, off by opener-width; ALSO serves non-component exports — regression-guard those).
- **M6.7-D3** — `:>` transition-arm (~42, from D1 split).
- **M6.7-D4** — object-literal-in-call-arg (~32, from D1 split).
- **C3/E cascade** (~76) — re-measure after the above; expected to largely collapse.
- **M6.6 Class-A engine bodyChildren** (128) — SEPARATE M6.6 work (NOT flip-blockers; native parses engine state-child bodies as code-default → E-UNQUOTED-DISPLAY-TEXT + stub render; that's the M6.6 walker work, Decision E).

**Path:** knock down C2-followons + D3 + D4 + C1-followon → full flip-harness RE-MEASURE → flip decision (USER) → M6.6 Class-A engine-bodyChildren → SOAK → M6.8 deletion → v0.7 cut.

**Gates / canaries:**
- Per-unit correctness gate = **strict-pass EXACT** (held 964 all of S127).
- within-node canary is **NON-MONOTONIC** for parse-completeness fixes (rises when native parses MORE; falls on shape-normalize; flat on textual-raw). NOT the flip gate.
- Definitive flip-readiness gate = **flip-harness re-measure** (test-failure count under native default), run in a THROWAWAY worktree (S127 pattern — temp-flip api.js:604 `parser=null`, full-suite, classify, discard; main never touched).

---

## v0.7 critical path (post-S127)
M6.7 pre-flip remainder (C2-followons + D3 + D4 + C1-followon, ~est 15-30h) → **full flip-harness re-measure** → flip decision (USER) → M6.6 Class-A engine-bodyChildren (~15-30h) → SOAK → M6.8 deletion (~12-20h) → v0.7 cut.

---

## Pre-existing carry-forwards (from S126/S127 — still open)
- **compiler-managed-async gap** (phantom `route.functionName` → A9-class transitive async-coloring; the dashboard/full-stack-runtime cluster; first-class deferred — do NOT blind-patch, all-3-layers-or-none).
- **6nz-V** (MED, GENUINE — `class:NAME` on for-lift reused DOM nodes not re-evaluated; runtime path, not codegen).
- **GITI-015** (LOW) · **6nz-U** (LOW, likely M6-subsumed) · **6nz-L/T** (M6-deferred).
- **MCP-V0.D + .E** (parallel-eligible, NO M6 dep; Tool-7 needs A-side `serverFnNodeIds` on `serverfns.json`). MCP-V0.A+B+C CLOSED.
- build-story arc (6 open Qs, M6-gated) · V-kill READ-side fire · dev.to articles · Living Compiler retraction (pending user stamp+publish) · §29 vanilla-interop (user decision pending) · Generator policy (S114 open) · `~snapshot` tilde raw-sigil · adopter corpus migration · v0.7 cut (gated on M6.7 flip + M6.8 deletion).
- **versioning drift** — pkg.json 0.6.0 vs changelog; reconcile before any tag.

---

## State-as-of-open
| Item | Value |
|---|---|
| HEAD | `003ee3a8` |
| pkg.json | 0.6.0 (no tag) |
| Full test (S127 close) | 21,337 pass / 0 fail / 174 skip / 1 todo / 780 files |
| strict-pass canary | 1000/1001 (EXACT 964) |
| within-node canary | ~95,351 (non-monotonic; not the flip gate) |
| Worktrees | main only |
| S99 path-discipline counter | 15 |

## Open questions to surface immediately
- None blocking. Awaiting user direction on whether to open the M6.7 pre-flip remainder wave (next priority above) or pivot. Per S127 "keep momentum until I stop you," the default is to continue the M6.7 pre-flip wave unless redirected.

## Tags
#session-128 #OPEN #m6.7-pre-flip-remainder #intentional-exacting-through-m6 #keep-momentum #flip-decision-is-user
