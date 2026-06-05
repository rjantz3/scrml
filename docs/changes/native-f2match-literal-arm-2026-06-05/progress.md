# native-f2match-literal-arm-2026-06-05 — progress

Append-only, timestamped. What was done / what's next / blockers.

## 2026-06-05 — startup
- Startup verification PASS: pwd under worktree agent-a0a135dbe7ad711e9; toplevel matches;
  `git merge --ff-only main` = Already up to date (HEAD c02e2860); tree clean;
  `bun install` ok; `bun run pretest` populated dist.
- Read .claude/maps/primary.map.md (Task-Shape Routing → parser/grammar fix native-parser-swap →
  parse-expr.js locus). Survey loci verified against current HEAD source.

## 2026-06-05 — loci verification + EMPIRICAL SCOPE CORRECTION (boolean)
- parse-expr.js:3136 parseMatchArmPattern, catch-all at 3233 confirmed; no StringLit/KwTrue/KwFalse branch.
- ast-expr.js:125 MatchArmPatternKind enum (Variant/Wildcard/Is); factories at 360-374.
- translate-expr.js:1030 reconstructArmPattern; stringRaw helper at 426 (carries quotes).
- emit-control-flow.ts:971 live parseMatchArm: Forms 3/4 (dq/sq string) + legacy 3/4 = `kind:"string"`.
  CONFIRMED string-literal arms ARE handled live.
- BOOLEAN EMPIRICAL CHECK (cookbook-vs-empirical / Rule 4): brief claims live parseMatchArm
  "ALREADY handles ... boolean arms". FALSE. parseMatchArm Forms 0-5c + legacy 1-5 have NO
  true/false recognition. Default-path test (/tmp/bool-match3.scrml, `let flag: bool`) compiles
  exit 0 but SILENTLY DROPS both boolean arms: emits `const _scrml_match_3 = flag;` only; `r`
  resolves to null tilde. This is the SAME class as the OUT-OF-SCOPE number-literal item
  (default-path failure, needs a live-side codegen addition). Implementing native KwTrue/KwFalse
  recognition would route a boolean arm into the live silent-drop → native WORSE not better.
- DECISION: implement STRING-literal arms only (the 4 affected fixtures are all string-literal).
  Add a generic MatchArmPatternKind.Literal carrying litKind so a future boolean/number live-side
  addition reuses it, but recognize ONLY StringLit in the parser + re-serialize ONLY string in the
  bridge. Boolean + number deferred to the dual-front-end SPEC §18.16 backlog item.
- NEXT: edit 1 ast-expr.js (Literal kind + makeLiteralPattern); edit 2 parse-expr.js (StringLit
  branch); edit 3 translate-expr.js (Literal case → stringRaw); then R26 + unit test.

## 2026-06-05 — 3 edits landed + unit test + within-node re-baseline
- Edit 1 (145ef21b): ast-expr.js MatchArmPatternKind.Literal + makeLiteralPattern(litKind,raw,value,span).
- Edit 2 (961d47df): parse-expr.js import makeLiteralPattern + StringLit branch before catch-all
  → makeLiteralPattern("string", tok.text, tok.cooked, tok.span). (text=raw incl quotes; cooked=value)
- Edit 3 (561e09e1): translate-expr.js reconstructArmPattern Literal case → return pattern.raw verbatim.
- Test (38b39cbc): native-match-literal-arm.test.js — 17 parse-level tests, all pass.
- Within-node re-baseline (cc480de3): the 3 string-literal fixtures (101/102/kanban-r11) went
  OVER-BUDGET on SPAN-COORD ONLY after the fix (literal arms now PARSE — they were PARSE-FAILURE
  before, so the within-node walker now sees the Literal pattern subtree). NO KIND-NAME/FIELD-SHAPE/
  MISSING/EXTRA residual → AST STRUCTURE is parity; only span coords shifted. Bumped SPAN-COORD:
  101 6->12, 102 5->9, kanban-r11 223->235. Within-node now 1005 pass/0 fail, PARSE-FAILURE 0.

## 2026-06-05 — R26 result + META-FIXTURE SCOPE FINDING (surface to PA)
- R26 (post-fix): control-013 native=0, 101 native=0, 102 native=0 (was parse-failure), node --check ok.
  meta-match-in-meta-001 native=1 STILL FAILS — but the root cause is NOT literal-arm.
- byte-identity: the 3 string fixtures are NOT byte-identical to default — but the diffs are a
  PRE-EXISTING within-node KIND-NAME divergence (native classifies a stmt/let-position match as
  match-EXPR / bare-expr, default as match-STMT), already on the allowlist. Both outputs are valid
  JS + functionally equivalent (node --check ok on all). This is the F2-match-CLASSIFICATION family,
  ORTHOGONAL to literal-arm RECOGNITION. My fix made the arms parse; the emit-shape divergence is the
  separate pre-existing within-node KIND-NAME residual.
- meta-match-in-meta-001 residual root cause (investigated, REVERTED debug): a STATEMENT-position
  `match` inside a ^{} meta body. DEFAULT produces kind=match-stmt → meta-eval.ts serializeNode has
  NO match case → default branch → "" → match SILENTLY DROPPED (default emits ZERO divs, exit 0 —
  itself a latent default-path miscompile). NATIVE produces kind=bare-expr(exprNode=match-expr) →
  serializeNode bare-expr case → emitStringFromTree → RAW unlowered `match v.name {...}` → invalid JS
  → new Function throws E-META-EVAL-001. Both are wrong; native is just LOUD about it.
- SCOPE DISPOSITION: fixing meta-match requires meta-block match LOWERING in compiler/src/meta-eval.ts
  serializeNode (codegen work) AND changes DEFAULT behavior (would start emitting the divs default
  currently drops). That is OUT of this brief's "zero codegen, 3 edits" scope + alters the default
  path. NOT silently expanding. SURFACED to PA as a separate backlog item:
  "F2-meta-match-lowering — serializeNode has no match case; default silently drops, native errors."
- DEFERRED (also per brief): number-literal + boolean-literal arms (both silently drop on DEFAULT;
  need a live-side codegen addition; native deliberately recognizes string-only to avoid routing a
  boolean/number arm into the live silent-drop).
- NEXT: full-suite run (bun run test) + report.
