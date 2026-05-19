# `<match>` block-form implementation arc — progress

## 2026-05-19 (S107) — SCOPING.md authored

Surfaced during S107 README clarification on `rule=` semantics. User asked PA to make "rule= accepted + compiler-checked but inert at runtime" explicit. PA investigation discovered W-MATCH-RULE-INERT is spec'd but unimplemented; attempted PASS-20 walker landed on a deeper finding: the WHOLE `<match>` block-form (§18.0.1 + §18.0.2 + §18.0.3) is spec'd but the parser captures the entire block as a single `kind: "html-fragment"` AST node — no structural arm-children, no exhaustiveness check, no rule= validation, no payload binding, no codegen dispatch, no runtime render.

PASS-20 walker reverted at S107 (would never fire against html-fragment AST). User direction: "fix this the right way, right now" → SCOPING this session, impl across N sessions.

SCOPING content:
- §1 reproducer + §2 observed output (html-fragment + zero diagnostics + zero render)
- §3 spec verification per Rule 4 (§17.0 / §18.0 / §18.0.1 / §18.0.2 / §18.0.3 / §34 rows read in full from SPEC.md directly)
- §4 root cause analysis (4 sites: parser / SYM / codegen / type-system)
- §5 five-phase plan (~12-19h aggregate; parser → SYM → codegen → bare-variant + edges → tests+samples+docs)
- §6 PA recommendation: PA-direct sequenced phases (tight integration, agent-dispatch loses)
- §7 ten OQs (Q-MB-1 AST node kind / Q-MB-2 arm-child kind / Q-MB-3 payload binding mirror / Q-MB-4 bare-variant inference reuse / Q-MB-5 missing-on= error code / Q-MB-6 parser locus / Q-MB-7 backward compat / Q-MB-8 auto-implied on= scope / Q-MB-9 test infra / Q-MB-10 article+PRIMER audit)
- §8 files affected (preliminary 18-file inventory)
- §9 cross-references
- §10 tags

README posture confirmed: existing rule= clarification stays — nominal language consistent with designer's note disclaimer. This arc closes the gap between nominal + implemented.

**Next step:** surface OQs to user for ratification, then commit SCOPING. Phase 1 dispatch (parser) is the natural next-PA-action; could fit this session if budget allows OR cleanly defer.

## 2026-05-19 (S107, mid-session) — OQ ratifications via AskUserQuestion

User ratified all 4 PA recommendations:
- **Q-MB-1: New `match-block` AST kind** (not flag-on-markup) — Phase 1 introduces the kind
- **Q-MB-3: Reuse §51.0.B.1 parenthesized-form parser** — zero parallel surfaces; spec restricts match-locus to parenthesized only
- **Q-MB-5: New §34 row `E-MATCH-ON-REQUIRED`** — Phase 2 adds the row + normative bullet in §18.0.1
- **Q-MB-7: Ship the impl, let new errors surface** — no feature flag; PA greps adopter surface pre-Phase-1 + fixes/removes broken instances as part of Phase 5

Remaining OQs (Q-MB-2 / 4 / 6 / 8 / 9 / 10) are PA-internal-decidable during dispatch — surface decisions in per-phase commits.

**Next step:** commit SCOPING standalone; Phase 1 (parser) follows as the next PA action (this session if budget, otherwise next).

## 2026-05-19 (S107, post-SCOPING) — Phase 1 attempt found deeper-than-expected scope; paused

**Pre-flight grep complete (Q-MB-7 verification).** Zero adopter source files use `<match>` block-form today:
- `examples/` + `samples/compilation-tests/` — all hits are inside gitignored `dist/scrml-runtime.js` (compiled-runtime comments)
- `docs/website/pages/` — 4 hits are reference pages ABOUT `<match>` + its error codes (descriptive content with `//` comment headers + HTML-escaped descriptions), NOT live syntax
- Cut-over is safe with no migration window. Q-MB-7 ratification holds.

**Phase 1 attempt — ast-builder.js dispatch alone is insufficient.** Authored a `block.name === "match"` dispatch branch in `compiler/src/ast-builder.js` (mirroring the engine-decl `block.name === "engine"` branch at line 10657). Smoke-test failed: the new dispatch never fires.

**Root cause:** the **block-splitter (BS layer) doesn't recognize `<match>` as a structural opener** at all. BS captures the entire `<match for=Phase>...</>` block as a single `type: "text"` raw-text child of the enclosing `<program>`. By the time ast-builder.js sees the data, there's no `block.name === "match"` to dispatch on — there's only opaque text inside a synthetic logic wrapper, which becomes the `kind: "html-fragment"` AST node seen earlier.

Empirical confirmation via `splitBlocks` output for the reproducer:
```
- name="program" type=markup (children: 3)
  - name=null type=text  raw-preview="<match for=Phase on=@phase>     <Idle rule=Loading> : ..."
  - name=null type=text  raw-preview=" "
```

`name=null type=text` — the BS layer treats the whole match block as ambient text, never enters a structural-block recognizer. This is parallel to the channel + page + program + engine recognition that BS DOES perform (`name="program"` is the surrounding block in this dump).

