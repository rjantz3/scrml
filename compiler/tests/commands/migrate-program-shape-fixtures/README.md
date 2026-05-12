# migrate-program-shape fixture corpus

Bespoke synthetic `.scrml` files exercising each of the five buckets recognized
by `classifyFile` in `compiler/src/commands/migrate.js`:

| File                                          | Bucket          | Expected action  |
| --------------------------------------------- | --------------- | ---------------- |
| `entry-app.scrml`                             | `entry`         | `REWRITE` (unwrap redundant `${...}`) |
| `pages/dashboard.scrml`                       | `route`         | `REWRITE` (`<program>` → `<page>`)    |
| `pages/dashboard-mixed.scrml`                 | `route`         | `SKIP` (mixed app-wide + per-route attrs) |
| `components/button.scrml`                     | `module`        | `NOOP` (no wrapper)                   |
| `schema-anchor.scrml`                         | `schema-anchor` | `ADVISORY` (§39.12.0 workaround)      |

Snapshot tests use these files to verify report output and classification
stability. See `compiler/tests/commands/migrate-program-shape.test.js`.

The fixtures are NOT consumed by the main test suite's `scanDirectory` or
sample-compilation pipelines — they live under `compiler/tests/` which the
migrate command excludes by default.
