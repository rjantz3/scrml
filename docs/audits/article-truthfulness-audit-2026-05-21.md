# Article truthfulness audit — 2026-05-21 (S115)

**Driver:** scrml has evolved hard since the dev.to articles were authored (late April / early
May 2026). Sessions 100-115 ratified Approach C (sealed/bounded compiler), the language-wide
no-`async`/`await` rule, the build-story compiler model, the quoted-text model, the native
parser, and cut v0.4.0. "scrml's Living Compiler" was retracted at S115. This audit classifies
each published dev.to article for **current nominal truthfulness** against that baseline.

**Scope:** the 12 `*-devto-*.md` articles in `docs/articles/`. NOT in scope: `llm-kickstarter-*`,
`x-snippet-*`, `teej_baiting_tweet.md`. "scrml's Living Compiler" is ALREADY RETRACTED (see
`docs/articles/living-compiler-retraction-devto-2026-05-21.md`) — not re-audited here.

**This is a classification audit, not a rewrite.** No article was edited. PA + the user
disposition fixes afterward.

**Truth baseline (authority order):** `compiler/SPEC.md` (via `SPEC-INDEX.md`) →
`docs/PA-SCRML-PRIMER.md` → `master-list.md` §0 → `scrml-support/user-voice-scrmlTS.md`
(Sessions 100-115) → `scrml-support/design-insights.md`. Prior audits
(`ARTICLE-TRUTHFULNESS-AUDIT-2026-05-05.md`, `articles-currency-table-2026-05-13.md`) used as
cross-reference only — both predate Approach C and are STALE.

---

## §0 Two failure modes (the frame)

1. **Nominal-wrong** — article describes scrml in a way that no longer matches the current
   DESIGN (spec/primer/ratifications). Example: an article promoting a feature since retracted
   or redesigned.
2. **Nominal-vs-actual conflation** — article claims something is DONE/shipped when it is only
   designed (nominal). An article may describe nominal scrml, but must not present nominal as
   actual.

---

## §1 Summary table

| # | Article | Classification |
|---|---------|----------------|
| 1 | `why-programming-for-the-browser-needs-a-different-kind-of-language` | FIX-WITH-ANNOTATION |
| 2 | `components-are-states` | FIX-WITH-ANNOTATION |
| 3 | `server-boundary-disappears` | FIX-WITH-ANNOTATION |
| 4 | `npm-myth` | FIX-WITH-ANNOTATION |
| 5 | `orm-trap` | FIX-WITH-ANNOTATION |
| 6 | `css-without-build-step` | FIX-WITH-ANNOTATION |
| 7 | `lsp-and-giti-advantages` | ACCURATE |
| 8 | `mutability-contracts` | REWRITE |
| 9 | `realtime-and-workers-as-syntax` | FIX-WITH-ANNOTATION |
| 10 | `tier-ladder-promotion` | FIX-WITH-ANNOTATION |
| 11 | `why-scrml-has-to-deprecate-function-and-component-overloading` | ACCURATE |
| 12 | `scrml-debate-amends-zod-claim` | FIX-WITH-ANNOTATION |

**Counts:** ACCURATE 2 · FIX-WITH-ANNOTATION 9 · REWRITE 1 · RETRACT 0.

**Cross-cutting (affects 8 of 12):** every article except `tier-ladder-promotion` and
`why-scrml-has-to-deprecate-...` carries a "scrml's Living Compiler" related-reading link whose
blurb sells the retracted transformation-registry idea. Those blurbs now point readers at
disavowed content. See §3.1.

**Cross-cutting (affects 6 of 12):** every article carrying a `Status (v0.2.x)` banner or
inline "v0.2.0 / v0.2.4" version claim is now version-stale — current release is **v0.4.0**
(tagged; pkg.json `0.4.0`). See §3.2.

---

## §2 Per-article detail

### 1. why-programming-for-the-browser-needs-a-different-kind-of-language — FIX-WITH-ANNOTATION

High-altitude six-feature positioning piece. The six-feature thesis is still sound; every
feature it gestures at still exists in the design. Offending claims are narrow.

**Offending claim A (related-links blurb — Living Compiler):**
> "[scrml's Living Compiler]... The transformation-registry framing."

This article does NOT link Living Compiler in its Further-reading list (it lists only npm-myth
+ lsp-and-giti + GitHub) — VERIFIED, no Living Compiler link present. Good. No annotation
needed for this article on the §3.1 axis.

**Offending claim B (§5 Validation — `lin`):**
> "Presence life-cycle (`not`, `is some`, `lin`) is the contract on read order."

`not` / `is some` ship. `lin` (linear types, SPEC §35) is spec'd but the typestate/lin layer
is not implemented in the compiler (confirmed by `mutability-contracts` own status banner). The
article presents all three as live primitives in a "what scrml owns" piece. Nominal-vs-actual
conflation — minor.
**Proposed annotation:** footnote on the §5 paragraph — "`lin` (linear types) is SPEC-ratified
(§35) but not yet implemented in the compiler as of v0.4.0; `not` / `is some` ship today."

