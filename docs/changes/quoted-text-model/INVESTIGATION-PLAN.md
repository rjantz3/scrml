# Quoted-Text Model — Investigation Plan

**Status:** CLOSED — investigation complete. **Go/no-go: GO at scope (b), v0.4** (S111).
Implementation track now lives in `IMPLEMENTATION-ROADMAP.md` (sibling).
**Opened:** S110, 2026-05-20
**Working name:** "quoted-text model" (rename freely)
**Owner:** scrmlTS PA + the language designer

## The change under investigation

Today scrml markup-element bodies are **free text by default**. The block-splitter
("BS" layer, `compiler/src/block-splitter.js`) scans free text and *heuristically*
recognizes embedded code tokens (`${...}`, `<tag>`, `?{`, quote-delimited strings,
`/` closers). Misclassification is the root cause of a recurring bug class — Bug 2
(unpaired quote ate the file), Bug 4 (`?{` opened phantom SQL), the bare-`/`
`looksLikeCloser` heuristic. Each has been patched case-by-case.

The proposal: **display text becomes an explicit string literal.** `<state>"and"</>`
displays the string `and`; bare `<state>and</>` is code — a keyword or identifier.
This inverts the default — bodies are code, display text is the quoted exception —
making the text/code boundary explicit instead of heuristic.

Rationale (designer, S110):
- Eliminates the misclassification bug class at the root rather than patching cases.
- It is the V5-strict move applied to the text/code boundary — a mandatory visible
  marker kills a heuristic, exactly as `@` did for state access.
- More consistent with Pillar 1 (markup-as-value): bodies become uniform value
  sequences; the special "text run" node kind disappears.
- Prior art: Elm's `Html` (`text "..."`).
- Acknowledged cost: ceremony on the most common content (display text) — the
  "80% tax." Designer has weighed and accepted this in principle; quotes are
  keystroke-cheap, the residual cost is visual density, not typing effort.

## Decisions locked (S110)

| Decision | Resolution |
|---|---|
| Scope — all-bodies vs code-bearing-only | **Test both.** DD-1 + DD-2 evaluate all-display-text-language-wide AND code-bearing-bodies-only (engine state-children / match arms / `:`-shorthand) side by side; the debate picks. |
| Version horizon | **Decide after DD-3.** No version pre-committed; the depth-of-fix estimate sets v0.4 vs v1.0. Self-host is post-v1.0 and a from-scratch scrml rewrite — doing this before then is far cheaper; "much later" is off the table. |

## The program — 5 phases

### Phase 1 — DD-1: Current friction + prior art — COMPLETE (S110)
`scrml-deep-dive` (background). Output → `scrml-support/docs/deep-dives/quoted-text-model-friction-and-prior-art-2026-05-20.md` (816 lines).
**Bottom line:** the problem clears the bar for a fundamental change — structural
(12 BS heuristic mechanisms = the block-splitter's architecture), recurring (8
misclassification bugs, 1 still open; new ones arrive from routine work), measured
adopter-side (~3,849 entity-escapes, 83% of files), and already named as technical
debt inside the compiler (`engine-statechild-parser.ts`'s header documents its own
retirement condition).
**Scope finding (load-bearing):** the *measured* friction (12 heuristics / 8 bugs /
4 raw-text deferrals) is concentrated in code-bearing bodies, not `<p>` prose — it
justifies scope-variant **(b) code-bearing-only** on its own terms ((b) directly
retires the `engine-statechild-parser.ts` + `match-statechild-parser.ts`
re-tokenizers). Scope-variant **(a) all-bodies** is coherent but rests on a
consistency / Pillar-1 argument the friction data does not supply — (a) must be
argued, not assumed.

