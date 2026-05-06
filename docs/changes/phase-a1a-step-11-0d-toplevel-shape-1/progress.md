# Progress: phase-a1a-step-11-0d-toplevel-shape-1

Tier: T2 (Standard) — multi-file region (BS + ast-builder + samples + tests), no new contracts, no spec changes, contained within parser front-end.

Branch: `phase-a1a-step-11-0d-toplevel-shape-1`
Parent: `06ef8c6` (S61 final curation Batch J commit)

## Baseline

- `bun install`: OK
- `bun run pretest`: OK (12 test samples compiled)
- `bun run test` run-1: 8886 pass / 44 skip / 0 fail / 8930 across 439 files
- `bun run test` run-2: 8886 pass / 44 skip / 0 fail / 8930 across 439 files (matches BRIEF)

## Survey findings

### S1 — Where is BS's top-level statement scan?

`compiler/src/block-splitter.js`:
- `splitBlocks` line 105-1211 — main scanner
- The `<` branch at line 957 dispatches:
  - `</>` inferred close (line 961)
  - `</identifier>` explicit close (line 975)
  - `<#identifier>` worker/state ref (line 1017)
  - `<letter` markup tag (line 1035) → `pushTagContext("markup", ...)`
  - `< whitespace` state opener (line 1088) → `pushTagContext("state", ...)`
  - default raw `<` (line 1140-1142) → `beginText()`

The `<count>` (no-space, lowercase first letter) hits line 1035 → markup tag path. `scanAttributes()` consumes `>`. Then either self-closing leaf emit OR `pushTagContext("markup", "count", ...)`.

There is NO existing gate at top-level (`stack.length === 0`) that examines the post-`>` next non-whitespace char to recognize state-decl signals.

### S2 — What does BS currently emit for `<count> = 0` at top-level?

From source-trace: BS pushes a `markup` context for `<count>`. Subsequent `= 0\n` chars become text accumulated as children of the markup frame. If the file ends without a closing tag, EOF handling at line 1199-1207 emits `E-CTX-003: Unclosed 'count'`. Children are abandoned (the unclosed frame is not emitted as a block).

If `<count>` is followed by something that eventually opens a structure that DOES close (e.g., `<program>`), the markup frame for `count` may still be unclosed at file end → `E-CTX-003`.

If a stray `</>` appears after, it pops the `count` markup context — children including `= 0\n...` text are emitted. Then `buildBlock` produces `{kind: "markup", tag: "count", children: [...text...]}`. This IS the html-fragment mentioned in BRIEF §1.

### S3 — §4.6 PA-001 reach

SPEC §4.6 (lines 465-497): "the block splitter SHALL only recognize `<` as a block delimiter at the top-level markup or state context level — that is, when no brace-delimited context is currently open on the context stack."

PA-001 SUPPRESSES `<` ONLY inside brace-delimited contexts. Top-level is OUTSIDE braces → PA-001 does NOT apply at top-level. Therefore top-level `<count>` IS recognized as a tag opener (current behavior). For Step 11.0d, we need to add a TARGETED exception for top-level state-decls (where post-`>` is `=` or `:` or `{` for compound) without violating §4.6.

### S4 — Step 11.0a compound recognizer at top-level

`tryParseStructuralDecl` (ast-builder.js line 2980) only fires inside `parseLogicBody` and `parseOneStatement` — i.e., inside brace-delimited contexts. It does NOT fire at file top-level. The top-level path is `liftBareDeclarations` → `buildBlock` → switch on `block.type`.

For top-level Variant C compound (`<formRes>\n  <name> = ""\n</>`), BS pushes markup context for `<formRes>`, sees text `<name> = ""\n` (which is itself recognized as a state-decl by BS — wait, but `<name>` would also push a markup context inside the `formRes` frame). The compound case is currently NOT recognized at top-level — it would either error E-CTX-003 or produce nested markup nodes.

### S5 — Existing tests asserting top-level html-fragment fall-through

`grep -rn 'kind.*"html-fragment"' compiler/tests/` from Step 2 progress: 2 files total, both unrelated to the `<NAME>=expr` shape (one is `^{...}` meta-block, one is a comment-only usage). No regression risk on existing html-fragment tests.

