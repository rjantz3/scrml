# Progress — SPEC despace worked-example openers (2026-06-19)

Base: c734ec35 (Part A confirmed — "deprecated whitespace form" present at SPEC.md:369).
Task: despace canonical-teaching worked-example openers in compiler/SPEC.md ONLY; KEEP deprecation-illustration spaced forms.

## 2026-06-19 — startup
- Merged main; base now carries Part A.
- Surveyed all `< X` spaced candidates via grep.
- Classification complete (see below). Keep-zones identified:
  - §4.1 L338 (invalid-form contrast), §4.2 L371 (deprecated worked example), §4.3 L393 (prose),
    §4.9 L580 (macro deprecated form), §15.X L8592 (P1-amendment prose), §16 L9678 (retired slot syntax),
    §34 rows: W-WHITESPACE-001 (L16887), W-STATE-BLOCK-BARE-WRITE-DECL (L17098), E-WHITESPACE-001 (L17425).

## 2026-06-19 — chunk 1 (committed 7fd12452)
- Front-matter amendment notes (<machine>, <Type>), quickref table (<statename>), §4.4 worked-ex state-block openers (<db>) + prose ref.

## 2026-06-19 — chunk 2 (committed c2c69596, hook PASSED)
- §6.12/§11/§12 <db> block openers + prose refs; §14.8.3 schemaFor; §16795 server-fn. 44 ins/44 del (line-count preserved).

## 2026-06-19 — chunk 3 (in progress)
- §39 <schema> + <db> prose/examples/catalog (kept EBNF '< schema>' L19397 FLAGGED).
- §51/§53 <machine>/<engine> prose + code-block openers (kept EBNF '< machine' L27140/L27827 FLAGGED; kept rejected pre-S25 '< machine Name for Type>' L27215 FLAGGED).
- §4.7 comment-suppression example // <db src=...> despaced (mild-ambiguous, flagged).
- §44.7/§21.5 <db src=> catalog rows + pure-fn prose.

## 2026-06-19 — chunk 4 (errorBoundary + state-literals + substates + authority)
- §19 <errorBoundary> (all backtick + code-block + comment + table forms).
- §48/§54 PascalCase state-literals (= <Point/User/Profile/Widget/Item/Session/Admin/
  Snapshot/Address/Scaled/Rect/Tag/AdminUser/GuestUser/Product/Category/ScanResult/Found/Token>).
- §54 substate openers + error msgs (<Submission/Draft/Validated/Submitted/Target/State/StateName>).
- §52 authority (<Card/EditState/BadCard/CardDraft/World/User authority=.../Type authority=...>).
- §6/§10/§14 lowercase state-literals (<typename/state/formResult/filterState/otherState/
  session/wizard/fetch/card/Order/CartState/state type Foo>).
- KEEP §4.6 '< MAX_ITEMS' L517 (whitespace-behavior illustration); §16 '< slotname>' L9678 (retired slot syntax).

## FINAL SURVEY RESULT
- All canonical-teaching openers despaced. Remaining spaced `< X` = KEEP-zones + comparisons + 3 EBNF-FLAG + 1 rejected-form-FLAG.
- FLAGGED for PA (not touched): EBNF productions L19397 ('< schema>'), L27140 ('< machine' ...), L27827 ('< machine' ... derived ...); rejected pre-S25 sentence form L27215 ('< machine Name for Type>').
