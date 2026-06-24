# GITI-031 — `<match for=P on=@cell.subfield>` dispatches on the whole cell, ignoring the sub-path
change-id: `match-on-subfield-dispatch-2026-06-23`

> **Archived per S136** (verbatim dispatch prompt). Dispatched S217 (2026-06-23) to `scrml-js-codegen-engineer`, isolation:worktree, opus, background — one of 3 parallel render-codegen cluster dispatches (on-mount / each / match). Agent `a9cdf450da00e91d0`. Base main `f5f15009`.

---

A single silent (compile-clean, browser-only) match-dispatch codegen bug. NOTE: 2 sibling parallel dispatches are running (on-mount cluster on emit-html; each-cluster on emit-each) — you own the `<match>` / emit-variant-guard / match-`on=` surface; do NOT touch on-mount or each codegen.

[MAPS REQUIRED FIRST READ block — primary.map.md §Task-Shape Routing for a match/variant-guard codegen change; watermark a2137214; grep live emit-variant-guard.ts + emit-control-flow as ground truth.]

[STARTUP VERIFICATION + PATH DISCIPLINE block (S42/S88/S90/S99/S126) — pwd prefix check; git merge main at startup (base ≈ f5f15009); bun install; bun run pretest; Bash-edits on worktree-absolute paths; never cd into main; first commit msg includes verbatim pwd.]

# THE BUG — GITI-031
`<match for=P on=@cell.state>` emits a dispatch that reads the WHOLE `cell` object, never applying the `.state` sub-path. The dispatcher's `_tag = (_v.variant) ? _v.variant : _v` then receives `{state, n}` (an object with no `.variant`), matches no arm, and the mount stays blank — even for the initial seed variant. REPRO (verified @HEAD):
```scrml
<program>
type P:enum = { Idle, Ok }
<cell> = { state: P.Idle, n: 0 }
<match for=P on=@cell.state><Idle><p>IDLE</p></Idle><Ok><p>OK</p></Ok></match>
</program>
```
Emitted (wrong): `__scrml_match_..._dispatch(_scrml_reactive_get("cell"))` — identical to the `on=@cell` whole-cell emit; the `.state` access is DROPPED. Root-cause: the match `on=` expression handling lowers only the base cell ref and discards the member/sub-path access. Fix: `on=@cell.state` (and any `on=<expr-with-member-access>`) evaluates the FULL operand expression — emit `...dispatch(_scrml_reactive_get("cell").state)` so the dispatcher receives the enum variant, not the parent struct. Must work for the initial seed variant AND reactive updates. giti impact: live (`on=@snapshot.state`) + feed (`on=@status.state`) render blank. giti repro `ui/repros/repro-30-match-on-subfield-dispatches-whole-cell.scrml`.

# SCOPE: match `on=` operand lowering ONLY (emit-variant-guard / emit-control-flow). Do NOT touch on-mount or each codegen (sibling dispatches). Cover the block-form `<match for=P on=expr>` and confirm whether the JS-style `match expr {}` value-return form has the same sub-path bug (check + fix if so; else note).

# PHASE 3 — tests + R26 (S138) + WITHIN-NODE (S211 — 3 PARALLEL DISPATCHES)
- Tests: `<match on=@cell.state>` dispatches on the `.state` sub-path (assert the emit reads `.state`, NOT the whole cell; initial seed renders; reactive update re-dispatches). Add a deeper sub-path case (`on=@a.b.c`).
- Re-compile repro; node-check; grep `dispatch(...).state` present. Run FULL `bun run test`.
- WITHIN-NODE (S211): if your match-emit change makes a M6.5.b.0 within-node fixture over-budget, re-baseline THAT fixture in YOUR worktree + REPORT the exact (fixture, class, raw) changes — 2 sibling dispatches also touch client codegen, the PA reconciles the allowlist by hand at landing; do NOT assume yours is the only change.
- DO NOT mark DONE without empirical R26 passing.

# COMMIT DISCIPLINE (S83): per-phase, coupled code+test = one commit, no --no-verify, clean before DONE. Update docs/changes/match-on-subfield-dispatch-2026-06-23/progress.md per phase.

# REPORT (return value = raw data): WORKTREE_PATH, FINAL_SHA, BRANCH, FILES_TOUCHED. Phase-0 repro + root-cause (file:line) + fix. Whether JS-style match shared the bug. R26 (symptom-gone + node-check + full-suite + exact within-node allowlist changes if any). Maps load-bearing? Sub-decisions/STOPs. Deferred.

---
**Outcome:** RESOLVED. Root cause = emit-match.ts `resolveOnExpr` member-access branch (~:317-324) returned the root cell → Shape A; emit-variant-guard.ts Shape-A subscribe (~:1145) + DOMContentLoaded init-fire (~:1167) dropped the sub-path. Fix threads `subscribeSubPath` so the subscribe wraps the dispatch + init-fire reads the sub-path. JS-style value-match EMPIRICALLY UNAFFECTED (different path — emitExprField handles full member-access). Within-node: NO change (codegen-internal). R26 adversarial: revert → 7/9 new tests fail. Landed `f5f15009`→PA-commit (this landing).
