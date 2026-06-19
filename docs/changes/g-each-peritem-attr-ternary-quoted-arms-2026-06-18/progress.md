# g-each-peritem-attr-ternary-quoted-arms — progress

## 2026-06-18 — start
- pwd: /home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-adf67ae2a6a813d93
- base HEAD: 7a2da79c (descends from brief-expected HEAD)
- bun install + pretest OK
- Reproduced bug (each repro): E-CODEGEN-INVALID-JS at repro.client.js byte 843 — `..._scrml_reactive_get("hi")) ? }` (both quoted arms dropped).

## 2026-06-18 — root cause (SCOPE CORRECTION)
- The bug is NOT in emit-each.ts and is NOT each-specific.
- Empirically: the SAME quoted-arm ternary in a NON-each `class="${...}"` attr ALSO emits `...) ? }` → E-CODEGEN-INVALID-JS. (Brief's stated boundary "non-each works" is INCORRECT.)
- Root cause: compiler/src/tokenizer.ts `tokenizeAttributes` double-quoted attr-value reader (was ~L506) terminated the attr string at the FIRST inner `"` with NO `${...}` interpolation-awareness. So `class="${... ? "bg-yellow" : "bg-white"}"` truncated to `${... ? ` (both arms dropped). block-splitter scanAttributes returns the full attrRaw correctly; truncation is in the tokenizer's ATTR_STRING reader.
- Fix: track `${`/sigil-`{`/bare-`{` interpolation depth (brace-balanced, with nested string-literal skip) so the value-terminating `"` is only the one seen at depth 0.

## 2026-06-18 — fix applied + verified
- tokenizer.ts double-quote reader: interpDepth + interpStringCh tracking.
- EACH repro: exit 0, both arms present, node --check OK.
- NON-EACH repro: exit 0, both arms present, node --check OK.
- Emitted: `setAttribute("class", `${(r.n == _scrml_reactive_get("hi")) ? "bg-yellow" : "bg-white"}`)` — readable + valid.

## Next
- Regression tests (each + boundary cases) + full suite.
