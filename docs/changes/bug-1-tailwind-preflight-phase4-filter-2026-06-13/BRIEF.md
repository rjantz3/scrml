# DISPATCH BRIEF — bug-1 Tailwind preflight Phase 4: filter + backdrop-filter (C-style), S191

Build the **filter** and **backdrop-filter** composing families — the LAST composing family of the
bug-1 preflight arc. **Approach C (inline `var()` fallbacks)**, same model as Phases 1-3. Both are
**NET-NEW** (no existing filter/blur/backdrop utilities — confirmed S191), so this is ALL-ADDITIVE,
**no behavior change, lowest risk** of the arc.

**Authority:** the deep-dive `/home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/tailwind-preflight-css-2026-06-13.md`
(§"prior art" filter + backdrop-filter reference CSS — the 9-var `filter:` + 9-var `backdrop-filter:`
shorthands + the family table). Phases 1-3 `registerRing`/`registerGradient`/`registerTransform` +
`BOX_SHADOW_COMPOSE`/`TRANSFORM_COMPOSE` in `compiler/src/tailwind-classes.js` (SPEC §26.7/.1/.2) are
your TEMPLATES. Your worktree base includes Phases 1-3 + this brief.

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full; §"Task-Shape Routing" (codegen/registry feature). Map
watermark predates the §26.7 work — read the CURRENT registerGradient/registerTransform templates
directly (the map has no §26.7 Tailwind-composing entry; note that in your maps-feedback line).

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
`pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`.
1. `pwd` (under any other repo → STOP). 2. `git rev-parse --show-toplevel` == WORKTREE_ROOT.
3. `git status --short` clean. 4. `bun install`. 5. `git rev-parse main` ≥ the BRIEF commit; if base
predates it, `git merge main` (Phases 1-3 must be present). 6. `git log --oneline -1`. Any fail → STOP.
Edits via **Bash** (perl/python/heredoc) on **worktree-absolute paths** with the `.claude/worktrees/
agent-<id>/` segment — NOT main-rooted paths. NEVER `cd` into main; use `git -C "$WORKTREE_ROOT"`,
`bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths. First commit: `WIP(bug-1-p4): start at $(pwd)`.

# THE TASK — filter + backdrop-filter, Approach C (net-new, additive)

## The C-style filter shorthand (every filter utility emits it)
```
filter: var(--tw-blur,) var(--tw-brightness,) var(--tw-contrast,) var(--tw-grayscale,) var(--tw-hue-rotate,) var(--tw-invert,) var(--tw-saturate,) var(--tw-sepia,) var(--tw-drop-shadow,)
```
(EMPTY inline fallbacks — an unset filter contributes nothing; a `var(--tw-blur,)` that resolves to
empty is just whitespace in the space-separated `filter` list. The shorthand only emits when ≥1 filter
utility is present, so there's always ≥1 non-empty function.) Each utility sets its var + emits this.

## The backdrop-filter shorthand (every backdrop utility emits it; ALSO emit -webkit- prefix)
```
-webkit-backdrop-filter: var(--tw-backdrop-blur,) var(--tw-backdrop-brightness,) var(--tw-backdrop-contrast,) var(--tw-backdrop-grayscale,) var(--tw-backdrop-hue-rotate,) var(--tw-backdrop-invert,) var(--tw-backdrop-opacity,) var(--tw-backdrop-saturate,) var(--tw-backdrop-sepia,);
backdrop-filter: var(--tw-backdrop-blur,) … var(--tw-backdrop-sepia,)
```

## Per-utility setters (Tailwind v3 values — pull from the deep-dive / TW v3; mirror registerGradient's COLOR loops for the scales)
- **filter family:** `blur-{none,sm,(base),md,lg,xl,2xl,3xl}` + arbitrary `blur-[<len>]` → `--tw-blur: blur(<v>)`;
  `brightness-{0,50,75,90,95,100,105,110,125,150,200}` → `--tw-brightness: brightness(<n>)`;
  `contrast-{0,50,75,100,125,150,200}`; `grayscale`/`grayscale-0` → `--tw-grayscale: grayscale(100%/0)`;
  `hue-rotate-{0,15,30,60,90,180}` + `-`negatives → `--tw-hue-rotate: hue-rotate(<deg>)`;
  `invert`/`invert-0`; `saturate-{0,50,100,150,200}`; `sepia`/`sepia-0`;
  `drop-shadow-{sm,(base),md,lg,xl,2xl,none}` → `--tw-drop-shadow: drop-shadow(<v>)`;
  `filter`/`filter-none` → the shorthand / `filter: none`.
- **backdrop family:** the `backdrop-` prefixed equivalents (`backdrop-blur-*`, `backdrop-brightness-*`,
  `backdrop-contrast-*`, `backdrop-grayscale`, `backdrop-hue-rotate-*`, `backdrop-invert`,
  `backdrop-opacity-{0,5,...100}`, `backdrop-saturate-*`, `backdrop-sepia`) → `--tw-backdrop-*` +
  the backdrop shorthand. NOTE backdrop has `opacity` (not in the plain filter set) and NO drop-shadow.

## Loci
- NEW `registerFilters()` + `registerBackdrop()` (or one `registerFilter()`) — mirror
  `registerGradient()`/`registerTransform()` (registry.set per class; scale loops). NEW
  `FILTER_COMPOSE` + `BACKDROP_COMPOSE` consts (+ the `-webkit-` line for backdrop). Wire the call(s)
  alongside the others.
- Arbitrary `blur-[<v>]` / `brightness-[<v>]` / `backdrop-blur-[<v>]` etc. → add handlers (mirror how
  registerGradient/the ring transform handle arbitrary). `drop-shadow-[<v>]` arbitrary too.
- NO change to `getAllUsedCSSWithDiagnostics`.

## SPEC §26.7 extension (Rule 4 — coupled)
NEW §26.7.3 "Filter + backdrop-filter family (Phase 4)": the two composing shorthands (with the
`-webkit-backdrop-filter` companion) + the per-utility `--tw-*`/`--tw-backdrop-*` setters with EMPTY
inline fallbacks + the empty-resolves-to-no-op note. Mark the §26.7 phase-status: filter/backdrop now
RECOGNIZED → **all composing families complete** (ring/shadow · gradient · transform · filter/backdrop).
Regen SPEC-INDEX (`bun run scripts/regen-spec-index.ts`).

## Tests + lint-guard sweep
- Golden-CSS: `blur-sm` → `--tw-blur: blur(4px)` + the FILTER_COMPOSE shorthand; `brightness-50` →
  `--tw-brightness: brightness(.5)` + shorthand; `backdrop-blur-md` → `--tw-backdrop-blur: blur(12px)`
  + the backdrop shorthand (+ `-webkit-`).
- COMPOSE: `blur-sm brightness-50 grayscale` on one element → all 3 vars set + ONE filter shorthand
  (assert the 3 `var()` present + no missing). `backdrop-blur-sm backdrop-saturate-150` → compose.
- Arbitrary: `blur-[2px]` → `--tw-blur: blur(2px)`.
- SWEEP for any `W-TAILWIND-UNRECOGNIZED-CLASS` regression-guard asserting blur/brightness/filter/
  backdrop FIRES (deferred) — INVERT to no-fire (now recognized). Grep `compiler/tests/` for
  blur/brightness/backdrop deferred-guard assertions; update + the file-header comments.

## PHASE 3 — R26 EMPIRICAL VERIFY (MANDATORY)
```
<program><page><div class="blur-sm brightness-50 grayscale backdrop-blur-md">fx</div></page></program>
```
`bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile /tmp/bug1-p4-r26/t.scrml --output-dir /tmp/bug1-p4-r26/dist`
Assert: the `filter:` shorthand present with `--tw-blur`/`--tw-brightness`/`--tw-grayscale` all set;
the `backdrop-filter:` (+ `-webkit-`) shorthand present with `--tw-backdrop-blur` set; CSS well-formed
(balanced parens/braces); no empty/`undefined` (an all-empty `filter:` would be invalid — confirm each
shorthand has ≥1 real function from a present utility). Report the emitted filter/backdrop CSS verbatim.
DO NOT mark DONE without R26 passing.

# Pre-DONE gate
`bun --cwd "$WORKTREE_ROOT" run test` (or pre-commit subset) — 0 regressions. Report pass/skip/fail.

# COMMIT DISCIPLINE (S83): commit per sub-unit; coupled code+test = one commit; `git status` clean before DONE.

# FINAL REPORT: WORKTREE_PATH, BASE_SHA, FINAL_SHA, FILES_TOUCHED; a filter setter + the shorthand + a
backdrop setter + the (-webkit-)backdrop shorthand; any lint-guard inverts; test delta + pass/skip/fail;
R26 filter/backdrop CSS verbatim; §26.7.3 summary; maps feedback; note "all composing families complete".

Commit after each change; update progress.md. WIP commits expected. Crash → commits + progress = anchor.