### S6 — Discrimination test

For BS, three patterns share the `<NAME ...>` opener:
- `<count> = 0` → state-decl Shape 1 (post-`>` is `=`)
- `<count>: number = 0` → typed-decl (post-`>` is `:`)
- `<formRes>\n  <name> = ""\n</>` → compound (post-`>` is whitespace, then `<` for child)
- `<div>...</>` → markup expression (post-`>` is content text/markup, NOT `=` `:` or `<` immediately)
- `< userBadge name(string)>` → component-def (leading-space-disambiguated; BS sees `< whitespace` branch at line 1088, treats as state opener with name="userBadge")

The component-def is the trickiest. `< userBadge` triggers the state branch at line 1088. Then `pushTagContext("state", "userBadge", ...)` (line 1132). After that, body content is consumed until `</>` close. So component-def is a STATE block in BS terms. We must NOT misclassify component-defs as state-decls. Discriminator: post-`>` next non-whitespace must be `=` or `:` to be a state-decl. Component-def's post-`>` is non-`=` content (the body markup like `<span class="badge">`).

### Decision: locus and mechanism

**Locus.** The cleanest intervention is in BS's `<` branch (lines 1035 markup-tag, 1088 state-opener). Pattern:

After `tagName = readIdent()` and `scanAttributes()` complete (so we know what's between `<` and `>`), and BEFORE pushing tag context, do a top-level peek:

1. If `stack.length === 0` (true top-level — outside any context, including outside `<program>`) — proceed.
2. Skip whitespace from current `pos` (just past `>`).
3. Inspect next char:
   - `=` → top-level state-decl Shape 1 OR Shape 3-derived (the `const` is read via prior text accumulator if any). But since `const <x> = 0` has `const` BEFORE the `<`, BS would have accumulated `const ` as text BEFORE hitting `<`. So `=` after `>` means state-decl.
   - `:` → typed-decl (Shape 1 with type annotation, Step 11.0c form).
   - `<` (immediately) — possible compound Variant C signal (next sibling decl). But could also be sibling markup. Defer compound for now — keep current tag-context behavior; 11.0a recognizer handles compound via `${}` only. **DEFER compound to a future iteration if time-tight.**
4. If signal is `=` or `:`, emit the entire `<NAME [attrs]>` slice as TEXT (don't push context, don't emit markup leaf). The post-`>` `= expr` continues to accumulate as text. The whole `<NAME [attrs]> = expr\n` becomes ONE text block at top-level.

**Lift.** In `liftBareDeclarations`, add a new pattern check: text block content matching `^\s*(?:const\s+)?<\s*[A-Za-z_]` → wrap in `${...}` synthetic logic. The wrapped block flows through `parseLogicBody` → `tryParseStructuralDecl` (already wired for Shape 1/3 via Step 2 + Variant C via 11.0a + typed-decl via 11.0c).

**Const handling.** `const <doubled> = @count * 2` at top-level: BS sees `const ` as text (no special handling), then `<doubled>` triggers our new top-level peek. `const` IS already accumulated in text. So we emit `<doubled>` as text continuation, the whole text block becomes `const <doubled> = @count * 2\n`. The lift pattern `^\s*(?:const\s+)?<` matches (with optional const prefix). Wrapped: `${const <doubled> = @count * 2}`. Inside `${...}`, parseLogicBody's existing `const` branch with the Step 2 `tryParseStructuralDecl(t, true)` hook handles it.

**Compound at top-level.** For now, defer. The 3 Step 12 reverted samples don't use compound at top-level — they use plain Shape 1. So scope: Shape 1 + Shape 3 + typed-decl (Shapes 1/2/3 with `:` type) at top-level. Variant C compound at top-level is OUT-OF-SCOPE for Step 11.0d implementation, but tests should cover it as future-proofing.

Actually re-reading BRIEF §2.1 item 3: "Compound (Variant C) at top-level — likely also needs extension; verify Step 11.0a's recognizer handles top-level OR extend." And §4.2 §S11D.5 lists compound as a positive test. So we need compound TOO.

**Compound at top-level — design.** When BS sees `<formRes>` at top-level and post-`>` is `<` (start of a child decl like `<name>`), we could recognize this as compound. But this requires lookahead through the entire compound body. Cleaner: keep BS's behavior (push markup context for `<formRes>`), then process via `liftBareDeclarations` post-hoc — recognize a markup block whose name matches IDENT pattern AND whose children are all text-with-state-decl-pattern OR markup-blocks-with-state-decl-pattern, and rewrite as compound state-decl wrapped in `${...}`.

That's complex. Cleaner v2: extend BS's top-level peek — if post-`>` next non-whitespace is `<` AND the immediately-following pattern matches a child state-decl signature, emit the entire compound parent as text. Then the lift pattern matches and wraps.

Actually, simplest: extend BS's peek to ALSO match post-`>` whitespace then `<`. If we see `<NAME>` followed by whitespace then `<`, treat as compound — emit the `<NAME>` opener as text. Then text continues accumulating: `\n  <name> = ""\n</>`. The `<name>` inside ALSO triggers the state-decl peek (it's at depth 0 still; no context was pushed). Recursively the entire compound becomes text. The closing `</>` is the inferred-closer trigger — but at depth 0 with no context, line 963's check `if (!frame || ...)` returns early to text-handling.

