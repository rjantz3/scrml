# Tilde codegen gaps 5+6+7 — Survey

Date: 2026-05-15 (S95 follow-up to S94)
Worktree: `.claude/worktrees/agent-abf998da596bde4a7`
Base SHA after merge-up: `0c503c5` (main fast-forward of `de84260`)

## Gap 5 — `~` after `!{}` handler doesn't lower

### Repro

Input (`/tmp/tilde-gaps/gap5d.scrml`):

```scrml
<program>

${
  function loadItem(id: number) -> string {
    return "data"
  }

  function format(s: string) -> string { return `[${s}]` }

  function loadAndFormat(id: number) -> string {
    loadItem(id) !{
      | .NotFound -> { return "missing" }
      | .Timeout  -> { return "timeout" }
    }
    return format(~)
  }
}

const result = loadAndFormat(1)
<div>${result}</div>

</program>
```

Current output (broken):

```js
function _scrml_loadAndFormat_6(id) {
  let _scrml__scrml_result_7 = _scrml_loadItem_4(id);
  if (_scrml__scrml_result_7 && _scrml__scrml_result_7.__scrml_error) {
    if (_scrml__scrml_result_7.variant === "NotFound") {
      _scrml__scrml_result_7 = return "missing";    // (pre-existing arm-body bug; out of scope)
    }
    else if (_scrml__scrml_result_7.variant === "Timeout") {
      _scrml__scrml_result_7 = return "timeout";
    }
    else { return _scrml__scrml_result_7; }
  }
  return _scrml_format_5(~);                         // SYMPTOM — literal `~` leaks
}
```

The literal `~` token in `_scrml_format_5(~)` is the JS SyntaxError. The guarded-expr block does emit, but it never wires `opts.tildeContext.var` to point at `_scrml__scrml_result_7`.

### Root cause

`compiler/src/codegen/emit-logic.ts:2301` (`case "guarded-expr"`) emits the success-path resultVar (`let _scrml_result_N = <initExpr>;`) and the error-handler arms, but **does not** wire `opts.tildeContext.var = resultVar` after the block. Subsequent statements that reference `~` find `tildeVar: null` in their EmitExprContext, and `emit-expr.ts:emitIdent` falls through to the "Plain identifier — pass through" arm, emitting literal `~`.

The AST side already does the right thing: `ast-builder.js:3144-3159` (parseRecursiveBody) and `:6011-6021` (parseLogicBody outer loop) check `node.kind === "bare-expr"` BEFORE the guarded-expr wrap is applied — `node` is the inner bare-expr returned by `parseOneStatement`, and `_tildeActive` correctly flips to `true`. So `return format(~)`'s exprNode is parsed with `~` as a TildeExpr/IdentExpr("~"), not bitwise NOT.

The fix is purely codegen-side.

### Fix surface

`compiler/src/codegen/emit-logic.ts` — `case "guarded-expr"` at line 2301. After the `lines.push("}")` at line 2409, when `opts.tildeContext` is set AND `bindingName` is null (i.e., the guardedNode was a bare-expr, not a let/const/tilde-decl with its own binding name), set `opts.tildeContext.var = resultVar`. The success-path value lives in `resultVar`; subsequent `~` references resolve to that variable.

Also extend `nodeContainsTildeRef` to walk `guardedNode` and `arms` — so a function body that contains `loadItem(id) !{...}` (where the guardedNode bare-expr is itself NOT a `~` reference) but has a subsequent `~` reference correctly activates `tildeContext`. Currently the activation comes from the subsequent return-stmt's exprNode containing `~`; that's already detected. But for completeness (an arm body containing `~`, or an inner expr referencing `~` we want detected), extend the scanner.

Estimated lines: ~10 in emit-logic.ts (case "guarded-expr" tail) + ~3 in nodeContainsTildeRef.

## Gap 6 — `~` at `<program>` direct-child position silently dropped (text-split case)

### Repro

Input (`/tmp/tilde-gaps/gap6c.scrml`):

```scrml
<program>
  function step1(n: number) -> number { return n + 10 }
  function step2(n: number) -> number { return n * 3 }

  // Just these two lines at program direct child
  step1(2)
  const result = step2(~)

  <div>${result}</div>
</program>
```

Current output (broken — fires E-SCOPE-001 on `result`):

```js
function _scrml_step1_3(n) { return n + 10; }
function _scrml_step2_4(n) { return n * 3; }
result;     // <-- step1(2) + const result = step2(~) SILENTLY DROPPED
```

The diagnostic chain: BS sees a JS line comment (`//`) in the program-body text, which **splits** the text region into two text blocks. The first text block leads with `function step1(...)` and matches `BARE_DECL_RE`, getting lifted into `${...}`. The second text block leads with `step1(2)` and does NOT match `BARE_DECL_RE` (no `function`/`fn`/`let`/`const`/`type` prefix), so it remains as a TEXT node — emitting no code.

### Variants

- gap6.scrml (text contains an extra trailing `const piped = step2(7)` line): WORKS. Because the leading-content layout differs — no `//` comment between function decls and `step1(2)`. The whole text is one block, matches BARE_DECL_RE via the leading `function step1` prefix, and lifts cleanly.
- gap6d.scrml (no `// Just these two lines` comment between decls and bare-call chain): WORKS. Same reason — single text block lifts on leading `function`.
- gap6c.scrml (the comment splits the text block): FAILS — the second text block has no leading decl keyword.

