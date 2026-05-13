# A-1.7 — S84 ceiling re-measurement

**Date:** 2026-05-13 (S89)
**Status:** **AT/OVER ceiling** — 523 markup-read → reactive `reads` edges
(2.04x the S84 256-edge ceiling)

## S84 ceiling — source citation

> "Concrete count from this study: across the corpus, **256 implicit markup
> reads** vs. **244 emitted edges** (of which only ~20 are pure `reads` —
> most are `writes` + `calls` + `awaits`). The reactive graph the splitter
> would consume today is roughly **half-shaped**: it has the writes and the
> function-body reads, but it's missing the markup reads that are arguably
> the more frequent consumer in a UI app."
>
> — `scrml-support/docs/diagnostics/reactive-graph-static-resolvability-S84.md`,
> line 122

S84 measurement was taken against:
- 8 priority apps + 22 broader sweep
- 33 .scrml files total
- 501 reactive-graph reads/writes total (501 = 256 markup + 244 non-markup +
  E-DG-002 buckets)

The 256 figure is the count of **implicit markup reads** — sites where the
S84 inspector found a reactive `@var` read inside markup context that the
DG was crediting only against the `__markup__` sentinel for E-DG-002
accounting (`dependency-graph.ts:1720` at S84), without emitting an actual
`reads` edge.

A-1 lifted those sites into:
- **`MarkupReadDGNode`** — one per markup-context read site (A-1.2)
- **`reads` edge** — from MarkupReadDGNode → ReactiveDGNode (A-1.3 / A-1.4 / A-1.5)

The "256 ceiling" is therefore not a hard cap — it's a count of pre-A-1
unaddressed sites. After A-1, we expect the count of new `reads` edges to
be **at least 256**, accounting for corpus growth.

## Re-measurement method

Script: `scripts/measure-markup-read-edges.ts`

Pipeline: source → splitBlocks → buildAST → resolveModules → runNRBatch →
runCE → runRI → runDG. Inspects the resulting `depGraph` for:

- nodes where `kind === "markup-read"` (counted per file via `span.file`)
- edges where `kind === "reads"` and `from` resolves to a markup-read node

Corpus surveyed:
- `examples/*.scrml` (31 files including 23-trucking-dispatch sub-tree)
- `benchmarks/todomvc/*.scrml`
- `benchmarks/sql-batching/*.scrml`

Total: 61 .scrml files in corpus (vs. 33 at S84 — corpus grew via Wave 3
trucking-dispatch migration in S85-S87).

## Per-file edge counts

| File | markup-read nodes | reads edges |
|------|--:|--:|
| examples/23-trucking-dispatch/pages/customer/load-detail.scrml | 71 | 71 |
| examples/23-trucking-dispatch/pages/driver/load-detail.scrml | 58 | 58 |
| examples/23-trucking-dispatch/pages/dispatch/load-detail.scrml | 56 | 56 |
| examples/23-trucking-dispatch/pages/driver/home.scrml | 38 | 38 |
| examples/23-trucking-dispatch/pages/customer/profile.scrml | 26 | 26 |
| examples/23-trucking-dispatch/pages/customer/quote.scrml | 25 | 25 |
| examples/23-trucking-dispatch/pages/driver/profile.scrml | 22 | 22 |
| examples/23-trucking-dispatch/pages/customer/home.scrml | 20 | 20 |
| examples/23-trucking-dispatch/pages/dispatch/load-new.scrml | 19 | 19 |
| examples/23-trucking-dispatch/pages/driver/load-log.scrml | 17 | 17 |
| examples/23-trucking-dispatch/pages/driver/hos.scrml | 17 | 17 |
| examples/23-trucking-dispatch/pages/driver/messages.scrml | 13 | 13 |
| examples/23-trucking-dispatch/pages/customer/loads.scrml | 11 | 11 |
| examples/23-trucking-dispatch/pages/dispatch/board.scrml | 10 | 10 |
| examples/23-trucking-dispatch/pages/customer/invoices.scrml | 10 | 10 |
| examples/03-contact-book.scrml | 9 | 9 |
| examples/14-mario-state-machine.scrml | 8 | 8 |
| examples/05-multi-step-form.scrml | 8 | 8 |
| examples/23-trucking-dispatch/pages/dispatch/billing.scrml | 8 | 8 |
| examples/23-trucking-dispatch/pages/auth/register.scrml | 8 | 8 |
| examples/13-worker.scrml | 8 | 8 |
| examples/09-error-handling.scrml | 7 | 7 |
| examples/17-schema-migrations.scrml | 5 | 5 |
| examples/23-trucking-dispatch/pages/dispatch/drivers.scrml | 5 | 5 |
| examples/23-trucking-dispatch/pages/auth/login.scrml | 5 | 5 |
| examples/18-state-authority.scrml | 4 | 4 |
| examples/08-chat.scrml | 4 | 4 |
| examples/23-trucking-dispatch/pages/dispatch/customers.scrml | 4 | 4 |
| examples/15-channel-chat.scrml | 4 | 4 |
| examples/19-lin-token.scrml | 4 | 4 |
| examples/02-counter.scrml | 3 | 3 |
| examples/10-inline-tests.scrml | 3 | 3 |
| examples/21-navigation.scrml | 3 | 3 |
| examples/06-kanban-board.scrml | 3 | 3 |
| examples/07-admin-dashboard.scrml | 2 | 2 |
| benchmarks/todomvc/app.scrml | 2 | 2 |
| examples/20-middleware.scrml | 1 | 1 |
| examples/04-live-search.scrml | 1 | 1 |
| examples/12-snippets-slots.scrml | 1 | 1 |
| **TOTAL** | **523** | **523** |

