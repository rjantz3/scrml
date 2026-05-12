---
title: "v0.3 Wave 2 — compiler implementation (migrate command + TAB extension)"
date: 2026-05-12
session: S86
status: DRAFT — awaits user authorization to dispatch
predecessor: docs/changes/v03-wave-1/ (SPEC + walker inversion, LANDED `2b7c4df` 2026-05-12 S85)
scope-authority: compiler/SPEC.md §40.8 + §40.8.1 + §4.15 + §24.4 + §38.1 + §38.4.1 + §39.12.0 + §47.9.2 + §34 (all LIVE at HEAD)
design-authority:
  - scrml-support/docs/deep-dives/program-as-container-shape-DIVE-2026-05-11.md (S84 + S85 amendment)
  - scrml-support/docs/deep-dives/program-as-container-implementation-plan-2026-05-12.md (R1-vs-R2 + 4-wave plan)
  - scrml-support/docs/deep-dives/page-helper-element-design-2026-05-12.md (`<page>` design + Phase 3.6 R2+page band)
walltime-band: 15-30h parallel walltime (Wave 2 alone); summed item-(a) ~45-75h + item-(b) ~33-55h serial collapses to parallel
fires-as: TWO parallel scrml-dev-pipeline dispatches, worktree-isolated, file-disjoint
tags: [v0.3, wave-2, dispatch-brief, page-helper, program-shape, migrate-extension, tab-extension, r2-corrected]
---

# v0.3 Wave 2 — compiler implementation

> **AMENDMENT 001 (S86, RATIFIED, binds item-(b) TAB-extension agent):** Fixtures
> authored under this dispatch SHALL default to inline `class="..."` (Tailwind-style)
> for any styling, and SHALL NOT use file-top `#{}` blocks as the idiomatic styling
> shape. `#{}` is reserved for shapes that cannot express inline (CSS vars,
> keyframes, complex non-element selectors), or for fixtures explicitly TESTING
> file-top `#{}` placement (label as such). Auto-lift / `<page>`-placement
> fixtures should not need styling at all. Full text + rationale:
> [`DIRECTIVE-AMENDMENT-001-fixture-styling.md`](./DIRECTIVE-AMENDMENT-001-fixture-styling.md).
> This is a clarification, not a re-scope. Keep proceeding.

Two parallel dispatches that turn v0.3 Wave 1's SPEC-anchor into a working compiler. After Wave 2, `bun scrml migrate --program-shape` rewrites legacy v0.2 source into v0.3 shape, and the TAB stage accepts the v0.3 default-logic body + `<page>` structural-element placement.

**This brief is the source of truth for both sub-dispatches.** Each sub-dispatch reads this whole document + the dispatch-specific section.

---

## 0. Wave 1 context (what's already shipped — do NOT re-do)

At HEAD `23e6265` the following are LIVE — DO NOT re-edit:

- **SPEC.md §40.8** (`compiler/SPEC.md:17467+`) — one-program-per-application; default-logic body mode; `<page>` siblings inside `<program>`; channels inside `<program>` as siblings of `<page>`; SPA = absence of `<page>` siblings.
- **SPEC.md §40.8.1** — `<program spa>` boolean OQ (4 args each side; decision DEFERRED; do NOT pre-commit).
- **SPEC.md §4.15 / §24.4** — `<page>` registered as scrml-defined structural element; `route=` doubly forbidden; valid attrs `{db, auth, csrf, ratelimit}`.
- **SPEC.md §38.1 / §38.4.1** — channel placement REVERSED: channels live INSIDE `<program>` (v0.3 direction); A8 canonical contract recorded.
- **SPEC.md §39.12.0** — schema/seeds `<program db=>` workaround tolerated v0.3 + explicit v0.4-fix.
- **SPEC.md §47.9.2** — route URL inference from filesystem path (Pillar 3 compiler-owns-the-wiring).
- **SPEC.md §34** — 5 new diagnostic catalog rows: `E-CHANNEL-OUTSIDE-PROGRAM`, `E-CHANNEL-INSIDE-PAGE`, `E-PAGE-ROUTE-ATTR-FORBIDDEN`, `E-PAGE-INVALID-ATTR`, `W-PROGRAM-REDUNDANT-LOGIC`. `E-CHANNEL-INSIDE-PROGRAM` marked retired (still listed for diagnostic-rosetta).
- **`compiler/src/symbol-table.ts:6006`** — `walkChannelPlacement` inverted to fire `E-CHANNEL-OUTSIDE-PROGRAM` instead of `E-CHANNEL-INSIDE-PROGRAM`.
- **5 test files `.skip`'d** with documented v0.3 A8-wave deferral: `channel-placement-shared-b19.test.js` (REWRITTEN for v0.3 direction, 15 pass), `p3a-cross-file-multi-page-broadcast.test.js`, `p3a-pure-channel-file.test.js`, `p3a-chx-cross-file-inline.test.js`, `p3a-chx-same-file-passthrough.test.js`, `p3a-diagnosis.test.js`.

