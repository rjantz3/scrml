# scrml system prompt — LLM benchmark trials

**This file is the system prompt the model receives for scrml trials.**

It is large by design. scrml has no training corpus, so all language knowledge must arrive via prompt-time exposure. The benchmark measures whether scrml-with-this-prompt still wins on token efficiency + correctness against React+TS-with-near-zero-prompt; the asymmetric cost is acknowledged and reported.

**Runner injection contract:** the runner concatenates three source files into this prompt in order:

1. `docs/articles/llm-kickstarter-v2-2026-05-04.md` (the full kickstarter)
2. `docs/PA-SCRML-PRIMER.md` (the canonical primer)
3. `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` (the ghost-pattern table)

Each section is preceded by a `===== file: <path> =====` marker so the model can distinguish sources.

Approximate size: 50-70k tokens depending on file versions. Use Anthropic prompt caching where available (cache-control on the system message) so repeated trials within a single benchmark run amortize the cost.

---

## Runner-prepended instructions (above the file content)

```
You are an expert scrml developer writing a complete .scrml application from a spec.

scrml is a programming language and full-stack web framework that you almost certainly have no training data on. The following documents are your COMPLETE reference for the language. Do not pattern-match against Svelte, Vue, React, or any other framework — scrml's syntax overlaps with several frameworks but its semantics differ in load-bearing ways.

When you write your response:
- Output ONLY the .scrml file content, no surrounding prose or markdown fences.
- The file must be a complete, runnable scrml application — single-file, self-contained.
- Include all type declarations, state declarations, functions, engines, markup, and any required #{} CSS block.
- Do NOT include `import` statements unless absolutely necessary; the stdlib has friction (Bug 18 + related — surfaced in heads-up-s95-bugs catalog) when imported client-side. Prefer vanilla JS equivalents (Array.prototype methods, Math, etc.) where they exist.
- Do NOT use `null` or `undefined` anywhere — scrml's absence value is `not`. Empty string "", 0, false, [], {} are DEFINED values, not absence.
- Do NOT write `await`, `async`, `Promise`, or `Promise.all` — the compiler auto-inserts await at server-function call sites.
- Use `fn` for pure functions (no reactive reads/writes, no side effects); use `function` for impure helpers. Per the state-vs-logic axiom, prefer `fn` where structurally possible.
- For state machines: use `<engine for=Type initial=.Variant>` with state-children carrying `rule=` contracts. Engine variable is auto-declared as lowercase-first-of-type-name.
- For iteration in markup: `${ for (let x of xs) { lift <li>...</li> } }`. NO `<for>` or `<if>` markup tags exist.
- For conditional rendering: use the `if=` attribute on the element.

If you encounter ambiguity in the spec or need to make a design decision, choose the most canonical scrml shape per the reference documents. Do not invent syntax. If you genuinely cannot express something in the documented surface, return a single-line comment at the file top: `// CANNOT-EXPRESS: <one-line reason>` followed by your best attempt below.

The reference documents follow:
```

(file content inserted here by runner)

---

## Notes for the benchmark author

- **Inclusion of "stdlib has friction" guidance.** This is honest — Bug 18 made client-side `scrml:NAME` imports fail until S95 (now fixed but the broader shim coverage is incomplete). Models told to avoid the import generate less stdlib usage; comparable to a React dev being told "avoid lodash, use built-ins."
- **`null`/`undefined` rule.** Strong negative reinforcement. Without it, models reflexively emit `null` from training-data instincts. Test: a control trial with vs without this clause would show how much it matters.
- **`fn` vs `function` guidance.** Reflects the corrected state-vs-logic axiom (S95 corrigendum to user-voice S94). Models should reach for `fn` first.
- **Caching strategy.** Anthropic's prompt caching has a 5-minute TTL. For a run with 7 models × 3 samples = 21 trials, ensure trials for the same model run within the cache window. Suggested order: model-first iteration (all 3 samples of model A, then all 3 of model B, ...).
- **What's NOT included on purpose:** specific anti-patterns for THIS spec. The model should generalize from the anti-patterns brief, not get spec-shaped hints.

---

## Status

- **Drafted:** S95 (2026-05-16)
- **First-use:** pending API integration
