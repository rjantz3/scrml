# scrmlTS — Session 99 (LIVE)

**Date:** 2026-05-17
**Previous:** `handOffs/hand-off-100.md` (S98 CLOSE — comprehensive landing summary)
**Machine:** A (orchestrator per S98A velocity-mode shift)
**Status:** Mid-session; B1 dispatch in flight

---

## S99 landed so far (chronological)

```
c9b8821  docs(readme): refresh current-state to v0.3.0 STABLE + v0.3.x patch arc
87426c8  fix(A4): is some / is not / is .V preprocessor — preserve member-access LHS
bc475db  docs(handoff): notify Machine B of twitter-archive corpus source
6ef8782  docs(voice) [scrml-support]: add twitter-archive 2026-05-17 corpus source
64b2e54  fix(A1): scope-walker gaps on export-class + destructuring (A2-anomaly-2-surfaced)
dbd827f  fix(A2-FUP-2): RI promotion for `export function foo() { server { ... } }`
79c0714  fix(A3): parseParamList default-value handling + token.scrml §42 migration
c4fc98a  fix(ast-builder): A2 anomaly-2 — populate params+body on export function synth stubs
98e28ce  docs(voice) [scrml-support]: user bridge-Q1 prose + Q3 lead-in on state-vs-logic scaffold
0ad5f47  docs(handoff): notify Machine B of state-vs-logic scaffold update + process S98B wrap
```

**5 compiler fixes + 2 cross-machine notifications + 1 README refresh + 1 voice scaffold update + 1 twitter corpus source landed.**

---

## A2-anomaly-2 cascade — CLOSED end-to-end this session

The S98 A2 fix populated `params` + `body` on `export function` synth stubs (previously empty). That unmasked a cascade of pre-existing scope/parser gaps. All four resolved this session:

| Dispatch | Root cause | Fix locus | Tests |
|---|---|---|---|
| **A1** (`64b2e54`) | type-system scope walker missed (§A) `export class` names, (§B) for-of destructure, (§C) const destructure | type-system.ts + new helper `extractDestructuredNames` | +12 unit; un-skip module-resolver + emit-library §7 |
| **A2-FUP-2** (`dbd827f`) | RI didn't promote functions containing `server { … }` blocks because the bare `server` KEYWORD captured as malformed `bare-expr` | route-inference.ts pre-pass `rewriteServerBlockStubs` | +9; un-skip 2 trucking-dispatch baseline tests |
| **A3** (`79c0714`) | `parseParamList` accumulated tokens between commas into one string; default-value `= expr` separator never detected | ast-builder.js `parseParamList` + new `paramSignature` helper in codegen/utils.ts | +14 |
| **A4** (`87426c8`) | `is some` LHS preprocessor char-class allowed `.` but not whitespace around `.`; collectExpr emits whitespace-padded tokens; preprocessor inverted receiver/argument | expression-parser.ts `LHS_IDENT_CHAIN` constant | +13; un-skip 1 trucking-dispatch |

**Net: 0 → 4 .skip tests un-skipped (was 4 introduced when A2-anomaly-2 first landed at c4fc98a).** All four residuals from the cascade now closed.

---

## Tests state (post-A4 at HEAD c9b8821)

**12,331 pass / 93 skip / 1 todo / 0 fail / 641 files / ~41,640 expect() calls** (sec ≈40s for the pre-commit subset; full suite ~50s).

Skip counts vs prior baselines:
- S98 close: 133+ skip (incl. browser flakes)
- S99 mid-session at first restore: 98 skip
- S99 post-A1: 96 skip (–2 from A1 un-skips of module-resolver + emit-library §7)
- S99 post-A2-FUP-2: 95 skip (–2 from trucking-dispatch un-skips, +1 from baseline updates)
- S99 post-A4: 93 skip (–1 from trucking-dispatch "compile completes" un-skip; –1 from baseline E-SCOPE-001 entry removal)

---

## IN-FLIGHT at this moment

### B1 — §51.0.B.1 payload-binding compiler-feature wiring (track 2)

Dispatched 2026-05-17 ~15:00 local. SPEC amendment landed S98 at `7ba0268`; this is the compiler-feature wiring. 3 sub-deliverables:

1. **Parser** — extract `payloadBindings` from state-child attribute list per 3 forms (bare-attribute / named / parenthesized)
2. **PASS 11 validation** — fire E-ENGINE-PAYLOAD-ON-UNIT-VARIANT + -ARITY-MISMATCH + -RESERVED-COLLISION
3. **Codegen** — payload-scope injection in wire function emission

Worktree `agent-a72fcd0844cebc5f7`. Standard scrml-dev-pipeline; isolation worktree; F4 startup verification + path discipline in brief; S58 leak-prevention reminder from A1 incident this session.

---

## Cross-machine activity (Machine B)

