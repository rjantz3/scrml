DISPATCH BRIEF — cluster-A: unquoted-attr-condition operator handling — REJECT bare operators with a clean parens-steer diagnostic (scrml-js-codegen-engineer, isolation:worktree, opus)

# TASK + RULING (user S188)
The unquoted `if=` / `show=` / `while=` attribute-value scanner silently shreds EVERY bare operator. User ruled **"Reject + parens"** (S188 AskUserQuestion): a bare operator in an unquoted attribute condition fires ONE clean cause-naming diagnostic steering to parens; **parens `if=(expr)` and quotes `if="expr"` stay the canonical operator-expression forms.** This resolves `g-attr-gte-tagclose` + `g-attr-unquoted-compound-silent-drop` AND the broader ~14-operator class they are instances of.

# THE FINDING (S188 4-agent workflow — authoritative, empirical)
**Locus:** `compiler/src/tokenizer.ts` — the unquoted-attribute-value reader (`else if (/[A-Za-z0-9_@]/.test(ch()))` branch ~line 564; value-consuming loop ~lines 577-583, `valueIdentRe = /[A-Za-z0-9_\-\.@]/`). It reads ONLY the first bareword ident (`@n`, `@x`) and stops at the first char outside `valueIdentRe` (the operator). Then:
- The outer attribute loop's tag-close test (~line 357 `if (c === ">")`) has NO `>=` two-char lookahead (contrast ~line 348 which DOES `ch(1)` for `/>`), so the first `>` of `>=` is consumed as TAG_CLOSE_GT.
- Non-matching chars (`&`, `|`, etc.) fall to the catch-all silent skip (~lines 865-866 `// Unexpected char — skip`).
- The g-not-neg attr-bare fix (5a4a132b) added `isPrefixNotOperandAhead` (~lines 253-268) + a `not`-only ATTR_EXPR-capture arm (~lines 596-655, expression-mode loop tracking paren/brace/bracket/string depth, emit ONE ATTR_EXPR). That path is the reusable host but is gated to `ident === "not"` only.

**Empirical operator matrix (BARE in unquoted `if=`):**
- **SILENT-DROP** (compiles clean, emits `if(@n)` only, leaks dropped operand into the DOM as `<p @m>`): `>` `<` `<=` `==` `!=` `&&` `||` `+` `-` `*` `/` string-concat, AND no-space ternary `@n?@m:@n`. **The dangerous class.**
- **LOUD-FAIL** (E-CTX-001 at BS — the `>` closes the tag early, misleading "no matching tag"): `>=`, spaced ternary `@n ? @m : @n`.
- **`fn()` MIS-ROUTE**: `if=check()` → emits `<p data-scrml-bind-if=...>` + `addEventListener("if", () => check())` — NO conditional rendering at all.
- **CLEAN (preserve!):** atomic `@n`, prefix `!@n`, member `@obj.flag`; **quoted `if="@n && @m"` and parenthesized `if=(@n >= 3)` handle ALL operators correctly.**

**SPEC (Rule-4, S188):** the prior "§5.5.2 = 4 forms / must-parenthesize" claim was a MISREAD — §5.5.2 governs only `class:` (E-ATTR-013 is `class:`-guarded at ast-builder.js:2113). `if=` is §17.1 → §5.1/§5.2 (three unquoted forms: identifier / call / boolean-var-ref — all ATOMIC, no operators). §42.10:21686 names `&&`/`||` operands "inside if=" (those apply to quoted/paren conditions). The SPEC was AMBIGUOUS; the user RULED reject+parens. The codebase already agrees: `tokenizer.ts:461` comment verbatim "Expressions with >, <, &&, ||, ===, !== must be quoted; use parens".

# FIX (per the ruling)
## Phase 1 — the operator-reject + clean diagnostic (the core)
1. **NEW §34 error code** (propose `E-ATTR-UNQUOTED-OPERATOR` — finalize the name; Error). Message names the real cause + steers to parens/quotes, e.g.: *"An unquoted attribute condition cannot contain an operator (`>= && || == …`). Parenthesize or quote it: `if=(@n >= 3)` or `if=\"@n >= 3\"`."* Fire ONCE per offending attribute.
2. **Detection** at the unquoted-value-reader exit (tokenizer.ts): when an unquoted attr-CONDITION value (if=/show=/while= and any boolean-condition attr — NOT event-handler attrs, NOT `class:`/`bind:`) terminated because the next non-ws char is a binary/ternary operator (`> < = ! & | + - * / ?`), OR left a stranded operand → fire the new code instead of silently shredding. Re-use / generalize the `not`-fix's `isPrefixNotOperandAhead`/expression-mode machinery as the detector host (you can capture-then-reject, or detect-and-reject — your call).
3. **Early bare-`>`/`>=`-in-attr-value guard** so the `>=` case (and bare `>` operator) stops with the NEW clean diagnostic instead of the misleading E-CTX-001/E-SCOPE-001 cascade (the `>` closing the tag early). This is the `g-attr-gte-tagclose` fix.
4. **`&&`/`||` etc.** → the same new diagnostic (no more silent `<p @y>` leak). This is the `g-attr-unquoted-compound-silent-drop` fix.

