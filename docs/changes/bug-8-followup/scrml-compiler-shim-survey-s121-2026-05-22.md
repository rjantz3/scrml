---
status: current
last-reviewed: 2026-05-22
session: S121
agent: scrml-deep-dive (Wave 7 Unit E)
parent-bug: 8
---

# `scrml:compiler` shim resolution — survey memo (Wave 7 Unit E)

## 1. Summary

**Recommendation: (d) — defer indefinitely, formalize as KNOWN-DEFERRED.**

The `scrml:compiler` umbrella plus its 13 per-stage siblings (`scrml:compiler/bs`,
`scrml:compiler/tab`, …, `scrml:compiler/cg`) is the only shim class in the stdlib
whose runtime surface IS the live compiler. The .scrml sources stub each stage as a
pass-through `await import("../../compiler/src/<stage>.{js,ts}")` from the .scrml
file's repo location. That pattern works for the in-tree compile-time test surface
(library-mode `libraryJs` emission), but fails for any out-of-tree adopter because
the bundler copies a single shim file to `<outputDir>/_scrml/<name>.js` while the
shim's resolution targets (`../../compiler/src/*.ts`) are pinned to the source repo,
not to the adopter's tree.

Critical findings:

1. **There are zero actual adopters.** `grep -rn 'from "scrml:compiler' …` outside
   `stdlib/compiler/` returns nothing. The 3 self-host files in `compiler/self-host/`
   mention `scrml:compiler/*` ONLY in header docstrings, not in `import` statements.
   The only consumer is `compiler/tests/unit/compiler-api.test.js`, which calls
   `compileScrml` with `mode: "library", write: false` — i.e., asserts that emitted
   library JS contains the right `export const` lines, but never resolves or invokes
   a bundled shim.
2. **The deferred placeholder is currently load-correct but invoke-fatal.**
   `compiler/runtime/stdlib/compiler.js` ships 17 named exports, each a thunk that
   throws a clear-attribution error pointing at "use the CLI or import directly from
   compiler/src/api.js". The W-STDLIB-SHIM-MISSING test
   (`compiler/tests/unit/stdlib-shim-resolution.test.js` line 73 includes `compiler`)
   passes because the shim file exists on disk and bundles to `_scrml/compiler.js`;
   no runtime-invoke assertion fires.
3. **The gap is broader than the umbrella.** All 13 per-stage .scrml stubs
   (`bs.scrml`, `tab.scrml`, `mod.scrml`, `ce.scrml`, `bpp.scrml`, `pa.scrml`,
   `ri.scrml`, `ts.scrml`, `mc.scrml`, `me.scrml`, `dg.scrml`, `cg.scrml`,
   `expr.scrml`) use the same `await import("../../compiler/src/...")` pattern and
   none of them have a runtime shim under `compiler/runtime/stdlib/compiler/`. The
   bundler would currently emit `W-STDLIB-SHIM-MISSING` for any
   `scrml:compiler/<stage>` import — but again, no adopter exists to trigger this.
4. **Option (a) is structurally costly and not the right shape.** No npm publish
   pipeline exists (`scrmlts` and `compiler` are both `"private": true`).
   Publishing `scrml/compiler` requires monorepo posture changes (publish target,
   scope reservation, versioning policy), and the shim would still need an
   internal resolution shim — it doesn't actually eliminate the bundler-relative
   path problem, only relocates it.
5. **Option (b) is technically tractable but speculative.** The bundler already
   recursively copies sub-trees alongside umbrella shims (the oauth pattern: see
   `bundleStdlibForRun` lines 320-328 — `copyTree(subDir, dstSub)`). The same
   mechanism could copy `compiler/src/` into `_scrml/_compiler-host/` conditional
   on `scrml:compiler` being referenced. But this ships 6 MB of compiler source
   (including .ts files requiring bun runtime resolution) into every adopter's
   build, for a zero-adopter feature, and rewrites the .scrml-source's
   `await import("../../compiler/src/...")` paths to point into the bundled tree.
