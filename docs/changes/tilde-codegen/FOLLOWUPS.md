# `~` codegen follow-ups (surfaced during S94 example sprinkle)

**Filed:** 2026-05-15 (S94)
**Companion:** `SURVEY.md` (S94 codegen-lowering dispatch survey) +
`ROUND-TRIP-SURVEY.md` (S94 parser round-trip survey).

**STATUS UPDATE (2026-05-15 S95):** Gaps 5/6/7 are all **CLOSED** by the
follow-up dispatch at `docs/changes/tilde-gaps-567/`. The end-to-end `~`
codegen surface is now complete for v0.3.x. Regression coverage lives at
`compiler/tests/integration/tilde-gaps-567.test.js` (11 tests). The four
S94 SURVEY-deferred items (E-TILDE-001/002 ExprNode-form firing,
unbound-if-as-expression parse, accumulation-lift tilde, function-body
value-lift coverage) remain open and are tracked separately. Two new
gaps surfaced during the S95 investigation — see "New gaps surfaced"
section below.

When PA wrote `examples/24-tilde-pipeline.scrml` and retrofitted
`examples/16-remote-data.scrml`'s `load()` function with `~`, three additional
shape gaps surfaced that the agent's regression suite did not cover. Each is a
genuine compiler gap, not a misuse on PA's part. Filing here so the next
`~`-codegen work picks them up.

The pre-commit-blocking round-trip bug (parseExprToNode reparse without
tildeActive falling through to escape-hatch) is **already closed** at commit
`09cd0c7`. The three gaps below remain open.

---

## Gap 5 — `~` after `!{}` handler doesn't lower — **CLOSED S95**

**Closure:** Fixed at S95 commit `150c3dd`. `case "guarded-expr"` now wires
`opts.tildeContext.var = resultVar` at its tail when an outer tildeContext is
active AND the guardedNode is a bare-expr (i.e., no explicit binding name).
The success-path value lives in resultVar; subsequent `~` references lower
correctly. Companion: `nodeContainsTildeRef` extended to walk `guardedNode`
and `arms.handler/handlerExpr` so the pre-scan correctly detects `~`-bearing
guarded-expr shapes. Regression coverage: 3 tests in
`compiler/tests/integration/tilde-gaps-567.test.js`.


### Shape

```scrml
function loadAndFormat(id: number) -> string {
  loadItem(id) !{
    | .NotFound -> { return "missing" }
    | .Timeout  -> { return "timeout" }
  }
  return format(~)        // bare `~` leaks to JS
}
```

### Symptom

Codegen produces `return _scrml_format_7(~);` — the literal `~` token is in the
emitted JS, which JS parses as bitwise-NOT prefix; the following `)` is then an
expression-expected SyntaxError.

### Probable root cause

The `failable-call with !{}-handler` construct lowers via a different AST path
than a plain `bare-expr` call. The `_tildeActive` flag in ast-builder
(extended in `a10ef65` to fire after bare-expr) does NOT fire after this
construct. The S94 codegen-lowering fix addressed `bare-expr` activation; the
failable-handler-call shape needs an analogous fix.

This is load-bearing for the v0.4 body-split arc described in
`docs/website/roadmap-from-v0.3-2026-05-14.md` ("Surfaces that will likely
change visibility" section) — the canonical post-v0.4 failable pipeline is
exactly this shape:

```scrml
fetchUser(id) !{ | ::NotFound -> { return } }
validateUser(~) !{ | ::Invalid -> { return } }
saveToDB(~) !{ | ::DBError -> { return } }
```

Without this gap closed, the roadmap's framing claim doesn't hold.

### Suspected fix surface

- `compiler/src/ast-builder.js` — extend `_tildeActive` activation to fire
  after the failable-handler-bearing call node kind (whatever AST shape the
  parser produces — likely `bare-expr` containing a `failable-call` with an
  `handler:` field).
- Verify the result-binding side: when the handler is exhaustive and no arm
  returns, the failable call DOES produce a value (the success path). That
  value should initialize `~` analogously to a plain bare-expr call.

### Est: ~2-4h (parser-side flag extension + regression tests)

---

## Gap 6 — `~` at `<program>` direct-child position silently dropped — **CLOSED S95**

**Closure:** Fixed at S95 commit `7cf501b`. The root cause turned out to be a
text-block-fragmentation issue: a JS line comment (`// ...`) extracted by BS
as a separate `comment` child flushes the preceding text accumulator, and a
text fragment AFTER the comment that opens with a bare-call (not a decl
keyword) fails BARE_DECL_RE / TOPLEVEL_STATE_DECL_RE and stays as a TEXT
node. Fix: `ast-builder.js` adds a sibling lift in `liftBareDeclarations`
that wraps text fragments containing a `~` token (`TILDE_TOKEN_RE`) into a
synthetic `${...}` logic block when `parentType === "state"` (i.e.,
`<program>`, `<page>`, `<channel>` direct-child position). The `~` is a
robust logic-mode sentinel (SPEC §32 normative). Regression coverage:
4 tests in `compiler/tests/integration/tilde-gaps-567.test.js`. The
`examples/24-tilde-pipeline.scrml` workaround has been removed.


### Shape

```scrml
<program>
  function step1(n: number) -> number { return n + 10 }
  function step2(n: number) -> number { return n * 3 }

  step1(2)                       // SILENTLY DROPPED from output
  const result = step2(~)        // SILENTLY DROPPED from output
  const piped = step2(7)         // survives (no ~ involved)
</program>
```

### Symptom

The compiled JS contains the function declarations and the `const piped`
binding, but **the `step1(2)` and `const result = step2(~)` lines are missing
entirely from the output**. Downstream `${result}` in markup fires
`E-SCOPE-001: Undeclared identifier 'result'` because the binding was dropped.

Wrapping in an explicit `${}` logic block makes the same code work:

```scrml
${
  step1(2)
  const result = step2(~)        // lowered correctly: let _scrml_tilde_N = step1(2); const result = step2(_scrml_tilde_N);
}
```

### Probable root cause

The v0.3 program-as-container logic-default-mode auto-lift at `<program>`
direct-child position handles function decls + simple const decls, but the
`~`-bearing const-decl + preceding bare-call pair isn't recognized by the
BS-layer's auto-lift detection. Sibling to the BS-batch v2 residuals (commit
`2201556`) — the BS layer has a finite set of recognized lift patterns and
this shape isn't in it.

