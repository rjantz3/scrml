# build.map.md
# project: scrmlTS
# updated: 2026-05-06T23:50:00Z  commit: 7334fb0

## Development Commands (root `package.json > scripts`)

bun run compile             — `bun run compiler/src/cli.js compile` — one-shot compile.
bun run watch               — `bun --watch compiler/src/cli.js compile` — file-watch recompile.
bun run lsp                 — `bun run lsp/server.js --stdio` — start LSP over stdio.
bun run bench               — `bun run compiler/src/cli.js compile samples/compilation-tests/ --timing` — perf benchmark.
bun run security            — compile compilation-tests + `node --check samples/compilation-tests/*/dist/*.client.js` — emitted-JS syntax / boundary verification.

## Test

bun run pretest             — `bash scripts/compile-test-samples.sh` — pre-compiles fixture samples used by integration tests.
bun run test                — `bun test compiler/tests/` — full suite (S65 baseline 9,019 pass / 44 skip / 1 todo / 0 fail across 447 files).
bun run test:coverage       — `bun test compiler/tests/ --coverage`.
Run a single file           — `bun test compiler/tests/path/to/file.test.js`.
Run by name                 — `bun test --test-name-pattern "<substring>" compiler/tests/`.

`bunfig.toml` sets: `[test] root = "compiler/tests/"`, `timeout = 10000` ms.

## CLI Subcommands (from `compiler/src/commands/`)

scrml compile <file|dir>    — `commands/compile.js` — single-shot compile via api.js.
scrml build                 — `commands/build.js` — production-style build (multi-output / library mode).
scrml dev                   — `commands/dev.js` — dev server (uses `SCRML_PORT` or `PORT`).
scrml serve                 — `commands/serve.js` — production serve (compiled artefacts).
scrml init                  — `commands/init.js` — scaffold a new scrml project.
scrml migrate               — `commands/migrate.js` — DB migration runner (consumes `<schema>` diffs from schema-differ.js).
scrml promote               — `commands/promote.js` — **S65 stub** for `bun scrml promote` (Tier-A promotion ergonomics, §56). Implementation in flight in worktree `agent-a35e9695d1b010931` (Tier B dispatch).

## Build & Release

bun run scripts/assemble-spec.sh   — assemble SPEC.md from per-section sources (legacy; SPEC.md is currently authored monolithically).
bun run scripts/update-spec-index.sh — regenerate SPEC-INDEX.md from SPEC.md headers.
bun run scripts/rebuild-bs-dist.ts  — rebuild the BS (block splitter) self-host distribution into `compiler/self-host/dist/`.
bun run compiler/scripts/build-self-host.js — build the rest of the self-host dist artefacts.

No public release tag automation — releases are tagged manually.

## Pre-commit Hooks

scripts/git-hooks/pre-commit        — installed via `scripts/git-hooks/install.sh`.
scripts/verify-js.js                — runs `node --check` on emitted client JS to catch boundary regressions.
**NEVER bypass the pre-commit hook with `--no-verify` without explicit user authorization** (per global rules in `~/.claude/CLAUDE.md`).

## CI/CD Pipeline
NONE. There is no `.github/workflows/`, no `.gitlab-ci.yml`, no `Jenkinsfile`. All test execution is local (developer + agents running `bun test`).

## Docker
NONE. No `Dockerfile`, no `docker-compose.yml`.

## Editor Build
editors/vscode/                       — separate workspace; built via the VSCode extension's own `package.json` (out-of-scope for the main compiler build).
editors/neovim/                       — pure Lua/Vimscript; no build step.

## Self-host
compiler/self-host/dist/              — compiled output of `compiler/self-host/*.scrml`; consumed by `compiler/tests/self-host/*.test.js` (4 files: ast, bpp, bs, tab). Two persistent self-host smoke failures historically deferred (see master-list.md / hand-off-65).

## Tags
#scrmlTS #map #build #cli #bun #self-host #pre-commit #s65 #promote-stub

## Links
- [primary.map.md](./primary.map.md)
- [structure.map.md](./structure.map.md)
- [test.map.md](./test.map.md)
- [config.map.md](./config.map.md)
- [master-list.md](../../master-list.md)
