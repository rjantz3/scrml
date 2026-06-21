# g-interp-in-raw-content — progress

Change-id: `g-interp-in-raw-content` (sPA ss11 item 1)
Goal: add `W-INTERP-IN-RAW-CONTENT` info-lint firing when a `${...}` / `<Tag>` /
brace-sigil scrml token appears inside the body of a raw-content element
(`<pre>` / `<code>`, SPEC §4.17). §4.17 keeping the body raw is CORRECT; the
defect being closed is the SILENCE — today `<pre>${board}</pre>` ships broken
output with zero diagnostic (Flux dog-food S193).

## Step 0 — startup verification (DONE)
- pwd = `.../.claude/worktrees/agent-a3ad52a56c2308165` (agent worktree, OK)
- branch = `worktree-agent-a3ad52a56c2308165`, base = `0a605d3e` (OK)
- `git status` clean; `bun install` OK; `bun run pretest` populated dist.

## Step 1 — recon (DONE)
Fire site read: `compiler/src/block-splitter.js` L3135-3200 — the
`RAW_CONTENT_ELEMENTS.has(lowerTagName)` branch captures the raw body as a
single `{ type:"text", raw }` child on the `{ type:"markup", name, isComponent:false }`
node. `RAW_CONTENT_ELEMENTS = { pre, code }`.
Lint precedent read: `lint-w-each-promotable.js` (standalone module shape) +
`api.js` partition (L2629-2635) + `collectErrors` (L854).

KEY partition fact: api.js has TWO diagnostic channels.
  - `allLintDiagnostics` (promotable/tailwind/ghost lints) → `result.lintDiagnostics`.
  - `allErrors` → partitioned at L2629-2635: `{W-/I- prefix OR severity warning/info}`
    → `result.warnings` (non-fatal, exit 0); everything else → `result.errors`.
The brief MANDATES `result.warnings`, so the diagnostic must flow through
`allErrors` (via `collectErrors`), NOT `allLintDiagnostics`. A `W-` code with
`severity:"info"` partitions cleanly to `result.warnings` and keeps CLI exit 0.

SPEC §4.17 (L1099-1141) grounds the token list verbatim: `${...}`, uppercase
`<TagName>`, and brace sigils `?{ #{ !{ ^{ _{`. The "opt-back-in deferred" note
(L1125) + "compose markup AROUND the `<pre>`" example confirm the steer toward a
non-raw wrapper — same idea as the brief's `<div class='whitespace-pre'>`.

## Step 2 — HOME DECISION (DONE)
Chose a **standalone lint module** `compiler/src/lint-w-interp-in-raw-content.js`
that walks the BS block-split AST (`bsResults`) for raw-content markup nodes,
scans the captured text child, and returns diagnostics. Wired into api.js right
after Stage 2 (BS), pushed via `collectErrors("BS-LINT", ...)` so it lands in
`result.warnings`.

Why standalone over inline-at-capture-site:
  1. The block-splitter is a hot single-pass tokenizer mutation loop; adding
     diagnostic-emission + conservative regex tuning there couples the lint to
     the scanner and is harder to test in isolation. Brief warns false positives
     are worse than misses for an info-lint → wants isolated, tunable, unit-tested
     detection.
  2. Mirrors the established W-lint precedent (`lint-w-each-promotable.js`):
     single-responsibility, directly unit-testable over a synthetic AST.
  3. The raw body is ALREADY captured as a `text` child on the markup node, so
     the walk has everything it needs without re-scanning source.

Why BS-stage (`bsResults`) over TS-stage (`tsResult.files`): raw-content capture
is a BS concern; the single-text-run child shape is a BS artifact. Walking
`bsResults` reads the exact captured string the brief points at.

## Step 3 — implement module (DONE)
`compiler/src/lint-w-interp-in-raw-content.js`:
  - `detectToken(text)` → first token label or null. Order: `${...}` (require a
    matching `}` after) → `<[A-Z]` (uppercase opener; lowercase HTML NOT flagged)
    → inert brace sigils `?{ #{ !{ ^{ _{`.
  - `walkRawContent(blocks, visit)` → DFS over BS `children`, visits
    `markup`/`isComponent:false`/name in {pre,code} nodes with their text child.
  - `buildMessage(el, label)` → names element + token, cites §4.17, steers to
    `<div class='whitespace-pre'>` + escaping. severity:"info", code
    `W-INTERP-IN-RAW-CONTENT`.
  - `runWInterpInRawContent(bsResults)` → diagnostics[].