**Pre-Wave-2 baseline:** 11,507 pass / 100 skip / 1 todo / 0 fail / 557 files (`bun run test` at `23e6265`).

**Walker behavior at HEAD.** `walkChannelPlacement` is LIVE — any pre-v0.3 fixture with a file-top `<channel>` (no `<program>` ancestor) fires `E-CHANNEL-OUTSIDE-PROGRAM`. Examples currently failing under v0.3 walker: `examples/15-channel-chat.scrml`, `examples/08-chat.scrml`, `examples/23-trucking-dispatch/channels/*.scrml`. These fixtures are NOT failing in the test suite (compile-of-failing-fixtures is gated separately); they're failing the v0.3-shape compilation. **Wave 2 deliverable: migrate command can produce v0.3 shape from these.** Wave 3 then runs the sweep.

**No additional pre-Wave-2 dependencies.** Wave 2.5 (A1-A4) + A6/A7 already CLOSED (S85). `ast-builder.js` + `symbol-table.ts` are quiet — no in-flight contention.

---

## 1. Reading list (mandatory before any source edit)

### 1.1 spec sections (verify against current HEAD — Rule 4)

Read these in order:

1. `compiler/SPEC.md` §40.8 — one-program-per-application normative statements (line ~17467).
2. `compiler/SPEC.md` §40.8.1 — `<program spa>` OQ (line follows §40.8; do NOT implement either side of the OQ; preserve absence-of-marker as SPA-inference per current spec).
3. `compiler/SPEC.md` §4.15 — `<page>` structural-element registration row (search "page" in §4.15 table).
4. `compiler/SPEC.md` §24.4 — `<page>` HTML-spec-awareness mirror.
5. `compiler/SPEC.md` §38.1 — channel inside-`<program>` placement (line ~16003).
6. `compiler/SPEC.md` §38.4.1 — A8 canonical contract (cross-file publishX route-dedup; **NOT for implementation in Wave 2 — A8 codegen is a separate later wave**). Read for context only.
7. `compiler/SPEC.md` §47.9.2 — route URL inference (line ~18849).
8. `compiler/SPEC.md` §34 — five new diagnostic rows (line 14667 onward).

### 1.2 design docs (read once for design intent; SPEC is normative if any disagree)

1. `scrml-support/docs/deep-dives/program-as-container-shape-DIVE-2026-05-11.md` — S84 dive + S85 amendment.
2. `scrml-support/docs/deep-dives/program-as-container-implementation-plan-2026-05-12.md` — Phase 2 wave plan (Wave 1 + Wave 2 + Wave 3 sequencing); Phase 3 risk surface (especially 3.3 "test corpus invariants the migration sweep will break temporarily").
3. `scrml-support/docs/deep-dives/page-helper-element-design-2026-05-12.md` — `<page>` design dive (Phase 1.1 normative clauses for `<page>` are the authoritative shape); Phase 2.1 migrate-command file-classification table; Phase 3.7 explicit non-goals (NO route=, NO method=, NO multi-route-per-file, NO `<page>`-nested-`<page>`).

### 1.3 LLM kickstarter + anti-patterns (mandatory per pa.md)

1. `docs/articles/llm-kickstarter-v1-2026-04-25.md` — full read before generating any scrml.
2. `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` — read before writing any scrml. Reread before each feature.

### 1.4 PA-SCRML-PRIMER

`docs/PA-SCRML-PRIMER.md` — read §1 framing, §3 V5-strict, §4 three-RHS-shapes, §7 engines, §9 channels.

