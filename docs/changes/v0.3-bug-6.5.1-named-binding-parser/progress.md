# Bug 6.5.1 — match-arm named-binding parser gap

**Worktree:** `agent-a33ccb80ea2f745d3` (branch: `main`)
**Surfaced by:** Bug 6.5 dispatch (S87 a72ccd2, agent a5367677c236aa605, finding #1).
**Bug shape:** Form 1b parser at `compiler/src/ast-builder.js:5052-5111` collects payload binding names from `match-arm-block` patterns. The "first ident after `(` or `,`" heuristic picks the FIELD name `field` from `.V(field: local)` instead of the LOCAL binding name `local`. Both typer and codegen use this list, so the wrong name is bound into scope (E-SCOPE-001 on `local`, runtime ReferenceError if scope check were bypassed).

## Reproduction (pre-fix, confirmed)

```scrml
${
    type Status:enum = {
        Loading
        Success(name: string, count: int)
        Failed(reason: string)
    }
    @status: Status = .Loading
    @msg = ""
    function handle() {
        match @status {
            .Success(name: who, count: n) => { @msg = who + " found " + n }
            .Failed(reason: why) => { @msg = "Failed: " + why }
            _ => { @msg = "loading" }
        }
    }
}
```

→ `E-SCOPE-001: Undeclared identifier 'who' / 'n' / 'why'` (3 errors).

## Plan

1. Tighten `payloadBindings` collection in `ast-builder.js` Form 1b (lines 5077-5096) to handle named form `field: local` — push `local` (after the `:`) instead of `field`.
2. Mirror the typer's `extractPayloadBindings` (`type-system.ts:7316`) to use the same logic.
3. Add unit tests at `compiler/tests/unit/match-arm-named-binding-parser.test.js` covering: positional, named, named+positional mixed (per SPEC §18.7 — partial-named binding is valid), discard, multi-binding.
4. Verify reproduction generates valid JS with `const who`/`const n`/`const why`.
5. Regression-guard: full unit + integration + conformance suite passes.

## Steps

- [2026-05-12 START] Worktree verified clean; bun install + pretest pass.
- [2026-05-12 ANALYSIS] SPEC §18.7 reviewed — named form binds LOCAL (`.Rectangle(height: h, width: w) => w * h`). Mixed form NOT explicitly authorized but partial-named is. Bug confirmed in repro.
