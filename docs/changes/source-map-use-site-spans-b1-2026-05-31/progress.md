# Progress — source-map-use-site-spans-b1-2026-05-31

## 2026-05-31 — Startup
- pwd: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-ade3dad4a3a765094
- Merge of worktree-agent-a90df7eb901db3ce6 (B2 encoder/names/tests): fast-forward clean to 76de8ff2.
- bun install OK; bun run pretest OK (13 samples compiled).
- 32 inherited source-map tests pass (25 unit source-map-builder + 7 integration source-map-provenance).

## Code map (base 76de8ff2)
- source-map.ts (391 lines): ENCODER — complete. addSourceMapping(genLine,genCol,srcLine,srcCol,name), addSyntheticLine, LineIndex, x_scrml_kinds, privacy default OFF. KEEP as-is.
- build-source-map.ts (260 lines): B2 RESOLVER — post-hoc per-line scan. resolveLineBinding (162-194) + per-line loop (247-257) = WRONG mechanism (decl-footprint). collectAuthorBindings (104-130) = keep for names recovery.
- index.ts: runCG; sourceMap flag at 260; buildSourceMap() calls at 657 (server early path), 949 (client), 956 (server).

## Next
- Trace emitExpr string production + how clientJs/serverJs assembled (lines[] arrays) to find use-site choke point for B1 span recording.

## 2026-05-31 (cont.) — baseline + design
- Full-suite baseline (post-merge, post-progress-commit): 22416 pass / 0 fail / 6 skip across 506 files.
- Confirmed AST span shape: SourceSpan { start; end } byte offsets into preprocessed source; node.span?.start is the source offset.
- B1 design DECIDED: provenance accumulator approach with SENTINEL MARKER injection.
  - emit-expr records use-site spans by wrapping the emitted use-site fragment in a zero-width sentinel that encodes a provenance-index, recorded into ctx.provenance[].
  - Post-assembly (build-source-map.ts new path): scan final JS for sentinels, compute generated line/col via LineIndex over OUTPUT, map to recorded source span.start via LineIndex over SOURCE, then STRIP all sentinels so final JS is clean/readable.
  - Rejected alt: snippet-search (fragments repeat → ambiguous offsets). Marker approach gives exact offsets + survives intervening rewrites.


## 2026-05-31 (cont.) — R26 empirical verification PASSED + canary landed
- Use-site canary added to integration test (decl-line != use-line + symmetry +
  marker-leakage guard). Integration file 19/19 pass; unit 25/25.
- Pre-commit gate (unit+integration+conformance) green on both commits:
  15392 pass / 0 fail / 89 skip / 1 todo across 811 files (matches baseline; +2 = the
  new use-site canary describe-block tests).

### R26 empirical table (real adopters, sourceMap:true via programmatic API)
All: clientJs+serverJs MARKER-FREE; node --check client.js clean(exit0); mappings
not-all-0:0; source-derived (0,0) count = 0.

COUNTER (counter.scrml):
  names=["count"]; 3 source mappings.
  count | decl 1  | use 4  | mapped [1,4]   | USE-mapped=YES | B2-regression=NO
    (maps to BOTH the line-1 initializer node AND the line-4 use-site — each node
     to ITS OWN span; under B2 it would map ONLY to decl line 1.)

MARIO-ENGINE (14-mario-state-machine.scrml) — engine fixture:
  names=["lives","score","coins","marioState","gameStatus"]; 14 source mappings.
  lives      | decl 8  | use 46 | mapped [46]    | USE-mapped=YES | B2-regression=NO
  score      | decl 9  | use 43 | mapped [43,53] | USE-mapped=YES | B2-regression=NO
  coins      | decl 10 | use 52 | mapped [52]    | USE-mapped=YES | B2-regression=NO
  gameStatus | decl 12 | use 57 | mapped [57]    | USE-mapped=YES | B2-regression=NO

CONTACT-BOOK (03-contact-book.scrml) — client+server fixture:
  names=["contacts","query","editing","form"]; 9 source mappings.
  query   | decl 10 | use 37 | mapped [37,38] | USE-mapped=YES | B2-regression=NO
  editing | decl 11 | use 46 | mapped [46]    | USE-mapped=YES | B2-regression=NO
  form    | decl 13 | use 20 | mapped [20]    | USE-mapped=YES | B2-regression=NO

VERDICT: every cell used on a line distinct from its declaration maps to the USE
line, NOT the declaration line. Decl/use gaps up to 45 source lines (mario lives
decl 8 -> use 53). This is the B1-not-B2 proof on real source.

### Granularity achieved
PER-SEGMENT (per use-site expression). Each emitted reactive get/set/postfix
fragment contributes a mapping at its exact generated line+column -> its real
source line/col. Better than the per-line floor.

