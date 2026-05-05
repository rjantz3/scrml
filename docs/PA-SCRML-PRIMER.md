# PA scrml Primer — what every PA must know about the language

**Purpose:** make the PA the second-foremost expert on scrml at session start, without having to re-derive base syntax + mindset across hundreds of thousands of context tokens. This file is mandatory reading at session start (see `pa.md`).

**Status:** living document. Updated when SPEC changes, when locks land, when patterns emerge. Treat as the canon snapshot at the listed date.

**Last updated:** 2026-05-04 (S57 wrap; reflects post-D1+D2 SPEC state, all S57 stdlib work, locks L1-L20)

**Word of caution:** if this primer disagrees with `compiler/SPEC.md` or `docs/articles/llm-kickstarter-v2-2026-05-04.md`, the SPEC + kickstarter are authoritative. Surface the contradiction.

---

## §1 The single most important framing

**scrml's UI of an application SHOULD be a fully-handled state machine.** In scrml's vocabulary that machine is called an **engine**. The structural shape of the UI tree IS the structural shape of the application's state. This is not aspiration; it is design intent.

But — apps don't START at the north star; they EVOLVE toward it. Booleans-as-lifecycle in early sketch code are not violations; they are in-progress pins. The compiler nudges via lints (`W-LIFECYCLE-CANDIDATE`, `W-MATCH-TRANSITIONS-ACCRUING`) but does not enforce. Forcing the north star punishes prototyping; we don't.

**The Tier 0/1/2 commitment ladder for case analysis on enums:**

| Tier | Form | What you get |
|---|---|---|
| 0 | `if=` chains / `${ if (...) lift ... }` | prototype, no exhaustiveness check |
| 1 | `<match for=Type [on=expr]>` block | structural exhaustiveness; rules-inert (with W-MATCH-RULE-INERT lint) |
| 2 | `<engine for=Type initial=.Variant>` | full deal: exhaustiveness + active rules + transition handlers |

**Promotion is mechanical and additive.** State-children carry forward verbatim from Tier 1 to Tier 2; the wrapper swap is the commitment moment.

---

## §2 The pillars (held since scrml8 era; locked at S55-S56)

1. **Markup is a first-class value type.** Markup elements may sit anywhere expressions sit — passed as args, stored in cells, returned from functions, on the RHS of `=`. Not a shortcut, not JSX-style sugar. Markup IS a value. (Lock L1.)
2. **State is the declaration primitive.** Reactive state cells `<x> = value` are the atomic unit. Everything declared as state is reactive by default.
3. **The compiler owns the wiring.** Server functions, routes, fetch calls, serialization, DOM wiring, async scheduling, and reactive dependency tracking are compiler concerns. The developer writes no boilerplate for these.
4. **One file type.** `.scrml` is the only source format. Logic, markup, style intermingle; the compiler decomposes them.
5. **All scrml should be scrml.** No bespoke per-state-type mini-DSLs. Every body that accepts content accepts the universal scrml grammar. Per-kind extensions (transitions, DDL, `@shared`) ride ON TOP of the universal base, not INSTEAD of it.
6. **Goal: bullet-proof apps.** A shipped scrml app should be essentially bullet-proof — every reachable state has UI, every transition is intentional, every effect runs at the right moment. **And** the developer should (almost) not realize they're making the app exhaustively provable. Provability falls out of the language's natural shape, not from separate proof ceremony.

---

## §3 V5-strict access — the access principle (§6.1)

scrml has TWO access forms for reactive state cells. Internalize this; it threads through every example.

| Form | Where |
|---|---|
| `<varname>` (structural) | declaration site, render-by-tag in markup, engine state-child tags |
| `@varname` (canonical expression access) | reads, writes, compound assignments |

**Bare names in expressions are LOCAL identifiers only.** They do NOT resolve to reactive state. `<count> = 0; let count = 5;` is `E-NAME-COLLIDES-STATE` — locals cannot shadow registered state names.

Why two forms: every state touch is visually distinguishable from local-variable touch. The reader can scan a function body and instantly count "how many state cells does this read or mutate." Load-bearing for the exhaustiveness goal.

**`@` is NOT a JS-framework concession.** It is the canonical, semantically-required marker. The pre-S55 framing of `@` as "sugar" is superseded.

---

