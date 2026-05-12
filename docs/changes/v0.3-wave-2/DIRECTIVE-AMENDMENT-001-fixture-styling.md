---
title: "DIRECTIVE AMENDMENT 001 — fixture styling convention (TAB-extension dispatch)"
date: 2026-05-12
session: S86
status: RATIFIED — durable; binds running TAB-extension agent (a2cd5a49f1d5ba5e6) and any follower
applies-to:
  - docs/changes/v0.3-wave-2/DISPATCH-BRIEF.md §4 (item-(b) TAB extension)
  - all fixtures / test cases authored under this dispatch
issued-by: PA, S86 (user verbatim ratified)
supersedes: none — clarifies (not re-scopes) the dispatch
tags: [amendment, fixtures, styling-convention, inline-class, no-file-top-hash-block]
---

# DIRECTIVE AMENDMENT 001 — fixture styling

## Verbatim ratified directive (S86, user voice)

> When you author scrml fixtures / test cases for the TAB-extension work,
> file-top `#{}` style blocks SHALL NOT appear in your idiomatic examples by
> default. Use inline `class="..."` (Tailwind-style) for any visual styling.
> `#{}` is reserved for shapes that cannot express inline (CSS variables,
> keyframes, complex non-element selectors) — and your auto-lift / `<page>`
> placement fixtures should not need styling at all.

## Background — load-bearing engineering concern

Spec permits file-top `#{}` placement (S85 Q1-styles-outside ratified). That
is a **placement rule**, NOT a license to use file-top `#{}` as the canonical
demonstration of "how to do styling in scrml."

The user's load-bearing engineering concern: CSS centralization reliably
produces untenable CSS — the classic 8k-line `app.css` that nobody deletes
for fear of breakage. Inline-class styling has been canonical in scrml
since day 1; fixtures must reflect that.

## Operational rules (binding on TAB-extension fixtures)

1. **Default:** if any fixture needs styling at all, use inline
   `class="..."` (Tailwind-style).
2. **Exception:** if a fixture exists specifically to TEST a `#{}` placement
   behavior (e.g. spec §4.15 file-top placement, CSS-variable definitions,
   `@keyframes`, complex non-element selectors), `#{}` is allowed AND the
   fixture MUST be clearly labeled in its filename / leading comment as
   testing that specific shape.
3. **Otherwise:** no file-top `#{}` blocks in anything you author.
4. **Most TAB-extension fixtures need NO styling at all** — the auto-lift
   regex family + `<page>` placement + `W-PROGRAM-REDUNDANT-LOGIC` +
   `<page>` attr-validation are structural / declaration-recognition tests.
   Adding decorative styling to those fixtures is over-reach.

## What this is NOT

- Not a re-scope. The four orthogonal changes in DISPATCH-BRIEF §4.3
  (page-symmetric child-context, decl-regex family,
  `W-PROGRAM-REDUNDANT-LOGIC`, `<page>` attr validation) stand unchanged.
- Not a spec amendment. SPEC.md §4 / §40.8 / §4.15 are not edited by this
  directive. This is a **fixture-authorship convention** for the agent
  authoring the TAB-extension test corpus.
- Not retroactive against fixtures that already exist in main pre-dispatch.
  Applies to fixtures THIS dispatch authors.

## Acknowledgment

Running agent (a2cd5a49f1d5ba5e6) and any follower picking up the change:
on next re-read of DISPATCH-BRIEF.md you will see the banner pointing here.
Honor this directive in all fixtures you author for the TAB-extension work.
Keep proceeding — this is a clarification, not a stop.
