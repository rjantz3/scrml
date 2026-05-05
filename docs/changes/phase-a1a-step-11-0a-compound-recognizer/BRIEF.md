# Phase A1a Step 11.0a — Variant C compound recognizer

**Status:** DRAFT — queued for dispatch. Surfaced by Step 11 smoke test as a deferred-from-Step-2 gap.
**Predecessor:** Step 11 (`bcca1e6`) memorialized 7 anti-test cases with `TODO[step-11.0a]` markers; flipping them requires this step to land.
**Estimate:** 2-3 h focused work. Single-file extension in `ast-builder.js` (`tryParseStructuralDecl` ~3528-3580 area).
**Authority:** SPEC §6.3 (Variant C compound state). AST contract: `docs/changes/phase-a1a-lex-parse/AST-CONTRACTS-AND-DECOMPOSITION.md` §1.1 (compound parent: `shape: "plain"`, `initExpr: null`, `children` populated; children are themselves state-decl nodes).
**Origin:** Step 2 progress.md lines 93-98 + 223-228 explicitly DEFERRED compound-block recognizer to "Step 11"; Step 11 was verification-only and surfaced this as the actual blocker.

---

## §1 What lands

`tryParseStructuralDecl` recognizes the Variant C compound form: when a `<NAME>` opener is followed by `>` AND the next non-trivia token is a state-decl-shape opener (`<sib>`/`</>` for compound close), build a compound state-decl AST node with `children` populated.

```scrml
<formRes>           // Step 11.0a: parser sees `<` IDENT `>` then a sibling `<` IDENT — compound!
    <name>  = ""    // child state-decl
    <email> = ""    // child state-decl
    <error> = ""    // child state-decl
</>                 // compound close
```

**Result:** parent state-decl with:
- `kind: "state-decl"`
- `shape: "plain"`
- `structuralForm: true`
- `initExpr: null`
- `children: [<name state-decl>, <email state-decl>, <error state-decl>]`

Each child is itself a state-decl node with its own `shape` discriminant per Step 4-5 contracts.

---

## §2 Scope

### §2.1 In-scope
1. Extend `tryParseStructuralDecl` lookahead: after consuming `<NAME>` and seeing `>`, peek the next non-trivia token. If it's `<` IDENT (a sibling decl) OR `</`(compound close), this is a compound parent — switch to compound-body parsing.
2. Compound-body loop: parse zero or more child state-decls (each via recursive `tryParseStructuralDecl`); terminate on `</>` or `</NAME>`.
3. Build the parent state-decl with `children` populated.
4. Update `compiler/src/types/ast.ts` if `children` field needs declaration on state-decl type.
5. Flip Step 11 anti-test memorials: 7 `TODO[step-11.0a]` cases become positive assertions.
6. Add ~3-5 NEW positive cases for compound-specific shapes (nested compound, compound with mixed Shape 1/2/3 children).

### §2.2 Out-of-scope
- Resolver/typer for Variant C compound — A1b B5+B11 (compound classifier + validity-surface synthesis).
- Codegen for nested reactive proxy — A1c C21.
- Variant C field-write semantics (`@formRes.name = "..."`) — already works via existing member-assignment path; verify regression-clean.

---

## §3 Survey-first mandate (depth-of-survey discount; **9× confirmed locus** — incl. Step 11's discovered-blocker shape)

Step 11 was supposed to be Discount #9 (zero-source verification) but surfaced this gap. **Step 11.0a is the actual #9 candidate** — survey may reveal `parseLogicBody` already has a partial compound-body recognizer that just needs wiring.

