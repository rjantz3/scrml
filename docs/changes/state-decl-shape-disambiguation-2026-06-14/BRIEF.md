change-id: `state-decl-shape-disambiguation-2026-06-14`. Resolve `g-tier1-read-authority-codegen` (MED) — the Tier-1 §52 server-authority read-authority codegen, unblocked by the disambiguation finding (the blocker is a clean recognition GATE, not a design ruling). scrml-js-codegen-engineer, base HEAD `fff841ca`.

(Full brief — see the dispatched prompt; key points archived per S136:)

# Discriminator (the key)
`< Name authority="server" table="…"> colon-fields </>` = §52.3.5 server-authority type-decl. GATE on `authority="server"`+`table=` (§52.3.3-mandated, unique to §52.3.5 — 5 corpus files, nothing else; orthogonal to §35.2 paren-opener-typed + §54.2 nesting). Gate ALL new recognition on `authority="server"` so §54.2 substates / §35.2 constructors / local states fall through UNTOUCHED. The prior dispatch regressed §54.2 by keying on the colon-body shape broadly — do NOT repeat.

# Phases
- **P0 survey/STOP** — size the `scanStructuralDeclLookahead` extension (the §52.3.5 type-decl in `${…}` is html-fragment today). Bounded → proceed; larger → land clean + STOP + report.
- **P1 recognition gate** — `< Name authority="server" table=> colon-fields </>` → server-authority type-decl node, gated on `authority="server"`. HARD GATE: substate-tagging.test.js + substate-*.test.js (§54.2) + §35.2 constructor tests MUST stay green.
- **P2 Tier-1 read-authority codegen** — `collectServerAuthorityTypes` collector + `SELECT * FROM <table>` mount-load per instance (mirror Tier-2 emitInitialLoad + /__mountHydrate; fire the server-file gate) + SSR pre-render (§52.8, SPLIT if large) + W-AUTH-002 now fires on canonical shapes (narrow its message). WRITE stays dev's `?{}` (Q1=C) — no write route.
- **P3 R26** — canonical §52.3.5 reproducer: decl recognized (not html-fragment), SELECT* load emits for `@cards`, node --check 0, §54.2/§35.2 tests green, pre-commit subset green.
- **P4** — g-tier1-read-authority-codegen status (resolved/narrowed) + state.ts regen.

# Discipline
F4 startup (pwd under .claude/worktrees/agent-, bun install, pretest) · S126 Bash-edit, no cd-to-main · S83 incremental commits · S113 coupled tests · S138 mandatory R26. Read-only context: the disambiguation SCOPING (§1/§3/§4), the G1 SCOPING §7/§9, SPEC §52.3/.6.1/.8 + §54.2 + §35.2.

---
**Dispatch metadata:** agentId `a12e4fa7a628ef192` · isolation:worktree (base `fff841ca`) · model opus · run_in_background · dispatched S194 2026-06-14. Full prompt text is the verbatim Agent() prompt; this is the S136 archival summary (the load-bearing brief content above is verbatim from it).
