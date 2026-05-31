# BRIEF — source-map-real-provenance-js-2026-05-31 (archived verbatim per S136)

**Dispatched:** S149, 2026-05-31 · **Agent:** scrml-js-codegen-engineer · **isolation:** worktree · **background:** true · **model:** opus
**Base HEAD at dispatch:** `25e89cbb` (main)

---

# TASK: Fix the lying source-map stub → real JS Source Map v3 provenance + `names` field (Phase 1, fork-independent)

Change-id: `source-map-real-provenance-js-2026-05-31`

## CONTEXT — why this exists
scrml's compiler ships a **degenerate, misleading** Source Map v3 generator. When `options.sourceMap` is true, `compiler/src/codegen/index.ts` (~lines 929-953) calls `addMapping(i, 0, 0)` for every output line of BOTH client and server bundles — so the entire compiled file maps to source line 0, column 0. The `.client.js.map` / `.server.js.map` files are structurally-valid Source Map v3 that load in devtools but point every byte at the top of the `.scrml` file. This is not low-resolution provenance — it is a map that LIES, in a format browsers trust. A developer whose runtime error resolves to `app.scrml:0:0` is sent to the wrong place with confidence. SPEC §47 prose (SPEC.md ~line 21421) already PROMISES this debugging path: "Source maps (PIPELINE.md §Stage 8) are the specified debugging path back to `.scrml` source." So this is fulfilling an existing spec promise, not adding a new feature.

This was ratified by a 3-expert debate (in-browser-compilation / source-map-provenance / simplicity-defender) — all three independently agreed: (a) fixing the stub is the non-negotiable, fork-independent first move; (b) the format is **Source Map v3 + the `names` field for JS** (standard where a standard exists). CSS source maps + HTML `data-scrml-span` correlation are LATER phases — OUT OF SCOPE here. This is Phase 1 = JS only (client + server).

## GROUNDED FACTS (PA-verified — trust these, but verify against current source)
- **The infrastructure mostly EXISTS.** `compiler/src/codegen/source-map.ts` (269 lines) already has `SourceMapBuilder` with `addMapping(generatedLine, generatedColumn, sourceLine, sourceColumn, name?)` — the signature ALREADY accepts columns AND a `name`. **VERIFY** whether the VLQ encoder + `toInlineComment()`/serialization actually EMIT the column + name fields, or whether they currently drop them (the file header comment historically said "line-level only; column deferred — requires per-node span tracking in emitters"). If the encoder is line-only, completing it to emit generatedColumn/sourceColumn + the `names` array is part of this task.
- **The raw material already flows.** Tokens carry `span` (`compiler/src/tokenizer.ts` — `Token.span = {start, end, line?, col?}`). Every AST node carries `span: Span` with byte offsets `[start,end)` into the preprocessed source (`compiler/PIPELINE.md` ~lines 285-436: MarkupElement/StateBlock/LogicBlock/SQLBlock all carry `span`). PIPELINE ~line 285: "All line/column positions referenced in spans map to this `source` string." So the missing work is NOT "track spans" — it is "thread the already-present span into the emitter at the point each output fragment is produced, and record (sourceSpan → outputSpan)."
- **Scope is 16 emit files, NOT 40** (the deep-dive over-estimated): `compiler/src/codegen/emit-*.ts` = attributes, channels, client, component, each, engine, engine-helpers, form-for, form, logic, machines, markup, reactive-wiring, sql, server, validators. Plus the codegen `context` and `index.ts` orchestration.
- **The §47 encoded-name problem.** Emitted JS uses IR names like `_scrml_t_count` (§47.1.2 kind-marker encoding; `t` = state cell). The Source Map v3 `names` field exists precisely to map a renamed identifier back to the author name (`count`). Wire `names` so the map recovers author identifiers from §47-encoded names where the source span corresponds to a named declaration. The §47 encoding is deterministic + invertible (`reflect()` recovers the dotted form) — confirm the inversion path.

