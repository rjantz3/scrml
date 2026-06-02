# BRIEF — `:`-shorthand child element inside an engine arm breaks state-child parsing

**Change-id:** `colon-shorthand-in-engine-arm-2026-06-01`
**Dispatched:** S153 (2026-06-01), scrmlTS PA → scrml-js-codegen-engineer, `isolation: "worktree"`.
**Severity:** MED. **Type:** parser fix (NO spec change). Pre-existing. **Survey-then-fix.**

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

Your worktree path is under `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-<id>/`.

## Startup (BEFORE any other tool call)
1. `pwd` — MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. Else STOP (S90). Save as `WORKTREE_ROOT`.
2. `git -C "$WORKTREE_ROOT" rev-parse --show-toplevel` == `WORKTREE_ROOT`.
3. `git -C "$WORKTREE_ROOT" status --short` clean.
4. `bun install`. 5. `bun run pretest`. 6. You are branched from current main (includes S153 `3429b385`).

## Path discipline (S99/S126)
- **All edits via Bash** (`perl -i`/`python`/heredoc) on **worktree-absolute paths** with the `.claude/worktrees/agent-<id>/` segment. NOT Edit/Write. Echo target before each write; verify with `git -C "$WORKTREE_ROOT" diff` after.
- **NEVER `cd` into main.** Use `git -C`, `bun --cwd`, absolute paths.
- First commit message includes verbatim `pwd`: `WIP(colon-shorthand-engine): start at <pwd>`.

## Commit discipline (S83)
- Commit per sub-bucket; `git -C "$WORKTREE_ROOT" status` clean before DONE. Update `docs/changes/colon-shorthand-in-engine-arm-2026-06-01/progress.md` per step.

## MAPS
`.claude/maps/` refreshed S153 — starting hypothesis; verify against source. Task-Shape: compiler-source bug fix (parser).

---

# THE BUG (empirically confirmed by PA at HEAD 3429b385)

A §4.14 `:`-shorthand **child element** (`<span : @label>`, `<li : @.name>`) nested inside an `<engine>` state-child body breaks state-child parsing → `E-ENGINE-STATE-CHILD-MISSING` for the affected variant.

- `repro-1-simple.scrml`: `<Running rule=.Idle> <span : @label> </>` → `E-ENGINE-STATE-CHILD-MISSING` for `.Running`. FAILS.
- `repro-2-each-li.scrml`: `<li : @.name>` inside an `<each>` inside the `<Browsing>` arm (the dogfood case that surfaced this) → `E-ENGINE-STATE-CHILD-MISSING` for `.Browsing`. FAILS.
- **The same `:`-shorthand element is VALID at top-level** (`<program><label>="hi"<span : @label></program>` compiles). It only breaks inside an engine arm.

## Root (confirmed by PA, verify)
`compiler/src/engine-statechild-parser.ts` has a closer-finder that pairs state-child openers (`<Variant ...>`) with their closers (`</>`, `</Variant>`). Its header (lines ~77-82) documents that it maintains a **lowercase opener stack** and EXCLUDES HTML void elements (`VOID_ELEMENTS`) from the stack because they never have a closer — "otherwise leave an unbalanced phantom opener that the next `</>` ... would attempt to pop, corrupting the state-child / engine / onTransition depth counters."

A §4.14 `:`-shorthand opener (`<span : @label>`, `<li : @.name>`) is a NON-void lowercase opener with **NO closer** (the `:`-shorthand body runs to the opener's `>` and there is no `</span>` / `</>`, per §4.14 line 979 + the closer-presence override line 982). It is pushed onto the opener stack but never popped → the SAME unbalanced-phantom-opener corruption the void-element exclusion was built to prevent → the state-child's `</>` is consumed against the phantom `<span>` → the state-child closer is not found → `E-ENGINE-STATE-CHILD-MISSING`.

## The fix (shape — confirm via survey)
Extend the closer-finder's self-terminating-opener recognition to `:`-shorthand openers, exactly parallel to the existing `VOID_ELEMENTS` exclusion and self-closing (`<tag/>`) handling: when scanning a lowercase opener, if it is a §4.14 `:`-shorthand form (a top-level ` : ` body-introducer AFTER the last attribute and BEFORE the opener's `>`, with no closer), do NOT push it onto the opener stack (it is self-terminating).

