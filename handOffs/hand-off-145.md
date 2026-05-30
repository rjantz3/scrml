# scrmlTS — Session 141 (CLOSE)

**Date:** 2026-05-29
**Previous:** `handOffs/hand-off-144.md` (S140 CLOSE — Bug-51-class audit + 4-HIGH fix wave + v0.6.7 cut).
**Next-session pickup:** rotate THIS file → `handOffs/hand-off-145.md` at S142 OPEN.

**S141 in one line:** opened clean on v0.6.7 → ran gauntlet **R27** (Expense-Approval, 5 personas): the S140 fix-wave (Bug 57/58/59/61) HELD 5/5; R27 surfaced a fresh batch of the compile-clean-but-invalid-JS class → **v0.6.8** fixed C1/C2/C5/C3; the **emitted-JS parse-gate invariant was ratified (A+D), built, and cut as v0.6.9** — its first run caught ~16 pre-existing invalid-JS artifacts in `examples/` (C10 HIGH / C11 MED). Bug 46 resolved; 2 heads-up docs → historical; known-gaps Bug-61 currency-fixed at OPEN. Then under the `full wrap` directive: the **gate-found fix-wave PARTIAL** — drove the gate's invalid-JS surface (forced gate-on) **37→8** (agent STALLED at 8-remaining), landed the gate-OFF-safe codegen batch + cut **v0.6.10**; gate-flip + remaining 8 carry-forward. **Three cuts pushed (v0.6.8 / v0.6.9 / v0.6.10).**

**HEAD at CLOSE:** `36eca00a` (release v0.6.10). **HEAD at OPEN was** `feab1207` (v0.6.7).
**Tags pushed this session:** `v0.6.8` (`a4f79b2d`, R27 fix-wave C1/C2/C3/C5) + `v0.6.9` (`130f347f`, emitted-JS parse-gate) + `v0.6.10` (`36eca00a`, gate-found codegen fixes PARTIAL).
**HEAD scrml-support:** `2ec6480` (pushed — gauntlet-r27 BRIEF/5-devs/OVERSEER-REPORT/report + deep-dive doc + user-voice S141). **NOTE: r24/r25 gauntlet files STILL untracked** (carry-forward decision).
**pkg.json:** 0.6.10.

**Tests at CLOSE:** full suite **22,129 pass / 0 fail / 219 skip** (~832 files; pre-push full-suite gate green at ALL THREE cuts).

**S99 path-discipline counter:** 20 (HELD — 2 worktree dispatches [fix-wave `ad9c089e` + gate `a477e98f`], zero leaks; dev-4 svelte crash was API-socket, not path-discipline).
**Worktrees at CLOSE:** main only (cleaned fix-wave + gate worktrees + stale `ab53994a` leftover).
**Inbox:** empty. **Outbox:** no due notices sent (S140 dogfood stands; v0.6.8/v0.6.9 not separately notified — default-OFF gate + internal bug-fixes; surface in next coordination if giti/6nz hit C1/C2/C5 shapes).
**PA auto-memory:** 43 rule files.

**Both repos 0/0 with origin at CLOSE.**

---

## S141 CONTINUATION — `full wrap the gate-found fix-wave` (user directive, post-CLOSE)

User invoked `full wrap [arc]` to push on warm-context through the gate-found fix-wave, then wrap at ITS arc-end. **ARC = close the ~16 gate-found invalid-JS artifacts (C10 compound-`if=(is some && != "")` truncation HIGH + C11 `server{`-leak MED + ~4 others) → flip `validateEmit` default-ON + wire `--validate-emit` CLI → cut (v0.6.10 candidate) → wrap.**

**OUTCOME — PARTIAL (agent STALLED at 8-remaining; LANDED + cut v0.6.10).** Agent `ab2914bfb23c81da7` found the brief's premise stale (C10/C11 trucking-dispatch already closed by v0.6.7-9; `examples/` had only 4, all fixed) and that the REAL gate-default-ON surface was **~37 invalid-JS fixtures across many codegen subsystems**. It drove gate-on failures **37→8** via 7 codegen fixes, then **stalled** (watchdog, 600s no-progress) mid-fixing an in-flight guarded-expr `emit-logic.ts` change that regressed 3 `emit-logic-s19` tests.

**LANDED (user "land + cut + wrap"):** file-delta'd the committed batch (15 files, branch tip `33d163d8`; the in-flight regression DISCARDED) → commit `bf63e096` → PA-verified gate-OFF-safe (emit-logic-s19 152/0, self-host parity 142/0, full suite 22,129/0) → **cut v0.6.10** (`36eca00a`, pkg.json 0.6.9→0.6.10, tag pushed). Gate STAYS flag-gated (`validateEmit` default OFF — NOT flipped; 8 gate-on failures remain). Worktree cleaned.

