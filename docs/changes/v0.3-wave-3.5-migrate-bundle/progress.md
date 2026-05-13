---
title: "v0.3 Wave 3.5 — migrate.js BUNDLE — `${...}` unwrap container-aware + scope + match"
session: S87
status: IN-FLIGHT
---

# Progress log

Append-only. Timestamped lines: what was done, what's next, blockers.

## S87 / 2026-05-12 — dispatch start

- Worktree verified: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a847fea14a54419a3`. HEAD `7a00b1b`. Tree clean.
- `bun install` OK. `bun run pretest` OK.
- Required reads consumed: SCOPING.md (Wave 3); RECON-S87.md (from main `607dc23`); migrate.js (`compiler/src/commands/migrate.js`); ast-builder.js liftBareDeclarations + BARE_DECL_RE / TOPLEVEL_STATE_DECL_RE; block-splitter.js BS-layer V5-strict state-decl peek; primary.map.md.
- Maps consulted: primary.map.md (load-bearing — confirmed task shape "compiler-source bug fix BUNDLE", routed to structure / domain / error per migrate.js path).
- Repro confirmed: `bun compiler/bin/scrml.js migrate --program-shape --dry-run --report examples/` shows the 11 example failures across Categories B (5), C (4), D (1), E (1).

## S87 / 2026-05-12 — bug-shape diagnosis

**Root causes (root-of-tree mapping):**

- **Bug A (E-CTX inside `<db>`):** `unwrapRedundantLogicBlocks`'s `isTopLevel` heuristic looks backward for the previous `>` (markup close-bracket) and considers `${...}` "top-level" if only whitespace follows. This false-fires inside `<db>`, `<ul>`, `<channel>`, etc — `>` could close an OPENER tag, leaving the `${...}` inside a nested container body, not at program-body top level. Files affected (5): 03/07/08/16/18.
- **Bug B (E-SCOPE-001 on locals):** `splitTopLevelStatements` brace-tracker gets confused by embedded markup template literals (e.g. `lift <li>...${p.name}...</li>` inside a `for`-loop body). The `${p.name}` inside the markup is treated as another `}` decrementing depth, so the `for` body never cleanly closes, all of `for {...lift <li>...}` is treated as ONE statement, the FIRST keyword is `const q = ...` which `isRecognizedTopLevelDecl` matches → false unwrap. Files affected (4): 04/09/19/20.
- **Bug C (E-TYPE-026 match in markup):** `${...}` body containing `//` line comments INSIDE function bodies — when unwrapped, BS-layer's block-splitter recognizes `//` as comment block-separators OUTSIDE logic context, breaking ONE function body text-block into MULTIPLE pieces split at each `//` comment. The first piece may match BARE_DECL_RE (e.g. starts with `function next()`), but the subsequent pieces (e.g. `}\n}\n\nfunction back() { match... }`) start with `}` and don't qualify for re-wrap → bare `match` ends up at markup level. Files affected (1 in recon, but actually shape covers 4-5): 05.

**Unified fix design:** extend `unwrapRedundantLogicBlocks` with two checks:

1. **Container-aware traversal (Bug A):** track markup-container depth in the body via mini-walker. Only consider `${...}` for unwrap when at depth 0 of nested markup (immediate program-body level).
2. **Stricter unwrap-safety (Bugs B+C):** add `isUnwrapSafe(inner)` returning false if inner contains:
   - `//` line comments OR `/* */` block comments — break BS block-continuity post-unwrap
   - `lift` keyword — markup-context construct, only valid inside ${...} or function bodies; the bare appearance signals the block is mixed-content
   - `lin` declaration keyword — linear-type scope must be preserved
   - `match`/`for`/`while`/`if`/`try`/`do` outside of nested function/type bodies — non-decl statements

Unwrap proceeds only if BOTH `isTopLevelDeclOnly` (existing) AND `isUnwrapSafe` (new) pass.

- Next: implement the two checks; add unit tests; re-recon.

