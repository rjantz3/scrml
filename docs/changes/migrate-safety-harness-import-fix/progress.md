# Migrate safety-harness import fix — progress

Dispatch: Wave-2 follow-up. Fixes `sanityCheckParse` in `compiler/src/commands/migrate.js` failing 20/36 trucking-dispatch route files due to cross-file imports not resolving in the per-call tmp staging directory.

## 2026-05-12 — initial survey

- Repo branch was at `23e6265` (pre-Wave-2 state); rebased onto main (`a918a3a`) to pick up `--program-shape` infra and the live `sanityCheckParse` at `compiler/src/commands/migrate.js` line 1126.
- `compileScrml` resolves cross-file imports via `module-resolver.js#resolveModulePath`, which keys off `dirname(importerPath)`. Staging the source under `/tmp/scrml-migrate-check-XXX/` makes every relative import resolve to a nonexistent tmp path → MOD fires E-IMPORT-006 → gate fails.
- Both `compileScrml`'s auto-gather pre-pass (api.js:434-525) and MOD's E-IMPORT-006 emission key off the same importerPath dirname — the gate's environmental mismatch comes entirely from the staging dir choice, not the compileScrml options.
- Existing test `compiler/tests/commands/migrate-program-shape.test.js §5` engineers a broken cross-file case (import of `./nonexistent.scrml`) and asserts the gate fails. That test's value SURVIVES option β (full-fidelity check against real importerPath) — `./nonexistent.scrml` actually doesn't exist, gate still fires correctly. The test would NOT survive option γ (parse-only) — parse-only doesn't see import resolution at all.

## Option picked — β (transactional in-place rewrite + verify + restore)

Rationale:
- Preserves full-fidelity safety check (catches parseable-but-semantically-broken rewrites; e.g. dangling imports).
- The §5 test in the existing suite already validates exactly this property and continues to pass under β.
- The fix is mechanistically small — single function, swap staging-tmp for in-place write + try/finally restore. No new walk-up-to-project-root logic, no symlink trees, no parse-only carve-out.
- Risk surface: an SIGKILL during the compile window leaves the file at "rewrite candidate" state. Mitigation: try/finally always restores from in-memory backup before returning. The window is microseconds (single compile invocation).

## Validation — 2026-05-12

Pre-fix vs post-fix trucking-dispatch `--program-shape --dry-run --report`:

| Bucket  | Pre-fix | Post-fix |
|---------|---------|----------|
| REWRITE | 4       | 24       |
| failed  | 20      | 12       |
| unchanged | 12    | 0 (changed→action ADVISORY/NOOP, counted as "unchanged" in summary line) |

Acceptance criterion ("≥ 19/36 files no longer failing") satisfied: 24/36 no longer failing (vs 16/36 pre-fix).

The 12 remaining failures are NOT env-mismatch false positives — they are real v0.3 spec violations:
`E-CHANNEL-OUTSIDE-PROGRAM` fires because the trucking-dispatch channel/*.scrml files declare `<channel>` at file top level (no `<program>` ancestor), which v0.2 accepted but v0.3 rejects (SPEC §38.1 + §34). The rewrite produces correct-for-that-file v0.3 source, but the imported channel-side file is structurally v0.2. Restructuring those is Wave-3 fixture-sweep work (out of scope per dispatch brief).

Test results: 11584 pass / 0 fail / 562 files (+4 tests vs S86 baseline of 11580).

Promote.js (compiler/src/commands/promote.js:442) has the same staged-tmp pattern but is NOT in this dispatch's scope — the recon command is `migrate`, not `promote`. Noted for follow-up if F-PROMOTE-005 surfaces the same friction on multi-file fixtures.
