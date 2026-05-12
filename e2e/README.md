# scrml e2e tests (Playwright)

End-to-end browser tests for the scrml compiler's compiled output. Each `*.spec.ts`
file under `tests/` drives a real browser against compiled scrml apps served by
`scrml dev`.

Wave 3 Dispatch 1 (S86, 2026-05-12) — canary infrastructure. Currently only
`02-counter` is covered; Dispatch 2 will add `03-contact-book`, `05-multi-step-form`,
`14-mario-state-machine`, and the TodoMVC benchmark.

## One-time setup

Install Playwright browser binaries (chromium + firefox + webkit). This downloads
~400MB the first time and is NOT something `bun install` does for you:

```bash
bun run e2e:install
# equivalent to: bunx playwright install chromium firefox webkit
```

If you want a single browser only (e.g., chromium for quick iteration):

```bash
bunx playwright install chromium
```

System dependencies (Linux only) — if Playwright reports missing libs:

```bash
bunx playwright install-deps chromium firefox webkit
```

## Running tests

```bash
# Full run — all browsers, all specs, both dev servers booted automatically
bun run e2e

# UI mode (Playwright's debugger / time-travel inspector)
bun run e2e:ui

# Single browser
bunx playwright test --config=e2e/playwright.config.ts --project=chromium

# Single test file
bunx playwright test --config=e2e/playwright.config.ts e2e/tests/02-counter.spec.ts

# Headed (watch the browser)
bunx playwright test --config=e2e/playwright.config.ts --headed
```

The `webServer` block in `playwright.config.ts` boots two `scrml dev`
instances automatically:

| Port | Source                       | Used by                                  |
|------|------------------------------|------------------------------------------|
| 3100 | `examples/02-counter.scrml`  | Critical-path example specs (Dispatch 1+2) |
| 3101 | `benchmarks/todomvc/app.scrml` | TodoMVC benchmark + parity spec (Dispatch 2+3) |

Setting `reuseExistingServer: !CI` means: if you already have `scrml dev` running
on those ports locally, Playwright will reuse it; on CI it always boots fresh.

## Output and artifacts

After a run:

- `e2e/test-results/`     — per-test traces, screenshots, videos (failures only)
- `e2e/playwright-report/` — HTML report (open `index.html`)
- `e2e/blob-report/`      — CI sharded report (when running with `--shard=`)

All of those are gitignored — they regenerate each run.

To open the latest HTML report:

```bash
bunx playwright show-report e2e/playwright-report
```

## Known caveats (Dispatch 1)

1. **WebKit + SSE hot-reload** — every served HTML response gets a `<script>`
   injecting `EventSource("/_scrml/live-reload")`. WebKit's behavior with this
   keep-alive stream under Playwright is genuinely untested at the time of this
   dispatch. If you see flaky `page.goto()` hangs on the webkit project only,
   re-run with `--project=chromium --project=firefox` and file the WebKit
   failure as a follow-on (a compiler-level `--no-hot-reload` flag is the
   correct fix, deferred out of this dispatch).

2. **TodoMVC `dist/`** — `benchmarks/todomvc/dist/` historically held output
   compiled against an older compiler revision and is currently a build
   artifact. The webServer block recompiles on boot, so stale dist files are
   overwritten. If a Dispatch 2 TodoMVC spec fails with weird codegen, blow
   away `benchmarks/todomvc/dist/` and re-run.

3. **Two dev servers in parallel** — both `scrml dev` instances boot at test
   start. Total startup time on a cold compiler is ~5-8 seconds. If a webServer
   times out at 60s, increase `timeout` in `playwright.config.ts` or pre-warm
   by running `bun run e2e` once.

## Adding a new spec

1. Drop a new `tests/<name>.spec.ts` file.
2. Import from `../fixtures/dev-server-fixture`:
   ```ts
   import { test, expect } from "../fixtures/dev-server-fixture";
   ```
3. For examples, navigate to a relative path: `await page.goto("/05-multi-step-form.html")`.
4. For TodoMVC, build the URL via the fixture: `const url = todomvcUrl("/")`.
5. Prefer accessible-role locators (`getByRole`, `getByLabel`, `getByText`)
   over CSS class selectors. Tailwind classes are NOT stable — they may change
   if the example is restyled.

## Reference

- Survey: `scrml-support/docs/deep-dives/wave-3-playwright-benchmarks-scoping-2026-05-12.md`
- Dispatch 1 brief: this commit's message
- Playwright docs: https://playwright.dev/docs/intro