**Revised Phase 1 scope:** must include BS-layer recognition of `<match>` as a structural opener BEFORE ast-builder.js can structure it. Need to find the BS-layer block-recognizer (likely at `block-splitter.js`'s opener-token discrimination) and add `match` to whatever known-structural-tags surface it consults.

**Reverted the ast-builder.js change** — it's dead until BS recognizes `<match>`. Saved this finding for next-session pickup. The SCOPING §8 file-inventory already lists `block-splitter.js` under Phase 1 ("recognize `<match>` as structural so it doesn't fall to html-fragment") with a `(maybe)` qualifier — that `(maybe)` is now confirmed REQUIRED.

**Phase 1 revised file inventory:**
1. `compiler/src/block-splitter.js` — add `<match>` to structural-tag recognition (probably ~1-2h investigation + edit)
2. `compiler/src/ast-builder.js` — dispatch branch as already-drafted (~30min once BS feeds it)
3. `compiler/src/attribute-registry.js` — register match-block attribute schema (`for=`, `on=`)
4. parser unit tests covering AST shape

**Phase 1 estimate refinement:** ~4-6h (was ~3-5h; +1h for BS-layer recognition + investigation).

**Pause point:** README amendment requested by user mid-session ("honest current state, link to error log, major ones called out on front page"). Phase 1 deferred to next session OR continued after the README amendment + commit. The match block-form gap is the first entry in the new `docs/known-gaps.md`; the README current-state blockquote names it explicitly with link out.

## 2026-05-19 (S107, post-README-pause) — Phase 1 SHIPPED

Resumed Phase 1 after the README amendment commit. Real root cause located + fix shape simplified dramatically from the original revised estimate.

**Actual root cause was one line in block-splitter.js.** The pre-existing `COMPOUND_LIFT_EXEMPT_TAGS = new Set(["program", "page", "channel", "schema", "seeds", "module"])` excludes those tags from `classifyOpenerForCompoundScan`'s compound-state-decl misclassification. `match` was NOT in the list, so `<match for=Phase on=@phase> <Idle>...</> ... </>` (which structurally looks like a compound-state-decl parent: opener + nested `<...>` children + `</>` close) got captured as opaque text. Adding `"match"` to the exempt list routes the block through the regular markup-opener path → BS produces `type=markup name=match` → ast-builder dispatches.

**Two-site fix:**

1. `compiler/src/block-splitter.js` — added `"match"` to `COMPOUND_LIFT_EXEMPT_TAGS` (one line + a 7-line comment explaining the S107 fix). Closes the BS-layer misclassification.

2. `compiler/src/ast-builder.js` — added `if (block.name === "match")` dispatch at the TOP of `case "markup":` (NOT in `case "state":` where my first attempt mis-placed it; BS produces `type=markup` for `<match>`, not `type=state`). The dispatch produces a `kind: "match-block"` AST node with three fields:
   - `forType: string` — bareword type name from `for=Type` (REQUIRED per §18.0.1)
   - `onExprRaw: string | null` — raw text of `on=expr` attribute (null when omitted; Phase 2 SYM PASS will fire `E-MATCH-ON-REQUIRED` when null AND no engine for Type is in scope)
   - `armsRaw: string` — raw body text (concatenated child .raw + fallback raw-slice). Phase 2's `match-statechild-parser.ts` will convert this into structured `MatchArmEntry[]`.

Plus a defensive duplicate dispatch in `case "state":` documented as unreachable (mirrors engine's historical dual-residence pattern — engine is also `type=markup` in S107+ but has dispatch code in `case "state":` for the legacy `< machine>` whitespace-state-opener path).

**Phase 1 known limitations (documented in `:`-shorthand comment + test file):**

- **`:`-shorthand body form NOT yet supported** (SPEC §18.0.1 line 9592: `<Variant> : expr`). The BS-layer treats `<Variant>` as a markup opener that needs a closer; `:`-shorthand has no closer. Arm-children today MUST use bare-body form `<Variant>...</>` or self-closing `<Variant/>`. `:`-shorthand support requires BS-layer extension parallel to engine state-child `:`-shorthand handling; deferred to Phase 2 (when the arm-parser lands and can coordinate the BS-level shape recognition).

- **AST-only landing.** SYM PASS for the 4 §18.0.2 diagnostics + E-MATCH-ON-REQUIRED ships in Phase 2. Codegen render dispatch ships in Phase 3.

**9 new unit tests at `compiler/tests/unit/match-block-parser-phase1.test.js`:**
- §1 basic recognition
- §2 field extraction (forType, onExprRaw, armsRaw)
- §3 multi-arm (3 variants all captured)
- §4 missing on= → null (Phase 2 will validate)
- §5 degenerate empty match — still produces AST node
- §6 regression — `<engine>` still produces `engine-decl` (zero overlap)
- §7 regression — `<div>` still produces regular `markup`

**Tests at Phase 1 HEAD:** 13,069 pass / 88 skip / 1 todo / 0 fail / 680 files (delta vs pre-Phase-1: +9 pass / +1 file / +22 expect / 0 regressions).

**Phase 1 file inventory (actual landings):**
1. `compiler/src/block-splitter.js` — +9 lines (1 list entry + 7 comment lines)
2. `compiler/src/ast-builder.js` — +145 lines (primary dispatch in `case "markup":` + defensive duplicate in `case "state":`)
3. `compiler/tests/unit/match-block-parser-phase1.test.js` — +180 lines (new test file)

**Phase 1 actual effort:** ~1.5h (was estimated ~4-6h after BS-layer discovery; actual much smaller because root cause was a single exempt-list entry, not a sweeping BS-layer rework).

**Next: Phase 2** — match-statechild-parser.ts that converts `armsRaw` → structured `MatchArmEntry[]`, new SYM PASS firing the 4 §18.0.2 diagnostics + E-MATCH-ON-REQUIRED, §34 catalog row for E-MATCH-ON-REQUIRED + §18.0.1 normative bullet. `:`-shorthand body form support is the natural Phase 2 surface since the arm-parser needs to recognize all three body forms anyway (self-closing, bare-body, `:`-shorthand).
