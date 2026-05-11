# Hardcoded Thresholds Follow-up — 2026-05-11 (S81)

**Status:** read-only audit (follow-up to `hardcoded-thresholds-2026-05-10.md` §7 caveat)
**Scope:** per-file deep-read of `compiler/src/codegen/emit-*.ts` (25 files) for multi-token thresholds that the S78 grep-based audit could not detect
**Authored by:** PA direct (S81 dispatch)
**HEAD at audit:** 55d41f7 (S80 close)

## §0 Headline

S78 §7 caveat predicted "2-4 more Bucket C items lurking in `emit-server.ts` / `emit-reactive-wiring.ts` related to rate-limit / CSRF / CORS Max-Age (currently dropped because they pass through middleware config, but the *defaults* embedded in those generators when the user does not specify a value may themselves merit configurability)."

**Found: exactly 2 Bucket C candidates** (matches the lower bound of the prediction). One is a **misclassification recovery** from S78 §1 dropped-set; one is a new finding the §7 caveat didn't anticipate. Plus 2 Bucket D additions documented for completeness.

| ID | Bucket | Location | Threshold | Adopter-visible? |
|---|---|---|---|---|
| F.1 | C | `emit-server.ts:339` | CORS `Access-Control-Max-Age: '86400'` | YES — emitted into every CORS-enabled compiled server output |
| F.2 | C | `emit-channel.ts:124` | Channel reconnect default `2000` ms | YES — per-channel attribute exists; PROJECT-level default missing |
| F.3 | D | `emit-reactive-wiring.ts:740` | `<timer interval=>` fallback `1000` ms | NO — error path only |
| F.4 | D | `emit-reactive-wiring.ts:998` | `<timeout delay=>` fallback `1000` ms | NO — error path only |

The two CSRF surfaces are **not** threshold-shaped (session cookie has no `Max-Age=`/`Expires=`; baseline double-submit cookie has no expiry — both are session cookies by design). The two rate-limit surfaces (`hits.length > _scrml_rate_limit`, `windowStart = now - _scrml_rate_window`) ARE already adopter-configurable through `<program ratelimit="N/sec|min|hour">`; the unit-conversion table (`sec=1000, min=60000, hour=3600000`) is the spec-defined finite set, not a tunable default.

## §1 Method