### 1.5 maps

`.claude/maps/primary.map.md` (~100 lines) — full read. Use Task-Shape Routing to identify which additional maps apply to the dispatch.

**Map currency:** maps reflect HEAD `7c5f64c` as of 2026-05-10. If your work touches files modified after that point, treat the map content as a starting hypothesis to verify via grep / Read against current source — not as ground truth. (HEAD at brief-author time: `23e6265`.)

**Feedback:** in your final report, include either:
- "Maps consulted: [list]; load-bearing finding: <one sentence on what the map content told you>"
- "Maps consulted but not load-bearing — [optional: which map you expected to help but didn't]"

The second answer is fine and valuable. It's signal PA needs.

---

## 2. CRITICAL — startup verification + path discipline

Your worktree path is: `<ABSOLUTE-WORKTREE-PATH>` (filled in at dispatch time)

### 2.1 Startup verification (do this BEFORE any other tool call)

1. Run `pwd` via Bash. Output MUST equal the worktree path above. Save the output as your WORKTREE_ROOT for the rest of the dispatch.
2. Run `git rev-parse --show-toplevel` via Bash. Output MUST equal WORKTREE_ROOT.
3. Run `git status --short` via Bash. Confirm tree is clean.
4. Run `bun install` via Bash. Worktrees do NOT inherit `node_modules` from main. The pre-commit hook's `bun test` will fail with "cannot find package 'acorn'" otherwise.
5. Run `bun run pretest` via Bash. This populates `samples/compilation-tests/dist/` with ~12 compiled samples that the browser-test suite loads. `dist/` is gitignored — fresh worktrees have it empty. For baseline checks use `bun run test` (which chains pretest) NOT `bun test` directly.
6. **Per-machine pre-commit hook enable** — run `git config core.hooksPath scripts/git-hooks` inside the worktree. Worktrees do NOT inherit `core.hooksPath` from main; without this the pre-commit gate won't run and your commits will land without test verification. Validate via `git config --get core.hooksPath` (must return `scripts/git-hooks`).

If ANY check fails: DO NOT proceed. Report the mismatch and exit.

### 2.2 Path discipline (enforce on EVERY Read/Write/Edit call)

- For Read: paths under WORKTREE_ROOT are safe. Reading from main via absolute path will give you the wrong file content.
- For Write/Edit: **ALWAYS use ABSOLUTE paths under WORKTREE_ROOT.** Do NOT use relative paths like `compiler/src/commands/migrate.js` — the harness resolves relative paths against an `Additional working directories` list that may include the main repo, causing silent writes to main's working tree.
- NEVER use absolute paths starting with the main repo root directly.
- If an intake doc / hand-off doc references a path like `/home/bryan-maclee/scrmlMaster/scrmlTS/foo/bar.ts`, translate it to `$WORKTREE_ROOT/foo/bar.ts` before writing.

If you find yourself about to write to a path starting with the main repo root, STOP. Re-derive the path from WORKTREE_ROOT.

### 2.3 Commit discipline (two-sided rule — S83 standing protocol)

- **After EVERY edit:** `git diff <file>` to verify; `git add <file>`; commit IMMEDIATELY. Don't batch — commit per sub-bucket / per fix.
- **Before reporting "DONE":** `git status` MUST be clean (no uncommitted changes). If `git status` shows modified-but-uncommitted files, COMMIT them before reporting. "HEAD unchanged — work in worktree, no commits" is NOT an acceptable terminal report shape.
- Update `docs/changes/v0.3-wave-2/progress.md` (PA will create the file at dispatch time, or you create it) after each step with: timestamp, what was just done, what's next, any blockers. Append-only.

---

## 3. Item (a) — `bun scrml migrate --program-shape` extension

### 3.1 Target file

`compiler/src/commands/migrate.js` (608 LOC at HEAD).

### 3.2 What exists today

- Working text-substitution framework with safety harness (parse-rewritten-source check via `compileScrml({ write: false })`).
- Two migrations shipped (P4): (1) Whitespace-after-`<` for W-WHITESPACE-001 known-keyword openers; (2) `<machine>` → `<engine>` for W-DEPRECATED-001.
- `KNOWN_KEYWORDS` set already includes `program`, `page`, `channel`, `db`, `schema`, etc. (so `< page>` whitespace migration is already in place — leave alone).
- CLI options: `--dry-run`, `--check`, `--include=<glob>`, `--exclude=<glob>`, `--no-default-excludes`.
- Default excludes: `samples/compilation-tests/` and `compiler/tests/` (those exercise deprecation paths intentionally).

