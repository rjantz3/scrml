# Derived-engine EXPRESSION form — `<engine for=T derived=match{}/expr>` (§51.0.J, L20)

change-id: `derived-engine-expression-form-2026-06-13`
Dispatched S190 (2026-06-13). Agent: `scrml-js-codegen-engineer`, isolation:worktree, model opus.
Closes `g-derived-engine-expression-form` (LOW; user ruled S190 "full feature build now").

You are implementing the §51.0.J derived-engine **expression form** end-to-end. This is a HALF-BUILT,
ENTANGLED feature — NOT greenfield. **Phase 0 (survey) is MANDATORY and has a HARD STOP gate** (below):
map the current state precisely and STOP to report if a design decision surfaces, rather than guessing.

---

# MAPS — REQUIRED FIRST READ

Read `.claude/maps/primary.map.md` in full. This is a **compiler-source feature build** spanning
parser (ast-builder) + type-system + symbol-table + dependency-graph + codegen. Follow the
Task-Shape Routing (structure/primary + error maps at minimum).

Map currency: maps watermark `a00624f5` (2026-06-12). HEAD is `11c648c7` (S189 wrap `ea7eea43` +
the S190 Cluster-C decl-boundary fix). Cluster-C touched `ast-builder.js` (`collectExpr` markup-RHS
boundary + a `tryParseStructuralDecl` `${}`-RHS reject + a `</>` double-decrement guard + a
`defChildren` stop-set) — your work also touches `ast-builder.js`, so grep/Read current source, don't
trust line numbers blindly.

Feedback in your report: "Maps consulted: [list]; load-bearing finding: <one sentence>" or
"Maps consulted but not load-bearing".

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (S99/S126 — IN FORCE)

1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. Else STOP
   (S90 CWD-routing). Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT. 3. `git status --short` clean.
4. `bun install`. 5. `bun run pretest`. Baseline via `bun run test` (chains pretest), NOT bare `bun test`.
- **Apply ALL edits via Bash** (`perl`/`python3`/`cp`/heredoc) on worktree-absolute paths that include
  the `.claude/worktrees/agent-<id>/` segment — NOT Edit/Write (leaked into MAIN before). Echo the
  path before each write; re-verify via `git diff`/`grep` after.
- **NEVER `cd` into the main repo.** Use `git -C "$WORKTREE_ROOT"`, run bun from WORKTREE_ROOT,
  worktree-absolute paths only.
- First commit message includes verbatim `pwd`: `WIP(derived-engine): start at <pwd>`.
- **De-risk (a prior dispatch died on a denied compound write):** keep file writes (`cat >> ... <<'EOF'`)
  and `git add`/`commit` as SEPARATE Bash calls — don't chain a redirect-write with `git add` via `&&`.
- Commit per sub-unit IMMEDIATELY; `git status` clean before DONE. Update
  `docs/changes/derived-engine-expression-form-2026-06-13/progress.md` (heredoc, append-only) each step.

---

# WHAT EXISTS / WHAT'S MISSING (PA scope — VERIFY in Phase 0)

**The feature (SPEC §51.0.J, READ IT IN FULL — ~line 25449):** a derived engine computes its variant
from a reactive EXPRESSION instead of authored writes. Canonical syntax (the SPEC's own flagship
example) is a JS-style match: `<engine for=Health derived=match @marioState { .Small | .Big => .Healthy
| .Fire => .AtRisk | _ => .Critical }>`. "Function calls and conditionals also work" — `derived=expr`
where expr is any reactive expression of the engine's type. Rules: `rule=`/`initial=`/direct-writes
REJECTED (E-DERIVED-ENGINE-NO-RULES/-NO-INITIAL/-NO-WRITE); state-child `effect=`/`<onTransition>`
LEGAL (fire on derived changes); opener `effect=` REJECTED (E-ENGINE-EFFECT-ON-DERIVED); absent-initial
= E-DERIVED-ENGINE-INITIAL-ABSENT; chained derivation legal, cycle = E-DERIVED-ENGINE-CIRCULAR.

**Confirmed current behavior at HEAD (PA-reproduced):**
- `derived=match @mario { .Small => .Healthy ... }` (arbitrary mapping) → **`E-ENGINE-018` "Derived
  machine does not project variant '.Small'"** (mis-routed to LEGACY machine-projection exhaustiveness).
- `derived=@miles > 500 ? .High : .Low` (ternary from a scalar cell) → **`E-ENGINE-004`** ("references
  source variable '@miles', but no machine-bound reactive" — the parser grabs `@miles` as a legacy
  source-var).
- `derived=@machineVar` where the source enum's variants NAME-MATCH the engine's (1:1 projection) →
  **WORKS end-to-end** (C14 substrate `_scrml_derived_declare/subscribe/get`). THIS MUST KEEP WORKING.

