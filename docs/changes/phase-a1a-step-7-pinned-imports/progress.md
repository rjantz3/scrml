# Phase A1a Step 7 — progress (append-only timestamped)

## Step 7 — parser: `pinned` bareword on import items

- [12:00 step-7 startup] WORKTREE_ROOT = `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-adb099ab63b8598d3`. HEAD `2754940 compile(a1a-step-6): default= + pinned on state-decl` (matches expected). Branch `phase-a1a-step-7-pinned-imports` created from clean tree. `bun install` ok (113 packages). `bun run pretest` ok (12 samples). Baseline run-1: 8793 / 43 / 2 fail (ECONNREFUSED tail-shape — known flake). Run-2: 8794 / 43 / 0 fail / 8837 across 435 files — exact documented baseline. Per flake protocol: ≤3 fails on run-1 + clean run-2 = BASELINE STABLE. Proceed.

- [12:01 step-7 survey — touchpoint LOCATION] BRIEF named `compiler/src/ast-builder.js` import-decl parser. Located at lines 4883-4942. **Concrete touchpoint:** the per-entry processing loop at lines 4909-4928 (post-`namedMatch.split(",")`). The entry handling does an asMatch test for `as`-alias and emits `names[]` plus per-entry `specifiers[]` (S40 P3.A). Step 7 extends this loop. **No divergence from BRIEF locus** — BRIEF was correct.

- [12:02 step-7 survey — `pinned` keyword status] Per AST-CONTRACTS §2.1, `pinned` is NOT a global KEYWORD — it's a contextual bareword. The import-decl path uses regex over a flat `expr` string from `collectExpr()`, not token-by-token. So tokenizer status is mostly moot here — what matters is that `pinned` will appear as a literal substring in `expr`.

- [12:03 step-7 survey — current behavior on `pinned`] Tested mentally:
  - `import { foo pinned } from '...'`: namedMatch[1]=`foo pinned`. After split-on-`,`+trim: `_entries=["foo pinned"]`. asMatch regex `^(\S+)\s+as\s+(\S+)$` does NOT match. `_stripQuotes("foo pinned")` returns `"foo pinned"` (not surrounded by quotes). Result: `names=["foo pinned"]`, `specifiers=[{imported:"foo pinned", local:"foo pinned"}]` — broken (name has a space).
  - `import { foo as bar pinned } from '...'`: entry=`foo as bar pinned`. asMatch regex requires `\S+$` at end (one word) — fails because `"bar pinned"` has a space. Falls through to bare-name path. Result: `names=["foo as bar pinned"]` — broken.
  - **Conclusion:** today's parser silently mangles `pinned` forms (no parse error fires; just wrong). Step 7 correctly handles them via a pre-strip pass.

- [12:04 step-7 survey — `as` alias parsing path] The `asMatch` regex at line 4914 (`^(\S+)\s+as\s+(\S+)$`) is anchored end-to-start with `\s+` separators. Adding a trailing `\s+pinned\s*$` is structurally awkward inside that regex. Cleaner approach: pre-strip trailing `pinned` modifier BEFORE the existing asMatch — then existing regex handles `foo as bar` cleanly. This isolates the new behavior to a single helper.

- [12:05 step-7 survey — pre-strip algorithm design] Need to disambiguate: `foo as pinned` (alias TO the name `pinned`, no modifier) vs `foo pinned` (apply modifier). Rule: pinned modifier is the LAST whitespace-separated token IF the immediately preceding token is NOT `as`. Walk-through:
  - `foo` → 1 part, no pinned. ✓
  - `foo pinned` → last=pinned, prev=foo (not `as`). Strip, pinned=true. ✓
  - `foo as bar` → last=bar (not pinned). No strip. ✓
  - `foo as bar pinned` → last=pinned, prev=bar. Strip, pinned=true. ✓
  - `foo as pinned` → last=pinned, prev=`as`. Do NOT strip. Treat as alias-to-name-`pinned`. ✓
  - `foo as pinned pinned` → last=pinned, prev=`pinned` (not `as`). Strip, pinned=true. (alias to `pinned`, modifier on) ✓
  - `pinned` (length 1) → no strip, pinned=false. (importing the name `pinned`) ✓
  - `pinned pinned` → last=pinned, prev=`pinned` (not `as`). Strip, pinned=true. (importing the name `pinned` WITH modifier) ✓
  - All edge cases correctly resolve.

- [12:06 step-7 survey — existing import tests] Surveyed existing import-related tests:
  - `compiler/tests/unit/import-scope-registration.test.js` — 6 cases, named + default + multiple. None use `as`-alias. Step 7 must not regress.
  - `compiler/tests/unit/cross-file-import-export.test.js` — heavy on type-routing; uses bare named imports. No regression risk.
  - `compiler/tests/integration/cross-file-components.test.js` — bare named imports. No regression risk.
  - `compiler/tests/unit/p3a-name-collision-error.test.js` — uses `as`-alias (`import { chat as ChatX } from './x.scrml'`). Step 7 must preserve this exact form. Verified algo handles `foo as bar` correctly (no pinned suffix).
  - `compiler/tests/unit/p3a-chx-cross-file-inline.test.js` — `import { chat as roomChat } from './channels.scrml'`. Same as above.
  - **No regression risk identified.** All existing import forms preserved by pre-strip-then-existing-regex strategy.

- [12:07 step-7 survey — self-host parity] `compiler/self-host/ast.scrml` has the import-decl path at lines 1342-1364 — a regex-driven mirror of the JS path. **However**, self-host omits `specifiers[]` entirely (only emits `names[]`). Steps 4/5/6 did NOT mirror to self-host (zero `pinned` / `defaultExpr` / `tryParseStructuralDecl` references in self-host). Per established A1a policy, self-host is not currently being kept in sync with per-step work. **Step 7 follows the same policy: NO self-host change.** Documented and acknowledged.

- [12:08 step-7 design summary]
  - Add `_splitPinned(entry)` helper inside the import branch:
    - Whitespace-tokenize the entry. If last word is `pinned` AND length >= 2 AND second-to-last is NOT `as`: strip last, pinned=true. Otherwise pinned=false.
    - Returns `{ core, pinned }`.
  - In the `_entries` loop:
    - First call `_splitPinned(entry)` → `{ core, pinned }`.
    - Pass `core` to the existing asMatch / `_stripQuotes` logic.
    - On `importNode.names`: continue using just the imported name (unchanged). The `pinned` flag is on `specifiers`, not `names`.
    - On `importNode.specifiers`: extend each specifier with `pinned: <bool>`.
  - Default if `pinned` not present: `pinned: false` on every specifier (not undefined — explicit default per BRIEF §1).
  - Update `compiler/src/types/ast.ts`:
    - `ImportDeclNode` does NOT currently declare `specifiers` (S40 P3.A added it at runtime without TS). Step 7 adds the optional `specifiers?: ImportSpecifier[]` declaration with `pinned: boolean` field. (Or extends ImportDeclNode with a per-item `pinned[]` parallel array — but parallel arrays are fragile. Specifiers structure is correct.)
  - Tests: extend new file `compiler/tests/integration/parse-import-pinned.test.js` with ~7 cases per BRIEF §4.
  - No self-host change.

- [12:09 step-7 implementation in progress] Beginning code edits.
