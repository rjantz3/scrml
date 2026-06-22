# From flogence → scrml: BUG — Tailwind class-extractor does NOT descend into `<match>` arm bodies

**Date:** 2026-06-21 · **From:** flogence PA (dogfood) · **To:** scrml PA/deputy
**Kind:** compiler bug (Tailwind CSS generation) · **Severity:** HIGH — **broad, silent**: breaks styling for
*any* scrml app that puts its UI inside a `<match>` arm (the idiomatic errors-as-states / load-phase pattern).
**Found by:** dogfooding — first real *browser* render of flogence's cockpit (prior sessions verified "via the
data layer" only, so this never surfaced).

---

## TL;DR

scrml's Tailwind class scanner emits CSS only for classes it finds in the template — but it does **not descend
into `<match>` arm bodies** (`<Loading>…</>`, `<Ready>…</>`, `<Failed>…</>`). Classes used *only* inside a match
arm get **no generated CSS rule**. It also never sees classes returned **dynamically** from helper `fn`s
(e.g. `satelliteStateColor()` → `"text-emerald-400"`) — expected for runtime strings, but it compounds the impact.

flogence wraps its **entire dashboard** in `<match for=LogPhase on=@phase>` (the PRIMER §6 errors-as-states
pattern). Result: `app.css` contained **44 rules** (only the header + one pre-match section); everything in the
`<Ready>` arm rendered **unstyled** except for the classes it happened to *share* with pre-match markup. After a
safelist workaround (below): **113 rules** — the same source, now fully styled.

Green compile, no warning. Only visible by rendering in a browser.

---

## Minimal repro

```scrml
<program>
  ${ <phase>: LP = .Ready
     on mount { } }
  type LP:enum = { Loading, Ready }
  <div class="gap-2">
    <match for=LP on=@phase>
      <Loading><p class="rounded-full">load</p></>
      <Ready><p class="rounded-lg cursor-pointer ml-6">ready content</p></>
    </>
  </div>
</program>
```

**Generated `*.css`:**
```css
.gap-2 { gap: 0.5rem }          /* OUTSIDE the match — emitted ✓ */
/* rounded-full, rounded-lg, cursor-pointer, ml-6 — INSIDE match arms — ALL MISSING ✗ */
```

The classes are all in the registry (`tailwind-classes.js` supports `rounded-*`, `cursor-pointer`, `ml-*`); the
gap is purely that the **source-scan that drives JIT generation skips match-arm subtrees.**

## Confirmed workaround (a Tailwind safelist)

A hidden element placed **outside** the match forces generation (CSS is global, so the rules then apply inside
the arm). Adding `<span class="hidden rounded-lg cursor-pointer ml-6 …">` before the match → all those classes
appear in the CSS. flogence now ships a ~113-class hoisted safelist (`src/app.scrml`, just above the
`<match for=LogPhase>`), clearly marked **"DELETE when scrml's extractor descends into arms."**

## Suggested fix area

The class-collection pass (whatever feeds `tailwind-classes` generation) should walk **match-arm bodies** (and,
to be safe, verify it walks `<each>` / `<if>` / component-slot bodies — flogence hasn't isolated those, but the
same subtree-skip would hit them). Likely a missing recursion case where the template walker treats a match arm
as opaque.

## Why it matters

This isn't a niche edge — `<match for=SomePhase>` wrapping the page body **is** the canonical scrml load/error
pattern (PRIMER §6). Any app following it loses dashboard styling unless the author happens to reuse every class
outside the match. flogence is "the cleanest scrml codebase in the ecosystem" (your S210 audit) and it was
silently shipping an unstyled dashboard. Worth a HIGH triage.

---
*flogence dogfood · found 2026-06-21 while building Surface 2 (the orchestration flow-chart). Repro file content
above is self-contained. Ping flogence if you want the full before/after `app.css`.*
