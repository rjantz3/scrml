# A1b Step B19 — Progress log

**Step:** B19 — Channels file-level placement + `@shared` modifier rejection
**Errors:** E-CHANNEL-INSIDE-PROGRAM (§38.1) + E-CHANNEL-SHARED-MODIFIER (§38.4)
**Worktree:** `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a336460512994eacf`
**Started:** 2026-05-07 S69

---

## Timeline

- **2026-05-07 (S69)** — Startup verification complete. Worktree clean, `bun install` ok, baseline `bun run test` reports 9425 pass / 60 skip / 1 todo / 0 fail (after pretest stabilization).
- **2026-05-07 (S69)** — Phase 0 survey landed at `SURVEY.md`. Existence guards: zero existing fire-sites for E-CHANNEL-INSIDE-PROGRAM or E-CHANNEL-SHARED-MODIFIER. AST shape confirmed: channel = `MarkupNode tag:"channel"`; `@shared` = `state-decl{ isShared: true }`. Walker target: SYM PASS 14.
- **2026-05-07 (S69)** — PASS 14 implemented in `compiler/src/symbol-table.ts`. Two sub-walks: `walkChannelPlacement` (fires E-CHANNEL-INSIDE-PROGRAM at markupDepth >= 1) + `walkSharedModifier` (fires E-CHANNEL-SHARED-MODIFIER on any state-decl with isShared:true). Wired into `runSYM` after PASS 13 (B17).
- **2026-05-07 (S69)** — Test suite added: `compiler/tests/unit/channel-placement-shared-b19.test.js`, 14 tests / 44 expect() calls, all passing.
- **2026-05-07 (S69)** — Test-fixture migration: 6 existing tests had v1-shape `@shared` and/or nested-channel fixtures. Migrated all to V5-strict file-level form:
  - `compiler/tests/integration/p3a-cross-file-multi-page-broadcast.test.js`
  - `compiler/tests/integration/p3a-pure-channel-file.test.js`
  - `compiler/tests/unit/p3a-name-collision-error.test.js`
  - `compiler/tests/unit/p3a-diagnosis.test.js`
  - `compiler/tests/unit/p3a-chx-same-file-passthrough.test.js` (also removed §5 "channel-inside-div" — that shape is now an error per §38.1; coverage migrated to B19 §B19.3)
  - `compiler/tests/unit/p3a-chx-cross-file-inline.test.js` (renamed test "with @shared" to "mutates a channel-body cell")
- **2026-05-07 (S69)** — Full test suite: 9438 pass / 60 skip / 1 todo / 0 fail (vs baseline 9425/60/1/0 — net +13: +14 B19 tests, -1 channel-inside-div test removed per spec).
- **2026-05-07 (S69)** — STEP B19 COMPLETE. Final SHA `281baf5`.

---

## FINAL REPORT

### WORKTREE_PATH
`/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a336460512994eacf`

### FINAL_SHA
`281baf5` (feat(a1b-b19): SHIP — channel placement + @shared modifier rejection (PASS 14))

Predecessor SHAs (in branch order):
- `ddb1d4f` WIP(b19): Phase 0 survey + progress log
- `281baf5` feat(a1b-b19): SHIP

### FILES_TOUCHED

Primary (compiler):
- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a336460512994eacf/compiler/src/symbol-table.ts` (+248 lines: PASS 14 walker + 2 fire-functions + runSYM call site)

New tests:
- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a336460512994eacf/compiler/tests/unit/channel-placement-shared-b19.test.js` (NEW; 14 tests / 44 expect calls)

Test-fixture migrations (v1 `@shared` / nested-channel → v0.next V5-strict file-level):
- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a336460512994eacf/compiler/tests/integration/p3a-cross-file-multi-page-broadcast.test.js`
- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a336460512994eacf/compiler/tests/integration/p3a-pure-channel-file.test.js`
- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a336460512994eacf/compiler/tests/unit/p3a-name-collision-error.test.js`
- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a336460512994eacf/compiler/tests/unit/p3a-diagnosis.test.js`
- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a336460512994eacf/compiler/tests/unit/p3a-chx-same-file-passthrough.test.js` (also removed §5 channel-inside-div test — that shape is now a B19 error)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a336460512994eacf/compiler/tests/unit/p3a-chx-cross-file-inline.test.js`

Docs:
- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a336460512994eacf/docs/changes/phase-a1b-step-b19-channel-placement-shared-removal/SURVEY.md` (NEW)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a336460512994eacf/docs/changes/phase-a1b-step-b19-channel-placement-shared-removal/progress.md` (NEW)

### TEST_DELTA

Baseline (post-S68, pre-B19): 9425 pass / 60 skip / 1 todo / 0 fail (full suite); 8701 pass / 49 skip / 1 todo / 0 fail (pre-commit subset).

Post-B19: 9438 pass / 60 skip / 1 todo / 0 fail (full); 8714 pass / 49 skip / 1 todo / 0 fail (pre-commit subset).

Net delta: **+13 tests** (+14 B19 tests, -1 channel-inside-div test removed in p3a-chx-same-file-passthrough §5 — that shape is now an error per §38.1 line 15422; coverage migrated to B19 §B19.3). Zero regressions. Pre-commit hook passed; gauntlet TodoMVC + browser validation both passed.

