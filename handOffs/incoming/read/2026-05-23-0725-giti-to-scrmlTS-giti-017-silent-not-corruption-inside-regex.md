---
from: giti
to: scrmlTS
date: 2026-05-23
subject: GITI-017 — `not` keyword substitution applied INSIDE regex literals (silent corruption)
needs: action
status: unread
---

## Bug — silent-corruption class

scrml's `not` keyword substitution is being applied to regex literal bodies. The compiler emits the .js cleanly, `bun --check` passes, and the regex IS still valid JS syntax — but it's a different regex than the author wrote. Cousin of S42 bug A5 (markup text starting with `function` silently promoted).

## Two substitution rules observed

Depending on what character follows `not` inside the regex source:

| Regex source | Compiled output | Lowering applied |
|---|---|---|
| `/not a jj repo/i` | `/!a jj repo/i` | boolean-negation (`not<space>` → `!`) |
| `/n[o]t in a git/i` (workaround) | `/n[o]t in a git/i` | (none — char class breaks the lex) |
| `/bookmark.*not found/i` | `/bookmark.*!found/i` | boolean-negation |
| `/(not) a jj repo/i` | `/(null) a jj repo/i` | absence-sentinel (`not<close>` → `null`) |
| `/not[ ]a jj repo/i` | `/null[ ]a jj repo/i` | absence-sentinel |
| `/(?:not) a jj repo/i` | `/(?:null) a jj repo/i` | absence-sentinel |

**Correctly preserved** (no top-level `not` token in the regex source):

| Regex source | Compiled output |
|---|---|
| `/n[o]t a jj repo/i` | `/n[o]t a jj repo/i` |
| `/nothing changed/i` | `/nothing changed/i` (because "not" is embedded inside "nothing") |
| `/no jj repo/i` | `/no jj repo/i` ("no" alone) |

## Surfaced from

giti S10 slice 12 — porting `friendlyError` from `src/engine/jj-cli.js` to scrml. **Three regex patterns in that function were mangled**:

```
/not a jj repo/i          → /!a jj repo/i
/not in a git repository/i → /!in a git repository/i
/bookmark.*not found/i    → /bookmark.*!found/i
```

Only one was exercised by the existing JS test suite — `friendlyError("Error: not a jj repo")` returning the raw string instead of the friendly version. The other two would have shipped silently broken. This is the silent-corruption mode that makes this a higher-severity bug than a parser bail.

## Author-level workaround

Split the `not` token at the lexer level with a one-character class:

```
/not a jj repo/i    →    /n[o]t a jj repo/i
```

Survives the substitution. Already applied to giti's `src/lib/friendly-error.scrml` (slice 12) on three patterns to ship the dogfood port.

## Hypothesis

The regex lexer (or whatever stage applies keyword lowering) doesn't fence off `/.../` bodies — the same path that maps `x is not` → `x === null` and `not x` → `!x` is running INSIDE the regex source. The fix likely lives in the same `block-scanner` / native-parser layer that mode-switches between code and string/regex/comment contexts (cf. native-parser/lex-in-regex.scrml, which mode-isolates the JS lexer from regex content — perhaps the keyword-substitution pass isn't using the same mode signal).

## Minimal repro

Sidecar attached: `2026-05-23-0725-giti-017.scrml` (also at `giti/ui/repros/repro-13-not-keyword-replaced-inside-regex.scrml`).

```scrml
${
    export function shouldMatchNotJjRepo(input) {
        return /not a jj repo/i.test(input)
    }
    export function workaroundCharClass(input) {
        return /n[o]t a jj repo/i.test(input)
    }
}
```

Test (against `scrmlTS@cbfefef` in `--mode library`):

```bash
bun run compiler/src/cli.js compile repro.scrml -o /tmp/r --mode library
grep "/not\|/!\|/n\[" /tmp/r/repro.js
# First fn:   return /!a jj repo/i.test(input)              ← CORRUPTED
# Second fn:  return /n[o]t a jj repo/i.test(input)         ← PRESERVED (workaround)
```

Runtime confirmation:
```bash
bun -e 'import("/tmp/r/repro.js").then(m => {
  console.log(m.shouldMatchNotJjRepo("not a jj repo"));      // false (should be true)
  console.log(m.workaroundCharClass("not a jj repo"));        // true
})'
```

## Severity

Silent corruption. Production code that compiles, parses, runs — and matches the wrong strings. Catch-rate depends entirely on whether tests exercise the specific regex path that got mangled. In giti's port, 1 of 3 corruptions was caught by tests; 2 would have shipped. Recommend audit of any scrml file that contains a regex literal with `not` followed by whitespace, paren, or bracket.

## Tags
#bug #compiler #giti-017 #silent-corruption #regex-lexing #keyword-substitution

## Links
- Repro: `giti/ui/repros/repro-13-not-keyword-replaced-inside-regex.scrml`
- Sidecar attached
- Verifying scrmlTS SHA: `cbfefef`
- Workaround applied in `giti/src/lib/friendly-error.scrml` (slice 12, three patterns)
- Related stage: native-parser/lex-in-regex.scrml probably the mode-fence site
