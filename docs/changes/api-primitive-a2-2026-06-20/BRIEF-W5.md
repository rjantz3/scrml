# A2 W5 — tests + worked example + B-docs + flip §60 banner (dispatch brief, S213 2026-06-22)

> Archived verbatim per pa.md S136. change-id: `api-primitive-a2-2026-06-20`. Agent: `scrml-js-codegen-engineer`, `isolation: "worktree"`, `model: opus`. Base: main `ca712295`.

You are closing **Wave 5 (final wave)** of the A2 external-`<api>` build arc. W1 (SPEC §60 Nominal) + W2 (parser) + W3 (typer) + W4 (codegen + `W-API-RESPONSE-NOT-VARIANT` honesty lint) are all LANDED + PUSHED. The functional surface compiles end-to-end and is R26-verified. W5 = prove it end-to-end + ship the adopter-facing artifacts + flip the SPEC §60 status banner.

# MAPS — REQUIRED FIRST READ

Before consuming any other context (kickstarter / anti-patterns / SPEC sections / source files), read `.claude/maps/primary.map.md` in full (~100 lines). The §"Task-Shape Routing" section tells you which additional maps to consult — your task shape is **new-feature test-authoring + worked-example scrml-writing + docs + a SPEC banner edit**, so route accordingly (codegen + api + test maps).

Map currency: maps reflect HEAD `8ddc8448` as of 2026-06-21. If your work touches files modified after that point, treat map content as a starting hypothesis to verify via grep/Read against current source — not ground truth.

Feedback: in your final report include either "Maps consulted: [list]; load-bearing finding: <one sentence>" or "Maps consulted but not load-bearing — [which map you expected to help but didn't]".

# REQUIRED READS BEFORE WRITING ANY SCRML

- `docs/articles/llm-kickstarter-v2-2026-05-04.md` IN FULL — canonical scrml shape, stdlib catalog, anti-pattern table. MANDATORY before generating any scrml code.
- `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` — reread before each scrml file you write. LLMs reflexively reach for React/Vue/JSX under load; this counteracts it.
- `compiler/SPEC.md` §60 IN FULL (the `<api>` Nominal section — line ~32913-33032), §60.4 (`<request api=>` mode), §60.5 (parseVariant response + variant-vs-non-variant W4 amendment), §60.6 (client-only §12.2 + the SSR-of-external-data structural gap), §41.13 (parseVariant), §6.7.7 (`<request>` state model). Per pa.md Rule 4 the SPEC is normative — verify every claim in this brief against the SPEC text before encoding it.
- The W2/W3/W4 BRIEFs + `progress.md` in this change dir (`docs/changes/api-primitive-a2-2026-06-20/`) for what's already wired (the `block.name==="api"` parser dispatch in `ast-builder.js`; the `checkApiDeclarations` typer in `type-system.ts`; the codegen in `emit-reactive-wiring.ts` + `emit-parse-variant.ts`; the `<request api=>` reactive surface).

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

Your worktree path is whatever `pwd` reports at startup — save it as WORKTREE_ROOT.

## Startup verification (BEFORE any other tool call)
1. `pwd` via Bash. Output MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`. If it is under any OTHER repo (e.g. `scrml-support/.claude/worktrees/` or `scrml-deputy-maint`), STOP and report — that is the S90 CWD-routing failure. Save the output as WORKTREE_ROOT.
2. `git -C "$WORKTREE_ROOT" rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. `git -C "$WORKTREE_ROOT" status --short` — confirm clean (or expected pre-snapshot).
4. `bun install --cwd "$WORKTREE_ROOT"` — worktrees do NOT inherit node_modules; the pre-commit `bun test` fails with "cannot find package 'acorn'" otherwise.
5. `bun run --cwd "$WORKTREE_ROOT" pretest` — populates `samples/compilation-tests/dist/` (gitignored; fresh worktrees have it empty → ~130 ECONNREFUSED browser-test failures without it). Use `bun run test` (chains pretest) NOT bare `bun test` for full-suite baseline.
If ANY check fails: DO NOT proceed. Report and exit.

