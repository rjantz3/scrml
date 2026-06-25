# BRIEF — 6nz-arrow-engine-legacy-body-reject-2026-06-24

Dispatched S219 2026-06-24 to `scrml-js-codegen-engineer` (isolation:worktree, opus, run_in_background), agent `ab69a222ffa8684e8`. **The dispatch STALLED on the stream watchdog right before its full-suite gate (>600s no-output kill); B2 was committed by the agent (`009612cc`), B1 finished + committed PA-direct (`5b9d0dde`), landed via S67 file-delta at `d71a6dcc` after PA adversarial review + R26 verify.** This BRIEF.md is the S136 archive.

Standard template blocks INCLUDED in the dispatch (per the maps-discipline + F4/S88/S90/S99/S126 + S198 contracts): MAPS-REQUIRED-FIRST-READ (watermark `162564f3`); CRITICAL startup-verification + path-discipline (Bash-edits on worktree-absolute paths, no-`cd`, WIP-pwd first commit); within-node re-baseline + FULL `bun run test` gate; R26 empirical verify; per-deliverable coupled code+test commits; no `--no-verify`.

## Mission — two 6nz-triaged codegen findings, root-pinned on main `c59c9811`

### Deliverable 1 (HIGH) — B2: arrow-rule BODY inside `<engine>` silently half-compiles → diagnose-and-reject
A state-engine `<engine for=T initial=...>` (no `name=`) whose body uses the legacy machine-style whole-body arrow grammar (`.From => .To`) has no state-child opener → registers as a legacy MachineType → routes to emit-machines.ts → emits the `__scrml_transitions_<var>` table but NEVER the §51.0.C auto-declared cell init → governed cell `undefined` at mount → driven `<match on=@var>` renders EMPTY, ZERO diagnostic. FIX: fire E-ENGINE-RULE-LEGACY-SYNTAX (Error, reuse the existing code) at the `stateChildren.length===0 && isLegacyArrow` bail in SYM PASS 11/B15, steering to the canonical state-child `rule=` form. Scope PRECISELY to the `<engine>`-keyword state-engine form: `<machine>` keyword, the §51.3.2 named-machine form (`<engine name=X for=T>`), and derived engines are EXEMPT. Generalize the §34 E-ENGINE-RULE-LEGACY-SYNTAX row to both fire-sites. Corpus-safety: grep samples/examples for `<engine>`+arrow-body; migrate any to state-child form in-change. Native-parser mirror per S162 conditional.

### Deliverable 2 (small) — B1: promote W-INTERP-IN-RAW-CONTENT info→warning + ADD the missing §34 row
The `<pre>`/`<code>` raw-content `${...}`-drop is BY-DESIGN (§4.17) but silent; the lint that surfaces it (`lint-w-interp-in-raw-content.js`, info-level) flags a SILENT rendering break. Promote severity info→warning (stays in result.warnings, CLI exit unchanged) + ADD the missing §34 catalog row (Warning, §4.17 xref) + update the lint test.

## Outcome
B2 root: `symbol-table.ts` fire at the legacy-arrow bail + new `hadNameAttr` discriminant in `ast-builder.js` + `native-parser/collect-hoisted.js` + `types/ast.ts`; new test `engine-arrow-body-legacy-reject-b2.test.js` (7 tests). B1: lint severity + §34 row + test. Corpus-safe (zero samples/examples newly error). R26 GREEN (arrow→errors; state-child→still emits init). Adversarial residual filed: `g-named-machine-arrow-no-statedecl-silent-empty` (MED). Landed `d71a6dcc`.
