# ss16 — PongAI cluster: C5 ctor-arg typing · C4 ==-vs-payload-variant lint · C3 render shadowing

**Dispatched:** 2026-06-22 (sPA ss16) · **Agent:** scrml-js-codegen-engineer · isolation:worktree · model:opus
**Land target:** branch `spa/ss16` (sPA file-deltas; agent does NOT touch main)
**Base:** main HEAD `1ce8de34`. All three bugs RE-VERIFIED to reproduce on this exact HEAD by the sPA (repros below).

You are fixing THREE related PongAI adopter bugs in the type-system + codegen-expr + lint layer. Do them
**in order C5 → C4 → C3**, **one commit per item** (incremental, crash-recovery). They share ingestion
(type-system variant typing + emit-expr + the `log`-shadowing precedent) but touch DIFFERENT functions, so
sequential edits do not conflict. Each bug already has a confirmed reproducer + root cause below — your job
is the fix + the test + (where noted) the SPEC row.

R4 reminder: SPEC.md is normative. For each item read the named SPEC section IN FULL (offset+limit) before
encoding behavior. Derived claims in this brief are sPA-verified but you re-confirm against SPEC.

---

## ITEM 1 — C5: bare dot-variant ctor-arg typed against the OUTER enum  · type-system.ts only

**Reproducer** (`.repro-ss16/c5.scrml`, confirmed FAILS on HEAD `1ce8de34`):
```
type Difficulty:enum = { Easy, Hard }
type Mode:enum = { OnePlayer(difficulty: Difficulty), TwoPlayer }
<mode>: Mode = .OnePlayer(.Easy)
<out> = @mode
```
→ `E-TYPE-063: .Easy is not a declared variant of enum Mode`. **Expected: clean compile** — `.Easy`
should type against `Difficulty` (the `OnePlayer` ctor param type), not `Mode`.

**Root cause (verified).** The flat walker `inferBareVariantsInExpr` (type-system.ts ≈11657) resolves
EVERY bare-variant ident in the expr tree against ONE `contextType` (the LHS enum `Mode`), including the
ctor ARGUMENT `.Easy`. The ctor-arg position should instead supply the variant's payload-field type
(`Difficulty`) as the context.

**The infra already exists — you are EXTENDING it, not building from scratch:**
- `inferBareVariantsAtCallArgs` (≈12877, "S84 Gap B.4") already does per-arg paramType dispatch — but ONLY
  for FUNCTION-decl callees (looked up via `fnSignatures`). A variant-constructor callee
  (`.OnePlayer` or `Mode.OnePlayer`) is NOT in `fnSignatures` → silent fall-through → the flat walker then
  mis-resolves the arg. It is invoked at the let/state/reactive/return/if positions (≈8743, 9161, 9353,
  9914, 10201).
- `inferBareVariantsForStructConstructor` (≈8765) is the CLOSEST precedent: it already does field-typed
  descent for STRUCT constructors. Enum-payload-variant ctor is the direct analog.
- `VariantDef.payload` (≈477) is `Map<string, ResolvedType> | null` — the payload FIELD TYPES are right
  there per variant (e.g. `OnePlayer.payload = { difficulty → Difficulty }`).
- The dedup flag `_bareVariantInferredAtBinaryExpr` (stamped by the call-args walker ≈12921-12927) makes
  the flat walker SKIP an already-resolved arg ident (checked at ≈11682). Reuse it.

**Fix (your call on exact placement — extend `inferBareVariantsAtCallArgs`, or add a sibling mirroring
`inferBareVariantsForStructConstructor`):** for a `call` node whose callee is a variant constructor —
  - bare `.Variant` → resolve against the **contextType enum** (the LHS-driven type) to find the `VariantDef`;
  - qualified `Enum.Variant` (and `Enum::Variant` if it parses to a member/qualified node) → resolve the
    enum in the type registry, then the `VariantDef`;