## Step 4 — wire into api.js (DONE)
Import added; Stage 2.5 pass after the BS empty-guard, pushed via
`collectErrors("BS-LINT", [d], filePath)` → `allErrors` → partition → `result.warnings`.

## Step 5 — compile-verify probe (DONE — all acceptance cases pass)
End-to-end probe (real source strings, R26):
  - `<pre>${board}</pre>` / `<code>${x}</code>` → 1 W-INTERP each in `result.warnings`,
    0 in `result.errors`, 0 fatal-errors (exit 0). PASS.
  - `<pre>plain text 2 < 3</pre>` → 0 W-INTERP (no false positive on bare `<`). PASS.
  - `<div class='whitespace-pre'>${@board}</div>` → 0 W-INTERP (non-raw unaffected;
    interpolation live). The only fatal there was an UNRELATED pre-existing
    E-ATTR-001 on the `whitespace-pre` class name — not my lint. PASS.
  - `<pre>The ?{ syntax}</pre>` → fires (`?{` sigil). `<code><Foo></code>` → fires
    (`<TagName>`). `<pre>tag: <button></pre>` → does NOT fire (lowercase HTML). PASS.

## Step 6 — regression test (DONE)
`compiler/tests/unit/lint-w-interp-in-raw-content.test.js` — 27 cases:
  §A direct over synthetic BS AST (fires: ${}/uppercase-Tag/each sigil/case-insensitive;
     negatives: bare-`<`+lowercase, lone `$`, unclosed `${`, sigil-no-brace, plain body,
     component Pre/Code, non-raw div, null/empty/malformed; span reporting).
  §B end-to-end partition (CROSS-STREAM assert): `<pre>${board}</pre>` + `<code>${x}</code>`
     each fire exactly 1 W-INTERP in result.warnings, 0 in result.errors, 0 fatal (exit 0);
     `<pre>plain 2 < 3</pre>` fires nothing; `<div>${@board}</div>` unaffected; `?{` fires.

Coupled baseline update (S88 true-positive on real corpus): the lint correctly
fires 3× in examples/23-trucking-dispatch — `${@currentUser.email}` (×2 profile) +
`${@channelId}` (messages), all inside `<code>` raw bodies (they ship the literal
`${...}`). Updated `trucking-dispatch-smoke-integration.test.js` baseline:
W-INTERP-IN-RAW-CONTENT:3, aggregate 74 -> 77, header doc-comment synced.

Ran `bun test` on both files: 32 pass / 0 fail.

## Step 6b — P3-FOLLOW guard fix (DONE)
First full-gate run tripped `p3-follow-no-isComponent-routing.test.js`: my module
used `node.isComponent === false` (3 substring occurrences) — the migration guard
forbids new `isComponent`-routing read sites. Replaced the predicate with an
equivalent PRE-NR SYNTACTIC check `isPascalCaseName(name)` (first-char uppercase
=> component ref). This is the SAME signal BS's `isComp` stamp derives from
(BS `isComponentName` = first-char-uppercase, verbatim), and the lint runs at
Stage 2.5 (post-BS / pre-NR) where no NR resolvedKind exists yet. Zero
`isComponent` substrings remain in the module → guard green, no allowlist edit
needed.

Empirical finding (R26): BS routes uppercase-first `<PRE>`/`<CODE>` to the
COMPONENT path (`isComponent:true`), parsing the body as a `logic` child — they
are NOT §4.17 raw-content nodes (only lowercase-first `<pre>`/`<code>` capture a
raw `text` child). Corrected the case-insensitivity test accordingly (`<PRE>`
must NOT fire). SPEC §4.17's "case-insensitive" clause governs close-tag matching
the open tag, not uppercase-first recognition (a pre-existing BS behavior,
out of scope to change).

## Step 7 — full pre-commit gate (DONE — GREEN)
Commit `450fb892` ran the full `bun test` pre-commit gate (12655 tests / 612 files)
+ browser output-quality validation — all green. Tree clean.

FILES TOUCHED:
  - compiler/src/lint-w-interp-in-raw-content.js (NEW — lint module)
  - compiler/src/api.js (+import, +Stage 2.5 invocation via collectErrors)
  - compiler/tests/unit/lint-w-interp-in-raw-content.test.js (NEW — 27 cases)
  - compiler/tests/integration/trucking-dispatch-smoke-integration.test.js (baseline +3)
  - docs/changes/g-interp-in-raw-content/progress.md (this file)