### 3.3 What this dispatch adds

A new `--program-shape` flag that opts in to the v0.3 program-shape migration rule set. When `--program-shape` is set, perform the following operations on each in-scope file:

#### 3.3.1 File classification (read-only pre-pass)

Classify each file into exactly one bucket using the heuristics from page-helper-design.md Phase 2.1:

| Bucket | Heuristic |
|---|---|
| **Entry file** | Contains a `<program ...>` opener at file top; NOT located under a `pages/**` or `routes/**` parent directory in its path. Or: only `.scrml` file in its directory tree carrying `<program>`. |
| **Route file** | File path matches `**/pages/**/*.scrml` OR `**/routes/**/*.scrml` (and not `_layout.scrml`). May or may not currently have `<program>`. |
| **Module file** | No `<program>` opener at file top; NOT under `pages/**` or `routes/**`. Or: export-only constructs (no markup, no top-level structural elements). |
| **Schema-anchor file** | Contains a `<schema>` block (regex `<schema[\s>]`); has `<program db=>` (regex). Treat as a SPECIAL case per §39.12.0 v0.3 workaround — leave `<program db=>` wrapper in place, emit `--report` advisory only, NO rewrite. |
| **Ambiguous** | Has `<program>` but classification heuristic returns multi-bucket. Surface to the `--report` and SKIP rewrite (require user override). |

The classification logic SHALL be a separate helper function (e.g. `classifyFile(absPath, sourceText, projectRoot)` returning `{bucket, evidence: [reasons]}`). Unit-test this helper independently.

#### 3.3.2 Rewrite operations (per bucket)

**Entry file** — preserve `<program ...>` opener and its attributes; if the entry file has any `${...}` block at the file top OUTSIDE `<program>`, surface as `--report` warning (the file is not v0.3-shape and the migrate command does not auto-move file-top `${...}` into `<program>`; require user-side cleanup). If `${...}` is INSIDE the `<program>` body and contains only top-level declarations (V5-strict state decls, `function`, `fn`, `type`, `const <derived>`, etc.), UNWRAP the `${...}` so the declarations become direct text children of `<program>`. Detect "${" + match closing "}" — be conservative; if the `${...}` body contains anything other than recognized top-level declarations, leave wrapped + emit advisory.

**Route file** — locate the file-top opener:
- If opener is `<program ...>` carrying ONLY per-route attrs `{db, auth, csrf, ratelimit}` (and no app-wide attrs like `title=`, `cors=`, `log=`, `headers=`, etc.): REWRITE `<program` → `<page` at the opener AND the closing `</program>` → `</page>` (or `</>` close-elision is preserved as-is). Preserve all attributes verbatim.
- If opener carries MIXED attrs (per-route + app-wide): surface to `--report` and SKIP rewrite. The author must manually split — app-wide attrs move to entry file's `<program>`; per-route attrs stay on the new `<page>`. The migrate command CANNOT auto-determine which page-file's app-wide attrs were the source of truth in a multi-page-app migration.
- If opener is `<page ...>` already: leave alone (already v0.3-shape).
- If opener is something else (e.g. `<channel>`, `<engine>`, `<schema>`): NOT a route file by content — re-evaluate the heuristic. The file may actually be a module that's misplaced under `pages/**`. Surface advisory; do NOT rewrite.

