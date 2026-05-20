# Wave 0 Spike — Block-Splitter Mode-Flag Boundary Logic

**Date:** 2026-05-20 (S111)
**Type:** pre-implementation diagnostic spike — READ-ONLY (no compiler source modified)
**Subject:** `compiler/src/block-splitter.js` (2056 LOC, verified live this session)
**De-risks:** DD-3 Q-DD3-C — the highest-variance line item in the scope-(b) estimate
(BS work 12-24h, mode-leak hardening 8-20h)
**Roadmap wave:** Wave 0 — see `IMPLEMENTATION-ROADMAP.md`
**Cost basis being tightened:** DD-3 `quoted-text-model-depth-of-fix-2026-05-20.md`

---

## TL;DR

- **The mode-flag must be a STACK**, not a single field. SPEC §51.0.Q.1 composite
  state-children (a `<state-child>` body containing a nested `<engine>`) make
  code-default bodies legitimately nest. A single boolean cannot represent
  "code-default body inside a code-default body inside plain markup."
- **Good news the spike confirms:** the BS already pushes a real frame for every
  one of the three (b)-loci boundaries. Engine state-children and `:`-shorthand
  bodies enter via `pushTagContext` (a stack push); match arms are captured raw
  inside one `STRUCTURAL_RAW_BODY_ELEMENTS` branch. The boundary-detection points
  already exist as frame lifecycle events — the mode-flag rides the frame stack
  the BS already maintains. This is the single biggest de-risk: **there is no new
  "find the boundary" code to write; the boundary IS a frame push/pop.**
- **Bad news the spike confirms:** the *recognition* of which opener begins a
  code-default body is exactly where the classifier functions misfire today (the
  S93 precedents). Match's recognition path and engine's recognition path are
  **two separate codepaths** (DD-3 C.1 confirmed by line reading) — the mode-flag
  must be set in both, and one of them (engine) currently does NOT capture a
  structured body at all.
