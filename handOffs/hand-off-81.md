# scrmlTS — Session 81 (OPEN)

**Date opened:** 2026-05-11
**Previous:** `handOffs/hand-off-80.md` (S80 close — auth/protect/csrf codification + D3 csrf= drift resolved + E-MW-001 retired + Bootstrap L3 strip-bug FIXED + A5-7 canonical sample family + 6 commits / 0 regressions / pushed)
**This file:** rotates to `handOffs/hand-off-81.md` at S82 open

**Tests at open (S80 close baseline):**
- pre-commit subset: **10,416 pass / 62 skip / 1 todo / 0 fail** (506 files)
- full suite: **11,139 pass / 73 skip / 1 todo / 0 fail** (534 files)

---

## S81 session-start state

### Cross-machine sync — VERIFIED

- **scrmlTS:** clean. `origin/main` 0/0 (already pushed at S80 close).
- **scrml-support:** behind by 2 commits at session start; `git pull --rebase origin main` was clean. Now 0/0 with origin. Untracked files present in working tree (`tools/` directory + 5 `voice/articles/*.md` drafts) — these are pre-existing local-only artifacts unrelated to S80 work; left in place.

### Hook installation — VERIFIED on this machine

`git config --get core.hooksPath` → `scripts/git-hooks` (already installed from S80 session — persistent in `.git/config`).

### Incoming inbox — EMPTY

`handOffs/incoming/` contains only the `read/` subdir. No unread messages.

### Primer + pa.md + hand-off — READ

Per pa.md §"Session-start checklist" — pa.md, PA-SCRML-PRIMER.md (read through §13.7 B14 specifics), hand-off-80.md, and the last ~10 contentful user-voice entries (S72 — server-keyword reframe, body-split design dive, csrfSQL composition debate trigger) all read.

---

## S81 next priority — menu (carry-forward from S80 close)

S80 closed four threads. Remaining active priorities:

1. **Phase A10 deferred items** (preserved from S78/S79):
   - Payload-binding scope injection (`<Error msg>` introducing `msg` as local in body sub-scope)
   - Type-system body-walk re-enablement (gated on emission-boundary structural-element filter)

2. **Self-host parity work** — `cg.scrml` structural restructure (exports inside `^{}` meta-block produces empty dist; the L2 tests soft-pass only because `cg.runCG` is undefined) + the deeper self-host divergence (21 parity assertions fail when L2/L3 properly wired). Substantial project; pre-condition for un-skipping Bootstrap L3 cleanly.

3. **Multi-token threshold deep-read** (~1-2h) — per S78 audit caveat. Per-file deep-read of `codegen/emit-*.ts` to catch 2-4 more Bucket C threshold items (rate-limit, CSRF, CORS Max-Age) that grep can't catch (`5 * 1000`-shape arithmetic).

4. **Debounce/throttle imperative keyword-call retirement** (OQ-2, deferred from S79 dispatch). Retire `debounce(fn, ms)` / `throttle(fn, ms)` AST kinds in favor of `scrml:time.debounce` / `scrml:time.throttle` stdlib imports. ~3-5h. Should solidify the stdlib alternative first.

5. **A6-6 optional API alignment** — LSP/CG API design dive (TBD).

6. **A9 Ext 5 follow-ups** (D1/D3/D5 from S76):
   - D1 export-synth modifier propagation
   - D3 pure-fn-call detection in classifier (over-emits keys)
   - D5 Redis backend inlining

7. **Insight 28 OQ-bridge-5** — compile-time WARNING when bridged validator on schema-column field — defer to compiler-diagnostics audit pass.

8. **Insight 28 OQ-bridge-2** — passive (re-debate trigger on ≥3 adopter friction reports).

