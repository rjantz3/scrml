---
title: "stdlib pre-existing source bugs cleanup"
status: IN-PROGRESS
session: S87+
dispatch: stdlib-source-bugs
---

# stdlib pre-existing source bugs cleanup — progress log

## 2026-05-12 — kickoff + inventory

### Surfaced by

Wave 3 v0.3 fixture-sweep dispatch (S87 commit `54803f6`, agent a3e3a5d6251c4cef0).
Per agent's progress.md:

> "Stdlib has pre-existing source bugs (E-EQ-004 `===`/`!==`, E-ERROR-006/007 `throw`/`try`,
>  E-IMPORT-005 bare npm) — surfaced when migrate's `${...}` unwrap exposes them; separate
>  cleanup dispatch"

### Verification — bugs reproduce against current HEAD (`8666d45` worktree)

`bun run compiler/src/cli.js compile stdlib/auth/index.scrml` produces error output
including `E-EQ-004` (multiple), `E-ERROR-007` (multiple). Reproduction confirmed.

### Per-module-per-error inventory (source-level grep + compiler verification)

| Module | E-EQ-004 (`===`/`!==`) | E-ERROR-006 (`throw new Error`) | E-ERROR-007 (`try{`) | E-IMPORT-005 |
|---|---|---|---|---|
| `stdlib/auth/index.scrml` | 1 | 0 (2 in JSDoc only) | 0 | 0 |
| `stdlib/auth/jwt.scrml` | 10 | 0 | 2 | 0 |
| `stdlib/auth/password.scrml` | 4 | 0 (1 in JSDoc only) | 1 | 0 |
| `stdlib/compiler/meta-checker.scrml` | 0 | 2 | 1 | 0 |
| `stdlib/crypto/index.scrml` | 10 | 1 | 1 | 0 |
| `stdlib/data/transform.scrml` | 10 | 0 | 0 | 0 |
| `stdlib/data/validate.scrml` | 9 | 0 | 1 | 0 |
| `stdlib/format/index.scrml` | 7 | 0 | 0 | 0 |
| `stdlib/fs/index.scrml` | 7 | 0 | 1 | 0 |
| `stdlib/http/index.scrml` | 21 | 1 | 2 | 0 |
| `stdlib/oauth/discord.scrml` | 0 | 1 | 0 | 0 |
| `stdlib/oauth/github.scrml` | 1 | 1 | 0 | 0 |
| `stdlib/oauth/google.scrml` | 2 | 3 | 1 | 0 |
| `stdlib/oauth/index.scrml` | 15 | 15 | 0 | 0 |
| `stdlib/oauth/microsoft.scrml` | 0 | 1 | 0 | 0 |
| `stdlib/oauth/pkce.scrml` | 1 | 2 | 0 | 0 |
| `stdlib/path/index.scrml` | 2 | 0 | 0 | 0 |
| `stdlib/process/index.scrml` | 3 | 0 | 0 | 0 |
| `stdlib/redis/index.scrml` | 0 | 0 | 0 | 1 (`from "bun"`) |
| `stdlib/regex/index.scrml` | 8 | 0 | 0 | 0 |
| `stdlib/router/index.scrml` | 8 | 0 | 0 | 0 |
| `stdlib/store/kv.scrml` | 5 | 0 | 1 | 1 (`from "bun:sqlite"`) |
| `stdlib/test/index.scrml` | 7 | 15 | 3 | 0 |
| `stdlib/time/index.scrml` | 42 | 0 | 0 | 0 |
| **TOTAL** | **173** | **42** | **14** | **2** |

(JSDoc-only counts excluded from totals — compiler doesn't fire on `===` / `throw` inside
`/** ... */` comments. Some JSDoc anti-patterns will still be cleaned for doc consistency.)

### Strategic split — safe vs coordinated-refactor

Per task brief CAUTION clauses:

1. **Phase 1 — mechanical, fully safe:** `===` → `==`, `!==` → `!=`. SPEC §45 normalizes
   both forms to strict equality; NO API change; NO caller changes; NO semantic shift.
   Affects 20 modules, 173 occurrences. Will execute now.

2. **Phase 2 — JSDoc consistency:** update `===` / `throw new Error` shown in `/** */` example
   blocks to canonical scrml form (`==`, `fail .Variant(...)` form). NOT compiler-flagged but
   misleading docs. Will execute alongside Phase 1.