- **Tightened estimate: BS line item 13-19h** (down from DD-3's 12-24h);
  **mode-leak hardening 8-13h** (down from 8-20h). Confidence basis below.
- **No blocker surfaced.** One scope clarification is flagged for Wave 1 SPEC
  (the `:`-shorthand recognition locus — see §6 punch-list item 4).

---

## 1. Boundary-detection inventory

The question: which functions / code paths detect entry into and exit from the
three (b)-loci bodies — engine state-child body, match block-form arm body,
`:`-shorthand body — i.e. the points where the code-default mode-flag is
set/cleared.

### 1.1 Engine state-child body — entry/exit

**Recognition path (entry).** `<engine>` is NOT in `STRUCTURAL_RAW_BODY_ELEMENTS`
and NOT in `RAW_CONTENT_ELEMENTS`. It is recognized as a **whitespace-state opener**
— the `< engine>` form — at the `/\s/.test(next)` branch, `block-splitter.js:1908-1968`.
The decisive line is **1962**: `pushTagContext("state", stateName, ...)`. Every
`<engine>`, and every state-child opener inside it (`<Title>`, `<Playing>`, …),
that uses the whitespace-opener form enters via this same branch and the same
`pushTagContext`.

- **Engine frame entry:** line 1962 (`pushTagContext("state", ...)`), reached from
  the `c === "<"` → `/\s/.test(next)` branch at 1908.
- **State-child frame entry:** same line 1962 — a state-child opener `<Title ...>`
  is itself a `< Title>` whitespace-state opener and pushes its own frame.
- **`<onTransition>` / `<onTimeout>` / `<onIdle>` / nested-`<engine>` children:**
  same path — all are `< name>` whitespace-state openers, all push at 1962.
- **Exit:** the matching `</>` (inferred) at `block-splitter.js:1521-1545` →
  `popTagContext("inferred")` at 1543, or `</name>` (explicit) at 1547-1591 →
  `popTagContext("explicit")` at 1585/1589.
- **`pushTagContext` itself:** lines **874-887**. **`popTagContext`:** lines
  **921-934**.

**Caveat — the markup-opener form.** A state-child written WITHOUT the leading
space (`<Title>` rather than `< Title>`) takes the *markup* branch
(`/[A-Za-z_]/.test(next)`, line 1618) and pushes via `pushTagContext("markup", ...)`
at line **1899**. Per the P1 state-as-primary unification (header 36-37), the
`type` distinction (`"markup"` vs `"state"`) is informational; NR resolves the
true kind downstream. **Consequence for the mode-flag:** the flag cannot key off
`frame.type === "state"`. It must be set at the moment the BS *knows* the frame is
an engine/engine-state-child frame — which the BS does NOT cleanly know at push
time (that is the Q-DD3-B entanglement, §2).

### 1.2 Match block-form arm body — entry/exit

**Recognition path (entry).** `<match>` IS in `STRUCTURAL_RAW_BODY_ELEMENTS`
(`block-splitter.js:126-128`). The `<match>` opener is caught at the
`STRUCTURAL_RAW_BODY_ELEMENTS.has(lowerTagName)` branch, **line 1760**, and its
*entire body* is captured as ONE raw `type:"text"` child (the `while` loop
1782-1790 scans to `</match>`; the text node is emitted at 1794-1808). The arm
bodies inside it are NOT scanned by the BS at all — they are re-tokenized later
by `match-statechild-parser.ts`.

- **Match raw-body branch:** lines **1760-1831** (the 71-LOC dispatch DD-3 §C.1
  named — verified: opener-classified at 1760, body scan 1782-1790, text emit
  1794-1808, closer 1810-1820, block emit 1821-1831).
- **Arm body entry/exit:** **not detected by the BS today.** There is no BS-level
  arm-body boundary. `match-statechild-parser.ts` finds arm openers / arm closers
  / `:`-shorthand terminators by re-scanning `armsRaw`.

**Consequence for scope (b).** This is the branch DD-3 says is "replaced" — the
71-LOC raw capture becomes a real code-default body scanner that emits structured
arm child blocks. The mode-flag for match arms therefore does NOT ride an existing
frame push — Wave 2 must *create* the arm-frame push that does not exist yet. This
is the single largest piece of genuinely-new BS code in (b).

### 1.3 `:`-shorthand body — entry/exit

**Recognition path.** There is **no dedicated BS code path for `:`-shorthand
today.** A `:`-shorthand arm/state-child (`<Variant> : expr`) is, at the BS level:
a `<Variant>` opener (pushes a frame at 1899 or 1962) followed by text content
`: expr` followed by a sibling opener or `</>` closer. The `:` and the RHS
expression accumulate as plain `type:"text"` via the default text branch
(`beginText()` at 2020). The `:`-shorthand "body" is recovered downstream by
`multi-statement-scan.ts` (scans `bodyRaw`) and by `match-statechild-parser.ts`
(for match arms).

- **`:`-shorthand body entry/exit:** **not detected by the BS today.** The `:`
  is not a boundary token at the BS level — it is ordinary text.

**Consequence for scope (b).** The `:`-shorthand body is the trickiest of the
three because its "body" has no opener delimiter and no closer delimiter — it is
bounded by `:` on the left and "next sibling decl / parent `</>`" on the right.
DD-2's named "`:`-shorthand vs full-body shape confusion" lives precisely here.
The mode-flag for a `:`-shorthand body is a *scoped sub-mode* inside an already-
code-default body (an engine or match body): once inside a code-default body, a
`:` after a state-child/arm opener begins a single-expression code-default run
terminated by newline/sibling. **It is not a separate stack frame** — it is a
within-body scan state. See §4.

### 1.4 Inventory summary table

| Locus | Entry detection (today) | Exit detection (today) | Mode-flag set point (proposed) |
|---|---|---|---|
| Engine body / state-child body | `pushTagContext` @ 1962 (ws-opener) or 1899 (markup-opener) | `popTagContext` @ 1543/1585/1589 | On frame push, **once the opener is classified engine-family** (§2) — push a body-mode entry |
| Match arm body | none — raw-captured @ 1760-1831 | none | Wave 2 builds the arm-frame push to replace the raw branch; mode set there |
| `:`-shorthand body | none — `: expr` is plain text | none | Within-body sub-mode: `:` token after an arm/state-child opener inside an already-code-default body |

---

## 2. Classifier-function entanglement (Q-DD3-B)

DD-3 found the 5 classifier functions are not purely text-vs-code — they also
resolve markup-vs-state-declaration. For each: does the code-default mode-flag
interact with it, and how?

| # | Fn | Lines | Interacts with mode-flag? | Disposition |
|---|---|---|---|---|
| 1 | `isAfterTransitionArrow` | 276-303 | **No direct interaction.** Resolves `< Target>` in a `name(...) => <Target>` transition decl — a *transition-target-vs-state-push* question inside a state body. Runs unchanged. **BUT** — it runs *inside* an engine state body, which under (b) is code-default. The transition-arrow `=>` is code; this classifier keeps the `< Target>` as text today. Under (b) the target is an identifier (code), not text. The classifier's *output bucket* changes (text → code) but its *detection logic* does not. | **Runs unchanged**; its consumers (the `transitionBodyPending` flag, 1507/1934) must treat its captured run as code-default, not text. Low-risk: the run is already structured (`< Target>` + `{...}`). |
| 2 | `peekTopLevelStateDeclSignal` | 529-582 | **Indirect.** Detects `<NAME> = …` / `<NAME>: T` at top level / program / page / channel body. These loci are NOT (b)-loci — `<program>`/`<page>`/`<channel>` bodies stay free-text/default-logic. The flag does not change this fn's behavior. | **Runs unchanged.** Mode-flag must NOT be set for program/page/channel bodies — they are not (b)-loci. |
| 3 | `peekCompoundStateDeclSignal` | 610-632 | **Indirect** — delegates to #4. Same loci as #2. | **Runs unchanged.** |
| 4 | `classifyOpenerForCompoundScan` | 670-753 | **This is the entanglement.** It classifies an opener as `state-decl` / `compound` / `markup` / `self-close`. It is the BS's single best "what shape is this opener" primitive. The mode-flag needs *exactly this kind of classification* to know an opener begins an engine/match body — but this fn is scoped to the compound-lift question, not to engine/match recognition. | **Runs unchanged for its current callers.** Wave 2 should *reuse its opener-skip logic* (the balanced attr scan, 678-715) for the new code-default scanner — DD-3 C.1's "generalizes existing code" point. Do NOT extend this fn; extract/share the opener-skip. |
| 5 | `scanCompoundBlockEnd` | 766-833 | **No interaction.** Forward-scans for a compound's `</>`. Compounds are a program/page/channel-body concept, not a (b)-locus. | **Runs unchanged.** |

**Q-DD3-B verdict.** The mode-flag interacts with **zero** of the 5 classifiers
*behaviorally* — none needs to become mode-aware. The entanglement DD-3 flagged is
real but narrower than feared: it is that the *recognition of an engine/match
opener* (the point where the flag is SET) is a classification problem of the same
family these 5 functions solve, and the BS has **no single shared opener-classify
primitive** — the duplication DD-1 §1.1.a called out (`classifyOpenerForCompoundScan`'s
own comment, line 677, admits it "mirrors `peekTopLevelStateDeclSignal`'s pattern").
Wave 2's risk is not "make the classifiers mode-aware" — it is "add a *sixth*
recognition site (engine/match code-default-body recognition) without it drifting
out of sync with the 5 that already exist." **Recommendation: Wave 2 extracts a
single `skipOpener(p) -> {name, attrs, selfClosing, afterOpener}` primitive and
the new code-default-body recognition uses it.** That both de-duplicates and
prevents the new recognition from being a 6th independent re-implementation of
attribute balancing.

---

## 3. Mode-leak failure modes

Concrete enumeration of how the flag could be set wrong. For each: whether an
existing BS mechanism already mishandles the analogous boundary.

### ML-1 — body entered without the flag set (false-free-text)

A state-child body that should be code-default is scanned as free text. Display
text would not require quotes; bare identifiers would be mis-bucketed as text.

- **Analogous existing failure: YES — S93-Bug 2.** `const Name = <markup>`
  component-def split: the BS cut the logic part from the markup part because it
  did not know the body was code-bearing. Same shape: BS failed to recognize a
  code-default region. The fix was a `${...}` wrapper workaround — exactly the
  defensive shape the ouroboros warns against.
- **Trigger in (b):** the markup-opener form of a state-child (`<Title>` not
  `< Title>`, §1.1 caveat) — if mode-set keys off `frame.type === "state"`, the
  markup-opener-form state-child silently enters free-text mode. **This is the
  single most likely (b) regression.** Mitigation: §4 — mode-set must NOT key off
  `frame.type`.

### ML-2 — flag not cleared on body exit (mode-leak-forward)

A code-default body's mode persists past its `</>` into a following plain-markup
sibling. Plain prose after the engine would suddenly demand quotes.

- **Analogous existing failure: YES — the `isStructuralDeclSignal` bug**
  (DD-1 §1.1.b item 5, comment at `block-splitter.js:1352-1362`): `<sending> =
  false` inside a `${}` body leaked `tagNesting` into a sibling `!{...}` handler.
  Same class: a per-region count not correctly scoped to the region.
- **Mitigation:** if the flag is a stack entry pushed in `pushTagContext` and
  popped in `popTagContext` (§4), exit-clear is *automatic and structural* — the
  pop removes the entry. The leak-forward mode is only possible if the flag is a
  free-standing field manually cleared. **This failure mode is the primary
  argument for the stack over a flag** — see §4.

### ML-3 — nested code-default bodies (the §51.0.Q.1 case)

SPEC §51.0.Q.1 (verified live, SPEC.md:23319-23360): a composite state-child is a
state-child whose body **contains a nested `<engine>`**. The SPEC's own example
nests three levels: `<engine for=AppMode>` → `<Playing>` state-child body →
`<engine for=PlayMode>` → `<Battle>` state-child body → `<button>` markup.

- A single boolean cannot represent this. When the inner `<engine>`'s `</>`
  closes, the mode must return to the *outer* engine's code-default — not to
  free-text, and not stay-inner. `true → false` on the inner close is wrong;
  `true → true` is wrong if the outer engine is itself inside plain markup.
- **Analogous existing failure: NONE directly** — but `orphanBraceDepth`
  (`block-splitter.js:223`, a *depth counter* not a flag) exists precisely
  because brace-bodies nest and a boolean could not track them. `orphanBraceDepth`
  is the in-file precedent that **nesting requires a counter/stack, not a flag.**
  The mode-flag faces the identical structural requirement.
- **Also nests:** plain markup inside a code-default body. The `<button>` in the
  SPEC example — `<button onclick=${...}>Fight</button>` inside `<Exploring>` —
  is a plain-markup element inside a code-default body. Its body (`Fight`) is
  free-text (plain markup, untouched by (b)). So the stack must also push a
  *free-text* entry when a plain-markup element opens inside a code-default body.
  The stack is not "code-default depth" — it is "body-mode per frame."

### ML-4 — `:`-shorthand vs full-body shape confusion

`<Variant> : expr` (`:`-shorthand, no closer) vs `<Variant> ... </>` (full body,
closer required). If the BS enters a `:`-shorthand as a full-body frame it will
hunt a non-existent `</>` and consume following siblings; if it treats a full body
as `:`-shorthand it terminates early.

- **Analogous existing failure: YES — and it is the explicit reason
  `STRUCTURAL_RAW_BODY_ELEMENTS` exists.** `block-splitter.js:99-103` verbatim:
  the raw-capture "eliminat[es] the `:`-shorthand vs bare-body shape-confusion
  that would otherwise fire E-CTX-003 on arm-children like `<Variant> : expr`
  (where the `<Variant>` opener has no closer because `:`-shorthand IS the body
  terminator)." The BS *today* dodges this by not scanning match bodies at all.
- **Trigger in (b):** Wave 2 *removes* that dodge (the raw branch becomes a real
  scanner). The shape-confusion the raw-capture was invented to avoid comes back
  and must be solved for real. Mitigation: the code-default scanner, on seeing an
  arm/state-child opener `>`, peeks the next non-whitespace token: `:` → single-
  expression `:`-shorthand sub-mode (no frame push, terminate at newline/sibling/
  parent-close); anything else → full-body frame (push, expect `</>`). This peek
  is the same shape as `peekTopLevelStateDeclSignal`'s post-`>` peek (572-581) —
  reuse that pattern.

### ML-5 — quoted literal spanning a structural token (false boundary)

A `"..."` display-text literal containing `</>` or `<Tag>` or `${`-like text. If
the literal scanner is not delimiter-correct, a `<` inside a quote ends the body.

- **Analogous existing failure: YES — S93-Bug 3 / Bug 3-adjacent**: `${ident}`
  inside a backtick template literal mis-read as a new logic block; `<!-- -->`
  inside a `${}` component-def body mis-handled. Both are "a structural token
  inside a delimited run was recognized when it should have been inert."
- **Mitigation:** the `"..."` literal scanner must be delimiter-to-delimiter and
  recognize ONLY `"` (close) and `${` (interpolation, Q-QT-1 Option A) inside it.
  DD-3 §Layer-1 names the precedent: the `_inBacktick` machinery (1118-1160) is a
  working delimited-run scanner with `${}` interpolation-depth tracking. Re-home
  that pattern. This is well-precedented and low-risk *if* the scanner is built
  on `_inBacktick`'s shape rather than from scratch.

### ML-6 — code-default body opener mis-recognized (false-positive entry)

A plain `<p>` body entered as code-default — every word of prose would demand
quotes.

- **Analogous existing failure: YES — S93-Bug 1** (`//` in `<p>` markup mis-parsed
  as a logic comment) and **Bug 4** (`?{` in `<p>` prose opened a phantom SQL
  context). Both are "a plain-markup body had a code construct falsely recognized."
- **Mitigation:** mode-set fires ONLY when the BS positively identifies an
  engine-family or match opener. The default is free-text. A false-positive
  requires the recognition predicate to misfire *toward* code-default — keep that
  predicate narrow and explicit (a closed name set + structural shape), never a
  loose heuristic.

### 3.7 Failure-mode summary

5 of 6 mode-leak failure modes (ML-1, ML-2, ML-4, ML-5, ML-6) have a **direct
existing-bug precedent** in the BS — confirming DD-3 Q-DD3-C: body-boundary
detection is exactly where the BS already fails. ML-3 (nesting) has no direct
bug precedent but has a direct *architectural* precedent (`orphanBraceDepth` is a
counter because a flag could not nest). **The precedents are not a reason to
expect (b) to fail — they are a map of exactly which test cases Wave 7 must
write** (§6 punch-list). The mitigations for ML-1/ML-2 (don't key off
`frame.type`; use a stack so exit-clear is structural) eliminate the two
highest-likelihood modes by construction.

---

## 4. Recommended mode-flag architecture

### 4.1 Rule: STACK, not a single flag

**Decision: a body-mode stack.** SPEC §51.0.Q.1 makes code-default bodies nest
arbitrarily deep (engine → state-child → nested engine → state-child → …), and
plain-markup elements nest *inside* code-default bodies (the `<button>` in the
SPEC example). A single boolean cannot represent the 3+ distinct mode states a
single cursor position can be in. The in-file precedent is unambiguous:
`orphanBraceDepth` is a depth counter, not a flag, for exactly this reason —
nesting defeats booleans.

### 4.2 Where it lives

**Ride the existing frame stack — do not add a parallel structure.** The BS
already maintains `stack` (line 201), pushed by `pushTagContext`/`pushBraceContext`
and popped by `popTagContext`/`popBraceContext`. Add one field to the frame
object:

- `frame.bodyMode: "free-text" | "code-default"` — set at frame-push time,
  read by the main scan loop.

The "stack" is then not a new data structure — it is the frame stack that already
exists. `bodyMode` of the current body = `topFrame().bodyMode` (with
`rootBlocks` / no-frame = `"free-text"`). This is the cleanest possible shape:
**exit-clear is automatic** (the frame pops, ML-2 cannot occur), **nesting is
automatic** (each frame carries its own mode, ML-3 is handled by construction),
and there is no separate stack to keep in sync with the frame stack.

A helper — `function currentBodyMode() { const f = topFrame(); return f ? f.bodyMode : "free-text"; }` — parallels the existing `topIsBraceContext()` accessor (240-247).

### 4.3 How it is set

`pushTagContext` (874-887) gains a `bodyMode` parameter. The mode of the body the
new frame opens is decided by the caller, at the recognition site, by this rule:

1. **The new frame is an engine or engine-state-child opener** → `bodyMode =
   "code-default"`. (Recognition: see §4.5.)
2. **The new frame is a match arm opener** (inside the new code-default match
   scanner Wave 2 builds) → `"code-default"`.
3. **The new frame is a plain-markup element** (`<p>`, `<button>`, `<div>`,
   any non-engine/non-match tag) → `"free-text"` — *regardless of the parent's
   mode.* A `<button>` inside `<Exploring>` opens a free-text body. This is what
   makes ML-3's "plain markup inside code-default" correct.
4. **`pushBraceContext`** (`${...}` etc.) → unaffected; brace contexts have their
   own scan rules. `bodyMode` is a markup/state-frame concept only.

Critically — per §1.1's caveat and ML-1 — **the mode is decided by the
recognition site, NOT by `frame.type`.** Both `pushTagContext("state", ...)` at
1962 and `pushTagContext("markup", ...)` at 1899 can open an engine-family body;
both must pass `bodyMode` computed from the opener name/shape, not from the
`"state"`/`"markup"` type tag.

### 4.4 How it is cleared

It is not cleared — it is *popped*. `popTagContext` removes the frame; the body
mode in effect reverts to `topFrame().bodyMode` automatically. There is no manual
clear, so ML-2 (leak-forward) is structurally impossible. This is the decisive
advantage of riding the frame stack.

### 4.5 The recognition predicate (the one genuinely new classification)

The flag is only as correct as the predicate that decides "this opener begins a
code-default body." Recommended shape, narrow and explicit:

- **Engine:** opener name is `engine` (closed match). `<engine>` body →
  code-default. Every direct child opener of an `<engine>` frame is a state-child
  → its body is code-default. (`<onTransition>` / `<onTimeout>` / `<onIdle>` are
  engine-structural children — also code-default bodies.)
- **Match:** opener name is `match` (already the `STRUCTURAL_RAW_BODY_ELEMENTS`
  member). Every direct child opener of a `<match>` frame is an arm → code-default
  body.
- **The predicate is: `parentFrame.bodyMode === "code-default"` OR
  `openerName ∈ {engine, match}`.** A code-default body's direct children are
  code-default *unless* they are plain-markup elements — and the distinguisher
  there is: an engine state-child / match arm opener is followed (after `>`) by
  `:`, `rule=`/`effect=` attributes, a `</>`-closed body of code, or a `<engine>`
  child; a plain-markup element is an HTML/component tag. **This is exactly the
  ML-4 post-`>` peek** and the `peekTopLevelStateDeclSignal` pattern (572-581).

Reuse, do not re-invent: extract the `skipOpener` primitive (§2 recommendation)
so this predicate and the 5 existing classifiers share one attribute-balancing
implementation.

### 4.6 How it rides the `STRUCTURAL_RAW_BODY_ELEMENTS` pattern

DD-3 said (b) "generalizes that 71-LOC dispatch." Concretely: the branch at
1760-1831 currently does "capture body as one raw text run." Wave 2 replaces the
*body* of that branch with "scan body as a code-default body" — i.e. instead of
the `while` loop at 1782-1790 that blindly scans to `</match>`, the branch pushes
a code-default frame and lets the main scan loop handle the body (recognizing arm
openers, `:`-shorthand, `"..."` literals, `${}` interpolation, nested markup).
The `STRUCTURAL_RAW_BODY_ELEMENTS` Set survives as the *recognition trigger* — it
is no longer "elements whose body is raw" but "elements whose body is code-default"
(rename suggested: `CODE_DEFAULT_BODY_ELEMENTS`). Engine is NOT added to that Set —
engine keeps its whitespace-opener recognition path (§1.1); the two paths both set
`bodyMode` but via their own recognition (the DD-3 C.1 "two recognition codepaths"
fact, confirmed).

### 4.7 `:`-shorthand — a sub-mode, not a frame

Per §1.3 and ML-4: a `:`-shorthand body is NOT a stack frame. Inside an already-
code-default body, when the scanner sees an arm/state-child opener whose post-`>`
peek is `:`, it enters a single-expression code-default run terminated by the next
newline / sibling-opener / parent-`</>`. This is a within-loop scan state
(a local `inColonShorthand` plus the terminator rule), not a `bodyMode` stack
entry. It inherits code-default-ness from the enclosing frame; it does not need
its own stack slot. Keeping it OUT of the stack avoids a spurious unmatched-frame
class (`:`-shorthand has no `</>`, so a frame for it would always look unclosed).

---

## 5. Tightened estimate

DD-3 line items being tightened: **`block-splitter.js` mode-flag + literal
scanner — 12-24h**; **integration / mode-leak hardening — 8-20h** (the
8h-of-variance Q-DD3-C names).

### 5.1 What the spike removes from the high end

| DD-3 high-end risk | Spike finding | Effect on estimate |
|---|---|---|
| "mode-flag needs new BS infrastructure" | The flag rides the *existing* frame stack — one `bodyMode` field on the frame object + one accessor. No new data structure. | Removes the top ~5h of the BS range. |
| "mode-leak hardening runs long" (exit-clear, nesting bugs) | ML-2 (leak-forward) and ML-3 (nesting) are eliminated *by construction* with the stack-on-frame shape — they cannot occur, so they cannot consume debug time. | Removes the top ~7h of the mode-leak range. |
| Boundary-detection is new code | 2 of 3 loci (engine, `:`-shorthand) already enter via an existing frame push / are already plain text; the mode-set is a parameter on an existing call. | Confirms low end is reachable. |

### 5.2 What the spike confirms stays at risk (keeps the range non-trivial)

| Residual risk | Why it stays |
|---|---|
| The match raw-capture branch (1760-1831) must be *rebuilt* as a real code-default scanner — genuinely new code, the arm-frame push does not exist. | ~6-9h irreducible — this is real new scanner code. |
| The `"..."` literal scanner — well-precedented (`_inBacktick`) but new; `${}`-inside-literal interaction with the tokenizer is the Wave 3 seam. | ~4-6h; precedent caps it. |
| ML-4 (`:`-shorthand vs full-body) and ML-5 (`<` inside a quote) are real and have bug precedents — the recognition predicate and literal scanner must be exactly right; this is where Wave 7 hardening time goes. | ~5-8h hardening — bounded by knowing the 6 failure modes up-front. |
| The recognition predicate is the one new classification (§4.5); the §2 risk (drift from the 5 classifiers) is real if `skipOpener` is not extracted. | Mitigated by the extract-`skipOpener` recommendation; ~2h to extract. |

### 5.3 Tightened intervals

- **`block-splitter.js` mode-flag + literal scanner: 13-19h** (DD-3: 12-24h).
  Low end essentially unchanged (the spike confirms it is reachable); high end
  pulled in ~5h because the "new infrastructure" risk is retired — the
  infrastructure (frame stack) exists.
- **Mode-leak hardening: 8-13h** (DD-3: 8-20h). High end pulled in ~7h because
  ML-2 and ML-3, the two open-ended "where did the mode go" debug classes, are
  eliminated by the stack-on-frame architecture. The residual 8-13h is ML-4/ML-5/
  ML-6 hardening — bounded work against a known list of 6 failure modes with
  known test cases.

**Confidence basis.** Medium-high. The estimate rests on three *verified* source
facts, not projections: (1) the frame stack exists and every engine/`:`-shorthand
boundary is already a frame push/pop or plain text (lines 1899/1962/1543/1585
read directly); (2) the match branch is a single contiguous 71-LOC block
(1760-1831 read directly) — a bounded replacement target, not a diffuse change;
(3) the 5 classifiers need zero behavioral change (§2, each read). The residual
uncertainty is concentrated in *new* code (the match arm scanner, the literal
scanner) where estimation is inherently softer — hence a 6h-wide band remains
rather than a point estimate.

Aggregate effect on the DD-3 scope-(b) total: the two tightened line items move
the relevant slice from `(12+8)=20h .. (24+20)=44h` to `(13+8)=21h .. (19+13)=32h`
— the **headline scope-(b) range tightens from ~79-167h toward ~80-155h**, and
the high-variance tail DD-3 flagged is the part that shrinks. Midpoint moves only
slightly (~120h → ~115h); the value of the spike is *variance reduction*, which
is what Wave 0 was for.

---

## 6. Wave-2 dispatch punch-list

Carry this into the Wave 2 dev-pipeline brief.

1. **Mode-flag shape — frame-stack-resident, not a field.** Add
   `frame.bodyMode: "free-text" | "code-default"` to the object built by
   `pushTagContext` (`block-splitter.js:874-887`). Add a `currentBodyMode()`
   accessor next to `topIsBraceContext()` (240-247). Do NOT add a parallel stack
   or a free-standing flag. Exit-clear is the existing `popTagContext` pop.

2. **`pushTagContext` signature.** Add a `bodyMode` parameter. Both call sites —
   markup-opener `pushTagContext("markup", ...)` at **1899** and whitespace-opener
   `pushTagContext("state", ...)` at **1962** — must compute and pass it. **The
   mode must NOT be derived from the `"markup"`/`"state"` type tag** (§1.1 caveat,
   ML-1) — derive it from the opener name + the recognition predicate (§4.5).

3. **Recognition predicate.** `bodyMode = "code-default"` iff `openerName ∈
   {engine, match}` OR (`currentBodyMode() === "code-default"` AND the opener is
   not a plain HTML/component markup element). Plain-markup elements opened inside
   a code-default body get `"free-text"` (the `<button>` in the SPEC §51.0.Q.1
   example). Keep the predicate narrow and name-set-based — never a loose
   heuristic (ML-6).

4. **`:`-shorthand is a sub-mode, not a frame.** Do not push a frame for a
   `:`-shorthand body. Inside a code-default body, on an arm/state-child opener
   whose post-`>` non-whitespace peek is `:`, scan a single-expression code-
   default run terminated by newline / sibling-opener / parent-`</>`. Reuse the
   post-`>` peek shape from `peekTopLevelStateDeclSignal` (572-581).
   **SPEC dependency:** confirm with Wave 1 whether `:`-shorthand recognition
   needs any new BS-visible signal or is fully a within-body scan concern — this
   is the one open scope question the spike flags for the SPEC amendment.

5. **Replace the match raw-capture branch (1760-1831), do not extend it.** The
   `while`-scan-to-`</match>` (1782-1790) and the single raw `type:"text"` child
   (1794-1808) become: push a code-default frame, let the main scan loop handle
   the body, emit structured arm child blocks. The match arm-frame push is genuine
   new code — it does not exist today. Rename `STRUCTURAL_RAW_BODY_ELEMENTS` →
   `CODE_DEFAULT_BODY_ELEMENTS` (still `{match}`; engine stays on its own
   whitespace-opener path — do NOT add `engine` to the Set).

6. **Extract a shared `skipOpener` primitive.** `peekTopLevelStateDeclSignal`
   (529-582), `classifyOpenerForCompoundScan` (670-753), and the brace-context
   tag peek (1314-1351) each re-implement attribute balancing. The new code-
   default-body recognition would be a 4th. Extract one
   `skipOpener(p) -> {name, selfClosing, afterOpener}` and have the new
   recognition use it — prevents the Q-DD3-B drift risk (§2).

7. **`"..."` literal scanner — re-home `_inBacktick` (1118-1160).** Build the
   display-text literal scanner on the `_inBacktick` delimited-run + `${}`-interp-
   depth pattern, not from scratch. Recognize ONLY `"` (close) and `${`
   (interpolation) as significant inside the literal (ML-5).

8. **The 5 classifier functions (276-303, 529-582, 610-632, 670-753, 766-833)
   need ZERO behavioral change.** Do not make them mode-aware. They serve plain
   markup / program-page-channel bodies (non-(b)-loci). Leave them.

9. **Mode-leak test cases for Wave 7** (each maps to a §3 failure mode with a
   real bug precedent — write a regression test per row):
   - **ML-1:** a state-child written in markup-opener form (`<Title>` no space)
     inside an `<engine>` — body must be code-default (precedent: S93-Bug 2).
   - **ML-2:** plain prose in a `<p>` immediately after an `<engine>...</>`
     closes — must be free-text, no quote demanded (precedent: `isStructuralDeclSignal`
     leak).
   - **ML-3:** the SPEC §51.0.Q.1 nested-engine example verbatim — outer engine
     code-default, inner engine code-default, `<button>` body free-text, and after
     the inner `</>` the outer is still code-default (precedent: `orphanBraceDepth`
     architectural).
   - **ML-4:** a match with mixed `:`-shorthand arms and full-body arms in one
     block — neither shape consumes the other (precedent: the bug
     `STRUCTURAL_RAW_BODY_ELEMENTS` was invented to dodge, comment 99-103).
   - **ML-5:** a `"..."` display-text literal containing `</>` and `<Tag>` and a
     literal `${`-looking sequence — the literal does not end early (precedent:
     S93-Bug 3).
   - **ML-6:** a plain `<p>` body with prose containing `//`, `?{`, `/` — must
     NOT be recognized as code-default (precedent: S93-Bug 1, Bug 4).

---

## 7. Blockers

**None.** No blocker prevents Wave 1 (SPEC) or Wave 2 (BS) from proceeding.

One scope clarification for Wave 1, not a blocker: punch-list item 4 — whether
`:`-shorthand recognition needs any new BS-visible structural signal, or is
entirely a within-body scan concern. The spike's reading is the latter (it is a
sub-mode, §4.7), and Wave 2 can proceed on that basis; the SPEC amendment should
state the `:`-shorthand body grammar explicitly enough to confirm it.

---

## Tags

#spike #wave-0 #quoted-text-model #block-splitter #mode-flag #Q-DD3-C #s111
#scrmlTS #implementation #active
