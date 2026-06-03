# scrmlTS — Session 158 (CLOSE)

**Date:** 2026-06-03
**Previous:** `handOffs/hand-off-162.md` (= S157 CLOSE).
**Next-session pickup:** rotate THIS file → `handOffs/hand-off-163.md` at next OPEN.
**Profile:** opened **A (FULL)** ("read pa.md and start session"; no signal → default A). User then: "A" (continue the bug-fix arc, autonomous) → "Bug 64 ruling" → "(b) Codegen fix" → "(A) Hybrid" → "Wrap + push".

---

## 🏁 S158 CLOSE — 3 bugs RESOLVED (autonomous arc + 1 design ruling) + crash-recovery + Phase-0-gate

Ran an autonomous bug-fix arc under a standing commit-auth grant (S157-mode): each bug R26-reverse-verified before dispatch → `scrml-js-codegen-engineer` (isolation:worktree, bg) → S67 file-delta → PA-authored commit → PA independent dual-R26 (S138) + S147 coherence. One bug (64) carried a design fork → user ruling → Phase-0-survey-STOP → ratified hybrid → implementation.

### Sync / repo state at CLOSE
- **scrmlTS:** clean, HEAD `af3175e2`, `origin/main` **0/3** at wrap-start (3 PA commits) — **pushed this wrap** (see push line). `3707e212` (Bug 72) · `55cf3259` (Bug 60) · `af3175e2` (Bug 64 + R28-1c) · + the wrap commit.
- **scrml-support:** clean, **0/0** + user-voice S158 append (Bug 64 design ratification) — pushed this wrap.
- **Tests at close:** `bun run test` **22,846 pass / 0 fail / 220 skip / 1 todo** (23,067 tests / 897 files) — S157 baseline 22,810; **+36** (Bug72 +10 / Bug60 +15 / Bug64 +11); 0 regression.
- **Hooks:** config B (pre-commit + post-commit + pre-push). Untouched. S100 path-discipline hook held.
- **Inbox:** EMPTY. **Worktrees:** cleaned at each landing — main only.
- **Version:** on top of v0.7.0 (pkg.json unchanged; no tag — bug-fix arc).
- **Maps:** STALE (reflect `57edc794`; this session's 3 bug fixes + S157's landed after). **Refresh before the next compiler-source dispatch** — esp. emit-each/emit-lift/emit-control-flow (Bug 72 + Bug 64 reshaped them) + emit-html/dependency-graph (Bug 60) + runtime-template.js (Bug 64).