6. **Option (c) is non-viable.** The compiler surface is ~48,657 lines across 14
   stage files. "Re-implement at the JS shim level" is the compiler itself.

Per Rule 3 (right beats easy): (d) is also the easy answer here, AND it is the
structurally correct answer. (b) is the structurally-correct fix for a problem
nobody actually has; (a) bends the entire monorepo posture for a feature with
zero validated demand; (c) is a category error. The right thing is to formalize
the deferral so the gap is visible at compile time the day an adopter does want
to use this — not to ship 6 MB of compiler source on speculation.

---

## 2. Current state

### 2.1 What `stdlib/compiler/index.scrml` claims to expose

The umbrella (`stdlib/compiler/index.scrml`, 74 lines) re-exports a 16-symbol
surface across two categories:

- **Full pipeline (2):** `compileScrml`, `scanDirectory`
- **Stage entry points, pipeline order (12):** `splitBlocks`, `buildAST`,
  `resolveModules`, `runCE`, `runBPP`, `runPA`, `runRI`, `runTS`, `runMetaChecker`,
  `runMetaEval`, `runDG`, `runCG`
- **Expression parser utilities (2):** `parseExpression`,
  `extractIdentifiersFromAST`

The .scrml source itself is a thin re-export shim. Inside a single `^{}` meta block,
it does 14 separate `await import("../../compiler/src/<stage>.{js,ts}")` calls
binding each symbol to a `_<name>` local, then `export const <name> = _<name>`.
Conceptually it is "aspirational" only insofar as the underlying mechanism (.scrml
re-exports of `await import`-bound TS modules) is itself partial in stdlib
codegen — but the SURFACE is concrete and matches what
`compiler/src/api.js` exports.

### 2.2 What the deferred placeholder does

`compiler/runtime/stdlib/compiler.js` (53 lines):

```js
function _unavailable(name) {
  throw new Error(
    `[scrml:compiler] ${name}() is not available at runtime via the scrml:compiler shim. `
      + `The scrml:compiler umbrella module is currently DEFERRED — it requires either an installable `
      + `compiler package (scrml/compiler) or a compile-time path-rewriter for the bundled shim. `
      + `For now, invoke the compiler via the CLI (\`scrml compile\`) or import directly from `
      + `the compiler-source path in tooling code: import { compileScrml } from "<...>/compiler/src/api.js".`,
  );
}

export const compileScrml = (...args) => _unavailable("compileScrml");
export const scanDirectory = (...args) => _unavailable("scanDirectory");
// ... 15 more thunks
export const extractIdentifiersFromAST = (...args) => _unavailable("extractIdentifiersFromAST");
```

The shim ships 17 exports (one extra: `parseExpression`'s pair). Every export is
a thunk that throws a clear-attribution error citing the two viable resolution
paths. **Loud failure with full attribution.** This is the canonical
"shim-only-the-working-surface" close-shape for partial / aspirational stdlib
modules per Bug 8's brief.

### 2.3 What an adopter would see today

If an adopter writes `import { compileScrml } from "scrml:compiler"` and calls
`compileScrml({...})`, they get:

- ✅ Compile: 0 errors, 0 W-STDLIB-SHIM-MISSING warnings (shim file exists on
  disk, so the bundler copies it to `_scrml/compiler.js` and rewrites the
  import).
- ❌ Runtime: an `Error` thrown from `_unavailable("compileScrml")` with the
  attribution message above.

If an adopter writes `import { runPA } from "scrml:compiler/pa"`:

- ⚠️ Compile: 0 errors, BUT 1 `W-STDLIB-SHIM-MISSING` (no
  `compiler/runtime/stdlib/compiler/pa.js` file exists). The literal
  `scrml:compiler/pa` survives the import-rewrite.
- ❌ Runtime: Node's resolver rejects the `scrml:` scheme; module fails to load.

**There is no adopter today.** Confirmed via:

```
$ grep -rn 'from "scrml:compiler' scrmlTS/ \
    --include="*.scrml" --include="*.js" --include="*.ts" \
    --exclude-dir=node_modules --exclude-dir=.claude/worktrees \
    | grep -v "/stdlib/compiler/" \
    | grep -v "compiler-api.test.js"
