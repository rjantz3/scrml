# build.map.md
# project: scrmlts
# updated: 2026-05-28T00:00:00Z  commit: 1fed5588

## Development Commands (package.json scripts)

`bun run compile` — run `bun run compiler/src/cli.js compile` (alias for dev use)
`bun test` — run full test suite under `compiler/tests/`; pretest hook compiles sample `.scrml` fixtures first
`bun run pretest` — `bash scripts/compile-test-samples.sh`; compiles browser-test fixtures into `samples/compilation-tests/dist/`
`bun run test:coverage` — `bun test compiler/tests/ --coverage`
`bun run watch` — `bun --watch compiler/src/cli.js compile`; recompile on change
`bun run bench` — compile all `samples/compilation-tests/` with `--timing`
`bun run security` — compile all compilation-tests then `node --check` every generated client JS
`bun run lsp` — start LSP server at `lsp/server.js --stdio`
`bun run docs:build` — build static site via `docs/build.ts`
`bun run e2e` — Playwright tests via `e2e/playwright.config.ts`
`bun run e2e:ui` — Playwright UI mode
`bun run e2e:docs` — Playwright docs tests via `e2e/playwright.docs.config.ts`
`bun run e2e:install` — `playwright install chromium firefox webkit`

## CLI Subcommands (compiler/src/cli.js)

`scrml compile <file|dir> [options]` — compile .scrml source; writes `dist/*.server.js`, `*.client.js`, `*.html`, `*.css`, runtime
`scrml dev <file|dir> [options]` — compile + watch + serve
`scrml build <dir> [options]` — production bundle; generates standalone server entry
`scrml serve [options]` — start persistent compiler server
`scrml generate <type>` — scaffold adopter-owned source (e.g. `scrml generate auth`)
`scrml init [directory]` — scaffold new scrml project
`scrml migrate <file|dir>` — apply automated source rewrites for deprecated patterns
`scrml promote --match|--engine <file|dir>` — promote tier-1 if-else → `<match>` or `<match>` → `<engine>` (CLI surface)

Key compile options: `--output-dir / -o`, `--verbose / -v`, `--embed-runtime`, `--emit-batch-plan`, `--emit-reachability`, `--emit-machine-tests`, `--chunk-size-budget=N`, `--debug-perf`, `--parser=scrml-native` (M5 opt-in), `--watch / -w`

## Build Helpers (scripts/)

`scripts/compile-test-samples.sh` — compiles fixtures needed by browser tests
`scripts/regen-spec-index.ts` — regenerates SPEC-INDEX.md line ranges from SPEC.md headings
`scripts/rebuild-bs-dist.ts` — rebuilds block-splitter dist
`scripts/rebuild-tab-dist.ts` — rebuilds TAB stage dist
`scripts/rebuild-self-host-dist.ts` — rebuilds self-host .scrml → .js
`scripts/verify-js.js` — `node --check` sweep over compilation output
`scripts/perf-regression-check.ts` — performance regression canary

## Git Hooks (scripts/git-hooks/)

`pre-commit` — runs full test suite (`bun test`) before each commit; cannot be skipped without explicit authorization
`pre-push` — additional checks before push
Install via `scripts/git-hooks/install.sh`

## CI/CD Pipeline

No `.github/workflows/` directory present. Only `FUNDING.yml` in `.github/`. CI is not currently automated.

## Output Artifacts (per compiled .scrml file)

`<base>.server.js` — Bun HTTP server entry; imports db, handles all routes
`<base>.client.js` — browser bundle; reactive runtime + component logic
`<base>.html` — static HTML shell
`<base>.css` — extracted Tailwind + user CSS
`_scrml/<name>.js` — stdlib shim copies from `compiler/runtime/stdlib/`
`scrml-runtime.<hash>.js` — runtime template (unless `--embed-runtime`)
`chunks.json` — chunk manifest with FNV-1a-32 content-hash encoding (SPEC §47)

## Tags
#scrmlts #map #build #cli #scripts #pipeline #output

## Links
- [primary.map.md](./primary.map.md)
- [structure.map.md](./structure.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