## S87 / 2026-05-12 — fix landed (commit `9b8f965`)

- Implemented container-aware traversal in `unwrapRedundantLogicBlocks`:
  - Walks body as mini-parser tracking markup-container depth.
  - `<X ...>` opener → depth++.
  - `</X>` / `</>` close → depth--.
  - `<X ...>` followed by `=` or `:` (state-decl shape) → depth unchanged.
  - `<X .../>` self-closing → depth unchanged.
  - `${...}` only considered for unwrap when markupDepth == 0.
- Added `skipBracedBlock` for skipping `?{...}` / `#{...}` cleanly.
- Added `isUnwrapSafe(inner)` gate with 4 checks:
  - `containsBareToken("//", inner)` → false (line comments break BS).
  - `containsBareToken("/*", inner)` → false (block comments break BS).
  - `containsBareKeyword("lift", inner)` → false (markup-emit signals mixed content).
  - `containsBareKeyword("lin", inner)` → false (linear scope must be preserved).
  - `containsTopLevelKeyword(inner, ["match", "for", "while", "if", "try", "do"])` → false (bare control-flow at top level signals mis-collapsed mixed content).
- Helpers: `containsBareToken`, `containsBareKeyword`, `containsTopLevelKeyword`, `stripStringsAndComments`.

## S87 / 2026-05-12 — tests landed (commit `<next>`)

- Added 17 unit tests at `compiler/tests/unit/migrate-program-shape-wave-3.5-bundle.test.js`.
- Coverage:
  - §1-§4: container-aware (Bug A, 5 tests).
  - §5-§8: scope-safe (Bug B, 4 tests).
  - §9-§10: comment-safe (Bug C, 2 tests).
  - §11-§12: regression-guards (3 tests).
  - §13: end-to-end repros of 3 actual example shapes (3 tests).
- All 17 pass; 0 regressions in the 45 pre-existing migrate tests.

## S87 / 2026-05-12 — re-recon delta

`bun compiler/bin/scrml.js migrate --program-shape --dry-run --report examples/ samples/`:

| Phase | E-CTX (Bug A) | E-SCOPE-001 (Bug B) | E-TYPE-026 (Bug C) | E-LIN-001 (Bug B) |
|---|---|---|---|---|
| Pre-fix | 5 examples (03/07/08/16/18) | 4 examples (04/09/19/20) | 1 example (05) | 1 example (19) |
| Post-fix | 0 introduced | 0 introduced | 0 introduced | 0 introduced |

Remaining `failed` records in examples/ (12 trucking pages) are Category A:
real v0.3 spec violations (file-top `<channel>` outside `<program>`). These
are NOT introduced by migration — they're surfaced by the v0.3 walker on
files that were already out-of-spec pre-migration. Out of scope for this
dispatch (per RECON-S87 §A and SCOPING brief §6).

Pre-existing failures in `samples/` (blog-cms, gauntlet-r10-*, gauntlet-s19-*)
are unrelated source-format issues OR known F-COMPONENT-001-FOLLOW issues.
None introduced by Wave 3.5 fix.

## S87 / 2026-05-12 — DONE

- Test suite: 10851 → 10868 pass (+17). 85 skip / 1 todo / 0 fail.
- All 4 brief acceptance criteria met:
  - (1) Bug A CLOSED — verified via §1-§4 + §13.A repro + corpus re-recon.
  - (2) Bug B CLOSED — verified via §5-§7 + §13.B repro + corpus re-recon.
  - (3) Bug C CLOSED — verified via §8-§10 + §13.C repro + corpus re-recon.
  - (4) Re-recon shows ZERO E-CTX / E-SCOPE / E-TYPE-026 / E-LIN introduced
       by migration. Pre-existing errors documented above.
  - (5) +17 unit tests in canonical brief location.
  - (6) 0 test regressions.
  - (7) Idiomatic-examples styling rule N/A — fixtures are inline strings,
       no file-top `#{}`.
- Tree clean before final report.