3. **Phase 3 — coordinated API refactor (SURFACE FOR PA REVIEW):**

   **3a. `throw new Error(msg)` (42 sites):** changing `throw` to `fail` requires:
   - Adding `! ErrorEnum` to function signatures.
   - Defining a per-module ErrorEnum with one variant per error case.
   - Updating ALL CALLERS — including downstream user code AND existing stdlib unit tests
     — to use `!{}` handler form instead of `try/catch`.

     The largest cluster is `stdlib/oauth/index.scrml` (15 throws across 8 different
     functions). Migrating these would force every adopter of `scrml:oauth` to refactor
     their integration code. Same for `scrml:test` (15 throws) — though `scrml:test`
     is more contained (test runner internals).

   **3b. `try { ... } catch` (14 sites):** these are usually wrapping NPM/Web-API calls
     that throw in JS. Converting to `!{}` requires the called function to be `failable`,
     but the wrapped functions ARE js-builtin `throw`-style (`crypto.subtle.digest`,
     `JSON.parse`, `Bun.file().text()`, `fetch()`). The `!{}` form CANNOT directly handle
     a JS-thrown exception — there must be a thin shim that converts JS-throw to scrml-fail.
     This requires either:
     - A spec extension (a `safeCall(jsFn) -> Result(value, jsError)` builtin), OR
     - Per-call manual try/catch shims at the JS-runtime boundary, OR
     - Compiler-level magic that lowers `someJsCall() !{ ... }` into try/catch under the hood.

     None of these exists today. **This is a SPEC-level question.** Surfaced for PA.

   **3c. `import from "bun"` / `import from "bun:sqlite"` (2 sites):** the `redis` and `store/kv`
     modules legitimately need Bun's runtime. Per `compiler/src/module-resolver.js:65-71`,
     legal specifiers are: `./`, `../`, `scrml:`, `vendor:`. There is NO `bun:` or `node:`
     allowance. Options:
     - **A.** Add `bun:` / `node:` to `isLegalImportSpecifier()` (small SPEC §40.4 amendment).
     - **B.** Vendor Bun's redis + sqlite drivers into the project (heavyweight; defeats
       Bun-native intent).
     - **C.** Move those imports OUT of stdlib `.scrml` and into `.js` shim files imported
       via relative path (loses single-source benefit).

     **Recommendation: Option A.** Bun is the locked runtime per primary.map.md
     ("Runtime: Bun >= 1.3.13"); pretending it doesn't exist in the import-spec grammar
     is a SPEC-level inconsistency. **Surface for PA.**

### Execution order

- COMMIT PER FILE for Phase 1 (`===`/`!==`).
- After Phase 1 lands, halt and SURFACE Phase 3 inventory + recommendations.
- Phase 2 (JSDoc) batched into Phase 1 commits per file (no separate pass).

---

## 2026-05-12 — Phase 1 LANDED + Phase 3 surfaced

### Phase 1 outcome

ALL 173 occurrences of `===` / `!==` across 20 stdlib modules cleaned. Three
landing commits (one batch per ~7 modules):