(no results)
```

The 3 self-host files (`compiler/self-host/{ast,meta-checker,module-resolver}.scrml`)
mention `scrml:compiler/<name>` only in header `//` docstrings; their actual
`^{} await import` statements target sibling `./<name>.js` paths within the
self-host tree, not the umbrella.

---

## 3. The four options

### Option (a) — Installable `scrml/compiler` (or `@scrml/compiler`) npm package

**Shape.** Set up npm-publish pipeline for a package that exports the compiler's
public surface. The shim becomes:

```js
// compiler/runtime/stdlib/compiler.js
export { compileScrml, scanDirectory, splitBlocks, /* … */ } from "scrml/compiler";
```

The adopter's emitted output transitively `import`s `scrml/compiler` from
node_modules, just like `oauth` or `fs` — except the surface is the entire
compiler.

**Cost.**
- Monorepo posture change: `scrmlts` is `"private": true`, `compiler` is
  `"private": true`. Both need publish-ready packaging.
- Naming + scope reservation: `scrml` is unclaimed on npm; `@scrml/compiler`
  would need scope reservation. Project name `scrmlts` suggests the npm
  identity is undecided.
- Versioning policy: stage internals (e.g., `runRI`, `runTS`) are not API-stable;
  publishing them as a versioned package commits to semver discipline at the
  stage level.
- Build pipeline: `compiler/src/` contains 14 .ts files. The published artifact
  needs to either ship the .ts (requiring consumer bun) or compile to .js
  first. Today's CLI consumes .ts directly via bun.
- Adopter side: `bun add @scrml/compiler` becomes a precondition for any adopter
  who imports `scrml:compiler`. Today's adopter just runs `scrml compile` and
  expects the import to resolve.

**Risk.** High lock-in cost for a zero-adopter feature. Premature
external-API commitment to stage internals that are still actively churning
(the M5 native-parser swap, P5×9 fixes in the last 14 commits, ongoing
self-host work).

**Fit.** Wrong shape. Even when adopters DO want `scrml:compiler`, the
right answer is probably "the same way `scrml:fs` works — bundled, no install
step." Forcing an npm install discriminates this module against every other
stdlib module.

### Option (b) — Compile-time path-rewriter + bundled compiler-source subtree

**Shape.** Extend `bundleStdlibForRun` so that when `scrml:compiler` (or any
`scrml:compiler/*`) is referenced:

1. Copy `compiler/src/` recursively to `<outputDir>/_scrml/_compiler-host/`
   (similar to the oauth sub-tree pattern at `bundleStdlibForRun` lines 320-328).
2. Rewrite the deferred shim's `_unavailable()` body to instead `await import`
   from `./compiler/_compiler-host/api.js` (relative to the shim's bundled
   location at `_scrml/compiler.js`).
3. Apply the same rewrite to per-stage shims if added (`_scrml/compiler/bs.js`
   re-resolves to `_compiler-host/block-splitter.js`).
4. Add per-stage shim files for the 13 stages, mirroring the umbrella pattern.

**Cost.**
- ~6 MB of compiler source copied into every build that references
  `scrml:compiler`. Conditional — only fires when the import is detected.
- 13 new per-stage shim files at `compiler/runtime/stdlib/compiler/<stage>.js`,
  each a thin re-export.
- 1 umbrella shim rewrite (`compiler.js` swaps from thunks to real re-exports
  through the bundled host).
- `bundleStdlibForRun` extension: when copying a name with a sibling directory,
  it ALREADY does this for `oauth`. The novel work is the conditional injection
  of `_compiler-host/` (the compiler tree isn't structurally a sibling of
  `compiler.js` under `compiler/runtime/stdlib/`).
