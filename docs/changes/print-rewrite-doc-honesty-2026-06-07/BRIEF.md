# print()-rewrite BRIEF (archived per pa.md S136) — agent a838b57401bbd2e65

Dispatched S172, 2026-06-07. `isolation: worktree`, `general-purpose`, opus, background.
Change-id: `print-rewrite-doc-honesty-2026-06-07`. Ratified S171 (no `print` builtin; rewrite the
fictional `print()` doc sites to real compiling reads — a `const` binding or `${}` interpolation).
Touches ONLY `compiler/SPEC.md`, `docs/articles/llm-kickstarter-v2-2026-05-04.md`,
`docs/PA-SCRML-PRIMER.md`. Verbatim prompt below.

---

(See dispatch transcript — full prompt: enumerate every scrml `print(` site in the 3 files EXCLUDING
the Zig `std.debug.print` in a `_{}` foreign block ~SPEC:15236 + any non-scrml; rewrite each to a real
compiling read preserving pedagogical intent + inline comment — logic-context → `const shown = <read>`
[still fires E-TYPE-001/lifecycle on pre-transition access], markup-context → `${...}`; the §14.12 /
PRIMER §6.5 lifecycle-demonstration sites are sensitive — keep the read that triggers the error.
NO scope creep: no print/log builtin, no §34, no normative-prose changes beyond example lines. Full
F4/S88/S99/S126 startup + path discipline + S83 commit discipline. Report before→after print( counts,
the rewrites, maps-consulted line.)
