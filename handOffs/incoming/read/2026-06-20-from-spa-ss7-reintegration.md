# sPA ss7 → PA — re-integration (needs: action)

**From:** sPA ss7 (meta-reflect-l22, S210-rebuild run) · **To:** PA · **Date:** 2026-06-20
**Action:** re-integrate branch `spa/ss7` → main (single-writer, S147 coherence-gated), then push. **+ 2 escalations below (item-2 reclassification/re-cluster + a brief-seed-currency note).**

## LIST DISPOSITIONED — n=2

| item | sev | disposition | landing SHA |
|------|-----|-------------|-------------|
| g-reflect-variant-shape-inconsistent | LOW | **landed-on-branch** | `2c0a9e17` |
| g-mount-hang-rails-dev | LOW→**robustness** | **parked → you** (reclassified + mis-clustered → ss4) | — |

- **Branch tip:** `7927fb40` (2 commits: item-1 code/test landing `2c0a9e17` + closing bookkeeping `7927fb40`). Base: `origin/main` @ `0a605d3e`. Coherence: `0 behind / 2 ahead`, tree clean.

## What landed (item 1)

`reflect(T).variants` returned **two element shapes** for the same user surface: compile-time `^{}`
`reflect(Status).variants` → bare strings (`meta-checker.ts:1463`, correct per §14.4.2 + all corpus),
but **runtime** `meta.types.reflect("Status").variants` → `{name}` objects (`emit-logic.ts`
`serializeTypeEntry`:644). The `{name}` runtime shape dropped `payload` anyway, so it carried
identical info to a string — purely an inconsistency with a test (`meta-type-registry-emission.test.js`)
locking the divergence (S96 pattern). Fix: runtime emit → bare strings, **union-robust** over the
internal `string|{name}` intermediate. Flipped the one locking test.

**Brief-seed currency note (R4):** the list brief-seed pointed at three meta-checker.ts loci
(:1463/:2041/:2209) and said "pick strings across all three." The actual runtime-observable divergence
is in **`emit-logic.ts` `serializeTypeEntry`** (not a named locus); `:2041`/`:2209` are
compiler-internal intermediates that the union-robust emit reads fine — left untouched (minimal blast).
Worth a brief-seed correction if ss7 is ever refreshed.

**Left untouched (correct):** `runtime-meta-integration.test.js:443/628/658` assert `{name}` but test
runtime *pass-through* of a hand-built `typeRegistry` fixture into `_scrml_meta_effect` — they never
invoke the emitter, so they are not locking the codegen shape. They still pass.

**Provenance:** agent `af0182404c6565617`, src SHA `e0af8314`, file-delta'd (S67) into spa/ss7. Files:
`compiler/src/codegen/emit-logic.ts` (+brief test). Full suite (incl. browser) **24762 pass / 0 fail**.

## Parked → you (escalation: reclassify + re-cluster + re-prioritize)

**item 2 `g-mount-hang-rails-dev` — the brief-seed is WRONG on both axes.**
- Briefed as: *runtime happy-dom mount hang, 0% CPU blocked await, low-urgency stress sample, fix in
  meta-checker.ts.*
- R26 reality: the **COMPILE infinite-loops at 100% CPU** (timeout 60 → exit 124, 0 output files;
  never reaches mount). The loop is inside **`nativeParseFile`** (the native parser), reached from the
  meta-eval re-parse (`meta-eval.ts:380`). `rails-dev.scrml` is a pure compile-time `^{}` sample with
  no runtime effects, so "mount hang" was never plausible.

**Why parked (not sPA-fixed):**
1. **Mis-clustered.** The loop is in `compiler/native-parser/` = **ss4** (native-parser) ingestion, not
   ss7 (meta-checker/render-harness). Cross-ingestion escalate-trigger.
2. **Robustness-class, not "low urgency."** A parser that fails to terminate on malformed input can
   hang the whole compiler via the meta-emit re-parse path. Recommend re-prioritizing above LOW.
3. Needs native-parser expertise + heavy conformance verification; the native parser is mid-migration
   (S115/S162 mirror hazards).

**For the ss4 dev-agent (groundwork done — `docs/changes/ss7-rails-dev-hang/FINDINGS.md`):**
- Reliable repro: `timeout 60 bun run compiler/src/cli.js compile samples/gauntlet-r18/rails-dev.scrml -o /tmp/x/` → exit 124, 100% CPU.
- 8 reduced reproducers (A/B/C/D/G/H/I/J) ALL error cleanly with `E-META-EVAL-002` — only the full
  sample's specific block *accumulation* loops. Minimal repro elusive; the full sample is the repro.
- Fix target: instrument `nativeParseFile` on the full repro to find the no-forward-progress token
  position (error-recovery branch that fails to advance the cursor); make it terminate with a clean
  diagnostic like the simpler cases. Verify full native-parser conformance stays green.

## Residual for your bookkeeping
- known-gaps / INDEX: `g-mount-hang-rails-dev` should move ss7→ss4 and be re-tiered (robustness).
- spa/ss7 list file + `ss7.progress.md` (on-branch) carry the per-item dispositions.
- No SPEC amendment owed for item 1 (§14.4.2 already says "variant names" = strings; the fix conforms).

— sPA ss7, closing (no wrap; durable output = branch `spa/ss7@7927fb40` + this message).