**The `:`-detection MUST be attribute-aware** — a bare top-level `:`, NOT a `:` inside:
- an attribute name (`bind:value`, `on:click`, `class:active`, `onserver:msg`),
- an attribute value (`style="color: red"`, `href="http://x"`, `title="a:b"`),
- a `${...}` interpolation (`onclick=${a ? b : c}` — ternary),
- a string / template literal.

Reuse the existing attribute scanner — `engine-statechild-parser.ts` already parses opener attributes (see `scanOpenerForAttrs` / the payload-binding scanner, and `compiler/src/multi-statement-scan.ts` which tracks paren/brace/bracket/string/`${}` depth for exactly this class of "find a top-level token in an opener" problem). The `:`-shorthand body-introducer is the post-attribute, depth-0, non-string `:` followed (after the single expression) by the opener's terminating `>`. Do NOT hand-roll a naive `indexOf(":")`.

## Scope / constraints
1. **Localized to the closer-finder's opener-stack push logic.** Mirror the void-element + self-closing exclusion already there.
2. **Do NOT regress** existing engine parsing: bare-body state-children (`<Variant>...</>`), explicit-closer, self-closing (`<Variant/>`), payload binding (`<Done rows>`, `<Done(rows)>`), `<onTransition>`/`<onTimeout>`/`<onIdle>` body-scans, nested `<engine>`, `internal:rule=`, `history`, `effect=`. Run the full engine + match + each test suites.
3. **Do NOT touch the state-child's OWN `:`-shorthand body recognition** (`<Variant> : expr`, §51.0.I — `:` AFTER the `>`). That is a SEPARATE form handled elsewhere. This fix is only about NESTED lowercase child elements that use the §4.14 `:`-shorthand (`:` INSIDE the opener).
4. **SPEC NOTE (do not act on — PA-flagged for the user):** there is a §4.14-vs-§51.0.I inconsistency in the `:` placement for the state-child's OWN body (§4.14 = `<tag : expr>` inside; §51.0.I = `<Variant> : expr` after). That is OUT OF SCOPE here; this fix is about nested child elements only. Leave it to PA.

---

# VERIFICATION (S138 R26)

1. **Compile both reproducers** on your post-fix baseline:
   ```
   bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile "$WORKTREE_ROOT"/docs/changes/colon-shorthand-in-engine-arm-2026-06-01/repro-1-simple.scrml --output-dir /tmp/csa-r1
   bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile "$WORKTREE_ROOT"/docs/changes/colon-shorthand-in-engine-arm-2026-06-01/repro-2-each-li.scrml --output-dir /tmp/csa-r2
   ```
   Both MUST compile (no E-ENGINE-STATE-CHILD-MISSING); `node --check` clean on emitted client.js. For repro-2, confirm the each renders (the S153 each-in-engine + remount mechanism applies — `@.name` resolves, `_scrml_each_render_*` present).
2. **Add a parser/unit test** covering: a `:`-shorthand child element in an engine arm (the state-child is found + its body parsed); the each+`<li : @.name>` case; AND negative-detection cases that must NOT be mis-read as `:`-shorthand (a child with `bind:value=`, `on:click=`, `style="color: red"`, `onclick=${a ? b : c}` — the state-child must still parse correctly with those present). Mirror the existing engine-statechild-parser tests.
3. **Full suite:** `bun --cwd "$WORKTREE_ROOT" run test`. 0 regressions. The parser change may shift within-node parity (it IS parser-side) — if the within-node test flags benign drift, rebump + note it. DO NOT mark DONE without the suite green.

---

# REPORT BACK
- WORKTREE_PATH, FINAL_SHA, FILES_TOUCHED.
- The exact opener-stack site you changed + how you detect the `:`-shorthand (attr-aware mechanism).
- Empirical: both repros compile + repro-2 each renders; negative-detection cases pass; full-suite counts; within-node rebump y/n.
- Maps line. Any further follow-ups (does block-splitter.js have the same gap for `:`-shorthand inside OTHER structural raw-bodies — match arms, `<onTransition>` bodies? note, don't fix).
