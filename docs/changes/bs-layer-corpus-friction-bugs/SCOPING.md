# BS-layer corpus-friction bugs — v0.3 program-as-container

**Filed:** 2026-05-14 (S93)
**Surface:** block-splitter (BS) pre-processor + downstream consumers
**Discovered during:** S93 canonical-examples sweep — 21 single-file examples + tutorial + 22/23 multi-file migrated from pre-v0.3 `${}`-wrapped shape to v0.3 program-as-container shape. The migration surfaced five distinct BS-layer + downstream-pass bugs that prevented full program-as-container canonical form on certain shapes; documented workarounds were applied, deferred for compiler-side fix.

**Surface origin:** all five fire at `<program>` direct-child level when the BS-layer encounters a shape the splitter mis-classifies. Workarounds invariably involve wrapping the offending construct in an explicit `${ ... }` block — which **defeats the v0.3 program-as-container canonical** because it forces adopters back to the pre-v0.3 shape.

**Adopter impact:** moderate. Each bug has a clean workaround, but the workarounds collectively cause `W-PROGRAM-REDUNDANT-LOGIC` false positives + the corpus-ouroboros risk per pa.md S86 (agents see workaround pattern → reproduce it → cycle).

**Spec relationship:** SPEC §40.8 / §40.8.1 normatively says `<program>` body default mode is logic. Per pa.md Rule 4 (spec is normative; derived docs are not), the SPEC wins — the compiler must catch up. Per S86 BS-extension-over-SPEC-retreat ratification (Option A), implementation is the right side to fix.

**Cumulative est:** 16-32h aggregate (each individually small-to-medium; share BS-layer locus → may admit batched fix).

---

## Bug 1 — markup-context `//` line comments trigger E-TYPE-026 downstream

### Symptom

Markup-text that includes a `//` line comment (a developer comment inside a markup section) causes `E-TYPE-026` to fire on unrelated identifiers downstream in the file.

### Reproduction

```scrml
<program>
    <count> = 0

    <div>
        // This is a developer comment — explaining the markup intent
        <p>${@count}</p>
    </div>
</program>
```

### Expected

`//` inside markup text is either (a) treated as literal text and rendered verbatim, OR (b) recognized as a developer comment + stripped from output. Either is reasonable; both are not load-bearing for adopters who learn the convention.

### Actual

E-TYPE-026 fires on identifiers downstream. The S05 bisect precedent (cited in canonical-examples-sweep progress.md) traced the failure to the `//` being mis-parsed as a JS-style logic-block comment that consumes content into a wrong scope.

### Workaround applied during S93 sweep

Replaced markup-context `//` comments with HTML `<!-- ... -->` comments. Documented in `examples/05-multi-step-form.scrml` migration log.

### Suspected root cause

BS-layer's mode-switching (markup vs logic context) treats `//` as a logic-mode boundary signal even when it appears in markup text. The splitter should preserve `//` as markup text when in markup context.

### Spec references

- SPEC §40.8 — `<program>` body default mode
- §4.X — markup text grammar (literal characters, including punctuation)

### Est: 2-4h (single BS-layer mode-classification fix; surface narrow)

---

## Bug 2 — `const Name = <markup>` component-def shape doesn't auto-lift at `<program>` direct-child level

### Symptom

Component definitions in the canonical scrml shape (`const ComponentName = <markup props={...}>...</markup>`) fail to compile when declared as direct text children of `<program>`. The BS-layer splits `const Name = ` (text/logic) from `<markup>...</markup>` (markup block), and the downstream lift pass cannot re-pair them into a single component definition.

### Reproduction

```scrml
<program>
    <state> = 0

    // Fails: BS splits the const decl from its markup RHS
    const TodoRow = <li class="row" props={ item: Todo }>
        <span>${@item.name}</span>
    </>

    <div>...</div>
</program>
```

### Expected

The `const Name = <markup>` form is recognized as a single component definition expression; the markup RHS is bound to the const identifier as a component-def value. This works inside `${ ... }` blocks today.

### Actual

E-* compile error on the dangling `<li ...>...</li>` markup; the `const TodoRow = ` text is treated as an incomplete expression.

