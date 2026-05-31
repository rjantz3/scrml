# Progress: source-map-real-provenance-js-2026-05-31

Append-only log.

## 2026-05-31 — Startup + recon (complete)
- Startup verification PASSED. pwd=/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a90df7eb901db3ce6
- `bun install` OK; `bun run pretest` OK (13 samples).
- Baseline FULL suite (`bun run test`): 22376 pass / 220 skip / 1 todo / 0 fail; 857 files.
  (Gate suite unit+integration+conformance = 15358 pass / 89 skip / 1 todo / 0 fail, clean.)
- EMPIRICALLY CONFIRMED THE LIE: compiling a counter fixture with sourceMap:true →
  clientJsMap.mappings is ALL "AAAA" segments (0,0,0,0); every output line maps to src 0:0.
  `names` field ABSENT. This is the exact failure the dispatch describes.

## Architecture facts (verified against current source)
- `SourceMapBuilder` (source-map.ts, was 220 lines): line-only; encoder hardcoded generated col 0;
  NO names; sourcesContent: null.
- `index.ts` source-map block: lib-mode server branch + browser-mode client+server branch did
  `addMapping(i,0,0)` per output line.
- NO `offsetToLineCol` helper existed (dispatch hypothesis was wrong) — added LineIndex.
- type-encoding.ts: `decodeKind` + ENCODED_PATTERN `/^_([a-z])([0-9a-z]{8})([0-9a-z])(\$.*)?$/`.
- DEFAULT (encoding OFF) builds: author state cells emit `_scrml_<marker>_<name>` (e.g. `_scrml_t_count`)
  and author fns as bare `increment` — author name DIRECTLY present. Common case + clean names path.
  §47 release HASH form does NOT carry author name (by design); §47 debug `$name` suffix recovered too.
- AST nodes carry `name` + `span:[startByte,endByte]` into the source. state-decl/fn/component/engine/etc.
- IMPORTANT: api.js ALREADY threads per-file source as `result._sourceText` (line ~919, via sourceByFile).
  So NO api.js change is needed — index.ts reads `(fileAST as any)?._sourceText`.

## Approach (DONE)
Choke-point at the index.ts source-map block driven by an AST name→source-position table + an
output-line scan — NOT a 16-emitter span-threading refactor (emitters push pre-built template
strings; no span object flows through; full refactor disproportionate to Phase 1 + high-risk).

## What landed
1. `compiler/src/codegen/source-map.ts` REWRITTEN (391 lines):
   - LineIndex (byte-offset → 0-indexed {line,col}, binary-search line-start index).
   - SourceMapBuilder.addSourceMapping(genLine, genCol, srcLine, srcCol, name?) — real columns + names.
   - addSyntheticLine(genLine) — categorized sentinel (NOT a fake 0:0).
   - generate(): names array, optional sourcesContent, `x_scrml_kinds` per-line source/synthetic sidecar.
   - addMapping(genLine, srcLine, srcCol) kept as a back-compat alias → legacy unit suite stays green.
   - encodeVlq hardened (`>>> 0` unsigned) for large offsets.
2. `compiler/src/codegen/build-source-map.ts` NEW (~250 lines):
   - collectAuthorBindings(astNodes, lineIndex) → Map<name, {sourceLine, sourceColumn}>.
   - per-line scan: `_scrml_<marker>_<name>` / §47 `$name` debug-suffix / bare-ident → author binding.
   - buildSourceMap(compiledJs, basename, sourceContent, astNodes, embedSourceContent=false).
   - PRIVACY DEFAULT: sourcesContent NOT embedded (server-fn bodies / secrets must not leak into
     deployable .client.js.map). sourceContent used only for byte→linecol. Opt-in embed for tooling.
3. `compiler/src/codegen/index.ts`: killed all 3 `addMapping(i,0,0)` loops (lib-mode server +
   browser-mode client+server); replaced with buildSourceMap(...) calls reading `_sourceText`.
   Import swapped SourceMapBuilder→buildSourceMap.
4. Tests:
   - `compiler/tests/integration/source-map-provenance.test.js` NEW — the CANARY: decode emitted map,
     assert NO source-derived line resolves to (0,0); non-degenerate mappings; names recovery; privacy
     (no sourcesContent leak); plausible non-zero positions; emitted JS parse-clean.
   - `compiler/tests/unit/source-map-builder.test.js` NEW — LineIndex, addSourceMapping columns+names,
     addSyntheticLine kinds, sourcesContent embed/omit privacy, collectAuthorBindings, buildSourceMap.
   - Legacy `source-map.test.js` + `source-maps.test.js` UNCHANGED — still green via back-compat alias.

## Encoder status
The legacy encoder was line-only (dropped generated column, no names). I COMPLETED it: generated
column + source column + the `names` array (4- and 5-field VLQ segments) are now emitted in valid
Source Map v3, plus the `x_scrml_kinds` diagnostic sidecar.

## Harness note
Multi-tool parallel batches were repeatedly cancelled by transient classifier outages mid-session,
twice rolling work back to HEAD. Recovered each time (uncommitted work survived on disk; salvaged +
re-applied). Switched to strictly one-tool-call-at-a-time + file-based output verification.

## Test status
- 4 source-map test files: 65 pass / 0 fail / 1 (pre-existing) skip.
- Full suite re-run mid-work: 22376 pass / 0 fail (= baseline; 0 regressions) BEFORE the new tests
  were added. Final full-suite re-run after new tests + privacy default: pending final commit.

## SPEC
- §47 prose already promises this path ("Source maps ... are the specified debugging path back to
  `.scrml` source"). NO new normative SPEC text needed. PIPELINE Stage 8 note optional (not required).

## Deferred (OUT OF SCOPE — Phase 2+)
- CSS source maps; HTML data-scrml-span correlation; engine "what-comes-next" data; in-browser compiler.
- Intra-line / per-statement column precision (current map is line-granular, conservative, never WRONG).

## 2026-05-31 — test-API correction + final commit
- BUG in first test draft: used a nonexistent `compileScrmlString` / mis-called
  `compileScrml(source, filePath, opts)`. The real API is `compileScrml({ inputFiles:[path], sourceMap, write, ... })`
  returning `{ outputs: Map<filePath, {clientJs, serverJs, clientJsMap, serverJsMap, ...}> }`.
  Rewrote the canary test to use the canonical `compileToString(source, {sourceMap:true})` integration
  helper (temp-file → real pipeline → returns clientJsMap/serverJsMap). This was a TEST bug only — the
  compiler implementation was correct throughout (CLI + standalone probes always produced real maps).
- buildSourceMap empty-source path hardened: collect NO author bindings when sourceContent === ""
  (a span offset into an empty string would collapse to 0:0 — exactly the lie). Source-less harness
  path is now honestly all-synthetic with empty names.
- Final source-map test tallies: provenance canary 7/0, builder unit 25/0, legacy source-map 41/0.
- Commit sequence (on top of main 25e89cbb): source-map.ts rewrite; build-source-map.ts (+privacy
  +harness); index.ts wiring; tests; this progress.
