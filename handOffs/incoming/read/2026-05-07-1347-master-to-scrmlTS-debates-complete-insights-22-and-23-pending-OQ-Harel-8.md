---
from: master
to: scrmlTS
date: 2026-05-07
subject: both debates complete; Insights 22 + 23 ready to append; one user-decision blocker on Insight 23 (OQ-Harel-8)
needs: action
status: unread
---

# Context

Follow-on to `2026-05-07-1327-master-to-scrmlTS-hierarchy-likely-locked-tree-shake-reclassification.md` (sibling message, also unread). That earlier message captured the user direction signals (hierarchy "likely locked"; tree-shakeable runtime cost OK) and the deep-dive audit verdicts. After it landed, master PA fired two debate-curator dispatches in parallel and both have now returned. This message captures the verdicts.

Both curators ran in **synthesis-mode** (agent-store unreadable in the curator's environment). Confidence rated MEDIUM-HIGH on structural reasoning; per-position philosophical voicing is at the description-level rather than full-agent-debate level. If you want higher-fidelity re-runs with live multi-agent dispatch, the experts (`xstate-expert`, `scxml-expert`, `halogen-expert`, `erlang-genstatem-expert`, `re-frame-expert`, `koka-expert`, `simplicity-defender-expert`) need to be staged from `~/.claude/agentStore/` to `~/.claude/scrmlMaster/scrmlTS/.claude/agents/` first via a master-PA stage-agents request.

Both curators flagged the same operational issue master PA hit on the deep-dives: **Write to `scrml-support/design-insights.md` is blocked** by the repo-write-scope rule. The insights are below in appendable form for the next scrmlTS PA session to land in scrml-support after user authorization (or after OQ-Harel-8 is resolved, see below).

# Verdict 1 — Effects-as-data middle path: `test-bind`

**Status:** ready to append as **Insight 22**. No user-decision blocker.

**Verdict shape:** Position C surface (`test-bind` declaration in `~{}` blocks) implemented via Position A mechanism (compile-time conditional at the §47 server-function call site). Position B (effect-record schemas + `expects` sequences) is not adopted but explicitly reserved as a forward-compatible extension.

**Closure status for OQ-8:** Partial. Server-function mockability in `~{}` is closed. `<onTransition>` body effects beyond server-function calls are re-filed as **OQ-8b**.

**Production runtime cost:** 0 bytes. Test-mode dispatch is dead-code-eliminated from release builds.

**Insight 22 body (canonical, ready to append to `scrml-support/design-insights.md`):**

---

## Insight 22 — Effect-Test-Mockability: `test-bind` as canonical scrml surface (2026-05-07)

**Challenge:** Should scrml admit a re-frame-style records+interpreters surface scoped narrowly to test-mockability for engine-bearing apps, distinct from the Koka effect-row shape rejected at Insight 21?

**Verdict:** Adopt a `test-bind` declaration inside `~{}` blocks (Position C surface, Position A mechanism). Do not introduce effect-record types at this time. Reserve Position B (effect-record schemas + `expects` sequences) as a future extension point gated on flip condition #1 (enterprise-workflow complexity) from Insight 21.

**Canonical surface:**
- `test-bind <serverFnName> = <literal-or-handler>` — scope-local declaration inside `~{}` blocks; multiple declarations allowed per block
- Keys are §47 encoded names — no new naming scheme introduced
- Implementation: compile-time conditional at the §47 call site in test mode; production binary unchanged (dead-code-eliminated in release builds)
- Unbound server functions in test mode with active `test-bind` context: fail-fast (error, not silent passthrough)
- E-TEST-004 unchanged (no outer-scope ref relaxation needed; `test-bind` is scope-local declaration, not outer-scope reference)
- E-FN-004 unchanged (denial-via-`fn` for coeffects stands)
- Insight 21 unchanged (no effect rows on `fn` types)

**Forward-compatibility to Position B:** the `test-bind` dispatch point is structurally a subset of what Position B would need. B extends it by also emitting an effect-record at the dispatch point rather than just silencing the call. If flip condition #1 ever triggers, B can be added forward-compatibly without breaking the `test-bind` surface.

**OQ-8 status:** Partial closure. Closed for server-function mockability. Re-filed as **OQ-8b** for `<onTransition>` body effects beyond server-function calls.

**Open questions:**
- **OQ-8b** (new, derived from OQ-8): `<onTransition>` bodies containing arbitrary imperative effects — what mockability surface, if any, should these have?
- **OQ-test-bind-concurrency:** parallel test runner block-local table isolation — what is the isolation primitive (thread-local storage, block-ID-keyed table, other)?
- **OQ-test-bind-passthrough:** unbound server function in active `test-bind` context — verdict says fail-fast; validate against test-runner ergonomics.
- **OQ-audit-log-compose:** how does `test-bind` interact with `audit @log` (§51.11)? Does the test-bound value appear in the audit log?

**Participants:** re-frame-expert (Position B); xstate-expert (Position A); simplicity-defender-expert (Position C); koka-expert (contrast witness ensuring Insight 21 was not re-litigated). All synthesized from published philosophy in synthesis-mode dispatch (agent-store unreadable). Structural arguments hold; specific syntax sketches are illustrative.

---

# Verdict 2 — DD-Harel engine hierarchy: Approach C (Hybrid)

**Status:** verdict landed but **BLOCKED on user decision for OQ-Harel-8** before Insight 23 can be ratified. See blocker section below.

**Verdict shape:** Approach C scored 49 vs B (46) and A (43). C uses A's structural-nesting form for the one case it is the correct notation for (owned state scope) AND B's named multi-engine pattern for the case that already works (orthogonal parallel regions). Notably ranked the statechart-faithful position (A) lowest of the three, despite being canonically correct in general statechart territory — reasons are scrml-specific (Machine Cohesion debate convention; SCXML scope creep risk).

**Critical scope limit baked into the verdict:** ONLY the four REAL GAPs from the audit. **No** SCXML invoked services, deferred events, activity-based transitions, or deep history. The cost ceiling enforces this naturally.

**Production runtime cost:**
- Hierarchy cascade dispatch: 0 bytes (compile-time generated if/else, no runtime lookup)
- History cells: ~30-80 bytes per history-bearing parent, tree-shakeable
- Internal/external distinction: negligible (codegen flag)
- `parallel` attribute sugar: 0 bytes (pure naming over existing §51.4)

User has confirmed this cost profile is acceptable for apps that would actually use these features at scale.

## BLOCKER — OQ-Harel-8 needs user decision before Insight 23 is ratified

The DD-Harel verdict explicitly flags this as the load-bearing decision. Quoting the curator:

> The Machine Cohesion debate (2026-04-17) ratified that all `<engine>` openers use attribute form at file scope. C's nested `<engine>` inside a state-child body is structurally at a different scope level. Before C is ratified, the user must decide: is "nested `<engine>` inside a state-child body is the one exception to file-scope-only declarations" acceptable? The alternative is to use a different opener for inner engines (e.g., `<region for=PlaybackMode>`) that is not reusing the file-scope `<engine>` form.

**Two clean answers, both compatible with the verdict's structural shape:**

| Answer | Pro | Con |
|---|---|---|
| Accept the exception: nested `<engine>` inside state-child body | Visual / mental unity — "an engine is an engine" regardless of scope | Erodes the Machine Cohesion ratification's clean rule |
| Use `<region>` (or other distinct opener) for inner engines | File-scope-only invariant preserved cleanly; lexical distinction matches the lifecycle distinction | Adds another keyword to the engine family |

Master PA recommendation: `<region>` lean. Preserves the harder-won invariant; the lexical signal matches the semantic difference (`<region>` is owned by an outer scope, `<engine>` is at file scope). But this is a user call.

**Insight 23 body (PROVISIONAL — depends on OQ-Harel-8 resolution; ready to append to `scrml-support/design-insights.md` once the user has answered):**

---

## Insight 23 — DD-Harel: Engine Hierarchy as Approach C (Hybrid) (2026-05-07)

**Challenge:** What is the canonical scrml shape for hierarchy / history / internal-vs-external / parallel-region ergonomic sugar in `<engine>` declarations?

**Verdict:** Approach C (Hybrid). Hierarchy via structural nesting (inner engine declared inside a composite state-child body); parallel regions via named multi-engine with `parallel` attribute sugar (preserving §51.4 precedent unchanged); history via `history` attribute on composite state-children with compiler-synthesized tree-shakeable reactive cell; internal vs external transitions via `internal:rule` attribute prefix.

**Critical scope constraint:** Limited to the four REAL GAPs from the 2026-05-07 audit. Does NOT include SCXML invoked services, deferred events, activity-based transitions, or deep history.

**The four concrete grammar decisions:**

1. **Hierarchy** — `<INNER_OPENER for=SubType initial=.Default>` inside a composite state-child body. Inner-engine lifecycle coupled to parent state-child lifecycle: initialized on outer entry, suspended on outer exit. Inner engine has dispatch priority over outer-state-child cascade rules for the same event name (inner-first, then outer cascade).

   **`INNER_OPENER` resolution per OQ-Harel-8 user decision:**
   - **If "accept the exception":** `INNER_OPENER` is `<engine>` (one exception to the Machine Cohesion file-scope-only rule).
   - **If "use distinct opener":** `INNER_OPENER` is `<region>` (preserves Machine Cohesion file-scope-only invariant).

2. **History** — `history` attribute on the composite state-child (e.g., `<Playing history>`). Compile-time synthesized reactive cell `@_<parent>History` (tree-shakeable when no engine declares `history`) stores last-active inner variant on outer exit; restores on outer re-entry. Referenced as `.Composite.history` in rule targets: `rule="resume -> Playing.history"`.

3. **Parent-rule cascade** — `rule="event(args) -> OuterVariant"` attribute on a composite state-child is a parent-level cascade rule. Dispatch priority: (a) inner engine's rules; (b) outer state-child's cascade rules; (c) outer engine's rules for `event` on other variants. No match: extended E-ENGINE-001 message naming both engines.

4. **Internal vs external** — `internal:rule="event -> Self"` prefix declares an internal transition (no exit/re-entry of the composite, no inner-engine re-init). Default (no prefix) is external (full lifecycle). Additive, consistent with attribute-form grammar.

5. **Parallel regions** — `parallel` attribute on file-scope named `<engine>` declaration is naming sugar over §51.4 multi-engine coexistence. No joint lifecycle semantics (out of scope; that's full SCXML parallel-node behavior).

**Compile-time desugaring (Class A, ~0 bytes net for hierarchy graph):**

Composite state with parent-rule cascade desugars to: (a) inner engine's transition table as a separate compile-time constant; (b) an outer dispatch function that checks inner rules first, then outer cascade rules, then outer engine's other-variant rules; (c) dispatch priority order baked in as a generated `if/else` chain — zero runtime overhead. History cell is the only runtime allocation: ~30-80 bytes per history-bearing composite, tree-shaken if `history` is absent.

**Interaction matrix with existing §51 surface (all confirmed compatible):**

- §51.4 (multi-engine): preserved; `parallel` is additive sugar.
- §51.9 (derived/projection engines): compatible; can project from inner or outer engine.
- §51.11 (audit clause): compatible; tuple gains an `engine` field; inner and outer transitions audited separately.
- §51.12 (temporal transitions, deprecated `<machine>` form): compatible per OQ-Harel-7 — temporal transitions are engine-specific, do not cascade.
- §51.14 (replay): compatible; receives a sequence of `(engine, from, to, at)` tuples.
- §54 (state-local transitions): compatible; type-level vs machine-level — no conflict.
- `.advance(.event)` write discipline: preserved.

**Open questions for spec authoring:**

- **OQ-Harel-1:** entry/exit action order across composite boundary. SCXML order: outer entry, inner init, inner entry. Adopt or document deliberate departure.
- **OQ-Harel-2:** inner engine reset vs history on outer exit. Verdict: history cell is WRITTEN on exit, READ on re-entry; current value persists until next entry triggers restore vs reset decision.
- **OQ-Harel-3:** parallel engine activation coupling. Verdict: independent activation per declaration site (§51.4 semantics preserved); `parallel` is naming sugar only.
- **OQ-Harel-4:** deep vs shallow history. Verdict: shallow only in this revision. Deep history deferred until use case is documented.
- **OQ-Harel-5:** grammar disambiguation for nested opener (per §4.3 leading-space rule).
- **OQ-Harel-6:** error code for cascade miss. Recommendation: extend E-ENGINE-001's message form rather than create a new code.
- **OQ-Harel-7:** temporal transitions in hierarchy. Verdict: engine-specific; do not cascade.
- **OQ-Harel-8:** [RESOLVED PER USER DECISION DATE 2026-05-XX — outcome: accept-the-exception OR use-distinct-opener — reflected in grammar decision #1 above]

**Participants:** xstate-expert + scxml-expert (Approach A); erlang-genstatem-expert (Approach B); halogen-expert + simplicity-defender-expert (Approach C, with scope constraint); scrml-dev signal from gauntlet corpus. All synthesized from published philosophy in synthesis-mode dispatch.

---

# Recommended action items for next scrmlTS PA session

| # | Item | Blocker |
|---|---|---|
| A | Surface OQ-Harel-8 to user immediately at session open. Two-option choice: accept-the-exception (`<engine>` inside state-child body) vs use-distinct-opener (`<region>` for inner) | None — surface and ask |
| B | Once OQ-Harel-8 resolved, append Insight 23 to `scrml-support/design-insights.md` with the resolution reflected in grammar decision #1 | OQ-Harel-8 |
| C | Append Insight 22 to `scrml-support/design-insights.md` (no blocker; ready as written above) | None |
| D | Open DD-Harel as a formal deep-dive entry at `scrml-support/docs/deep-dives/dd-harel-2026-05-XX.md` with the verdict, scorecard, and the OQ-Harel-1 through OQ-Harel-8 follow-up list | OQ-Harel-8 (at minimum to write the canonical Approach C grammar) |
| E | Schedule the SPEC §51 amendments per the four grammar decisions (hierarchy nesting, `history` attribute, parent-rule cascade, internal:rule prefix, `parallel` attribute) as compiler-source dispatches when ready | OQ-Harel-8 + Insight 23 ratified |
| F | Coordinate with the state-timeout migration work item (§51.12 `<machine>` → `<engine>` `rule=`, plus computed-delay relaxation) from sibling message 1327 — that work is independent and can ship in parallel | None |
| G | Per user direction: the Class B-shakeable timeout extensions (event-timeout watchdog, named multi-timer-per-state) are now expected to ride alongside the §51.12 surface migration as natural follow-ons. User cost-confirmation: "for the apps that would actually use all of that at that scale, I think that is all totally acceptable." | None |

# Operational note on master PA's prior message (1327)

The prior message's action item table referenced a coarser Class A/B distinction. After the user's tree-shake clarification + cost-acceptance signal, the practical effect on the action items is:

- Action item D in 1327 ("event-timeout + named multi-timer-per-state") moves from "could ride alongside or skip" to **"expected to ride alongside the surface migration"** — cost is no longer the gating concern.
- Action items E and F in 1327 ("general effect log" and "coeffect capture") remain **rejected on minimality grounds**, but the rejection reason is now precise: not cost (byte count), but non-shakeability (instrumentation-at-every-call-site cannot be tree-shaken). This is a methodology rejection, not a cost rejection. Worth recording as standing position.

# References

- Sibling master-PA message: `2026-05-07-1327-master-to-scrmlTS-hierarchy-likely-locked-tree-shake-reclassification.md` (this directory, also unread)
- DD-Harel debate transcript: master PA conversation 2026-05-07; agent-id `a5cd953a61f9f37c0`; output file `/tmp/claude-1000/-home-bryan-maclee-scrmlMaster/48f4fbc1-e792-425a-9bdd-d96cbe7f0012/tasks/a5cd953a61f9f37c0.output`
- Effects-as-data debate transcript: master PA conversation 2026-05-07; agent-id `a07b032f8123b78c3`; output file `/tmp/claude-1000/-home-bryan-maclee-scrmlMaster/48f4fbc1-e792-425a-9bdd-d96cbe7f0012/tasks/a07b032f8123b78c3.output`
- Hierarchy audit: master PA conversation; agent-id `ae46ae9071575cec4`
- State-timeout audit: master PA conversation; agent-id `a41bfb234bb031d76`
- Effects-as-data audit: master PA conversation; agent-id `aafb159786bf98e47`
- DD-Harel deep-dive precedent: `scrml-support/docs/deep-dives/dd6-engine-state-children-2026-05-03.md` line 1086
- Machine Cohesion debate (referenced by OQ-Harel-8): `scrml-support/design-insights.md` 2026-04-17 entry
- Insight 21 (Koka rejection, referenced by Insight 22): `scrml-support/design-insights.md` lines 694-820
- OQ-8 source: `scrml-support/docs/deep-dives/inline-testing-perfection-2026-04-08.md` line 151

# Tags
#design-direction #insight-22 #insight-23 #DD-Harel #effects-as-data #test-bind #engine-hierarchy #OQ-Harel-8 #pending-user-decision #synthesis-mode-debates #cost-confirmed-acceptable #master-PA-2026-05-07
