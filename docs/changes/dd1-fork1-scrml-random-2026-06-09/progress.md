# progress — dd1-fork1-scrml-random-2026-06-09

scrml:random capability-scoped non-det primitive (DD1 Fork 1 follow-on; mirror of now() S176).

## PHASE 0 — survey-confirm (2026-06-09)

Baseline HEAD 4a19a047. `bun run test` baseline = 23662 pass / 220 skip / 1 todo / 0 fail (the
2-fail in the very first run was flaky / non-reproducing; clean on two reruns).

Confirmed:
- now() collector to generalize: `collectNowFromScrmlTime` (type-system.ts:6582-6607), threads the
  set `nowFromScrmlTime` into `checkFnBodyProhibitions` (param @16988, fired @17470-17488) at the two
  fn-purity call sites (7309 fn-bodies, 7548). E-FN-004 reused; no new code in §34.
- math/time index.scrml + shim pattern: stdlib/{time,math}/index.scrml + compiler/runtime/stdlib/{time,math}.js.
  The shim is the ONE sanctioned host-touch. Bundler `bundleStdlibForRun` (api.js:302) now copies
  sibling-FILE shim imports (S176 `copyTransitiveShimSiblings`).
- SPEC: §41.18 (scrml:math) @21215, §41.19 (now()) @21246; §41.20 goes after §41.19 (before "## 42").
  §41.18 random()-exclusion note @21242 to update to "decided: scrml:random (§41.20)".
- 6 Math.random corpus sites in 5 files, all in `function`/`server function` (NONE in pure `fn`):
  - examples/23-trucking-dispatch/pages/dispatch/billing.scrml:103 (markPaidServer area) -> randomInt(0,100000)
  - examples/23-trucking-dispatch/pages/dispatch/load-detail.scrml:153 (transitionStatusServer) -> randomInt(0,100000)
  - examples/23-trucking-dispatch/pages/driver/load-detail.scrml:166 (transitionLoadServer) -> randomInt(0,100000)
  - samples/gauntlet-r11/rust-state-machine.scrml:100 (simulateFetch) -> random() < 0.5
  - samples/compilation-tests/meta-003-function.scrml:7 (generateId) -> "meta-" + random()
  - stdlib/http/index.scrml:271 (retry-jitter) -> random() * 2 - 1
- HTTP CLIENT-INLINE VERDICT: the 4 statically client-inlined shims are auth/crypto/data/host
  (runtime-template.js:79-82). `http` is NOT among them — http is server-only-bundled (like time.js),
  so the de-leak is CLEAN (no client ReferenceError risk). DE-LEAK, do not defer.
  (NOTE: http/index.scrml ALSO uses Math.pow + Math.max — out of scope; this brief de-leaks Math.random only.)

Phase 0 complete. No contradictions. Proceeding to Phase 1.

## PHASE 1+2 — module + generalized collector (committed 63f51aef)

Phases 1+2 coupled (gating tests need the collector); committed together:
- compiler/runtime/stdlib/random.js (shim: random() / randomInt())
- stdlib/random/index.scrml (module + ~{} inline test block)
- type-system.ts: collectNowFromScrmlTime -> registry-driven collectNonDetStdlibBindings
  (NONDET_STDLIB registry + nonDetStdlibBindings Set + nonDetStdlibOrigin Map);
  signature + 2 call sites + firing block generalized. E-FN-004 message uses the origin
  label (`scrml:random.random`, `scrml:time.now`).
- compiler/tests/unit/stdlib-random-capability.test.js (R1-R13): server-fn OK, function OK,
  fn -> E-FN-004 (random+randomInt+alias), user-own-random NOT gated, now() STILL gates,
  shim behavior ([0,1) + inclusive int + swapped-bounds normalize).
- shim-resolution: + { random, random } manifest row.
Full pre-commit suite passed. now()/math/transitive all green (no regression).

## PHASE 3 — corpus migration + http de-leak

All 6 Math.random sites migrated; corpus .scrml consumer Math.random = 0 (only the
scrml:random module itself touches Math.random — the sanctioned source):
- examples/.../dispatch/billing.scrml:104       -> randomInt(0, 100000) (+ import)
- examples/.../dispatch/load-detail.scrml:154   -> randomInt(0, 100000) (+ import)
- examples/.../driver/load-detail.scrml:167     -> randomInt(0, 100000) (+ import)
- samples/gauntlet-r11/rust-state-machine.scrml:102 -> random() < 0.5 (+ import; file has
  PRE-EXISTING E-STYLE-001/try-catch/E-VARIANT errors — gauntlet sample, unrelated to this change)
