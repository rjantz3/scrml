# scrmlTS — Session 118 (OPEN)

**Date:** 2026-05-21
**Previous:** `handOffs/hand-off-120.md` (S117 CLOSE — rotated at S118 OPEN)
**Machine:** single-machine (S100 directive holds)
**HEAD at S118 OPEN:** S117 wrap commit (`778b1db3`)

---

## Session-start state (S118 OPEN)

- pa.md read in full · PRIMER + SPEC-INDEX consulted · master-list §0 read · S117 hand-off + user-voice S114/S115/S117 read.
- Sync hygiene: `git fetch` both repos — scrmlTS `0 0`, scrml-support `0 0`. Clean working trees.
- Hooks: Configuration B (pre-commit + post-commit + pre-push installed at `.git/hooks/`).
- Inbox `handOffs/incoming/`: empty (no `.md` messages).
- Tests at open: 18,173 pass / 0 fail / 169 skip / 1 todo / 739 files (S117 close baseline).
- pkg.json: 0.4.0 — v0.4.0 tag stands.
- `.claude/maps/` watermark `67a17dc5` — HEAD is ahead by the S117 commits; refresh before any dev dispatch touching changed files.

## Next priority (from S117 carry-forwards)

1. **Build-story SPEC authoring** — the `§N Build Story` section (Merkle-closure artifact, Approach B) + `<program build-story=>` attribute (§4.12.2) + `[build-story]` manifest table (§22.13) + §47.5 amendment + ABI-invariance rule. ONE coordinated SPEC amendment. User said "straight to spec auth." Attribute name: deep-dive recommends `build-story=` over README's `compiler=` — settle at authoring. Serializes on SPEC.md.
2. **M5 v0.6 units** — dispatch off the re-decomposition DAG (`m5-swap-redecomposition-2026-05-21.md`): expression-catalog bridge (`translate-expr` sibling to R1's `translate-stmt`) + hoist fix (R2 declaration-shape synthesis). 13-unit DAG + `token.js` file-contention hazard documented.

## Open threads / carry-forwards (full list in hand-off-120.md §"Open threads")

- dev.to online article updates (paste-ready package + user platform action)
- Living Compiler retraction — pending user stamp + publish
- "Second note from the developer" — scaffold supplied, user writes
- scrml.dev article canonicalization
- SPEC-INDEX Quick-Lookup mini-index stale (R4 surfaced — §34 ~1,200 lines off)
- X1 — `class`/`try`/`throw` parse-layer rejection (native-parser-completion / v0.7)
- §29 vanilla-interop debate panel undefined
- Pre-existing (S114): generator policy; tableFor v1.next impl; PRIMER match-block section; MK4 lazy-require ESM cycle

## Push state

- Both repos `0 0` at open. No commits yet this session.

---

## Tags
#session-118 #OPEN #build-story-spec-auth-next #m5-v0.6-units