Wait line 962-967: if `</>` and no frame, it `step()`s through and continues — `</>` becomes text! So the entire compound `<formRes>\n  <name> = ""\n</>` becomes ONE text block. Then lift wraps.

**This is elegant. The fix is:** extend BS's `<letter` markup branch to do top-level peek; when the post-`>` next non-whitespace is `=` OR `:` OR `<` (compound), DO NOT push context and DO NOT emit markup leaf — instead, emit the consumed `<NAME [attrs]>` slice as TEXT (continuing accumulation).

For component-def: `< userBadge name(string)>` is whitespace branch (line 1088). Component-defs typically have `name(string)` typed-attrs, post-`>` is body markup `<span class="badge">`. The post-`>` next non-whitespace is `<`, then... it would match my compound trigger! That's a misclassification risk.

**Discriminator refinement for compound vs component-def:**
- Component-def: `< userBadge name(string) role(Role)>` — opener has TYPED ATTRIBUTES (like `name(string)`, `role(Role)`).
- Compound: `<formRes>` — opener has NO typed attributes (just bare ident).

So at the BS peek site, after `scanAttributes()`, examine `attrRaw`:
- If `attrRaw` is empty (or only whitespace) and post-`>` is whitespace then `<` → compound state-decl candidate.
- If `attrRaw` contains `(` (typed attribute syntax) → component-def, don't trigger.

Or even simpler: only trigger top-level state-decl recognition if attrs are EMPTY and `=`/`<` follows; trigger Shape 2 (decl-with-spec) recognition only if attrs are empty/bare-validators and `:` or `=` follows. Component-defs have non-empty typed-attr signatures.

Actually wait — component-defs use the SPACE-disambiguated state branch (`< userBadge`), not the markup branch. The markup branch (`<count>`) doesn't handle `< userBadge`. So if we ONLY add top-level peek to the markup branch (line 1035) and NOT the state branch (line 1088), component-defs are untouched.

But BRIEF §6 says: "Component-def lookahead. `< userBadge name(string) role(Role)>` (component-def, leading-space-disambiguated per §4.3) must NOT be misclassified as state-decl." This is satisfied automatically if the peek only fires on the markup branch (no-space form).

What about state-decls written with leading space — `< count> = 0`? Per §4.3 disambiguation: leading space classifies as state. Our reverted samples use `<counter>` (no-space), not `< counter>` (space). So restricting peek to markup branch handles the canonical forms.

BUT — Shape 2 examples in SPEC §6.2 use NO leading space: `<userName req length(>=2)> = <input ...>`. So Shape 2 is also markup-branch. Bare validators (`req`, `length(...)`) inside the opener are ATTRIBUTES that scanAttributes consumes. Post-`>` is `=` then bindable markup. We trigger.

**Final decision: only modify BS's `<letter` markup branch (line 1035). The `< whitespace` state branch (line 1088) is left unchanged — that's component-def territory.**

### Implementation summary

