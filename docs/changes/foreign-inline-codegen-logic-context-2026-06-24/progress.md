# Progress: foreign-inline-codegen-logic-context-2026-06-24

## 2026-06-24T20:20:47Z — startup
- Worktree: /home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-ad25a4d34d10c935f
- Base HEAD: 82f76085 (v0.7.0), merge main = already up to date
- bun install + pretest OK
- Next: maps + Phase 0 survey

## Phase 0 — confirmed decomposition (verified against current source @ 82f76085)
- Repro confirmed: `_={ in:{...} ... }=` in a server-fn body → E-CODEGEN-INVALID-JS (`_ = { in : {...} await ...`); slice leaks into client.js; fn NOT server-classified (W-DEAD-FUNCTION).
- **Producer chain:** top-level `function f(){...}` body is BARE_DECL_RE-lifted as orphan-brace text → wrapped `${...}` → re-parsed via the inner brace-context scan loop (block-splitter.js ~2413). Add `_={` opener recognition there (+ markup loop ~2616) → push a `"foreign"` brace context; closer is `}` + N `=` (level-aware), NOT balanced-`}` like `?{}`.
- **Tokenizer:** add `"foreign"` to BLOCKREF_TYPES (tokenizer.ts:1166) so the foreign block becomes a BLOCK_REF in logic.
- **AST producer:** buildBlock `case "foreign"` builds §23.2.2 ForeignBlock (raw slice, `in:{}` crossing names, lang from ancestor `<program lang=>`, level, optional OUT annotation). `tryConsumeForeignInit()` mirrors `tryConsumeSqlInit()` (ast-builder.js:5221), wired into const/let-decl (~6917/7017) + return-stmt (~7634/7755) paths via a `foreignNode` field.
- **Codegen:** emit-logic.ts new `case "foreign"` cloned from `case "sql"` (~2726): emits `await (async (<in-names>) => { <slice> })(<in-names>)`; const/let-decl `foreignNode` handling mirrors `sqlNode` (~1729/1832); server-only (boundary==="server").
- **Server-color (RI):** route-inference.ts — `kind === "foreign"` + `node.foreignNode?.kind === "foreign"` are server triggers (mirror sql at :1971/:1975/:2073). Server classification keeps the body out of client.js. emit-client.ts:2192 SQL-leak scan extended to a foreign-slice marker for defense-in-depth.
- **OUT-typing:** type-system.ts — `_{}` OUT defaults to `asIs` (§14.7), call-site annotation states intent, parseVariant (§41.13) discharges — mirror `<api>` §60.2/§60.5.
- **SPEC §23.2.4 amendment + E-FOREIGN-005** (ts/js-only; arbitrary lang inline value-flow → E-FOREIGN-005). Bare logic `_{}` (non-value-returning, non-server-fn) stays E-FOREIGN-004.

## Component 1 — BS-gate + tokenizer recognition (DONE)
- block-splitter.js: matchForeignOpener (`_`+`=`*+`{`, non-identifier-prefixed); pushForeignContext (foreignLevel); foreign-frame OPAQUE scan (level-aware `}`+N`=` closer, no generic brace tracking inside); topIsBraceContext += "foreign"; inner-loop opener wired BEFORE `${`.
- tokenizer.ts: BLOCKREF_TYPES += "foreign".
- ast-builder.js: re-split sigil-detection regex += foreign opener (`(?:^|[^A-Za-z0-9_$])_=*{`); _BLOCKREF_PP_TYPES += "foreign".
- VERIFIED: `${ const out = _={ HELLO }= }` and the full dispatcher body both split to a `foreign` child with the verbatim slice (the inner `{ prompt, path }` does NOT prematurely close); zero BS errors.

## Components 2+3 — AST producer + codegen + server-color (DONE)
- ast-builder.js: buildBlock `case "foreign"` (FIRST ForeignBlock producer; raw/body/crossings/level; parses optional `in:{}` header). tryConsumeForeignInit() mirrors tryConsumeSqlInit; wired into const-decl/let-decl/return-stmt (foreignNode attachment).
- block-splitter.js: popBraceContext propagates foreignLevel onto the emitted block (was defaulting level=0 → wrong opener slice).
- emit-logic.ts: case "foreign" emits `await (async (<in>) => { <slice> })(<in>)` (injected await, §13180); const/let-decl foreignNode handling mirrors sqlNode (server-only).
- route-inference.ts: visitNode pushes a `foreign-inline` server-only trigger for a direct foreign node + foreignNode on decl/return; controlFlow + isServerTriggerStatement also recognize foreign — keeps the opaque slice off client.
- VERIFIED end-to-end on the dispatcher: server.js `const out = await (async (prompt, path) => { return (await new Response(Bun.spawn([...],{cwd:path}).stdout).text()); })(prompt, path)`; node --check PASS both artifacts; slice ABSENT from client.js (client gets a fetch stub). 5/5 unit tests pass.
- TODO next: OUT-typing (asIs default + annotation + parseVariant discharge); E-FOREIGN-005 (non-ts/js); meta-checker + type-system foreignNode detection (E-FN-004 in `fn` body); SPEC §23.2.4 amendment.

