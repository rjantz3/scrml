# Phase A1a Step 10 — MemberCall / MemberAssignment / UnaryDelete shape verification — Progress

Branch: `phase-a1a-step-10-mutation-shapes`
Parent baseline HEAD: `fded36a` (a1a-step-9 reset(@cell) keyword)
Test baseline: 8,812 pass / 43 skip / 0 fail / 8,855 across 437 files.

## Survey notes

[startup step-10] Worktree clean. `bun install` + `bun run pretest` complete.
Baseline `bun run test` re-run after first-run flake (2 ECONNREFUSED → 0) →
**confirmed 8,812 pass / 43 skip / 0 fail / 8,855 across 437 files**. Branch
`phase-a1a-step-10-mutation-shapes` created off `fded36a`.

[step-10 survey-ast-types] `compiler/src/types/ast.ts` survey:
  - **No `MemberCall`, `MemberAssignment`, `UnaryDelete` AST kinds exist.**
    scrml uses an ESTree-style flattened representation:
      • Method call on member  → `kind: "call"` with `callee: MemberExpr`
      • Member assignment      → `kind: "assign"` with `target: MemberExpr | IndexExpr`
      • Index assignment       → `kind: "assign"` with `target: IndexExpr`
      • Delete                 → `kind: "unary"` with `op: "delete"` and `argument: MemberExpr | IndexExpr`
  - The `op` field is **already present** on `AssignExpr` (line 1396) covering
    every assignment operator A1b needs:
    `"=" | "+=" | "-=" | "*=" | "/=" | "%=" | "**=" | "&&=" | "||=" | "??=" | "&=" | "|=" | "^=" | "<<=" | ">>=" | ">>>="`.
  - The `op` field is also already present on `UnaryExpr` (line 1346) covering
    `"delete"` as one of its valid operator strings.
  - Property names: `MemberExpr.property` is `string` (static); `IndexExpr.index`
    is `ExprNode` (computed). The split distinguishes `.foo` vs `[0]` cleanly.
  - Per AST-CONTRACTS-AND-DECOMPOSITION §1.5: "shape preservation only" —
    aligned with what we found. No new fields required, no rename required.

[step-10 survey-parser] `compiler/src/expression-parser.ts` `esTreeToExprNode`
translator (line 843+) survey:
  - `case "AssignmentExpression"` (line 1010): emits `{kind:"assign", op, target, value}`
    with `op = node.operator` (ESTree's `operator` is mapped to scrml's `op`).
  - `case "UnaryExpression"` (line 956): emits `{kind:"unary", op, argument, prefix}`
    where `op` is the ESTree `operator` string. Includes `"delete"` in the
    `validOps` allowlist (line 959).
  - `case "MemberExpression"` (line 1033): emits `{kind:"member", object, property}`
    for static access OR `{kind:"index", object, index}` for computed access.
  - `case "CallExpression"` (line 1057): emits `{kind:"call", callee, args}`;
    when callee is a member-access, the `callee` field is itself a `kind:"member"`
    or `kind:"index"` node — so member calls have the structure A1b needs.

[step-10 smoke-test-confirmed] Smoke-tested all eight target shapes via
`bun -e ...`. Every one produces the expected structure:
  - `@arr.push(x)`               → call(callee=member(@arr,"push"), args=[x])
  - `@obj.foo = x`               → assign(op="=", target=member(@obj,"foo"))
  - `@obj.foo += 1`              → assign(op="+=", target=member(@obj,"foo"))
  - `@arr[i] *= 2`               → assign(op="*=", target=index(@arr,i))
  - `@arr.length = 0`            → assign(op="=", target=member(@arr,"length"))
  - `delete @obj.foo`            → unary(op="delete", argument=member(@obj,"foo"))
  - `delete @arr[i]`             → unary(op="delete", argument=index(@arr,i))
  - `@form.errors.push(...)`     → call(callee=member(member(@form,"errors"),"push"))
  - `arr.push(1)` (negative)     → call(callee=member(ident("arr"),"push")) — name has NO `@`

[step-10 a1b-discriminator] **Can A1b discriminate `@arr.push(x)` from `localArr.push(x)`
via AST shape alone? — YES.** The `@` prefix is preserved verbatim in
`ident.name` (e.g., `name === "@arr"` vs `name === "arr"`). For nested receivers
like `@form.errors.push(...)`, A1b walks `callee.object` chain until it reaches
an `ident` node and checks `name.startsWith("@")`. This is the canonical scrml
convention (L2). The discriminator is purely string-shape on the existing
`ident.name` field; **no A1a parser work needed** to expose it.

[step-10 op-vs-operator] **Field name decision: scrml uses `op`, not `operator`.**
Already consistent across `UnaryExpr.op`, `BinaryExpr.op`, `AssignExpr.op`. ESTree's
`operator` is mapped to scrml's `op` at the `esTreeToExprNode` boundary. No rename
needed. The BRIEF text said "`op: string` MUST be on MemberAssignment" — this is
satisfied by `AssignExpr.op` since `MemberAssignment` is just `AssignExpr` with a
member-shaped target.

[step-10 conclusion] **Survey confirms: ZERO source changes required.** The parser
already produces correctly-shaped AST nodes for every form A1b's L21 walker needs:
  - **Form 1 (array mutating method)** → recognize via
    `node.kind === "call" && node.callee.kind === "member" && MUTATING_METHODS.includes(node.callee.property)`
  - **Form 2 (property write / compound-assign)** → recognize via
    `node.kind === "assign" && (node.target.kind === "member" || node.target.kind === "index")`
  - **Form 3 (delete)** → recognize via
    `node.kind === "unary" && node.op === "delete" && (node.argument.kind === "member" || node.argument.kind === "index")`

For each, A1b walks the receiver chain (`.object` traversal) to the leaf `ident`
and checks `name.startsWith("@")` to confirm the receiver is a reactive-cell
reference, then resolves whether that cell is `const`-derived (A1b's symbol-table
work).

This is the **7th confirmed depth-of-survey discount occurrence**:
  1. S51 W2 (LSP canonical-key)
  2. S52 DD4 (SPEC §54.2-§54.3 extension-point)
  3. S59 Step 2 (block-splitter raw `<` preservation)
  4. S59 documentary-attrs (codegen/index.ts:530 not emit-html.ts)
  5. S60 Step 6 (KEYWORD-vs-IDENT)
  6. S60 Step 7 (regex-driven parser)
  7. S60 Step 9 (acorn post-processing)
  8. **S60 Step 10 (ESTree-passthrough discount — confirmed today)**

This step is now per BRIEF §3 a "verify + add tests" pass. T1 by tier rule
(zero source changes; tests-only addition).

## Plan

1. NO source changes. AST shapes verified.
2. Add `compiler/tests/integration/parse-mutation-shapes.test.js` with the §M10.1-§M10.8
   cases per BRIEF §4. Aim 8-10 tests.
3. Run `bun run test`. Confirm 0 regressions, +8 to +10 pass delta.
4. Final commit: `compile(a1a-step-10): mutation shape verification — N tests added; zero source changes (depth-of-survey discount #8)`.
</content>
</invoke>