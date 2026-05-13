# Wave 4.A T-track progress

## 2026-05-13 startup
- Worktree root verified: `agent-aeb07b516acc159e9`
- `bun install` + `bun run pretest` clean
- Maps read: `primary.map.md`
- Tutorial: `docs/tutorial.md` + 11 snippets in `docs/tutorial-snippets/`
- Harness: `docs/tutorial-snippets/verify-tutorial.sh`

## 2026-05-13 T-4 crosslink audit
Audit scope: all SPEC § references, intra-tutorial section refs, error-code citations, examples paths, docs paths, external links.

Findings:
- 1 broken xref: §7 line 814 cited "per §45.7" for the `not` operator-form. §45.7 is "Equality — Error Codes"; the canonical home for `not` semantics is §42 (Absence Semantics). Fixed: now cites §42 + §45.7 (the latter still relevant for equality interactions like E-EQ-002 `== not` vs `is not`).
- 0 broken intra-tutorial xrefs (§1, §2, §2.1, §2.2, §2.3, §3.1, §3.2, §3.4, §3.5, §4, §4.2, §4.3, §4.5, §5, §5.1, §5.2, §5.4, §5.5, §5.7, §6, §7, §8, §9 all present).
- 0 broken SPEC xrefs (§13.1, §13.2.2, §17.6, §38.12.6, §42, §45.7 all present).
- 0 broken error codes (E-NAME-COLLIDES-STATE, E-DERIVED-WRITE, E-RI-002, E-ENGINE-INVALID-TRANSITION, E-SYNTHESIZED-WRITE, E-SYNTAX-042, E-TYPE-041, E-CHANNEL-OUTSIDE-PROGRAM, E-CHANNEL-INSIDE-PAGE, E-PROG-004, W-LIFECYCLE-CANDIDATE all present).
- 0 broken example paths (all 5 referenced examples + 22-multifile/ exist).
- 0 broken doc paths (`docs/PA-SCRML-PRIMER.md`, `docs/articles/llm-kickstarter-v2-2026-05-04.md`, `compiler/SPEC.md`, `compiler/SPEC-INDEX.md` all exist).
- 0 broken external links (only [Bun](https://bun.sh)).

## 2026-05-13 T-3 smoke-walk fixes
- §4.3 prose (line 484): "state-children are empty in the current parser" was stale (Phase A10 shipped S78). Updated to acknowledge bodies MAY hold markup directly via Phase A10; introductory shape keeps the sibling match block.
- §4.3 bullet 4 (line 535): "future spec amendment" claim corrected — Phase A10 is in the binary.
- §4.3 closing quote (line 541): "until that parser lands" softened to reference both shapes.
- §7 §user example (line 818): `<user>: User? = null` corrected to `<user>: User? = not` (canonical absence sentinel); added paragraph explaining `not` semantics and citing E-SYNTAX-042 / E-TYPE-041.
- §9 "shape all together" (line 906): `<channel>` block moved from outside `<program>` (stale pre-S87 placement) to inside `<program>` (post-S87 canonical).
- 04b-tier2-engine.scrml header comment: v0.2.4 → v0.3.

## 2026-05-13 T-2 currency edits
- Snippet `07-channel-chat.scrml`: moved `<channel>` INSIDE `<program>` (S87 Insight 30 reversal); now compiles.
- Tutorial §1 line 64: "anything outside `<program>` is reserved for sibling top-level elements (`<channel>`, `<schema>`)" — corrected to clarify `<channel>` is now inside `<program>`.
- Tutorial §6 line 794: replaced bogus `E-AWAIT-FORBIDDEN` citation with accurate §13.1 / §13.2.1 / §13.2.2 framing (auto-await covers server fns + stdlib `Promise<T>` + cross-program; cross-program `await` permitted+idempotent, surfaces as Info-level E-PROG-004).
- Tutorial §8: full prose rewrite — channel-inside-program canonical; reference correct error codes `E-CHANNEL-OUTSIDE-PROGRAM` / `E-CHANNEL-INSIDE-PAGE`; mention PURE-CHANNEL-FILE dispensation as out-of-scope.
- Tutorial intro ("v0.2.4 canonical surface") + §5 line 640 + Glossary heading + final timestamp: bumped to v0.3 canonical with date 2026-05-13 and post-S87/S89 attribution.
- Glossary entry for `<channel>`: corrected placement description.

## 2026-05-13 T-1 verify outcome
- 10/11 PASS
- 1/11 FAIL: `07-channel-chat.scrml` — E-CHANNEL-OUTSIDE-PROGRAM (channel at file top is now banned per S87 Insight 30)
- Tutorial prose at §8 also teaches the old direction explicitly: "`<channel>` is a sibling of `<program>`, not a child", and cites the retired `E-CHANNEL-INSIDE-PROGRAM` code.
- Disposition: tutorial drift, not compiler regression. Fix in T-2 currency pass.

Common informational warnings on most snippets (not failures, but candidate cleanup):
- W-PROGRAM-REDUNDANT-LOGIC — `<program>` body wraps `${...}` redundantly (v0.3 auto-lifts)
- W-PROGRAM-SPA-INFERRED — SPA shape inferred from absence of `pages/`
- 06-failable: W-DEAD-FUNCTION + E-DG-002 (`persistUser` unused; `@form` declared but unused)
- 04b: W-ENGINE-SELF-WRITE-DETECTED (Option-d synthesis NO-OP — informational)
- 07: W-LINT-013 false-fire on `@username` etc. (looks like regex matches `@<word> =` and accuses of Vue shorthand)
