# R25-Bug-41 — `<schema>` content leaks into HTML body

## Startup verification
- WORKTREE_PATH: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-afd389d11432e2084`
- Branch: `worktree-agent-afd389d11432e2084`
- Merge from main: HEAD now `933d1ad3` (matches PA-expected baseline).
- `bun install` + `bun run pretest` OK.

## Phase 0 — Diagnose

### Reproducer

`/tmp/r25-bug-41/repro.scrml`:

```
<program title="repro" db="./app.db">
    < schema>
        cards {
            id:    integer primary key
            title: text not null
        }
    </>
    <page>
        <h1>Hello World</h1>
    </page>
</program>
```

Compile produces `dist/repro.html` whose `<body>` contains the literal DDL text:

```
<body>
    
        cards {
            id:    integer primary key
            title: text not null
        }
    
    
        <h1>Hello World</h1>
    
```

Bug confirmed.

### Sibling-structural-element verification (per brief)

- `<engine>` — does NOT leak (engine-decl branch at emit-html.ts:1830 routes to emit-engine; raw body text never reaches the markup-text-emit path).
- `<channel>` — does NOT leak (explicit `tag === "channel"` branch at emit-html.ts:1078 returns before children walk).
- `<db>` — does NOT leak when body is `${ ... }` (logic-context children, not raw text). The `<db>` block is a state-block too but its body is canonically a logic context.
- `<schema>` — DOES leak. The schema body is raw DDL text (NOT a logic context) — it's a state-block whose children are text nodes.

### Root cause

`<schema>` is normalized to a state-block in `ast-builder.js:10870-10888` (state-form lifecycle list): `_STATE_FORM_LIFECYCLE = ["db", "schema", "engine", "machine"]`. The post-TS AST for a `<schema>` block is a `node.kind === "state"` node with `stateType: "schema"` whose `children` array contains text nodes for the DDL.

`emit-html.ts`'s state-kind branch at line 578:

```ts
if (node.kind === "state") {
  for (const child of node.children ?? []) {
    emitNode(child);
  }
  return;
}
```

unconditionally recurses through children — including raw text nodes, which hit the text-kind branch at line 569 (`parts.push(node.value)`) and dump the DDL text into the HTML body.

Why `<db>` is fine and `<schema>` is not: `<db>` bodies are conventionally `${ ... }` logic contexts (server-function declarations), so the children are `logic` / declaration nodes — the markup-walker silently emits no HTML for them (declarations have no DOM presence). `<schema>` bodies are raw DDL text (per §39.2 EBNF: `schema-block ::= '< schema>' table-declaration* closer`), so the children include text nodes which DO emit visible body content.

### Fix scope

Bug 41 names `<schema>` specifically. The cleanest fix:

1. Modify the state-kind branch in `emit-html.ts:578-583` to skip the children walk when `stateType` names a server-side-only state block — i.e., one whose contents are NEVER HTML.
2. Server-side-only state types are `schema` (raw DDL — per §39) and `seeds` (per block-splitter's `COMPOUND_LIFT_EXEMPT_TAGS` document-root list, though `seeds` is rarely referenced in test corpus). `db` and `engine` and `machine` route through logic-context bodies or get re-routed to engine-decl shape upstream; they don't need an exclusion.

Will use a small exclusion set `SERVER_ONLY_STATE_TYPES = new Set(["schema", "seeds"])` at the top of emit-html.ts adjacent to LIFECYCLE_SILENT_TAGS.

### Phase 1 fix plan

Apply minimal change: add the exclusion set + early-return in state-kind branch. Test via reproducer + regression suite.

### Phase 2 tests

`compiler/tests/unit/schema-html-leak-r25-bug-41.test.js`:

1. Minimal repro — `<program>` + `<schema>` + `<page>`; assert no DDL text in HTML.
2. Multi-table schema.
3. Schema with column names that collide with normal English words.
4. Positive control — `<page>` body text IS in HTML.
5. `<schema>` after `<page>` (positional independence).
6. `<schema>` inside `<program>` with multiple `<page>`s.
7. `<schema>` with `${ schemaFor(T) }` interpolation (rewritten-to-text path).
8. `<seeds>` block exclusion (positive control if seeds emits, regression-guard if not).

Aim ≥ 6-10 tests.

## Phase 1 — Fix LANDED

Commit `4a8338ff`. emit-html.ts changes:
- Added `SERVER_ONLY_STATE_TYPES = new Set(["schema", "seeds"])` to the header constants (after `LIFECYCLE_SILENT_TAGS`).
- Modified state-kind branch in `emitNode` to early-return when `stateType` is in that set.

## Phase 2 — Tests LANDED

`compiler/tests/unit/schema-html-leak-r25-bug-41.test.js` — 18 tests / 8 sections, all passing.

## Phase 3 — Verification

- Minimal reproducer: BEFORE — `<body>` contained `cards { id: integer primary key, title: text not null }`; AFTER — `<body>` contains only `<h1>Hello World</h1>`. DDL absent (grep on `primary key`, `text not null`, `cards {` all zero matches in HTML + client.js).
- Pre-commit gate: 14851 pass / 0 fail / 88 skip / 764 files (unit+integration+conformance scope).
- Full `bun run test`: 21870 pass / 0 fail / 170 skip / 1 todo / 806 files. Baseline 21852 pass / 804 files → +18 tests (matching the new file) → ZERO regressions.

## Final state

Status: COMPLETE.
HEAD: `4a8338ff`.
Branch: `worktree-agent-afd389d11432e2084`.

## Deferred items

None. The brief's scope (schema-only fix) is closed; sibling structural elements (engine/channel/db/auth/onTransition/onTimeout/onIdle) verified clean upstream — no additional fixes needed.

`<seeds>` was added to the exclusion set as a defense-in-depth measure (it's in block-splitter's `COMPOUND_LIFT_EXEMPT_TAGS` document-root list and parses as a state-block with stateType="seeds"; not actively reproduced as a leak in any current test corpus, but the same state-kind path would leak its raw body if anyone used the canonical form — pre-emptive coverage rather than reactive fix).