- Bundler needs to know the location of `compiler/src/` (resolve from
  `import.meta.url` like `STDLIB_RUNTIME_DIR` already does — line 65-66 in
  `api.js`).
- Runtime: adopter MUST run under bun (the bundled tree includes .ts files).
  Today, every adopter does anyway, so this is not a regression.

**Risk.** Medium. The mechanism is well-precedented (oauth sub-tree copy).
Worry: shipping a 6 MB compiler tree into adopter `dist/` for any adopter
who imports a single function from `scrml:compiler` is a significant
artifact tax. Conditional copying mitigates this — but adopters who write
build-tooling apps WILL want this, by definition. Worry 2: the .ts source
in the bundled tree pins the adopter to bun forever, with no fallback for
node consumers.

**Fit.** Structurally correct for the long-term "build tools written in
scrml" story. Premature in M16+ scoping (no adopter exists). Right answer
WHEN demand materializes, but not before.

### Option (c) — Re-implement at the JS shim level (hand-write the compiler surface)

**Shape.** `compiler/runtime/stdlib/compiler.js` doesn't proxy to compiler
source at all. It IS the compiler — a 48,657-line hand-written module that
duplicates BS/TAB/MOD/CE/BPP/PA/RI/TS/MC/ME/DG/CG.

**Cost.** Categorically infeasible. The compiler surface IS the compiler;
this option is "ship a second copy."

**Risk.** N/A.

**Fit.** Category error. Discarded.

### Option (d) — Formalize as KNOWN-DEFERRED

**Shape.**

1. Leave `compiler/runtime/stdlib/compiler.js` as the loud-failure-with-attribution
   thunk shim it is today (no change to runtime behavior).
2. Add a NEW lint code, `W-STDLIB-COMPILER-DEFERRED` (or piggyback on the
   existing `W-STDLIB-SHIM-MISSING` by special-casing the `compiler` name to
   emit a deferral-flavored variant), fired at compile time when an adopter's
   import set contains `scrml:compiler` or `scrml:compiler/*`. The message
   includes the same two-path attribution as the thunks: "use the CLI" / "import
   from compiler/src/api.js directly."
3. SPEC §34 adds the new code with a §41 cross-reference. SPEC §41 (stdlib
   catalog) gets a `compiler` row marked DEFERRED with a forward pointer to
   the resolution-options memo (this file).
4. The .scrml source files in `stdlib/compiler/` stay — they're useful as
   library-mode-codegen test surface AND as the spec'd target surface that a
   future option-(b) dispatch can lift from placeholder to real.
5. Document the deferral in `compiler/runtime/stdlib/compiler.js` header
   (already done) and in a top-level KNOWN-DEFERRED ledger entry (probably
   `docs/changes/corpus-sweep/PLAN.md` or a new
   `docs/known-deferred.md`).

**Cost.** Trivial. ~50 lines of code: one new lint code, one bundler-side
detection branch (`if (name === "compiler" || name.startsWith("compiler/"))`),
one SPEC row, one test case.

**Risk.** Low. The deferral is already de-facto; this just makes it
spec-of-record and adds a compile-time signal so an adopter who tries to use
`scrml:compiler` learns about the limitation BEFORE deploying instead of at
runtime via a thrown error.

**Fit.** Right for now. (b) is the right close-shape eventually; (d) is the
honest close-shape today.

---

## 4. Recommendation + rationale

**Recommend (d) — formalize as KNOWN-DEFERRED, with one structural note.**

Per Rule 3 (right beats easy):

- (a) is the WRONG shape regardless of cost — `scrml:compiler` should resolve
  like every other `scrml:NAME`, not via an external install step.
- (b) is the STRUCTURALLY-RIGHT shape if there were ANY adopter demand. There
  isn't. Shipping (b) on speculation ships 6 MB of compiler source into every
  adopter's build for a feature nobody is using. The .scrml-source pattern of
  `await import("../../compiler/src/...")` is genuinely WIP — see the umbrella
  source line 22-29 which explicitly markets sub-stages as importable but no
  per-stage shim exists.