9. **W-LEAK-010 follow-up** (per memory-leak deep-dive refresh §7.2):
   - Step 2: `<program idempotency-store=>` background sweeper (CG/runtime dispatch)
   - Step 3: LC pass implementation (Stage 7.6, SCOPE-AND-DECOMPOSITION dispatch)
   - Hold for v0.3.0+ unless W-LEAK-010 spec-amendment is fast-tracked

10. **Versioning-discipline discussion** (deferred from S78) — patch-version-as-lifecycle-stage thread.

11. **SPEC-INDEX.md regeneration** — per S64 audit + S78/S79/S80 amendments: stale. Generated via `bash scripts/update-spec-index.sh`. Mechanical.

12. **Project-mapper refresh** — last full cold-start at S79 open. S80 touched ~20 files across SPEC + src + tests + samples + dist. Incremental refresh at session start is OPTIONAL; PA awaits user direction.

**Articles thread (5 in-flight drafts at scrml-support/voice/articles/):** Per pa.md Rule 1, no PA-volunteered marketing work; await user-raised threads.

---

## Open questions to surface at S81 open

1. **Push state:** scrmlTS clean. scrml-support clean (post-rebase). No outstanding push.

2. **Project-mapper refresh** — incremental against ~20 S80-touched files, OR full cold-start if Phase A10 / cg.scrml-restructure surface is next priority? Default = no refresh until user indicates direction.

3. **Worktree branches retained from S79** (forensic per S67): `worktree-agent-ab656f3dcdd0f1638` (S79 debounce/throttle dispatch, 6 WIP commits). S80 had no dispatches. Cleanup not priority.

4. **scrml-dev-pipeline agent not staged on THIS machine.** Future compiler-source dispatches need either (a) master to stage `scrml-dev-pipeline` (and switch machines after) OR (b) continue using `general-purpose` for SPEC-text-only work / `scrml-deep-dive` for diagnostics.

5. **3 legacy master inbox carry-overs** (S78+S79+S80 carry-forward, still safe-to-ignore unless sweep requested):
   - `2026-04-22-scrmlTS-to-master-insight-25-multi-meta.md` (UNREAD legacy)
   - `2026-05-08-S72-scrmlTS-to-master-needs-push-SUPERSEDED.md`
   - `2026-05-08-S71-scrmlTS-to-master-stage-scrml-dev-pipeline.md`

6. **`<channel protect=>` → `<channel auth=>` rename (S80) is a hard break.** Any in-tree `<channel protect=>` now emits `W-ATTR-001`. PA updated all in-tree refs at S80; cross-repo refs in scrml-support / giti / 6nz are NOT scrubbed.

7. **E-MW-001 RETIRED.** Any docs / articles / tests citing it as live should be reviewed. In-tree scrubbed at S80; cross-repo refs not.

---

## Things S81 must NOT screw up (S77/S78/S79/S80 standing list)

S77/S78/S79/S80 lists carry forward verbatim. Key S80 additions:

- **DON'T cite E-MW-001 as live.** Retired at S80.
- **DON'T accept `csrf="on"` in new test fixtures or samples.** Canonical value set is `"auto"|"off"`.
- **DON'T accept `<channel protect=>` in new code.** Renamed to `<channel auth=>`.
- **DON'T add `<program protect=>` in new examples.** Shorthand retired; per-block `<db protect=>` is canonical.
- **DON'T un-skip Bootstrap L3** without first fixing cg.scrml structural issue + self-host parity gap.
- **DON'T forget to mirror TS-side ast-builder.js changes into compiler/self-host/ast.scrml** (and emit-server.ts → self-host section-assembly.js). S80 missed this initially; caught at wrap-time.
- **DO use `bun run scripts/rebuild-self-host-dist.ts`** after editing any self-host scrml source.
- **DON'T treat audit estimates as authoritative without an audit-first phase.** S80 A5-7 inventory found 12-18h estimate was ~10x too large.

---

## Tags

#session-81 #open #caught-up #awaiting-next-priority #s80-push-clean #scrml-support-rebased-clean #hook-installed