**Machine B = parallel queue worker, S98A velocity-mode active.** Pushed during this session:
- `5a12b19` scrml-support wrap: 645 corpus candidates + hand-off rotation
- `88cdc64` scrmlTS S98B wrap report to Machine A inbox (processed: moved to read/ at `341287d`)
- `e644ffd` scrml-support: S99 working draft assembly of state-vs-logic axiom essay (80 lines built on user's bridge-Q1 prose)

**Inbox to Machine B** (Machine A → B, awaiting their pickup):
- `2026-05-17-0700` parallel-work-split (S98 OPEN — old)
- `2026-05-17-1100` queue-shift to velocity-mode (S98A — old)
- `2026-05-17-1500` state-vs-logic scaffold update notification (S99 — new)
- `2026-05-17-1700` twitter-archive corpus source notification (S99 — new)

---

## Other S99 work

- **README refreshed** — v0.3.0 STABLE framing, count updates (12,300+ tests / 23 examples / 289 compilation tests / 27,144 SPEC lines), Phase B SPA tree-shake noted, S99 in-flight noted. Pushed `c9b8821`.
- **Twitter / X archive corpus source** — user dropped 21MB archive into `scrmlMaster/.claude/`; moved to `scrml-support/voice/corpus-sources/twitter-archive-2026-05-17.zip` + README documenting the new subdirectory's role. Awaits Machine B's voice-author corpus-refresh pass.
- **Worktree cleanup** — 12 stale worktrees from S98 + S99 file-delta-landed agents cleaned per S83 protocol. Final state: main + B1 worktree only.

---

## Carry-forward priorities (sequenced for next thread)

### Queued

1. **A5** (NEW from A1 dispatch report) — structured destructuring-pattern AST nodes in `ast-builder.js`; retires A1's regex-based `extractDestructuredNames` workaround in type-system.ts. ~2-4h.
2. **A6** (NEW from A1 dispatch report) — nested `fn name(…)` keyword form parsing in function bodies; TAB stage currently emits "statement boundary not detected" warning + parses as bare-expr. Closes residual self-host-meta-checker .skip.
3. **A7** (NEW from A3 dispatch report) — `compiler/self-host/tab.scrml` line 1078 `switch (type)` silent gap in forbidden-keyword detector when reached through certain function-body parsing paths.
4. **Bare-compound `is some` Phase B** — `regex.exec(str) is some`, `a || b is some` per SPEC §42.2.4 implementation note. Already documented in SPEC.
5. **CG quality on rewritten `server { … }` bare-expr** (from A2-FUP-2) — RI fix is correct; CG emission of raw `server { ?{…} }` text produces invalid JS. Two options: deprecate the wrapper syntax (per SPEC §12.2 inference does the work) OR add structured server-block AST.

### Held pending user direction

- **lin redesign Phase 1** — user paused S98 ("I'll think about lin")
- **Typestate-primitive meta-shape** — design horizon stub at `scrml-support 124204e`
- **Claude-session-log corpus-refresh on this machine** — Machine B requested in their S98B wrap; user-asked status this session; pending direction (run now / queue / skip)

### v0.3.x / v0.5+ backlog

- **CG hotspot deep characterization** — v0.5+ horizon
- **BS-level `/* */` bug** — sub-anomaly from A1 fix (S98); v0.3.x

---

## **gingerBill is reading the language right now** (S99 user surfaced)

User got a DM from gingerBill (creator of Odin) — he's looking at scrml currently. README refresh + hand-off update prioritized as a result. Implications for ongoing work:

- Be honest about current state (no marketing puffery per Rule 5)
- Compiler-engineering depth is the audience-fit (he ships Odin's C compiler)
- Recent S99 work — A2-anomaly-2 cascade closure end-to-end — is the kind of compiler-realism a serious peer would respect
- Don't hyper-optimize for a hypothetical reader; keep the substantive work moving

---

## Things S99 PA must NOT screw up (carry-forwards)

### Permanently load-bearing
- pa.md Rules 1-5 (no marketing without prompt; full-production fidelity; right beats easy; SPEC normative; shoot straight)
- All S96/S97/S98 PA-memory rules in `~/.claude/projects/-home-bryan-scrmlMaster-scrmlTS/memory/`
- Cross-machine sync hygiene
- S83 commit discipline two-sided rule
- S88 isolation:worktree mandatory on every dev-agent Agent() call
- S91 CWD-routing rule (Bash `cd` to sibling repo + Agent dispatch = wrong-repo worktree allocation)
- S58 / F4 path discipline — sub-agents writing to main's checkout instead of their worktree (A1 incident this session; reset cost minimal because work was committed to A1's branch too)

### S98 NEW (still load-bearing)
- Pillar 5b "Reach discipline" — state-shape first; logic when calculation
- Velocity-mode protocol — primary orchestrator + parallel queue worker shape
- A3 SURVEY pattern — when M1.x surfaces a "spec/compiler iteration needed" gap, fire SURVEY-ONLY first; then split SPEC + compiler tracks

---

## Tags

#session-99 #LIVE #v0.3.0-stable #v0.3.x-in-flight #a2-anomaly-2-cascade-closed #b1-in-flight #gingerbill-attention #readme-refreshed #s99-twitter-archive #worktree-cleanup-done