- `e0212a3` — batch 1 (auth/* + oauth/{google,pkce,github}) — 19 occurrences
- `9d4a147` — batch 2 (data/* + format + fs + regex + router + path + process) — 54 occurrences
- `05e4e76` — batch 3 (crypto + http + oauth/index + store/kv + test + time) — 100 occurrences

Sanity verification: `grep -rE "===|!==" stdlib/ --include="*.scrml"` returns 0 hits post-batch-3.

Test suite delta: stdlib unit tests stay 336 pass / 3 skip / 0 fail (no regressions).
Pre-commit hook (full `bun test` excluding browser) ran on each commit and passed.

### Phase 1 also caught — JSDoc-comment example consistency

Two `===` instances were inside `/** ... */` JSDoc example lines (auth/jwt.scrml:156
"if (payload && payload.role === 'admin')" + crypto/index.scrml:115 "const valid
= hmac(...) === incomingSig"). The compiler does NOT fire on these (comments are
stripped pre-lint), but they're misleading docs. The `replace_all` Edit covered
them, so the JSDoc examples now show canonical `==` form alongside the code.

### Phase 1 ALSO surfaced — pre-existing E-SYNTAX-042 (`null` / `undefined` tokens)

Verifying post-Phase-1 stdlib compilation surfaced ANOTHER pre-existing anti-pattern
NOT in this dispatch's brief: per SPEC §42.7, scrml uses `not` / `is some` / `is not`
instead of the JS `null` / `undefined` tokens. Examples:

- `if (key == undefined) return undefined`     → `if (key is not) return not`
- `if (typeof token != "string") return null`  → `if (typeof token is not "string") return not`
- `if (parts.length != 3) return null`         → `if (parts.length != 3) return not`
- `assertTruthy(decoded != null)`              → `assertTruthy(decoded is some)`

This affects ~most of the same 20 stdlib modules (each has at least a few
`null`/`undefined` references). Since the brief's scope did not include
E-SYNTAX-042, this is **surfaced as a 4th sibling** to Phase 3 surfaces:

   **3d. E-SYNTAX-042 (`null` / `undefined`):** scope ~similar to Phase 1
       (20 modules, dozens of occurrences); semantically equivalent rewrites
       only on absence-checks; expression-position usage (`return null`)
       maps to `return not` and is fully mechanical. **Recommend a follow-up
       Phase 1.5 dispatch identical in shape to Phase 1.**

### Phase 3 surface — final inventory + recommendations

Sub-totals confirmed via source-level grep (excluding JSDoc comments):

| Sub-surface | Count | Files | Recommendation |
|---|---|---|---|
| 3a `throw new Error(...)` | 42 | 12 | **DEFERRED.** Per-function ErrorEnum + caller refactor required. Largest cluster: `oauth/index.scrml` (15) + `test/index.scrml` (15). Migrating `scrml:test` is most contained (test runner internal; few external callers). Migrating `scrml:oauth` is highest-impact (every adopter must refactor). |
| 3b `try { ... } catch (e)` | 14 | 10 | **BLOCKED on SPEC question.** All `try` calls wrap JS-throw-style builtins (`crypto.subtle.digest`, `JSON.parse`, `fetch`, `Bun.file()`). Need either a `safeCall(jsFn)` shim builtin OR compiler magic that lowers `jsCall() !{}` into try/catch. **Surface to PA — needs spec dispatch.** |
| 3c `from "bun"` / `from "bun:sqlite"` | 2 | 2 (redis, store/kv) | **NEEDS SPEC §40.4 amendment.** Recommend allowing `bun:` and `node:` prefixes in `isLegalImportSpecifier()` (compiler/src/module-resolver.js:65-71). Bun is the locked runtime per primary.map.md. |
| 3d (newly surfaced) E-SYNTAX-042 (`null`/`undefined`) | ~50+ | 18+ | **MECHANICAL — dispatchable as Phase 1.5.** Same shape as Phase 1: per-file `replace_all` of `null` → `not`, `undefined` → `not`, `== null` → `is not`, `!= null` → `is some`, etc. SPEC §42.7. |

### Coordinated-refactor scope decision

Per task brief CAUTION clause:
> "If coordinated refactor is too broad, surface for PA review — may need to defer some changes."

Phase 3 is being SURFACED for PA review rather than landed in this dispatch.
Reason: Phase 3a + 3b touch the public API surface of `scrml:oauth`,
`scrml:test`, and others — adopter code (and existing user programs in
examples/) catches errors via JS try/catch today. Migrating to fail/!{} would
require coordinated edits to dozens of caller sites OUT of stdlib scope.
Phase 3c needs a spec amendment first.

### Files compile-clean post-fix?

For E-EQ-004 specifically — YES, all 20 modules. Confirmed by individual
compile of each module + the new test C1/C2/C20 grep assertions.

For OTHER error classes — NO (pre-existing, separate dispatch needed):
- E-ERROR-006 (throw): 42 sites remain.
- E-ERROR-007 (try): 14 sites remain.
- E-IMPORT-005 (bun): 2 sites remain.
- E-SYNTAX-042 (null/undefined): newly-surfaced, ~50+ sites remain.

### Tests

Added `compiler/tests/unit/stdlib-canonical-form-cleanup.test.js`:
- 25 tests pass (Phase 1 regression guard — global grep + per-module).
- 3 tests skip (Phase 3 surfaces — will lift when each phase lands).
- Format: per-file scan of `stdlib/**/*.scrml`, JSDoc stripped, token grep.

### Final state

`git status` clean. All Phase 1 work committed. Test suite green. Inventory
+ Phase 3 surfaces documented above.