1. **BS modification (line 1035-1085):** After `scanAttributes()` returns, before the `if (selfClosing || VOID_ELEMENTS.has(tagName.toLowerCase()))` check, do a top-level peek:
   - Guard: only when `stack.length === 0`.
   - Skip whitespace from current `pos`.
   - If next char is `=` OR `:` OR `<` (with the additional `<` peek refinement to avoid misclassifying ordinary `<div><span>...` markup):
     - For `<` case, additionally look ahead through the next IDENT and `>` — if THAT post-`>` is `=` or `:` or `<` repeatedly, it's structural compound; emit current `<NAME>` as text.
     - Easier safe path: trigger ONLY on `=` and `:` (Shapes 1/3 plain + typed-decl). Defer compound at top-level.
   - When triggered: rewind pos to `curPos` (before the `<`), emit `beginText()`, step past `<` (so accumulation continues), `continue` the main loop. Then text accumulator absorbs `<NAME [attrs]> = expr\n`.

2. **liftBareDeclarations modification (line 904 area):** Add new pattern check before the BARE_DECL_RE check:
   ```js
   const TOPLEVEL_STATE_DECL_RE = /^\s*(?:const\s+)?<\s*[A-Za-z_]/;
   if (block.type === "text" && parentType !== "markup" && TOPLEVEL_STATE_DECL_RE.test(block.raw)) {
     result.push({ type: "logic", raw: "${" + block.raw + "}", ... });
     continue;
   }
   ```
   
   But this pattern is too greedy — it would wrap any text starting with `<` followed by ident, including raw markup if BS produced text starting with `<`. Need a more specific guard.
   
   The text block emitted by my BS modification has shape `<NAME [attrs]> = expr` or `const <NAME [attrs]> = expr` or `<NAME [attrs]>: type = expr`. So the pattern is:
   ```js
   const TOPLEVEL_STATE_DECL_RE = /^\s*(?:const\s+)?<\s*[A-Za-z_][A-Za-z0-9_]*[^>]*>\s*[=:]/;
   ```
   That's: optional `const`, `<`, ident, attr content, `>`, then `=` or `:`. This won't false-positive on regular markup text like `<div>hello` (post-`>` is content, not `=` or `:`).

3. **Sample restorations.** Edit 3 reverted samples.

4. **Tests.** Add ~6-10 §S11D cases.

### Open: Compound (Variant C) at top-level

Per BRIEF §4.2 §S11D.5 lists this. But the implementation complexity (BS lookahead through compound body) suggests deferring and surfacing in progress.md. Will do basic Shape 1/3 + typed-decl first; revisit compound if time permits.

### Risk audit

- **Risk:** BS's accumulated text blocks at top-level may get fragmented by other constructs (comments, empty lines). The text block boundary depends on what flushes the accumulator. Need to verify the entire `<NAME> = expr\n` lands in one text block.
- **Mitigation:** Test each form individually via §S11D.1-§S11D.6.

### Locus correction authorization

BRIEF §3 grants this. I am modifying BS (block-splitter.js) AND ast-builder.js (liftBareDeclarations). This is congruent with the BRIEF's expected scope ("BS top-level scan extension" + "body-pre-parser handoff").

## Plan

Phase order:
1. Survey + locus-confirm — DONE (this section).
2. Implement BS top-level peek for markup branch.
3. Implement liftBareDeclarations TOPLEVEL_STATE_DECL_RE branch.
4. Add §S11D test block (~8 cases).
5. Restore 3 reverted samples.
6. Run full test suite, verify 0 regressions + 8 new passes.
7. Final commit + summary.

## Cumulative log

- [survey-1] Worktree pwd verified, branch `phase-a1a-step-11-0d-toplevel-shape-1` created from `06ef8c6`.
- [survey-2] Baseline tests: 8886 pass / 44 skip / 0 fail / 8930 across 439 files (matches BRIEF).
- [survey-3] BS source surveyed — top-level `<letter` branch at L1035 is the locus.
- [survey-4] ast-builder surveyed — `liftBareDeclarations` (L627) + `tryParseStructuralDecl` (L2980) wiring confirmed.
- [survey-5] SPEC §6.2 + §4.6 read — design path validated.
- [survey-6] Decision: BS peek + lift extension. Defer compound at top-level (BRIEF §S11D.5) to a follow-up if time tight.
