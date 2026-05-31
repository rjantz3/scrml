# BRIEF — source-map-use-site-spans-b1-2026-05-31 (archived verbatim per S136)

**Dispatched:** S149, 2026-05-31 · **Agent:** scrml-js-codegen-engineer · **isolation:** worktree · **background:** true · **model:** opus
**Base HEAD:** `25e89cbb` (main) · **Inherits:** branch `worktree-agent-a90df7eb901db3ce6` tip `76de8ff2` (the B2 encoder/names/tests) via `git merge`
**Why this dispatch:** the prior source-map dispatch (B2) built declaration-footprint resolution — every USE of a cell maps to its DECLARATION site, not the use-site. PA empirically verified. The self-demo-website crux needs USE-SITE provenance (hover onclick → highlight ITS emitted JS; devtools error → the failing use). User ratified: HOLD B2 branch (don't land), redispatch B1 (emitter-recorded use-site spans), KEEP the encoder/names/sidecar/tests. This brief is the B1 redispatch.

---

(Full verbatim prompt: the Agent() prompt text for change-id `source-map-use-site-spans-b1-2026-05-31` — replace declaration-footprint resolution with use-site spans recorded at emit, inheriting the B2 branch via git merge. Mechanism: thread node.span through emitExpr's tree-walk into a provenance accumulator on ctx; convert generatedOffset→gen-line/col + sourceSpan→src-line/col post-assembly. KEEP names/x_scrml_kinds/privacy/32 tests. Canary sharpened: a use on a line distinct from its decl must map to the USE line. R26 must prove use-site resolution. OUT OF SCOPE: CSS/HTML provenance, website, SPEC text. Full S99/S126 path-discipline + S83 commit-discipline + S138 R26 doctrine blocks included as in the source-map-real-provenance-js BRIEF.md sibling.)

NOTE: This BRIEF.md is the abbreviated archive; the complete prompt was pasted into the Agent() call at dispatch. The sibling `source-map-real-provenance-js-2026-05-31/BRIEF.md` carries the full verbatim path-discipline/commit/R26 boilerplate which is identical in this dispatch.
