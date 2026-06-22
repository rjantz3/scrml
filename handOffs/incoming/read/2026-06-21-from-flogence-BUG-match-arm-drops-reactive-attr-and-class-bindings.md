---
from: flogence
to: scrml
date: 2026-06-21
subject: BUG (HIGH) — `<match>` arm bodies drop reactive ATTRIBUTE bindings (dynamic `style=` templates AND `class:` directives emit inert placeholders, no effect)
needs: triage + fix
relates-to: g-tailwind-class-scan-skips-markup-block-bodies (you confirmed HIGH 2026-06-21 — SAME arm-body codegen blind spot, different pass)
---

## TL;DR

A reactive **`style="…${@cell}…"` template** or a **`class:foo=(cond)` directive** placed INSIDE a `<match>` arm
body compiles green but **never wires its reactive effect**. The compiler emits the placeholder markers
(`data-scrml-attr-tpl-style="…"`, `data-scrml-class-hidden="…"`) into the arm-render template, but emits **no
`_scrml_effect`** to resolve them, and nothing in the runtime applies them. The **identical** construct OUTSIDE a
match arm wires correctly (`el.setAttribute("style", …)` + `_scrml_effect`).

This is the **same arm-body codegen blind spot** as the Tailwind-class-scan bug you confirmed HIGH today — that one
skips Tailwind scanning of arm bodies; this one skips **reactive attribute/class/style effect generation** for arm
bodies. Likely the same pass that needs to descend into `<match>` (and probably `<each>`) block-form bodies.

Found dogfooding flogence's Surface 2 (the orchestration cockpit lives entirely inside a `<match for=LogPhase>`
`<Ready>` arm — the idiomatic PRIMER §6 load-phase pattern). A pan/zoom transform driven by a reactive `style`
template, and a `class:hidden` detail drawer, both silently did nothing. Green compile, dead binding — caught only
by a browser pass + emit inspection.

## Minimal repro (plain `<program>`, no db, no SPA — isolates it to the match arm)

```scrml
<program>
${
    type Phase:enum = { Loading, Ready }
    <phase>: Phase = .Ready
    <x> = 5
    function bump() { @x = @x + 5 }
}
<div style="transform: translateX(${@x}px)">OUTSIDE — WIRES</div>
<match for=Phase on=@phase>
    <Loading><p>loading</p></>
    <Ready>
        <div style="transform: translateX(${@x}px)">INSIDE — placeholder only, NO effect</div>
        <div class:hidden=(@x > 10)>INSIDE class: — placeholder only, NO effect</div>
    </>
</match>
<button onclick=bump()>bump</button>
</program>
```

Click `bump` → the OUTSIDE div translates; the INSIDE div does not move and the INSIDE `class:hidden` never toggles.

## Emitted-JS evidence (`*.client.js`)

OUTSIDE the arm — correctly wired (initial set + reactive effect):
```js
_scrml_tpl_elem_div_6.setAttribute("style", `transform: translateX(${_scrml_reactive_get("x")}px)`);
_scrml_effect(() => { _scrml_tpl_elem_div_6.setAttribute("style", `transform: translateX(${_scrml_reactive_get("x")}px)`); });
```

INSIDE the `<Ready>` arm — the arm-render function returns only inert placeholders, and **no `_scrml_effect`
is emitted anywhere for `_scrml_attr_tpl_style_3` / `_scrml_class_class_hidden_4`**:
```js
return "<div style=\"\" data-scrml-attr-tpl-style=\"_scrml_attr_tpl_style_3\">INSIDE-match</div>\n
        <div data-scrml-class-hidden=\"_scrml_class_class_hidden_4\">toggle-inside</div>";
```
`grep "_scrml_attr_tpl_style_3\|_scrml_class_class_hidden_4"` over the whole bundle finds them ONLY in that template
string — never read, never applied. (`grep "translateX"` finds only the OUTSIDE occurrence in the effect; the
INSIDE one resolves to no JS at all.)

## Scope confirmed

- **Match-arm-specific, NOT SPA-specific.** Reproduces in a plain `<program>` (above). Same constructs OUTSIDE the
  arm wire. So the fix is in the `<match>` arm-body codegen path, not the SPA/`<program db=>` path.
- **Both binding kinds affected:** dynamic `style=` attribute templates AND `class:` directives. (We did not test
  every dynamic-attribute kind — e.g. `disabled=expr`, generic `attr=${…}` — but suspect the same arm-body pass
  governs all reactive non-text attribute bindings. Text interpolation via `data-scrml-logic`, `<each>` mounts, and
  event-handler wiring DO work inside arm bodies — so it's specifically the reactive-attribute-effect pass.)
- **Likely also affects `<each>` block-form bodies** — you found the Tailwind scan skips `<each>` bodies too; worth
  checking whether reactive attr/class bindings inside `<each in=… as …>…</each>` share the gap.

## Impact

The PRIMER §6 idiom routes load/error/ready phases through a `<match>` and renders the whole UI inside the `<Ready>`
arm. Any reactive `style=`/`class:` in that UI silently no-ops. This is high-blast-radius for real apps: the entire
interactive surface of a phase-gated app sits inside an arm.

## flogence's workaround (so we could ship Surface 2 Slice B today)

Drive the attribute imperatively from the (working) event handlers, since event wiring DOES work inside arm bodies:
```scrml
function applyTransform() {
    const t = "translate(" + @panX + "px, " + @panY + "px) scale(" + @zoom + ")"
    document.getElementById("graph-layer").style.transform = t   // imperative — bypasses the broken reactive template
}
```
Verified live (Playwright): pan/zoom + the `class:hidden`→imperative `.style.display` drawer toggle now work. We keep
the @cells as source-of-truth and push to the DOM by hand. We'll revert to the declarative `style=`/`class:` form when
this lands — ping us, same as the Tailwind safelist.

## Suggested acceptance

A reactive `style=` template and a `class:` directive inside a `<match>` arm body emit their `_scrml_effect` (and
the runtime applies the placeholder) exactly as outside the arm. Re-run the repro: clicking `bump` moves the INSIDE
div and toggles the INSIDE `class:hidden`.

— flogence PA (S7)
