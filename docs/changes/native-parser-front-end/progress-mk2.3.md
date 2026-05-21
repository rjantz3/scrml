# MK2.3 — TagKind-driven classification completion + P4/P5 + MK2 conformance close

Worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a2369c9ab7a30d960
Branch: (harness-assigned)
Base: 86f818c (merged main at startup)

## Plan

MK2.3 is the FINAL MK2 sub-step. Scope (roadmap §3.1 MK2.3 row):
1. TagKind-driven classification completion — `classifyTag(tagKind, what-follows-the->)`.
   Eliminates BS classifier heuristics #1 (isAfterTransitionArrow — backward `=>`/`()`
   scan) + #4 (classifyOpenerForCompoundScan — recursive opener classifier).
2. Punch-list P4 — `markupValueAllowedAfter(lastKind)` discriminator (twin of
   regexAllowedAfter; the JS layer's InCode `<`-vs-LessThan decision; consumer at MK4).
3. Punch-list P5 — TagFrame stack-depth accessor for CloseCondition.TagFrameBalanced.
   tag-frame.js ALREADY exposes `tagFrameDepth(ctx)` (MK2.1). MK2.3 adds the
   CloseCondition-shaped accessor (`tagFrameBalanceTarget` / the close-condition use).
4. MK2 conformance close — per-heuristic regression test for #1, #4, #5 (#12
   confirmed-absent). The MK2 milestone gating criterion.

## Steps

- [x] Step 0 — startup verification + authority-chain read
- [x] Step 1 — P5: tagFrameBalancedAt accessor (tag-frame .scrml+.js) — f0af1fc
- [x] Step 2 — P4: markupValueAllowedAfter discriminator (lex-in-code .scrml+.js) — 33f09d7
- [x] Step 3 — TagKind-driven classifyTag calc (tag-frame .scrml+.js) — 081bef7
- [x] Step 4 — wire classifyTagFrame into emitMarkupElement (parse-markup .scrml+.js) — fe35e7f
- [x] Step 5 — conformance §30-§36: classification + P4/P5 + MK2 milestone close — 7831d93
- [x] Step 6 — full bun run test; report

## Log

(append-only)
- Step 1 — P5 tagFrameBalancedAt: tagFrameDepth (MK2.1) is the raw read;
  tagFrameBalancedAt is the CloseCondition.TagFrameBalanced predicate. MK4 wires it.
- Step 2 — P4 markupValueAllowedAfter: twin of regexAllowedAfter; exported from
  lex-in-code; dispatchInCode UNCHANGED (the InCode-dispatch consumer wires at MK4).
- Step 3 — classifyTag closed-rule calc: TagClass enum (Markup/Declaration/Compound/
  SelfClose/Structural) + inspectAfterOpener (post-> facts) + classifyTagFrame. The
  BS heuristic-#4 self-recursion becomes a typed-payload read of the first child's
  TagClass. recognizeOpener stamps `afterOpener` on the frame.
- Step 4 — emitMarkupElement (single element-emit locus) stamps tagClass on every
  Markup block. Recursive-descent close order → child tagClass set before parent
  emits → no recursion in the classifier.
- Step 5 — +51 conformance tests (224 → 275, 0 fail). §36 is the MK2 milestone close:
  one regression per BS classifier heuristic #1/#2/#3/#4 (eliminated here) + #5/#12
  (re-affirmed from MK2.2 §28).

## SPEC verification (per pa.md Rule 4)
- §4.3 (line 366) — whitespace-after-`<` discriminator is "informational only" since
  Phase P1; AUTHORITATIVE tag-vs-state resolution moved to NR (Stage 3.05). MK2.3
  computes the syntactic-shape TagClass + carries it as a payload; NR is the
  authoritative resolver. Encoded verbatim in the TagClass type + classifyTag header.
- §4.15 (line 1030) — the BS classifies `<engine`/`<match>`/`<errors`/`<onTransition`/
  `<onTimeout`/`<onIdle`/`<page` (no-space) as structural elements. MK2.1's registry
  encodes the normative SEVEN; classifyTag maps TagKind.ScrmlStructural → Structural.
- No NEW error codes — the closer-grammar diagnostics (E-MARKUP-002 / E-CTX-001 /
  E-CTX-003) landed at MK2.2. MK2.3 is a recognition-completion + accessor +
  conformance sub-step; it fires no diagnostic of its own.

## MK3/MK4 forward seams documented
- P4's consumer (the JS layer's InCode `<`-dispatch) → MK4.
- P5's consumer (the JS→markup ElementValue delegation handback) → MK4.
- E-CTX-002 (a closer crossing into `${}`) — MK2.2 already context-scopes it via the
  tag-floor; full seam handling → MK4. MK2.3 surfaces no new E-CTX-002 site.
- BodyMode / DisplayTextLiteral (§4.18) → MK3 (the `bodyMode` TagFrame field is still
  null; MK3 owns the engine).
- TagClass is ADVISORY syntactic shape; NR (Stage 3.05) is the authoritative resolver.