### Suspected fix surface

- `compiler/src/block-splitter.js` — the auto-lift detection at `<program>`
  direct-child needs to recognize bare-call-followed-by-const-with-~ as a
  pair-to-lift. Today it may be auto-lifting them independently (or dropping
  them) when the BARE_EXPR + CONST_DECL pair is wrapped by the same `${}`.
- Alternatively: `compiler/src/ast-builder.js` BARE_DECL_RE handling for
  text fragments at `<program>` direct-child may need to recognize this
  specific pattern.

### Workaround in `examples/24-tilde-pipeline.scrml`

The example wraps the `~` chain in an explicit `${}` block:

```scrml
${
  step1(2)
  const result = step2(~)
}
```

This produces correct codegen. Once Gap 6 closes, the explicit wrapper can be
dropped to match the v0.3 canonical shape.

### Est: ~4-6h (BS-layer pattern extension + regression tests + corpus migration)

---

## Gap 7 — pure consume+reinit chain self-references — **CLOSED S95**

**Closure:** Fixed at S95 commit `5a28dbb`. `case "bare-expr"` (Phase 3 fast
path at emit-logic.ts:1150 + legacy-string-path at :1306) reordered to
capture `_makeExprCtx(opts)` BEFORE overwriting `opts.tildeContext.var =
tVar`. Pre-fix, `_makeExprCtx` captured the JUST-WRITTEN new tVar into
`ctx.tildeVar`, so `~` in the RHS resolved to the SELF-name. Post-fix, the
RHS emits with the PREVIOUS tildeVar; the new tVar takes effect for the
NEXT statement. Regression coverage: 3 tests in
`compiler/tests/integration/tilde-gaps-567.test.js`.


### Shape

```scrml
step1(2)              // ~ = 12
step2(~)              // SHOULD consume previous ~, reinit ~ to 36
const final = ~       // SHOULD be 36
```

### Symptom

Codegen:

```js
let _scrml_tilde_5 = _scrml_step1_3(2);
let _scrml_tilde_6 = _scrml_step2_4(_scrml_tilde_6);   // self-reference — uses _scrml_tilde_6 in its OWN initializer
const final = _scrml_tilde_6;
```

The "unbound call that BOTH consumes the previous `~` AND becomes the new `~`"
pattern produces a self-referencing `let` declaration. At runtime,
`_scrml_tilde_6` is `undefined` in its initializer, so `step2(undefined)` runs
with NaN-producing semantics; `final` is whatever `step2(undefined)` returned
(NaN, "NaN", etc. depending on the function).

### Probable root cause

The codegen emits a fresh `_scrml_tilde_<N>` variable for every unbound call
that has tilde-tracking active. When that call's argument references `~`
(the PREVIOUS one), the codegen substitutes the NEW variable name (the one
being declared), not the previous one. Off-by-one in the tilde-variable
assignment order.

### Suspected fix surface

- `compiler/src/codegen/emit-logic.ts` — the per-statement tildeContext setup
  needs to track "previous `~` name" vs "new `~` name being initialized in
  this statement." The current code uses the same name for both.

### Workaround