- (c) is a category error.
- (d) is the honest close-shape: keep the loud-failure thunks, formalize the
  deferral in SPEC, surface it as a compile-time warning, document the
  resolution paths.

Per Rule 3 (surface why easy is also right): (d) wins not because it's easy
but because there is no demand to validate the structural fix against. (b)
WITHOUT a real adopter is a feature designed for ghosts — the surface, the
.ts-vs-.js choice, the conditional-copy heuristics, the bundled-tree layout,
all get designed against zero ground truth. The first real `scrml:compiler`
adopter will surface concrete requirements (do they need just `compileScrml`?
just the expression parser? all 14 stages? bun-runtime or node-compat?) that
will inform (b)'s actual shape. Shipping (b) now means rewriting (b) when
that adopter shows up.

The one structural note: **(d) should ALSO add 13 placeholder shim files at
`compiler/runtime/stdlib/compiler/<stage>.js`** (e.g., `bs.js`, `pa.js`, …)
mirroring the umbrella's thunk pattern. Today, an adopter who writes
`import { runPA } from "scrml:compiler/pa"` gets `W-STDLIB-SHIM-MISSING`
(no `compiler/pa.js`) AND the literal `scrml:compiler/pa` survives the
rewrite — fatal at runtime, but no compile-time attribution telling them
the umbrella too is deferred. The placeholders give every per-stage path
the same loud-failure-with-attribution shape as the umbrella. (The
`W-STDLIB-COMPILER-DEFERRED` lint can do this work too, but per-stage thunks
also serve as the runtime-side "you tried to invoke me" attribution.)

This is the close-shape:

```
compiler/runtime/stdlib/
├── compiler.js              ← already exists (umbrella thunk)
└── compiler/                ← NEW (per-stage thunks, deferred-shaped)
    ├── bs.js
    ├── tab.js
    ├── mod.js
    ├── ce.js
    ├── bpp.js
    ├── pa.js
    ├── ri.js
    ├── ts.js
    ├── mc.js
    ├── me.js
    ├── dg.js
    ├── cg.js
    └── expr.js
```

Each per-stage file is a 5-10 line thunk mirroring the umbrella's pattern,
with per-stage attribution (e.g.,
`[scrml:compiler/pa] runPA() is not available at runtime via the scrml:compiler
shim — DEFERRED, see scrml:compiler header`).

---

## 5. If a fix dispatch is recommended

**Yes — small, single-pass dispatch.**

### Locus
- `compiler/runtime/stdlib/compiler/{bs,tab,mod,ce,bpp,pa,ri,ts,mc,me,dg,cg,expr}.js`
  — 13 NEW thunk files, ~10 lines each.
- `compiler/src/api.js` — `bundleStdlibForRun` minor extension: when a name
  matches `^compiler($|/)`, emit a new diagnostic shape (see below). Existing
  sub-tree-copy logic already handles `compiler.js` + `compiler/*.js`
  automatically.
- `compiler/SPEC.md` §34 — add `W-STDLIB-COMPILER-DEFERRED` row (or, simpler,
  amend the existing `W-STDLIB-SHIM-MISSING` row to mention that `compiler`
  fires a deferral-flavored variant via per-name special-case message).
- `compiler/SPEC.md` §41 — mark the `scrml:compiler` stdlib module DEFERRED
  with a forward pointer to this memo.
- `compiler/tests/unit/stdlib-shim-resolution.test.js` — add a per-stage
  assertion: each of the 13 sub-paths resolves to its placeholder shim
  (file exists on disk, import rewrite succeeds, NO W-STDLIB-SHIM-MISSING for
  them). Plus a new assertion: importing `scrml:compiler` fires the deferral
  warning AND the bundled shim's thunks throw on invocation (loud-failure
  attribution is asserted on the thrown Error message).
- `docs/changes/corpus-sweep/PLAN.md` — Bug #8 ledger entry: amend to record
  the Wave 7 Unit E close as KNOWN-DEFERRED with the per-stage thunk
  expansion.

