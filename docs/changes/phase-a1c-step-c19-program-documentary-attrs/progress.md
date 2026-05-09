# Phase A1c · Step C19 — `<program>` Documentary Attributes — Progress / Landing Log

**Session:** S75 (2026-05-09)
**Status:** **CLOSED** — code already shipped in S59; this dispatch added 2 missing tests
to bring §40.7 normative-bullet coverage to 100% and formally close the SCOPE row.
**Test delta:** 10535 → 10537 (+2). 0 regressions. (Pre-existing 3 self-host pipeline
failures are baseline noise, unrelated to C19.)

---

## Phase 0 — Survey

Per pa.md depth-of-survey-discount + the SCOPE doc note "closes S59 documentary-attrs
work," surveyed first. Finding: every surface the C19 dispatch enumerated is already
landed in tree.

See `SURVEY.md` (committed `365f287`) for the full audit.

Key finding: commits `a72d9a5` (codegen) + `06f034f` (12 tests + attribute registry)
shipped C19's work in S59 (mid-A1a). The SCOPE row was never marked closed, so the
C19 dispatch was issued at S75 against already-landed code. This is exactly the
scope-blindness pattern in MEMORY (`feedback_scope_blindness.md`).

## Phase 1-3 — Reuse, not rewrite

No code changes to `compiler/src/codegen/index.ts`, `compiler/src/attribute-registry.js`,
or `compiler/src/html-elements.js`. The S59 implementation already matches §40.7
verbatim:

- Top-level `<program>` head emission (lines 590-667 of codegen/index.ts) — fixed
  emission order, HTML-escape, empty-string-as-absent, author-`<title>` precedence.
- Nested-`<program>` warning fire-site (lines 277-320) — `W-PROGRAM-TITLE-NESTED`,
  one warning per offending attr, depth-counter ensures only nested programs trigger.
- Attribute registry: 5 documentary attrs marked `supportsInterpolation: false` on
  `<program>` so VP-1/VP-3 leave them alone (attribute-registry.js lines 102-106).
- HTML-elements registry: 4 attrs registered explicitly, `title` inherited from
  GLOBAL_ATTRIBUTES (html-elements.js lines 533-536).

## Phase 4 — Test gap close (the only material work for C19 at S75)

Added 2 tests to `compiler/tests/integration/program-documentary-attrs.test.js`:

- **Test 13:** non-string-literal value (variable-ref `title=@name`) silently
  ignored → no warning, no documentary `<title>`, default basename falls back.
  Closes §40.7 bullet 1, second sentence.

- **Test 14:** documentary `description=` stacks with author-written
  `<meta name="description">` tag → both appear in output, neither overrides.
  Closes §40.7 bullet 4.

Smoke tests verified actual behaviour before writing assertions:
- `title=@name` → kind `variable-ref` → `getDocAttr()` returns null → default
  basename `<title>13</title>` emitted, no diagnostic.
- `<program description="DocDesc"><meta name="description" content="AuthDesc">`
  → compiler emits `<meta name="description" content="DocDesc">` in head; author's
  raw `<meta>` survives in body (browsers hoist orphan `<meta>` at parse time).

## Test results

```
compiler/tests/integration/program-documentary-attrs.test.js
14 pass / 0 fail / 52 expect calls
```

Full suite: 10537 pass / 69 skip / 1 todo / 3 fail.
The 3 fails are pre-existing self-host pipeline flakes
(F-BUILD-002 entry parse, Bootstrap L3, self-host tokenizer parity) — unrelated to C19.

## Open questions raised — none

Spec text precisely matches implementation. The brief's example OQ ("§40.7 says
'silently ignored' — does that mean absent or empty?") is answered by the spec
itself in bullet 2: "An empty-string value (e.g., title=\"\") SHALL be treated as
if the attribute were absent — no head tag is emitted." The implementation already
handles this (`getDocAttr` returns `null` on empty string).

## Spec amendments — none

§40.7 already complete; §34 catalog row already in place. No spec edits.

## Adjacent observation (NOT acted on per "stay tight" guidance)

VP-3 fires `E-ATTR-001` on `<program title="x ${42}">` (interpolation literal in
a string-literal value), which is the V0.next-strict adopter-friction guard. This
is technically a stricter behaviour than §40.7 bullet 1's prose ("silently
ignored"). The two are reconcilable: VP-3 catches `${...}` *survival* in literal
contexts where the marker would survive as text; §40.7's "silently ignored"
applies to the structurally-non-string-literal case (variable-ref, expr). PA may
want to add a footnote to §40.7 cross-referencing E-ATTR-001 + VP-3 for completeness,
but that's a documentation polish, not C19 scope. Surfacing per pa.md Rule 3.

## Files touched

- `compiler/tests/integration/program-documentary-attrs.test.js` — appended tests 13 + 14
- `docs/changes/phase-a1c-step-c19-program-documentary-attrs/SURVEY.md` — Phase 0 audit
- `docs/changes/phase-a1c-step-c19-program-documentary-attrs/progress.md` — this file

## Files NOT touched (already correct in tree)

- `compiler/src/codegen/index.ts` (S59)
- `compiler/src/attribute-registry.js` (S59)
- `compiler/src/html-elements.js` (S59)
- `compiler/SPEC.md` (already complete §40.7 + §34 catalog)

## Deferred items

None. The §40.7 surface is fully implemented and fully tested.

## Commit chain

- `365f287` — `docs(c19): SURVEY — C19 already landed in S59; 2 minor test gaps remain`
- (next) — `test(c19): close §40.7 coverage — non-string-literal silent skip + author-meta stack`

## Branch state

- Worktree: `agent-a46f4f618950c22a5`
- Branch base: `main` @ `72d691f` (S74 wrap)
- Files-disjoint with C22 + C23 parallel dispatches (this dispatch only touches
  `program-documentary-attrs.test.js` + the C19 docs subdir).