**The half-built reality (the entanglement — survey precisely):**
- **ast-builder.js ~13363–13760:** the engine-header parse. It ALREADY recognizes `derived=match @VAR
  {...}` — extracts a single `sourceVar` (the `@VAR`) + captures `inlineMatchBody` (RAW arm text; S171
  added arm-arrow lint coverage but the arms are NOT structured into match-arm nodes). The ternary/call
  forms do NOT parse — `derived=@miles > 500 ? ...` grabs `@miles` as `sourceVar`.
- **symbol-table.ts ~5194:** `engineMeta.derivedExpr` is ALWAYS set to `{ kind: "legacy-source-var",
  varName: sourceVar }`. This is THE GATE.
- **symbol-table.ts ~6821 `walkDerivedEngineDeclRejections` + dependency-graph.ts ~1038
  `buildEngineDerivedAdj` / ~1567:** the modern B16 rejections (E-DERIVED-ENGINE-NO-*) + DG cycle
  detection are WIRED but DORMANT — gated on `derivedExpr.kind !== "legacy-source-var"`, which never
  happens because of the line-5194 always-legacy tag.
- **type-system.ts ~5299–5358:** fires `E-ENGINE-018` (legacy derived-machine projection exhaustiveness
  — "every source variant must be projected"). This is what mis-fires on `derived=match`.