So the gap is the **post-comment text region at program direct child position fails to lift if it doesn't start with a decl keyword**.

### Root cause

`compiler/src/ast-builder.js:1110` — `liftBareDeclarations` only lifts text blocks whose `raw` starts with a decl keyword (BARE_DECL_RE) or top-level state-decl shape (TOPLEVEL_STATE_DECL_RE). A text block whose first non-whitespace token is `step1` (a bare call) is not recognized.

The split-by-`//` is by design — `block-splitter.js:636` extracts JS line comments as separate `comment` children at markup/state level (the orphan-brace path is exempt). This means program-body text gets fragmented across comment boundaries.

### Fix surface

`compiler/src/ast-builder.js` — extend the `liftBareDeclarations` lift rules with a SIBLING pattern: when `parentType === "state"` (i.e., at `<program>` / `<page>` / `<channel>` direct child position) AND the text block contains a `~` token (per `TILDE_TOKEN_RE = /(?<![A-Za-z0-9_$])~(?![A-Za-z0-9_$])/`), lift the text into a synthetic `${...}` logic block. This is precisely the v0.3 default-logic-mode promise — bodies of `<program>`/`<page>`/`<channel>` are logic by default, and a `~` token is unambiguous evidence the text is logic code (not markup prose).

Conservative alternative considered: lift ANY text block at program direct child position. Rejected because it would change behavior for adopters who deliberately use prose text at program-body level (rare but possible — comments / whitespace).

Estimated lines: ~15 in ast-builder.js (new `TILDE_TOKEN_RE` regex + sibling lift block at line ~1151).

## Gap 7 — pure consume+reinit chain self-references

### Repro

Input (`/tmp/tilde-gaps/gap7.scrml`):

```scrml
<program>

  function step1(n: number) -> number { return n + 10 }
  function step2(n: number) -> number { return n * 3 }
  function step3(n: number) -> number { return n - 1 }

  ${
    step1(2)
    step2(~)
    const final = ~
  }
  <div>${final}</div>

</program>
```

Current output (broken):

```js
let _scrml_tilde_7 = _scrml_step1_4(2);
let _scrml_tilde_8 = _scrml_step2_5(_scrml_tilde_8);    // SELF-REFERENCE — RHS uses _scrml_tilde_8 in its OWN init
const final = _scrml_tilde_8;
```

At runtime, `_scrml_tilde_8` is `undefined` in its own initializer, so `step2(undefined)` runs with NaN-producing semantics.

### Root cause

`compiler/src/codegen/emit-logic.ts:1150-1153` (`case "bare-expr"`, Phase 3 fast path):

```ts
if (opts.tildeContext) {
  const tVar = genVar("tilde");
  opts.tildeContext.var = tVar;     // (A) OVERWRITE BEFORE emitting RHS
  return `let ${tVar} = ${emitExpr(node.exprNode, _makeExprCtx(opts))};`;
}                                   // (B) _makeExprCtx reads opts.tildeContext.var — now the NEW tVar
```

`_makeExprCtx(opts)` reads `opts.tildeContext.var` into `ctx.tildeVar`. The current ordering overwrites first, then constructs the expr ctx — so `~` references inside the RHS resolve to the SELF-name `tVar`, not the previous `~` var.

### Fix surface

`compiler/src/codegen/emit-logic.ts:1150-1153` — reorder: capture the prev tildeVar (via `_makeExprCtx(opts)` before overwrite), THEN overwrite `opts.tildeContext.var = tVar`, THEN emit RHS using the captured ctx. Same fix at the parallel legacy-string-path site `:1297-1301` (where `~` was historically a string field).

Estimated lines: ~6 in emit-logic.ts (2 sites × ~3 lines each).

## Sequencing

- Gap 5 (codegen-only, ~13 lines) — independent.
- Gap 7 (codegen-only, ~6 lines) — independent.
- Gap 6 (BS-layer / ast-builder, ~15 lines) — independent.

No cross-gap dependencies. Order: Gap 7 → Gap 5 → Gap 6. Gap 7 first because it's the simplest and unblocks the cleanest test of Gap 5+6 (the Gap-7 fix means longer `~`-chains can be tested without bound-intermediate workarounds).

## Out-of-scope items surfaced but not closed in this dispatch

- Pre-existing arm-body emission bug in `case "guarded-expr"` — emits `_scrml_result_N = return "missing";` (assigning a return-stmt result). Surfaced by Gap 5's repro but not load-bearing for the `~` symptom — the user's intent in the canonical v0.4 shape is `| .NotFound -> { return "missing" }` (the arm body itself returns out of the enclosing function); the assignment `_scrml_result_N = return "missing"` is invalid JS. This appears to be a separate emit-logic bug at line 2363-2375 (`emitArmAssign`) that treats every arm body as an assignment target, not as a fall-through into the enclosing function. The brief explicitly excludes this from the present scope. File as `Gap 8 — guarded-expr arm-body emission` in FOLLOWUPS.md.

- BS-layer behavior for top-level (outside `<program>`) function decls containing `!{}`: `gap5b.scrml` (function decl at file root, body contains `!{}`) compiles but silently drops the error-handler arms. The function body content sits in markup-context text and never sees BS `!{` recognition. This is the cousin of Gap 6 — same root cause (text content not getting structured BLOCK_REF treatment at certain positions). Note as `Gap 9 — top-level function-body `!{}` not block-split`. The brief's canonical Gap-5 shape is inside `<program>` or `${}`, so this Gap-9 case is incidental.
