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

- [12:10 step-7 implementation — parser extension] Modified `compiler/src/ast-builder.js` import-decl branch (lines ~4883-4942). Added `_splitPinned(entry)` helper that whitespace-tokenizes each entry, then strips a trailing `pinned` token IFF length>=2 AND the predecessor is NOT `as`. Disambiguation rule encoded literally in the comment and the helper. Pre-step inserted BEFORE the existing asMatch logic so the asMatch regex sees a clean `name [as alias]` core string. Specifiers now carry `pinned: <bool>` per-item; default false on every emitted specifier (never undefined).

- [12:11 step-7 probe — sanity check] Wrote a 10-case probe (worktree-local, deleted before commit). All 10 cases produce expected output:
  - `{ foo pinned }` → 1 spec with pinned:true
  - `{ foo pinned, bar, baz pinned }` → 3 specs, mixed flags
  - `{ foo as bar pinned }` → spec {imported:foo, local:bar, pinned:true}
  - `{ foo as bar }` regression → pinned:false
  - `{ foo, bar }` regression → both pinned:false
  - default `import foo from '...'` regression → specifiers:[]
  - `{ pinned }` (name = pinned) → imports name `pinned`, pinned:false (length<2)
  - `{ foo as pinned }` → alias to `pinned`, pinned:false (predecessor is `as`)
  - `{ pinned pinned }` → imports name `pinned` with modifier (predecessor not `as`)
  - `{ foo as pinned pinned }` → alias to `pinned` with modifier
  All disambiguations correct. No false-positive modifier strips.

- [12:12 step-7 types/ast.ts] Extended types/ast.ts: introduced new `ImportSpecifier` interface declaring `{imported: string, local: string, pinned: boolean}`. Added `specifiers?: ImportSpecifier[]` field to `ImportDeclNode` (optional because default-import path leaves it as []). Note: prior to Step 7, `specifiers` was emitted at runtime by S40 P3.A but NEVER declared in TS — Step 7 fills the gap. Optional marker keeps assignability for default-import path.

- [12:13 step-7 self-host parity check] `compiler/self-host/ast.scrml` import branch (lines 1342-1364) is regex-driven mirror but produces ONLY `names[]` (no `specifiers[]` ever). Per established A1a Step 4/5/6 policy (zero `tryParseStructuralDecl`/`pinned`/`defaultExpr` references in self-host), self-host is NOT being kept in sync with per-step parser work. **Step 7 follows the same policy: NO self-host change.** Mirroring `pinned` cleanly would require adding `specifiers[]` to self-host first — out of Step 7 scope.

- [12:14 step-7 tests added] Added new test file `compiler/tests/integration/parse-import-pinned.test.js` with **10 cases (§I7.1-§I7.10)**:
  - §I7.1: single pinned `{ foo pinned }` → pinned:true.
  - §I7.2: bare regression `{ foo, bar }` → both pinned:false.
  - §I7.3: multi-item with mixed flags `{ foo pinned, bar, baz pinned }` → 3 specs with [true, false, true].
  - §I7.4: alias + pinned `{ foo as bar pinned }` → {imported:foo, local:bar, pinned:true}.
  - §I7.5: alias regression `{ foo as bar }` → pinned:false, alias preserved.
  - §I7.6: default-import regression `import foo from '...'` → no specifiers, isDefault:true.
  - §I7.7: `{ pinned }` disambiguation → imports name `pinned`, pinned:false.
  - §I7.8: `{ foo as pinned }` disambiguation → alias to name `pinned`, pinned:false.
  - §I7.9: quoted import + pinned `{ "dispatch-board" as dispatchBoard pinned }` → quote-strip composes with pinned-strip; spec {imported:"dispatch-board", local:"dispatchBoard", pinned:true}.
  - §I7.10: invariant battery — 7 fixtures all assert `typeof spec.pinned === "boolean"` AND imported/local are strings (catches default-undefined regression).

- [12:15 step-7 isolated test] `bun test compiler/tests/integration/parse-import-pinned.test.js`: **10 pass / 0 fail / 84 expect calls / 45ms**. All cases green first run.

- [12:16 step-7 full suite] `bun run test`: **8,804 pass / 43 skip / 0 fail / 8,847 across 436 files**. Run-1 had 1 ECONNREFUSED flake (same shape as baseline); rerun was clean. Delta from baseline 8,794 → 8,804 = exactly +10. 0 regressions on existing 8,794. Pre-commit hook green throughout. File count 435 → 436 (new test file).

- [12:17 step-7 path-discipline] No near-misses. All Read/Write/Edit calls used absolute paths under WORKTREE_ROOT (`/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-adb099ab63b8598d3/...`). Probe file (`probe-step7.mjs`) was created in worktree root, used, and deleted before commit. No writes to main's working tree.

- [12:18 step-7 done] All DoD gates green:
  1. ✅ ast-builder.js import-decl branch extended — `_splitPinned` helper + integrated into `_entries` loop. 28 insertions / 6 deletions.
  2. ✅ types/ast.ts extended — new `ImportSpecifier` interface + `specifiers?` field on `ImportDeclNode`. 22 insertions / 1 deletion.
  3. ✅ Self-host parity: NOT changed (per A1a Step 4/5/6 policy — self-host is out-of-sync by design at this phase).
  4. ✅ parse-import-pinned.test.js created with 10 new cases (§I7.1-§I7.10). 198 insertions.
  5. ✅ Pre-commit hook green; full `bun run test` 8,804/43/0/8,847.
  6. ✅ Delta: +10 tests, 0 regressions on existing 8,794.
  7. ✅ Branch clean. No `--no-verify`.

- [12:19 step-7 hand-off for A1b] Step 7 establishes the `pinned` flag on `ImportSpecifier`. A1b will add semantic enforcement:
  - `E-IMPORT-PINNED-INVALID` (§34) — `pinned` on a non-cell-typed non-engine-typed import is invalid.
  - `E-STATE-PINNED-FORWARD-REF` (§34) — forward-ref through a pinned import.
  - Cycle detection — the import-graph traversal in module-resolver uses `pinned` as a topological constraint.
  Consumers of `specifiers[].pinned`: NR (registers pinned bindings as identity-stable), TS (forward-ref check on all uses of pinned-imported names), CG (A1c hoisting).