## WHAT TO BUILD (Phase 1 — JS only)
1. **Kill the `addMapping(i, 0, 0)` loop** in `index.ts` (client + server). Replace with real per-fragment mappings.
2. **Thread source spans to the emit point.** The architecturally-correct approach (recommended by the provenance expert, your call to adopt or adapt): route output appends through a single choke point on the codegen `context` (e.g. `context.emit(node, str)` / an output-builder that records `{sourceSpan: node.span, generatedStart, generatedEnd}` as it appends), so "forgot to record a span" becomes structurally hard rather than reviewer-caught. If a full choke-point refactor across all 16 emitters is too large to land safely in one pass, you MAY phase it (JS client core first, then server, then the remaining emitters) — but if you phase, say so explicitly in progress.md and leave NO emitter silently on the 0:0 fallback without it being recorded as a known-remaining gap.
3. **Complete the encoder** (if needed) so generated column + source column + the `names` array are actually emitted in valid Source Map v3.
4. **Wire the `names` field** so §47-encoded identifiers map back to author names.
5. **Coverage discipline (the canary — REQUIRED).** Add a test-suite assertion that catches the failure mode of a silently-unmapped region: no source-DERIVED output fragment falls back to the degenerate (0,0) mapping. Compiler-SYNTHESIZED output (runtime-helper preamble, wiring boilerplate with no source origin) is allowed to carry a file-level/sentinel mapping, but it must be CATEGORIZED as synthetic — not silently 0:0. The point: a forgotten append-path that produces a source-derived fragment mapped to 0:0 must FAIL a test, because in the UI it renders as an un-highlightable "dead" region ("9 of 14 lines light up, 5 don't" reads as a broken compiler). Decode a compiled fixture's emitted map and assert every source-derived generated position resolves to a real, non-(0,0)-unless-genuine span.

## OUT OF SCOPE (do NOT do these here)
- CSS source maps (Phase 2). HTML `data-scrml-span` correlation (Phase 2). Engine "what-comes-next" data exposure (separate later dispatch). The in-browser compiler / website itself. Any SPEC §34 error code. A new SPEC § section — the spec already promises this; at most a PIPELINE.md Stage 8 note. **If you find you need a SPEC normative change, STOP and report it — do not author SPEC text in this dispatch** (per pa.md Rule 4, spec changes are deliberated separately).