## Path discipline (S99/S126 — there have been 15+ path-discipline leaks across the project; this would be the next incident)
- Apply ALL file edits via **Bash** (`perl`/`python3`/`cp`/heredoc) on **worktree-absolute paths** that include the `.claude/worktrees/agent-<id>/` segment — NOT the Edit/Write tools (they have leaked to MAIN). Echo the target path before each write; re-verify via `git -C "$WORKTREE_ROOT" diff` / `grep` after.
- NEVER `cd` into the main repo (or anywhere) — use `--cwd "$WORKTREE_ROOT"` (bun), `git -C "$WORKTREE_ROOT"`, and worktree-absolute paths exclusively. A `cd` into main leaks `bun add` / compile / run commands to MAIN (S126 incidents #14/#15).
- If any read shows a path like `/home/bryan-maclee/scrmlMaster/scrml/compiler/...` (no `worktrees/agent-` segment), translate to `$WORKTREE_ROOT/compiler/...` before writing.
- `perl -e`: NO apostrophes in replacement text (single-quote terminates the string); use `{}` delimiters / heredoc fallback.

## Commit discipline (S83 — two-sided rule)
- After EVERY edit: `git -C "$WORKTREE_ROOT" diff <file>` to verify → `git -C "$WORKTREE_ROOT" add <file>` → commit IMMEDIATELY. Do NOT batch — commit per sub-bucket (tests / example / B-docs / SPEC banner).
- Your FIRST commit message MUST include the verbatim `pwd` output: e.g. `WIP(a2-w5): start at $(pwd)`.
- Before reporting DONE: `git -C "$WORKTREE_ROOT" status` MUST be clean. "work in worktree, no commits" is NOT an acceptable terminal report.
- NEVER `--no-verify`.

# THE WORK — W5 scope (four sub-buckets)

### 1. Tests (unit + integration + conformance) for the `<api>` / `<request api=>` codegen surface
- Unit/integration tests that compile a `<api base=...>` + endpoints + `<request api="name" args=...>` flow and assert the emitted JS: the thin typed `fetch(base+path)` callable per endpoint; method + path-param substitution (`/users/${id}`); the response decode reuses `parseVariant` for a variant `ResponseT`; raw-pass + `W-API-RESPONSE-NOT-VARIANT` (Info) for a non-variant `ResponseT`; client-only (NO `.server.js` emitted — raw fetch is not a §12.2 server trigger, §60.6); `node --check` clean on the emitted JS.
- A conformance/integration case covering the §60.9 error codes already wired: `E-API-ENDPOINT-MALFORMED`, `E-API-BASE-MISSING`/`-METHOD-INVALID`/`-RESPONSE-TYPE-UNDECLARED` (W2 parse codes), `E-API-ENDPOINT-UNKNOWN`/`-REQ-SHAPE-MISMATCH`/`-PATH-PARAM-UNBOUND` (W3 typer codes). Verify each fires on its malformed shape and partitions to the correct stream (E-* → `result.errors`; W-API-RESPONSE-NOT-VARIANT Info → `result.warnings` — use a CROSS-STREAM helper `[...r.errors, ...r.warnings]` for any W-/I- assertion, NEVER `result.errors.filter(...)` on an Info code, per the diagnostic-stream partition).
- Follow the existing api-decl test patterns (W2/W3/W4 left tests — find them: `grep -rln "api-decl\|checkApiDeclarations\|W-API-RESPONSE\|E-API-" compiler/tests/`). Match their structure/idiom.

### 2. Worked example — `examples/32-external-api.scrml`
- A small, REALISTIC BYOB SPA: a `<api base="https://api.example.com">` with 2-3 endpoints (at least one GET with a path param `/x/${id}`, ideally one POST with a request struct), a **variant (`:enum`) `ResponseT`** on the primary endpoint so the `parseVariant` boundary-parse engages (model the §60.5 happy path), and a `<request api=...>` flow rendering `.loading` / `.data` / `.error` via the §6.7.7 state model (canonical scrml: `<match>`/`<engine>` over the RemoteData-shaped phase, NOT manual `if (errors.length)`). Client-only — no `<db>`/`<schema>`. It compiles GREEN (exit 0) + `node --check` clean.
- Add a row to `examples/README.md` matching the existing format. Do NOT touch `examples/VERIFIED.md` — that is PA/user-owned (only the user marks human-verified).
- The example is a within-node parity fixture → see the within-node mandate below.

### 3. B-docs — the "frontend-only / BYOB" adopter guide
- Write `docs/adopter/byob-external-api.md` (sibling of `docs/adopter/mcp-setup.md`). This guide ships WITH A2 — it was half the ratified verdict (the "B = docs philosophy" leg). It SHALL: (a) document the BYOB path (`<api>` + `<request api=>` + variant `ResponseT` → `parseVariant`); (b) state PLAINLY that the adopter owns keeping the declared `<api>` types in sync with the foreign backend — there is NO `bun scrml migrate` lever for `<api>` (the owned-`<db>` vs unowned-`<api>` asymmetry, §60.3); (c) frame it as untyped-silent-drift vs typed-compile-loud-drift (§60.1); (d) recommend full-stack scrml (owned `<db>`/server) WHERE APPLICABLE — `<api>` is for the case you're keeping an existing foreign backend; (e) state PLAINLY the **SSR-of-external-data structural gap** (§60.6 — a raw client `fetch` is not SSR'd; closing it needs a scrml BFF, which re-introduces a server; do NOT imply it's closeable in A2). Voice: factual adopter-doc prose, not marketing. Cross-link SPEC §60.

### 4. Flip the SPEC §60 status banner Nominal → Implemented
- Replace the §60 "**Nominal section.** … spec-ahead-of-implementation …" banner (SPEC.md ~line 32918) with an "**Implemented**" banner modeled on §59's ("> **Implemented — phase-c landed at S169 (scrml).** …"): state that the A2 default-pipeline impl is complete (W2 parser + W3 typer + W4 codegen + W5 tests/example), that it compiles end-to-end (R26-verified), and name the follow-ons that remain out of scope (A1 OpenAPI ingest §60.8; SSR-of-external-data §60.6; the future struct/refinement `parse`-family sibling noted in the §60.5 W4 amendment).
- In §60.9, update the "**planned** E-API-* codes … their §34 catalog rows land **with** the implementation" framing: the parse codes (W2), typer codes (W3), and `W-API-RESPONSE-NOT-VARIANT` (W4) are now WIRED + catalogued in §34 — reflect that they are landed, not planned. Leave any genuinely-not-yet-fired code as planned and say so.
- Regenerate SPEC-INDEX if the §60 line range shifts: `bun run --cwd "$WORKTREE_ROOT" scripts/regen-spec-index.ts` (and update the §60 SPEC-INDEX row's Nominal→Implemented framing).
- **Do NOT hand-edit the `docs/known-gaps.md` §0 board count.** There is NO §60 `@gap` nominal token (PA verified — the 8 nominal tokens are nominal-1..6/8/9, none is §60), so the board "Nominal" count is not mechanically tied to §60. Leave known-gaps untouched; the PA reconciles board bookkeeping at landing.

# WITHIN-NODE PARITY + FULL SUITE (S198 — MANDATORY, do NOT skip)
- `examples/32-external-api.scrml` is a within-node parity fixture. Run the FULL suite — `bun run --cwd "$WORKTREE_ROOT" test` (NOT just the pre-commit subset — the within-node parity canary + browser/lsp live ONLY in the full suite) — before reporting DONE.
- If the within-node parity test prints `[within-node] OVER-BUDGET examples/32-external-api.scrml: {CLASS:{raw,allow,residual}}`, re-baseline the `M6.5.b.0` allowlist entry IN THE SAME LANDING: set that fixture's per-class values to the printed `raw`, in-place, preserving key order (NOT a whole-file json re-dump). This is the new-fixture case, not a regression.

# R26 EMPIRICAL VERIFICATION (S138 — before reporting DONE)
- Compile `examples/32-external-api.scrml` with the worktree compiler and verify the emitted JS empirically: the per-endpoint `fetch(base+path)` callable is present with method + arg substitution; the variant-response path emits the `parseVariant` decode into `.data`; NO `.server.js` is emitted (client-only); `node --check` exit 0. Paste the grep/shape evidence in your report. DO NOT mark DONE without R26 passing.

# REPORT BACK
WORKTREE_PATH · FINAL_SHA · FILES_TOUCHED (worktree-absolute) · per-sub-bucket commit list · within-node result (clean / rebaselined-which-fixtures) · full-suite pass/skip/fail · R26 evidence · Maps feedback line · any deferred/surprise. The PA lands via S67 file-delta — note that SPEC.md will need a 3-way apply (main has a parallel §34 edit landing in the same session, disjoint region).