**Module file** — leave alone. If the file currently has a `<program ...>` wrapper but is classified as module (e.g. it's under `models/` or `components/`), surface to `--report` with the v0.3-shape recommendation to strip the wrapper. The migrate command MAY offer a `--strip-module-program` opt-in flag (not required for Wave 2 — defer to Wave 3 sweep if needed).

**Schema-anchor file** — leave alone with advisory (per §39.12.0).

**Ambiguous** — leave alone; require user `--force` or manual edit.

#### 3.3.3 `--dry-run --report` mode (REQUIRED — per implementation-plan Phase 3.2)

When `--dry-run --report` flags are combined, emit a structured report listing every in-scope file with:
- Absolute path.
- Detected bucket + evidence list.
- Proposed action (REWRITE / SKIP / ADVISORY).
- Per-rewrite: a brief one-liner describing the proposed change (e.g. "rewrite `<program db=… auth=…>` → `<page db=… auth=…>`").

The report is `--report`'s primary output. `--dry-run` alone (without `--report`) keeps the existing unified-diff behavior.

#### 3.3.4 Safety harness — reuse existing

The existing rewritten-source parse check (`compileScrml({ write: false })`) applies as-is. If a rewrite produces source that fails to compile, the file is left untouched and the failure is reported. **Do not weaken this gate.**

### 3.4 Acceptance criteria — item (a)

1. New `--program-shape` flag accepted by the CLI argument parser; `--help` text updated.
2. `classifyFile` helper extracted + unit-tested in isolation. At least these test cases: entry file with `<program>` only; route file under `pages/` with per-route attrs only; route file under `pages/` with mixed attrs; module file under `components/` with no wrapper; schema-anchor file with `<schema>` + `<program db=>`.
3. `--dry-run --report` mode produces structured advisory output. Snapshot-test against a fixture corpus (small bespoke `.scrml` files placed under a new `compiler/tests/commands/migrate-program-shape-fixtures/` directory). Five fixtures minimum: one per bucket above.
4. `--program-shape` (non-dry-run) rewrites in place; the safety harness gate fires on any rewrite that breaks parse.
5. Idempotency: running `--program-shape` twice on a file produces the same source after the first pass (second pass is a no-op).
6. Zero regressions on existing migrations (W-WHITESPACE-001 + W-DEPRECATED-001 unchanged).
7. `bun run test` passes with 0 fail. Test-count delta should reflect new tests added (+12-20 expected).

### 3.5 Walltime band

Item (a): **~45-75h serial** (per page-helper-design.md Phase 3.6 R2+`<page>` band; 45-65h pre-`<page>` + 5-10h for `<page>` rewrite path).

### 3.6 Out of scope for item (a)

- Schema/seeds `<schema db=>` direct-attribute promotion (Phase 3.2 Option B — v0.4).
- Self-host migration (`compiler/self-host/*.scrml` 11 stage files — page-helper Phase 2.4 stays on legacy `<program>` per stage; the dispatch does NOT migrate these).
- Per-route attribute consolidation from multi-page apps' `<program>` → entry file's `<program>` (no auto-resolution; surface as advisory).
- Cross-file caller-context attribute propagation (out of scope; existing v0.2.5+ behavior).
- Fixture migration sweep (Wave 3 — runs the migrate command against `examples/`, `samples/`, etc.).

---

## 4. Item (b) — TAB extension for v0.3 program-shape + `<page>` registration

### 4.1 Target file

`compiler/src/ast-builder.js` (10,468 LOC at HEAD).

### 4.2 What exists today

- Line 338: `TOPLEVEL_STATE_DECL_RE = /^\s*(?:const\s+)?<\s*[A-Za-z_][A-Za-z0-9_]*[^>]*>\s*[=:]/` — matches V5-strict state-decl shapes at file top.
- Line 658: `liftBareDeclarations(blocks, errors, filePath, parentType, _p3aSynthCounter)` — recursive walker that lifts bare top-level declarations into synthetic `${...}` logic blocks.
- Line 690-692: `isProgramRoot = parentType !== "markup" && block.name === "program"`; `isChannelRoot = parentType !== "markup" && block.name === "channel"`; direct text children of `<program>` and `<channel>` are treated as `"state"` parent context.
- `BARE_EXPORT_AT_END_RE` (line 349) — text block ending in bare `export` paired with following PascalCase markup block per §21.2.

### 4.3 What this dispatch adds

The TAB extension performs four orthogonal changes:

#### 4.3.1 Recognize `<page>` as a structural-element opener (S85 Wave 1 SPEC §4.15)

Treat `<page>` symmetrically to `<program>` for direct-text-child handling. Specifically:

- In `liftBareDeclarations` line 690-692, add `const isPageRoot = parentType !== "markup" && block.name === "page";` and OR-include it in the `childContext` decision. Direct text children of `<page>` parse in `"state"` parent context (same as `<program>`).
- This delivers default-logic body inside `<page>` per §40.8 normative statement "Inside `<program>`, the body parses in default-logic mode" (which by §4.15 cross-ref applies symmetrically to `<page>` per its role as per-route attribute container with logic body).

**Rationale:** the page-helper-design dive Phase 1.4 worked example shows `<page>` body containing bare `const user = getCurrentUser()` and `<selectedLoadId> = not` declarations — same shape as `<program>` body. The TAB extension recognizes the symmetry; the regex catalog (next sub-step) is shared.

#### 4.3.2 Extend top-level declaration regex catalog

Today, only V5-strict state-decl shapes are auto-lifted (per `TOPLEVEL_STATE_DECL_RE`). v0.3 expands this to recognize the full top-level declaration set inside `<program>` AND `<page>` bodies. The new regex family must match:

| Shape | Regex anchor pattern |
|---|---|
| V5-strict state decl `<x> = …` | EXISTING `TOPLEVEL_STATE_DECL_RE` (no change) |
| Typed state decl `<x>: Type = …` | EXISTING (the `[=:]` in the regex captures `:`) |
| Derived `const <x> = …` | EXISTING (the `(?:const\s+)?` prefix captures it) |
| `function name(...) { ... }` | NEW — `^\s*(?:export\s+)?function\s+[A-Za-z_][A-Za-z0-9_]*\s*[(*]` |
| `fn name(...) ...` | NEW — `^\s*(?:export\s+)?fn\s+[A-Za-z_][A-Za-z0-9_]*\s*[(*]` |
| `server function name(...) { ... }` | NEW — `^\s*(?:export\s+)?server\s+function\s+[A-Za-z_][A-Za-z0-9_]*\s*\(` |
| `type Name:enum = { ... }` / `type Name = { ... }` | NEW — `^\s*(?:export\s+)?type\s+[A-Za-z_][A-Za-z0-9_]*\s*(?::\w+)?\s*=` |
| `let x = …` / `const x = …` (plain locals) | NEW — `^\s*(?:export\s+)?(?:let|const)\s+[A-Za-z_][A-Za-z0-9_]*\s*[=:]` (NB: NOT matching `const <x>` — that's the derived shape above) |

Pull these into a new constant `TOPLEVEL_DECL_RE_FAMILY` (or extend `TOPLEVEL_STATE_DECL_RE` into a UNION) with each rule tagged for diagnostics. The lift wraps each matched text segment into a synthetic `${...}` block — same path as today's V5-strict-decl lift.

**Edge:** when a single text block contains MULTIPLE top-level declarations separated by blank lines, the lift must split correctly. The existing `liftBareDeclarations` walker iterates text-as-decl one at a time. Verify the existing splitter handles multi-decl text blocks; if it doesn't, extend.

**Edge:** the text block may interleave a top-level decl with markup-as-expression. The lift must not promote markup-text-content; it only promotes text whose anchor matches one of the regex shapes. The existing safety on `parentType === "markup"` (line 680) prevents this; reaffirm in tests.

#### 4.3.3 `W-PROGRAM-REDUNDANT-LOGIC` emission

When a `<program>` (or `<page>`) body contains an explicit `${...}` logic block at top level whose content is RECOGNIZED as top-level declarations only (all declarations match the new regex family), emit `W-PROGRAM-REDUNDANT-LOGIC` (warning per §34 row). Diagnostic message per spec: "A `<program>` body wraps top-level declarations in a redundant `${...}` logic block. Under v0.3, `<program>` body parses in default-logic mode — bare top-level declarations auto-lift to the logic context without explicit `${...}` wrapping. Remove the redundant `${...}` for cleaner source."

The warning fires from the TAB stage at the synthetic-wrap detection site. Source-position is the start of the `${...}` block.

**Deprecation cycle (per §40.8 + Q5):** v0.3 = warning; v0.4 = escalation to error (`E-PROGRAM-REDUNDANT-LOGIC`). DO NOT add the error variant in v0.3; only the warning.

**Edge:** if the `${...}` body mixes top-level declarations WITH non-declaration logic (e.g. a `for` loop), DO NOT emit the warning — the block is doing real work, not redundant wrapping.

#### 4.3.4 `<page>` per-route attribute validation

A `<page>` opener carrying any attribute outside the allowed set `{db, auth, csrf, ratelimit}` SHALL fire `E-PAGE-INVALID-ATTR` at the offending attribute's source position. Specifically:

- App-wide attrs (`title=`, `description=`, `version=`, `author=`, `license=`, `cors=`, `cors-max-age=`, `log=`, `headers=`, `idempotency-store=`, `idempotency-ttl=`, `channel-reconnect=`): fire E-PAGE-INVALID-ATTR with diagnostic guidance toward `<program>` (app-wide host).
- Nested-program attrs (`name=`, `lang=`, `mode=`, `build=`, `port=`, `health=`, `protect=`, `callchar=`, `restart=`, `max-restarts=`, `within=`, `autostart=`): fire E-PAGE-INVALID-ATTR with diagnostic guidance toward `<program>` nested form (§43).
- `route=` specifically: fire `E-PAGE-ROUTE-ATTR-FORBIDDEN` (separate code; takes precedence over E-PAGE-INVALID-ATTR for this one attribute). Diagnostic: "`<page>` does not accept a `route=` attribute; the route URL is inferred from the source filepath (`path/to/file.scrml` → `/path/to/file`). To rename the route, rename the file. See SPEC §40.8 and §47.9.2."

The validation walker fires per-attribute. Multi-violation files produce multi-error output (don't bail on first).

### 4.4 Acceptance criteria — item (b)

1. `<page>` direct text children parse with `state` parent context (declarations auto-lift).
2. The 7 new declaration shapes (function / fn / server-function / type-enum / type-struct / let / const) auto-lift inside both `<program>` and `<page>` bodies. Each shape has at least one positive integration test demonstrating successful compile + correct AST (the synthetic `${...}` wrapper visible as `synthetic-lift: true` markers).
3. `W-PROGRAM-REDUNDANT-LOGIC` fires on a `<program>` body wrapping declarations in a redundant `${...}`. At least one positive test fires the warning; at least one negative test (mixed content `${...}` block) confirms the warning does NOT fire.
4. `E-PAGE-INVALID-ATTR` fires on each of the disallowed attrs (cover one app-wide + one nested-program-only in tests). `E-PAGE-ROUTE-ATTR-FORBIDDEN` fires on `<page route="...">`. Cover the multi-violation file shape (emits 2+ errors per file).
5. Zero regressions on existing TAB behavior. The v0.2 V5-strict state-decl lift (`<x> = init` shape) continues to work identically. Test count delta should reflect new tests added (+15-25 expected).
6. Multi-decl text blocks split correctly (one positive test with 3 separate declarations in one block).
7. Markup-text-content suppression intact (one negative test: `<p>function name() { ... }</p>` does NOT lift).
8. `bun run test` passes with 0 fail.

### 4.5 Walltime band

Item (b): **~33-55h serial** (per page-helper-design.md Phase 3.6).

### 4.6 Out of scope for item (b)

- `<program spa>` boolean OQ (DEFERRED per §40.8.1; do NOT implement either side).
- A8 codegen change (`exporter-only server-route + consumer client-stub` per §38.4.1 — separate later wave).
- W-PROGRAM-REDUNDANT-LOGIC escalation to E-* (v0.4 work).
- Fixture migration (Wave 3).
- Engine / match / channel placement walkers (already inverted at S85 Wave 1; do NOT touch).

---

## 5. Sequencing + dispatch shape

### 5.1 Two parallel sub-dispatches

Both items are file-disjoint (item a touches `compiler/src/commands/migrate.js`; item b touches `compiler/src/ast-builder.js`). Each fires as a SEPARATE `scrml-dev-pipeline` background dispatch with its own worktree.

**Dispatch order:** fire BOTH simultaneously after user authorizes. They proceed in parallel.

**Coordination:** there is no shared file surface. No primer / docs / changelog edits in either dispatch — those are PA-side wrap operations after Wave 2 lands.

### 5.2 Final-report shape (both dispatches use this template)

```
WORKTREE_PATH: <absolute path>
FINAL_SHA: <git rev-parse HEAD>
FILES_TOUCHED: [list]
TESTS_BEFORE: <pass/skip/todo/fail/files>
TESTS_AFTER: <pass/skip/todo/fail/files>
DELTA: <pass/skip/todo/fail>
DEFERRED_ITEMS: [any in-scope items left undone with reason]
SCOPE_DRIFT: [if you added anything beyond the brief, name it + why]
SPEC_CITATIONS_USED: [list of SPEC.md sections you read + verified against]
MAPS_CONSULTED: [list] / load-bearing finding: <one sentence> | "not load-bearing"
SURPRISES_SURFACED: [anything that contradicts the dive docs or brief]
COMMIT_LIST: [SHAs + one-line per commit]
```

### 5.3 PA landing protocol (per pa.md S67 file-delta standing rule)

PA reviews each dispatch's diff via `git diff main..<agent-branch> -- <FILES_TOUCHED>`, filters out agent-side-stale-views (files modified by the OTHER dispatch in the meantime — non-issue here because file-disjoint), pulls file content into main via `git checkout <agent-branch> -- <files>`, runs `git diff --cached`, then commits with descriptive message + agent-branch reference. Two PA-authored commits land (one per dispatch).

Worktrees retained for the rest of S86 only; removed at S86 wrap per pa.md S83 retention rule.

---

## 6. Risk surface

| Risk class | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Regex over-match on top-level decl family (false-positive lift) | MEDIUM | TAB lifts non-declaration text as declaration | Tight anchor patterns + comprehensive markup-text negative tests |
| Multi-decl text block splitter mishandles edge cases | MEDIUM | Some declarations don't lift | Targeted unit tests on multi-decl shapes |
| Migrate command `--report` advisory false-classifies entry vs module | MEDIUM | User runs `--program-shape` and rewrites incorrectly | `--dry-run --report` mandated as the recommended first step; ambiguous files default to SKIP |
| `W-PROGRAM-REDUNDANT-LOGIC` fires on legitimate mixed-content `${...}` block | LOW | Adopter confusion | Negative test on mixed-content; the warning only fires when ALL `${...}` body content matches the decl-regex family |
| `<page>` per-route attr validation list goes stale vs SPEC | LOW | Spec drift | Hardcode list from SPEC §40.8 + §4.15; reference SPEC section in source comments |
| Migrate command's safety harness misses subtle AST-shape breakage | LOW | Rewrites land that subtly break downstream stages | The existing compileScrml-roundtrip is the gate; if it passes, AST shape is preserved |
| Pre-commit hook absent in worktree → no test gating on commits | MEDIUM | Bad commits accumulate | §2.1 step 6 enables hook; verify per worktree per pa.md addendum |

---

## 7. Compile checks BEFORE reporting DONE

1. `bun run test` — full suite, 0 fail.
2. `git status` — clean.
3. `git log --oneline main..HEAD` — at least one commit per logical sub-bucket; final commit summarizes the dispatch.
4. For item (a): `bun run scrml migrate --program-shape --dry-run --report examples/23-trucking-dispatch/` should emit a structured report classifying each file correctly (no crashes; sensible bucket assignments). Visual spot-check the output.
5. For item (b): `bun run scrml compile examples/02-counter.scrml` should succeed (regression check); also try a small synthetic v0.3-shape file demonstrating the new auto-lift behavior.

If any check fails, do NOT report DONE. Investigate + fix + re-verify.

---

## 8. Cross-references

- Wave 1 LANDED commit: `2b7c4df` (v0.3 spec amendments + walker inversion).
- Wave 1 spec sections: `compiler/SPEC.md` §40.8 (~17467), §40.8.1, §4.15, §24.4, §38.1 (~16003), §38.4.1, §39.12.0, §47.9.2 (~18849), §34 (~14667).
- Design dives: `scrml-support/docs/deep-dives/program-as-container-{shape-DIVE-2026-05-11,implementation-plan-2026-05-12}.md` + `page-helper-element-design-2026-05-12.md`.
- pa.md commit-discipline + worktree-isolation: this repo's `pa.md`.
- LLM kickstarter v1: `docs/articles/llm-kickstarter-v1-2026-04-25.md`.
- Anti-patterns: `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`.
- PA-SCRML-PRIMER: `docs/PA-SCRML-PRIMER.md`.

---

## Tags

#v0.3 #wave-2 #migrate-extension #tab-extension #page-helper #program-shape #r2-corrected #parallel-dispatches #file-disjoint #s86 #worktree-isolation #commit-discipline-two-sided
