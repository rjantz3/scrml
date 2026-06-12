# scrmlTS — Session 184 (CLOSE)

**Date:** 2026-06-11
**Previous:** `handOffs/hand-off-188.md` (= S183 CLOSE).
**Next-session pickup:** rotate THIS file → `handOffs/hand-off-189.md` at next OPEN.
**Profile:** opened **A (FULL)** (`"read pa.md and start session"` → default A). Full session-start chain done: pa-scrmlTS.md IN FULL (1166L) + PRIMER IN FULL (1464L) + SPEC-INDEX section-map (1-59) + master-list §0 + user-voice tail S176-S183 + git sync + inbox.

## 🟢 S184 CLOSE — 6-arc lifecycle + L22 dog-food sweep (+ Gap-3 deferred)

**HEAD `7fe7044f` + the wrap commit on top. PUSHED at wrap** (user "land those then wrap and push"; if origin ≠ HEAD when you read this, push didn't complete — verify). **6 arcs LANDED** (comment-leak → double-fire → given-arrow → Shape-1 → ghost-lint → payload-binding Gaps 1+2). The session grew from one directive — "verify the lifecycle candidate" — into the whole sweep via the S179/S180 waiting-time dog-food pattern.
- **Tests:** full suite **24,145 ran / 0 fail / 1 todo** (pass ≈23,923; +66 over S183's 23,855). Subset 16,692/0 via `bun scripts/state.ts`.
- **known-gaps:** **HIGH 0 · MED 6 · LOW 12** (g-lifecycle-struct-field-const-notfire + g-ghost-lint-canonical-form-false-positive RESOLVED; **g-errarm-fail-and-parsevariant-handler NEW/deferred**). `bun scripts/state.ts` for live counts.
- **Version:** v0.7.0, no cut. **Maps:** 6c refreshed → watermark `7fe7044f`. **Worktrees:** cleaned at wrap (5). **Inbox:** empty.

### S184 arcs (chronological)
1. **`32b9a4a7` — comment-leak fix + Direction-1 doc fix (PUSHED).** `g-lifecycle-struct-field-const-notfire` RESOLVED. Two findings: (a) doc-vs-impl — PRIMER §6.5 + kickstarter §3.2 taught the un-tracked `const u` form (→ rewrote to `<u>` cell-form); (b) NEW comment-leak parse bug — trailing `//` on a `(not to string)` field leaked into the type-expr → false E-STRUCT-FUNCTION-FIELD (fixed at root: `ast-builder.js` skips COMMENT tokens at braced-body collection). +12 tests.
2. **`3587af46` — double-fire + W-LINT-007 ghost (PUSHED).** E-TYPE-001 double-fire (root: `statementText()` whitespace-dedup mismatch — `@u.passwordHash` vs `@u . passwordHash`) + W-LINT-007 false-positive on `<u>: User = {…}` typed-cell decls. **PA R26 verified the double-fire fix covers all 3 manifestations** (struct-field + fn-return + variant — two of which my dog-food surfaced beyond the brief). +10 tests.
3. **`809044c3` — given-arrow doc-migration (PUSHED).** Migrated deprecated `given x =>` → canonical `:>` (S148) across PRIMER (3) + kickstarter (3) + SPEC (14); preserved the W-GIVEN-ARROW-LEGACY catalog row; fixed the stale E-SYNTAX-043/004 rows.
4. **`cf954570` — Shape-1 variant-lifecycle initializer (PUSHED).** Dog-food R3: `<status>: (.Idle to .Done) = .Idle` threw E-VARIANT-AMBIGUOUS. Option **(i) INFER** ratified. TWO fixes (initializer enum-inference at ~8683 + bare-form unknown-type-scanner at ~4283; the 2nd past the brief's single-hypothesis). +13 tests + updated a locking test. PRIMER §14.12.3 now works as-written. **Process:** agent self-disclosed an unauthorized `--no-verify` on a WIP commit; corrected + PA landing re-ran the gate.
5. **`bc692eca` — ghost-lint canonical-form exemption (LANDED).** Dog-food (components/L22): the React/Vue/Angular ghost-pass + W-EACH-PROMOTABLE false-fire on canonical forms. Fix A exempts the §16.6 snippet-fill `prop={ (p) => <markup> }` from W-LINT-007/004/021 (markup-RETURN clause is load-bearing — a genuine JSX scalar arrow `onClick={(e)=>fn()}` STILL fires, R25 Bug 44 lock); Fix B skips `_tableForSynth`-generated iteration from W-EACH-PROMOTABLE. +20 tests. `g-ghost-lint-canonical-form-false-positive` RESOLVED.
6. **`7fe7044f` — payload-binding Gaps 1+2 (LANDED).** Dog-food (parseVariant/L22): **Gap 1** `!{}` multi-field arms bound comma-joined `arm.binding` as ONE name (type-system.ts:9283) → split each; **Gap 2** `<match>` block-form arms fell through the typer default recursion with no bindings in scope → new `case "match-block"` + **a codegen companion in emit-match.ts** (the canonical SPACE form `<Done count>` was broken at codegen too — the agent caught the brief's wrong "codegen already splits" assumption). +11 tests.
7. **DEFERRED — Gap 3 + `fail`-in-`!{}`-arm** (`g-errarm-fail-and-parsevariant-handler` NEW LOW). Gap 3 (SPEC §41.13 parseVariant example) is BLOCKED — verify-before-claim found `fail` is undeclared inside a `!{}` handler arm body (GENERAL — user-enum + parseVariant; the §41.13 example re-fails). Needs a SPEC §6/§19 cross-check (is re-`fail` from a handler arm canonical?) + a typer fix BEFORE the SPEC example can compile; I did NOT apply a broken example. Also: `:`-shorthand block-form match-arm interpolation emits the body literally (agent-surfaced, pre-existing). Reproducers at `docs/changes/payload-binding-gaps-2026-06-11/`.

### Dog-food findings (S179/S180 waiting-time pattern, trucking domain)
- ✅ fn-return presence `(not to T)` on a `const` binding WORKS (resolved the carry-forward candidate); fn-return variant `(.A to .B)` + `transition()` works; engine-cell carve-out fires; canonical `given … :>` clean.
- The double-fire was BROADER than the brief scoped (3 manifestations) — caught by dog-food, verified comprehensive at landing.
- **L22 flagships + validators all VALIDATED clean end-to-end** (formFor → `<form>`, schemaFor → DDL, tableFor → auto title-cased `<table>`, §55 validators → auto-synth validity surface). Several scrml-shape learnings (file-based routing — `<page>` infers route from filepath, no `route=`/`name=`; `<schema>` must be a `<program>` child; program-level functions are bare not `${}`-wrapped).
- **parseVariant dog-food surfaced the payload-binding cluster** (arcs 5/6) — the highest-value find of the sweep, exactly the S179 directive's purpose.

### Remaining unfiled candidate (confirmed but NOT a bug)
- **inline-struct real-fn-field** — agent claimed "not rejected at all"; **NOT-REPRODUCED** (all of `() -> void` / `(x) => string` / `fn()` DO fire E-STRUCT-FUNCTION-FIELD in inline position). Dropped.

**Worktrees RETAINED (clean at wrap, S83 6b):** `a45a3baf…` (comment-leak), `a8d971fd…` (double-fire/lint), `a908aad0…` (in-flight).

**Arc:** verify `g-lifecycle-struct-field-const-notfire` → it forked into TWO confirmed bugs, both resolved.

1. **Original candidate CONFIRMED — doc-vs-impl** (not a tracker regression). The Landing-1 tracker fires correctly on idiomatic `<state>`-cell struct bindings (`<u>: User = {…}` + `@u.passwordHash` → E-TYPE-001 fires; verified). PRIMER §6.5 + kickstarter §3.2 teach it with a plain local `const u: User = {…}` binding read via bare `u.passwordHash` — a TS idiom the tracker doesn't observe → no fire. **User ruled Direction 1** (fix the docs to the cell-form). **Doc fix is PREPPED + verified, ready to apply post-parse-fix** — `docs/changes/lifecycle-field-comment-leak-2026-06-11/DOC-FIX-PLAN.md` (PRIMER §6.5 + kickstarter §3.2; SPEC §14.12.1 needs no binding change).
2. **NEW bug — comment-leak parse bug — DISPATCHED** (worktree-isolated `scrml-js-codegen-engineer`, agent `a45a3baf0b20b5569`, background). A trailing `//`/`/* */` comment on a `(not to string)` lifecycle struct-field line leaks into the type-expr → misclassified as a function type → **`E-STRUCT-FUNCTION-FIELD` false-positive ERROR blocking valid scrml**. Root cause: `type-system.ts parseStructBody:~1440` extracts the comment into `typeExpr`; `isFunctionTypeAnnotation:~2099` keys lifecycle-wrap on `endsWith(")")` (comment breaks it) + `findTopLevelArrow` matches "to" inside the comment. Narrow trigger (only `to`-lifecycle + trailing comment; plain fields/refinements/legacy `->` tolerate comments). Hits the canonical SPEC §14.12.1 / PRIMER §6.5 / kickstarter §3.2 examples as printed. **Scoped to JUST the parse bug** (user ruling "A"). Brief archived (S136) at `…/BRIEF.md`; SCOPE at `…/SCOPE.md`.

**Landing (done):** file-delta (ast-builder.js + 12-test file + progress.md) + S147 coherence + PA-independent R26 (0 E-STRUCT-FUNCTION-FIELD on comment form, E-TYPE-001 fires, real `() -> void` still rejected) → PA-commit `32b9a4a7` → doc fix applied (PRIMER §6.5 + kickstarter §3.2 → cell-form, re-verified post-fix) → gap RESOLVED → 6d state regen (LOW 12→11) → pushed.

**2 incidentals surfaced, OUT of scope (candidate-level, confirmed, NOT filed yet — awaiting user disposition):**
- **E-TYPE-001 double-fire** — one pre-transition read emits 2 identical span-less E-TYPE-001. Tracker UX bug.
- **W-LINT-007 ghost false-positive** — ghost-lint mis-reads struct object literals `{ id: 1, … }` as `<Comp prop={val}>`.

**Carry-forward CANDIDATE (separate, unverified):** SPEC §14.12.6 fn-return examples use `const u = loadUser(42)` + `u.name` — same const-binding-not-tracked shape as the struct-field gap but a different mechanism (§14.12.6 presence-progression hybrid). Probe if/when wanted.

---

## 🟡 S184 OPEN — caught up, awaiting direction

### State as of open (verified this session)
- **HEAD:** `3e539003` (= S183 wrap commit). **origin/main = HEAD** (0/0 ahead/behind, scrmlTS + scrml-support both clean/in-sync).
- **Tests:** pre-commit subset **16,624 pass / 0 fail / 90 skip** (`bun scripts/state.ts`). Full-suite count at S183 close was ~23,855.
- **known-gaps:** **HIGH 0 · MED 6 · LOW 12** · Nominal 9 (127 @gap tokens total). `bun scripts/state.ts` for live counts.
- **Version:** v0.7.0, no cut. **stdlib:** 18 modules. **SPEC.md:** 32,237 lines.
- **Maps:** watermark `1734b81b`; 2 commits behind HEAD — but both (`e4bf4105` 6c-maps + `3e539003` wrap) are doc/maps-only, NO source drift. Maps current for source.
- **Inbox:** empty. **Hooks:** config B (pre-commit + post-commit + pre-push). **Worktrees:** ONLY main.

### Carry-forward queue (from S183 hand-off — cross-check live `@gap` + git log per verify-before-claim)
**Open questions surfaced at S183 close:**
1. **`g-lifecycle-struct-field-const-notfire` (LOW, S183 CANDIDATE — not confirmed bug)** — PRIMER §6.5 struct-field `(not to string)` pre-transition example did NOT fire `E-TYPE-001`. Needs focused gate-logic check (does E-TYPE-001 fire on Landing-1's own test form vs the primer's top-level `const u: User = {...}` + member-read?). Could be a tracker sub-path or `const`-binding subtlety. Cross-ref known-gaps §5 + re-derive repro from PRIMER §6.5.
2. **DG class-attr-consumer candidate (incidental)** — post-tailwind-fix, `class="prefix-${@cell}"` surfaces a spurious `E-DG-002` unused-`@cell` WARNING (DG doesn't count a class-attr `${@cell}` interpolation as a render-consumer). Warning-level, non-fatal. Needs verify before filing/fixing.
3. **base-extraction replication (master-PA territory)** — `pa-base.md` v1 (`6601c05` scrml-support) exists; vendoring into giti/6nz + per-project overlays is cross-repo → master PA. scrmlTS PA's OWN contract stays the untouched OG (S182 reframe).
4. **bug-75** — deferred (after-`>` engine `:`-shorthand E2E fails at BS; PRIMER §13.7-B18; LOW + deprecated-form-only).
5. **VERIFIED.md** — S180's 13 changed examples remain open re-verification (USER action).
6. **2B documentation deliverable** (DD1 close, S178) — credit the engine-singleton as the typed global reactive store; small additive SPEC/PRIMER note; placement TBD (§51.0.A vs §52). Bundles with deferred Fork-3 immutability cross-ref (S174).

**CARRY-FORWARD gap tails (cross-check live before acting):**
- **MED (6):** `r28-c2` (kickstarter currency) · `a5` (refinement-freeze) · `bug-1` (Tailwind preflight-blocked) · `bug-12-vkill` (engine-canon-blocked) · `bug-14` (MCP V0.D, §58-blocked) · `bug-17-l19` (L19 relax — HU DESIGN Q).
- **LOW (12):** `g-component-001-coverage` · `g-sql-row-protect-leak` · `g-sse-server-keyword` (KEEP-deferred) · `g-lifecycle-struct-field-const-notfire` (S183 candidate) · `bug-18` · `bug-19-cite` (Rule-1 skip) · `bug-20` (blocked) · `bug-21`/`bug-22` (deferred) · `bug-75` (deferred) · `r28-2b` (broad blast) · `s169-ordered-unordered-build` (Nominal).
- **Big in-flight arc — native parser CHARTER B:** M1 lexer COMPLETE; M2.4 + MK2 next per `docs/changes/native-parser-front-end/IMPLEMENTATION-ROADMAP.md`. Cutover deferred (~v0.8; ~508 flip-failures need FRESH re-triage).
- **Untested dog-food surface:** §55 validators + auto-synth validity surface; typed-SQL-row T3 flagship (needs DB/server context); `<keyboard>`/`<mouse>`/`<gamepad>` (§36 sliver).

## pa.md directives in force
- Rules R1–R5. `---` answer-delimiter. Profile A/B. `full wrap`/88% floor. wrap = 8 steps (6b/6c/6d).
- Dispatch protocol: S88 isolation:worktree explicit · F4 startup-verify · S90 CWD · S99/S126 Bash-edit + no-`cd` · S136 BRIEF.md archival · S138 R26/empirical · S147 branch-leak coherence · S164 bg-commit-race · S180 waiting-time 3-tier (Tier-1 maint → Tier-2 next-dispatch-prep → Tier-3 dog-food).
- Memory live: `feedback_waiting_time_work_pattern` · `feedback_verify_before_claim` · `feedback_dont_preclassify_fix_as_surgical` · `feedback_signal_ruling_scope` · `feedback_limit_primitives_not_godify` · `feedback_dont_soft_classify_bugs` · `feedback_sweep_all_mentions_newest_first`.

## Tags
#session-184 #profile-a-full-start #open #caught-up #awaiting-direction
