# A1c Step C22 — Bare-variant inference codegen — Progress Log

## 2026-05-09 — Dispatch start (S75)

- **Worktree:** `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-afa8640c1db329910`
- **Startup verification:** PASS
  - `pwd` = WORKTREE_ROOT (verified).
  - `git rev-parse --show-toplevel` = WORKTREE_ROOT (verified).
  - HEAD `72d691f` (S74 wrap commit). Tree clean.
  - `bun install` OK (114 packages).
  - `bun run pretest` OK (compiled samples to `samples/compilation-tests/dist/`).
  - Baseline: **10535 pass / 69 skip / 1 todo / 3 fail / 35867 expect**. The 3 fails
    are pre-existing infra failures (F-BUILD-002, Bootstrap L3 self-host, Self-host
    tab.js) — unrelated to C22. (Brief said ~10,553/65/1/0 baseline; close enough,
    the discrepancy is from intervening commits + the 3 standing fails.)

## Phase 0 — Survey

Survey at `docs/changes/phase-a1c-step-c22-bare-variant-codegen/SURVEY.md`.

**Key findings:**

1. B20 (A1b S69) shipped diagnostics only — no AST annotation of resolved-context.
   Primer §13.7 was correct on this point.
2. The runtime convention encodes UNIT variants as their bare string tag (e.g.,
   `Phase.Idle === "Idle"` per `emitEnumVariantObjects`). Therefore `.Idle` lowering
   does NOT need to know which enum it belongs to — emit `"Idle"` is universally correct.
3. Today's codegen for bare-variant `.Variant` in expression position emits the verbatim
   `.Idle` text via `emitIdent`'s pass-through return at line 215 of `emit-expr.ts` —
   producing **broken JavaScript** (`_scrml_reactive_set("phase", .Idle);`). Empirically
   reproduced in `.probe/bare-variant.client.js`.
4. The string-rewrite pass `rewriteEnumVariantAccess` (rewrite.ts:1289) DOES correctly
   rewrite standalone `.VariantName` → `"VariantName"`, but it only runs on the legacy
   fallback path when `exprNode` is null — which is dead code for well-formed scrml.
5. Match arms (position 5) and engine `initial=` (position 6) already emit correctly via
   separate codegen paths. Positions 3 (call arg) and 4 (return) are B20.b territory and
   excluded per BRIEF.

**Minimum codegen change:** add a bare-variant branch in `emitIdent` (5 lines) that
detects `name.startsWith(".") && /^[A-Z]/.test(name[1])` and emits the JSON-stringified
variant name. This covers positions 1, 1b, 2 simultaneously — they all funnel through the
same AST emit path.

**Specifically — the load-bearing answer:** B20's annotation was NOT enough (because
B20 didn't write any annotation); but C22 doesn't need to derive enum context either —
the runtime convention treats unit variants as plain strings, so the variant name on
the IdentExpr node is sufficient. Option (c) in the BRIEF's enumeration was almost-correct
but the AST-fast-path (which is now the dominant path) misses it; option (b) is the
literal answer (C22 emits without any context lookup).

## Phase 1 — Codegen patch

Applied minimal `emitIdent` patch at `compiler/src/codegen/emit-expr.ts:215` —
detects bare-variant idents and emits the JSON-stringified variant name.

Re-compiled probe `.probe/bare-variant.scrml`. Output now correct:
```js
_scrml_reactive_set("phase", "Idle");
_scrml_init_set("phase", () => "Idle");
```

Re-compiled probe `.probe/bv-let-only.scrml`. Output now correct:
```js
let x = "Loading";
```

Test count after Phase 1: 10535 pass / 69 skip / 1 todo / 3 fail (no regressions; 3
pre-existing infra fails unchanged).

## Phase 2 — Unit tests

Added `compiler/tests/unit/c22-bare-variant-codegen.test.js` with 14 test cases
covering the codegen surface:

- state-decl init position 1: `<x>: T = .V` emits `"V"`.
- let-decl init position 1b: `let x: T = .V` emits `let x = "V";`.
- const-decl init position 1b: `const x: T = .V` emits `const x = "V";`.
- multiple bare-variants in a single file (sanity).
- regression: qualified `Phase.Idle` (MemberExpr) unchanged.
- regression: match-arm `.Variant => ...` codegen unchanged (uses match-arm path).
- regression: engine `initial=.V` codegen unchanged (uses engine path).
- regression: `is .Variant` operator unchanged (uses is-rewrite path).
- corner: bare-variant in ternary branches.
- corner: bare-variant in array element / object value.
- corner: bare-variant in binary `==` operands.

Test count after Phase 2: 10549 pass / 69 skip / 1 todo / 3 fail. **+14 pass**, no
regressions.

## Phase 3 — Wrap

Survey written, progress.md (this file) written. SCOPE-AND-DECOMPOSITION C22 row
update deferred to PA review (worktree-as-scratch S67 protocol).

## Final state

- Worktree: `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-afa8640c1db329910`
- FILES_TOUCHED:
  - `compiler/src/codegen/emit-expr.ts` (5-line patch in `emitIdent`)
  - `compiler/tests/unit/c22-bare-variant-codegen.test.js` (new, +14 tests)
  - `docs/changes/phase-a1c-step-c22-bare-variant-codegen/SURVEY.md` (new)
  - `docs/changes/phase-a1c-step-c22-bare-variant-codegen/progress.md` (new, this file)
- Test delta: +14 pass (10535 → 10549). No regressions.
- DEFERRED: positions 3 (call arg) and 4 (return) — B20.b territory per BRIEF.
- SPEC amendments: NONE.
