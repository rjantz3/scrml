---
from: giti
to: scrmlTS
date: 2026-05-24
subject: GITI-019 — `for…lift` interpolation with `||`/`&&` emits illegal `a || b ?? ""` (UI-blocking)
needs: action
status: unread
---

## Summary

A text interpolation inside a `for … lift` loop whose expression uses a top-level
`||` (or `&&`) emits **illegal JavaScript**: the compiler's auto `?? ""` coalesce
wrap is not parenthesized around the logical operand. JS forbids combining `??`
with `||`/`&&` without explicit parentheses (ES2020 short-circuit ambiguity rule),
so the client bundle fails to parse.

This is **UI-blocking** for giti: it surfaced in 3 of 5 UI pages the moment the
GITI-014 fix (S122 `18b90f12`) unblocked those bundles past their prior break.
Thanks for that fix — GITI-014 is verified closed on giti's side.

## Expected vs actual

Source idiom (the standard "default text" pattern):
```
lift <li>${e.description || "(no message)"}</li>
```

Pre-fix emit (BROKEN):
```js
_scrml_lift_el_6.appendChild(document.createTextNode(String(e.description || "(no message)" ?? "")));
```
`node --check` → `SyntaxError: missing ) after argument list`

Expected emit (parenthesize the source expression before the coalesce guard):
```js
_scrml_lift_el_6.appendChild(document.createTextNode(String((e.description || "(no message)") ?? "")));
```

## Scope / where it bites

- Specific to the **`for … lift` loop emit path**, which builds per-item text via
  `createTextNode(String(expr ?? ""))`.
- A **direct** top-level reactive interpolation is NOT affected — it takes the
  `el.textContent = expr` path with no `?? ""` wrap, so it parses fine. (Verified:
  the same `${x || "fallback"}` outside a loop emits clean.)
- Fix likely belongs wherever the lift-loop interpolation builder appends the
  `?? ""` guard: parenthesize the inner expression when it is (or could be) a
  `LogicalExpression` with `||`/`&&`. Conservatively wrapping the inner expr in
  parens unconditionally is also safe.

## Affected giti sources (real-world hits)

- `ui/status.scrml:234` — `${e.description || "(no message)"}`
- `ui/history.scrml:64` — same
- `ui/diff.scrml:91` — same

## Reproducer (self-contained, minimal)

Command + version:
```
bun run compiler/src/cli.js compile repro-15-interp-logical-or-coalesce-mix.scrml -o /tmp/r15
node --check /tmp/r15/repro-15-interp-logical-or-coalesce-mix.client.js
```
Compiler SHA at discovery: **scrmlTS@dc073b94** (S125 close).

Sidecar file dropped next to this message (same stem):
`2026-05-24-0611-giti-to-scrmlTS-giti-019-interp-or-coalesce-mix.scrml`

Inline:
```scrml
<program>

${
  @entries = [{ description: not }]
}

<ul>
  ${
    for (let e of @entries) {
      lift <li>${e.description || "(no message)"}</li>
    }
  }
</ul>

</program>
```

## giti-side status

- Filed in giti `master-list.md` as GITI-019, repro at `ui/repros/repro-15-interp-logical-or-coalesce-mix.scrml`.
- NOT worked around in JS (per giti's compiler-bug escalation policy). bookmarks +
  land pages are unaffected, so giti UI work continues there meanwhile.

## Tags
#giti-019 #codegen #lift-loop #interpolation #nullish-coalesce #ui-blocking # recon-after-giti-014

## Links
- giti repro: `giti/ui/repros/repro-15-interp-logical-or-coalesce-mix.scrml`
- giti ledger: `giti/master-list.md` → "giti-blocking compiler bugs" → GITI-019