## §4 The three RHS shapes for state declarations (§6.2)

Every state cell's right-hand side is one of three shapes.

**Shape 1 — plain reactive cell.** RHS is a literal or expression value. No render-spec. Display via `${@x}` interpolation only.

```scrml
<count> = 0
<name>  = ""
<items> = []
```

**Shape 2 — decl-coupled-with-render-spec.** RHS is bindable markup. Validators ride as bare attributes on the decl. `<varname/>` in markup expands to the bound input element with appropriate `bind:value`/`bind:checked` dispatch.

```scrml
<userName req length(>=2)> = <input type="text"/>
<agree    req>             = <input type="checkbox"/>
```

**Shape 3 — derived (read-only).** `const` modifier; RHS is an expression that recomputes on dep change. Markup-typed derived cells are legal under L1.

```scrml
const <doubled>     = @count * 2
const <greeting>    = "Hello, " + @userName
const <badge>       = <span class="badge">${@userName}</span>   // markup-typed
```

`<derivedName/>` in markup with a non-markup-typed derived cell is `E-CELL-NO-RENDER-SPEC`.

**Optional `default=` attribute** — any cell may declare an explicit reset target: `<startTime default=null> = Date.now()`.

---

## §5 Compound state — Variant C (§6.3)

Ad-hoc compound state uses structural-children. Field access via canonical dot navigation.

```scrml
<formRes>
    <name>  = ""
    <email> = ""
    <error> = ""
</>

// Read: @formRes.name, @formRes.error
// Write: @formRes.name = "alice"
```

Tier 3 predefined-shape compound (positional sugar legal):

```scrml
type UserInfo:struct = { name: string, age: number, active: boolean }
<userInfo>: UserInfo = ("alice", 30, true)
```

Positional binding is legal ONLY when the structure is fixed by a predefined type. Ad-hoc compound state must use structural-children form.

---

## §6 The error model — `fail` / `!{}` (NOT try/catch)

**try/catch is not in scrml's vocabulary.** Public claim. Surface a retraction if anyone slips and uses it.

scrml uses **failable functions** + **call-site `!{}` handlers**:

```scrml
type LoadError:enum = {
    Network(msg: string)
    Empty
}

server function fetchItems()! -> LoadError {
    const result = ?{ select * from items }
    if (result.length == 0) fail LoadError::Empty
    return result
}

function load() {
    const rows = fetchItems() !{
        | ::Network msg -> { @phase = .Error(msg); return }
        | ::Empty       -> { @phase = .Empty;       return }
    }
    @phase = .Success(rows.length)
}
```

Pattern:
- `function name(args) ! ErrorType { ... }` declares failable
- `fail .Variant(args)` surfaces the error
- `let x = call() !{ | ::Variant arg -> { ... } }` exhaustive call-site handler

**Errors-as-states is the canonical lifting:** at Tier 1+, the `!{}` handler at the call site does one thing — route each error variant into the right Phase variant. The error becomes a state in the Phase enum. `<isError>` + `<errorMsg>` cells are anti-patterns; the failure modes live in the type.

---

## §7 Engines (Tier 2) — the centerpiece (§51)

Engines are the v0.next centerpiece. Singleton-by-design (one declaration mounts the singleton; cross-file mount via `<EngineName/>`). Components are the multi-instance vehicle (Move 20 — components and engines are distinct, do not collapse).

```scrml
type Phase:enum = { Idle, Loading, Error(msg: string), Empty, Success(count: int) }

<engine for=Phase initial=.Idle>

    <Idle>
        <button rule="load -> Loading">Load</button>
    </>

    <Loading rule="onResult.ok(n) -> Success(n)"
             rule="onResult.err(m) -> Error(m)"
             rule="onResult.empty -> Empty">
        Loading...
    </>

    <Error msg>
        <div>${msg}</div>
        <button rule="retry -> Loading">Retry</button>
    </>

    <Empty>
        No rows yet.
    </>

    <Success count>
        Got it: ${count} rows
    </>

    <onTransition from=Loading to=Success>
        ${ analytics.track("load.success") }
    </>

</>
```

