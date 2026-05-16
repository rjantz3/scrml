# React+TypeScript system prompt — LLM benchmark trials

**This file is the system prompt the model receives for React+TS trials.**

Intentionally minimal. React + TypeScript + Tailwind are training-set defaults; the model already knows them. Loading up the prompt with React documentation would obscure the asymmetric-prompt-size measurement axis.

---

## The full system prompt

```
You are an expert React + TypeScript developer writing a complete single-file application from a spec.

Stack:
- React 18 (functional components + hooks)
- TypeScript 5 (strict mode)
- Tailwind CSS for styling (utility classes inline)
- Vite as the build tool (you do not need to write vite config — assume standard)

When you write your response:
- Output ONLY a single TypeScript file containing the complete app (e.g., `App.tsx`), no surrounding prose or markdown fences.
- The file must be self-contained — no external imports beyond `react` and standard browser APIs.
- Use functional components only. No class components.
- For state: `useState` / `useReducer` / `useEffect` as appropriate. You may use `useRef` for DOM access if needed.
- For TypeScript: explicit types on all props, state, and function signatures. No `any`.
- For styling: Tailwind utility classes in className. No separate CSS file.

If you need to make a design decision, choose idiomatic modern React patterns (functional components, hooks-based state, immutable updates).
```

---

## Why this is intentionally short

- The baseline measurement is "what does the model produce when given just the spec + minimal framing." React + TS + Tailwind are training-set knowledge; the model doesn't need them re-explained.
- A longer React prompt would inflate input tokens artificially and obscure the genuine prompt-size asymmetry being measured.
- If a model produces working React code with this prompt, that's evidence the training-data baseline is sufficient. If it doesn't, that's evidence even mature stacks need prompt support — which would weaken (not strengthen) the scrml efficiency claim, since scrml's prompt is enormous.

---

## What's NOT included on purpose

- No state-management library specifications (Zustand, Redux, etc.). Model chooses.
- No form-library specifications (React Hook Form, Formik). Model chooses.
- No drag-and-drop library specifications (dnd-kit, react-dnd). Model chooses — the spec requires HTML5 DnD per its acceptance criteria, but the model can implement it via library or vanilla.
- No anti-pattern warnings. The model knows React idioms; the benchmark measures what it produces, not what it's told to avoid.

---

## Caveat

If models systematically produce bad React with this minimal prompt (e.g., class components, anti-pattern state, no types), the benchmark would not be measuring scrml-vs-React; it would be measuring scrml-vs-bad-React. In first-run analysis, manually review a sample of React outputs to confirm they're idiomatically-acceptable React for the prompt era. If not, iterate on this prompt with **comparable** additional structure to what scrml gets (e.g., a "modern React 18 patterns" cheat sheet of similar length to scrml's full kickstarter).

The goal is structurally-fair comparison, not handicapping either side.

---

## Status

- **Drafted:** S95 (2026-05-16)
- **First-use:** pending API integration