The S78 audit grep-prioritized then spot-checked context (4 grep patterns + targeted reads). This follow-up does the inverse: per-file Read of every `codegen/emit-*.ts` file, focusing on the embed-into-compiled-output codepaths (where the threshold becomes part of the user's running app, not just a compile-time guard).

Files audited (25):
- `emit-bindings.ts` (no findings — bind event names + property accessors only)
- `emit-channel.ts` (F.2 + reconnect handling at lines 378-388 verified — no other threshold)
- `emit-client.ts` (no findings — markup interpolation + import rewriting only)
- `emit-control-flow.ts` (no new findings — S78 C.2 batch IN-list cap shipped S79)
- `emit-css.ts` (no findings — CSS atomic compilation)
- `emit-engine.ts` (no findings — engine state-child rendering + transition tables; `1000 * 2 ** _scrml_reactive_get("attempt")` at line 344 is a comment example, not real code)
- `emit-event-wiring.ts` (no findings — DOM event delegation only)
- `emit-expr.ts` (no findings — pure expression emission)
- `emit-functions.ts` (no findings — client-side fetch wrappers; GITI-010 retry pattern is on-403 retry, not time-based backoff)
- `emit-html.ts` (no findings — markup → HTML)
- `emit-library.ts` (no findings — library-mode meta-block strip)
- `emit-logic.ts` (no findings — statement emission)
- `emit-machine-property-tests.ts` (no findings — unit-test surface)
- `emit-machines.ts` (no findings — legacy `<machine>` codegen; `30000` is a doc-comment example at line 71)
- `emit-messages.ts` (no findings — error message templates)
- `emit-parse-variant.ts` (no findings — parseVariant codegen)
- `emit-predicates.ts` (no findings — predicate runtime check emission)
- `emit-reactive-wiring.ts` (F.3 + F.4 only — both error-path fallbacks)
- `emit-server.ts` (F.1 only — see §2)
- `emit-sync.ts` (no findings — channel sync codegen)
- `emit-synth-surface.ts` (no findings — validity surface emission)
- `emit-test.ts` (no findings — test runner)
- `emit-validators.ts` (no findings — validator runtime)
- `emit-variant-guard.ts` (no findings — variant guard helper)
- `emit-worker.ts` (no findings — worker codegen)

Plus a spot-check of `runtime-template.js` for additional embedded constants the S78 audit didn't surface — none beyond the MAX_RUNS=100 already shipped at S79 A.1.

## §2 Bucket C — F.1: CORS `Access-Control-Max-Age` hardcoded

| Field | Value |
| --- | --- |
| Location | `compiler/src/codegen/emit-server.ts:339` |
| Current value | `lines.push("    'Access-Control-Max-Age': '86400',");` (string literal in emitted compiled output) |
| What it gates | CORS preflight cache lifetime. After a successful preflight (OPTIONS) response, the browser caches the CORS permission grant for `Max-Age` seconds — subsequent same-origin/method/header requests skip the preflight. |
| User-visible? | YES — emitted into every CORS-enabled compiled server output. The hardcoded `'86400'` (24 hours) becomes the value the user's running browser sees. |
| Why adopter-relevant | (a) Enterprises with stricter CORS policy review cadence sometimes want shorter (1h, 30min). (b) High-traffic public APIs may want longer (7d, the legacy maximum before browsers tightened) to maximize preflight elision. (c) Spec-compliance: Chromium caps at 7200s (2h), Firefox at 86400s (24h), Safari at 600s (10min) — adopters targeting Safari-heavy traffic gain nothing from the 86400 value and may want to align with the 600s effective cap. The hardcoded 86400 reflects "Firefox-maximum + ignore Chromium's cap" — a reasonable default but not universally optimal. |
| Misclassification reference | S78 §1 dropped-set lists "CORS Max-Age 86400" under "Dropped: ... generated runtime config values that ALREADY pass through user-supplied middleware config (rate-limiter window/limit, fly.toml interval=10000/timeout=2000, CORS Max-Age 86400)." This is **incorrect.** The `middlewareConfig.cors` value provides the `Access-Control-Allow-Origin` (the origin URL) only; the Max-Age, Allow-Methods, and Allow-Headers are all hardcoded constants emitted alongside it (lines 336-339). No override path exists today. |
| Recommended option | `<program cors-max-age=N>` per-program attribute (mirrors S79 C.1 idempotency-TTL + C.2 batch-in-list-cap pattern; same middleware-attribute precedent). Accept bare integer (seconds, per spec convention) OR duration string with unit suffix. Default 86400. Silent fallback on null/malformed (v1 scope; future v2 `W-MIDDLEWARE-CORS-MAX-AGE-INVALID` lint). Alternative: a structured `<program cors=>` attribute that accepts an OBJECT with origin + max-age + methods + headers — heavier surface but more cohesive. |
| Effort | Small-medium (~1h). One emit-site to parameterize; one TS interface field (`MiddlewareConfig.corsMaxAge?: number | null`); one ast-builder extraction site (parallel to existing `cors` field); one SPEC §39.2.1 amendment paragraph + §34 row if a diagnostic is added. |

## §3 Bucket C — F.2: Channel reconnect default hardcoded

| Field | Value |
| --- | --- |
| Location | `compiler/src/codegen/emit-channel.ts:124` |
| Current value | `let reconnectMs = 2000;` (default before `<channel reconnect=N>` attribute is read) |
| What it gates | After a WebSocket disconnect, the client-side reconnection setTimeout cadence. Fires at `_scrml_ws.onclose` (line 380/382) via `setTimeout(connectFn, ${reconnectMs})`. |
| User-visible? | YES — emitted into every channel client output. The hardcoded `2000` ms becomes the reconnection cadence the user's running browser uses for any channel that doesn't explicitly set `reconnect=`. |
| Why adopter-relevant | (a) Per-channel `<channel reconnect=N>` override exists at the AUTHORING level, but adopters with many channels (chat + presence + notifications + activity feed) would prefer to set ONE project default than repeat the attribute on every channel decl. (b) Production apps typically want exponential backoff (200ms → 400ms → 800ms → ...) rather than fixed cadence; today's fixed 2000ms is a placeholder for that absent functionality. (c) Dev-mode apps want faster reconnect (200-500ms) for iteration cadence; production apps want longer (5-10s) to be polite during outages. |
| Why not Bucket D | The per-channel attribute IS the adopter-visible knob, but the DEFAULT when it's omitted is hardcoded with no project-level override — same shape as F.1 (origin is configurable; Max-Age is not). For projects with >3 channels this becomes meaningful authoring repetition. |
| Recommended option | `<program channel-reconnect=N>` per-program attribute. Same parsing precedent as `<program idempotency-ttl=>` (bare integer ms OR `Nms`/`Ns`/`Nm`/`Nh`). Per-channel `<channel reconnect=>` continues to override the project default. Default 2000ms preserved. Silent fallback on null/malformed (v1; future v2 lint). Future direction (out of scope here): exponential-backoff-with-jitter as a separate `<channel reconnect-backoff="exponential">` design lane, NOT a threshold question. |
| Effort | Small (~30-45 min). One emit-site in `extractChannelAttrs` to default from middleware config instead of literal 2000; one TS interface field; one ast-builder extraction site. No new diagnostic; no SPEC §34 row. SPEC §38 amendment paragraph documenting the precedence (program-level default; channel attribute overrides). |

## §4 Bucket D — F.3 + F.4: error-recovery fallbacks (document only)

### F.3 `<timer interval=>` invalid-value fallback

| Field | Value |
| --- | --- |
| Location | `compiler/src/codegen/emit-reactive-wiring.ts:740` |
| Current value | `intervalMs = 1000;` (after `intervalMs === null \|\| isNaN(intervalMs) \|\| intervalMs <= 0` check) |
| Why Bucket D | This fallback fires ONLY when the user's `<timer interval=>` attribute is null, NaN, or non-positive. In that path, the upstream emit-html error pass has already reported a diagnostic (see comment context at line 739 vs the parallel at line 998 for `<timeout delay=>`). The 1000ms fallback is a paranoia ceiling so the compile doesn't crash producing an empty setTimeout — it's never the value of a well-formed program. |

### F.4 `<timeout delay=>` invalid-value fallback

| Field | Value |
| --- | --- |
| Location | `compiler/src/codegen/emit-reactive-wiring.ts:998` |
| Current value | `delayMs = 1000; // fallback (error already reported in emit-html)` |
| Why Bucket D | Identical shape to F.3 — error-recovery default when the user-supplied `delay=` is invalid. Comment is explicit that the error has already been reported. Never the value of a well-formed program. |

## §5 Confirmed non-candidates (audit-trail completeness)

These were checked and explicitly determined NOT to be threshold candidates. Listed so a future audit doesn't re-litigate.

| Location | Value | Why non-candidate |
| --- | --- | --- |
| `emit-server.ts:54-56` | `m: 60*1000, h: 60*60*1000, d: 24*60*60*1000` | Unit-conversion table for `parseIdempotencyTtl`. Same shape as the S78 §1 dropped "unit-conversion constants (1000 ms/sec; 60000 ms/min)" rule. Bucket D by audit-shape precedent. |
| `emit-server.ts:287` | `'Set-Cookie': 'scrml_sid=; ... Expires=Thu, 01 Jan 1970 00:00:00 GMT'` | Canonical RFC "delete cookie" Epoch-zero pattern. Not adopter-tunable; semantic. |
| `emit-server.ts:356` | `windowMs: number = unit === 'sec' ? 1000 : unit === 'min' ? 60000 : 3600000` | Rate-limit unit-conversion table. Same S78 §1 dropped-set rule. |
| `emit-server.ts:358` | `_scrml_rate_map = new Map()` | Unbounded map — memory-leak concern, not threshold. W-LEAK-010 territory; out of scope for THIS audit. Tracked separately in priority menu item #9. |
| `emit-server.ts:556` | `'Cache-Control': 'no-cache'` | SSE response directive — semantic, not a threshold. |
| `emit-server.ts:336-338` | `Access-Control-Allow-Methods`/`-Allow-Headers` | Hardcoded but structural (compliant method/header lists, not numeric tunables). Could be argued for adopter-extensibility but not a THRESHOLD by audit definition. Out of scope. |
| `emit-machines.ts:71` | `30000` | Doc-comment EXAMPLE (`Literal (constant-folded at compile time): 30000 (bare number)`). Not live code. |
| `emit-engine.ts:344` | `1000 * 2 ** _scrml_reactive_get("attempt")` | Doc-comment EXAMPLE in the engine timer-table docstring. Not live code. |
| `runtime-template.js` | `setTimeout`/`setInterval` sites at 179/738/804/1048/1111/1153 | Internal timer wiring + debounce/throttle. All driven by user-supplied `<onTimeout after=>` / `debounced=` / `throttled=` values. No hardcoded defaults. |
| `emit-functions.ts` (GITI-010 retry) | 403-retry-once pattern | Single-shot retry on the CSRF-mint 403 path. Not time-based; not a threshold. |

## §6 Recommended actions (prioritized)

Listed in the same shape as S78 §6 for consistency. **NO code changes were made by this audit** — it is read-only research per pa.md PA-edit-permission discipline.

1. **F.1 — CORS Max-Age override via `<program cors-max-age=N>`** (~1h). Highest adopter-impact of the two findings; same-shape implementation as S79 C.1/C.2 (well-trodden pattern). Closes the S78 §1 misclassification of the 86400 value.

2. **F.2 — Channel reconnect default override via `<program channel-reconnect=N>`** (~30-45 min). Smaller adopter-impact (per-channel attribute already exists) but reduces authoring repetition for multi-channel projects. Same-shape implementation as F.1.

**Combined effort estimate:** ~1.5-2h. Both share a SPEC amendment pattern with §39.2.1 and §38 respectively.

**Defer signals:** if Bryan ratifies as low-priority, both items file behind Phase A10 + self-host parity + debounce/throttle keyword retirement. Neither blocks v0.2.0; both are friction-reductions, not correctness gates.

## §7 Caveats + audit-method notes

- **Coverage:** the deep-read covered all 25 `emit-*.ts` files + `runtime-template.js`. Coverage of other `compiler/src/` files (non-codegen — `route-inference.ts`, `type-system.ts`, `protect-analyzer.ts`, etc.) was NOT re-done in this follow-up; S78 audit's grep pass covered them. If a similar follow-up is desired for non-codegen files, that's a separate ~2-3h pass — not requested by S78 §7 caveat.

- **The "Allow-Methods/Allow-Headers hardcoded" line at emit-server.ts:336-338 is a future-debate item.** Today they are: `'GET, POST, PUT, PATCH, DELETE, OPTIONS'` and `'Content-Type, X-CSRF-Token, Authorization'`. Some adopters may want to restrict (security tightening: drop PUT/DELETE if not used) or extend (auth integrations needing `X-API-Key`, `X-Request-ID`, etc.). Not a threshold by audit definition (no numeric tunable) but is an embedded-default-into-compiled-output configurability question of similar shape. Out of scope for this audit; logged as a finding for future cors-design-dive consideration.

- **The PRE-S79 baseline matters.** S78 audit ran at HEAD `8f49e5c`; S79 shipped 5 items. This follow-up runs at HEAD `55d41f7` (S80 close) which incorporates all 5 S79 ships. So F.1/F.2 are NOT "the S78 audit missed these" — they're "the S78 audit's §7 caveat predicted these, and per-file deep-read confirmed exactly 2 of the predicted 2-4."

- **Pattern-consistency check.** Both F.1 and F.2 follow the same shape as S79 C.1/C.2: hardcoded default emitted into compiled output, with the natural override path being `<program ATTRIBUTE=VALUE>`. Implementing both would establish a 4-precedent pattern (idempotency-ttl + batch-in-list-cap + cors-max-age + channel-reconnect) — strong signal that the `<program>` attribute surface is the right configurability locus for these adopter-facing emit-side defaults.

## §8 Open question (surface only — no proposed answer)

**Should F.1 + F.2 ship under S81 or defer to a v0.2.0-readiness sweep that captures all middleware-attribute candidates at once?**

A combined sweep could include: F.1 (cors-max-age), F.2 (channel-reconnect), the structural-extensibility question of cors-methods/cors-headers, and the security-headers surface (`X-Frame-Options`, CSP value, Referrer-Policy at emit-server.ts:382-391 are also hardcoded — `headers="strict"` adopter knob is binary on/off, not value-tunable). A unified `<program>`-middleware-attribute amendment pass would be ~3-5h vs the ~1.5-2h of just F.1+F.2.

Reasons to ship F.1+F.2 now: closes the S78 §7 caveat completely; small surface; no design-dive needed (pattern is established).

Reasons to defer to a sweep: avoids 2-step migration when the broader pattern lands; gives a coherent "compiler-emitted middleware defaults are all adopter-overridable" story for v0.2.0 docs.

Surface for Bryan decision. No PA recommendation either way — both paths are structurally sound.
