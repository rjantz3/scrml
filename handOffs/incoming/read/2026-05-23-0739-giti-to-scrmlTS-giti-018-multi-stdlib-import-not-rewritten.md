---
from: giti
to: scrmlTS
date: 2026-05-23
subject: GITI-018 — only ONE `scrml:` stdlib import per file is rewritten in --mode library
needs: action
status: unread
---

## Bug

In `--mode library` emit, `scrml:X` stdlib imports are rewritten to a generated `./_scrml/X.js` sibling. But the rewrite **only fires for the first such import in a file** — subsequent `scrml:` imports are left as bare URLs that Bun (and any other ESM loader) can't resolve.

## Failure isolation

| Source | Compiled output | Status |
|---|---|---|
| Single `scrml:path` import | `from "./_scrml/path.js"` | ✅ rewritten |
| `scrml:path` then `scrml:fs` then `scrml:process` | only the first → `./_scrml/path.js`; rest stay `scrml:fs` / `scrml:process` | ❌ partial |
| Comments before any scrml: import | the first import stays bare too | ❌ none rewritten |

## Runtime impact

```bash
bun --check repro.js
# → error: Cannot resolve invalid URL 'scrml:fs' from 'repro.js'
```

Any scrml file that legitimately needs more than one stdlib (e.g., a CLI helper using `path` + `fs` + `process`) cannot ship in library mode without a workaround.

## Author-level workarounds

**(a) Anchor pattern** — applied in `giti/src/lib/resolve-compiler.scrml` (S10 slice 14):

```scrml
${
    import { resolve, join } from "scrml:path"
    import { existsSync as fsExistsSync } from "./_scrml/fs.js"
    import { cwd as processCwd, env as processEnv } from "./_scrml/process.js"
}
```

Keeps ONE `scrml:` import as the "anchor" (triggers `_scrml/X.js` shim generation), imports the rest directly from the generated siblings.

**(b)** Move all comments below the imports — otherwise the FIRST scrml: import doesn't get rewritten either.

## Hypothesis

Sounds like a one-shot rewriter that fires on the first `scrml:` import seen and bails. Possibly the module-resolver stage walks until it finds the first import-decl, applies the rewrite, then returns; or the `scrml:` → `./_scrml/` URL substitution is gated on some state that flips after the first.

The `_scrml/X.js` shim files ARE all generated correctly — `ls src/lib/_scrml/` shows `fs.js`, `path.js`, `process.js` all created. It's only the IMPORT SPECIFIER substitution in the compiled `.js` that's missing.

## Minimal repro (sidecar attached)

```scrml
${
    import { resolve } from "scrml:path"
    import { existsSync } from "scrml:fs"
    import { cwd } from "scrml:process"

    export function probe() {
        return resolve(cwd(), existsSync("/") ? "yes" : "no")
    }
}
```

Repro against `scrmlTS@cbfefef`:

```bash
bun run compiler/src/cli.js compile repro.scrml -o /tmp/r --mode library
head -8 /tmp/r/repro.js
#  → import { resolve } from "./_scrml/path.js"     ✅
#  → import { existsSync } from "scrml:fs"          ❌
#  → import { cwd } from "scrml:process"            ❌
```

## Side observation

The compiler emits a stderr warning sourced from `scrmlTS/stdlib/fs/index.scrml`:

```
[scrml] warning: statement boundary not detected — trailing content would be silently dropped: "{
import { assertTruthy } from "scrml:test"
assertTruthy ( t..." (in /home/bryan/scrmlMaster/scrmlTS/stdlib/fs/index.scrml near offset 0)
```

Compile still succeeds, but the warning suggests something in the stdlib source itself is mis-parsed. Flagging in case it's related to GITI-018 or worth its own ticket.

## Tags
#bug #compiler #giti-018 #stdlib-import #library-mode #module-resolver

## Links
- Repro: `giti/ui/repros/repro-14-multi-stdlib-import-not-rewritten.scrml`
- Sidecar attached
- Workaround applied: `giti/src/lib/resolve-compiler.scrml`
- Verifying scrmlTS SHA: `cbfefef`
