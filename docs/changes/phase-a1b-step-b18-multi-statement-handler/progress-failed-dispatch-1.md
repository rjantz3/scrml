# A1b Step B18 — progress

## 2026-05-07 — start

- Verified worktree root (`/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a54c4e8caafc5a14e`); clean tree at HEAD `4ac906f`.
- `bun install` completed.
- `bun run pretest` populated dist samples.
- `bun run test` baseline: **9425 pass / 60 skip / 1 todo / 0 fail** (matches S68 wrap; minor skip drift +11 from brief's 49 figure).
- Read `BRIEF.md` and `docs/audits/a1b-b18-b22-wave5-rule4-audit-2026-05-07.md` §1.
- Read SPEC §5.2.3 (lines 1127-1188) and §4.14 (lines 941-983) and §34 catalog row at 14256.

## 2026-05-07 — Phase 0 survey

Findings recorded in SURVEY.md. Key conclusions:

1. **No existing E-MULTI-STATEMENT-HANDLER fire path** in compiler/src or compiler/tests. Net-new.
2. **Tokenizer silently skips stray characters** between attributes (line 498-499 in tokenizer.ts). Multi-statement `onclick=fn(); other()` parses as `onclick=fn()` followed by `track` (boolean attr) and `"hi"` string-literal attr — a silent semantic bug. L19 was added to prevent exactly this silence.
3. **AST attribute walker** lives in symbol-table.ts (PASS 5 B6 via `walkRenderByTagUses`). Right home for the new check.
4. **Engine state-child `:`-shorthand body** is parsed by `engine-statechild-parser.ts` and yields `bodyRaw: string` per state-child — perfect surface for the body-form check.
5. **`block.raw`** in BS contains the verbatim source slice including the opener — but BS spans get lost by the time SYM runs. The cleanest hook is to perform the multi-statement scan inside `parseAttributes` in `ast-builder.js`, where we still have the original opener token stream + raw text via `block.raw`.

## Strategy

- **AST-builder check** (markup branch around line 8356): scan the markup opener's raw text for top-level `;` outside expression-internal contexts (string literals, paren depth, brace depth, ${}). Map each top-level `;` to the most-recent attribute name; if it's an event-handler name (`/^on[a-z]+$/i` or `on:*` / `onserver:*` / `onclient:*`), fire E-MULTI-STATEMENT-HANDLER.
- **Engine state-child shorthand body**: extend B15's PASS 11 walker to scan each state-child's `bodyRaw` (when produced via `:`-shorthand path) for top-level `;`. Fire E-MULTI-STATEMENT-HANDLER per §4.14 line 980 + §6.6.1 line 980.
- **`onserver:*` / `onclient:*`**: Per BRIEF.md OUT OF SCOPE — covered by the same `on:*` regex prefix-match for completeness; the regex is broad. If audit drift surfaces, scope-restrict via filter.
- **`${...}` form**: explicitly EXEMPT — when ATTR_EXPR token is emitted from `${...}` form, the entire content is opaque to L19 (per §5.2.3 line 1144). Implementation: when scanning, if we detect `${` in attribute-value position, skip past matching `}` and resume at next attribute.