### known-gaps §0 state at CLOSE
- **HIGH 0. MED 10** (was 14 at S158 open: −Bug 72 −Bug 60 −Bug 64 −R28-1c; all RESOLVED). No new gaps filed (sibling-gap #1 NOT-REPRODUCED; #2 = follow-up candidate, not filed).

---

## DONE this session (S158)

1. **Bug 72 (MED) RESOLVED `3707e212`** — nested `<each>` inside a Tier-0 `${for…lift}` body now lowers the inner `@.` (was `E-CODEGEN-INVALID-JS`). TWO roots: (1) codegen — promote the generic markup `<each>` via NEW shared `emit-each.ts` helpers (`eachBlockFromMarkupNode`/`emitNestedEachFromMarkup`) + thread `scopeVar` through `emitForStmt`/`emitConsolidatedLift`/`IfOpts`/`emit-lift.js`; (2) parser — NEW `PUNCT "@"` branch in `ast-builder.js _parseLiftAttrValue` for bare-`@.` attr values. +10 tests. **Crash-recovery:** first dispatch (aaf169de) wrote validated helpers then socket-died pre-test (NO leak — verified); WIP captured as a patch + transplanted by a continuation agent (807d70af). Per S140 (re-dispatch beats PA surgery).

2. **Bug 60 (MED) RESOLVED `55cf3259`** — render-by-tag nested-compound-field (`<signupForm><userName/></signupForm>`) now expands (was literal browser-ignored tags + no input + spurious E-DG-002). R26 **reverse-verified at HEAD before dispatch** (S138 — S140 agent-evidence never PA-re-run). TWO files: (1) `emit-html.ts` — `enclosingCompoundStack` + transparent compound-wrapper + `lookupQualifiedStateCell` fallback keyed on `qualifiedPath`; (2) `dependency-graph.ts` — render-by-tag structural-read credit clears E-DG-002. +15 tests. Wrapper-emission: transparent (spec-grounded §6.3.5). Bonus: also clears a pre-existing top-level render-by-tag-only E-DG-002 false-fire. Process: agent self-caught 1 `--no-verify` slip (soft-reset + re-gated).

3. **Bug 64 + R28-1c (MED) RESOLVED `af3175e2`** — per-item interpolated content not reactive on reconcile node-reuse (Tier-0 `${for…lift}` + Tier-1 `<each>`). **DESIGN RULING arc:** PA built empirical repro → showed the static-text/reactive-toggle asymmetry + corrected the S155 framing (the `<each>`-drops-wiring #7 tension was largely stale) → user ruled **(b) codegen fix** → dispatched with a **Phase-0-survey-STOP gate** → agent characterized both cases (array-replace + field-mutation), prototyped 4 approaches, STOPped (the fix needs a reconcile-runtime assist + binding-model shift) → PA surfaced → user ratified **(A) Hybrid** → Phase-1 implementation. The fix (universal keyed-list model): per-item bindings read the CURRENT item from the LIVE collection BY KEY (not a create-time snapshot) via a reconcile `key→item` map (`_scrml_resolve_item` + `container._scrml_item_by_key` in `runtime-template.js`) + live-keyed `_scrml_effect`s in `emit-lift.js`/`emit-each.ts`/`emit-control-flow.ts`. Node-reuse + Fast-path-B2 PRESERVED (TodoMVC 39/0). **CLASS-LEVEL — also closes R28-1c (Tier-1 field-mutation) + the Tier-1-class-not-reactive latent gap + unifies Tier-0/Tier-1 binding.** +11 tests (9 happy-dom + 2 unit) + 4 coupled emit-shape assertion updates (all semantic invariants preserved). keyFn-call count reduced N/pass (was 2N/3N).

### NEW sibling-gaps surfaced this session
- **Bug 64 #1 — NOT-REPRODUCED (not filed):** agent claimed `${@cell=x}` write inside a `function foo()` body lowers to an empty body. PA R26-verified at HEAD `af3175e2` — `function inc(){ @count=@count+1 }` + `function setTo(n){ @count=n }` BOTH emit correct `_scrml_reactive_set(...)` bodies. The claim doesn't hold for the common shape; likely agent-test-harness-specific. If a narrower shape matters, the agent's exact repro is needed.
- **Bug 64 #2 — FOLLOW-UP CANDIDATE (not filed):** per-item event handlers still close over the create-time item, not the live one (`onclick=fn(@.id)` on a reordered reused node fires with the stale value). Display bindings are now live-keyed; handler-live-keying is the natural next axis using the SAME `_scrml_resolve_item` plumbing. Worth a future dispatch (smaller than Bug 64 now that the plumbing exists).
- **Bug 72 → `_parseLiftAttrValue`** may still bail OTHER uncovered attr-value token-kinds (leading unary op, template-literal-led) to string-fallback; audit candidate (no confirmed reproducer).
- **Bug 60 →** nested PREDICATE-typed / ENUM-`<select>`-typed render-by-tag fields may key `reactiveTypeMap`/`enumVarMap` by bare-leaf vs dotted in `emit-bindings.ts`; deferred edge (validators-lower-to-HTML-attrs case unaffected).

---

## OPEN QUESTIONS TO SURFACE IMMEDIATELY (S158 CLOSE)

1. **PARKED — Profile-A design session for the S154 (a)/(b)/(c) rulings (spec+codegen still pending — NOT touched S155-S158):**
   - **(a) `:`-shorthand renders on non-void HTML; void rejects.** RATIFIED S154; **no open sub-Qs — ready to spec** (§4.14 line 997 + new void-reject §34 code) + codegen.
   - **(b) `:` inside-opener canonical everywhere.** RATIFIED S154; **2 unruled micro-grammar sub-Qs** (no-space `:@thing`; self-close `/>` + `:`-shorthand vs E-CLOSER-001).
   - **(c) no-RHS typed-decl → canonical empty else `not`.** RATIFIED S154; **3 impl sub-Qs** (exact empty table incl. enum→`not`; `not`-init lifecycle §42/§14.12; E-DECL-NEEDS-INITIALIZER fate).
2. **Bug 64 sibling-gap #2 (live-keyed event handlers)** — the next clean codegen item; same `_scrml_resolve_item` plumbing. NOT filed; surface as a candidate.
3. **DD candidate (S155, parked) — UNANSWERED across S155/S156/S157/S158:** self-tree-shaking compiler build-story (§58+§47+self-host). Is "the whole dependency code issue" = the `bun link` full-toolchain friction?
4. **scrml-site notice sent** this wrap (Bug 64 = their report RESOLVED + each/lift codegen output-shape changed → their `[]`-clear workaround removable). Watch for their reply.
5. **Maps refresh** overdue (5 commits stale across this session's codegen reshaping).

## CARRY-FORWARD (backlog)
- Bug backlog (MED 10): Bug 1 Tailwind residuals · V-kill READ-side · MCP V0 deferrals · Generator policy · L19 multi-statement-handler · A5 freeze-extension (adoption-watch) · R28-1d (bare-`<program>` drops `<each>`, needs-confirm) · R28-4/R28-8 · C4/C6 lifecycle · Bug 14 MCP-partial · prior LOW tail.
- #2f native-parser each/match structural promotion (M5-swap precondition; within-node allowlist bumps document the live-vs-native divergence).
- S154 carry: body-split/CPS debt · #5 lint FPs · #6 cross-file client imports · #7 MCP flip · per= per-instance engines (needs DD) · 6NZ caps stray.

## pa.md directives in force
- Rules R1–R5. `---` answer-delimiter (S152). Profile A/B (S156). `full wrap` / 88% floor (S139). Working-style: largest ratified target, autonomous, park-on-input, surface only on real failure / needed design ruling.
- Dispatch discipline ALL held: S88 explicit isolation · F4 startup-verify · **S112 merge-startup** (Bug 64 — built on Bug72/60 landings it edits; the merge ff'd cleanly) · S99/S126 Bash-edit + no-`cd` · S136 BRIEF.md archival (all dispatches) · S138 R26/dual-verify (every landing; reverse-direction on Bug 60 + the sibling-gap-#1 NOT-REPRODUCED) · S147 branch-leak coherence + additive-diff (every landing; the stale-base cases on Bug 60 + Bug 64 handled via explicit-pathspec file-delta). `--no-verify` forbidden (Bug 60 agent self-caught a slip).
- **Phase-0-survey-STOP gate** (NEW pattern this session, worked well on Bug 64) — for a meaty/perf-sensitive/architecturally-uncertain fix, brief the agent to survey + STOP-and-report before the heavy edit; PA reviews + greenlights or escalates the design call to the user.
- Canonical dev-agent `scrml-js-codegen-engineer` (loads on this machine). **SendMessage agent-resume is NOT available in this environment** — a Phase-0-STOPped agent is continued via a FRESH dispatch carrying the analysis (Bug 64 Phase-1 precedent).

## Process notes (S158)
- **Crash-recovery (Bug 72):** background-agent socket-death is real (S149 class recurred). Recovery = verify-no-leak → capture WIP as a patch → re-dispatch continuation. Held clean.
- **R26 reverse-direction earned its keep twice:** Bug 60 (verified the S140 agent-evidence still reproduced before dispatch) + Bug 64 sibling-gap #1 (verified the agent's claim did NOT reproduce → not filed). Both directions of the doctrine fired.
- **Stale-base (S112):** the harness branches worktrees from session-start `1a72c81c`, NOT live HEAD. Bug 60 (disjoint files → harmless) + Bug 64 (overlapping files → explicit merge-startup in the brief; ff'd cleanly). Always explicit-pathspec file-delta to avoid reverting prior landings.

## Tags
#session-158 #CLOSE #profile-a-full-start #autonomous-bug-arc #3-bugs-resolved #bug64-design-ruling #phase-0-stop-gate #crash-recovery #r26-reverse-direction #pushed