(Files with 0 markup-read nodes omitted — typically pure-server / pure-schema
files with no markup interpolation.)

## Comparison vs. S84 ceiling

| Metric | S84 (Oct 2025) | S89 (May 2026) | Delta |
|--------|---:|---:|--:|
| Corpus size (files) | 33 | 61 | +85% |
| Implicit markup reads (pre-A-1 count) | 256 | — | — |
| New markup-read DG nodes (post-A-1) | 0 | 523 | +523 |
| New `reads` edges (markup-read → reactive) | 0 | 523 | +523 |

**1-to-1 node:edge ratio** — every emitted MarkupReadDGNode produces exactly
one `reads` edge to the corresponding reactive cell. This matches the
Option Y design (A-1.2): per-interpolation distinct nodes, each edge
documenting a single read site.

## Status: AT/OVER ceiling

523 edges is **2.04x the 256 S84 ceiling**, attributable to:

1. **Corpus growth.** Trucking-dispatch Wave 3 migration (S85-S87) added ~20
   new pages with dense interpolation (load-detail, profile, quote pages
   contain 20-70 reads each).
2. **Comprehensive shape coverage.** A-1.3 / A-1.4 / A-1.5 covered every
   markup shape the S84 inspector flagged (interp, variable-ref attr, bind,
   if=, call-ref args, for-iterable, lift-template body, engine state-child,
   onTransition/onTimeout/onIdle).

The S84 256 figure is a historical baseline; the **523 measured here is the
new authoritative count of post-A-1 markup-read edges in the current corpus.**

## Sub-phase contribution (per A-1 close-out hand-off-88)

| Sub-phase | Commit | Shape category | Approx edge contribution |
|-----------|--------|----------------|---:|
| A-1.3 | `1f516e1` | interp / variable-ref-attr / bind / if= | ~60% (~313 edges) |
| A-1.4 | `da78609`, `55f5f20` | call-ref + for-iterable + lift-template-body | ~25% (~130 edges) |
| A-1.5 | `b512db9`, `24b582d` | engine state-child + onTransition/onTimeout/onIdle | ~15% (~80 edges) |

(Breakdown is approximate — exact per-sub-phase counts would require
re-running with each flag-set independently. The 1-to-1 node:edge
correspondence holds for the total.)

## Conclusion

**Status:** AT/OVER ceiling. No follow-on remediation required for A-1.7.

A-5.5 (per the SCOPING.md A-5 ceiling re-validation slot) is **closed
ahead of schedule** — the 256-edge ceiling identified by S84 has been
substantially exceeded by the natural shape-coverage of A-1.3 / A-1.4 /
A-1.5 combined with corpus growth from Wave 3.

No edges are over-emitted (1-to-1 node:edge correspondence). No
runtime-only patterns surfaced. The S84 finding that scrml's reactive
graph is "structurally half-shaped" because markup reads were excluded
from the DG is now **fully closed** at the producer level.

## Measurement reproducibility

Script: `scripts/measure-markup-read-edges.ts` (commit landing alongside
this doc). Re-run with `bun run scripts/measure-markup-read-edges.ts` to
refresh.