Use bound intermediates (the agent's Test 2 pattern):

```scrml
step1(5)
const a = step2(~)          // bound consume; safe
step3(a)                    // unbound, reinitializes ~
const result = ~            // consume final ~
```

### Est: ~2-3h (codegen tildeContext sequencing fix + regression tests)

---

## Cumulative status of `~` codegen surface

The S94 dispatches landed:
- **Codegen-lowering** (`d37b1f5`) — smoke case + two-link bound-consume chain +
  function-body pipeline + scope-shadowing + tree-shake.
- **Parser round-trip** (`09cd0c7`) — `parseExprToNode → emitStringFromTree →
  parseExprToNode` is now stable for all `~` shapes; pre-commit corpus invariant
  test passes for `~` examples.

The S95 dispatch landed (this dispatch — `docs/changes/tilde-gaps-567/`):
- **Gap 5 — `~` after `!{}` handler** (`150c3dd`) — codegen `case "guarded-expr"`
  now wires `opts.tildeContext.var = resultVar` so `~` carries forward.
- **Gap 6 — text-block at `<program>` direct child** (`7cf501b`) — ast-builder
  adds `TILDE_TOKEN_RE` sentinel-based auto-lift; comment-fragmented text
  with `~` now lifts cleanly.
- **Gap 7 — pure consume+reinit chain self-reference** (`5a28dbb`) — bare-expr
  Phase 3 (and legacy) fast paths reorder `_makeExprCtx` capture before
  overwriting `opts.tildeContext.var`.

Tests cover those shapes (19 round-trip + 5 codegen-lowering + 11 gaps-567).

**Remaining S94 SURVEY-deferred items:**
- E-TILDE-001/002 not firing on ExprNode-form `~` reads.
- Unbound if-as-expression parser gap.
- Accumulation-lift not honoring tildeContext (markup `<ul>${ for ... { lift <li>.../ } }`).
- Function-body value-lift untested (`lift 3` as standalone statement).

**Adopter-facing impact:** the v0.4 body-split arc framing in
`docs/website/roadmap-from-v0.3-2026-05-14.md` now holds — failable pipelines
compile cleanly. Adopters can write `~` chains at `<program>` direct-child
position WITHOUT an explicit `${}` wrapper. Chains of arbitrary length are
supported (Gap 7 closed).

## New gaps surfaced during S95 investigation

- **Gap 8 — `guarded-expr` arm-body emission produces invalid JS.** The
  current `emitArmAssign` path treats arm bodies as assignment-target
  expressions, so a `| .NotFound -> { return "missing" }` arm body emits
  as `_scrml_result_N = return "missing";` — invalid JS. The intent is
  that the arm body executes its statements as-is (the user's `return`
  exits the enclosing function). Fix surface: emit-logic.ts:2363-2375
  `emitArmAssign` needs to handle return/throw/fail/break/continue arm
  bodies as standalone statements (no `resultVar = ...` wrapping), and
  reserve the assignment wrapping only for value-yielding expression
  bodies. Pre-existing; surfaced by Gap 5 repro but NOT load-bearing for
  the `~` symptom. Estimated effort: ~3-5h.

- **Gap 9 — top-level (file-root) function-body `!{}` not block-split.**
  When a `function` decl with a body containing `!{}` lives OUTSIDE any
  markup container (file-root level), the BS layer's orphan-brace path
  doesn't push an `error-effect` BLOCK_REF for the inner `!{}`. The
  function-body content is opaque text, then the AST builder retokenizes
  it and sees `!` + `{` as separate PUNCT tokens (no BLOCK_REF), and
  parseRecursiveBody's GUARDED-EXPR detector (BLOCK_REF lookahead) never
  fires. Result: the `!{}` is silently treated as something else and the
  error-handler arms are dropped from codegen. This is a structural BS
  issue cousin to Gap 6. Adopters who place all their fn decls inside
  `<program>` are not affected; this only impacts pure-module files with
  file-root fn decls + failable calls. Estimated effort: ~4-6h (BS layer
  recursion into orphan-brace contexts for sigil openers).

---

## Cross-link

- `SURVEY.md` — S94 codegen-lowering dispatch survey
- `ROUND-TRIP-SURVEY.md` — S94 parser round-trip survey
- `../tilde-gaps-567/SURVEY.md` — S95 Gaps 5/6/7 dispatch survey
- `compiler/tests/integration/tilde-carry-forward.test.js` — S94 codegen-lowering regression suite (5 tests)
- `compiler/tests/integration/tilde-roundtrip.test.js` — S94 round-trip regression suite (19 tests)
- `compiler/tests/integration/tilde-gaps-567.test.js` — S95 Gaps 5/6/7 regression suite (11 tests)
- `docs/website/roadmap-from-v0.3-2026-05-14.md` "Surfaces that will likely change visibility" section
- `examples/24-tilde-pipeline.scrml` — adopter-facing showcase (post-Gap-6: no explicit `${}` wrapper)
- `examples/16-remote-data.scrml` — retrofit using the smoke shape (no gaps hit)