**Offending claim C (§6 — WASM / sidecar):**
> "A nested `<program>` compiles to a Web Worker, a WASM module, or a foreign-language sidecar..."

Per `realtime-and-workers`' own honest scope note, only the Web Worker target ships; WASM +
sidecar + supervision attrs are spec-defined, not implemented. This article states all three as
fact with no caveat.
**Proposed annotation:** soften to "compiles to a Web Worker today; WASM and sidecar targets
are spec-defined and on the roadmap" — or add a one-line footnote.

**Rationale:** thesis intact; two nominal-vs-actual overclaims need an "in flight" marker. No
nominal-wrong content.

---

### 2. components-are-states — FIX-WITH-ANNOTATION

Conceptual frame (state-as-type, `<input>`/`<Card>` unification) is still core scrml design and
still true. The article already carries a `Status (v0.2.x)` banner that honestly frames the
`<Card authority="server">` example as a design preview. Problems are localized.

**Offending claim A (legacy `<machine>` keyword):** the article uses `< machine>` as a live
primitive in two places:
> "A reactive variable can be bound to a `< machine>` (§51) so transitions are typed too."
> "scrml gives you `< machine>` for the transition rules..."

`<machine>` is now a **deprecated alias** for `<engine>` (PRIMER §7 — emits `W-DEPRECATED-001`;
`<machine>`→`<engine>` auto-rewrite via `bun scrml migrate`; `W-DEPRECATED-001`→`E-DEPRECATED-001`
planned). The canonical primitive is `<engine>`. Nominal-wrong (the article names the
deprecated form as the thing the language gives you).
**Proposed annotation:** replace `< machine>` references with `<engine>` (the article's own
sibling `tier-ladder-promotion` uses `<engine>` throughout) OR add a correction note: "scrml's
state-machine primitive is now `<engine>`; `<machine>` is a deprecated alias."

**Offending claim B (Living Compiler related-link blurb):**
> "[scrml's Living Compiler]... The transformation-registry framing for the compile-time vs.
> runtime split that makes state-as-type cheap."

Points at retracted content. See §3.1.
**Proposed annotation:** delete the bullet, or replace with the retraction-article link +
neutral blurb.

**Offending claim C (version banner):** `Status (v0.2.x)` / "v0.2.4 working baseline" — stale,
current is v0.4.0. See §3.2.

**Offending claim D (`§11` citation):** banner cites "server-side authority via `<schema>` +
`protect=` + `<db>` + `<channel>`" and the verification trail cites `§11`. §11 is folded
(content distributed to §6.12 + §52). Minor — internal-citation drift, low reader impact.

**Rationale:** core thesis sound; `<machine>`→`<engine>` is the one genuine nominal-wrong item,
plus the shared Living-Compiler + version drift.

---

### 3. server-boundary-disappears — FIX-WITH-ANNOTATION

The server-fn-as-type-system-boundary thesis is intact and current. Failable-fn `!{}` error
model shown is canonical. Most of the article holds.

**Offending claim A (async framing):**
> "...response deserialization, and auto-`await` insertion. The developer SHALL NOT write
> `JSON.stringify`, `JSON.parse`, `await`, or `fetch`... scrml is auto-await throughout the
> source surface."
> "...the compiler emits `Promise.all` and `await` correctly (§13.2)."