Key engine concepts:
- **Auto-declared engine variable** — first `<engine for=Phase>` in a scope auto-declares `<phase>` (lowercase first-letter of type, Move 16). Manual override via `var=<name>`.
- **Mount position = decl position.** Same-file decl-IS-mount; `<EngineName/>` for cross-file mount of a shared singleton.
- **`initial=`** required (W-ENGINE-INITIAL-MISSING lint defaults to first variant if omitted; forbidden on derived engines).
- **`rule="event -> Variant"`** the transition contract. Three forms: event-driven, predicate, wildcard.
- **`.advance(.event)`** is the only legal write path. `@phase = .Loading` direct writes bypass rules — `E-ENGINE-INVALID-TRANSITION`.
- **`<onTransition from=A to=B>`** for cross-state effects (analytics, cleanup).
- **`effect=` attribute** on rules for inline per-rule effects.
- **Derived engines** — `<engine for=Phase derived=expr>` reactively recomputes the variant; no rules, no writes (`E-DERIVED-ENGINE-NO-WRITE`).
- **Components are NOT engines** — a component-instance with internal state is fresh per instance; an engine is one app-lifecycle singleton (`E-COMPONENT-ENGINE-SCOPE`).

---

## §8 Validators + auto-synthesized validity surface (§55)

Compound state with validators auto-synthesizes a reactive validity surface at TWO levels — compound rollup AND per-field — both reactive, both read-only.

```scrml
<signup>
    <name  req length(>=2)>           = <input type="text"/>
    <email req email>                 = <input type="email"/>
    <agree req>                       = <input type="checkbox"/>
    const <displayName> = @signup.name.toUpperCase()
</>

// Auto-synthesized (read-only):
//   @signup.isValid       boolean rollup
//   @signup.errors        compound-level errors array
//   @signup.touched       any field touched yet?
//   @signup.submitted     was first submit attempted?
//   @signup.name.isValid  per-field
//   @signup.name.errors   per-field (enum tags from ValidationError, NOT strings)
//   @signup.name.touched  first interaction
//   @signup.email.isValid ...
```

**Universal-core predicate vocabulary** (§55.1) — same word at compile site and runtime:

`req`, `is some` (existence-check, scrml's null+undefined unification), `length(<rel-arg>)`, `pattern`, `min`, `max`, `gte`, `lte`, `eq`, `oneOf`, `email`, `url`, `numeric`, `integer`, `custom`.

**Errors are enum tags, not strings.** `@signup.name.errors[0]` is `.Required` or `.TooShort(2)` — consumers pattern-match on the tag.

**4-level error message resolution chain** (§55.5, L12):
1. Inline on decl (`<name req:"Please enter your name">`)
2. Project-registered (a project-level message catalog)
3. `scrml:data` defaults (English)
4. Match escape hatch (`<match for=ValidationError>`)

**`<errors of=expr/>`** first-class element renders errors per-cell or rollup. `all` attribute toggles full-array vs first-error rendering.

**Cross-field validation** via predicate args with cross-cell expressions: `<confirm req eq(@signup.password)>` — no separate vocabulary. (L14.)

**Validators on derived cells** are forbidden (`E-DERIVED-WITH-VALIDATORS`); use refinement-type predicates at the type level instead.

---

## §9 Channels, schema, predicates, `not` keyword (Stage 0b D3 — pending)

These are pending in Stage 0b Dispatch 3 (brief pre-written). Until D3 lands, expect SPEC drift in §38 (channels), §39 (schema), §53 (predicates).

**Current canon (kickstarter v2 §11.3, §11.6, §6 validators):**

- **Channels are file-level** (NOT inside `<program>`). Drop `@shared` modifier. Auto-declare variable per Move 16. Body uses V5-strict state declarations.
- **Schemas keep SQL-mirror vocabulary** (`not null`, `unique`, `references`, `default(literal)`) — principled exception. SQL passthrough (`?{}` blocks) is **inviolable**.
- **`not` keyword** (Move 11 — pinned-style modifier on imports / decls for opt-out semantics).

---

## §10 stdlib — what's on the shelf (15 modules)

**Important:** stdlib modules are **import-only**, not standalone-compile targets. Don't try to compile `stdlib/<x>/index.scrml` directly — it's designed to be imported into a `<program>`.

**App-building primitives:**
- `scrml:auth` — `hashPassword`, `verifyPassword`, `signJwt`, `verifyJwt`, `decodeJwt`, `createRateLimiter`, TOTP (generate/verify)
- `scrml:data` — `validate(data, schema)`, `isValid`, `firstError`; predicate builders; transforms (`pick`, `omit`, `groupBy`, `sortBy`, `unique`, `flatten`, etc.) — vocabulary alignment task pending B3
- `scrml:router` — `match(pattern, path)`, `parseQuery`, `buildUrl`, `navigate`, `currentPath`, `onNavigate`
- `scrml:store` — `createStore`, `createSessionStore`, `createCounter` (KV / session via SQLite)

**Network + scheduling:**
- `scrml:http` — REST helpers (`get/post/put/del/patch`) + `withBaseUrl/withAuth/withDefaults`, `retry(fn, opts)`, `multipart`, `uploadFile`, `isOk`/`isError`. All async.
- `scrml:redis` — `get/set/setex/del/exists/expire/ttl/incr/decr`; sets `sadd/srem/sismember/smembers`; pub/sub `publish/subscribe/unsubscribe`; `createClient`, `send`, `close`. Bun.redis-backed.
- `scrml:cron` — `schedule(pattern, handler)` returns CronJob; `nextOccurrence`, `stop`. Bun.cron-backed (Bun ≥1.3.12).

**Crypto + format + patterns:**
- `scrml:crypto` — `hash`, `verifyHash`, `hmac`, `safeCompare`, `generateUUID`, `generateToken`
- `scrml:format` — `formatCurrency/Number/Percent/Bytes`, `slug`, `pluralize`, `titleCase`, `capitalize`, `toWords`, `truncate`, `padLeft/Right`, locale-aware Intl: `compactNumber`, `formatList`, `formatRange`, `formatNumberAdvanced`
- `scrml:time` — `formatDate/Time/DateTime/Relative/Duration`, `parseDate`, `isValidDate`, `startOf/addTime/diffTime`, `debounce/throttle/sleep`; timezone: `formatInTimezone`, `nowInTimezone`, `toTimezoneParts`, `tzOffset`; ISO: `formatISO`, `parseISO`
- `scrml:regex` — vetted `patterns` catalog (email, url, ipv4, uuid, slug, hexColor, semver, isoDate, phoneE164, usZip, etc.); helpers `test`, `match`, `extract`, `replace`, `escape`, `caseInsensitive`, `isValid(name, str)`

**Wrappers:**
- `scrml:fs`, `scrml:path`, `scrml:process`, `scrml:test` — Node compat / test runner

**Distribution model (locked S57):** bundled-with-compiler, single-version, stdlib-version = compiler-version, no registry, no separate semver.

**Honesty positioning:** "kills ~80% of typical-app npm needs," not 100%. Real gap: OAuth providers (brief pre-written for `scrml:oauth`, not yet shipped); date-formatting beyond Intl; advanced HTTP middleware; OIDC discovery.

**No generics** — scrml doesn't have type parameters. Recurring finding: per-domain enums + per-screen state-machine variants beat generic stdlib types like `AsyncPhase<T>` — naming the variants in app context produces better match blocks. The five-line "boilerplate" is five lines of useful domain spec.

---

## §11 Frequent anti-patterns (kickstarter §7, agent-trip-up list)

What LLMs reflexively reach for + the scrml form:

| Reflex | Why wrong | scrml form |
|---|---|---|
| `useState`, `ref`, `signal()` | scrml has no hook calls | `<x> = 0` declares; `@x` reads |
| `useEffect`, `watchEffect` | no effect hooks | Reactive `${...}` blocks; `<onTransition>` for engine effects |
| `try { ... } catch (e) { ... }` | not in scrml | `function f()! -> Err { fail Err::V(...) }` + `let x = f() !{ \| ::V → ... }` |
| `if (errors.length > 0)` | manual error checking | `@form.isValid` (auto-synth); `<errors of=@form.field/>` |
| `bcrypt.hash(pwd, 10)` | npm import | `import { hashPassword } from 'scrml:auth'` |
| `===`, `!==` | scrml is strict-by-default | `==`, `!=` (E-EQ-004) |
| `throw new Error(msg)` | not in scrml (§19) | `fail SomeErr::Variant(msg)` |
| `function reset() {}` (local) | `reset` is reserved | Use a different name; `reset(@cell)` is the keyword |
| Local var named after a state cell | shadows state | E-NAME-COLLIDES-STATE; rename the local |
| `<x>: SomeEnum = SomeEnum.Variant` | redundant prefix | `<x>: SomeEnum = .Variant` |
| `match` without exhaustiveness | scrml requires it at Tier 1+ | E-MATCH-NOT-EXHAUSTIVE; cover every variant or use `_` wildcard |

---

## §12 Operational rules (orientation, not language)

- **Pre-commit hook** runs `bun test` (excluding browser). Never bypass with `--no-verify` without explicit user authorization. ~7,800-8,800 tests pass; 0 failures is the contract.
- **Cherry-pick + push protocol** — see pa.md §"Cross-machine sync hygiene" + §"wrap" definition.
- **Worktree path discipline** — agent dispatches with `isolation: "worktree"` may construct main-rooted paths from intake docs by mistake; brief must paste the absolute worktree path explicitly; agents must run `pwd` at startup.
- **Agent-file edits don't propagate mid-session** — if you edit `~/.claude/agents/<name>.md`, the change takes effect at the NEXT PA session, not the current one. Plan accordingly.
- **scrml-dev-pipeline tool set** (post S57): `Agent, Read, Write, Edit, Glob, Grep, Bash`. Default model `opus`. Edits to this file took effect S58+; before that, the agent's tools were limited and dispatches needed careful brief design.
- **SPEC.md size** (post-D2): ~23,100 lines / ~400k tokens. Approaching the size where Read+Write full-file-overwrite is infeasible; Edit's diff-form scales fine. Per-section split queued as v0.3.0+ candidate (see IMPLEMENTATION-ROADMAP.md §8.5).

---

## §13 The locks (L1-L20) — at-a-glance

Captured in full at `scrml-support/docs/deep-dives/v0next-s56-deliberation-outcomes-2026-05-04.md`. Quick reference:

| # | Lock |
|---|---|
| L1 | Markup-as-first-class-value (PILLAR — held since scrml8) |
| L2 | Compound state Variant C with canonical `@formRes.name` access |
| L3 | Decl-coupled-with-render-spec (`<name req> = <input/>`) |
| L4 | Partial validator vocabulary unification (no bilingual schema) |
| L5 | `is some` reused from existing scrml primitive (coexists with `req`) |
| L6 | Match Tier 0/1/2 ladder |
| L7 | Match attributes (rules-inert + `effect=`/`<onTransition>` engine-only) |
| L8 | Two match shapes coexist (block-form + JS-style) |
| L9 | `loose` flag dropped (rules-in-match obviates) |
| L10 | `reset()` as primitive (superseded by L18) |
| L11 | Auto-derived validity surface (compound + per-field, errors as enum tags) |
| L12 | Validator error-message origin (4-level resolution chain) |
| L13 | `<errors of=expr/>` first-class element |
| L14 | Cross-field validation via predicate args (no separate vocabulary) |
| L15 | `const <derived> = expr` (extended ALL-SCOPE during S56 alignment pass) |
| L16 | Multi-render via existing access paths (no override syntax) |
| L17 | Compiler dispatches binding by render-spec; writable requires bindable |
| L18 | `reset(@cell)` keyword + `default=` attribute (γ semantics) — supersedes L10 |
| L19 | Multi-statement event handlers force named function |
| L20 | `derived=expr` engine attribute (any reactive expression of engine's type) |

---

## §14 What this primer does NOT cover (read elsewhere)

- Detailed grammar — see `compiler/SPEC.md` (the authoritative spec; ~23k lines)
- Section index — see `compiler/SPEC-INDEX.md`
- Recipes (auth, real-time, schema, etc.) — see `docs/articles/llm-kickstarter-v2-2026-05-04.md` §11
- Anti-patterns table for dev-agent dispatch — see `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`
- Compilation pipeline stages — see `compiler/PIPELINE.md`
- Implementation phase plan (Phase A1+) — see `docs/changes/v0next-spec-impact/IMPLEMENTATION-ROADMAP.md`

---

## §15 Update protocol

When SPEC changes substantively (a Stage 0b dispatch lands, a lock changes, a stdlib module is added/extended), update this primer in the same commit or shortly after. Hand-off should note "primer updated for X" so next-session PA knows the canon snapshot is fresh.

A primer that has fallen behind is worse than no primer — it teaches yesterday's language. Stale primers cost more in correction than they save in onboarding.