### Workaround applied during S93 sweep

Component definitions kept inside `${ ... }` wrappers within `<program>` body, despite the `W-PROGRAM-REDUNDANT-LOGIC` false-positive that this incidentally triggers. Documented in `examples/05-multi-step-form.scrml` + 22-multifile/components.scrml migration logs.

### Suspected root cause

BS-layer splits on the `<` token transition from text-mode to markup-mode without considering that the preceding `const Name = ` text is the LHS of an assignment whose RHS is the markup. The lift pass that should re-pair "lift the markup block back as the RHS of the const decl" doesn't recognize the pattern at `<program>` direct-child level (it works inside `${ ... }` blocks because the surrounding `${ }` keeps everything in one logic scope from the BS perspective).

### Spec references

- SPEC §15.13 — component declarations
- SPEC §40.8 — `<program>` body logic-default mode
- L1 / Pillar 1 — markup-as-first-class-value (the RHS-as-markup pattern is canonical)

### Est: 4-8h (BS-layer needs to recognize `<NAME> = <markup>` pattern at `<program>` direct-child level OR lift pass needs to re-pair across split fragments; cross-pass coordination required)

---

## Bug 3 — Template-literal `${ident}` interpolation inside bare functions at `<program>` direct-child level fires E-SCOPE-001 on inner identifiers

### Symptom

A function declared as a direct child of `<program>` whose body contains a JavaScript template literal with `${ident}` interpolation (e.g., `` `${hh}:${mm}` `` for time formatting) fires `E-SCOPE-001` on the interpolation identifiers (`hh`, `mm` in this example).

### Reproduction

```scrml
<program>
    <timestamp> = 0

    function formatTime(ms) {
        const d = new Date(ms)
        const hh = String(d.getHours()).padStart(2, "0")
        const mm = String(d.getMinutes()).padStart(2, "0")
        return `${hh}:${mm}`    // E-SCOPE-001 on hh and mm
    }
</program>
```

### Expected

Template-literal `${ident}` interpolation inside a string literal is just JavaScript template-string syntax — `hh` and `mm` are local identifiers in scope; the template literal produces a string. No diagnostic.

### Actual

The BS-layer treats the `${` inside the backtick template literal as the start of a NEW scrml logic block, breaking the function body into two fragments. The inner identifiers (`hh`, `mm`) fall out of scope because the splitter has prematurely closed the function body's lexical scope.

### Workaround applied during S93 sweep

Wrap the function in an explicit `${ ... }` block (despite `W-PROGRAM-REDUNDANT-LOGIC` false-positive). Documented in `examples/15-channel-chat.scrml` migration log.

### Suspected root cause

BS-layer's `${` detection doesn't track JS string-literal context. The `${` inside a backtick template literal is a string-interpolation sigil at the JS level, NOT a scrml mode-switch boundary. The splitter must track JS template-literal nesting depth + ignore `${` inside backticks.

### Spec references

- SPEC §40.8 — `<program>` body logic-default mode
- JS template literal semantics (ECMAScript Template Literal grammar)

### Est: 3-5h (BS-layer needs JS-aware lexer state for template-literal tracking; should be a local enhancement to existing string-state machinery)

---

## Bug 3-adjacent — `${ident}` in `renders <p>` markup-context interpolation inside type-decl body fires E-SCOPE-001

### Symptom (similar shape to Bug 3 but different locus)

An enum type declaration with `renders <markup>` clauses containing `${ident}` markup-interpolation fires `E-SCOPE-001` on the interpolation identifiers when the type is declared as a direct child of `<program>`.

### Reproduction

```scrml
<program>
    type ContactError:enum = {
        InvalidEmail(email: string)
            renders <p class="text-red-600">${email} is not valid.</p>
        // E-SCOPE-001 on `email` ^^^^^^^^
    }
</program>
```

### Expected

`${email}` inside `renders <p>...</p>` is markup-context interpolation; `email` is the payload binding from the variant declaration `InvalidEmail(email: string)`. The interpolation should resolve cleanly.

### Actual

E-SCOPE-001 on `email`. Same root cause class as Bug 3 — BS-layer treating markup-context `${ident}` as logic-context. But the locus differs: this is inside a TYPE DECLARATION's `renders` clause, not inside a function body.

