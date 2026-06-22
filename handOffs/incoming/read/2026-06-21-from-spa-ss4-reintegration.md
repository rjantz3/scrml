---
from: spa-ss4 (block-splitter-native-parser)
to: scrml PA
date: 2026-06-21
subject: ss4 whole-list disposition — 2 landed, 1 parked (user ruling) + 2 findings for the PA
needs: action
status: unread
branch: spa/ss4 tip 17c559c4 · base 3d311fc9 · worktree ../scrml-spa-ss4
---

## TL;DR

sPA ss4 (S210-rebuilt 3-item list) ran to completion. **2 items landed on `spa/ss4`, 1 parked per
a user ruling.** Please re-integrate `spa/ss4` → main. Two findings need your attention (one is a
language-capability ruling you should surface to the user/dPA; one is a systemic span bug to mint as
a follow-up).

**Re-integration is clean by construction:** main advanced concurrently during the run
(`3d311fc9` → `8569f774`: deputy ticks 154/155/163 + match-arm codegen fix `93e02b35` + deputy-maint
merge). All three ss4-touched files (`ast-builder.js`, `block-analysis.test.js`,
`parser-conformance-lexer.test.js`) are **disjoint** from that advance — verified
`git diff 3d311fc9..8569f774 --name-only -- <those 3>` is empty — so a plain `git merge spa/ss4`
onto current main lands the deltas without conflict.

## Per-item disposition

| # | item | disposition | SHA |
|---|------|-------------|-----|
| 1 | `g-block-match-in-lift-misparsed-as-components` | **PARKED — user ruling (escalate PA/dPA)** | — (reproduced, no code change) |
| 2 | `native-parser-lexer-3-residuals` | **LANDED** | `3cd58aa4` |
| 3 | `g-block-analysis-fn-span-overshoot` | **LANDED** | `05df4c48` |
| — | run bookkeeping (statuses + progress.md) | — | `17c559c4` (tip) |

Branch commits (oldest→newest off `3d311fc9`): `3cd58aa4` · `05df4c48` · `17c559c4`.

## PA action items

**1. Re-integrate `spa/ss4` → main (`8569f774`+).** Clean merge (surfaces disjoint from main's advance,
verified). Net deltas:
- `compiler/tests/parser-conformance-lexer.test.js` (item 2 — comparator fidelity, see finding A)
- `compiler/src/ast-builder.js` (item 3 — 4× `spanOf(startTok, peek())` → `peek(-1)`)
- `compiler/tests/unit/block-analysis.test.js` (item 3 — +3 regression tests)
- `spa-lists/ss4*.md` + `docs/changes/ss4-item{2,3}-*/{BRIEF,progress}.md` (bookkeeping)
Each code commit passed the full pre-commit + browser gate independently (item 2: 17535/0 · item 3: 17538/0 · bookkeeping: 17607/0).

**2. Item 1 — RULE the fix-shape fork (language-capability; surface to user/dPA).** Block `<match>`
inside `${ for … lift }` fails with a misleading `E-COMPONENT-035`/`020` ("cross-file component import"),
because the `lift`-body re-parse (`liftBareDeclarations`) doesn't route `<match>` through the S107
match-block recognition that the `<each>` body path uses. Reproduced on HEAD; the SAME block `<match>`
in `<each>` compiles clean. Fork (the brief seed reserved "PA picks"):
  - **(a)** support block-`<match>` in `${…lift}` (parity with `<each>`) — cohesive, touches the lift
    parse-context; aligns with R2 + the W-EACH-PROMOTABLE lint's "Tier-0 form continues to compile".
  - **(b)** targeted diagnostic only ("block `<match>` not supported inside `${…lift}`; use `<each>`")
    — lowest effort; aligns with the S130 HU-1 direction of treating `<each>` as canonical and steering
    away from raw `${for…lift}`.
**The sPA escalated rather than decide (it's a capability ruling). The user (S211) ruled PARK →
escalate to PA/dPA.** Source repro: giti inbox `handOffs/incoming/read/2026-06-20-1215-giti-to-scrml-forlift-block-match-misleading-error.md`.

**3. FINDING A — item 2 was a COMPARATOR bug, not native-lexer work (re-frame).** The S209 note +
the S210 list both framed the 3 residuals (decl-class, expr-optional-chain, expr-template-literal) as
"native-lexer (lex.js/token.js) work in the M2-M6 arc." **Empirically wrong:** the native token stream
already matched Acorn; the residuals were fidelity gaps in the test's *comparator*:
  - a `constructor` member-name prototype-pollution bug in the plain-object lookup tables (fixed with an
    own-property `lookup()` guard mirroring token.js makeIdentOrKeyword's existing guard);
  - a missing scrml-HARD-keyword divergence table (`?.fn?.()` — `fn` is `KwFn`; added
    `NATIVE_SCRML_KEYWORDS`, verified == token.js:207-233, one intentional scrml-extension divergence);
  - an incomplete closing-backtick fold + flat depth counters that mishandled nested templates.
`compareFull` was NOT weakened. **No native-parser source changed.** The whole bench corpus (12 files)
now passes the strict `full` byte-identical gate. (This also means the M2-M6 "lexer residuals" sub-item
was never lexer work — worth correcting if the M2-M6 arc notes reference it.)

**4. FINDING B — item 3 root is SYSTEMIC; mint a follow-up.** The fn-span overshoot root
(`spanOf(startTok, peek())` after `parseRecursiveBody()` consumes the `}`) is shared by **~40 other
logic-body decl sites** (let / const / state / lin / bare-expr) in `ast-builder.js` — all overshoot
their `span.end` onto the next token. Only **function-decls** surfaced because block-analysis projects
only *named* blocks. ss4 fixed only the 4 function-decl sites (scope-guarded). The other ~40 are a
separate dispatch (blast-radius: every decl's span shifts; needs the full gate as the net). Suggest
minting `ss15` (or attaching to a future ast-builder span pass) — gate it on a real consumer needing
correct non-fn decl spans (today none is known to depend on them, which is why it's not urgent).

## Notes

- The S209 progress section (old 7-item list) is preserved above the S211 section in
  `spa-lists/ss4.progress.md`.
- No master-list / changelog / known-gaps / delta-log edits made (PA-owned; do at re-integration).
- Worktree `../scrml-spa-ss4` + branch `spa/ss4` left intact for your inspection; safe to remove after merge.

— sPA ss4, S211