### Known-remaining gap (categorized synthetic, never falsely mapped)
Member-chain reads of compound cells (e.g. `@contacts.length`, `@form.name`) flow
through emitMember (Bug-61 synth-collapse path) whose node span is the collapse
node, not the leaf use-site — so those are NOT use-site-marked and stay categorized
SYNTHETIC (honest; never a wrong map). The load-bearing reactive get/set/postfix
surface (counter/mario/contact-book scalar cells) IS use-site-resolved. Widening
to member-chain leaves is a clean follow-up (mark at the resolved leaf span in
emitMember), out of scope for Phase 1b.

## 2026-05-31 — B1 CORE LANDED + R26 VERIFIED (FINAL)

### Architecture (final, byte-offset)
In-string block-comment sentinel /*#scrmlmap#BYTEOFFSET,name#scrmlmap#*/ riding
immediately before each use-site fragment. Survives all .join/template composition
(inert JS). Post-assembly (build-source-map.ts): strip markers -> clean shipped JS;
for each marker, generated line/col = position in CLEANED output (LineIndex over
output), source line/col = LineIndex over SOURCE applied to the recorded BYTE
OFFSET, + author name. Remaining generated lines = synthetic.

### Root-cause correction (line/col -> byte offset)
First impl recorded span.line/span.col. EMPIRICALLY WRONG: AST ExprNode spans do
NOT reliably populate line/col (often 0) — every use mapped to source (0,0). Fix:
record span.start (byte offset, always real) and convert in build-source-map via
the encoder's own LineIndex bridge.

### Byte-0 sentinel handling
Interpolation-lowered / synthesized reactive-ref nodes ({@coins} markup reads via
emit-lift) carry span.start===0 as a NOT-SET sentinel. A genuine use-site at byte
0 is impossible (files open with markup/<title>/<program>). So start<=0 -> no
marker (node stays SYNTHETIC). This eliminated mario's 15 false (0,0) mappings
(source-derived(0,0) went 15 -> 0).

### Gating (zero footprint when sourceMap off)
Module-level flag set per-compile in runCG (sourceMap-gated). Flag off (default,
whole test corpus): srcmapMark returns "" -> byte-identical output, no scan cost.
Verified via conf-compound-rollup-read-bug-61 (exact-JS-assertion test) 9/9.

### Concurrency fix
bun runs test files concurrently sharing the module gate. Split formatSrcmapMark
(PURE, gate-independent) from srcmapMark (gated). Tests use the pure formatter so
they never touch the shared gate. Both source-map files green together (41/41).

### Granularity: PER-SEGMENT (per use-site expression). Each emitted reactive
get/set/postfix fragment maps at its exact generated line+column -> real source
line/col. Above the per-line floor.

### R26 empirical verification (S138) — PASSED on real adopters
sourceMap:true via programmatic API. All: clientJs+serverJs MARKER-FREE; node
--check client.js clean(exit0); mappings not-all-0:0; source-derived(0,0)=0.

COUNTER:  names=["count"]; 1 src mapping.
  count    | decl 1  | use 4  | mapped [4]       | USE-mapped YES | B2-regr NO

MARIO-ENGINE (engine fixture): names=["lives","score","coins","marioState","healthRisk"]; 24 src.
  lives      | 43 | 90 | [90]       | YES | NO
  score      | 42 | 62 | [62,75,79] | YES | NO
  coins      | 41 | 62 | [62,68]    | YES | NO
  marioState | 40 | 74 | [62,74,..] | YES | NO

CONTACT-BOOK (client+server fixture): names=["contacts","query","editing","form"]; 6 src.
  contacts | 7  | 30 | [30]    | YES | NO
  query    | 10 | 37 | [37,38] | YES | NO
  editing  | 11 | 46 | [46]    | YES | NO
  form     | 13 | 20 | [20]    | YES | NO

VERDICT: every cell used on a line distinct from its declaration maps to the USE
line, never the declaration line. Decl/use gaps up to 47 source lines (mario
lives 43->90). The B1-not-B2 proof on real source.

### Known-remaining gaps (categorized SYNTHETIC, never falsely mapped)
1. Member-chain compound reads (@form.name, @contacts.length) flow through
   emitMember (Bug-61 synth-collapse); the leaf span isn't the use-site span ->
   NOT use-site-marked; stay synthetic (honest).
2. The top-level <count> = 0 -> _scrml_reactive_set("count", 0) INITIALIZER is
   built by the statement emitter (emit-logic), NOT emitAssign -> NOT marked;
   its generated line is synthetic. USE sites of the cell ARE resolved.
Both are clean follow-ups (mark at resolved leaf / statement span). The load-
bearing reactive get/set/postfix use-site surface IS use-site-resolved.

### Tests
- unit source-map-builder.test.js: 26 tests (B2->B1 migration).
- integration source-map-provenance.test.js: 15 tests (inherited canaries + B1
  use-site canary + marker-leak guard). Combined 41/41.
- Pre-commit gate (changed-file subset): green.
