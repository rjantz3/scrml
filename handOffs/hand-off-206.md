# scrml — Session 201 (CLOSE — full wrap)

**Date:** 2026-06-17 (opened 2026-06-16 as a warm-vPA boot).
**Previous:** `handOffs/hand-off-205.md` (S200 CLOSE — the second live baton-pass; rotated here at the S201 wrap).
**Next-session pickup:** rotate THIS file → `handOffs/hand-off-206.md` at next OPEN.
**Profile:** A — FULL.
**Repo:** **`scrml`** (the working TS compiler; self-host sibling = `scrml-native`). `origin = git@github.com:bryanmaclee/scrml.git`.

**Session shape.** This instance booted as the **warm vPA** (off `vpa.md`), absorbed the S199 delta-log through the baton, **took the baton** (became the PA), and ran the **S200 wrap WARM** (the second live baton-pass). It then continued PA-direct: the member-arg fix, then the **2-HIGH pass** the user directed (`g-each-body-bare-variant-arg` + `g-markup-value-ternary-fnreturn-codegen`), and this full wrap. No warm vPA successor exists right now → this is a normal 8-step wrap, not a baton.

---

## Session-close state (verified)
- **HEAD:** `wrap(s201)` (this wrap commit). Substantive S201 landings (all pushed): member-arg `7d3855a6` · each-inline gap-filing `24cdc4dd` · HIGH#2 each-body-bare-variant `17d2711a` · markup-value form-c `268a27c5` · markup-value codegen `2b4ea4d8` · markup-value render `fa2edccf`.
- **Sync:** all 3 repos **0/0** (scrml · scrml-support · scrml-native). Clean.
- **Board:** **HIGH 1 · MED 12 · LOW 20 · Nominal 8** (S200-close was HIGH 2 · MED 12). S201 RESOLVED 2 HIGH (`g-each-body-bare-variant-arg`, `g-markup-value-ternary-fnreturn-codegen`) + the earlier member-arg HIGH; FILED 1 HIGH (`g-each-inline-component-prop-member-unsubstituted`) + 1 MED (`g-inlined-component-root-class-interp-raw`). **Only open HIGH = `g-each-inline-component-prop-member-unsubstituted`** (the board-`<each>` blocker).
- **Tests:** full suite **24,402 / 0** (1015 files); pre-commit subset **17,137 / 90 / 0** (live `bun scripts/state.ts`). TodoMVC 49/0 (dist rebuilt from the new runtime). within-node 1012/0 (allowlist UNMODIFIED — parser untouched all session).
- **Maps:** REFRESHED to watermark **`fa2edccf`** (was `b1f5f8bf`) via `project-mapper` incremental — primary/structure/domain, on the 11-file S201 compiler-source surface (markup-value end-to-end + member-arg + bare-variant). (test.map.md body not regenerated — out of routing scope; delta annotated in primary's test row.) Committed explicit-pathspec.
- **Inbox:** empty. **Worktrees:** main only (all S201 dispatch worktrees 6b-cleaned).
- **Experts staged** (`~/.claude/agents/`): `xstate-expert` · `elm-architecture-expert` · `threejs-webgl-integration-expert`.
- **Version:** v0.7.0.

---

## What landed S201 (detail)

**1. `g-nested-component-member-arg-misparse` RESOLVED (member-arg leg, `7d3855a6`, PA-direct).** A member-access arg to a NESTED component (`<Badge s=row.name/>`) was space-padded by the logic tokenizer (`row . name`) in component bodies + not collapsed by CE → phantom attr / member-drop. Fix: one general member-access collapse regex in `component-expander.ts` `normalizeComponentBodyRaw` (mirrors the existing call-form + `@.` collapses). Spec: no change (§5.2 sanctions `obj.prop`). **case-c SPLIT** → `g-inlined-component-root-class-interp-raw` (MED).

**2. `g-each-body-bare-variant-arg` RESOLVED (HIGH #2, `17d2711a`, PA-direct).** A bare `.Variant` call-arg in an `<each>` handler (`onclick=moveTo(card.id, .InProgress)`) emitted raw `.InProgress` → E-CODEGEN-INVALID-JS. Root: `lowerEachExpr` only structured-emitted on §42 predicates, and the event-handler call-ref bypassed it. Fix (`emit-each.ts`): broadened the `lowerEachExpr` guard to detect bare `.Variant` (member-access excluded) + new `serializeCallArgsLowered` for the NON-engine call-ref fallback (engine path keeps the raw callText so `.advance(.X)` detection still fires).

**3. `g-markup-value-ternary-fnreturn-codegen` RESOLVED (HIGH #1, codegen `2b4ea4d8` + render `fa2edccf`).** Markup-as-value (Pillar 1) in expression position — now works END-TO-END (all 4 forms render in happy-dom). Two layers:
   - **Codegen** — markup-in-expression lowers to a real DOM-node value: form (c) `return <markup>` via new `emitMarkupValueExpr` IIFE primitive (`emit-lift.js`); forms (a) inline-ternary + (b) derived-ternary via the parse layers (block-splitter full-RHS scan + ast-builder `sawTernaryAtRoot` guard + `parseExprWithMarkupValues` + new `MarkupValueExpr` ExprNode + emit-expr `case "markup-value"`).
   - **Render** — the deeper bug a render-level check caught: `${markup}` assigned the node to `el.textContent` → `"[object HTMLSpanElement]"`. **Pre-existing + universal** (even the (d) "control"; markup-as-value had never rendered). Fixed via a node-aware `_scrml_render_value(el,v)` core-chunk runtime helper wired into `emit-event-wiring.ts`; string path observable-identical.
   - **+ a Bug-57-class tree-shake gap** (`emit-client.ts`): markup-typed-derived cells didn't pull the `derived` chunk → `_scrml_derived_declare` undefined at mount (blocked form-d render). One-line fix.
   - NEW `compiler/tests/browser/markup-value-render.browser.test.js` (6 render tests) + 7 coupled emit-shape test updates. **`examples/32-markup-as-value` (G6) now UNBLOCKED.**

**Process — 3 dispatches, all recovered (worth reading before the next codegen dispatch):**
- **Write-revocation mid-dispatch** (1st markup-value agent): it committed + verified form (c), left a/b parse-layers uncommitted+non-compiling. Salvaged (per S83/S89) the a/b work to `docs/changes/markup-value-in-expression-2026-06-17/SALVAGE-form-ab-uncommitted.diff` BEFORE cleanup; file-delta'd form (c).
- **Re-dispatch** finished a/b codegen (salvage applied clean; caught + fixed a discriminator regression).
- **Worktree-base-staleness** (render dispatch): the worktree branched from origin/main (the last **PUSHED** HEAD), NOT my local-unpushed codegen commit. Stopped it; re-dispatched with an FF-merge STEP-0 (`git merge --ff-only <local-sha>`). **LESSON (memory updated):** `isolation:worktree` branches from origin/main, not local commits — to give a dispatch a local commit, brief an FF-merge of its SHA, OR push first.
- **Verify-before-claim earned its keep twice:** caught the render bug (compile≠render — all "compile-verified" markup forms rendered "[object]") AND an over-claim in an agent's own report ("form (b) is clean" — it wasn't). Held the codegen-alone push so origin never carried the silent-wrong intermediate (codegen + render pushed together).

---

## ⏭️ OPEN THREADS / NEXT PRIORITIES

1. **The ONE remaining HIGH — `g-each-inline-component-prop-member-unsubstituted`** (the board-`<each>` blocker, filed `24cdc4dd`). The `<each>` path INLINES a cross-file component but doesn't substitute its prop in a nested member-arg (`<LoadStatusBadge status=load.status/>`) → `E-SCOPE-001`. For-lift module-imports the component + works; each inlines + breaks. **Does NOT minimally reproduce** (needs the board's full shape). **DD-worthy design question:** make the `<each>` path module-import components like for-lift (sidesteps the whole inline-prop-substitution class) vs patch the inline substitution. Gates the board `<each>` conversion + the ENTIRE `<each>`-over-component-list corpus pattern.
2. **Board `<each>` conversion** — authored + REVERTED (correct idiomatic scrml: 3 derived filtered cells + `<each>`/`<empty>`; the conversion is captured in `g-each-inline...`'s repro note). Re-applies trivially once #1 lands. Completes the trucking board flagship.
3. **`examples/32-markup-as-value` (G6)** — NOW UNBLOCKED (markup-value works end-to-end). The deferred wave-3 teaching example.
4. **flogeance / MPA** — the vPA workflow → Master PA Orchestrator; 6-DD slate in `flogeance/docs/ideas.md` (LOCAL-ONLY, commit `d846fec`, no remote — user adds it). The PA↔vPA system is LIVE + proven across S199 + S200 baton-passes.
5. **Trucking corpus rewrite** (S193 "show real scrml"): slices 2–5 — decl-coupled validators · `<each>` sweep · errors-as-states · typed props.

## Carried backlog (lower priority)
- `g-inlined-component-root-class-interp-raw` (MED, S201) — INLINED component-ROOT class-attr `${…}` interp emits raw (`setAttribute("class","base ${cls(status)}")`; silent-wrong). NOT a board blocker (board badge module-imported). Repro `/tmp/g-nested-arg/v6-classinterp.scrml` (regenerate — /tmp may be cleared). Sibling of the markup-value render fix — likely the same node-aware-display family.
- `g-colon-shorthand-markup-misparse` (MED, S199) — BS `:`-shorthand-markup mis-parse → misleading `E-STRUCTURAL-ELEMENT-MISPLACED`.
- Gauntlet measurement; value-native map §59 phase-c build (Nominal); the broader §59/Nominal-spec-ahead slate (8 Nominal entries).

---

## The vPA / flogeance workflow — LIVE (orientation for the next vPA)
The model (`scrml-support/vpa-scrml.md` + `handOffs/delta-log.md` header): the vPA boots ONCE (full PA-style start, overlapped with PA productivity), stays current by absorbing the PA's `delta-log` on poke, and takes the baton when the PA nears wrap. Rolling baton: vPA → PA → (fresh) vPA. **Single-writer:** only the LIVE PA commits/appends-to-delta-log; the vPA is read-only until the baton. The delta-log WINS over this hand-off on conflict. **S201 ran WITHOUT a parallel vPA** (this instance was the PA the whole time, having taken the S200 baton); so this is a normal wrap. If the user boots a fresh vPA next, it absorbs `delta-log` [1]–[20] (incl. the S201 entries [11]–[20]).

## pa.md directives in force
R1–R5 · `---` delimiter · Profile A · S88 isolation-explicit · S99/S126 path-discipline · S112 merge-main · S136 BRIEF.md archival · S138 R26 dual-verify (incl. RENDER-level, not just compile — the markup-value lesson) · S147 coherence · S180 waiting-time 3-tier · S198 wrap-calibration + context-economics + partner-not-list + within-node-allowlist brief-rule · S199 baton-pass · wrap 8-step (6b worktree-clean + 6c maps + 6d state-regen). **Worktree base = origin/main (PUSHED), not local-unpushed-HEAD** — FF-merge a local commit into a dispatch's worktree, or push first (memory `feedback_worktree_base_session_start_staleness`, sharpened S201).

## Tags
#session-201 #close #full-wrap #2-high-pass-done #markup-as-value-resolved #each-body-bare-variant-resolved #member-arg-resolved #board-high-1 #each-inline-blocker-open #flogeance-mpa