Survey questions:
1. Locate `tryParseStructuralDecl` ~lines 3528-3580 (per Step 11 progress.md hand-off). Document file:line + the lookahead logic Step 6 + Step 7 left.
2. Read Step 2's progress.md lines 93-98 + 223-228 — what was the precise boundary of Step 2's deferral? Are there any partial-compound hooks already in place?
3. Probe an existing sample using Variant C compound (search `samples/compilation-tests/` for `<form>... <name>=...` compound patterns). If samples exist that compile-clean today, what is the AST output? If they parse as html-fragment, the gap is uniform.
4. Confirm nested compound (`<form><inner><field>=""</></></>`) is in-scope — recursive `tryParseStructuralDecl` should handle.
5. Confirm interaction with Step 4 `shape` discriminant: compound parent has `shape: "plain"` per AST contract §1.1; children have their own per-child shapes.

**You are AUTHORIZED** to correct the touchpoint if survey reveals divergent locus.

Document survey findings in `$WORKTREE_ROOT/docs/changes/phase-a1a-step-11-0a-compound-recognizer/progress.md` BEFORE source edits.

---

## §4 Test plan

Update `compiler/tests/integration/kickstarter-v2-smoke.test.js` — flip the `TODO[step-11.0a]` memorials to positive assertions. Then add to `compiler/tests/integration/parse-shapes-v0next.test.js` or a new file:

- §S11A.1: simple compound `<formRes><name>=""<email>=""</></>` — parent shape:"plain", children of length 2, each child shape:"plain"
- §S11A.2: compound with mixed shapes — `<form><name req>=<input/><const><doubled>=@count*2</></>` — parent + Shape 2 child + Shape 3 child
- §S11A.3: nested compound — `<outer><inner><leaf>=0</></></>` — recursion check
- §S11A.4: empty compound `<empty></>` — children: []
- §S11A.5: compound + sibling top-level decls — compound parses cleanly; sibling top-level decls unaffected
- §S11A.6: anti-html-fragment guard — every positive case asserts NOT parsed as html-fragment
- §S11A.7: regression baselines — Shape 1, Shape 2, Shape 3 single-decl forms still work (Step 4-6 baselines preserved)

Aim: ~5-8 new cases + 7 flipped memorials = ~12-15 net positive cases.

---

## §5 Definition of done

1. ✅ `compiler/src/ast-builder.js` `tryParseStructuralDecl` recognizes Variant C compound shape.
2. ✅ `compiler/src/types/ast.ts` extended if `children` field needs declaration.
3. ✅ Step 11's 7 `TODO[step-11.0a]` memorials FLIPPED to positive assertions (no longer skipped).
4. ✅ ~5-8 new compound-specific cases added.
5. ✅ Anti-html-fragment guard on every positive case.
6. ✅ Pre-commit + full `bun run test`: 0 fail, 43 skip, 0 regressions on existing 8,845. Delta +12 to +15 pass.
7. ✅ Branch clean. NO `--no-verify`.
8. ✅ progress.md updated.

---

## §6 Branch + commit hygiene

- Per-step branch: `phase-a1a-step-11-0a-compound-recognizer`, parented from main HEAD at dispatch time.
- Commit early/often. WIP commits expected:
  - `WIP(a1a-step-11-0a): survey notes`
  - `WIP(a1a-step-11-0a): tryParseStructuralDecl compound-body branch`
  - `WIP(a1a-step-11-0a): types update if needed`
  - `WIP(a1a-step-11-0a): flip Step 11 anti-test memorials + add new cases`
  - Final: `compile(a1a-step-11-0a): Variant C compound recognizer`
- After EACH meaningful step, append timestamped line to `progress.md`. Format: `[HH:MM step-11-0a <slug>] <what just happened>`.

---

## §7 Risk surface

- **Recursive parsing depth** — nested compounds need recursion. If `tryParseStructuralDecl` doesn't recurse cleanly, a refactor may be needed.
- **Compound vs html-tag disambiguation** — `<form>...</>` could be html element OR compound state. Disambiguator: presence of state-decl-shape children. Survey-first verifies the existing parser doesn't have this conflict.
- **Compound + close-tag forms** — `</NAME>` (named close) vs `</>` (anonymous close). Both must be accepted; spec is authoritative on whether named must match parent.

---

## §8 Tags

#phase-a1a #step-11-0a #variant-c-compound #parser-only #step-2-deferral #step-11-escalation
