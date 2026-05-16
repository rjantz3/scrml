# User prompt template — LLM benchmark trials

**This file is the user-prompt wrapper that the runner uses to inject a spec.**

The user prompt is identical-shape across both languages. Only the spec content varies. This ensures spec interpretation differences (not framing differences) drive any cross-language outcome.

---

## Template

```
Build the application described below. Output the complete file content per the system prompt's output instructions.

=== SPEC ===

{{SPEC_CONTENT}}

=== END SPEC ===

Output the file content now. No explanation, no markdown fences, no prose — just the file content.
```

---

## Injection rules

- `{{SPEC_CONTENT}}` is replaced with the body of the spec file (`specs/NN-name.md`) from the `## Functional requirements` heading through `## What the spec DOES NOT require` heading, **inclusive of both**, minus any `Reference implementation` or `Status` sections.
- Acceptance criteria are stripped from the spec content — those are the validator's contract, not the model's instructions. Models shouldn't see test assertions.
- No frontmatter or PA notes from the spec file are included.

---

## Retry prompt (when first attempt fails validation)

When a trial's first attempt fails validation, the runner appends a retry turn:

```
The previous attempt did not meet the spec. The validator output:

{{VALIDATOR_OUTPUT}}

Revise the file. Output the complete revised file content now. No explanation, no markdown fences.
```

`{{VALIDATOR_OUTPUT}}` is the full stderr + classified failure mode from the validator. The retry count is bounded by `retryBudget` in the runner config (default: 3).

Each retry adds to the conversation history; the model sees its own prior attempts. This matches the adopter experience — "the compiler said X, what do I change."

---

## What the user prompt does NOT contain

- Spec author hints
- "Use the canonical scrml shape" guidance (that's in the system prompt)
- Specific anti-patterns for THIS spec
- Code skeletons or partial templates
- "Reference implementation exists at X" notes

The spec is the spec. The model produces from it. Whatever the model misses is signal.

---

## Status

- **Drafted:** S95 (2026-05-16)
- **First-use:** pending API integration