### Phase 2 — DD-2: Design space — COMPLETE (S110)
`scrml-deep-dive` (background). Output → `scrml-support/docs/deep-dives/quoted-text-model-design-space-2026-05-20.md` (1458 lines).
**All 6 design questions resolved → 16 named options, each with scrml syntax sketches.**
**Load-bearing finding — the 6 questions are not 6 forks.** Q-QT-2 (whitespace),
Q-QT-4 (`<pre>`), Q-QT-5 (BS inversion) pair *deterministically* with the scope choice
— the cross-pairings are incoherent. The debate collapses to: the **scope master fork**
(a vs b) carrying Q-QT-2/4/5, + **interpolation** (Q-QT-1) as the one independent fork,
+ Q-QT-3 (quote char) as a short slice.
**Reframe — (b) is the genuinely-novel design, not the "safe" one.** No language has
shipped a within-one-language code/text-default split; (b) IS that split. (a) has
whole-language prior art (Elm, F# Feliz). The debate weighs measured-friction (favors b)
against coherence-and-precedent (favors a).

### Phase 3 — Debate cluster — COMPLETE (S111)
4-way debate run S111 via the `debate` skill: `elm-expert` (scope a / Pillar-1 carrier),
`jsx-expert` (scope b / free-text-for-prose defender), `simplicity-defender` (80%-tax
skeptic / smallest-coherent-version), `clojure-expert` (homoiconic-mechanism voice).
`debate-judge` scored + recorded a design insight to `~/.claude/design-insights.md`.
**Scorecard totals:** clojure 49.0 · jsx 47.5 · elm 46.5 · simplicity-defender 45.0.
**Verdict on the three sub-questions:**
- **Q-QT-3 (quote char) — SETTLED 4-0: `"` only.** Every expert independently rejected
  the both-quotes option as a Bug-2 regression. Closed.
- **Q-QT-1 (interpolation) — LEANS Option A (inside-the-string).** clojure-expert's
  syntax-quote/unquote argument decisive; sibling form fragments a sentence + reinvents
  JSX's `{' '}` seam. Couples to the scope outcome.
- **Q-QT-6 (scope) — verdict WEIGHT favors scope (b), code-bearing-only.** No expert
  disputed the friction data; the data justifies (b) on its own terms. Even
  clojure-expert (lineage most favors uniformity) declined to let homoiconicity settle
  scope, calling (b) "the Lisp bet correctly applied." elm-expert's (a) case is honest
  but rests on coherence, not friction count. **Two caveats ride the (b) verdict:** (b)
  is genuinely unprecedented (no within-one-language Camp-A/Camp-B split has shipped),
  and (b) accepts one permanently-unfixable residual heuristic bug ("Broad-C" bare-`/`).
**Design insight recorded:** mechanism vs scope are two separate decisions — friction
data decides scope; teach-time simplicity is routinely mistaken for use-time simplicity.

### Phase 4 — DD-3: Depth-of-fix — COMPLETE (S111)
`scrml-deep-dive` (background). Output →
`scrml-support/docs/deep-dives/quoted-text-model-depth-of-fix-2026-05-20.md` (812L).
Priced BOTH scopes from live source. **Headline:**
- **Scope (b) — ~120h midpoint (~80–167h range) → v0.4.** Bounded: ~45-file migration,
  reliable codemod, hard cutover, `TextNode` survives (no snapshot storm), rides existing
  infra (`STRUCTURAL_RAW_BODY_ELEMENTS`, template-literal machinery, `escapeHtmlText`).
- **Scope (a) — ~255h midpoint (~176–338h range) → v1.0.** BS rewrite + 18-file
  `TextNode`-deletion blast radius + unsized snapshot regeneration + ~893-file migration
  + deprecation window. Must land before the post-v1.0 self-host rewrite — last cheap window.
- **(a)-minus-(b) delta ≈ 135h** — what the designer buys: Pillar-1-made-literal, one
  body grammar, "Broad-C" bug categorically impossible, whitespace fixed language-wide.

**Key findings:** Q-DD1-A — (b) retires only ~0.5–1.5 of 12 BS heuristics (its real
benefit is ~900–1200 LOC of re-tokenizer scaffolding deleted, NOT heuristics retired);
(a) retires ~4 full + 3–4 shrink. Q-DD1-B — (b) SHRINKS the re-tokenizers (~50–75%), does
NOT delete them; semantic parsing survives as a thin shim. Q-DD2-A — auto-HTML-escape is
cheap (`escapeHtmlText` already exists + wired). Q-DD2-B — `TextNode` deletion touches 18
files / 62 occurrences + unsized snapshot regen. **Material corrections to prior DDs:**
migration corpus is 804 samples / 64 examples / 25 self-host (not "~275"), but (b)'s
*actual* migration is only ~45 files (~20x asymmetry vs (a)'s ~893); the 5 BS classifier
functions are NOT purely text-vs-code (also resolve markup-vs-state-decl) so DD-2's
"delete the heuristic engine" framing is optimistic; BPP / function-body deferral is
orthogonal — neither scope shrinks it.

**New open questions surfaced — see register (Q-DD3-A..D).**

### Phase 5 — Synthesis + go/no-go — CLOSED: GO (S111)
All research phases complete (DD-1 need + DD-2 design + Phase-3 debate verdict + DD-3
cost). **Designer ruling S111: GO at scope (b), v0.4.** The bounded option, not the
maximal (a)/v1.0 one. The investigation is closed; the implementation track is in
`IMPLEMENTATION-ROADMAP.md` (sibling) — locked design, 8-wave decomposition (~120h
midpoint), Wave 0 pre-impl spike dispatched S111. Phase-5 go/no-go recorded verbatim in
`scrml-support/user-voice-scrmlTS.md` Session 111.

## Open-questions register

The designer answers questions as they surface. Live register:

| ID | Question | Status |
|---|---|---|
| Q-QT-1 | Interpolation — `${@x}` inside the quoted string vs a sibling value | DEBATE VERDICT (S111) — LEANS Option A (inside-the-string); DD-3 costs both |
| Q-QT-2 | Whitespace + multi-line text semantics | RESOLVED-BY-COUPLING — pairs deterministically with Q-QT-6; not a standalone fork |
| Q-QT-3 | Quote char — `'` / `"` / both / backtick | SETTLED (S111 debate, 4-0) — `"` only; "both" rejected as a Bug-2 regression |
| Q-QT-4 | `<pre>`/`<code>` subsumption | LARGELY RESOLVED-BY-COUPLING — pairs with scope; minor A-vs-C fork is a designer post-call |
| Q-QT-5 | BS-layer inversion shape | RESOLVED-BY-COUPLING — implementation consequence of scope; → DD-3 detail |
| Q-QT-6 | Scope — all-bodies (a) vs code-bearing-only (b) | DEBATE VERDICT (S111) — weight favors (b); 2 caveats; go/no-go after DD-3 |
| Q-QT-7 | Version horizon | open — DD-3 IN FLIGHT (S111) |
| Q-DD1-A | Per-scope heuristic-retirement count — how many of the 12 BS mechanisms does each scope variant retire? (the concrete depth-of-fix benefit figure) | open — DD-3 |
| Q-DD1-B | Does scope (b) *delete* `engine-statechild-parser.ts` + `match-statechild-parser.ts`, or only shrink them? | open — DD-3 |
| Q-DD1-C | Q-QT-2 (whitespace) and Q-QT-6 (scope) are COUPLED — a quoted string has unambiguous whitespace; a free-text `<p>` does not. Resolve together. | open — DD-2 |
| Q-DD1-D | The quoted-text model may subsume `<pre>`/`<code>` *better* than they currently work (exact-whitespace string literal vs `<pre>`'s indentation leaks) — weigh in Q-QT-4. | open — DD-2 |
| Q-DD1-E | Corpus-ouroboros — any migration tooling (DD-3) must not bake in current defensive shapes; the corpus is an artifact of the OLD model. | open — DD-3 |
| Q-DD2-A/B/C | DD-2 sub-questions — codegen auto-HTML-escape fork / `TextNode`-deletion blast radius / migration strictness | RESOLVED by DD-3 — auto-escape (cheap, `escapeHtmlText` exists); blast radius 18 files/62 occ; (b) hard-cutover / (a) deprecation-window |
| Q-DD3-A | Snapshot-test corpus size (scope a only) — the (a) estimate's least-confident line (12–30h). `grep` `compiler/tests/` fixtures before any (a) go-decision. | open — pre-(a)-implementation scoping |
| Q-DD3-B | The 5 BS classifier functions also resolve markup-vs-state-decl — they shrink, do not fully delete, even under (a). Implementation scoping should confirm how much survives. | open — implementation scoping |
| Q-DD3-C | Mode-leak hardening (scope b) — the BS mode-flag depends on classifiers it does not retire to detect body boundaries; highest-variance line item (8–20h). A pre-impl spike would tighten the (b) estimate. | open — pre-(b)-implementation spike |
| Q-DD3-D | BPP / function-body raw-text deferral is orthogonal — neither scope shrinks it. If the raw-text-deferral problem is wanted solved whole, BPP is a separate investigation. | open — separate investigation if pursued |

New questions append here as the DDs surface them.

## Agent staging

Debates need real expert agents loaded, not synthesized. No `~/.claude/agentStore/`
exists on this machine; agents are PA-authored directly into `.claude/agents/`
(`agent-forge`'s Write step fails in this environment). Staged S110: `elm-expert`,
`jsx-expert`, `clojure-expert` (the homoiconic-mechanism voice — added per DD-2's
roster recommendation). `simplicity-defender` already exists globally. Agent files
load as `subagent_type`s only at next session start — staging now means Phase 3
debates run with real experts.

## Cross-references

- Bug 4 deep-dive (immediate-prior friction precedent) — `scrml-support/docs/deep-dives/bug-4-docs-mode-escape-2026-05-19.md`
- `docs/known-gaps.md` — Bug 2 / Bug 4 entries
- `docs/changes/bs-layer-corpus-friction-bugs/` — prior dispatch dir for this bug family
- `compiler/src/block-splitter.js` — the BS layer
- SPEC §3 (context model), §4 (block grammar), §4.17 (`<pre>`/`<code>` raw-content / S101)

## Tags

#quoted-text-model #investigation #language-design #syntax #DD #debate #s110
