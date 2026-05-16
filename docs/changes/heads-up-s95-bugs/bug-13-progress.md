# Bug 13 — `class:NAME=(expr)` parens-form emits as literal HTML attribute

## Summary

Inside `lift` templates (and the BS+TAB re-parse path), the `class:NAME=...` directive
was bypassing all reactive-wiring logic and falling through to the generic attribute
emit path — producing `setAttribute("class:NAME", String(...) ?? "")`. This is a
literal HTML attribute the browser ignores; no reactive toggling occurred.

The top-level (non-lift) path was already correct — handled in `emit-bindings.ts`
via a `data-scrml-class-NAME` marker + querySelector + `_scrml_effect`. The lift
path simply needed parity wiring (with `elVar` reused directly instead of a
querySelector since the factory closure already holds the element reference).

## Bug catalog before fix

All four §5.5.2 grammar arms broken inside `lift` templates:

| Form | Source | Pre-fix emit |
|---|---|---|
| `@var` | `class:active=@isActive` | `setAttribute("class:active", _scrml_reactive_get("isActive"))` |
| `obj.prop` | `class:done=todo.done` | `setAttribute("class:done", todo.done)` |
| `(expr)` | `class:active=(@a == 1)` | `setAttribute("class:active", String(_scrml_structural_eq(...) ?? ""))` |
| `fn(args)` | `class:active=fn()` | `setAttribute("class:active", String(fn() ?? ""))` |

Non-lift path was already correct — no regression introduced.

## Investigation

- `compiler/src/codegen/emit-bindings.ts` lines 491-593 — top-level class: dispatch (correct).
- `compiler/src/codegen/emit-lift.js` lines 396-508 — `emitSetAttrs` (string-attrs path) was missing class:.
- `compiler/src/codegen/emit-lift.js` lines 550-672 — `emitCreateElementFromMarkup` (AST path) was missing class:.

Confirmed reproducer:

```scrml
<program title="Bug 13 Lift Repro">
    <items>: number[] = [1, 2, 3]
    <selected>: number = 1
    <ul>${
        for (let item of @items) {
            lift <li
                class="task"
                class:dragging=(isDraggingThis(@selected, item))
                onclick=pick(item)
            >Item ${item}</li>
        }
    }</ul>
    function pick(i: number) { @selected = i }
    fn isDraggingThis(c: number, target: number) -> boolean { return c == target }
</program>
```

Pre-fix emit:
```js
_scrml_lift_el_10.setAttribute("class:dragging", String(_scrml_isDraggingThis_5(_scrml_reactive_get("selected"), item) ?? ""));
```

Post-fix emit:
```js
_scrml_lift_el_10.setAttribute("class", "task");
_scrml_effect(() => { _scrml_lift_el_10.classList.toggle("dragging", !!(_scrml_isDraggingThis_5(_scrml_reactive_get("selected"), item))); });
```

## Fix

Two parallel branches added in `compiler/src/codegen/emit-lift.js`:

1. **`emitSetAttrs`** (string-attrs path, after `if=` branch): When attr name starts
   with `class:`, emit `_scrml_effect(() => elVar.classList.toggle(NAME, !!(expr)))`
   where `expr` is `emitExprField(null, raw, {mode:"client"})` to rewrite `@var`
   refs into `_scrml_reactive_get(...)`.

2. **`emitCreateElementFromMarkup`** (AST-attrs path, before value-kind dispatch):
   Same shape, but switched on `val.kind`:
   - `variable-ref` (handles both `@var` and `obj.path` since emitExprField passes
     plain identifiers through)
   - `expr` (parens form)
   - `call-ref` (function call — reconstruct `fn(args)`)

Unlike the top-level path, no `data-scrml-class-NAME` marker is needed because
the lift factory has direct access to the element via `elVar`. The effect's
auto-tracking subscribes to any `_scrml_reactive_get` call inside the rewritten
expression; closure-captured for-loop iterables stay fixed (correct behavior —
per-iteration factory closure pins them).

## Closure note

FOLLOWUPS.md Bug 13 — closed. Lift-template parity with top-level emission for
all four §5.5.2 grammar arms.
