# DISPATCH BRIEF — bug-1 Tailwind preflight Phase 1: ring/ring-offset/shadow (C-style), S191

Build the **ring / ring-offset / shadow** composing family so `ring-*` and `shadow-*` COMPOSE
(instead of last-write-wins single-property `box-shadow`). Use **Approach C (inline `var()`
fallbacks)** — validated S191. This is Phase 1 of the bug-1 preflight arc.

**Authority / full design:** READ FIRST →
`/home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/tailwind-preflight-css-2026-06-13.md`
(the deep-dive — the composing model, the Tailwind v3 reference CSS verbatim §"prior art", the
family table, the cost/risk). This brief is the Phase-1 execution slice of that deep-dive.

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full; follow the §"Task-Shape Routing" for a compiler-source
feature (codegen/registry). Map currency: watermark HEAD 1e17213e (2026-06-13); current HEAD
90fd7412. `tailwind-classes.js` is UNCHANGED since the watermark (the post-watermark commits touched
emit-html.ts/emit-event-wiring.ts only) — treat map content as current.
Feedback line in your report: "Maps consulted: […]; load-bearing finding: …" or "not load-bearing".

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
Your worktree `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`.
1. `pwd` (save WORKTREE_ROOT; if under any other repo → STOP, report — S90 CWD failure).
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT. 3. `git status --short` clean.
4. `bun install`. 5. `git rev-parse main` ≥ `90fd7412`; if base predates it, `git merge main`.
6. `git log --oneline -1` (record base SHA). If ANY check fails: STOP + report + exit.
Path discipline: apply edits via **Bash** (perl/python/heredoc) on **worktree-absolute paths** with the
`.claude/worktrees/agent-<id>/` segment — NOT Edit/Write tools, NOT main-rooted paths. NEVER `cd` into
main; use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths only. First
commit message embeds your `pwd`: `WIP(bug-1-p1): start at $(pwd)`.

# THE TASK — ring/ring-offset/shadow, Approach C (inline fallbacks)

## The bug (documented in-code at tailwind-classes.js:1225-1239)
`ring-*` (arbitrary, ~1240-1253) and `shadow-*` (named, registerEffects ~559) BOTH emit
single-property `box-shadow:` → on one element (`ring-2 shadow-lg`) the two `box-shadow` declarations
collide, CSS class-order last-write-wins, one obliterates the other. BROKEN composition. Also
`ring-offset-*` / `ring-inset` / `ring-{color}` named utilities don't exist.

## The fix model — Approach C (NOT a shared `*,::before,::after` defaults block)
**DO NOT emit a global preflight defaults block** (that is Approach A — rejected; it adds an 824B
fixed floor to every TW-using file, violating §26.1 "only what's used"). Instead, **each composing
utility's emitted CSS carries the composing shorthand with INLINE `var()` fallbacks** so partial
application is valid with no global block. This mirrors the existing `space-x-reverse`
(`tailwind-classes.js:189`) precedent and was byte-validated S191 (C beats A until 24+ box-shadow
rules in ONE file; preserves §26.1 minimalism + correctness).

**The composing shorthand (emitted by EVERY ring/shadow utility):**
```css
box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow, 0 0 #0000);
```
**The per-utility setters** (Tailwind v3 model — see the deep-dive §"prior art" for verbatim values):
```css
/* ring-{w} (named: ring-0/1/2/4/8; ring == ring-3px) — sets the ring shadow var + the shorthand */
.ring-2 { --tw-ring-shadow: var(--tw-ring-inset,) 0 0 0 calc(2px + var(--tw-ring-offset-width, 0px)) var(--tw-ring-color, currentColor); box-shadow: <the shorthand above>; }
/* ring-offset-{w} — sets offset width + the offset shadow var */
.ring-offset-2 { --tw-ring-offset-width: 2px; --tw-ring-offset-shadow: var(--tw-ring-inset,) 0 0 0 2px var(--tw-ring-offset-color, #fff); box-shadow: <shorthand>; }
/* ring-inset — sets the inset keyword var */
.ring-inset { --tw-ring-inset: inset; }
/* ring-{color} (named scale + arbitrary ring-[#hex]) — sets --tw-ring-color */
.ring-blue-500 { --tw-ring-color: #3b82f6; }
/* shadow-{size} (named: sm/(base)/md/lg/xl/2xl/inner/none; + arbitrary shadow-[...]) — sets --tw-shadow + the shorthand */
.shadow-lg { --tw-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1); box-shadow: <shorthand>; }
```
With inline fallbacks, an element with ONLY `ring-2` (no `shadow-*`) resolves `var(--tw-shadow, 0 0 #0000)`
→ valid (transparent). An element with ONLY `shadow-lg` resolves the ring vars to `0 0 #0000` → valid.
`ring-2 shadow-lg` → both set their var + emit the shorthand → composes (3-layer box-shadow). CORRECT.

