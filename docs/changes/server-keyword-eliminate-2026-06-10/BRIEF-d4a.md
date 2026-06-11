# D4a BRIEF (archived per S136) — dispatched S180 2026-06-10, base e1d4f88c · agentId a48d375a3782f62b7
agent: scrml-js-codegen-engineer · isolation: worktree · run_in_background: true
TASK: Eliminate `server function` from examples/ showcase → 0 non-SSE. Add real server bodies to the 2
trigger-less stubs (09-error-handling submit, 19-lin-token mintTicket) so they escalate; the channel
publishers (15-channel-chat, 23-trucking channels) + handle (20-middleware) escalate via D2 T7/T8 with no
body. Then `migrate --fix` over examples/ (Migration 4 strips). Dry-run-breakdown-first (flag non-server
churn). Per-file compile-verify + no-client-flip on mintTicket/channel/handle. Grep gate: examples non-SSE
`server function`=0, `server fn`=9 untouched. R26 flagship + full suite. Kickstarter+anti-patterns briefs
(writes scrml). Full F4+S99/S126+MAPS+commit-discipline. Merge main e1d4f88c (D1+D2+D3). Scope: examples/ ONLY.
