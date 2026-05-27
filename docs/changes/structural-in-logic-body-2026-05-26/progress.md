# Structural-element silent-swallow in `${...}` logic-body — progress log

## Dispatch context

WORKTREE_PATH: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a15f9bf0d9cccb189
BRANCH: worktree-agent-a15f9bf0d9cccb189
BASE_SHA: 3a660c7c

## Phase 0 — empirical verify (DONE 2026-05-26)

Bug confirmed. 10 structural element kinds (schema, engine, channel, page, auth, errors, onTransition, onTimeout, onIdle, match) inside `${...}` logic body all produce **0 errors / 0 structural diagnostics** today. They are silently swallowed.

5 negative regression cases produce 0 structural errors as expected (only unrelated W-PROGRAM-SPA-INFERRED / E-DG-002 / W-PROGRAM-REDUNDANT-LOGIC noise).

Probe location: `/tmp/phase0-probe-structural/probe.mjs` (transient — not committed; results captured above).

## Phase 1 — architecture decisions (DONE 2026-05-26)

**Diagnostic code:** REUSE `E-STRUCTURAL-ELEMENT-MISPLACED` per PA lean. Per SPEC §34 row at line 16322, the code's documented semantic is "A scrml-defined structural element is used outside its owning locus" — exactly fits the parseLogicBody fallback case. SPEC update extends the row's "Specific cases" enumeration to include the new logic-body context.

**Detection site:** `compiler/src/ast-builder.js` parseLogicBody's bare-expr/html-fragment fallback at line ~6444-6464. Tag-name extraction via regex on the collected `expr` string: `/^\s*<\s*([A-Za-z][A-Za-z0-9-]*)\b/` matches the leading tag opener.

**Match table:** Element names from SPEC §4.15 registry (line 1027-1035):
- `schema` (program-child; §39.12 / §38)
- `engine` (file top-level or state-child of `<engine>`; §51)
- `channel` (program-child sibling of `<page>`; §38.3)
- `page` (program-child in multi-page apps; §40)
- `auth` (program-child; §43-auth)
- `errors` (parent supports it; §55.8)
- `onTransition` (child of `<engine>`; §51.0.H)
- `onTimeout` (engine state-child; §51.0.M)
- `onIdle` (engine root; §51.0.R)
- `match` (markup statement-position; §18.0.1)

Match is case-SENSITIVE per SPEC §4.15 "case-sensitive at registry level" (E-NAME-COLLIDES-RESERVED row §34, line 16321 — "registry level is case-sensitive").

**Negative-case guards:**
- HTML elements (`div`, `p`, `span`, `button`, …) — leading tag-name not in registry set → no fire.
- Reactive-decl `<NAME> = expr` — already caught upstream at line 6439 (tryParseStructuralDecl), never reaches fallback.
- Component element `<MyComponent>` — capitalized, but the registry uses lowercase scrml-defined names. Components are PascalCase and disjoint from registry per SPEC §4.15 normative statement "Component names (PascalCase user types) and these scrml-defined element names are disjoint." No fire.
- Render-by-tag `<varname/>` — self-closing reactive cell render — lowercase, not in registry → no fire.
- Structural at canonical position — fallback only runs in `${...}` body; canonical placements use the markup-element / structural-decl path → no fire.

**Message shape:** Per-element-kind specific message with the canonical placement cited from SPEC. Better adopter ergonomics than a generic message.

**AST shape stability:** After pushing the error, RETURN the html-fragment node anyway (so downstream stage shapes don't blow up). The error in `errors` carries the diagnostic.

## Phase 2 — impl (PENDING)

## Phase 3 — tests (PENDING)

## Phase 4 — SPEC update (PENDING)

## Phase 5 — report (PENDING)