**RULING (default color, flag for user veto):** the bare/named `ring` default color = **`currentColor`**
(scrml's EXISTING arbitrary-`ring-[3px]` convention, §2-§4 of the §6 test), NOT Tailwind's blue-500/50.
Deliberate scrml-divergence for consistency — document it in the SPEC amendment. Do NOT introduce blue.

## Loci
- `tailwind-classes.js` `ARBITRARY_DECL_TRANSFORM` ring arbitrary (~1240-1253) — rewrite to C-style
  (set `--tw-ring-color` from the arbitrary value + emit the shorthand). Keep `currentColor` width-only forms.
- `registerEffects` shadow named (~545-566, the `box-shadow: ${v}` at 559) — rewrite each `shadow-{size}`
  to set `--tw-shadow` + emit the shorthand. Preserve `shadow-none` (→ `--tw-shadow: 0 0 #0000`).
- NEW named utilities — add a `registerRing()` (or extend registerEffects/registerBorders): `ring-{0,1,2,4,8}`,
  bare `ring`, `ring-inset`, `ring-offset-{0,1,2,4,8}`, `ring-{color-scale}`, `ring-offset-{color-scale}`.
  Follow the existing `registerXxx()` pattern (registry.set per class).
- NO change to `getAllUsedCSSWithDiagnostics` (1964) — C needs no global prepend; the join stays.

## SPEC §26 amendment (Rule 4 — land WITH the code, coupled)
Add a new sub-section (suggest **§26.7 "Composing utilities — inline-fallback `var()` model"**) after
§26.6. Document: the ring/ring-offset/shadow composing family emits `box-shadow: var(--tw-X, <default>),
…` with INLINE fallbacks (no `*,::before,::after` preflight defaults block — preserves the §26.1/§26.2
"only what's used" minimalism axiom); each utility sets its `--tw-*` var; the inline fallbacks make
partial application valid. Note the `currentColor` ring-default divergence from Tailwind v3. State this
is Phase 1 of the composing-family arc (gradient/transform/filter follow). Use `compiler/SPEC-INDEX.md`
to place it; regenerate the index line ranges if the script exists (`bun run scripts/regen-spec-index.ts`).

## Tests
- Golden-CSS: `ring-2` alone → box-shadow shorthand + `--tw-ring-shadow` setter, inline fallbacks present.
- `shadow-lg` alone → `--tw-shadow` setter + shorthand.
- `ring-2 shadow-lg` on one element → BOTH emit setters; the shorthand composes (assert all 3 `var()` present).
- `ring-offset-2` → `--tw-ring-offset-width` + offset-shadow setter. `ring-inset` → `--tw-ring-inset: inset`.
- `ring-blue-500` → `--tw-ring-color: #3b82f6`.
- INVERT the §6 ring-offset guard (`compiler/tests/unit/bug-1-tailwind-ring-family.test.js` §6): the
  `ring-offset-[2px]` assertion that currently expects the lint to FIRE must now expect NO fire
  (ring-offset is recognized). **LEAVE the bg-gradient/from/to/via §6 assertions UNCHANGED** (gradient
  is Phase 2). Keep §1-§5 (existing ring-[...] arbitrary) passing.

## PHASE 3 — R26 EMPIRICAL VERIFY (MANDATORY)
Compile a real source with composing ring+shadow on YOUR post-fix baseline:
```
<program><page>
  <div class="ring-2 ring-offset-2 shadow-lg">composed</div>
</page></program>
```
`bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile /tmp/bug1-r26/t.scrml --output-dir /tmp/bug1-r26/dist`
Assert in the emitted CSS: the `box-shadow` shorthand with 3 `var()` layers is present; `--tw-ring-shadow`,
`--tw-ring-offset-width`, `--tw-shadow` setters all present; NO bare single-property `box-shadow: 0 0 0 …`
collision; the emitted CSS is well-formed (balanced braces). Report the emitted ring/shadow CSS verbatim.
DO NOT mark DONE without R26 passing.

# Pre-DONE gate
`bun --cwd "$WORKTREE_ROOT" run test` (or the pre-commit subset `bun test compiler/tests/unit
compiler/tests/integration compiler/tests/conformance --bail`) — 0 regressions. Report pass/skip/fail.

# COMMIT DISCIPLINE (S83)
Commit per sub-unit (registry rewrite + its tests = one unit; SPEC amendment = its own commit OK).
`git -C "$WORKTREE_ROOT" status` clean before reporting DONE. Coupled code+test = one commit.

# FINAL REPORT
WORKTREE_PATH, BASE_SHA, FINAL_SHA, FILES_TOUCHED; the C-style ring/shadow emit (show the box-shadow
shorthand + a setter); test delta + pass/skip/fail; R26 emitted-CSS verbatim; SPEC §26.7 summary; maps
feedback; any deferred notes.

Commit after each meaningful change; update
`docs/changes/bug-1-tailwind-preflight-phase1-ring-shadow-2026-06-13/progress.md` after each step.
WIP commits expected. If you crash, your commits + progress file are the recovery anchor.
