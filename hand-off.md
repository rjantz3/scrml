# scrmlTS — Session 155 (CLOSE)

**Date:** 2026-06-02
**Previous:** `handOffs/hand-off-159.md` (= S154 CLOSE — full S154 detail lives there).
**Next-session pickup:** rotate THIS file → `handOffs/hand-off-160.md` at next OPEN.

---

## 🏁 S155 CLOSE — #14 event-payload-transition IMPLEMENTED (3/3 batches) + Profile-B thin-start validated

**Arc:** the #14 event-payload-transition primitive (Approach E, §51.0.S/§51.0.G.1, spec landed S154) is **fully implemented end-to-end** — parser → typer → codegen + runtime — across 3 dispatched-and-landed batches, each S67 file-delta'd + the codegen batch dual-R26-verified. Plus a scandir warm-up fix. Session run as the **first live Profile-B (thin-start) test** of the S154 sub-session proposal.

### Sync / repo state at CLOSE
- **scrmlTS:** clean, `origin/main` **0/0** (all PUSHED). Commits this session: `096951c4` (scandir) · `6e859b3e` (api.test worktree-false-fire fix) · `6667b664` (#14 batch-1 parser) · `c6f323f0` (#14 batch-2 typer) · `a9ce4c3a` (#14 batch-3 codegen+runtime) + this wrap commit.
- **scrml-support:** pulled to 0/0 at OPEN (other-machine S154 work); NO writes this session → no push needed.
- **Inbox:** scrml-site lift-list fyi processed → `incoming/read/` (filed as Bug 64). Outbox: none (scrml-site landing-notice HELD per user — repo not on this machine).
- **Tests at close:** full `bun run test` **22,672 pass / 0 fail / 220 skip / 1 todo / 878 files** (vs S154 22,582 — +90 = #14 batch tests: parser 18 + typer 39 + codegen 18 + browser 9 + misc). within-node allowlist rebumped ONCE (batch-1 acceptsType, MISSING-FIELD only).
- **known-gaps:** HIGH **0→1** (Bug 62, below), MED **12→14** (Bug 63 + Bug 64). All three are S155 #14-arc / adopter follow-ups — NONE is a #14 regression.
- **Version:** on top of v0.7.0 (pkg.json unchanged; no tag cut — feature impl, no release).
- **Worktrees:** all 3 #14 landing worktrees cleaned at wrap (agent-a74231d.../a0f3d80b.../ad41c7b2...). Main only.

### 🎯 #14 STATUS — PRIMITIVE COMPLETE; 2 orthogonal follow-ups gate full canonical usage
- **DONE (verified):** `accepts=MsgType` opener attr (parser+typer), `(state × message)` arm recognition (parser), `.advance` two-plane resolution §51.0.G.1 (typer), exhaustiveness + the 4 §34 codes (typer), message-dispatch codegen + runtime (`_scrml_engine_dispatch_message`, §51.0.S.3 machinery incl. the §51.0.R same-state onIdle-reset divergence), arm-target `rule=` validation. happy-dom 9/9 + agent R26 + **PA independent R26** all green on the §51.0.S.6 fixture.
- **Bug 62 (HIGH, NEW):** `.advance` inside an `<each>`-render event handler → E-CODEGEN-INVALID-JS (each-render path doesn't thread engine ctx; raw `@` sigil). PRE-EXISTING, affects state-plane `.advance` too. Blocks the LITERAL §51.0.S.6 each-nested drop-handlers (fixture works around with plain handlers). **Next: focused each-render-ctx engine-threading dispatch.**
- **Bug 63 (MED, NEW):** markup-attr `.advance(.X)` not bare-variant-type-checked (pre-existing general markup-attr gap; runtime works, static typo-check absent).
- These two close the "#14 fully usable at its canonical call site" picture — but are orthogonal pre-existing gaps, not #14 deficiencies.

### ★ PROFILE-B VERDICT (the experiment) — HELD; recommend RATIFY + write pa-core.md
- Ran the entire session thin: read pa.md + hand-off + user-voice S154 + git sync + the NAMED landed-spec sections only. SKIPPED full PRIMER / master-list §0 / rest of SPEC-INDEX. Start cost ≈ the proposal's target (~5-8% vs ~25%).
- **It held through all 3 dispatches + landings + a deliberate off-scope curve-ball.** Each batch needed a real PA-side context-sweep (locate fire sites, name the pattern-to-mirror) BEFORE the brief — which IS the proposal's "brief carries the context-sweep" condition, and it worked.
- **FINDINGS to bank for `pa-core.md`:**
  1. Profile B is safe for EXECUTION arcs where spec is landed + the brief carries the per-batch context-sweep (fire sites + pattern-to-mirror + maps currency).
  2. **Thin sessions should PARK off-scope design tangents on contact** (capture as DD-candidate + defer), not engage them at length. The build-story curve-ball was deferred correctly but engaged more verbosely than a scoped session ideally should — park faster/terser.
  3. The maps were genuinely load-bearing (resolved the legacy-BS+TAB vs native parser-path fork that the thin reads didn't carry) — every batch agent reported them load-bearing.
  4. Standing-autonomy grant (review→land→push→R26→wrap, surface only on failure) makes thin execution sessions run unattended — the user's "engage only if parallel-session info surfaces" model.
- **If ratified:** write `pa-core.md` (~100L: 5 Rules + dispatch checklist + wrap def + sync/push discipline) + amend pa.md with the Profile A/B split.

---

## (as-we-go detail below)

## S155 — PROFILE-B TEST SESSION (thin start, ratify-pending S154 proposal)

This session is the **first live test of the S154 sub-session / tiered-session-start
proposal** (user-voice S154). Opened **Profile B (thin)**: read pa.md (full) + hand-off (full)
+ user-voice S154 + git sync + the NAMED landed-spec sections — **SKIPPED** full PRIMER /
master-list §0 / rest of SPEC-INDEX. Cost so far ≈ the ~5-8% the proposal targets, vs ~25%
full. **If Profile B holds through this arc → RATIFY + write `pa-core.md` + amend pa.md with
the Profile A/B split.** User chose Profile B + work order "scandir fix, then #14/(d)-A."

### Sync / repo state
- **scrmlTS:** clean, `origin/main` **0/0**. HEAD `096951c4` (scandir fix, PUSHED).
- **scrml-support:** was 3 behind (other-machine S154 deep-dives/drafts/user-voice). Pulled
  `--rebase` → **0/0** clean.
- **Hooks:** config B (pre-commit + post-commit + pre-push). Untouched.
- **Inbox:** empty. **Worktrees:** one live — `agent-a74231d101722b005` (#14 parser batch, in
  flight; retain until landed).

## DONE this session

### scandir fix — LANDED + PUSHED (`096951c4`)
`compiler/src/api.js` `scanDirectory.walk`: skips `node_modules`/`dist`/dot-dirs + `lstatSync`
(no symlink-follow) + try/catch. +2 unit tests (`api.test.js` §5). Fixes the scrml-site
`scrml dev <dir>` compile-storm (walked bun-linked dep trees). Pre-commit + pre-push green
(15512 / 0). PA-direct edit (user-authorized).
- **scrml-site landing-notice: HELD** (user directive). **scrml-site does NOT exist on this
  machine** (local-only on the other machine, no GitHub remote → can't git-sync here). The S140
  sibling-path check caught it before writing a phantom inbox. User carries the notice
  ("scandir fixed @096951c4") to the scrml-site PA on the other machine.

## IN FLIGHT

### #14 event-payload-transition — PARSER batch (batch 1 of 3) — LANDED ✅
- **Agent:** `scrml-js-codegen-engineer` a74231d101722b005 (FINAL_SHA 973af58b). BRIEF at
  `docs/changes/s155-14-parser-accepts-message-arms/BRIEF.md`.
- **Landed via S67 file-delta — 2 PA commits:** `6e859b3e` (api.test.js worktree-false-fire
  fix — see below) + `6667b664` (#14 parser: `accepts=` capture in ast-builder.js →
  `EngineDeclNode.acceptsType`; `parseMessageArms` in engine-statechild-parser.ts → leading
  contiguous `|`-arms = dispatch table, render body via `renderBodyStart`; `MessageArmEntry` +
  `EngineStateChildEntry.messageArms` in symbol-table.ts; native-walker `[]` shape-parity
  placeholder). **Recognition→AST only**; +18 tests (engine-message-arms.test.js); within-node
  allowlist rebumped (MISSING-FIELD only, acceptsType). Full suite **22606/0/220**.
- **Review verdict PASS:** S147 coherence 0/2 (no leak), scope discipline clean, parseMessageArms
  correct (balanced scans, `||`-vs-arm handled, reuses parsePayloadBindings), allowlist rebump
  canary-clean (only MISSING-FIELD, +3 = nested-engine fixtures).
- **api.test.js fix (`6e859b3e`):** my S155 scandir test (`096951c4`) checked `f.includes("/.claude/")`
  which false-fires in ANY worktree (worktrees live under `.claude/worktrees/`); broke this
  dispatch's pre-commit + would break every future worktree dispatch. Agent caught + fixed
  (scope to FIXTURE_DIR-rooted decoys). Landed.
- **Worktree `agent-a74231d101722b005` RETAINED until wrap** (S67 forensic).
- **PUSH:** 6e859b3e + 6667b664 PUSHED (origin).

### #14 batch 2 (TYPER/SYM) — LANDED + PUSHED ✅ (`c6f323f0`)
- Agent a0f3d80b7c1378c79 (FINAL_SHA 50bcea8a). BRIEF at `docs/changes/s155-14-typer-advance-exhaustiveness/`.
- symbol-table.ts: `EngineMetadata.acceptsType`/`messageVariants`; Step-1.5 resolves `accepts=`
  → E-ENGINE-ACCEPTS-NOT-ENUM; per-state loop fires E-ENGINE-MSG-WITHOUT-ACCEPTS +
  E-ENGINE-MSG-ARM-NOT-EXHAUSTIVE (mirrors E-MATCH-NOT-EXHAUSTIVE) + W-MATCH-ARROW-LEGACY (info).
  type-system.ts: `MachineType.acceptsMessageType`; `cellMessageEnums` map; `resolveAdvanceArgTwoPlane`
  (§51.0.G.1 — accepts-less engines verified no-op). Reuses E-VARIANT-AMBIGUOUS. +39 tests. Full 22645/0.
- Review PASS (verified diffs): no codegen/SPEC/allowlist touched; makeEngineRecord reads
  batch-1's `engineDecl.acceptsType` (no re-parse); accepts-less no-op confirmed in code.
- **KNOWN FOLLOW-UP (pre-existing, NOT introduced):** markup-attribute `.advance(...)` (the
  canonical §51.0.S call site, e.g. `ondrop=@x.advance(.Drop(col))`) is NOT bare-variant-checked
  for ANY bare variant today; two-plane resolution wired the logic-block/fn-body path only.
  #14 compile-safety at the markup site needs that general gap wired SEPARATELY (record at wrap).
  Runtime works regardless (batch 3).

### #14 batch 3 (CODEGEN + RUNTIME) — LANDED + DUAL-R26-VERIFIED ✅ (`a9ce4c3a`)
- Agent ad41c7b23993fcdd2 (FINAL_SHA e06d998a). BRIEF at `docs/changes/s155-14-codegen-message-dispatch/`.
- Runtime: NEW `_scrml_engine_dispatch_message` (sibling helper) — looks up the (current-state ×
  message) arm, runs the body (effects ALWAYS), resolves target, DELEGATES the transition to
  `_scrml_engine_advance` (reuses all §51.0.F.1 machinery; zero dup); force-resets `<onIdle>` on a
  same-state arm (§51.0.R divergence); no-arm = no-op (§51.0.S.2.6).
- Codegen: per-state `__scrml_engine_<var>_msg_arms` table; arm-body lowering reuses the
  `emitEngineOpenerEffect` re-parse path (arm bodies are LOGIC+target, not markup — justified
  deviation from the brief's emit-match suggestion); plane STAMPED at codegen (msg-variant ∈
  messageVariants); arm-target rule= static leg (E-ENGINE-INVALID-TRANSITION, conservative) +
  runtime leg (delegated advance). ctx threaded additively through 7 emit-* files.
- **Review PASS (verified diffs, not narrative):** main 0/0 no leak, branch-tip==FINAL_SHA, scope
  clean (NO SPEC/parser/typer/native/allowlist), the "null fallback" is host-JS payload-binding
  (legit per §42 host-JS exclusion, not a scrml null), arm-target check conservative (self-target
  always legal, only literal targets static-checked → no over-fire), within-node UNCHANGED.
- **PA independent R26 (S138 dual-verify) GREEN:** compile exit 0, node --check OK on both emitted
  files, `_scrml_engine_dispatch_message` ×3 calls + runtime def, `_msg_arms` table ×4, arm body
  emits `_scrml_reactive_set("tasks", taskMovedTo(...))` + `_scrml_reactive_set("dragPhase","Idle")`
  (effect→transition). All R26 warnings benign (W-TAILWIND on fixture class names + W-PROGRAM style nits).
- **Pushed** `a9ce4c3a` (pre-push full suite + TodoMVC gauntlet PASS).
- **Surfaced 2 pre-existing follow-ups → Bug 62 (HIGH, each-render-ctx) + Bug 63 (MED, markup-attr type-check).**

### DD CANDIDATE (user-floated S155 — capture at wrap)
- **"Self-tree-shaking compiler as a build-story minimal-closure (post-self-host)."** User idea:
  amend the dependency/distribution friction via custom build stories — when shipping a library,
  have the compiler tree-shake ITSELF. Strong form = once self-hosted, the compiler IS a scrml
  program → scrml's own chunk-DCE (§47) applies reflexively, scoped to the lib's feature usage;
  the §58 build-story Merkle closure then references a minimal compiler sub-closure. Fork: scrml's
  static-compile model means a lib ships source (consumer compiles; shaking at final-app-build is
  strictly better) OR precompiled JS (no compiler at consume-time) — so "lib ships a tree-shaken
  compiler" has teeth only in the §58 PROVENANCE sense. Caveat: tree-shaken compiler must produce
  byte-identical output (the §58 determinism gap). Intersects §58 + §47 + self-host roadmap +
  distribution model → deep-dive shaped, Profile-A. (PA §58 knowledge here = SPEC-INDEX summary +
  DD titles, NOT a full §58 read.) Confirm-pending: user's "dependency code issue" = the bun-link
  full-toolchain-as-dependency friction (scandir was a symptom)? — asked, awaiting reply.

## NEXT (the #14 + (d)-A implementation arc — multi-batch, smaller-batches rule)
1. **#14 batch 2 — typer/SYM:** `.advance` two-enum plane resolution (§51.0.G.1) + `(state×msg)`
   exhaustiveness + the 4 §34 codes (E-ENGINE-ACCEPTS-NOT-ENUM / -MSG-ARM-NOT-EXHAUSTIVE /
   -MSG-UNKNOWN / -MSG-WITHOUT-ACCEPTS). Gated on batch 1 landing.
2. **#14 batch 3 — codegen + runtime:** message dispatch (arm → effect + transition). HIGH
   codegen → **R26 empirical verify mandatory** (S138).
3. **(d)-A impl:** type-system variant-literal `oneOf`/`notIn` in refinement position + §53.4
   three-zone solver + §18.8.1 exhaustiveness reads refined set + schemaFor subset lowering +
   `E-MATCH-SUBSET-DEAD-ARM`. Spec landed normative (§53.15, §18.8.1).
4. **+ conformance tests** per new normative statement.

## PARKED (Profile-A design session needed — NOT this thin session)
- **(a)/(b)/(c) S154 design rulings** still need spec-amendment + codegen:
  - (a) `:`-shorthand renders on non-void HTML elements; void elements reject (new code).
  - (b) `:` inside-opener canonical everywhere; §51.0.I reconciles to it. **2 unruled
    micro-grammar sub-Qs:** no-space-after-`:` (`:@thing`); self-close `/>` + `:`-shorthand vs
    E-CLOSER-001. **Need ruling before spec work.**
  - (c) no-RHS typed-decl → canonical empty (int→0, string→"", bool→false, []→[], {}→{}) else
    `not`; supersedes E-DECL-NEEDS-INITIALIZER. **3 impl sub-Qs:** exact table (enum→not);
    `not`-init lifecycle (§42/§14.12); E-DECL-NEEDS-INITIALIZER fate.
  - These are design-adjacent (unruled sub-Qs need fluency) → Profile A.

## NEW INCOMING — scrml-site lift-list finding (S155, fyi, QUEUED — not fixed)
- **`2026-06-02-0838-scrml-site-...-liftlist-index-key-stale-content.md`** (moved to
  `incoming/read/`). **`needs: fyi`, NOT a blocker** (scrml-site shipped a workaround). Tier-0
  `for ... lift` lists with no `id` field key by **array index**; on in-place cell replace
  (`@x = newArray`), `_scrml_reconcile_list` reuses index-matched DOM nodes + patches only
  REACTIVE bindings — but per-item interpolated text (`${ln.n}${ln.text}`) is emitted
  **create-time-static** → goes **stale** (class:/if= toggles update fine; only text stale).
  Workaround: route through `[]` (clear→refill = full recreate). **Triage:** per "don't
  soft-classify bugs," the (b) interpretation (interpolated per-item content emitted static
  when the node can be reused = codegen gap) is the live possibility, NOT just a doc gap.
  ALSO flags a tension: the `<each>` escape hatch (their lint suggests it) drops event/class/`${}`
  wiring (their friction #7) → neither stock path serves a hover-wired list that must re-render.
  **DISPOSITION (user-accepted): QUEUE as known-gap/triage item; batch with the next lift/each
  codegen touch (highest-churn area); do NOT chase mid-#14-arc.** TODO: formal entry in
  `docs/known-gaps.md` at wrap. (Provenance: scrml-site repo not on this machine; message
  synced/placed onto this filesystem.)

## OTHER CARRY-FORWARD (from S154 — see hand-off-159.md for full)
- **#2f native-parser each/match structural promotion** — HARD M5-swap precondition.
- Body-split/CPS debt (Ext 2/3 absent). #4 atom-emitter follow-up. #5 lint FPs. #6 cross-file
  client imports (DD landed). #7 MCP flip. #8 §14.10 bare-variant impl (ratified S151). #10
  print() canon. #11 srcmap col-precise. #12/#13 LOW. #15 `:`-shorthand BS fragility.
- **per= (per-instance engines):** NOT landed; placeholder name only; needs its own DD.
- **6NZ caps stray** still present at `scrmlMaster/6NZ/` (non-git; S140 said migrate). Minor.

## pa.md directives in force (Profile-B verified subset)
- Rules R1–R5. `---` answer-delimiter (S152). Working-style S147 (largest ratified target,
  autonomous, park-on-input). `full wrap` / 88% floor (S139).
- Dispatch discipline: S88 explicit isolation · F4 startup-verify · S99/S126 Bash-edit +
  no-`cd`-into-main · S136 BRIEF.md · S138 R26 (HIGH codegen) · S147 branch-leak coherence ·
  S90 CWD gate · S82 maps-block. `--no-verify` forbidden (commit + push) w/o auth.
- Canonical dev-agent `scrml-js-codegen-engineer` — **loads correctly this session** (S154
  drift resolved; the rename propagated to global `~/.claude/agents/`).

## Open questions to surface
- **#14 parser landing commit auth** — needed when agent a74231d returns ("start the parser
  batch" authorized dispatch, not yet the main-commit).
- Continue batches 2/3 under Profile B, or switch to Profile A when (a)/(b)/(c) design work
  starts?

## Tags
#session-155 #OPEN #profile-b-test #scandir-fixed-pushed #14-parser-batch-dispatched #thin-start
