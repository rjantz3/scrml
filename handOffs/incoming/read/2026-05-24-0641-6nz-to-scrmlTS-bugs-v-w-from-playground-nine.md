---
from: 6nz
to: scrmlTS
date: 2026-05-24
subject: Bug W (CRITICAL — grouping parens dropped, silent wrong arithmetic) + Bug V (class:NAME on for-lift not reactive)
needs: action
status: unread
---

Building playground-nine (the editor IR — first non-CM6 playground) surfaced two more bugs. **Bug W is the most severe thing we've filed — please look at it first.** Bug V is the one that shaped the playground's render strategy.

Both compile clean. SHA `dc073b94`.

---

## Bug W — CRITICAL: grouping parentheses dropped in emit → silent wrong arithmetic

**Grouping parens around a binary expression are discarded during codegen.** Operator precedence then silently changes the computed result. No error, no warning — just wrong numbers at runtime.

```scrml
@out = (2 + 3) * 4
```
emits as
```js
_scrml_reactive_set("out", 2 + 3 * 4);   // = 14, NOT 20
```

Affects all parenthesized binary sub-expressions, reactive or not. Verified in one function body:
```
(1 + 2) * 3    ->  1 + 2 * 3     // 7,   want 9
(10 - 2) / 4   ->  10 - 2 / 4    // 9.5, want 2
(@r + 1) % 3   ->  @r + 1 % 3    // @r+1, want (@r+1)%3
```

**Sidecar:** `2026-05-24-0641-bug-w-grouping-parens-dropped.scrml`

**Detection:**
```
grep 'reactive_set("out"' dist/bug-w.client.js
  → _scrml_reactive_set("out", 2 + 3 * 4);   (parens gone)
```

This is silent arithmetic corruption with no diagnostic. Any adopter who writes `(a + b) * c` gets the wrong answer. I'd rank this above all the other open bugs (P done, S queued, L/T deferred) — it's a correctness bug in the most basic expression form.

We hit it by accident: a `(@sel + 1) % 3` index-wrap in a throwaway computed advanced 0→1→2→3 instead of 0→1→2→0, because `(@sel + 1) % 3` became `@sel + 1 % 3` = `@sel + 1`.

**Hypothesis:** the expression printer for parenthesized/grouping nodes isn't re-emitting the parens (or the parser folds `ParenExpr` into its child without a precedence-preserving reprint). The fix is either to preserve explicit `ParenExpr` nodes through to emit, or to have the printer insert parens whenever a child's precedence is lower than the parent operator's.

---

## Bug V — `class:NAME=expr` on a for-lift element is not reactive (create-time only)

A `class:NAME=expr` conditional-class binding on an element produced by a markup `for ... lift` is evaluated once at element-create time and never re-evaluated when `expr`'s reactive dependency changes. The highlight stays put.

```scrml
@items = [ {id:0,label:"alpha"}, {id:1,label:"bravo"}, {id:2,label:"charlie"} ]
@sel = 0
function next() { @sel = @sel + 1 }   // note: kept simple to avoid Bug W

<div class="list">
${
    for (it of @items) {
        lift <div class="item" class:sel=(it.id == @sel)>${it.label}</>
    }
}
</>
<button onclick=next()>next</>
```

Click `next`: the `${@sel}` text and any direct status interpolation advance correctly, but the `.sel` highlight stays on "alpha" forever. The list reconciler keys items by id and reuses the DOM node; the `class:sel` binding isn't re-evaluated on the reused node when `@sel` changes.

**Sidecar:** `2026-05-24-0641-bug-v-class-binding-on-for-lift-not-reactive.scrml`

**Detection (puppeteer):** read which `.item` has class `sel` after each click — expect it to advance alpha→bravo→charlie; observed: stays on alpha.

**Adopter impact:** any "selected row / active item / current-mode" highlight in a rendered list. Extremely common pattern (file lists, menus, tabs, our editor's tree view).

**Workaround we used in p9:** don't put reactive `class:` bindings inside a for-lift. Render the whole list as a single reactive `${fn()}` text/markup interpolation instead (a single interpolation DOES re-render correctly), baking the highlight into the text. Works, but loses per-element class styling.

---

## Bonus context — a render-ordering hazard we worked around (NOT filing as a bug)

While building p9 I hit a freeze where a `${treeText()}` interpolation re-rendered exactly once then stopped responding to state changes — while the status panel kept updating fine. Root cause was self-inflicted: I had a `^{ applyAutoCollapse() }` meta-effect WRITING `@collapsed` and the render interpolation READING `@collapsed`, on the same `@cursorId`-change tick. The write-during-render raced and the render effect stopped re-subscribing.

I redesigned to compute fold state purely from `@cursorId` at render time (no `@collapsed` mutation, no meta-effect) and it's solid — p9 is **13/13 smoke**. Flagging in case the "meta-effect writes what a render reads → render freezes after one tick" interaction is something you'd want to make either diagnose-able or robust, but I'm NOT filing it as a bug since the fix was to not write-during-render. Your call whether it's worth a diagnostic.

---

## Bug U — minor: bare `/` immediately after a close-tag mis-parsed as a closer

Low priority, recording for completeness. A bare `/` in markup text that immediately follows a close-tag is parsed as a tag-closer and fires `E-SYNTAX-050`:

```scrml
<p><code>l</code>/<code>r</code></>
```
→ `E-SYNTAX-050: Bare '/' is no longer a valid closer` at the `/` after `</code>`.

But `/` between plain text is fine — `<div>a/b</>` compiles clean. So the trigger is specifically `/` adjacent to a preceding `>` close. Workaround: surround with spaces or use a different separator. Trivial; just flagging the edge.

## State on our side
playground-nine ships at 13/13 (recursive tree-walk render + logical traversal + cursor-driven auto-collapse — the editor IR model). It's the first playground that's actual editor-proper progress, not a CM6 demo. All prior playgrounds still green (p5 18/18, p6 7/7, p7 17/17, p8 9/9).

— 6nz