- samples/compilation-tests/meta-003-function.scrml:11 -> "meta-" + random() (+ ${import})
- stdlib/http/index.scrml:275 retry-jitter -> random() * 2 - 1 (+ import) — DE-LEAKED
  (http is NOT client-inlined; server-only-bundled like time.js)
- compiler/runtime/stdlib/http.js:194 shim -> random() (import { random } from "./random.js")
http de-leak VERIFIED end-to-end: compiling a file that imports scrml:http copies BOTH
http.js AND random.js into _scrml/ (S176 copyTransitiveShimSiblings). No client ReferenceError.
Math.pow/Math.max in http/index.scrml left untouched (pure-math, separate ouroboros, out of scope).

### Phase 3 test-reconcile (coupled to the migration edits)
- conf-TRY-CATCH-IN-SCRML-SOURCE.test.js: http/index.scrml try-site line assertions 65/264 -> 69/268
  (+4 from the de-leak import block; the 2 remaining try sites are PRE-EXISTING, pending Phase 3c).
- parser-conformance-within-node-allowlist.json: bumped within-node native-divergence budgets for the
  6 changed .scrml + NEW stdlib/random/index.scrml entry. All deltas are benign SPAN-COORD/FIELD-SHAPE/
  MISSING-FIELD/COUNT-LENGTH shifts (PARSE-FAILURE:0, NESTED-SHAPE:0 — no real native bug). within-node 1008/0.

## PHASE 4 — SPEC + PRIMER + known-gaps

- SPEC NEW §41.20 `scrml:random` (after §41.19): random()/randomInt surface + INCLUSIVE convention
  + capability rule (non-det, E-FN-004-gated, forbidden in pure fn, allowed in function/server fn,
  binding-aware) + cross-refs §48.3.4/§48.6.2/§33/§34/§41.18/§41.19. NO new §34 code (E-FN-004 reused).
- SPEC §41.18 random()-exclusion note: "separate design decision" -> "decided: scrml:random (§41.20)".
- PRIMER §10: header 17->18 modules + scrml:random row (capability-scoped non-det) + math row note
  fixed to point at §41.20 + honesty-positioning line adds the random-source capability-scoping.
- known-gaps.md: g-random-primitive status=open -> status=resolved (full resolution note).
- Did NOT touch adopter-marketing docs (kickstarter/scrml.dev) — pa.md Rule 1.

## PHASE 5 — R26 EMPIRICAL (all pass)

| # | Check | Expected | Result |
|---|-------|----------|--------|
| R26-1 | random()+randomInt() in `server function` | 0 E-FN-004 | 0 — PASS |
| R26-2 | random()+randomInt() in pure `fn` | E-FN-004 each | 2 fires, origin labels `scrml:random.random` / `scrml:random.randomInt` — PASS |
| R26-3 | now() in pure `fn` (regression) | E-FN-004 (still gates) | 1 fire `scrml:time.now` — PASS (no regression) |
| R26-4 | user-own `function random()` in `fn` | NOT gated | 0 E-FN-004 — PASS |
| R26-5 | emitted JS calls shim + node --check | clean | server.js `import { random, randomInt } from "./_scrml/random.js"` + `randomInt(0,100000)` / `random()` call; all emitted .js node --check OK; _scrml/random.js copied — PASS |
| R26-6 | corpus consumer Math.random in .scrml | 0 | 0 (examples+samples+stdlib ex-random); Math.random lives ONLY in scrml:random module — PASS |
| R26-7 | full `bun run test` | 0 fail | 23680 pass / 220 skip / 1 todo / 0 fail (baseline 23662/0) — PASS |

Note (inherited, not new): client.js emits the import-rewrite line `const { random, randomInt } =
_scrml_stdlib.random;` (no stdlib-random client chunk) — BYTE-IDENTICAL to the established
`scrml:time` behavior (`const { now } = _scrml_stdlib.time;`, no stdlib-time chunk). Both are
server-side primitives; the only callers are server functions whose bodies are stripped from the
client, so the destructure is harmless dead code (no Math.random / server-fn body leaks to client).
This is the S176 now()/math precedent mirrored exactly — not a regression.

DONE. All 5 phases complete. g-random-primitive RESOLVED.
