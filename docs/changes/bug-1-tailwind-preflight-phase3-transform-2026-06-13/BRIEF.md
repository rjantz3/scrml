# DISPATCH BRIEF — bug-1 Tailwind preflight Phase 3: transform (C-style), S191

Make the **transform** directional utilities (`translate-x/y`, `scale-x/y`, 2D `rotate`, `skew-x/y`)
COMPOSE via the `--tw-*` var model + a single `transform:` composing shorthand — **Approach C
(inline `var()` fallbacks)**, same model as Phase 1 (ring/shadow) + Phase 2 (gradient, landed
`f5b71e61`). **This is a BEHAVIOR CHANGE** (see below) — the widest golden-CSS surface of the arc.
This is BEYOND bug-1's filed scope (user ratified continuation S191: "continue phase 3").

**Authority:** the deep-dive `/home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/tailwind-preflight-css-2026-06-13.md`
(§"prior art" transform reference CSS + §Risks transform-behavior-change note). Phase 1
`registerRing()`/`BOX_SHADOW_COMPOSE` + Phase 2 `registerGradient()` in `compiler/src/tailwind-classes.js`
(SPEC §26.7/§26.7.1) are your TEMPLATES. Your worktree base includes Phases 1+2 + this brief.

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full; §"Task-Shape Routing" (codegen/registry feature). Map
watermark predates the §26.7 Tailwind-composing work — read the CURRENT registerRing/registerGradient
(your templates) directly. Report a maps-feedback line.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
`pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`.
1. `pwd` (save WORKTREE_ROOT; under any other repo → STOP). 2. `git rev-parse --show-toplevel` ==
WORKTREE_ROOT. 3. `git status --short` clean. 4. `bun install`. 5. `git rev-parse main` ≥ the BRIEF
commit; if base predates it, `git merge main` (Phases 1+2 must be present). 6. `git log --oneline -1`.
Any check fails → STOP + report.
Edits via **Bash** (perl/python/heredoc) on **worktree-absolute paths** with the `.claude/worktrees/
agent-<id>/` segment — NOT Edit/Write tools, NOT main-rooted paths. NEVER `cd` into main; use
`git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths only. (Note: the
path-discipline hook WILL reject the Edit tool here — Bash-only editing is mandatory.) First commit:
`WIP(bug-1-p3): start at $(pwd)`.

# THE TASK — transform directional utilities, Approach C

## The behavior change (READ THIS — it's the crux of Phase 3)
Current emit (`tailwind-classes.js` ARBITRARY_DECL_TRANSFORM ~1411-1423):
```
translate-x-[v] → translate: <v> 0      translate-y-[v] → translate: 0 <v>
scale-x-[v]     → scale: <v> 1          scale-y-[v]     → scale: 1 <v>
```
These use MODERN individual CSS transform props → `translate-x-4 translate-y-2` on one element emits
TWO `translate:` declarations → CSS last-write-wins → only one axis applies (the BUG, same class as
ring/shadow). Phase 3 replaces this with the `--tw-*` var model so they COMPOSE.

## The C-style transform composing shorthand (every directional transform utility emits it)
```
transform: translate(var(--tw-translate-x, 0), var(--tw-translate-y, 0)) rotate(var(--tw-rotate, 0)) skewX(var(--tw-skew-x, 0)) skewY(var(--tw-skew-y, 0)) scaleX(var(--tw-scale-x, 1)) scaleY(var(--tw-scale-y, 1))
```
(inline fallbacks: translate/rotate/skew → `0`, scale → `1` — a no-op identity for unset axes.)
Per-utility setters:
```
.translate-x-4   { --tw-translate-x: 1rem; transform: <shorthand> }
.translate-y-2   { --tw-translate-y: 0.5rem; transform: <shorthand> }
.scale-x-50      { --tw-scale-x: .5; transform: <shorthand> }
.rotate-45       { --tw-rotate: 45deg; transform: <shorthand> }
.skew-x-6        { --tw-skew-x: 6deg; transform: <shorthand> }
```
With inline fallbacks, ONLY `translate-x-4` → `transform: translate(1rem, var(--tw-translate-y, 0)) …`
→ valid (y-axis identity). `translate-x-4 translate-y-2` → both set their var → composes. CORRECT.

## What changes vs what stays (per-utility — survey + decide in Phase 0)
- **CHANGE to `--tw-*` composing:** `translate-{x,y}-*` (named + arbitrary), `scale-{x,y}-*`, bare
  `scale-*` (sets BOTH scaleX+scaleY), 2D `rotate-*` (named + arbitrary), `skew-{x,y}-*`. Add NAMED
  utilities: `translate-{spacing-scale}` + negatives, `scale-{0,50,75,90,95,100,105,110,125,150}`,
  `rotate-{0,1,2,3,6,12,45,90,180}` + negatives, `skew-{0,1,2,3,6,12}` + negatives.
- **STAYS literal (escape hatch, do NOT route through --tw-*):** `transform-[<full-css>]`
  (`transform-[rotate(45deg)]`, multi-function, matrix — the test §1-§3) — the user wrote the whole
  transform; keep `transform: <literal>`. Also `transform-none`, `transform-gpu`/`transform-cpu` if present.
- **3D `rotate-x/y/z` + `transform: rotateX/Y/Z(...)`:** v3's `--tw-*` model is 2D only (no 3D-rotate
  var). KEEP these as the current literal `transform: rotateX(<v>)` form (note in §26.7 they don't
  compose with the 2D model — same escape-hatch shape). Survey + confirm; don't force them into the model.

## Loci
- ARBITRARY_DECL_TRANSFORM (~1411-1423) — rewrite translate-x/y, scale-x/y to C-style setters. Keep
  rotate-x/y/z + skew literal-or-model per the survey. Keep the `transform`/`rotate`/`scale`/`translate`/`skew`
  full-shorthand arbitrary entries (~1372/1387) as the literal escape hatch.
- NEW `registerTransform()` (mirror registerRing/registerGradient) for the named utilities + a
  TRANSFORM_COMPOSE const (like BOX_SHADOW_COMPOSE). Wire its call alongside the others.
- NO change to `getAllUsedCSSWithDiagnostics`.

## SPEC §26.7 extension (Rule 4 — coupled)
Add the transform family to §26.7 (the composing-utility section): the `transform:` shorthand + the
translate/scale/rotate/skew `--tw-*` setters with inline fallbacks; NOTE the behavior change (directional
individual-prop → composing) + the escape-hatch (`transform-[...]`) + 3D-rotate exclusions. Regen
SPEC-INDEX (`bun run scripts/regen-spec-index.ts`).

## Tests + the BEHAVIOR-CHANGE sweep (load-bearing)
- **SWEEP ALL test files** for assertions on the OLD directional forms — grep `translate: ` /
  `scale: ` (the modern individual-prop emit) / `transform: scaleX` etc. across `compiler/tests/`.
  Update EVERY one asserting `translate-x`/`translate-y`/`scale-x`/`scale-y` old output to the C-style
  `--tw-*` + shorthand truth. Known: `bug-1-tailwind-transform-shorthand.test.js` §4-§5 (translate-x/y,
  scale-x/y "modern individual prop") MUST change; §1-§3 (`transform-[...]` literal) STAY. There may
  be others (samples/examples golden CSS, other tailwind test files) — find them all.
- NEW compose tests: `translate-x-4 translate-y-2` → BOTH axes in one `transform:` shorthand (assert
  both `--tw-translate-x` + `--tw-translate-y` set + the shorthand present). `scale-x-50 scale-y-75` →
  both. `rotate-45 translate-x-4` → both compose.
- Update the §26.7 transform-shorthand test header/coverage comments to reflect the model.

## PHASE 3 — R26 EMPIRICAL VERIFY (MANDATORY)
```
<program><page><div class="translate-x-4 translate-y-2 rotate-45 scale-x-110">composed</div></page></program>
```
`bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile /tmp/bug1-p3-r26/t.scrml --output-dir /tmp/bug1-p3-r26/dist`
Assert: the single `transform:` shorthand present with `--tw-translate-x`, `--tw-translate-y`,
`--tw-rotate`, `--tw-scale-x` all set; NO colliding bare `translate:`/`scale:` individual-prop decls
on the composed element; CSS well-formed; a browser would apply ALL four transforms (not last-wins).
Report the emitted transform CSS verbatim. DO NOT mark DONE without R26 passing.

# Pre-DONE gate
`bun --cwd "$WORKTREE_ROOT" run test` (or pre-commit subset) — 0 regressions. The behavior-change
sweep means MANY tests may need updates; a remaining failure = a missed old-form assertion. Report
pass/skip/fail + the count of test files you updated for the behavior change.

# COMMIT DISCIPLINE (S83): commit per sub-unit; coupled code+test = one commit; `git status` clean before DONE.

# FINAL REPORT: WORKTREE_PATH, BASE_SHA, FINAL_SHA, FILES_TOUCHED; the transform emit (a setter + the
shorthand); your per-utility change-vs-stay-literal decisions (esp. 3D rotate); the COUNT + LIST of
test files updated for the behavior change; test delta + pass/skip/fail; R26 transform CSS verbatim;
§26.7 summary; maps feedback; deferred notes (Phase 4 filter/backdrop remains).

Commit after each change; update progress.md. WIP commits expected. If you crash, commits + progress
file are the recovery anchor.