### Workaround applied during S93 recovery

09-error-handling.scrml retained file-top `${ ... }` wrapper around the type declaration. Documented in the file header comment + commit `6469e96`.

### Suspected root cause + fix shape

Same as Bug 3 — BS-layer should recognize markup-context `${ident}` and not split on it. The `renders <markup>` clause body is markup-context. Fix may share code path with Bug 3 (template-literal tracking).

### Est: probably batched with Bug 3 (same underlying mode-tracking gap)

---

## Bug 4 — HTML `<!-- ... -->` comments INSIDE `${}`-wrapped component-def bodies cause downstream E-COMPONENT-035

### Symptom

A component definition that's wrapped in `${ ... }` (the Bug-2 workaround) and contains HTML `<!-- ... -->` comments INSIDE the component's markup body fires `E-COMPONENT-035` on the component's downstream use-sites.

### Reproduction

```scrml
<program>
    ${
        const Card = <div class="card" props={ title: string }>
            <!-- This comment breaks downstream E-COMPONENT-035 -->
            <h2>${title}</h2>
        </>
    }

    <Card title="Hello"/>   // E-COMPONENT-035 fires here
</program>
```

### Expected

HTML `<!-- ... -->` comments inside component-def markup bodies are stripped from output (or preserved as DOM comments). The component definition compiles cleanly; downstream use-sites work.

### Actual

E-COMPONENT-035 fires on `<Card .../>` use-sites. The agent's notes attribute this to comment-parsing inside the component-def markup body confusing the component-expander pass.

### Workaround applied during S93 sweep

REMOVE markup comments from inside component-def bodies. Documented in canonical-examples-sweep progress.md.

### Suspected root cause

Component-expander (CE) pass doesn't correctly skip `<!-- ... -->` comments when walking component-def body markup; the comment is consumed into the component's prop/child registry somehow, producing a malformed component shape that fails downstream validation as E-COMPONENT-035.

### Spec references

- SPEC §15 — component declarations
- SPEC §34 — E-COMPONENT-035 catalog entry (definition)

### Est: 2-4h (CE-pass walker needs to skip HTML comment nodes; narrow fix)

---

## Recommended dispatch shape

Bugs 1, 2, 3, 3-adjacent, 4 all share **BS-layer + downstream pass mode-classification** as a common surface. Two reasonable dispatch decompositions:

### Option A — single batched dispatch (Recommended)

Dispatch `scrml-js-codegen-engineer` (Tools: Read/Write/Edit/Glob/Grep/Bash; T1 compiler-source surface) with the full bug-batch. Agent maps each bug to its actual touchpoint, surveys the shared BS-layer mode-state machinery, plans the fix order (probably Bug 3 + 3-adjacent first since they share template-literal-tracking; then Bug 1; then Bug 2 + Bug 4 which are cross-pass).

- Est: 16-32h aggregate
- Single review gate
- Tests: per-bug regression test added to `compiler/tests/unit/` confirming the canonical shape compiles

### Option B — per-bug dispatches (sequential)

One dispatch per bug. Lower batched-context-loss risk but higher PA orchestration overhead.

### Trigger conditions for "fire now"

- A future canonical-examples-corpus regen would naturally re-trigger the workarounds → fixing now eliminates the `W-PROGRAM-REDUNDANT-LOGIC` false-positives across the corpus
- Adopter friction reports on any of these shapes would accelerate the dispatch
- BS-layer touch as part of any other v0.3.1 work could opportunistically fold in fixes

---

## Cross-link

- Canonical-examples sweep landing: commits `a011a1d` (19 examples + 22/23 + tutorial partial) + `6469e96` (09-error-handling) + `1054f22` (tutorial completion)
- Mario proof-of-shape: `a2f9f9b`
- Progress log with original "LESSON LEARNED" entries: `docs/changes/canonical-examples-sweep/progress.md`
- S86 ouroboros warning: user-voice S86 — corpus is artifact, not evidence of design intent
- S88 stated-intent-vs-corpus rule: `feedback_stated_intent_vs_corpus_migration.md` (PA auto-memory)