This is on the RIGHT side of the S114 no-`async`/`await` rule (the rule forbids `async`/`await`
in scrml SOURCE; the compiler emitting `await` in generated JS output is fine, and "the
developer never writes `await`" is exactly consistent with the rule). NOT nominal-wrong.
HOWEVER the phrase "scrml is auto-await throughout the source surface" is now phrased in a way
that could read as "await exists in scrml, just inserted for you." Post-S114 the cleaner
framing is "scrml has no `async`/`await`; the compiler manages the server boundary via
body-split / CPS." Borderline — flag for optional polish, not a hard error.
**Proposed annotation (optional):** reword "auto-await" framing to "the compiler manages async
across the server boundary (body-split / CPS); `async`/`await` are not scrml keywords."

**Offending claim B (refinement-type predicate args):**
> "(Refinement-type predicate arguments on parameters — `items: List<Item>(@length > 0 &&
> @length < 100)` style — are part of the §53 design surface still landing through v0.2.x...)"

The article already honestly marks this as in-flight. Only the version tag (`v0.2.x`) is stale.
**Proposed annotation:** bump "v0.2.x" → "v0.4.x" or drop the version qualifier.

**Offending claim C (Living Compiler related-link):** present in Further reading. See §3.1.

**Offending claim D (`§11` citation):** "E-PROTECT-001... If `< db>` declares
`protect=...`" + verification trail cites §11. §11 folded → §52. Minor citation drift.

**Rationale:** thesis sound, error model canonical; async-phrasing is defensible but worth a
polish, plus shared Living-Compiler + version drift.

---

### 4. npm-myth — FIX-WITH-ANNOTATION

Well-calibrated piece (already softened from "None of it. Ever." per S65). The package-collapse
argument holds. stdlib enumeration and Bun-absorption claims are current. Two issues.

**Offending claim A (vendor / sealed-language tension):**
> "`scrml vendor add <url>` ingests a UMD or ES bundle from a CDN, generates a type shim, and
> wires it into the boundary security model."
> "The one package you actually need is `vendor add chart.js`. I'm shipping it. Once it lands,
> the conversation is over."

`scrml vendor add` is still a roadmap item — NOT contradicted by Approach C. BUT post-Approach-C
(S114) scrml is now explicitly a **sealed, bounded language** with exactly ONE manifest-gated
host bridge (`import:host`, scoped to `scrml/stdlib/compiler/**`). An adopter reading "vendor add
ingests arbitrary CDN bundles and wires them in" alongside the retraction article's "scrml is a
sealed, bounded language... nothing ambient" will see apparent tension. The vendor story is
about client-side widget bundles (CodeMirror, three.js) — a legitimately different axis from
the compiler-extension axis Approach C sealed — but the article predates the sealed-language
framing and does not draw that distinction.
**Proposed annotation:** add a note clarifying that vendored client-side bundles are a bounded,
opt-in, manifest-tracked ingestion path and are distinct from compiler extensibility (which is
sealed). This is nominal-currency, not a correctness bug — the vendor roadmap item still stands.

**Offending claim B (Living Compiler related-link blurb):**
> "[scrml's Living Compiler]... The transformation-registry framing. The constructive flip-side
> of the npm critique above."

This blurb is the most load-bearing of all eight Living-Compiler links — it explicitly frames
the registry as "the constructive flip-side of the npm critique." Points squarely at retracted
content. See §3.1.
**Proposed annotation:** delete the bullet or replace with retraction-article link.

**Offending claim C (`scrml:data/parseVariant` location):** "import { parseVariant } from
'scrml:data'" + cite "§10.4 scrml:data". `parseVariant` is current (§41.13); the `§10.4`
citation is wrong (§10 is the `lift` keyword). Minor citation drift.

**Rationale:** calibrated argument intact; the vendor framing needs a sealed-language-era note
and the Living-Compiler blurb needs to go.

---

### 5. orm-trap — FIX-WITH-ANNOTATION

SQL-as-primitive thesis is current. `?{}` SQL block, `<schema>`, `<db>`, `scrml migrate`,
bound-parameter mandate, E-SQL/E-PA codes all still hold. The article is honest about deferred
transactions.

**Offending claim A (`§11` citation):**
> "Parsed the `<db>` block (§11) and resolved the driver..."
> verification trail: "§8, §11, §39, §44 cited"

§11 is folded; `<db>`/`protect=` content distributed to §6.12 + §52. The article cites §11 as
the authority for the `<db>` block. Citation drift — low reader impact (E-codes themselves are
correct).
**Proposed annotation:** correct §11 → §52 (or drop the bare section number).

**Offending claim B (transactions deferred):**
> "Transactions are deferred. Current spec workaround is `^{}` meta with direct Bun.SQL
> `sql.begin()` (§44.6)."

Still broadly true (no native transaction syntax shipped). BUT post-Approach-C the general-dev
`^{}` surface is sealed to scrml-native primitives (emit / emit.raw / reflect + 12 runtime
`meta.*`); `^{}` is NOT a general JS escape hatch for `sql.begin()`. Recommending "`^{}` meta
with direct Bun.SQL `sql.begin()`" as a workaround is now nominal-wrong — that escape hatch is
closing under Approach C / M6.
**Proposed annotation:** correction note — "`^{}` is no longer a general JS escape hatch
(Approach C, S114); the transaction workaround needs re-statement. Native transaction syntax
remains roadmap."

**Offending claim C (Living Compiler related-link):** present in Further reading. See §3.1.

**Rationale:** thesis sound; the `^{}`-as-JS-escape-hatch workaround is genuinely nominal-wrong
post-Approach-C, plus citation + Living-Compiler drift.

---

### 6. css-without-build-step — FIX-WITH-ANNOTATION

`@scope`-compilation thesis is current and clean. `#{}` sigil, scoped/global/flat-decl modes,
built-in Tailwind engine all match SPEC §9.1 / §25.6 / §26. The article is honest about Tailwind
engine gaps. This is the LEAST-drifted article after the two ACCURATE ones.

**Offending claim A (Tailwind engine gaps — partially stale):**
> "Arbitrary values (`p-[1.5rem]`), responsive prefixes (`md:`, `lg:`), variant prefixes
> (`hover:`, `focus:`), and custom theme configuration are tracked in `SPEC-ISSUE-012` and not
> yet shipped."

SPEC §26 has moved on: §26.3 Variant Prefixes (S49) and §26.4 Arbitrary Values (S49; S109
grid/flex/aspect family) are now spec'd and at least partially shipped per SPEC-INDEX. The
article's "not yet shipped" list is now partly inaccurate — some of those gaps closed.
**Proposed annotation:** re-verify the Tailwind feature matrix against current §26 and update
the "not yet shipped" list (this is a positive correction — scrml does MORE now than the
article claims).

**Offending claim B (Living Compiler related-link blurb):**
> "[scrml's Living Compiler]... The transformation-registry framing for why scrml puts work in
> the compiler."

Points at retracted content. See §3.1.
**Proposed annotation:** delete the bullet or replace with retraction link.

**Rationale:** thesis fully sound; the only substantive drift is the Tailwind gap list being
pessimistic (under-claims current capability), plus the shared Living-Compiler link.

---

### 7. lsp-and-giti-advantages — ACCURATE

The LSP capability story (SQL column completion against live schema, cross-file prop completion,
cross-file go-to-def, code actions, signature help, hover badges, document symbols) is a
structural argument about one-compiler-owns-every-context. None of it touches the surfaces that
moved S100-S115 (async, Approach C, quoted-text, native parser). The L1-L4 features described
are shipped; L5/find-references/rename are honestly marked as deferred. The giti section is a
parallel structural argument with its own spec citations.

Two minor notes, NOT rising to FIX-WITH-ANNOTATION:
- The article's compiler-pipeline acronym list "(PP, BS, TAB, MOD, CE, PA, RI, TS, META, DG, BP,
  CG)" includes **BS** (block-splitter). Charter B (S111) deletes the block-splitter — the
  native parser replaces the whole front-end. This is internal-architecture detail in a
  parenthetical; it does not change any LSP claim and is not adopter-facing. Not worth a
  correction note unless the user wants pipeline-acronym precision.
- Cites "SPEC §11 protected fields, §12 route inference" for the hover boundary badge. §11 is
  folded → §52. Same low-impact citation drift seen across the batch.
- The article does NOT link "scrml's Living Compiler" in its Further-reading list — VERIFIED
  (it links why-programming / npm-myth / introducing-scrml / null-was-a-billion-dollar /
  Living Compiler... actually it DOES list Living Compiler — see §3.1; this article IS one of
  the 8). Correction: this article carries the Living-Compiler link. See §3.1 note below.

**Disposition uncertainty (flagged for user):** because this article carries the Living-Compiler
related-link (blurb: "The compile-time evaluation story and why it changes what tooling can
do"), it is strictly one of the 8 §3.1 articles. If the user wants the §3.1 link-scrub applied
uniformly, this article needs the one-bullet edit too — which would technically move it to
FIX-WITH-ANNOTATION. Classified ACCURATE here because its OWN body content has zero drift; the
only fix is the shared related-link housekeeping. **User decides whether the related-link scrub
counts as "needs annotation."**

**Rationale:** body content fully current; LSP/giti claims untouched by the S100-S115 arc.

---

### 8. mutability-contracts — REWRITE

The article's central thesis ("the type system can own value predicates + lifecycles +
machines + linear types as one mechanic") is still a valid topic. But the article is
substantially wrong on execution against current scrml: it leans on multiple constructs that are
either retracted-syntax, never-shipped, or now spec-divergent, and it presents them as live
language mechanics.

**Offending claim A (`transitions {}` enum block — not current syntax):**
> ```
> type OrderStatus:enum = {
>     Pending ... Cancelled
>     transitions {
>         .Pending    => .Processing
>         ...
>     }
> }
> ```

scrml does NOT declare transitions inside the enum type. Transitions are declared via `rule=`
attributes on `<engine>` state-children (PRIMER §7; SPEC §51.0.F — three target-only forms:
`rule=.Variant`, `rule=(.A | .B)`, `rule=*`). The arrow form `event -> Variant` is legacy
`<machine>` syntax (§51.3, deprecated). The `transitions {}` enum-body block does not exist in
current scrml. Nominal-wrong — a central code example shows syntax the language never adopted in
this shape.

**Offending claim B (`< machine>` as live primitive):**
> "The deeper feature, `< machine>` blocks, lets you scope a transition graph to a context..."

`<machine>` is deprecated → `<engine>`. Same issue as `components-are-states` claim A, but here
it is load-bearing for component 3 of the article's trio.

**Offending claim C (`(not -> string)` typestate / lifecycle layer):**
> ```
> type User:struct = {
>     passwordHash: (not -> string),
>     metadata: (!not && !number)
> }
> ```
> "`passwordHash` starts as `not` and transitions, exactly once, to `string`."

The typestate/lifecycle layer is SPEC-ratified design surface but NOT implemented in the
compiler — the article's own 2026-05-13 update banner concedes this ("SPEC-ratified design
surfaces that are not yet implemented in the v0.2.4 compiler"). Presented across the body as a
working mechanic. Nominal-vs-actual conflation, and the prior S89 audit already flagged the
`(null -> T)` → `(not -> T)` migration as needing upstream SPEC reconciliation first.

**Offending claim D (`lin` layer — never shipped):**
> "`lin token = mintCsrfToken()` ... any second reference ... is E-LIN-002 ..."

`lin` (SPEC §35) is spec'd, not implemented. Same conflation as C.

**Offending claim E (`[order_amount]` brand syntax):**
> "`@amount: number(>0 && <10000) [order_amount] = 0`"

The `[brand]` syntax does not appear in current SPEC (the prior S57 audit also flagged it as
"aspirational extension PA does not see in current SPEC"). Nominal-wrong.

**Offending claim F (`@amount: number(...)` decl form):** uses `@varname: T` top-level
declaration form. Current canonical decl is structural `<amount> = 0` with validators as bare
attributes (`<amount req gt(0) lt(10000)> = 0`, PRIMER §3-4). The `@`-form is expression-access,
not declaration. Per the memory rule `feedback_declaration_form_in_reproducers`, mixed decl
forms are a real defect.

**Offending claim G (version banner + Living Compiler link):** `Status (v0.2.x)` stale (§3.2);
Living Compiler related-link present (§3.1).

**Why REWRITE not FIX-WITH-ANNOTATION:** the article has FOUR distinct constructs
(`transitions {}`, `<machine>`, typestate `(not -> T)`, `lin`, `[brand]`) that are
retracted-syntax / never-shipped / spec-divergent, and two of the three "components" of its
central trio (lifecycles, machines) are built on them. Annotating each offending claim would
mean a correction note on roughly half the article body — past the "substantially wrong"
threshold. The TOPIC (contracts-as-types) is still valid and worth an article; the current
article should be rewritten against current syntax (`<engine>` + `rule=`, the validator
vocabulary that DID ship, and an honest "typestate + lin are roadmap" framing) rather than
patched.

**Rationale:** valid topic, but the article is built on a stack of syntax the language either
never adopted or has since deprecated; half the body would need correction notes.

---

### 9. realtime-and-workers-as-syntax — FIX-WITH-ANNOTATION

`<channel>` and nested-`<program>`-as-worker thesis is current. The article was already edited
(per S84) to remove `@shared` and add the v0.2.0-removes-`@shared` callout, and it carries an
honest scope note on nested-`<program>` targets. Mostly sound; localized issues.

**Offending claim A (residual `@shared` reference — internal contradiction):**
> "A `<channel>` element is a pub/sub WebSocket with `@shared` reactivity; the wire format is
> fixed by the spec (§38.4)."

Line 208. The article elsewhere (line 125) correctly states `@shared` is **gone** in v0.2.0
(`E-CHANNEL-SHARED-MODIFIER`). This residual sentence contradicts the article's own corrected
text and re-introduces the dead `@shared` term. Nominal-wrong + internal inconsistency.
**Proposed annotation:** delete "with `@shared` reactivity" — auto-sync follows from declaration
inside the channel body, per the article's own line 125.

**Offending claim B (version tag in callout):**
> "**The `@shared` modifier from older scrml drafts is gone in v0.2.0**"
> "Declaration inside the channel body IS the sync primitive — no marker required (v0.2.0+)."

The substance is correct; the `v0.2.0` / `v0.2.0+` version tags are stale (current v0.4.0). See
§3.2. Low-impact (the FACT is right, only the version label dates it).
**Proposed annotation:** drop the version qualifier or bump it.

**Offending claim C (WASM / sidecar honest scope note):** the article already honestly states
only the Web Worker target ships. No fix needed — this is the model the other articles should
follow.

**Offending claim D (Living Compiler related-link):** present in Further reading. See §3.1.

**Rationale:** thesis sound and scope-honest; the one genuine defect is the residual `@shared`
sentence contradicting the article's own correction, plus shared version + Living-Compiler
drift.

---

### 10. tier-ladder-promotion — FIX-WITH-ANNOTATION

The `if=` → `<match>` → `<engine>` ladder is current and central scrml design. `<engine>`,
`rule=` target-only forms, `<onTransition>`, the `bun scrml promote` CLI, `I-MATCH-PROMOTABLE`
all match PRIMER §1/§7 and SPEC §51/§56. This article uses `<engine>` (not `<machine>`)
throughout — correctly. The strongest-aligned of the FIX-WITH-ANNOTATION set.

**Offending claim A (Tier 1 block-form status banner — likely stale):**
> "**Tier 1 block-form `<match for=Type>` is spec-ratified but the parser does not yet
> recognize it in v0.2.4**"

The S88 corpus-ouroboros / S77-S78 changelog indicate match-block parsing landed; the prior
`articles-currency-table-2026-05-13.md` already flagged this banner as predicated on a gate that
"has LIFTED." As of v0.4.0 the "parser does not yet recognize it" claim is very likely false.
**Proposed annotation:** re-verify `<match for=Type>` block-form parser status against the
v0.4.0 compiler; if it parses, update or remove the Tier-1-not-shipped caveat. (Positive
correction — scrml likely does MORE than the banner claims.)

**Offending claim B (version banner):** `Status (v0.2.x)` / "shipped in v0.2.4" — stale,
current v0.4.0. See §3.2.

**Offending claim C (display-text / quoted-text model):** the article's `<match>`/`<engine>`
state-child bodies show bare prose as display text:
> `<Loading>` ... `Loading...` ... `<Empty>` ... `<div>No rows yet.</div>`

Post-S111 (quoted-text model GO at scope (b), v0.4) engine state-child bodies and match
block-form arm bodies are **code-default bodies** — a bare run is code; display text must be a
`"..."` display-text literal (SPEC §4.18, `E-UNQUOTED-DISPLAY-TEXT`). The article's bare
`Loading...` inside `<Loading>` is the exact pattern the quoted-text model changes. Note SPEC
§4.18 is spec-landed (Wave 1) but the compiler fire is spec-ahead-of-implementation (Waves 2+
ship with the native parser). So this is nominal-DRIFT against the ratified design even though
the code may still compile today.
**Proposed annotation:** add a forward-looking note — "as of v0.4 (quoted-text model, SPEC
§4.18), display text inside engine/match bodies is written as a `\"...\"` literal; these
examples predate that and will need the quoted form." (Affects this article and any other with
engine/match state-child bodies — see also `components-are-states`, `scrml-debate-amends-zod`.)

**Offending claim D (Living Compiler related-link):** this article does NOT carry a
Living-Compiler link (Further reading is the companion-piece footer only) — VERIFIED. Not a
§3.1 article.

**Rationale:** ladder design fully current; the Tier-1-not-shipped banner is likely stale
(under-claims), and the bodies predate the quoted-text model — both are nominal-currency
drift, not thesis errors.

---

### 11. why-scrml-has-to-deprecate-function-and-component-overloading — ACCURATE

Describes the v0.2.0 deprecation of function + component overloading, with `match`/`engine`/
derived-state named as the canonical replacement. This matches SPEC §17.5 (function-overload
retired per debate-02; component-overload closed per debate-03) and PRIMER. The deprecation is
real, ratified, and still in force. The `match`/`enum`/`<engine>` primitives the article points
to as replacements are all current. The methodology narrative (sliver test, radical-doubt deep
dive) is process, not a spec claim.

The article's code examples use `<engine>` correctly (no `<machine>`), use `match` arms
correctly, use the failable `fail .Variant` form correctly. The enum + struct declarations are
current shape.

One minor note (NOT rising to FIX-WITH-ANNOTATION): the article does not carry a Living-Compiler
related-link (Further-reading is the companion-piece footer only) — VERIFIED. Not a §3.1
article. No version banner. The `match target { .User u -> ... }` bodies are code-default-body
content and post-§4.18 the display-text-vs-code distinction applies, but these particular arms
contain only code (no bare display prose), so the quoted-text model does not bite here.

**Rationale:** the article documents a ratified deprecation that is still in force; replacement
primitives all current; no retracted/never-shipped syntax; no Living-Compiler link; no version
drift.

---

### 12. scrml-debate-amends-zod-claim — FIX-WITH-ANNOTATION

The article narrates the debate that calibrated the "scrml replaces Zod" claim and shipped
`parseVariant`. The calibrated position and `parseVariant` are current (SPEC §41.13). The
methodology narrative is process. Most of the article holds.

**Offending claim A (L22 family roadmap — partially shipped since):**
> "The roadmap, in order of leverage:
> 1. `parseVariant` — shipped.
> 2. `serialize(value, EnumType)` — symmetric inverse...
> 3. `formFor(StructType)` — flagship...
> 4. `schemaFor(StructType)` ...
> 5. `tableFor(StructType, rows)` ...
> 6. `variantNames(EnumType)` ..."

This roadmap is now stale in scrml's favor: per SPEC-INDEX + master-list, `formFor` (§41.14,
S102) and `schemaFor` (§41.15, S103) are spec'd and shipped/shipping; `serialize` was STASHED at
S103 (debate-05 — failed the synonym gate, intentionally NOT shipped). The article presents
`serialize` as roadmap item #2 ("becomes a compile-time invariant") when it has since been
deliberately stashed. Nominal-wrong on `serialize`; under-claiming on `formFor`/`schemaFor`.
**Proposed annotation:** update the family roster — `formFor` + `schemaFor` shipped; `serialize`
STASHED per S103 debate-05 (synonym-gate failure), not roadmap.

**Offending claim B (`^{}` meta-block framing):**
> "`parseVariant(json, EnumType)` takes a scrml-native type as a positional argument. That used
> to only happen inside `^{}` meta-blocks (where `reflect(TypeName)` is the precedent)."

`reflect` inside `^{}` is still current (Approach C keeps emit / emit.raw / reflect). No drift
here — `reflect` survives Approach C. No fix needed for this sentence.

**Offending claim C (display-text in `<match>` example):**
> `<match result { | ::LoadResult.Success(rows) -> <p>Loaded {rows} rows</p> ... }/>`

Match block-form arm bodies are code-default bodies post-§4.18; also the interpolation is shown
as `{rows}` rather than `${rows}`. Minor — forward-drift against the quoted-text model + an
interpolation-sigil inconsistency. Low impact.
**Proposed annotation:** fold into the §3.3 quoted-text forward-note; optionally fix `{rows}` →
`${rows}`.

**Offending claim D (Living Compiler related-link):** this article's Further-reading lists only
npm-myth / why-programming / introducing-scrml / GitHub — NO Living-Compiler link. VERIFIED. Not
a §3.1 article.

**Rationale:** core narrative + `parseVariant` current; the L22 family roadmap has moved
(`serialize` stashed, `formFor`/`schemaFor` shipped) and needs a currency update — a localized
correction, not a rewrite.

---

## §3 Cross-cutting findings

### §3.1 The "scrml's Living Compiler" related-links blurbs (8 articles — task said ~8; actual count below)

The task brief said "~8 articles link Living Compiler as related reading." Verified count by
reading every Further-reading block:

| Article | Carries Living-Compiler related-link? | Blurb |
|---|---|---|
| `components-are-states` | YES | "The transformation-registry framing for the compile-time vs. runtime split that makes state-as-type cheap." |
| `css-without-build-step` | YES | "The transformation-registry framing for why scrml puts work in the compiler." |
| `lsp-and-giti-advantages` | YES | "The compile-time evaluation story and why it changes what tooling can do." |
| `mutability-contracts` | YES | "The transformation-registry frame that connects this article to the npm story." |
| `npm-myth` | YES | "The transformation-registry framing. The constructive flip-side of the npm critique above." |
| `orm-trap` | YES | "The compile-time evaluation story." |
| `realtime-and-workers-as-syntax` | YES | "The transformation-registry framing." |
| `server-boundary-disappears` | YES | "The transformation-registry framing." |
| `why-programming-for-the-browser-...` | NO | (lists npm-myth + lsp-and-giti + GitHub only) |
| `tier-ladder-promotion` | NO | (companion-piece footer only) |
| `why-scrml-has-to-deprecate-...` | NO | (companion-piece footer only) |
| `scrml-debate-amends-zod-claim` | NO | (npm-myth + why-programming + introducing-scrml + GitHub) |

**Confirmed: exactly 8 articles carry the Living-Compiler related-link.** All 8 blurbs sell the
transformation-registry / living-compiler idea as a positive, load-bearing concept. That idea is
now retracted (`living-compiler-retraction-devto-2026-05-21.md`). Every one of these 8 blurbs
points a reader at disavowed content with an endorsing description.

**Recommended disposition (uniform across all 8):** replace each Living-Compiler bullet with a
link to the retraction article + a neutral blurb (e.g. "scrml's Living Compiler — retracted; see
the retraction for why scrml chose a sealed, deterministic build-story model instead"), OR
delete the bullet outright. The retraction article itself says the original post stays up with a
banner — so a link to the retraction (not deletion of all reference) is the consistent move.

Note: 6 of the 8 (`components-are-states`, `css-without-build-step`, `mutability-contracts`,
`npm-myth`, `orm-trap`, `realtime-and-workers`, `server-boundary` — actually 7) also separately
need other fixes and are already FIX-WITH-ANNOTATION. Only `lsp-and-giti-advantages` is
classified ACCURATE despite carrying the link — see its §2 entry and the disposition-uncertainty
flag.

### §3.2 Version-currency drift (6 articles)

Current release is **v0.4.0** (git tag `v0.4.0`; pkg.json `"version": "0.4.0"`; cut at S114).
Articles authored late-April/early-May 2026 reference `v0.2.0` / `v0.2.x` / `v0.2.4` as the
current baseline:

| Article | Stale version reference |
|---|---|
| `components-are-states` | `Status (v0.2.x)` banner; "v0.2.4 working baseline" |
| `mutability-contracts` | `Status (v0.2.x)` banner; "v0.2.4 compiler" |
| `tier-ladder-promotion` | `Status (v0.2.x)` banner; "shipped in v0.2.4"; "v0.2.4" ×3 |
| `server-boundary-disappears` | "§53 design surface still landing through v0.2.x" |
| `realtime-and-workers-as-syntax` | "gone in v0.2.0"; "v0.2.0+" callout |
| `why-scrml-has-to-deprecate-...` | "dying in v0.2.0" / "deleting in v0.2.0" (historical — see note) |

**Note on `why-scrml-has-to-deprecate-...`:** its "v0.2.0" references are HISTORICAL fact (the
overload deprecation DID land in the v0.2.0 cycle) — those are correct as written and should NOT
be bumped. Only the FORWARD-LOOKING "current baseline is v0.2.x" framing in the other 5 is
stale. This is why that article stays ACCURATE.

**User-voice S114 ruling (relevant):** "versioning is a messaging concern, not an engineering
concern... what MATTERS: adopters don't get hung up on versioning semantics." The counter-message
is "scrml is a real language NOW; versions are freshness markers, not safety gates." Disposition
recommendation: rather than mechanically bumping every `v0.2.x` → `v0.4.x`, consider whether the
status banners should drop hard version numbers entirely in favor of feature-state language
("shipped today" vs "roadmap"). That aligns with the S114 ruling. **Flag for user** — this is a
messaging call, not a mechanical fix.

### §3.3 Quoted-text model forward-drift (3 articles)

S111 ratified the quoted-text model (GO, scope (b), v0.4): in code-default bodies — engine
state-child bodies, match block-form arm bodies, `:`-shorthand bodies — a bare run is code, and
display text must be a `"..."` display-text literal (SPEC §4.18; `E-UNQUOTED-DISPLAY-TEXT`).

Articles showing engine/match state-child bodies with BARE display prose:
- `tier-ladder-promotion` — `<Loading>` body `Loading...`, etc.
- `components-are-states` — `<EditState>` / engine examples (less display prose; mostly markup)
- `scrml-debate-amends-zod-claim` — `<match result { ... -> <p>Loaded {rows} rows</p> }/>`

SPEC §4.18 landed Wave 1 (spec-only); the compiler fire is spec-ahead-of-implementation (Waves
2+ ship with the native parser, v0.4.x→v0.5). So these examples may still COMPILE today, but
they no longer reflect the ratified design. This is nominal-DRIFT, forward-looking.

**Disposition recommendation:** add a forward-note to the affected articles rather than
rewriting examples now ("display text inside engine/match bodies will be written as a `\"...\"`
literal as of the quoted-text model, SPEC §4.18"). Re-examine when the quoted-text compiler fire
ships. **Flag for user** — could reasonably be deferred until §4.18 implementation lands, since
the examples are not wrong against today's compiler.

### §3.4 Folded-section §11 citations (5 articles, low impact)

`components-are-states`, `server-boundary-disappears`, `orm-trap`, `lsp-and-giti-advantages`,
and `npm-myth` cite SPEC `§11` for `<db>` / `protect=` / state-authority content. §11 is folded
(content distributed to §6.12 + §52 — confirmed SPEC-INDEX row 44). The E-codes those articles
cite are correct; only the bare section number is stale. Lowest-priority item — fold into any
edit pass, do not dispatch separately.

---

## §4 Items flagged for user decision

1. **`lsp-and-giti-advantages` — ACCURATE or FIX-WITH-ANNOTATION?** Its body content has zero
   spec drift, but it carries the §3.1 Living-Compiler related-link. If the §3.1 link-scrub is
   applied uniformly it needs a one-bullet edit, which arguably makes it FIX-WITH-ANNOTATION. I
   classified it ACCURATE because the only fix is shared housekeeping, not body content. User
   decides whether the related-link scrub counts as "needs annotation."

2. **`mutability-contracts` — REWRITE vs heavy FIX-WITH-ANNOTATION.** I classified REWRITE
   because four distinct constructs (`transitions {}` enum block, `<machine>`, `(not -> T)`
   typestate, `lin`, `[brand]`) are retracted-syntax / never-shipped / spec-divergent and two of
   the three trio "components" are built on them — correction notes would cover ~half the body.
   But the value-predicate sections (component 1) ARE current and correct. A user could
   reasonably argue for "FIX-WITH-ANNOTATION: gut components 2-4, keep component 1." The topic is
   genuinely worth an article. Flagging the REWRITE-vs-salvage call for user judgment.

3. **Version-currency (§3.2) — mechanical bump vs messaging redesign.** Per the S114 user-voice
   ruling ("versioning is a messaging concern; adopters shouldn't get hung up on version
   semantics"), the right fix may be to drop hard version numbers from status banners in favor
   of feature-state language, not a mechanical `v0.2.x → v0.4.x` bump. Messaging call — user
   decides.

4. **Quoted-text forward-drift (§3.3) — annotate now vs defer.** SPEC §4.18 is spec-landed but
   the compiler fire is not shipped (Waves 2+ / native parser, v0.4.x→v0.5). The affected
   examples are not wrong against today's compiler. Annotating now is defensible (the design is
   ratified); deferring until the §4.18 fire ships is also defensible. User decides timing.

5. **`why-programming-for-the-browser` — `lin` + WASM/sidecar overclaims.** These are genuine
   nominal-vs-actual conflations in a flagship overview piece, but they are single-sentence
   gestures, not load-bearing examples. I classified FIX-WITH-ANNOTATION (footnotes). A user
   could argue ACCURATE-with-caveat. Borderline; flagged.

---

## §5 What this audit did NOT do

- **No article was edited.** Classification + disposition matrix only.
- **No re-audit of `living-compiler-retraction-devto-2026-05-21.md`** — already retracted (S115).
- **No disposition on SPEC.md or PRIMER.** §11-folded citations and the quoted-text fire status
  are spec-side facts, not article-fix scope.
- **No verification of which articles are live on dev.to right now.** Repo `published: false`
  tracks draft state, not public-posting state. The user must cross-reference. The retraction
  article itself states 8 articles link Living Compiler "as a load-bearing idea" — consistent
  with §3.1's confirmed count of 8.

## §6 Tags

#article-truthfulness-audit #s115 #approach-c #living-compiler-retraction #no-async-await
#quoted-text-model #v0.4 #nominal-truthfulness #dev-to