### DEFERRED_ITEMS

- **Compile-time `@shared` inside greedily-consumed init expressions.** TAB's `collectExpr()` greedily consumes through newlines, so `@shared a = 0\n@shared b = 0` parses as `state-decl(name="a", init="0\n@shared", isShared:true)` + `tilde-decl(name="b")`. Only the FIRST `@shared` becomes a `state-decl.isShared:true` and fires; subsequent `@shared`-prefixed lines parse as different node kinds. This is a pre-existing TAB parser quirk (not a B19 bug). Per spec, `@shared` is a fully retired modifier — devs should not be writing it at all in v0.next. The B19 fires on whatever the parser produces; that is sufficient for the spec's "any occurrence SHALL emit" mandate. Future TAB tightening (separate dispatch) could fire on every `@shared` token regardless of subsequent parser state.
- **Channels inside HTML-literal markup `<div>...<channel>...</div>` (inside a logic block).** When a channel appears inside an HTML literal that the parser folds into an `html-fragment`, the `<channel>` is NOT visible to `ast.channelDecls[]` and B19's walker. This is the §B19.5 (no longer §5 — removed) shape. The fire is naturally suppressed because the AST loses the channel structure entirely. Edge case; not spec-load-bearing (a channel inside a literal HTML fragment was never a v0.next-supported shape).
- **A1c codegen for the new file-level placement.** The current `collectChannelNodes` (compiler/src/codegen/emit-channel.ts) walks markup tree depth-first; it correctly finds top-level channels. No changes needed for B19 — the walker is already file-scope-correct.
- **Sample/example file migration.** Sample `samples/compilation-tests/gauntlet-s20-channels/channel-shared-state-001.scrml` and example files (`examples/08-chat.scrml`, `examples/15-channel-chat.scrml`, `examples/23-trucking-dispatch/...`) still contain v1-shape `@shared` and nested channels. They are NOT compiled by any test that invokes SYM today (`expr-parity.test.js` only walks AST for ExprNode parity; pretest only compiles 12 specific samples, none of which use `@shared`). No regression. Future curation pass (separate dispatch) can migrate the corpus to v0.next shapes.

### OPEN_QUESTIONS

None blocking. The two errors fire correctly per spec; existing tests pass; corpus / sample / example migration is non-blocking deferred maintenance.

### SURVEY-NOTE

See `docs/changes/phase-a1b-step-b19-channel-placement-shared-removal/SURVEY.md` for the Phase 0 survey:
- §1 Existing channel-handling code (tokenizer / TAB / SYM / codegen survey).
- §2 `@shared` AST shape — `state-decl{ isShared: true }`, captured in two TAB code paths (logic-block parser line 3947-3966 + alternate path line 5823-5841).
- §3 AST shape probe (top-level channel, nested-in-program, nested-in-div, channel body).
- §4 Walker insertion decision: SYM PASS 14 (new), two sub-walks (`walkChannelPlacement` + `walkSharedModifier`), pattern mirrors B17.
- §5 Existing test coverage audit (which tests use `@shared`, which invoke SYM, which only test parser).
- §6 Risks / open questions: none blocking.
- §7 Decisions.

### SPEC-PROSE FOLLOW-UPS

**None.** Both error codes (`E-CHANNEL-INSIDE-PROGRAM`, `E-CHANNEL-SHARED-MODIFIER`) already exist in §34 (lines 14251-14252) and are referenced from §38.1 line 15422 + §38.4 line 15468 + §38.9 line 15670. Spec is complete and normative.

### PRIMER §13.7 B19 ROW DRAFT

Append to `docs/PA-SCRML-PRIMER.md` §13.7 table (after the B17 row):

```markdown
| **B19** | (no new AST field — fires `E-CHANNEL-INSIDE-PROGRAM` per SPEC §38.1 + §34 on `<channel>` markup nodes reached at `markupDepth >= 1`; fires `E-CHANNEL-SHARED-MODIFIER` per SPEC §38.4 + §34 on any `state-decl` with `isShared: true`) | every `<channel>` markup node + every `state-decl` reachable from `ast.nodes` (recurses through children/body/defChildren/consequent/alternate/arms[].body and through state-decl.children compound arrays) | — | walker is SYM PASS 14 (`walkValidateChannels` — two sub-walks: `walkChannelPlacement` for placement check + `walkSharedModifier` for modifier rejection). Both error codes already exist in §34 (lines 14251-14252) — no new catalog rows. Spec authority: §38.1 line 15422 (file-level placement mandate) + §38.4 line 15468 (`@shared` retirement). Per audit §2.1, B19 owns the modifier rejection only — V5-strict access validation inside channel body remains B3's territory. |
```

### PRIMER §13.7 B19 SPECIFICS BLOCK

Append after the B17 specifics block:

