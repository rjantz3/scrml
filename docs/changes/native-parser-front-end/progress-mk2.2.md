# MK2.2 — closer forms + tag-tree pairing + mismatch recovery

Per-agent progress file (append-only). Parallel M3.1 dispatch runs concurrently —
do NOT share a progress.md.

## Startup

- 2026-05-20 — worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aabd9f80953482570
- Startup verification PASS: pwd under .claude/worktrees/agent-, repo root matches,
  tree clean, `git merge main` fast-forwarded to 0a5350e, all predecessor file
  pairs (tag-frame / parse-markup / block-context .scrml+.js + parser-conformance-
  markup.test.js) present, `bun install` ok, `bun run pretest` ok.

## Reading

- Maps read: primary / structure / dependencies / schema.
- Roadmap §0 / §3.1 (MK2.2 row — authoritative scope) read.
- Charter dive Q1.F (TagFrame sketch + rule= contract) / Q1.G (composite picture) /
  Q2.A (12 BS heuristics — MK2.2 eliminates #5 scanCompoundBlockEnd) read.
- Predecessor native-parser files read in full: tag-frame .scrml+.js, parse-markup
  .scrml+.js, block-context .scrml+.js, error-recovery.js, cursor.js, parse-ctx.js.
- SPEC §4.4 (closer forms) + §4.14 (three body forms) + §34 error codes read IN FULL.

## SPEC finding (load-bearing — corrects the brief)

The brief says mismatched `</name>` "dispatches the ErrorRecovery engine (E-CTX-001
panic-mode recovery)". SPEC §4.4.1 line 397 + §34 line 14928 are normative: an explicit
closer whose name does NOT match the innermost open tag is **E-MARKUP-002**, not
E-CTX-001. E-CTX-001 (§34 line 14878) is "wrong closer for context type"; SPEC §4
line 1072 also uses E-CTX-001 for an UNTERMINATED tag (EOF before closer). So MK2.2
encodes: mismatched `</name>` → E-MARKUP-002; unterminated tag (EOF) → E-CTX-001;
unbalanced closer with no open tag → E-CTX-003 ("unclosed context ... before an outer
closer" is the nearest normative code; a stray closer with nothing open is its dual).
The brief's load-bearing instruction — "dispatch the ErrorRecovery engine, the same
recovery the JS layer uses" — is honored; only the error CODE the brief named is
imprecise. REPORT to PA.

SPEC §4.4 taxonomy: scrml has TWO `</...>` closer forms — §4.4.1 explicit `</name>`
and §4.4.2 inferred `</>`. The brief's "3 closer forms" folds in `/>` self-closing,
which §4.14 classifies as a BODY FORM (not a §4.4 closer) recognized at the OPENER by
MK2.1's recognizeOpener. MK2.2 completes the frame lifecycle for all three.

## Steps

- (next) tag-frame: CloserForm enum + recognizeCloserForm + tokenizeCloser +
  closeTagFrame + ErrorRecovery dispatch + diagnostics sink.

## Steps (cont.)

- tag-frame.scrml/.js: closer machinery landed (commit 0065928).
- parse-markup.scrml/.js: tag-tree pairing landed (commit e8ddeef).
- Conformance run from worktree: 156 pass / 7 fail. 6 are EXPECTED stale-MK2.1
  assertions (MK2.1 baked in "closer is text / boundary granularity / stack stays
  at EOF" — MK2.2's authoritative scope changes all of these). 1 is a REAL bug:
  `${ <div> }` — a tag opened inside a brace context that closes before the tag
  does. EOF recovery's child-splice over-reaches: the (outer) LogicEscape block,
  emitted after the opener, wrongly becomes a child of the (inner, unterminated)
  <div>. FIX: a TagFrame cannot outlive its enclosing brace context — on a
  BlockContext close, recover any TagFrame opened since that context opened, at
  the context's close position. Snapshot tagFrameDepth on the BlockContext frame.
- Context-scoped tag recovery landed (commit aae3b4c) — stampTagDepthAtOpen +
  recoverTagsInClosedContext; the closer guard in dispatchInLogicEscape uses the
  context-scoped floor (also fixes a cross-boundary `</section>` close).
- 6 stale MK2.1 tests updated to MK2.2 truth (commit 4c092bb).
- +61 MK2.2 conformance tests across 7 describe blocks §23-§29 (commit 15e8214);
  markup-tags.scrml corpus disposition flipped divergence-markup-tree -> markup-tree
  (D-4 RESOLVED — full native <tag> tree === BS block tree).

## DONE

- MK2.2 COMPLETE. Final SHA 15e8214.
- Files: tag-frame.{scrml,js}, parse-markup.{scrml,js}, parser-conformance-markup.test.js,
  progress-mk2.2.md.
- Full `bun run test`: 17,015 pass / 0 fail / 169 skip / 1 todo (baseline 0a5350e:
  16,954 / 0 / 169 / 1 — +61 new tests, 0 new failures, 0 new skips).
- markup conformance suite: 224 pass / 0 fail (163 baseline + 61 MK2.2).
- BS heuristic #5 (scanCompoundBlockEnd) eliminated — the TagFrame stack pairs by
  construction (regression tests §28). #12 (looksLikeCloser) confirmed absent — the
  closer set is closed (regression tests §28).
- Seams documented for MK2.3 (decl-vs-markup classification, P4/P5) + MK3 (BodyMode).
  E-CTX-002 (closer crossing into a logic context) is a documented MK2.3/MK4 seam —
  the context-scoped floor prevents the cross-boundary close; the explicit E-CTX-002
  diagnostic is not MK2.2 scope.
- SPEC discrepancy REPORTED to PA: the brief said mismatched </name> is E-CTX-001;
  SPEC §4.4.1 + §34 are normative — it is E-MARKUP-002 (E-CTX-001 is unterminated-tag
  / wrong-closer-for-context). MK2.2 encodes the normative codes.
