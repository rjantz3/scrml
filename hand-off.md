# scrmlTS — Session 122 (OPEN)

**Date:** 2026-05-23
**Previous:** `handOffs/hand-off-124.md` (S121 CLOSE — rotated at S122 OPEN)
**Machine:** single-machine (S100 directive holds)
**HEAD at S122 OPEN:** `136678e5` (S121 wrap commit — pushed)

---

## Session-start state

| Item | Status |
|---|---|
| scrmlTS origin sync | clean — 0/0 ahead/behind |
| scrml-support origin sync | clean commits; 6 untracked items (pre-dating session) — see "Open questions" |
| Inbox `handOffs/incoming/` | empty (only `read/` subdir) |
| pkg.json version | 0.6.0 (matches latest tag) |
| Tags newly fetched | v0.5.0 + v0.6.0 (were on remote, hadn't synced to this clone) |
| Hook gate | **REGRESSED + RECOVERED PARTIALLY** — see "Open questions" |
| `.claude/maps/` | watermark `a8904945` — **29+ commits stale, needs refresh** before any dev dispatch |
| Worktrees | clean (per S121 wrap) |
| pa.md authority | `../scrml-support/pa-scrmlTS.md` read in full |
| PRIMER | `docs/PA-SCRML-PRIMER.md` read (§1-§13) |
| SPEC-INDEX | `compiler/SPEC-INDEX.md` read |
| Master-list §0 | LIVE dashboard read; §0.6 reflects S121 close |
| User-voice | S120 + S121 entries read |

---

## Open questions to surface immediately

### 1. POST-COMMIT HOOK LOST (Configuration B downgraded to A+pre-push)

`core.hooksPath = .git/hooks` (Configuration B per pa.md S88), but `.git/hooks/` had only `.sample` files at session start. Re-installed `pre-commit` + `pre-push` via `./scripts/git-hooks/install.sh`. **`post-commit` is GONE** — it was machine-local-only and not source-controlled (scripts/git-hooks/ has no post-commit). The S121 hand-off claimed Configuration B was in place with all three hooks; the regression must have happened between S121 wrap and now.

Impact: post-commit was the informational full-suite re-run on compiler changes. Loss is non-blocking (pre-commit is the load-bearing gate; pre-push runs full suite + TodoMVC quick check). User decides whether to restore by hand.

### 2. scrml-support 6 untracked items (pre-dating this session)

```
?? tools/
?? voice/articles/2026-05-09-devto-openers-tier1.md
?? voice/articles/2026-05-09-devto-reply-modularity-v2-POST.md
?? voice/articles/2026-05-09-devto-reply-modularity-v2-slow-burn.md
?? voice/articles/2026-05-09-devto-reply-modularity.md
?? voice/articles/2026-05-09-devto-reply-modularity-v2-slow-burn.md
?? voice/articles/2026-05-09-server-keyword-deprecation.md
```

Dated 2026-05-09 — predate S121 by 13 days. Per pa.md Rule 1 (no marketing work unless user raises) these are NOT for PA to dispose without user direction. Surface; await disposition.

### 3. Maps refresh required before any dev dispatch

Per S121 hand-off carry-forward + pa.md maps-discipline protocol. Map watermark `a8904945`; HEAD `136678e5`. 29+ commits stale.

### 4. Carry-forwards from S121 close (no action without user direction)

- **Wave 12 candidates** (well-scoped, ready): Unit U (E-MU-001 `tag-frame.scrml` ~1-2h) + Unit V (auto-state-cell deep-dive ~3-5h survey) + Unit W (imp.names misuse residuals ~2-3h)
- **SPEC-vs-impl §48.3.3 divergence** (deep-dive candidate) — Unit N surfaced it; spec says fn bodies may mutate local @-cells, compiler fires E-FN-003 anyway
- **Sibling false-negative class** — RI TRIGGER detection on EXPR_NODE fields (Unit P added CALLEE; TRIGGER not extended)
- **Bug 9** (dashboard async-not-awaited codegen) — defer to post-M6 per corpus-sweep PLAN
- **Dashboard still broken at runtime** (Bug 9 / PLAN ledger)
- **Pre-existing carry-forwards** (unchanged): dev.to article updates (Rule 1) · Living Compiler retraction stamp · scrml.dev canonicalization · SPEC-INDEX Quick-Lookup mini-index stale (S117 flag) · §29 vanilla-interop divergence · Generator policy (S114) · PRIMER match-block subsection update (now possible since P5-7) · MK4 lazy-require ESM cycle · §58 build-story determinism audit · `eb941333` stray commit (S119 P4-2-agent CWD slip — harmless)

---

## What landed S122 — by wave

**Wave 1 — dispatched 2026-05-23 ~04:40, both completed ~05:00:**

- **project-mapper** ✅ — incremental refresh `a8904945` → `136678e5`. 8 maps + primary updated; Task-Shape Routing section added to `primary.map.md` (8 task shapes mapped to 2-4-map reading orders). **Non-compliance flagged:** `.claude/maps/PHASE-4-TOUCH-POINTS.md` is a stale S33 (2026-04-20) artifact from the state-local-transition arc — not a standard map, recommend deref or delete. Pending PA disposition.

- **scrml-deep-dive on §48.3.3** ✅ — **verdict: illusory divergence.** Under V5-strict (§6.1.3 + §6.2) there is no "local `@`-cell" code shape. The S121 Unit N commit body's claim ("bodies mutate ONLY locally-declared @-cells; could arguably stay fn") was a derivative-doc paraphrase error trusting JS-transliteration shape over SPEC. E-FN-003 IS scope-aware (non-@ check uses `localNames`; @-check unconditional fire is spec-correct per §48.3.3 outer-scope-mutation rule + §6.2 program-scope-only @-cells). The 4 functions don't compile cleanly as `function` either — `parse-markup.scrml` emits 9 E-NAME-COLLIDES-STATE fires today; file is SHAPE-only mirror per its own comment. **Recommended cleanup:** rewrite 4 + 14 sibling sites in `compiler/native-parser/parse-*.scrml` to drop `@`-sigils from local-only mutations (use plain `let p = 0; p = p+1`); then re-evaluate fn-vs-function per function. ~2-2.5h scrml-dev-pipeline dispatch. Doc: `scrml-support/docs/deep-dives/spec-vs-impl-48-3-3-fn-body-cell-mutation-2026-05-23.md`. **Rule 4 lesson banked.** **Adjacency questions noted (out of scope):** (a) Pillar-5b convention — should native-parser .scrml mirrors be SHAPE-only or compile-clean; (b) Did-you-mean diagnostic for E-NAME-COLLIDES-STATE on `let X` + `@X` co-occurrence.

**Implications for S121's queued Wave 12:**
- Unit V (auto-state-cell deep-dive) scope likely NARROWS — the deep-dive surfaces evidence that "phantom state cell synthesis" is partly an artifact of corpus mis-use of `@`-sigils. Unit V may fold into / reframe around the cleanup.
- Unit U (E-MU-001 tag-frame.scrml TILDE-DECL confusion) + Unit W (imp.names misuse at name-resolver + api.js) remain unchanged.
- NEW Unit X (deep-dive recommended cleanup) — bounded ~2-2.5h, file-disjoint from U/V/W, dispatchable in parallel.

**Sequencing options (awaiting PA decision):**
- A: Cleanup (Unit X) now in parallel with U+W; re-scope V post-cleanup
- B: Unit V survey first (now narrower question), then cleanup with broader framing
- C: Original U → V → W → cleanup last

---

## Process incidents — S122

(none yet)

---

## Memos written this session

(none yet)
