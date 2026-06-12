# scrmlTS — Session 185 (CLOSE)

**Date:** 2026-06-12 (opened 2026-06-11; spans midnight — still S185 per the S42 precedent).
**Previous:** `handOffs/hand-off-189.md` (= S184 CLOSE).
**Next-session pickup:** rotate THIS file → `handOffs/hand-off-190.md` at next OPEN.
**Profile:** opened **A (FULL)** (`"read pa.md and start session"` → default A). Full session-start chain done: pa-scrmlTS.md IN FULL (1166L) + PRIMER IN FULL (1465L) + SPEC-INDEX section-map + master-list §0 + user-voice tail S173-S183 + git sync + inbox + hooks.

## 🟢 S185 CLOSE — errarm re-fail-from-arm fix + validator inline-msg paren-canonical + engine/§36 dog-food

**HEAD `a4726dd3` + the wrap commit on top. PUSHED at wrap** (user "wrap and push"; if origin ≠ HEAD when you read this, push didn't complete — verify). **2 compiler-source landings + a doc-migration arc; both real bugs were S179/S180 waiting-time dog-food finds.**
- **Tests:** full suite **23,946 pass / 0 fail / 221 skip / 1 todo / 983 files** (24,168 ran / 79,686 expect; +25 over S184's ~23,921). Subset via `bun scripts/state.ts`.
- **known-gaps:** **HIGH 0 · MED 6 · LOW 12 · Nominal 9** (131 @gap tokens). `bun scripts/state.ts` for live.
- **Version:** v0.7.0, no cut. **Maps:** 6c refreshed → watermark `a4726dd3`. **Worktrees:** cleaned at wrap (2). **Inbox:** empty.

### S185 arcs (chronological)
1. **`37abb1d2` — errarm re-fail-from-arm (2-layer) + validator inline-msg paren migration + 2 gaps filed (PUSHED).** The §6/§19 cross-check (user "g-errarm: do the §6/§19 spec cross-check") verdict: re-`fail` from a `!{}`/match handler arm IS canonical — **§19.5.2** (the `?` operator desugars to a re-fail arm) + §41.13 + §19.3.2/NS-4. verify-before-claim found the bug was TWO layers (typer E-SCOPE-001 + codegen E-CODEGEN-INVALID-JS; the `?` flagship rewrap was broken) → re-tagged LOW→MED. Agent `54cf6fe8` (file-delta): NS-1 preserved (E-ERROR-001 in non-`!` fn); §41.13 doc fix applied. +13 tests; PA-independent R26 green. **g-errarm RESOLVED.** Same commit: SPEC §41.12 + PRIMER §8 colon→paren migration + g-validator-inline-msg-colon-form (MED) + g-derived-engine-expression-form (LOW) filed.
2. **`a4726dd3` — E-VALIDATOR-INLINE-COLON clear diagnostic (PUSHED).** The colon-form inline-message override `<name req:"…">` (dog-food find) corrupts cell `@`-registration → misleading E-SCOPE-001. User ruled paren-canonical. Agent `433518a` (file-delta): `ast-builder.js scanStructuralDeclLookahead tryRecoverColonInlineMessage` detects the colon-form (known validator + `:`-string inside opener, bareword + call-form) → fires E-VALIDATOR-INLINE-COLON naming the paren form AND recovers (registers the cell with the message as the paren-form override → suppresses the cascade). §34 + §55 summary row; SPEC-INDEX regen + footer sync (→32,241). +10 tests; PA-independent R26 (repros fire COLON / suppress SCOPE; controls clean). **g-validator-inline-msg-colon-form RESOLVED.** PA corrected the agent's S186→S185 session-label across 6 files.

### Dog-food findings (S179/S180 waiting-time pattern, 4 surfaces)
- **§55 validators** → **1 bug** (inline-msg colon form, fixed above). Otherwise solid: compound + validators + auto-synth surface, cross-field `eq()`, `oneOf` bare-variant array, refinement-type `string(pattern())` stacking, per-field `.errors[0]` enum-tag match, `<errors of=… all/>` — all real codegen.
- **typed-SQL-row T3** → clean. Flagship pattern (server-fetch `?{}`→`return {loadRows}`→client `@cell`→`<each>`→`<LoadCard load=l>` width-subtyping prop contract) compiles end-to-end; T3 landed S175 (verified). Minor: a `<schema>` block alone doesn't type `?{}` rows — needs a `<db src=>` in scope (else asIs + W-SQL-ROW-UNTYPED, documented per §34:16716, not a bug).
- **engine §51 (11 corners)** → rock-solid EXCEPT **g-derived-engine-expression-form (LOW, filed)**: the `derived=expr` form (§51.0.J/L20/PRIMER §7) is NOT implemented — only legacy `derived=@machineVar` works; the documented expression form gives confusing diagnostics (E-ENGINE-004 "machine var not found" / W-ENGINE-INITIAL-MISSING / E-ENGINE-INVALID-TRANSITION instead of E-DERIVED-ENGINE-NO-WRITE). Known B16 deferral; PRIMER §7 presents it as working (doc-vs-impl). All else fired correctly: payload variants, multi-target/terminal rules, E-ENGINE-INVALID-TRANSITION, E-ENGINE-PAYLOAD-ARITY-MISMATCH, E-INTERNAL-RULE-NOT-COMPOSITE, boot-`effect=` (S148), `<onTimeout>`/`<onIdle>`, S178 component ambient-read, nested/hierarchy, `history`/`.Variant.history`, `.advance()` + Option-d self-write lint.
- **§36 input** → clean. `<keyboard>`/`<mouse>` decls + `<#id>` access + live runtime listener wiring + dead-fn tree-shake + E-INPUT-001 (missing id).

## 🟡 Carry-forward queue (cross-check live `@gap` + git log per verify-before-claim)
1. **`g-derived-engine-expression-form` (NEW LOW, S185)** — §51.0.J `derived=expr` not implemented (only legacy `derived=@machineVar`); confusing diagnostics + PRIMER §7 doc-vs-impl. Repro shapes in the gap body. The full impl is a real ast-builder build (populate `derivedExpr` as a parsed ExprNode → the dormant B16 SYM rejections light up); a cheaper interim is a clear "expression form not yet implemented" diagnostic.
2. **g-errarm (3) `:`-shorthand block-form match-arm interpolation literal-emit** (`<Done count> : "got ${count}"`) — separate pre-existing shorthand-interpolation gap, flagged carry-forward in the (now-resolved) g-errarm body. File if it recurs in dog-food.
3. **DG class-attr-consumer candidate** (incidental, unverified) — spurious E-DG-002 on `class="prefix-${@cell}"`. Verify before filing/fixing.
4. **2B documentation deliverable** (DD1 close, S178) — credit the engine-singleton as the typed global reactive store; small additive SPEC/PRIMER note; bundles with the deferred Fork-3 immutability cross-ref (S174).
5. **bug-75** — deferred (after-`>` engine `:`-shorthand E2E fails at BS; LOW + deprecated-form-only).
6. **VERIFIED.md** — S180's 13 changed examples remain open re-verification (USER action).
7. **base-extraction replication** (master-PA territory) — pa-base.md v1 exists; vendoring is cross-repo.

**CARRY-FORWARD gap tails (cross-check live):**
- **MED (6):** `r28-c2` (kickstarter currency) · `a5` (refinement-freeze) · `bug-1` (Tailwind preflight-blocked) · `bug-12-vkill` (engine-canon-blocked) · `bug-14` (MCP V0.D, §58-blocked) · `bug-17-l19` (L19 relax — HU DESIGN Q).
- **LOW (12):** incl. `g-derived-engine-expression-form` (NEW) · `g-component-001-coverage` · `g-sql-row-protect-leak` · `g-sse-server-keyword` (KEEP-deferred) · `bug-18`/`19-cite`/`20`/`21`/`22` · `bug-75` · `r28-2b` · `s169-ordered-unordered-build` (Nominal). `bun scripts/state.ts` + grep `@gap` for the live set.
- **Big in-flight arc — native parser CHARTER B:** M1 lexer COMPLETE; M2.4 + MK2 next per `docs/changes/native-parser-front-end/IMPLEMENTATION-ROADMAP.md`. Cutover deferred (~v0.8; ~508 flip-failures need FRESH re-triage).
- **Untested dog-food surface (remaining):** channels §38 · schema/migrations §39 · `<each>` §17.7 directly. (S185 swept validators/typed-SQL-row/engine/§36-input.)

## Open questions to surface immediately
- **S184 has NO user-voice entry** (prior-session logging gap; S185 entry follows S183 in the file). S184's content is in changelog + hand-off-189. Not PA-backfillable verbatim. Flag if the user wants a reconstruction.
- Push state: S185 wrap commit + the 2 fix commits — verify origin == HEAD post-wrap.

## pa.md directives in force
- Rules R1–R5. `---` answer-delimiter. Profile A/B. `full wrap`/88% floor. wrap = 8 steps (6b worktree-cleanup / 6c maps / 6d state-regen+currency-gate).
- Dispatch protocol: S88 isolation:worktree explicit · F4 startup-verify · S90 CWD · S99/S126 Bash-edit + no-`cd` · S136 BRIEF.md archival · S138 R26/empirical (both directions) · S147 branch-leak coherence + clobber-check · S164 bg-commit-race · S180 waiting-time 3-tier.
- Memory live: `feedback_waiting_time_work_pattern` · `feedback_verify_before_claim` · `feedback_dont_preclassify_fix_as_surgical` · `feedback_signal_ruling_scope` · `feedback_file_delta_vs_cherry_pick` (clobber-check) · `feedback_dont_soft_classify_bugs` · `feedback_sweep_all_mentions_newest_first`.

## Tags
#session-185 #profile-a-full-start #close #errarm-refail #validator-inline-colon #engine-dogfood #pushed