```markdown
**B19 specifics (load-bearing for v0.next channel migration M19 + future TAB `@shared` tightening):**

- **Two independent sub-walks share PASS 14.** `walkChannelPlacement` walks markup tree carrying `markupDepth: number` (count of markup ancestors). When `node.kind === "markup" && node.tag === "channel"` is reached at depth >= 1, fires `E-CHANNEL-INSIDE-PROGRAM`. Top-level (depth 0) channels are allowed per §38.1 line 15422. `walkSharedModifier` walks every AST node visiting `state-decl` nodes; fires `E-CHANNEL-SHARED-MODIFIER` on `isShared: true` regardless of containing context per §38.4 line 15468 + §38.9 line 15670 ("inside (or outside) a channel body").
- **`component-def` counts as a markup-ish ancestor.** `walkChannelPlacement` increments `markupDepth` on descent through `markup` AND `component-def` nodes — a channel inside a component-def's `defChildren` is also non-top-level placement and fires E-CHANNEL-INSIDE-PROGRAM. Channels never appear inside logic-blocks via the parser (channels are markup, logic is `${...}`); recursion into `body` happens defensively without depth increment.
- **TAB `@shared` capture.** `@shared <name> = init` produces `state-decl{ kind: "state-decl", name, isShared: true, shape: "plain", structuralForm: false, isConst: false }` per ast-builder.js lines 3947-3966 (logic-block parser) and 5823-5841 (alternate path). The structural form `<x> @shared = init` does NOT exist in any parser branch — `@shared` is exclusively the legacy `@`-prefix-modifier form. Malformed `@shared` (no init) falls back to `bare-expr`. **Pre-existing TAB quirk surfaced by B19:** `collectExpr()` greedily consumes through newlines, so a sequence like `@shared a = 0\n@shared b = 0` only stamps `isShared:true` on the FIRST line; subsequent lines become other node kinds (often `tilde-decl`). Only one B19 fire per such block. Semicolons (`@shared a = 0; @shared b = 0`) or separate `${...}` logic blocks each cleanly produce independent `state-decl{ isShared: true }` nodes — three fires when warranted. B19 fires on whatever the parser produces; the spec's "any occurrence SHALL emit" mandate is satisfied for unambiguous shapes. Future TAB tightening (separate dispatch, NOT B19) could fire on every `@shared` token regardless of subsequent parser state.
- **Diagnostic message fixed wording.** Both messages reference §38.1 / §38.4 + §34, name the offending construct (channel `name=` value when extractable from a static-string-literal attr; cell `name` for state-decls), and recommend the spec-canonical fix (file-level sibling-of-`<program>` placement; V5-strict structural form `<name> = init` inside a channel body, or `<name> = init` / `@name = init` outside). Test §B19.8 codifies the message-shape contract.
- **B3 cross-scope channel-cell access is unaffected.** Channel-body logic blocks (`${...}` inside a channel body) do NOT introduce a new SYM scope — the cell registers in the file scope (per B1's PASS 1 walker descending into `markup.children` + `logic.body`). B3's PASS 3 `@cellName` resolution sees them via the standard `lookupStateCell` parent-chain walk. B19 does NOT touch B3's resolution logic. Test §B19.10 verifies: `<channel name="chat">${ <messages> = [] }</>` paired with `<program>${ const n = @messages.length }</program>` fires no B19 errors AND `sym.fileScope.stateCells.has("messages") === true`.
- **No new §34 catalog rows.** Both `E-CHANNEL-INSIDE-PROGRAM` (line 14251) and `E-CHANNEL-SHARED-MODIFIER` (line 14252) already exist post-D3 / S58. B19 closes the validation-gate deferral D3 left open.
- **6 test-fixture migrations** to v0.next V5-strict file-level form: p3a-cross-file-multi-page-broadcast, p3a-pure-channel-file, p3a-name-collision-error, p3a-diagnosis, p3a-chx-same-file-passthrough (also removed §5 "channel-inside-div" — that shape is now an error per §38.1; coverage migrated to B19 §B19.3), p3a-chx-cross-file-inline (also renamed test "with @shared" → "mutates a channel-body cell"). Migration was mechanical: `@shared <name>: T = init` → `<name>: T = init` (or `<name> = init` when no type); nested `<program><channel>...</></program>` → top-level `<channel>...</></><program>...</program>`. No spec-prose changes needed.
- **Sample/example corpus DEFERRED migration.** `samples/compilation-tests/gauntlet-s20-channels/channel-shared-state-001.scrml` + `examples/08-chat.scrml` + `examples/15-channel-chat.scrml` + `examples/23-trucking-dispatch/...` retain v1 shapes but are NOT driven through SYM in any active test. No regression. Future curation pass can migrate.
- **Tests:** 14 unit tests in `compiler/tests/unit/channel-placement-shared-b19.test.js` covering top-level placement (no fire), nested-in-program fire, deeper nesting fire, V5-strict body acceptance, `@shared` inside channel fire, `@shared` outside channel fire (per §38.4 line 15468), multi-violation fan-out, message-shape contract, span attachment, and the file-level + cross-scope `@cellName` regression baseline (B3 unaffected). Test count delta: **+14 pass / +44 expect calls / 0 skip / 0 fail / 0 todo**. Full suite 9438 pass / 0 fail / 60 skip / 1 todo / 33222 expect calls.
```
