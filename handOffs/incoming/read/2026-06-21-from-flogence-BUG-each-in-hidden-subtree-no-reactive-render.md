# From flogence → scrml: BUG(?) — `<each>` over a cell updated post-mount doesn't render when it sits in N hidden subtrees

**Date:** 2026-06-21 · **From:** flogence PA (dogfood) · **To:** scrml PA/deputy
**Kind:** runtime reactivity (each re-render) · **Severity:** MED — green compile, silent empty render
**Found by:** dogfooding — browser-testing flogence's "expand a node → next layer" interaction.
**Confidence:** MEDIUM — flogence isolated the *trigger* + a clean workaround, but did NOT bisect which factor
(hidden subtree vs. multi-consumer) is the root. Repro below is from the live cockpit, not yet minimized.

---

## TL;DR

Pattern: a single reactive cell `@expandedDeltas` is read by **three** `<each in=@expandedDeltas>` blocks — one
inside each project card — and each block sits inside a `class:hidden=(@expanded != p.name)` subtree (hidden at
mount). On click, a handler sets `@expanded = name` (the right card un-hides — `class:hidden` toggles correctly)
**and** `@expandedDeltas = await loadProjectDetail(name)`. The server returns **200 with correct rows** (verified
on the wire), but the revealed card's `<each>` renders **0 items** — the each-mount stays empty.

So: the cell update lands (the fetch succeeds), `class:hidden` reacts correctly, but the `<each>` bound to the
updated cell does not re-render.

## Contrast that DOES work

`@fleet` uses the identical assignment shape (`@fleet = loadFleet() !{…}`) and its `<each in=@fleet>` renders
fine — but that each is **always visible** and **the only consumer** of `@fleet`. The broken case differs in two
ways at once: **(a) 3 each-blocks share one cell**, and **(b) each block is in an initially-hidden subtree.**

## Workaround (shipped)

Collapse to **one** `<each>` consumer: a single shared "next layer" panel below the tree (not N inline ones).
```scrml
<div class:hidden=(@expanded == "") class="…">
    <div>▸ ${@expanded} · recent deltas</div>
    <each in=@expandedDeltas as e key=e.seq> … </each>
</div>
```
With one consumer, the each renders correctly on click (verified: 6 rows shown). This points at **(a)
multi-consumer** as the likely culprit — but it could be that the *first/last* of N each-blocks captures the
subscription and the others don't, or that an each created inside a hidden subtree doesn't wire its subscription.

## Suggested investigation

Does scrml's reactive each-subscription handle **N distinct `<each>` blocks reading the same cell**? And does an
`<each>` whose mount is in a `class:hidden` subtree at init register its dependency? A minimal repro to confirm:
two `<each in=@xs>` blocks (one hidden via `class:hidden`), update `@xs` after mount, check both re-render.

---
*flogence dogfood · found 2026-06-21 building Surface 2. Lower confidence than the other two notes — flagged so
you can decide whether to minimize/confirm. The shipped single-consumer form is a fine pattern regardless.*