dispatch each positional arg `i` to `inferBareVariantsInExpr(arg_i, payloadFieldType_i, ...)` using
`VariantDef.payload` values (in declared order), and stamp `_bareVariantInferredAtBinaryExpr` on bare-variant
arg idents so the flat walker skips them. This is the same shape as the fn-call path; the only new thing is
recognizing the variant-ctor callee + sourcing param types from `VariantDef.payload` instead of `fnSignatures`.
You will likely need to thread the `contextType` (and/or the type registry) into the walker — note the fn-call
walker currently receives only `fnSignatures`.

**SPEC (R4):** §14.10 Bare-variant inference (SPEC.md ≈8116). The code comment at ≈11636-11637 explicitly
DEFERS "positions 3 (param) and 4 (return)" to a follow-up — C5 IS position-3 (ctor param). If §14.10's prose
enumerates the positions, add ctor-arg/param as now-covered (the comment says extending §14.10 prose is owed).
Keep the change minimal + cite the section in the commit.

**Acceptance:** `.repro-ss16/c5.scrml` compiles clean (no E-TYPE-063, no E-VARIANT-AMBIGUOUS). Add a
conformance/integration test asserting clean compile for the nested ctor-arg bare-variant. ALSO verify a
TRUE typo still errors (e.g. `.OnePlayer(.Nope)` → E-TYPE-063 against `Difficulty`, not `Mode`) — the fix
must not silence real errors, just re-point the context. Confirm `match`-bound payloads are unaffected
(don't regress the ≈10705 arm-field-type path).

---

## ITEM 2 — C4: `==`/`!=` vs a payload-variant CONSTRUCTOR → always-false, silent  · type-system.ts (+ SPEC)

**Reproducer** (`.repro-ss16/c4.scrml`, confirmed CLEAN-but-wrong on HEAD `1ce8de34`):
```
type Phase:enum = { Idle, Serving(angle: int) }
<phase>: Phase = .Idle
<stuck> = @phase == Phase.Serving
<out> = @stuck
```
→ compiles clean (only an unrelated `E-DG-002` unused-var warning), emits
`_scrml_structural_eq(_scrml_reactive_get("phase"), Phase.Serving)` where `Phase.Serving` is the ctor
FUNCTION → the comparison is ALWAYS FALSE, and NO lint fires.

**Root cause (verified).** `emit-expr.ts:1047` lowers `==` to `_scrml_structural_eq(left,right)` — this is
CORRECT per §45.4 and must NOT change. The missing piece is a **type-system lint** that detects when an
operand of `==`/`!=` is a PAYLOAD-variant constructor (a bare `Enum.Variant`/`Enum::Variant` reference whose
`VariantDef.payload != null`, i.e. the ctor function, NOT a unit variant which is a string). UNIT variants
compare fine (they're string tags) — only PAYLOAD-variant constructors bite.

**Fix.** Add an info/warning-level lint (you decide W- prefix + severity per the diagnostic-stream partition
rule: W-/I- prefix + severity warning|info → `result.warnings`, non-fatal). Detect `==`/`!=` BinaryExpr where
an operand is `Enum.Variant` resolving to a payload-carrying `VariantDef`. Message: steer to `is .Variant`
(variant-tag check) or `match`. Suggested code name `W-EQ-PAYLOAD-VARIANT` (confirm no collision in §34).
Given it silently produces an always-false branch (a runtime footgun worse than `log`-shadowing), warning-level
is defensible — your call, justified in the commit.

**Placement:** there is already a comparison-site bare-variant walker `inferBareVariantsAtComparisonSites`
(referenced ≈11673) that handles `@cell == .Variant`. C4 is the sibling case (`@cell == Enum.Variant` payload
ctor) — colocate there or in a sibling pre-pass over `==`/`!=` nodes. (Note: no `E-EQ-001`-style equality
type-check is wired in the typer today for this case — confirm before assuming one to extend.)

**SPEC (R4):** §45 Equality (SPEC.md ≈22174); §45.7 Error Codes (≈22221); §45.8 Normative Statements (≈22233).
Add the new code as a §45.7 row AND a §34 catalog row (≈16835; copy the W-LOG-SHADOWED row format at ≈16880).
Add a one-line §45 normative statement that `==`/`!=` against a payload-variant constructor is a lint.

**Acceptance:** `.repro-ss16/c4.scrml` still compiles (non-fatal) but NOW emits the new lint into
`result.warnings`. Add a test asserting the lint fires for payload-variant `==`, and asserting it does NOT
fire for (a) a UNIT-variant `==` (`@phase == Phase.Idle` — legal) and (b) `@phase is .Serving` (the correct
form). Cross-stream assert (W-/I- → `result.warnings`, NOT `result.errors`) per the diagnostic-stream rule.

---

## ITEM 3 — C3: user `function render` mis-encoded (def `_scrml_render_N` vs call `_scrml_render`)  · MIRROR `log` shadowing

**Reproducer** (`.repro-ss16/c3.scrml`, confirmed mismatch on HEAD `1ce8de34`):
```
function render() {
  log("drawing")
}
function loop() {
  render()
}
```
→ def emits `function _scrml_render_1()`, call emits `_scrml_render()` (defined nowhere) → ReferenceError at
runtime; compiles clean.

**Root cause (verified end-to-end).** `emit-expr.ts:1726` UNCONDITIONALLY hijacks any `render(...)` call →
`_scrml_render(${args})` (the client component-render builtin). Meanwhile the user `function render` def is
emitted as `_scrml_render_1` via §47 name encoding (`genVar`, emit-functions.ts ≈962). Normal user-fn calls
(e.g. `loop()`) emit as plain `loop()` and a POST-PASS (emit-client.ts ≈1845-1866) rewrites `\bloop\b` →
`_scrml_loop_N` via `fnNameMap`. But the render hijack short-circuits this: it emits `_scrml_render` directly,
which the post-pass's word-boundary regex `\b(name)\b` CANNOT match (no boundary before `render` after `_`),
so the call is never repaired → def/call mismatch.

**Fix = MIRROR the `log`-shadowing precedent EXACTLY** (this is the canonical "yield to a user fn of a reserved
builtin name + fire a shadow lint" pattern). Read these first — they ARE the template:
- `emit-expr.ts` `_logShadowedInFile` flag (≈74) + `setLogShadowedInFile` (≈77) + the shadow guard inside the
  `log` lowering (≈1747-1758: `userDeclaredLog = _logShadowedInFile || ctx.declaredNames?.has("log")` → emit
  the plain user call, builtin steps aside).
- `log-loc.ts` `fileDeclaresLog` (≈123) — the file-AST walk for a `function log`/`fn log` decl.
- `codegen/index.ts` ≈587 + ≈760: `setLogShadowedInFile(fileDeclaresLog(fileAST));` wiring.
- `type-system.ts` `checkLogShadowing` (≈4022) firing info-level `W-LOG-SHADOWED`, called at ≈18463.
- SPEC §20.6.7 (SPEC.md ≈14190-14204) — the W-LOG-SHADOWED normative prose; §34 catalog row at ≈16880.

**Concretely:**
1. `emit-expr.ts`: add `_renderShadowedInFile` flag + `setRenderShadowedInFile(on)` (mirror log). Guard the
   hijack at 1726: `const userDeclaredRender = _renderShadowedInFile || !!(ctx.declaredNames && ctx.declaredNames.has("render"));`
   — when shadowed, DO NOT emit `_scrml_render(...)`; fall through to the generic call path (the `callee` at
   ≈1717 is already `emitReceiver(node.callee)` → emits `"render"`, which the fnNameMap post-pass rewrites to
   `_scrml_render_1`, matching the def). Verify the emitted call becomes `_scrml_render_1()`.
2. `log-loc.ts` (or wherever you prefer — mirror `fileDeclaresLog`): add `fileDeclaresRender(fileAST)`. Consider
   generalizing `fileDeclaresLog` to a shared `fileDeclaresFn(fileAST, name)` helper used by both — your call,
   keep it clean.
3. `codegen/index.ts`: at BOTH ≈587 and ≈760, add `setRenderShadowedInFile(fileDeclaresRender(fileAST));`.
4. `type-system.ts`: add `checkRenderShadowing` (mirror `checkLogShadowing`) firing info-level
   `W-RENDER-SHADOWED` at the `function render` declaration; call it next to `checkLogShadowing` at ≈18463.
5. SPEC (R4): add a §34 catalog row for `W-RENDER-SHADOWED` (copy the W-LOG-SHADOWED row format) AND short
   normative prose mirroring §20.6.7 (a user-declared in-scope `render` wins; builtin steps aside; info-level
   lint; `render` is NOT a reserved identifier — `reset` is the hard-reserved one, `log`/`render` are
   shadowable-with-lint). Home the prose near the render() builtin's spec section (find it; §47 is the name
   ENCODING, not the builtin def — locate where `render()` the client builtin is documented).

**Acceptance:** `.repro-ss16/c3.scrml` compiles clean AND the emitted `c3.client.js` has the call site as
`_scrml_render_1()` (matching the def) — `node --check` clean + grep confirms def/call names match. The
info-level `W-RENDER-SHADOWED` fires at the `function render` decl (→ `result.warnings`). Add a test:
(a) user `function render` → call resolves to the user fn + lint fires; (b) NO user `render` → `render(...)`
still lowers to the `_scrml_render` builtin unchanged (don't break the real component-render builtin).

---

## Startup verification (F4 — MANDATORY, do FIRST)

1. `pwd` — confirm you are in YOUR isolation worktree (a `.claude/worktrees/agent-*` path), NOT
   `/home/bryan-maclee/scrmlMaster/scrml` (main) and NOT `../scrml-spa-ss16`.
2. `git rev-parse --abbrev-ref HEAD` (your own agent branch); `git rev-parse --short HEAD` should be `1ce8de34` (the base).
3. `git merge origin/main` is NOT needed (base already == current main). Symlink deps so the test/pre-commit
   gate resolves (fresh worktree has no node_modules):
   ```
   ln -s /home/bryan-maclee/scrmlMaster/scrml/node_modules ./node_modules
   ln -s /home/bryan-maclee/scrmlMaster/scrml/compiler/node_modules ./compiler/node_modules
   rm -rf ./samples/compilation-tests/dist 2>/dev/null; ln -s /home/bryan-maclee/scrmlMaster/scrml/samples/compilation-tests/dist ./samples/compilation-tests/dist
   ```
4. ALL file writes use paths INSIDE your worktree (relative, or your worktree-absolute path). NEVER write to a
   `/home/bryan-maclee/scrmlMaster/scrml/...` (main) absolute path — that is the S99 leak class. Verify with
   `stat` + read-back after each write. (Note: Bash heredoc/perl writes bypass the path-discipline hook — be
   disciplined manually.)

## Commit discipline

- ONE commit per item (C5, then C4, then C3) — incremental, crash-recovery. WIP commits within an item are fine.
- Coupled code+test = ONE commit (the fix + its test land together). The SPEC row lands in the same commit as
  the code that fires the new code.
- Create + update `docs/changes/ss16-pongai-c3c4c5-2026-06-22/progress.md` after each step (append-only, timestamped).
- `git status` clean before you report DONE.
- NEVER `--no-verify`. The pre-commit hook runs unit+integration+conformance (excludes browser) — it is the gate.

## Scope guard

ONLY these files: `compiler/src/type-system.ts`, `compiler/src/codegen/emit-expr.ts`,
`compiler/src/codegen/log-loc.ts`, `compiler/src/codegen/index.ts`, `compiler/SPEC.md`, and your new/updated
test files under `compiler/tests/`. If a fix needs anything else (e.g. emit-functions.ts, expression-parser.ts),
STOP and report it as a mis-scope to flag — do not push it through silently.

## Report back

Agent branch name + tip SHA, the per-item commit SHAs, exact files changed per item, and per-item: the repro
now passes (paste the compile result), the new test passes, and the full pre-commit gate is green. If any item
cannot be fixed within scope, report it as a parked sub-finding with the reason (do NOT force it).