**CARRY-FORWARD S142 (the gate-found fix-wave's remaining 8 + flip):** `!{}` inline-catch (§19.4.3) + R25-Bug-49 nested `!{}` · each-block `as name` index alias · match-arm-block named-binding (Bug 6.5.1) · `<onTransition>` structural-element filter/HTML · self-host meta-checker + module-resolver (2) · the test-context fix the agent died on (3 `emit-logic-s19` tests expect `return` without `insideFunctionBody` — they should pass the flag). Close these → **flip `validateEmit` default-ON** + wire `--validate-emit`/`--no-validate-emit` CLI in cli.js + update SPEC §2.2.1. Fresh dispatch (the partial is already in main; start from current HEAD).

**BUDGET note:** session was very heavy (R27 + 3 cuts + 2 wraps + 4 agent arcs). The gate-found fix-wave correctly grew ~2-3× beyond estimate (it's "fix the compiler's whole invalid-JS surface so the gate flips on"); 8-remaining is the right next-session arc.

---

## Session-start checklist (S141 OPEN)

- [x] Read `pa.md` pointer → `scrml-support/pa-scrmlTS.md` IN FULL (1051 lines; S136/S138/S139 addendums in force)
- [x] Read `docs/PA-SCRML-PRIMER.md` §1–§13.6 substantively (1097/1425 lines; §13.7 AST-contract appendix + §14/§15 skimmed — compiler-internal contracts, prior-PA pattern)
- [x] Read `compiler/SPEC-INDEX.md` IN FULL (381 lines)
- [x] Read `master-list.md` §0 (live dashboard) — §0.1 phase table + §0.4/§0.5/§0.6 S138/S139/S140 CLOSE entries + carry-forward
- [x] Read previous `hand-off.md` (S140 CLOSE) IN FULL
- [x] Read user-voice S128–S137 contentful entries (S138/S139 NOT logged to user-voice — see open item; last logged = S137)
- [x] Sync check: scrmlTS 0/0 with origin · scrml-support 0/0 with origin (untracked r24/r25 gauntlet files in scrml-support — see open item)
- [x] Hooks: configuration B (local-rich — pre-commit + post-commit + pre-push all present at `.git/hooks`)
- [x] Inbox check: empty
- [x] Worktree check: main only
- [x] Rotated `hand-off.md` → `handOffs/hand-off-144.md`
- [x] Created fresh `hand-off.md` (this file)
- [x] Incremental map refresh — DONE (user-authorized). project-mapper agent `ad6fc8c8` refreshed structure / dependencies / error / primary maps; watermark `1fed5588` → `feab1207`; no non-compliance delta. (Minor: primary.map "health fact" says HIGH=0; known-gaps §0 is authority at HIGH=1 with Bug 54 deferred — nav-doc cosmetic, left as-is.)

---

## DONE this session (S141)

- **known-gaps.md Bug 61 currency fix** (user-authorized housekeeping) — §0 HIGH 2→1; Bug 61 detail entry flipped `OPEN`→`RESOLVED S140 (commit 0acb0d16)`; Bug 58 cross-note updated; S141 fix-note added to §0. **UNCOMMITTED** — needs commit auth (see open questions).
- **Maps incremental refresh** (user-authorized) — 4 maps updated, watermark → `feab1207`. **UNCOMMITTED** — `.claude/maps/{structure,dependencies,error,primary}.map.md` modified in working tree.

---

## IN FLIGHT (S141) — R27 gauntlet DISPATCHED (5 devs, background, non-isolated, Opus)

**Task:** Expense Approval Workflow (15 features + bonuses). **Purpose:** validate the S140 fix-wave (Bug 57 each / 58 formFor-validity / 59 tableFor-checkbox / 61 submit-gate) against fresh adopter source + first-ever adopter exercise of the `(A to B)` lifecycle annotation (zero prior samples). **Personas:** React/Go/Elixir/Svelte/Pascal.

**BRIEF:** `scrml-support/docs/gauntlets/gauntlet-r27/BRIEF.md` (written this session; UNCOMMITTED — scrml-support untracked dir).

**Dispatch shape:** S136 dev-returns-content — devs iterate against `/tmp`, return final scrml wrapped in `===SCRML-START===`/`===SCRML-END===` markers (likely HTML-entity-encoded; decode via `html.unescape`); PA writes canonical files. Devs are NOT isolation:worktree (no project-tree writes) → S88/S90/S99 worktree rules N/A.

| Dev | Persona | Agent ID | Canonical target |
|---|---|---|---|
| dev-1 | React | `a8538a2bb777f1823` | `gauntlet-r27/dev-1-react.scrml` |
| dev-2 | Go | `a2df3cac8e34ff7e7` | `gauntlet-r27/dev-2-go.scrml` |
| dev-3 | Elixir | `a4f10e6986b761687` | `gauntlet-r27/dev-3-elixir.scrml` |
| dev-4 | Svelte | `a6bf4180852beb50a` → **CRASHED (API socket close, ~7min/40 tool-uses); re-run HELD** | `gauntlet-r27/dev-4-svelte.scrml` |
| dev-5 | Pascal | `ae8e5420b1a99fac8` | `gauntlet-r27/dev-5-pascal.scrml` |

**PA-side steps on each dev completion:** (1) extract markered content from result; (2) `html.unescape` decode + strip any ``` ```scrml ``` fence; (3) write canonical `gauntlet-r27/dev-N-persona.scrml`; (4) once all 5 written → dispatch `gauntlet-overseer` to independently recompile + classify (compiler-bug vs dev-error) per dev; (5) PA triage of bug candidates → known-gaps; per pa.md S138 R26 doctrine, any HIGH codegen-bug close needs empirical R26 re-compile. (6) write `gauntlet-r27-report.md`. ~16 min wall-clock expected (R25 precedent).

**Dev landing status (S141): ALL 5 LANDED.** dev-1 react · dev-2 go · dev-3 elixir · dev-4 svelte (re-run `aa8c180f` clean; original crashed) · dev-5 pascal. Canonical files at `gauntlet-r27/dev-{1,2,3,4,5}-*.scrml`. dev-4 re-run confirmed all convergent findings + added C6.

**OVERSEER DISPATCHED** (`gauntlet-overseer`, agent `a5b46b050ff1d4c2f`, background, non-isolated) — independent recompile of all 5 + per-dev scorecard + classify every candidate (compiler-bug / dev-error / brief-error / known-deferred / not-reproduced) + confirm S140-held. Writes `gauntlet-r27/OVERSEER-REPORT.md`. Given my PA-confirmed C1/C2/C3/C5 + the SPEC §14.12 C4 finding, the overseer is the final ground-truth gate before triage/filing.

**C4 SPEC §14.12 cross-check (Rule 4) — DONE:** §14.12.1 (SPEC line 7937) gives the exact `user.passwordHash` struct-field example + states "Reads before the transition fire E-TYPE-001 (per Landing 1)"; §14.12.3 (line 7974) normatively claims "For struct fields, transition fires on `instance.field = value`." **NO SPEC-ahead/deferral caveat for struct-field enforcement** — stated as current behavior. Function-return form (§14.12.6 hybrid, S131) is what the devs confirmed WORKS. The Shape-1 cell + Shape-1-struct-typed-field trackers landed S134 (known-gaps Bug 19 RESOLVED). The gap: struct-field-read-off-a-struct-VALUE (`const u: User = {...}; u.field`) — the §14.12.1 flagship shape — does NOT enforce. → **C4 = COMPILER-BUG (spec-vs-impl gap, flagship feature, HIGH)**; pending overseer confirm + a PA re-verify of the exact §14.12.1 example. NOT soft-classify as doc-gap (pa.md `feedback_dont_soft_classify_bugs`).

**C6 status:** dev-4-reported (formFor synth cell E-SCOPE-001 inside engine state-child; clean at top-level). My quick repro hit an unrelated E-CTX-001 closer-mismatch (malformed engine block) — overseer re-verifying via dev-4's probe `/tmp/dev-4b-ff-probe3.scrml` + a clean minimal.

## R27 FINDINGS LEDGER (4/5 devs in; STRONG convergence) — provisional, pre-overseer

**ROUND PURPOSE ACHIEVED: all four S140 fixes HELD across 4/4 completed devs** (verified by emitted-JS grep, not just compile-exit): Bug 57 `<each>` reconcile (`_scrml_reconcile_list` defined+called), Bug 58 formFor validity surface (validators + per-field errors + rollup emitted), Bug 59 tableFor per-row checkbox (`evt` bound, not free-var), Bug 61 submit-gate (`@form.isValid` routes to dotted derived cell inside `_scrml_effect` → button enables when valid). Bug 60 (nested-compound render-by-tag) BROKE-as-expected (deferred); Bug 54 (`:let`) mostly not-exercised.

**NEW candidate bugs — 4 PA-CONFIRMED (invalid-JS-at-exit-0; the SAME S140 silent-miscompile class, caught only by `node --check`):**

| # | Symptom | Devs | PA-verify | Repro |
|---|---|---|---|---|
| C1 | two-bound `length(>=N,<=M)` in formFor/struct-field validator → emits `{op:">=",value:2 , <= 120}` (malformed obj literal) | 1,2,3,5 (4/4) | ✅ CONFIRMED node--check fails | `/tmp/pa-r27-len2.scrml` (formFor locus; standalone Shape-2 cell does NOT repro) |
| C2 | `->`-arm value-return `match` → `/* match expression could not be compiled */ ...;)` stub | 1,2,3 (3/3) | ✅ CONFIRMED node--check fails | `/tmp/pa-r27-match.scrml` (`=>` arms work; PRIMER §6.2 documents `->`) |
| C3 | bare `int` struct field → `asIs` opaque to schemaFor/tableFor (`E-SCHEMAFOR-NO-SQL-MAPPING`) | 1,2,3,5 (4/4) | ✅ CONFIRMED (`integer` control clean) | `/tmp/pa-r27-int.scrml`; **root-cause (dev-2): `BUILTIN_TYPES` type-system.ts:623 missing `int`→`integer` alias** (mirrors existing `bool`→`boolean`); 1-line fix |
| C5 | `;` inside a string literal in an `!{}` arm body → splitter breaks the string → invalid JS | 5 (1/1) | ✅ CONFIRMED node--check fails | `/tmp/pa-r27-semi.scrml`; arm-body stmt-splitter not string-literal-aware |
| C4 | `(not to T)` / `(A to B)` lifecycle E-TYPE-001 **does NOT fire on struct-field reads** (function-RETURN form DOES enforce per dev-2) | 1,2,3,5 (4/4) | ⏳ NEEDS SPEC §14.12 cross-check | `/tmp/probe-lc*.scrml` (dev probes); THE FLAGSHIP target — classification pending: impl-pending (§14.12.10 SPEC-ahead?) vs regression vs doc-overpromise. PRIMER §6.5 permitted-positions table says struct-field = YES. |

**Secondary findings (lower confidence / known / ergonomic — triage at overseer time):**
- **errorBoundary canon-vs-SPEC drift** (R24 step-3b signal): SPEC §19.6 `fallback={<markup/>}` COMPILES (dev-1/2/3); PRIMER/kickstarter `renders=.Fallback`+sibling-body does NOT (dev-2: W-ATTR-001+E-ATTR-001). dev-1: §19.6 form compiles but emits ZERO runtime catch wiring (runtime-inert?). Feeds the deferred direction-call.
- **`<each in=@map[.Variant]>` / `rows=@map[.Variant]` bracket-subscript-with-variant mis-lowers** (dev-1 Item 2) → `_scrml_reactive_get("map")[.Submitted]` invalid. **NB: the R27 BRIEF (feature 7) prescribed `@reportsByStatus[.Submitted]`** — so this is partly a brief-prescribed shape; OPEN whether `coll[.Variant]` is valid scrml (if not → brief error + dot-access `@map.Submitted` is canon; if yes → compiler bug). Determine at triage.
- **`null` emitted for markup-typed compound child defaults** (dev-2 Item 5): `_scrml_reactive_set("reviewForm.comment", null)` — violates §42.1 no-null invariant at emit layer; tied to Bug 60.
- **`<schema>`/schemaFor does not feed protect-analyzer CREATE-TABLE introspection** → E-PA-002 unless .db exists (dev-3 Item 4).
- **Canon drift:** kickstarter leading-space `< db>`/`< schema>` trips W-WHITESPACE-001 (dev-3); `server function` lints `W-DEPRECATED-SERVER-MODIFIER` though ALL canon + the brief teach it (dev-5 Item 7) — reconcile canon-vs-compiler.
- **E-DG-002 false-positive** on state read only inside a `.filter()` arrow in a derived cell (dev-1 Item 7) — runtime subscribes correctly; lint under-counts arrow-body reads.
- **tableFor internal codegen trips W-EACH-PROMOTABLE** on adopter cell names (dev-3 Item 7) — suppress on compiler-synth iteration sites.
- **`given` rejects property paths** (E-SYNTAX-044) — must bind-to-local first; lifecycle docs lean on `given` for the exact struct-field case (dev-1/3/5). May be intended; PRIMER §6.5 lacks the struct-field worked example.

**THE THROUGH-LINE (all 5 devs' #1 recommendation, unprompted + convergent):** the S140 happy-dom tier proved the 4 fixed bugs HELD, but R27 surfaced 4+ MORE silent-miscompiles of the SAME class (compile exit-0, emit invalid JS) on **canon-documented shapes**. Every dev's single highest-leverage ask: **make `node --check`-validity a compile-time INVARIANT — the compiler must never exit 0 on JS it would not itself parse.** This is a profound, actionable, convergent design finding — bigger than any individual bug.

## R27 FINAL VERDICT (overseer `a5b46b050ff1d4c2f` confirmed — `gauntlet-r27/OVERSEER-REPORT.md`)

**S140 fix-wave HELD end-to-end (independent emitted-JS grep on dev-1+dev-4): Bug 57/58/59/61 all confirmed. Round purpose ✅.** Bug 60 still broken (deferred-confirmed); Bug 54 not exercised hard.

**Compile/node-check (overseer's own):** dev-1/2/4/5 exit-0; **dev-3 exit-1** (E-PA-002 missing physical `./expenses.db` — only dev using `<db src=>`; environmental DEV-ERROR, NOT a miscompile; overrode dev-3 self-reported PASS). 5/5 emit node-check-clean JS. **Scorecard:** dev-2 (Go) 97 · dev-4 (Svelte) 96 · dev-1 (React) 95 · dev-5 (Pascal) 91 · dev-3 (Elixir) 89.

**CONFIRMED COMPILER BUGS (overseer-verified; to file in known-gaps):**

| ID | Bug | Sev | Root cause / note |
|---|---|---|---|
| C1 | two-bound `length(>=N,<=M)` → malformed obj literal `{op:">=",value:2 , <= 120}`, invalid JS at exit-0 | **HIGH** | validator-emit; the form PRIMER §8 + brief teach |
| C2 | `->`-arm value-return `match` → `/* match expression could not be compiled */ …;)` invalid JS at exit-0 | **HIGH** | only `=>` works; PRIMER §6.2 documents `->` |
| C5 | `;` inside a string in `!{}` arm → statement-splitter breaks the string, invalid JS at exit-0 | **HIGH** | arm-body splitter not string-literal-aware |
| C3 | bare `int` struct field → `asIs`, `E-SCHEMAFOR-NO-SQL-MAPPING` | MED | `BUILTIN_TYPES` type-system.ts:623 missing `int`→`integer` alias (1-line; mirrors `bool`→`boolean`) |
| C4 | lifecycle E-TYPE-001 **dormant on object-literal-constructed struct values** (`const u: User = {…}`) — the PRIMER §6.5 verbatim shape; fn-return + `<User …>` state-instantiation DO fire | MED | `collectStructBindings` type-system.ts:14008 no object-literal path; spec-vs-impl, NO deferral caveat (§14.12.1/.3 normative) |
| C7 | errorBoundary `fallback={<markup/>}` (SPEC §19.6) compiles but emits an inert anchor — ZERO runtime catch wiring | MED | runtime-dead; feeds R24 step-3b errorBoundary direction-call |
| C6 | `bind:value=@<synth>.<field>` → E-SCOPE-001 ONLY when formFor nested in an engine state-child (works top-level; `isValid` read works both) | MED | synth-cell scope registration doesn't propagate into engine-state-child |
| C8 | `@map[.Variant]` subscript → silent invalid JS `[.Submitted]` (no diagnostic) | LOW | missing-diagnostic (the form itself is non-canonical — brief-error below) |
| C9 | E-DG-002 false-positive: state read only inside a derived `.filter()` arrow flagged "never consumed" | LOW | DG consumption-tracker under-counts arrow-body reads |

**NON-COMPILER:** BRIEF-ERROR (mine, MED) — feature-7 prescribed `@reportsByStatus[.Submitted]` (non-canonical; §14.10 → dot-access `@map.Submitted`); CANON-vs-IMPL DRIFT (lints CORRECT, canon needs migration) — `server function` W-DEPRECATED, `< db>` whitespace W-WHITESPACE-001, errorBoundary `renders=.Fallback` doesn't compile (SPEC `fallback={}` survives → migrate canon); DEV-ERROR — `given` property-path, inline-markup compound; NOT-REPRODUCED — tableFor W-EACH-PROMOTABLE.

**STRATEGIC FINDING (all 5 devs, unprompted #1 ask):** make `node --check`-validity a compile-time INVARIANT — an emitted-JS parse gate that fails the build instead of emitting invalid JS at exit-0. Closes the C1/C2/C5/C8 CLASS structurally + all future instances. Likely warrants a deep-dive (insertion point, per-compile perf, diagnostic surface).

## R27 POST-DECISION EXECUTION (S141) — user chose: fix-wave = 3 HIGH + C3; node-check gate = deep-dive-first

**DISPATCHED (both background):**
- **Fix-wave C1+C2+C3+C5** — `scrml-js-codegen-engineer`, isolation:worktree, agent `ad9c089eec0b7e248`, change-id `r27-fix-wave-c1-c2-c3-c5-2026-05-29`. BRIEF.md archived (S136) at `docs/changes/r27-fix-wave-c1-c2-c3-c5-2026-05-29/BRIEF.md`. Mandates: F4/S90/S99/S126 path discipline, per-bug incremental commits (order C3→C1→C2→C5), no `--no-verify`, S138 R26 Phase-3 empirical re-verify (re-compile all 5 dev sources + 4 minimal repros, node-check clean), regression test per bug, C2-glyph PA-decision with SPEC quote.
- **node-check-invariant deep-dive — ✅ DONE** (`a549acb078d3133a7`). Report `scrml-support/docs/deep-dives/emitted-js-parse-gate-invariant-2026-05-29.md` (`status: current`). **Verdict: gate=YES (settled).** Findings: in-process Acorn (already a dep) catches all 4 R27 invalid-JS shapes with byte offsets; subprocess `node --check` ~2.2s on trucking-dispatch corpus → **breaches SPEC §2.4 4000L<1s budget alone** (eliminates Approach C); in-tree precedent `meta-eval.ts:350 reparseEmitted()` (E-META-EVAL-002) — extend that pattern to final artifacts; no mainstream compile-to-JS toolchain re-parses output (tsc/Svelte ship invalid-JS bugs as a result); HONEST BOUNDARY — catches invalid-JS sub-class ONLY (NOT C4 lifecycle / C7 errorBoundary — both emit valid JS). **Two open axes:** A always-on vs B dev/CI-only · A byte-parse-backstop vs D codegen-side-hard-`E-CG-*` (D surfaced in dev signal: dev-2/4 want codegen hard error, dev-5 wants byte-parse). Deep-dive lean: **A+D together**. **RATIFIED S141 (user "Ratify A+D, queue build"):** build the in-process Acorn byte-parse backstop (extend `meta-eval.ts:350 reparseEmitted` pattern → final artifacts; `E-CODEGEN-INVALID-JS`-class) + codegen-side hard `E-CG-*` at lowering sites; always-on-vs-dev/CI resolved EMPIRICALLY in the impl dispatch (measure §2.4 4000L budget; always-on if `<1s` fits, dev/CI-only fallback if breach); NO debate. Recorded: deep-dive doc RATIFIED banner + user-voice S141. **BUILD QUEUED — dispatch after the fix-wave lands** (so the D-part references the fixed C1/C2/C5 lowering sites). Gate-build brief sketch: scrml-js-codegen-engineer / isolation:worktree / Phase-3 = §2.4 perf measurement → always-on-or-fallback decision + regression tests that feed known-bad emit (the 4 R27 repros) and assert the gate fires.

**FILED (PA-direct, uncommitted):** known-gaps §R27 cluster section + §0 counts (HIGH 1→4, MED 7→10, LOW 12→14). **C3 = Bug 45 dedup** (already filed S136 R25 — re-confirmed + root-caused + in-wave; do NOT double-file). **Bug 46 close-candidate** noted (tableFor sortable/selectable now wired per R27 + S140 Bug-59).

**FIX-WAVE LANDED (S141) — `55666c5b` (agent branch `worktree-agent-ad9c089eec0b7e248`, 5 commits: C3 `8819be5e` / C1 `1193d64d` / C2 `0eef465c` / C5 `a167e9f6` / R26 `55666c5b`).** Leak-check CLEAN (no compiler-src leak in main). File-delta'd the 13 files into main (STAGED, +499/−25, NOT yet committed — needs auth). **PA-independent R26 re-verify on main: 4 repros + dev-1 + dev-4 all compile exit-0 + node-check CLEAN; 5 touched test files 154 pass / 0 fail.** Agent process note: slipped `--no-verify` on the final progress commit, self-caught + soft-reset + recommitted clean (all 5 passed the hook) — banked as self-corrected (S137 precedent). C2 glyph decision = option (a), `->` lowered like `=>` per SPEC §18.2 alias (PRIMER §6.2 needs no doc-fix). C1 root broader than briefed (formFor + Shape-2 SYM paths). **known-gaps FLIPPED:** §R27 C1/C2/C5/C3 → RESOLVED; §0 HIGH 4→1, MED 10, LOW 14→13 (Bug 45=C3 resolved). **`gauntlet-r27-report.md` WRITTEN** (`scrml-support/docs/gauntlets/`).

## PA-DIRECT HYGIENE (S141, while gate-build runs — all UNCOMMITTED, bundle w/ gate landing)

- **Bug 46 RESOLVED-VERIFIED** — tableFor `sortable=`/`selectable=` PA compile-verified (wiring emits, no W-ATTR-001; R25 "not implemented" stale). known-gaps LOW 13→12; entry flipped.
- **2 heads-up docs → `historical`** — `iteration-design-2026-05-25.md` + `lifecycle-annotation-extension-2026-05-25.md` carried stale `status: in-progress`/`findings-closed: 0` since S130 though features shipped; flipped + arc-complete notes (lifecycle note flags the R27 C4 impl-gap). Carry-forward CLEARED.
- **CHANGELOG** — baseline → S141/v0.6.8/22,108; new S141 entry (R27 + fix-wave + gate-ratified + Bug 46).
- **known-gaps §0 now:** HIGH 1 · MED 10 · LOW 12 · Nominal 7.
- NOT done (deferred — need decisions/budget): design-insights gate-ratification append (recorded in 4 other places already); C9 DG-tracker triage; r24/r25 untracked commit (needs nod); canon-vs-impl drift migration (`server function`/`< db>`/errorBoundary — design-laden, surface at wrap).

## v0.6.8 CUT + PUSHED (S141) — release DONE

- scrmlTS: `feab1207 → 2f29cb90 (fix-wave C1/C2/C3/C5) → a4f79b2d (release v0.6.8)`; **tag `v0.6.8` pushed**. pkg.json 0.6.7→0.6.8. Pre-push gate: full suite **22,108 pass / 0 fail / 219 skip**, TodoMVC PASS, README scrml gate clean (2 pass / 3 skip).
- scrml-support: `a7dd961 → 2ec6480` pushed (gauntlet-r27 BRIEF/5-devs/OVERSEER-REPORT/report + deep-dive doc + user-voice S141). **r24/r25 dev sources/reports STILL UNTRACKED** (pre-existing; left for a separate commit decision — they're bug-provenance, should eventually be tracked).
- Worktrees: CLEAN (main only). Removed fix-wave `agent-ad9c089e` (landed) + dangling `worktree-agent-ab53994a` (= merged S140 bug-61 leftover `0a02e0d7`).
- Both repos 0/0 with origin after push.

**WARM-CONTEXT ARC (S141, ~61% used, ~180k budget) = GATE-BUILD (ratified A+D), DISPATCHED.** Agent `a477e98f2eba7effa` (scrml-js-codegen-engineer, isolation:worktree, baseline a4f79b2d). BRIEF.md archived (S136) at `docs/changes/gate-emitted-js-parse-invariant-2026-05-29/BRIEF.md`. Builds: A (in-process Acorn backstop over final artifacts → `E-CODEGEN-INVALID-JS`, extends `meta-eval.ts:350 reparseEmitted`) + D (codegen-side hard `E-CG-*` at silent-stub lowering sites) + §2.4 perf measurement → always-on-vs-dev/CI empirical decision + SPEC §34 row + normative note. CRITICAL acceptance gate: full `bun run test` ZERO new false-positives vs 22,108 baseline. **GATE-BUILD LANDED (S141) — commit `75076567` (gate-branch `worktree-agent-a477e98f2eba7effa` `3c9a7ed1`).** A: `validate-emit.ts` (NEW) in-process Acorn backstop → `E-CODEGEN-INVALID-JS`, wired in api.js as `validateEmit` option (DEFAULT OFF). D: emit-control-flow.ts no-arm match stub → hard `E-CG-003`; emit-expr.ts forwards ctx.errors. SPEC §2.2.1 + §34. +13 tests (suite 22,108→22,121/0; ZERO false positives). PA-verified: 78 gate tests pass; default-OFF dormant (R27 repros exit-0). Leak-check clean; file-delta'd 9 files.

**⚠️ THE GATE'S FIRST-RUN FINDING (major) — ~16 PRE-EXISTING invalid-JS artifacts in `examples/`, suite-green today.** Perf admits always-on (~24ms/8433-line ref), but flipping ON now would break the suite on these TRUE positives, so it shipped FLAG-GATED (Rule-3). Filed known-gaps §GATE-FOUND: **C10 (HIGH)** compound-predicate `if=(X is some && X != "")` lowering truncates `!= ""` → dangling `!==` invalid JS (dominant cluster; ~12 in trucking-dispatch; hits any adopter using that `if=` shape — it's the codegen lowering, not just examples). **C11 (MED)** leaked `server {` in seeds.server.js. **Prerequisite to gate-always-on = a fix-wave closing these 16.** known-gaps §0 now: HIGH **2** (Bug 54 + C10) · MED **11** (+C11) · LOW 12 · Nominal 7.

**COMMIT STATE:** commit 1 (gate-build) = `75076567` LANDED (local). Commit 2 (housekeeping: changelog + known-gaps + 2 heads-up + hand-off) pending. **NOT pushed; NO v0.6.9 cut yet** — the "commit/cut/push" auth was scoped to v0.6.8/R27; the gate-build cut+push needs fresh nod (auth-per-push, S134). Worktree `agent-a477e98f` NOT yet cleaned (clean after the push decision).

**OPEN DECISION (surfaced to user):** (1) cut v0.6.9 + push the gate-build + housekeeping? (gate is default-OFF = no adopter-behavior change beyond the E-CG-003 no-arm-match edge; v0.6.9 marks the parse-gate-infra milestone — or fold). (2) The 16-artifact fix-wave (C10/C11 + close → flip gate always-on) — next-session carry-forward (likely beyond this warm window) or push on now? (3) Wrap soon (warm budget ~partly spent). Remaining carry-forward after the arc: C4/C6/C7 MED + C8/C9 LOW (if not the arc) · Bug 46 close-candidate · errorBoundary direction-call (R24 step-3b) · r24/r25 untracked-artifacts commit · canon-vs-impl drift migration (server-function/`< db>`/errorBoundary-shape).

**(superseded — release done):** (1) COMMIT-AUTH + commit — scrmlTS [fix-wave 13 files (staged) + housekeeping: known-gaps, 4 maps, hand-off+144, BRIEF/change-dir] and scrml-support [gauntlet-r27 BRIEF/5-devs/OVERSEER-REPORT/report + deep-dive doc + user-voice S141]; (2) optional v0.6.8 cut (3 HIGH + MED fixes — S136 patch cadence; bump 0.6.7→0.6.8 + tag); (3) push (separate auth); (4) gate-build dispatch (queued, ratified A+D); (5) worktree cleanup (`agent-ad9c089eec0b7e248`); (6) remaining R27 OPEN — C4/C6/C7 MED, C8/C9 LOW + Bug 46 close-candidate — next-wave or carry-forward.

**COMMIT-PENDING (needs auth):** known-gaps (Bug 61 fix + R27 cluster) · 4 maps · hand-off + hand-off-144 · BRIEF.md/change-dir · (on landing) the fix-wave file-delta + gauntlet-r27 dev sources/OVERSEER-REPORT/report (scrml-support). NO commit yet this session. Natural bundle point: after the fix-wave lands.

**REMAINING after fix-wave + deep-dive land:** (1) land + verify fix-wave → flip known-gaps → cleanup worktree; (2) read deep-dive → surface node-check-gate recommendation/debate to user; (3) write `gauntlet-r27-report.md`; (4) commit-auth + commit (scrmlTS + scrml-support gauntlet artifacts); (5) decide remaining R27 OPEN bugs (C4/C6/C7 MED, C8/C9 LOW) — next-wave or carry-forward; (6) Bug 46 re-check/close.

**If a dev crashes (R25 had 0 infra failures; R24 had 3/4 write-permission — but S136 shape closed that):** the dev returns content in its result message; salvage from the (partial) result if it crashed mid-iterate. Re-dispatch the single dev if no usable content.

**dev-4 crash (S141) — API socket close after ~7min/40 tool-uses (2nd API crash in 2 sessions; backend-instability signal — Bug-61 v1 was the 1st).** Salvage state: `/tmp/dev-4-svelte-iter4.scrml` (147 lines, COMPILES — dist at `/tmp/dev-4-dist/dev-4-svelte-iter4.{client,server}.js`). iter4 is PARTIAL: ✅ flagship `(A to B)` lifecycle on struct field + `(not to timestamp)` (compiles!); ✅ formFor `for=`+`pick=["str"]`+slots+`disabled=!@newExpense.isValid` gate; ✅ tableFor `selectable=`+`sortable`; ✅ schemaFor (with `omit:`); ✅ engine+`<onTimeout>`; ✅ word-form `or`/`and`; ✅ auth gating; ✅ validators in struct. MISSING: `<each>` (Bug-57 target!), render-by-tag compound (Bug-60), `<errorBoundary>`, `!{}` call-site handlers, friction report. **DECISION: HOLD re-dispatch until the other 4 land** (avoid piling concurrent load during the API-unstable window — protect the in-flight 4's sockets), THEN re-dispatch dev-4 SOLO, fresh (don't point at iter4 — clean adopter signal). iter4 is the fallback if the re-run also crashes. Pa.md S140 precedent: revert+re-dispatch beats extended salvage when a crash leaves partial state.

---

## DISCREPANCY FOUND AT OPEN — known-gaps.md §0 stale on Bug 61 (doc-currency, NOT a compiler bug)

**Bug 61 was RESOLVED at the v0.6.7 cut but known-gaps.md never got updated.**

- Git confirms: `0acb0d16 fix(s140 bug-61): @compound.<synthProp> rollup reads collapse to the dotted synth cell (formFor submit-gate now functional)`.
- Release commit `18de30ba` message: "Bug-51-class corpus audit + 4-HIGH fix wave (Bug 57/58/59/61); formFor functional end-to-end".
- master-list §0 S140 CLOSE entry (line 301): Bug 61 RESOLVED `0acb0d16`; "formFor now functional end-to-end."
- **BUT** `docs/known-gaps.md`:
  - §0 at-a-glance (line 17): **HIGH | 2** — lists "OPEN HIGH: Bug 54 ... · Bug 61 ... NEW S140, ... formFor not functional end-to-end until fixed."
  - Bug 61 detail entry (line 28): tagged `NEW S140; HIGH; OPEN`; "Disposition — OPEN, not yet dispatched."
  - Bug 58 entry (line 48): "NB read-path sibling Bug 61 still OPEN."

**Actual current HIGH count = 1 (Bug 54 only, DEFERRED).** known-gaps §0 says 2. The Bug 61 RESOLVED note never propagated to known-gaps at the cut — same doc-currency drift class the user flagged at S130 ("known-gaps.md is not a complete and accurate reference") + the S115 doc-currency convention (same-landing discipline). The hand-off-144 "State as of CLOSE" table also carried the imprecise "HIGH bugs open: 2 (Bug 54 · the remaining audited-but-deferred surface)" — the "remaining surface" was Bug 61, which actually landed.

**Proposed fix (small, ~10 min, needs user OK before editing the doc):** flip Bug 61 detail entry → `RESOLVED S140 (commit 0acb0d16)`; update §0 HIGH cell 2→1 (Bug 54 only OPEN); drop the "Bug 61 still OPEN" note on Bug 58; add Bug 61 to the resolved-this-session list. SURFACED TO USER.

---

## Open questions to surface

1. **COMMIT-PENDING (needs auth — no commit yet this session).** Uncommitted: scrmlTS `docs/known-gaps.md` (Bug 61 currency fix) + `.claude/maps/{structure,dependencies,error,primary}.map.md` (refresh). scrml-support `docs/gauntlets/gauntlet-r27/BRIEF.md` (new, untracked dir) + the pre-existing untracked r24/r25 gauntlet files. Natural commit point: after R27 lands (bundle the housekeeping + the R27 dev sources + report). OR commit housekeeping now if user prefers a clean separation. First commit of the session needs explicit user auth per pa.md.
2. ~~known-gaps Bug 61 fix~~ DONE (uncommitted). ~~Maps refresh~~ DONE (uncommitted).
3. **R27 in flight** — awaiting 5 dev completions; PA-side landing steps in the IN FLIGHT section above.
4. **(superseded by R27 choice) Next priority — carry-forward menu** (from S140 CLOSE; remaining after R27):
   - **R27 different-task gauntlet round** (per S136 R25 Path B) — now against a much cleaner baseline (formFor/each/tableFor all runtime-verified at v0.6.7). The Bug-51-class audit strengthened the case for an adopter-shaped R27 + a happy-dom test-tier mandate.
   - **Bug 54** (`tableFor :let` parse-layer; HIGH; DEFERRED) — fix-dispatch candidate.
   - **Bug 60** (render-by-tag nested-compound; MED; DEFERRED).
   - **3 add-runtime-test coverage-gaps** (schemaFor migrate-tier / engine-effect happy-dom / onTransition happy-dom) — close the test-blind-spot the audit identified.
   - **errorBoundary direction call** (R24 step-3b; substantive design HU; deferred S136–S140).
   - **2 non-compliant heads-up docs cleanup** (`iteration-design-2026-05-25.md` + `lifecycle-annotation-extension-2026-05-25.md` — stale `status: in-progress`; ~30 min).
   - **Native parser M2.4 + MK2** (S112 charter B; multi-quarter arc).
   - **Bug 9 L3 transitive coloring** (defer until adopter demand).
   - **`${@x/}` self-closing-slot interpolation emits dangling `/;`** (surfaced 2× S140; LOW; triage).
   - **gauntlet-s79-signup-form.scrml E-TYPE-025** (pre-existing; triage).
4. **user-voice S138 + S139 backfill** — last logged entry is S137; S138/S139 were bug marathons. Likely no new durable directives beyond what's already in pa.md addendums (S138 R26 doctrine, S139 `full wrap` — both already lifted to pa.md + user-voice S137 entry captures the ratifications). Confirm whether any backfill is warranted or close as no-op.

---

## Dangling from S140 (carried)

- **Master push of giti + 6nz** (cross-machine sync) — pending master-PA action on the S140 `needs: push` notice (sibling inbox writes + the 9-file 6NZ→6nz migration). NOT this PA's action; track only.
- **Caps `6NZ/` stray dir cleanup** — 9 migrated originals + structure; safe to remove eventually (verify the OTHER machine doesn't use the caps path first). Low priority.
- **Untracked gauntlet r24/r25 files in scrml-support** — `docs/gauntlets/gauntlet-r24-report.md` + `gauntlet-r24/dev-*.scrml` + `gauntlet-r25-*` are untracked (never committed; local-only). These are write-once historical gauntlet artifacts. Decide: commit them to scrml-support (they're the source-of-record for R24/R25 bug provenance) or leave untracked. Surface if R27 starts (consistency).

---

## pa.md directives in force entering S141

- **S136** — BRIEF.md archival per `isolation: "worktree"` dispatch (cross-machine).
- **S138** — R26 empirical-verification doctrine BIDIRECTIONAL (forward: verify before claim-CLOSED; reverse: verify before claim-OPEN/dispatch; cross-source sweep + sibling-fix-unmask sub-rules).
- **S139** — `full wrap [arc-name]` discriminator (stay warm through arc-end; 88% safety floor). In-session-only; NOT active until invoked.
- Standing: `--no-verify` prohibition (extends to pre-push); S126 Bash-edit + no-`cd`-into-main mitigation; S99 path-discipline counter (20); S88 explicit `isolation: "worktree"`; S90 CWD-routing gate.
- Rule 4: SPEC normative. Rule 5: shoot straight. Rule 3: right answer beats easy. S133: flag typos/word-misuse with 1-liner.

---

## State as of OPEN

| Item | Value |
|---|---|
| HEAD scrmlTS | `feab1207` (clean, 0/0 with origin) |
| v0.6.7 tag | `18de30ba` (pushed) |
| HEAD scrml-support | `dbb47c3` (untracked r24/r25 gauntlet files present) |
| pkg.json | 0.6.7 |
| Tests (carried, not re-run) | full 22,097 / 0 / 219 / 1 across 828 files · pre-commit 15,101/0/88/1 · browser 248/0 |
| Worktrees | main only |
| Inbox | empty |
| S99 path-discipline counter | 20 |
| PA auto-memory | 43 rule files |
| Maps | watermark `1fed5588`; HEAD 13 commits ahead (codegen-touching) — refresh candidate |
| HIGH bugs open (CORRECTED) | **1** — Bug 54 `tableFor :let` parse-layer (DEFERRED). [known-gaps.md §0 still says 2 — stale on Bug 61; see discrepancy block] |
| MED bugs open | 7 (incl. Bug 60 render-by-tag nested-compound DEFERRED) |
| LOW bugs open | 12 |
| Nominal (spec-ahead-of-impl) | 7 |

---

## Tags
#session-141 #OPEN #v0-6-7-shipped #known-gaps-bug61-stale #maps-refresh-candidate #r27-candidate