## Phase 2 — fn() mis-route (separable; defer if it needs a deeper routing change)
`if=check()` (a call — an ATOMIC §5.1 unquoted form, so it SHOULD work as a conditional) currently mis-routes to an `addEventListener("if", …)`. Make `if=fn()` compile as a CONDITIONAL (boolean call), not an event handler. **If this requires a deeper if=-routing change beyond the scanner, DEFER it + file a focused follow-up gap (`g-attr-if-fn-call-misroute`) — do NOT let it bloat the operator-reject core.** Report which you did.

## PRESERVE (do not regress — verify each)
- Atomic `@n` / `!@n` / `@obj.flag` bare → still CLEAN conditionals.
- Quoted `if="@n && @m"` + parenthesized `if=(@n >= 3)` → still handle ALL operators correctly.
- **Bare `not @x` in an attr → still fires E-TYPE-045** (the g-not-neg fix, NOT the new operator-reject). `not` is a PREFIX operator handled by E-TYPE-045; the new code is for BINARY/TERNARY operators. For `if=@x && not @y`: decide precedence + fire ONCE (prefer the more-specific E-TYPE-045 on the `not`, OR the new operator-reject on the `&&` — but NEVER both, NEVER silent). State your precedence choice.
- Do NOT touch `class:` (E-ATTR-013) or `bind:` grammars.

# SPEC (Phase 3 — Rule 4, lands WITH the code)
Amend §17.1 (`if=` attribute) + the §5.1/§5.2 unquoted-form rules: an unquoted attribute CONDITION admits only the atomic forms (`@var` / `obj.prop` / `fn()` / prefix `!`); operator/compound conditions SHALL be parenthesized `if=(expr)` or quoted `if="expr"`. Add the new §34 row. Reconcile §42.10:21686 (its `&&`/`||`-operand mention applies to quoted/paren conditions — add a one-line clarifying note so it doesn't read as authorizing bare operators). Keep it tight.

# TESTS (Phase 4)
NEW `compiler/tests/unit/attr-unquoted-operator-reject.test.js`: the full bare-operator matrix (`> >= < <= == != && || + - * / ?:`) → each fires the new diagnostic (exactly once, no silent shred, no E-CTX-001 cascade); quoted + parenthesized forms → clean (all operators); atomic `@n`/`!@n`/`@obj.flag` → clean; bare `not @x` → E-TYPE-045 (unchanged); fn() per your Phase-2 disposition. Keep all existing tests green (esp. the corpus's `if=(...)` idioms + the e-type-045 attr tests).

# GAPS (Phase 5)
known-gaps.md: flip `g-attr-gte-tagclose` + `g-attr-unquoted-compound-silent-drop` → `status=resolved` (both covered by the new diagnostic); rewrite their bodies noting the broader ~14-operator class + the reject+parens ruling + the new E-code. Do NOT touch the other gaps. If you DEFER fn(), file `g-attr-if-fn-call-misroute` (MED — silent: registers an event-listener, no conditional render).

# Phase 6 — R26 EMPIRICAL (mandatory)
Compile via `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile`: the bare-operator matrix → each fires the new code (grep count == 1); quoted/paren forms → 0-error + correct emitted condition (`node --check`); atomic forms → clean; bare `not @x` → E-TYPE-045 (once); the flagship `examples/23-trucking-dispatch` still 0-error (it uses `if=(...)` paren idioms — confirm no regression). Report per-case. DO NOT mark DONE without this.

# STARTUP + PATH DISCIPLINE (worktree)
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-` — else STOP (S90). Save WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT; `git status --short` clean; `git merge main` (base MUST contain `2678e8a9`); `bun install`; `bun run pretest`.
3. Edits via Bash (`perl`/`python3`/heredoc) on worktree-absolute paths incl. `.claude/worktrees/agent-<id>/`; NOT Edit/Write (S126). Never `cd` into main; use `git -C "$WORKTREE_ROOT"` + worktree-absolute paths. First commit msg includes verbatim `pwd`.
4. Read `.claude/maps/primary.map.md` first (maps reflect HEAD ~2678e8a9 / 2026-06-12).

# COMMIT DISCIPLINE
Commit incrementally per phase (crash-recovery); update `docs/changes/cluster-a-attr-operator-reject-2026-06-12/progress.md` (append-only). ONE coupled change (code + SPEC + tests + gap-flips). No `--no-verify`. `git status` clean before DONE; full `bun run test` (zero new fails).

# FINAL REPORT
WORKTREE_PATH · FINAL_SHA · FILES_TOUCHED · the new E-code name + detection mechanism + the bare-`not`-vs-operator precedence choice · Phase-2 fn() disposition (fixed or deferred+filed) · the per-operator R26 matrix · full-suite pass/fail/skip · maps feedback. If any S188-workflow finding proved wrong on the worktree, say so.