## SPEC DISCIPLINE (pa.md Rule 4)
SPEC.md is normative. Before relying on any §47 / source-map claim, read the actual SPEC text (use `compiler/SPEC-INDEX.md` to navigate; §47 prose promise is ~line 21421; §47.5 "Module Identity and Versioning" at ~21653 is a DIFFERENT subsection — don't conflate). This dispatch fulfills an existing spec promise; it should need NO new normative SPEC text. If your read says otherwise, STOP and report.

# MAPS — starting hypothesis only
`.claude/maps/` watermark is `09f74bee` (S147). It is STALE for the S148 codegen landings (emit-engine.ts / emit-client.ts / emit-logic.ts / symbol-table.ts / ast-builder.ts). Since this task reads every emit file directly, treat any map content as a starting hypothesis to verify against current source via grep/Read — do NOT trust maps as ground truth for codegen files. In your final report note "maps not load-bearing (stale codegen)" or any load-bearing finding.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (S99/S126 — there have been 15+ path-discipline leaks across history; do not be the next)

## Startup verification (BEFORE any other tool call)
1. Run `pwd`. Save output as WORKTREE_ROOT. It MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If it is under any OTHER repo (e.g. `scrml-support/.claude/worktrees/`), STOP and report — that is the S90 CWD-routing failure.
2. `git rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. `git status --short` — confirm clean.
4. `bun install` — worktrees don't inherit node_modules; the pre-commit hook's `bun test` fails with "cannot find package 'acorn'" otherwise.
5. `bun run pretest` — populates `samples/compilation-tests/dist/` (gitignored; browser tests need it). Use `bun run test` (chains pretest) for full-suite baseline, NOT bare `bun test`.
If ANY check fails: STOP and report.

## Path + write discipline (S126 interim mitigation — IN FORCE)
- **Apply ALL file edits via Bash** (`perl`/`python3`/`cp`/heredoc) on WORKTREE_ROOT-absolute paths that include the `.claude/worktrees/agent-<id>/` segment — NOT the Edit/Write tools. Echo the target path before each write; re-verify via `git -C "$WORKTREE_ROOT" diff` / `grep` after. (Edit/Write have leaked to MAIN twice recently via a filesystem-divergence class; Bash writes go where `pwd`/`git` resolve.)
- **NEVER `cd` into the main repo** (or anywhere outside WORKTREE_ROOT). Use `git -C "$WORKTREE_ROOT" …`, `bun --cwd "$WORKTREE_ROOT" …`, and worktree-absolute paths exclusively. A `cd` into main leaks installs/compiles/edits.
- Reading from main via absolute path gives WRONG content (main may be ahead). Read under WORKTREE_ROOT only.

# COMMIT DISCIPLINE (S83 + S99 — both sides necessary)
- Commit after EVERY meaningful change — don't batch. `git -C "$WORKTREE_ROOT" add <file> && git -C "$WORKTREE_ROOT" commit`. WIP commits expected.
- Your FIRST commit message MUST include the verbatim `pwd` output, e.g. `WIP(source-map): start at <pwd>`.
- Update `docs/changes/source-map-real-provenance-js-2026-05-31/progress.md` after each step (append-only: what was done / what's next / blockers). If you crash, your commits + progress.md are how the next agent resumes.
- Before reporting DONE: `git -C "$WORKTREE_ROOT" status` MUST be clean (everything committed). "Work in worktree, no commits" is NOT an acceptable terminal report.

# PHASE 3 — R26 EMPIRICAL VERIFICATION (S138 doctrine — MANDATORY; this is a HIGH codegen change)
Regression tests that synthesize AST + run codegen are necessary but NOT sufficient. Before reporting DONE you MUST empirically verify on real adopter source:
- Compile 2-3 real `.scrml` sources WITH source maps enabled, against your post-fix baseline. Good candidates: an `examples/` app (e.g. an engine-bearing one) and/or `samples/compilation-tests/` fixtures. Use the worktree's compiler: `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile <src> --source-map --output-dir /tmp/sm-verify/<name>` (confirm the exact CLI flag for source maps — grep `sourceMap` in `compiler/src/api.js` / the CLI; the option exists, default false).
- For each: DECODE the emitted `.js.map` and assert (a) it is NOT all-0:0 anymore; (b) a known source construct (e.g. a `@count` write, an engine state-child) resolves to a plausible NON-zero source line/col; (c) the `names` field recovers at least one author identifier from a §47-encoded name; (d) `node --check` the emitted `.js` is still clean (exit 0 — provenance must not corrupt output).
- Report the empirical table in your final report. DO NOT mark DONE without R26 passing.

# BASELINE / GATES
- Establish the full-suite baseline at startup (`bun run test`) BEFORE changes; record counts. Carried baseline ≈ 22,376 pass / 0 fail / 220 skip + within-node 1005/0 — confirm on your worktree.
- 0-regression invariant: the full suite must be ≥ baseline at the end (your new tests add to pass count). The pre-commit hook runs unit+integration+conformance; run the full `bun run test` before your final report.
- Do NOT use `--no-verify`.

# FINAL REPORT (return as your final message)
- WORKTREE_PATH, FINAL_SHA, BRANCH, FILES_TOUCHED list.
- What you built; whether you adopted the choke-point or per-emitter approach + why; whether you phased within Phase 1 and what (if anything) remains on the 0:0 fallback as a known gap.
- Encoder status (did it already emit columns/names, or did you complete it?).
- Coverage-gate test: how it works + what it asserts.
- R26 empirical table (the decode results above).
- Full-suite counts (before/after) + within-node.
- Maps: load-bearing or not.
- Any SPEC/PIPELINE doc touch needed (if you hit a normative-change need, you STOPPED and this is where you flag it).
- Deferred items (Phase 2 CSS/HTML, anything you punted).

Land NOTHING to main — PA does the S67 file-delta landing after reviewing your branch. Your job is a clean, committed, tested branch.

---

## PA POST-DISPATCH CORRECTION (S149, recorded after dispatch — NOT part of the verbatim brief above)

One factual error in the GROUNDED FACTS block above, corrected here for the landing review and any resuming agent. SendMessage was unavailable so the running agent was not amended mid-flight; the brief's substantive instruction ("verify; complete the encoder if line-only; wire `names`") is correct and self-correcting (the agent reads `source-map.ts` first).

**The error:** the brief claimed `SourceMapBuilder.addMapping` is `addMapping(generatedLine, generatedColumn, sourceLine, sourceColumn, name?)` and that the signature "ALREADY accepts columns AND a name."

**The truth** (PA-verified against `compiler/src/codegen/source-map.ts` at base `25e89cbb`):
- Real signature is **3 params**: `addMapping(outputLine: number, sourceLine: number, sourceCol = 0)`.
- There is **no generated-column parameter** — the encoder hardcodes `prevOutputCol = 0` with the comment `// column is 0, stays 0`. Each VLQ segment encodes `[outputCol=0, sourceFileIndex, sourceLine, sourceCol]`.
- There is **no `name` parameter and no `names` array** anywhere in the builder.
- So the encoder is genuinely **line-level only** and needs real completion: add a generated-column dimension to `addMapping` + the `Mapping` interface + the segment encoder, and add a `names: string[]` array + a per-segment 5th VLQ field. This is more than "verify" — it is the encoder-completion the brief's WHAT-TO-BUILD item 3 anticipates, just stated more definitively than the (wrong) GROUNDED-FACT implied.

No other facts in the brief are affected (the `addMapping(i,0,0)` stub wiring in `index.ts` ~929-953, the span-infra-already-flows claim, the 16-emit-file scope, the §47 names-recovery rationale all hold).