## Component 4 — OUT-typing + lang gate (DONE)
- type-system.ts: foreignNode-bearing decl defaults OUT to `asIs` (§14.7 honesty marker, explicit — no inference from the opaque slice; A3 eliminated). Call-site annotation (`const out: T`) overrides via the existing letAnnot block; parseVariant (§41.13) discharges — the `<api>`-proven annotate-AND-decode hybrid (§60.2/§60.5).
- type-system.ts: resolveProgramLang + checkForeignBlocks pass — Pass 1 collects ADMITTED foreign nodes (value-returning, attached as foreignNode on const/let-decl or return); Pass 2 fires E-FOREIGN-003 (no lang), E-FOREIGN-005 (non-ts/js inline value-flow), E-FOREIGN-004 (bare non-value-returning `_{}`); stamps resolved lang on the node.
- VERIFIED matrix: ts dispatcher clean · lang=go → E-FOREIGN-005 (once) · no-lang → E-FOREIGN-003 (once) · bare `_{}` → E-FOREIGN-004 (once) · annotated `const out: string` flows + compiles. 9/9 unit tests. Conformance 443/0.

## Component 5 — SPEC §23.2.4 amendment + E-FOREIGN-005 (DONE)
- SPEC §23.2.4 REWRITTEN: admits TWO forms — (1) §23.4 sidecar; (2) §23.2.4a inline value-returning `const x = _={ … }=` in a server `function` body (lang ts/js). Reconciles the §13180 contradiction explicitly (the inline form IS the §13180 boundary; E-SQL-004 server-color rule; dpa-004 C2). Bare non-value-returning / wrong-context `_{}` stays E-FOREIGN-004.
- NEW §23.2.4a "Inline Value-Returning Form": `in:{}` crossing grammar (NO free capture), async-IIFE codegen + injected await, opacity (§23.2.3), OUT-typing hybrid (asIs default + annotation + parseVariant; A3 eliminated; §60.2/§60.5), ts/js-only + E-FOREIGN-005, inline-vs-sidecar coexist-by-lifetime.
- §23.2.2 node shape += body/crossings (inline form); §23.2.3 CG row notes the inline IIFE lowering; §13180 cross-refs §23.2.4a.
- §34 + §23.2 catalogs: NEW E-FOREIGN-005 row; E-FOREIGN-004 description amended (admitted forms named). SPEC-INDEX §23 row line-range + description updated.
- 9/9 unit tests + conformance green after SPEC edits.

## Adversarial fix — orphan-brace foreign-opaque skip (level-2 / embedded }=)
- S215 adversarial gate surfaced: a level-2 `_=={ … }==` whose slice contains an embedded `}=` (inside a string) corrupted the markup-level orphanBraceDepth counter (E-CTX-001 on the real closer) — the pre-lift fn body counted slice braces.
- FIX (block-splitter.js): before the orphan-brace `{` handler, skip a foreign opener `_=*{` inside an orphan-brace body OPAQUELY to its level-aware `}=` closer (not counted as orphan braces). The lift then wraps the now-balanced body in `${...}` and the re-split builds the foreign child.
- VERIFIED: level-2 compiles, embedded `}=` preserved in the slice; level-1 + mixed sigils unchanged. +2 tests (11 total).

## Adversarial fix — value-flow slice-shape scan (nested-return false-positive)
- S215 adversarial gate surfaced a CORRECTNESS bug: the naive `hasReturn` regex matched a NESTED `return` (inside an arrow in the slice), wrongly concluding the slice had its own top-level return → spliced verbatim → the trailing value expression was NOT returned → IIFE returned undefined (broken value-flow).
- FIX (emit-logic.ts): replaced with a brace/paren/bracket-depth-aware + string/comment-skipping scan. A SINGLE-expression slice (no top-level `;` and no top-level `return`) → `return (slice)`; otherwise (top-level return OR multi-statement) → splice verbatim (author owns the return). Syntactic scan only — opacity preserved (§23.2.3).
- VERIFIED: dispatcher single-expr → `return (await new Response(…))`; multi-stmt with author `return await Promise.resolve(…)` → verbatim, nested-arrow return untouched, node --check PASS. +2 tests (13 total).

## FINAL — all components complete, full suite green
- Phase-3 R26 (5 checks): ALL PASS. (1) exit-0 no E-CODEGEN-INVALID-JS · (2) server async-IIFE `await (async (prompt, path) => { return (await new Response(...)) })(prompt, path)` + node --check PASS · (3) slice ABSENT from client.js (fetch stub) + node --check PASS · (4) asIs default + annotation override + parseVariant discharge (codegen correct; raw asIs → parseVariant(raw, T)) · (5) lang=go → E-FOREIGN-005, bare → E-FOREIGN-004.
- S215 adversarial gate: 0/1/many crossings · bind-vs-return · mixed ?{}+_{} (no cross-contamination, neither leaks) · level-2 embedded }= · client-only _{} (server-classified, CPS-gated, no leak) · ?{}/${} lowering UNCHANGED (SQL tests 25/0). TWO real bugs found+fixed (orphan-brace level-2; nested-return value-flow).
- Full blocking gate: 17721 pass / 0 fail / 68 skip / 1 todo (981 files). No within-node OVER-BUDGET. 13 new unit tests.
- DEFERRED (surfaced, not built — narrow author-error edge): a crossing name that shadows a slice-local `const x` (`in:{x}` + slice `const x=...`) emits `(async (x)=>{const x=...})` → invalid JS, caught by validate-emit as E-CODEGEN-INVALID-JS ("compiler defect") — MISLEADING (it's author error). Recommend a future pre-emit syntactic scan → a clear W-FOREIGN-CROSSING-SHADOW / E-FOREIGN-006 (out of this dispatch's component scope; the slice is self-contradictory author code).