### Brief shape (sketch)

> Wave 8 dispatch — `scrml:compiler` KNOWN-DEFERRED formalization.
>
> Survey-recommended close-shape per
> `docs/changes/bug-8-followup/scrml-compiler-shim-survey-s121-2026-05-22.md`
> §4-5. Right beats easy, but here right and easy coincide: the umbrella is
> already deferred; this dispatch closes the gap at the per-stage shim level
> AND adds the compile-time deferral signal.
>
> Deliverables:
> 1. 13 new thunk files under `compiler/runtime/stdlib/compiler/` mirroring
>    the umbrella shim pattern (loud-failure-with-attribution, 17 → 17
>    pass-through symbols per `compiler-api.test.js` line 34-48 manifest).
> 2. `bundleStdlibForRun` special-cases `compiler` + `compiler/*`: emits
>    `W-STDLIB-COMPILER-DEFERRED` (severity:warning, routed to result.warnings)
>    with message linking to the resolution-options memo path.
> 3. SPEC §34 amendment + SPEC §41 row update.
> 4. Test extension: ensure all 13 per-stage paths resolve to placeholder shims
>    (no false W-STDLIB-SHIM-MISSING) AND the deferral warning fires.

### Acceptance criteria

- All 13 per-stage shim files exist with the canonical thunk pattern
  (file matches a regex like `_unavailable\("` + stage symbol name).
- `scrml compile <fixture-importing-scrml:compiler>` exits 0 with EXACTLY
  ONE warning: `W-STDLIB-COMPILER-DEFERRED` (no `W-STDLIB-SHIM-MISSING`).
- `scrml compile <fixture-importing-scrml:compiler/pa>` exits 0 with EXACTLY
  ONE warning: `W-STDLIB-COMPILER-DEFERRED` (no `W-STDLIB-SHIM-MISSING`).
- Runtime smoke: `bun -e "import(...)..."` against an emitted file that
  invokes a `scrml:compiler` symbol throws the attribution Error from the
  thunk (asserted on the message body).
- The dashboard load smoke (already in the test) continues to pass.
- Existing W-STDLIB-SHIM-MISSING tests continue to pass (the special-case
  routes `compiler` AROUND the missing-shim branch, not THROUGH it).
- Test count: +5 to +8 cases.
- 0 regressions across the existing 13,753-case suite.

---

## Tags

`#wave-7-unit-e` `#bug-8-followup` `#scrml-compiler-shim` `#stdlib-bundler`
`#known-deferred` `#s121` `#right-beats-easy`

## Links

- `compiler/runtime/stdlib/compiler.js` — current deferred placeholder
  (loud-failure thunks).
- `compiler/src/api.js` lines 209-331 — `bundleStdlibForRun` (where the
  special-case would go).
- `compiler/src/api.js` lines 405-420 — `rewriteStdlibImports` (untouched by
  this proposal; the special-case fires upstream).
- `stdlib/compiler/index.scrml` — umbrella .scrml source (target surface).
- `stdlib/compiler/{bs,tab,mod,ce,bpp,pa,ri,ts,mc,me,dg,cg,expr}.scrml` —
  per-stage .scrml stubs (16 exports total).
- `compiler/tests/unit/stdlib-shim-resolution.test.js` — bundler-side
  resolution test (line 73 includes `compiler` in the manifest).
- `compiler/tests/unit/compiler-api.test.js` — library-mode emission test
  (no runtime invoke).
- `compiler/SPEC.md` §34 line 15452 — `W-STDLIB-SHIM-MISSING` row (the
  template for the new `W-STDLIB-COMPILER-DEFERRED` row).
- Bug 8 close commit `65733234` — landed the W-STDLIB-SHIM-MISSING
  infrastructure + 13 sibling shims + DEFERRED placeholder.
- `compiler/runtime/stdlib/oauth.js` + `compiler/runtime/stdlib/oauth/` —
  canonical umbrella + sub-tree shim pattern (precedent for option (b)
  mechanism).
