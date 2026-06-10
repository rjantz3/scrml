# g-spread-fnname-rename-2026-06-10 — progress

## 2026-06-10T19:30:03Z Phase 0 survey-confirm
- pwd: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a35a4e5c6030894bf
- HEAD base: 7c41cad2
- Locus CONFIRMED: compiler/src/codegen/emit-client.ts:1757 combinedRegex lookbehind `(?<!\.\s*)`.
  Spread `...foo` ends in a `.`, so callee `foo` is preceded by the third spread dot →
  lookbehind rejects → never renamed → leaks user name → runtime ReferenceError.
- Sibling regex CONFIRMED AFFECTED: emit-client.ts:2054 import-usage detector
  `(?<![.\w$])` — same spread escape. A spread-only-used import `[...imported()]` is
  reported NOT-USED → wrongly PRUNED → ReferenceError. Same severity class; will fix too.
- Empirical PRE-FIX (real compiler):
  - r1 client.js: `const items = [...makeList()];` (LEAKED user name); decl is `_scrml_makeList_2`.
  - r2 client.js: `[...makeList()];` + `el.textContent = [...makeList()];` (LEAKED).
- Candidate fix: lookbehind `(?<![A-Za-z0-9_$)\]]\s*\.\s*)` — rejects ONLY a genuine
  member-access dot (one preceded by ident-char / ) / ]); allows spread (dot preceded by a dot).
  Validated against spread-positive + member-access negatives (incl. f().tag(), a[0].tag(),
  n . tag(), a.b.tag(), [...obj.tag()]) via /tmp/regex-probe2.js — ALL correct.

## next
- Phase 1: apply both lookbehind fixes (1757 rename + 2054 usage-detector). Bash-edit only.
- Phase 2: focused unit test.
- Phase 3: R26 empirical re-compile.

## 2026-06-10T19:35:57Z Phase 1a — rename-pass fix (emit-client.ts:1757)
- Lookbehind `(?<!\.\s*)` -> `(?<![A-Za-z0-9_$)\]]\s*\.\s*)`.
- Comment block updated (Bug-I note extended; BIT-FOR-BIT comment rewritten).
- Existing mangle tests (Bug D/I/Z) all green: 16 pass / 0 fail.

## 2026-06-10T19:41:01Z Phase 1b — import-usage-detector fix (emit-client.ts:2054)
- Same spread-escape: `(?<![.\w$])` reports `[...importedFn()]` as NOT-used → wrongly
  PRUNES the import → runtime ReferenceError. Split into member-access-only lookbehind +
  word-boundary lookbehind: `(?<![A-Za-z0-9_$)\]]\s*\.\s*)(?<![\w$])`.
- Validated /tmp/regex-probe3.js: spread-use now detected; member-only (obj.makeList) still
  NOT detected; bare + member+bare detected; absent not detected.
- next: Phase 2 focused unit test; Phase 3 R26 empirical.

## 2026-06-10T19:45:34Z Phase 2 — focused unit test
- compiler/tests/unit/mangle-spread-call-callee.test.js (mirrors mangle-property-access /
  mangle-record-value-bleed / mangle-string-literal-opacity style).
- §1 derived-RHS spread renames; §2 markup-interp spread renames; §3 member `.join` on spread
  result NOT renamed + spread callee renames; §3b regex-unit control (7 cases: bare/spread
  rename; obj./spaced/f()./a[0]./[...obj.member] member access all SKIP); §4 string-literal Bug Z.
- 11 pass / 0 fail. Verified the §3b spread case FAILS on the OLD regex (genuine guard).
- Existing mangle suite (Bug D/I/Z) still 16 pass / 0 fail.

## 2026-06-10T19:46:20Z Phase 3 — R26 EMPIRICAL (post-fix, real compiler)
R1 derived-RHS:  PRE `const items = [...makeList()];`  ->  POST `const items = [..._scrml_makeList_2()];`  RENAMED=Y
R2 markup-interp: PRE `[...makeList()];` + `el.textContent = [...makeList()];`  ->  POST both `[..._scrml_makeList_2()]`  RENAMED=Y
  (only remaining bare token is the decl `function _scrml_makeList_2()` — the mangled name itself)
R3 member control (r34.scrml `[...makeList()].map(x=>x+1)`): spread callee MANGLED `_scrml_makeList_3`; `.map(` stays bare (member-access skip preserved); NOT `._scrml_map_`.
R4 string control (r34.scrml): literal "this string mentions makeList() verbatim" UNCHANGED (Bug Z fencing preserved).
node --check: r1/r2/r34 all syntax OK.

## 2026-06-10T19:59:35Z cleanup
- Removed throwaway .tmp-repro/{r1,r2}.scrml (Phase-0 scratch). Durable regression coverage
  lives in compiler/tests/unit/mangle-spread-call-callee.test.js (embeds the same R1/R2/R3/R4
  shapes). r34.scrml (member+string control scratch) deleted untracked.

## 2026-06-10T20:35:46Z full-suite gate (bun run test)
- RESULT: 23745 pass / 0 fail / 220 skip / 1 todo (Ran 23966 across 964 files, 93.5s, exit 0).
- Baseline (brief): 23734 / 0 / 220 / 1.
- Delta: pass +11 (exactly the 11 new mangle-spread-call-callee tests); fail/skip/todo UNCHANGED.
- ZERO regressions.
- NOTE: first full-suite attempt was blocked behind a broken `until`-guard (waited for a
  `post-commit complete` string the commit task never printed) so it never ran; killed + re-ran
  clean. All committed work had already passed its per-commit pre-commit gate (unit+integration
  +conformance) regardless.

## STATUS: COMPLETE