- **codegen — emit-engine.ts:** per the ast-builder comment (~13601) emit-engine "reconstructs `match
  @VAR {BODY}` and lowers it via rewriteExpr". SURVEY whether the match-form derived codegen actually
  RUNS + produces correct reactive recompute, or whether E-ENGINE-018 blocks it before codegen. The C14
  substrate (`_scrml_derived_declare`/`_scrml_derived_subscribe`/`_scrml_derived_get`) does the legacy
  1:1 projection (`subscribe("health","order")`). An arbitrary expression needs to subscribe to ALL
  cells the expr references + recompute the variant via the match/ternary/call.

---

# PHASE 0 — MANDATORY SURVEY + HARD STOP GATE

Before changing ANY code, survey + write a `SURVEY.md` in the change dir answering:

1. **Parse:** what does ast-builder produce TODAY for (a) `derived=match @x {...}`, (b) `derived=@x >
   500 ? .A : .B`, (c) `derived=classify(@x)` (call), (d) legacy `derived=@machineVar`? (the `sourceVar`,
   `inlineMatchBody`, any `derivedExpr` ExprNode?).
2. **Discrimination rule:** how will you distinguish a MODERN expression form from the LEGACY
   `derived=@machineVar` source-var form? (Proposal: a bare single `@ident` value = legacy 1:1
   projection [keep working]; anything else — `match @x {...}`, an operator expr, a call, a conditional
   — = modern `derivedExpr` ExprNode. Confirm this cleanly separates them and the legacy C14 path is
   untouched.)
3. **E-ENGINE-018 disentanglement:** exactly why does it fire on `derived=match`, and how do you stop
   it firing on the modern form WITHOUT breaking the legacy projection's genuine exhaustiveness? Is the
   modern form's exhaustiveness checked elsewhere (the match's own §18 exhaustiveness over the source
   type)?
4. **Codegen:** does emit-engine's match-reconstruction actually produce a working reactive recompute
   for the match form? For the ternary/call forms, what's the codegen path? (Reactive recompute =
   subscribe to every cell referenced in the derived expr; recompute the variant on any change; set the
   derived value. Reuse the C14 `_scrml_derived_*` substrate + the DG dep edges.)
5. **The B16 light-up:** confirm setting `derivedExpr.kind` to a non-legacy value lights up the
   E-DERIVED-ENGINE-NO-* rejections + DG cycle correctly (and that a derived engine with a `rule=` /
   `initial=` / direct-write now fires the RIGHT code, not E-ENGINE-018 / E-ENGINE-INVALID-TRANSITION).

**HARD STOP:** if Phase 0 reveals a genuine DESIGN DECISION (e.g. the legacy/modern discrimination is
ambiguous; the modern exhaustiveness semantics aren't pinned by SPEC; the codegen needs a substrate
design choice; disentangling E-ENGINE-018 risks the legacy projection), **STOP and report the SURVEY.md
+ the decision(s)** — do NOT guess. The PA will rule. If Phase 0 shows it's mechanical-once-mapped
(the discrimination is clean, codegen reuses the C14 substrate, exhaustiveness is the match's own),
proceed to build.

---

# BUILD (only after Phase 0 clears)

Target: `derived=match @x {...}` (arbitrary variant mapping) AND `derived=<expr>` (ternary / call /
conditional of the engine's type) parse into a non-legacy `derivedExpr`, route through the dormant B16
path, codegen a correct reactive recompute, and fire the right diagnostics — while the legacy
`derived=@machineVar` 1:1 projection + its C14 codegen KEEP WORKING UNCHANGED.

- Parser: produce a structured `derivedExpr` ExprNode (not raw text) for the modern forms.
- symbol-table: tag `derivedExpr.kind` non-legacy for modern forms → light up B16.
- type-system: stop E-ENGINE-018 mis-firing on modern forms; the modern form's exhaustiveness is the
  match's own §18 exhaustiveness over the source type (`E-MATCH-NOT-EXHAUSTIVE` / the `_`/`else` arm),
  NOT the legacy projection check.
- codegen: reactive recompute via the C14 `_scrml_derived_*` substrate + DG dep edges (subscribe to all
  referenced cells; recompute variant; set derived value).
- The E-DERIVED-ENGINE-NO-RULES/-NO-INITIAL/-NO-WRITE/-INITIAL-ABSENT + E-DERIVED-ENGINE-CIRCULAR +
  E-ENGINE-EFFECT-ON-DERIVED must all fire correctly for the modern form.

---

# RULE 4 — SPEC (read IN FULL before encoding)

- §51.0.J (~line 25449) — derived engines, the full rules table + the flagship match example.
- §51.0.B (~24634) opener attr table (`derived=expr` mutually exclusive with `initial=`); §51.0.E
  (initial= forbidden on derived); §51.0.C (auto-declared var); §51.0.G (.advance read-only on derived).
- §51.9 (legacy `<machine>` derived/projection — the E-ENGINE-018 source) — understand the boundary so
  you preserve legacy `derived=@machineVar` while routing modern forms away from it.
- §31 / §31.5 (~line 16327) — DG derived-engine edges + cycle detection.
- §18 / §18.0.x — match exhaustiveness (the modern form's exhaustiveness mechanism).
- §34 — the E-DERIVED-ENGINE-* + E-ENGINE-018 catalog rows. If any prose/row is wrong about the
  expression form, fix it (Rule 4). NO new §34 code expected (the E-DERIVED-ENGINE-* family already
  exists); if you find you need one, flag it.
- PRIMER §7 currently presents `derived=expr` as fully working — once it IS, that's correct; if you
  defer any sub-shape, add a caveat. PRIMER §13.7 B16 note records the deferral — update it to "landed".

If SPEC is silent/ambiguous on the modern form's semantics (exhaustiveness, absent-initial, codegen),
surface it in Phase 0 — do NOT paper over it.

---

# PHASE 3 — MANDATORY R26 EMPIRICAL VERIFICATION

Recreate + compile on your post-fix baseline; confirm the symptom table:

1. **Repros** (full `.scrml` files — recreate from these bodies):
   - `derived=match @mario {...}` arbitrary mapping (Mario Small/Big/Fire → Health Healthy/AtRisk/
     Critical) → compiles CLEAN; the Health variant reactively tracks @mario; emitted JS subscribes to
     `mario` + recomputes. (Was E-ENGINE-018.)
   - `derived=@miles > 500 ? .High : .Low` ternary → compiles CLEAN; Level tracks @miles. (Was E-ENGINE-004.)
   - legacy `derived=@machineVar` 1:1 name-identity projection → STILL CLEAN, unchanged C14 substrate
     (`_scrml_derived_subscribe("health","order")` etc.) — NO regression.
   - a derived engine with `rule=.X` on a state-child → `E-DERIVED-ENGINE-NO-RULES` (not E-ENGINE-018).
   - a derived engine with `initial=.X` → `E-DERIVED-ENGINE-NO-INITIAL`.
   - a direct write `@health = .Healthy` to a derived engine var → `E-DERIVED-ENGINE-NO-WRITE`.
   - a 2-engine derivation cycle (A derives from B, B from A) → `E-DERIVED-ENGINE-CIRCULAR`.
   - opener `effect=${...}` on a derived engine → `E-ENGINE-EFFECT-ON-DERIVED`; state-child `effect=` →
     LEGAL.
2. `node --check` exit 0 on all emitted client JS.
3. **Flagship** `examples/23-trucking-dispatch/` + any sample/example using `derived=` → re-compile,
   ZERO new errors/regressions. Grep the corpus for existing `derived=` usages and verify each.
4. **Full suite** `bun run test` (browser + self-host + commands matter — this touches engine codegen).
   0 fail. Report counts. Pay special attention to `c14-derived-engines.test.js`,
   `derived-engine-over-auto-declared.test.js`, `engine-statechild-b15.test.js` — they must stay green
   (or be updated coherently if behavior legitimately changed; explain each change).

Report the R26 table. **Do NOT mark DONE without R26 passing.**

---

# TESTS

- Regression tests for every modern-form case above + the legacy-still-works case. A coupled code+test
  commit is ONE logical unit. Put them with the engine tests (`c14-derived-engines.test.js` sibling, or
  a new `derived-engine-expression-form.test.js`).

# REPORT SHAPE
- WORKTREE_PATH, FINAL_SHA, BRANCH. FILES_TOUCHED.
- Phase-0 SURVEY.md summary + any design decisions surfaced (or "mechanical-once-mapped, proceeded").
- Per-stage: what changed (parser / symbol-table / type-system / DG / codegen) + why.
- R26 table (all repros + flagship + full-suite counts).
- Maps-consulted line. SPEC/PRIMER edits. Native-parser deferral note (feature-stale, ~v0.8 cutover).
- Confirm `git status` clean + first-commit `pwd` echo.
