# DROP-DRYRUN — phase-b2-samples-curate (sPA ss11 item 8)

**LIST-ONLY. NOTHING IS DELETED BY THIS DOCUMENT.** Per the destructive-ops directive
(S56) + PA bash-cleanup rule, sample drops require **explicit user authorization** AND a
**pre-drop SPEC re-verification** of each candidate's "retired surface" claim before any `rm`.
This file is the dry-run target list the user/PA reviews. Authored by the sPA from the
crash-recovered item-8 agent's findings (agent died mid-finalize after a connection error;
its Phase-1/2 work + EDIT/REWRITE commits landed; this Phase-3 list was the owed remainder).

## Candidate drops (5) — tests of RETIRED user-facing surfaces

| # | Sample | Fails with | Retired-surface claim (VERIFY before drop) |
|---|--------|-----------|---------------------------------------------|
| 1 | `gauntlet-s20-meta/meta-bun-eval-001.scrml` | E-META-001 | `bun.eval()` user-facing surface RETIRED S130 Approach C F-003 — moved compiler-internal-only; `^{}` is a closed primitive set (reflect / emit / emit.raw). SPEC §30.1 note. |
| 2 | `meta-004-clean-config.scrml` | E-SCOPE-001 | same — uses retired `bun.eval()` meta surface. |
| 3 | `meta-005-nested-meta.scrml` | E-SCOPE-001 | same — retired `bun.eval()` nested-meta surface. |
| 4 | `meta-010-reflect-with-config.scrml` | E-SCOPE-001 | same — retired `bun.eval()` reflect-with-config surface. |
| 5 | `gauntlet-r10-solid-spreadsheet.scrml` | E-SCOPE-001 | raw JS `eval()` — never a scrml surface; §22.12 Approach C closes JS-host `eval`. |

**Why DROP not EDIT:** these test a primitive/surface that was deliberately removed from the
language. There is no canonical analog to rewrite them to — editing would invent a test for a
non-feature. Unlike the BLOCKED-ON-COMPILER set below (correct scrml, keep), these are
genuinely obsolete.

## NOT drops — KEEP (recorded so they aren't mistaken for drop candidates)

### BLOCKED-ON-COMPILER (correct canonical scrml; the sample is RIGHT, the compiler is wrong)
These FAIL today but the `.scrml` is valid per SPEC — editing them would MASK the bug (Rule 2/3).
They are a **compiler-bug batch for the PA**, NOT curation targets:
- **Built-in scope-resolver gaps** (`E-SCOPE-001` on compiler-recognized built-ins): `navigate`
  (§20.1), `animationFrame` (§6.7.9 — minimal repro of the §6.7.9 worked example FAILS), `cleanup`
  (§6.7.3), `transaction` (§8.5.3). Files incl. phase1-navigate-bare/explicit-hard/server-00{1,2,3},
  phase2-animationframe-in-element-091, sql-transaction-001, helpers/dnd-setup, modern-007-dnd-with-helpers.
- **Anonymous `fn(x){}` expression** (§48.2.1 canonical) not recognized in expr position →
  `E-SCOPE-001` (phase1-fn-anonymous-010).
- **`E-CODEGEN-INVALID-JS` on trivially-valid scrml** — e.g. phase1-let-bare-001 (`let counter=0`),
  phase2-for-lift-else-empty-049, phase3-arith-in-match-arm-cond-118, phase3-assign-expr-chained-080,
  match-001-nested-with-call, meta-type-registry-001, error-004-in-logic. (Valid scrml emitting
  unparseable JS = codegen bug.)
- **`E-MATCH-012`** on `match` with `given`/`not` arms over `T|not` (phase2-match-given-in-arm-104,
  phase2-match-optional-039, phase3-match-given-arm-075).
- **`E-COMPONENT-021`** — `${...}` ellipsis children-slot in a component body can't reparse under
  CE-Phase-1 (component-scoped-css, css-scope-01, gauntlet-r10-ts-components, css-flat-and-scoped-001).
- Misc: gauntlet-r10-bun-admin (E-RI-002), gauntlet-r10-zig-buildconfig (E-CG-006),
  phase3-optchain-method-call-039 (E-STRUCT-FUNCTION-FIELD), channel-shared-state-001
  (E-CHANNEL-SHARED-MODIFIER), phase1-use-named-012 (E-COMPONENT-035, cross-file component import).

### NEGATIVE TESTS (correctly fail — KEEP, not targets)
Of the 177 Phase-1 fails, **96 carry an `expected:error` sidecar** = negative tests that are
SUPPOSED to fail-to-compile. 69 match their pinned code (working). The 27 "mismatch" + the broader
**78 gauntlet-s19 sidecar mismatches** (see `gauntlet-s19-verify.mjs`) are **diagnostic drift**
(the compiler emits a different/UNKNOWN code than the sidecar pins) — a separate diagnostic-currency
concern, NOT sample curation, and OUT OF item-8 scope. Flagged to PA.

## Status
- DROP candidates: **5**, list-only, awaiting user authorization + pre-drop SPEC re-verify.
- Fixed this dispatch (EDIT/REWRITE, recompile clean): **26** of the 63 positive-test fails
  (sPA-verified resweep: now_pass=26 / still_fail=37 at agent HEAD `11c5fc40`).
- KEEP/BLOCKED + negative tests: the remainder.
