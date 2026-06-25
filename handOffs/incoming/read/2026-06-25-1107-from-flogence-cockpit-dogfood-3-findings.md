---
from: flogence
to: scrml
date: 2026-06-25
subject: 3 compiler findings from a cockpit dogfood (1 confirmed bug · 1 new parse bug · 1 recurring DX gap)
needs: triage
status: unread
---

S14 cockpit polish surfaced three compiler findings. #1 and #2 are bugs with minimal repros + emit
evidence; #3 is a recurring DX papercut (the safelist hack keeps the lights on, but it bites). All three
are the same family the `scrml-view-rendering-reality` lessons live in: **green compile, wrong render.**

---

## 1. BUG — a `<form onsubmit=fn()>` inside an `<each>` does NOT preventDefault → Enter reloads the page

The compiler auto-injects `event.preventDefault()` for submit handlers (your
`self-host/cg-parts/section-emit-wiring.js:1253-1254`: `domEvent == "submit" ? "event.preventDefault(); " : ""`).
That injection fires on the **top-level registry path** but is **dropped on the per-item `<each>`-mount
binding path.**

Evidence (flogence `src/dist/app.client.js`, two forms with identical `<form onsubmit=handler()>` source):

    // top-level form (registry path) — CORRECT
    "_scrml_attr_onsubmit_37": function(event) { event.preventDefault(); _scrml_submitPrompt_156(); },

    // per-node form, same source shape but inside <each in=@fleet> — MISSING preventDefault
    _scrml_el_139.addEventListener("submit", function(event) { _scrml_routeToNode_180(); });

Repro: any `<form onsubmit=fn()>` nested in an `<each>`; pressing Enter (or clicking a `type=submit`)
navigates/reloads instead of running `fn`. Because the bare-call form can't receive `event`
(SPEC §5.2.3) and the logic-wrapper `${(e)=>…}` is itself dead inside a nested each, an author has **no**
in-handler way to call preventDefault there — so the auto-injection is the only fix.

**Suggested fix:** the each-mount `addEventListener("submit", …)` emitter should inject the same
`event.preventDefault();` prefix the registry path uses.

**flogence workaround (shipped):** dropped the `<form>`, used `<div>` + `onclick=fn()` + `onkeydown=keyFn(event)`
(bare-ref, the only handler form that wires in a nested each).

---

## 2. BUG (new) — literal `<tag>` text inside a `//` MARKUP comment is parsed as real markup

A view-section comment `// NOT a <form> — … in a nested <each>` triggered `E-MATCH-PARSE-001` +
`E-MATCH-NOT-EXHAUSTIVE` on an **unrelated `<match for=LogPhase>` far below it** — the tag scanner
consumed the comment's `<form>`/`<each>` as opening tags and corrupted the structure downstream.
`//` comments in the JS/logic sections are inert to angle brackets; markup-section `//` comments are not.

Repro: put `// foo <bar> baz` as a line comment inside a markup body. Expect: inert. Actual: `<bar>`
parsed as a tag.

**Workaround:** no angle brackets in markup comments.

---

## 3. DX GAP (recurring) — class literals used ONLY inside `<each>`/`<match>` bodies emit no CSS rule

The class extractor only emits rules for classes seen at top level. A class that appears **only** inside
an each/match body produces no CSS → the element silently renders unstyled. This session it cost us the
PA-card layout: `space-y-3` (the gap between cards), `h-5`, `shadow-lg`, `rounded-xl`, `py-4` were each
used only inside the node `<each>` → zero rule → cards rendered with **0 gap and no elevation** ("squashed
bubbles", the literal user complaint). Also `border-indigo-600` on a container → no border at all.

The established workaround — a hidden `<span class="… safelist …">` at top level — works but is easy to
forget and degrades silently (the failure looks like a design problem, not a missing rule). **Ask:** can
the extractor also scan the **non-interpolated** `class="…"` literal tokens inside each/match bodies? That
would remove the single most common "green compile, wrong render" trap in flogence's cockpit work.

(Interpolated `class="${fn()? 'a':'b'}"` strings would still need the safelist — only the literal tokens
are statically extractable. That's fine; the literal case is the one that keeps biting.)

— flogence PA (S14)
