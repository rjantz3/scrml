/**
 * wire-format.ts — §57 Wire Format Codegen Utilities
 *
 * SPEC anchor: SPEC.md §57 "Wire Format" (added S90, M-7C-D-12 Track 4).
 * Track 2 (this file): the encoder + dual-decoder codegen.
 *
 * ---------------------------------------------------------------------------
 * What this module does
 * ---------------------------------------------------------------------------
 *
 * The compiled wire format encodes scrml absence (`not`) as the canonical
 * envelope `{"__scrml_absent": true}` (OQ-2 (b), ratified S90) — NOT as raw
 * JSON `null`. This disambiguates intentional scrml-absence from a JS-host
 * `null` that might arrive via `^{}` / `_{}` / `?{}` interop, and gives
 * scrml-aware decoders a stable shape to round-trip through.
 *
 * The wire format applies to server-function response payloads whose declared
 * (or inferred) return type is `T | not` — i.e. absence is a legitimate
 * variant of the return. For pure-`T` returns (no absence in the type), the
 * existing raw emission stays — those returns hitting JS `null` at runtime
 * are bugs, NOT scrml-absence, and should not be silently encoded as such.
 *
 * Dual-decoder (OQ-4 (b), ratified S90): the client-side decoder for
 * `T | not` fields SHALL accept BOTH the canonical envelope AND raw JSON
 * `null` (legacy / pre-v0.3 / foreign-client encoding). The encoder always
 * emits the canonical envelope. Clean break at v1.0 (OQ-4 (a)) — at that
 * point the dual-decoder retires and raw `null` becomes malformed.
 *
 * ---------------------------------------------------------------------------
 * Exports
 * ---------------------------------------------------------------------------
 *
 *   - returnTypeAllowsAbsence(annot) — predicate on a raw return-type
 *     annotation string. Returns true iff the type is `T | not`, `not | T`,
 *     `T?`, or the bare `not` type. False otherwise (including the empty /
 *     missing annotation case, where we conservatively assume pure-T).
 *
 *   - SERVER_WIRE_ENCODER_HELPER — JS source string for the encoder helper
 *     that lives inlined at the top of generated `.server.js`. The helper
 *     `_scrml_wire_encode(value)` returns the canonical envelope on
 *     scrml-absence (JS `null` per §42.5 / §42.8) and the value unchanged
 *     otherwise.
 *
 *   - CLIENT_WIRE_DECODER_HELPER — JS source string for the dual-decoder
 *     helper. Accepts the canonical envelope AND raw JSON `null` and
 *     normalises both to scrml `not` (JS `null` per §42.5 / §42.8). This
 *     helper lives in the always-emitted `core` chunk of the client runtime
 *     so any fetch-stub that compiles can reference it without per-file
 *     tree-shake gating.
 *
 * ---------------------------------------------------------------------------
 * Cross-references
 * ---------------------------------------------------------------------------
 *
 *   - SPEC §57.2 (envelope shape) + §57.3 (encoder rules) + §57.4 (dual-decoder)
 *   - SPEC §12.5.1 (server-function return wire format)
 *   - SPEC §42.5 + §42.8 (runtime representation: JS `null`)
 *   - SCOPING `docs/changes/m-7c-d-12-runtime-sentinel-scoping/SCOPING.md`
 *     §4 Track 2 (D-12.2a..d) — Track 2 sub-phase decomposition.
 *
 * ---------------------------------------------------------------------------
 * Lint coordination (W-CG-UNDEFINED-INTERPOLATION, T3, S90)
 * ---------------------------------------------------------------------------
 *
 * The encoder + decoder helpers below contain `null` literals (canonical per
 * §42.5 / §42.8) but no `undefined` JS-keyword interpolations. The T3 lint
 * `W-CG-UNDEFINED-INTERPOLATION` does not fire on either helper.
 */

// ---------------------------------------------------------------------------
// returnTypeAllowsAbsence — predicate on a raw scrml return-type annotation.
//
// Returns true iff the annotation expresses a type where scrml-absence is a
// legitimate variant of the return. False for pure-T types or when the
// annotation is missing / empty (in which case we cannot prove absence is
// allowed, so we conservatively skip the envelope wrap).
//
// Forms recognised (per SPEC §14 type-annotation grammar):
//   - `T | not`            — explicit union with absence
//   - `not | T`            — same union, alternate order
//   - `T?`                 — postfix sugar (SPEC §14.3: desugars to `T | not`)
//   - `not`                — bare absence-only type (pathological but valid)
//
// Forms that return false:
//   - `T`                  — pure-T, no absence
//   - empty string         — no annotation declared; assume pure-T
//   - `T | U`              — non-absence union
//   - whitespace / junk    — defensive parse, return false
//
// Implementation notes:
//   - The annotation string arrives from ast-builder.js with tokens
//     joined by a single space (e.g. `"string | not"` or `"T ?"` after
//     `_retToks.join(" ").trim()`). We tokenise on `|` and trim each
//     variant.
//   - The `T?` postfix sugar may arrive as a single token like `"T?"` (if
//     tokeniser kept them adjacent) OR as `"T ?"` (if separated). We
//     handle both by stripping trailing `?` from variant tokens after the
//     union-split.
//   - Nested generic types like `Array<T> | not` are handled because we
//     split on TOP-LEVEL `|` only — `<` / `>` inside angle brackets are
//     ignored. Same for parens (refinement predicates like
//     `number(>0) | not`).
// ---------------------------------------------------------------------------

export function returnTypeAllowsAbsence(annot: string | undefined | null): boolean {
  if (!annot || typeof annot !== "string") return false;
  const trimmed = annot.trim();
  if (trimmed === "") return false;

  // Bare `not` — absence-only type.
  if (trimmed === "not") return true;

  // Postfix `?` sugar — `T?` desugars to `T | not`. Check before union split
  // since `T?` is a single variant.
  if (/[A-Za-z0-9_>\]) ]\s*\?\s*$/.test(trimmed)) return true;

  // Split on top-level `|` (NOT inside `<>` or `()` or `[]`).
  const variants = splitTopLevelPipe(trimmed);
  if (variants.length < 2) return false;

  // Any variant exactly equal to `not` (after trim) — absence variant present.
  for (const v of variants) {
    const stripped = v.trim().replace(/\?+$/, "").trim();
    if (stripped === "not") return true;
  }
  return false;
}

/**
 * Split a type annotation on TOP-LEVEL `|` characters. `|` inside angle
 * brackets (generic type params), parentheses (refinement predicates), or
 * square brackets (rare) is ignored.
 *
 * Returns the list of variant strings (NOT trimmed — callers trim as needed).
 */
function splitTopLevelPipe(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "<" || ch === "(" || ch === "[") {
      depth++;
    } else if (ch === ">" || ch === ")" || ch === "]") {
      depth--;
    } else if (ch === "|" && depth === 0) {
      // Skip `||` (logical or, shouldn't appear in a type annotation but be
      // defensive). The next char being `|` means this is a `||` token, not
      // a union pipe.
      if (i + 1 < s.length && s[i + 1] === "|") {
        i++;
        continue;
      }
      out.push(s.slice(start, i));
      start = i + 1;
    }
  }
  out.push(s.slice(start));
  return out;
}

// ---------------------------------------------------------------------------
// SERVER_WIRE_ENCODER_HELPER — inlined into generated `.server.js`
//
// Lives in compiler/src/codegen/emit-server.ts as an inline helper similar to
// the §45 structural-equality helper. Server-side has no chunked runtime, so
// inline emission is the pattern.
//
// Behavior (per §57.3):
//   - On scrml-absence (JS `null` per §42.5 / §42.8), return the canonical
//     envelope `{ __scrml_absent: true }`.
//   - On any other value (including `false`, `0`, `""`, `[]`, `{}` — all
//     DEFINED values per §42.1.1, not absence), return the value unchanged.
//
// Note on `undefined`: scrml programs never produce raw `undefined` (E-SYNTAX-042
// + W-ABSENCE-IN-SCRML-SOURCE forbid `undefined` in scrml source; SPEC §42.5
// emits `null` for `not`). But foreign-code interop (`^{}` / `_{}` / `?{}`)
// MAY introduce `undefined`. Per §42.9 the interop boundary normalises both
// `null` and `undefined` to scrml `not`. The encoder mirrors this: both
// `null` and `undefined` map to the envelope, so a stray foreign `undefined`
// returning from a `T | not` server fn is encoded canonically.
// ---------------------------------------------------------------------------

export const SERVER_WIRE_ENCODER_HELPER = [
  "",
  "// --- §57 Wire Format encoder helper (M-7C-D-12 Track 2) ---",
  "// Compiled by the scrml compiler for server-fns whose return type is `T | not`.",
  "// On scrml-absence (JS null / undefined per §42.5 + §42.9), returns the",
  "// canonical envelope { __scrml_absent: true }. Otherwise returns the value",
  "// unchanged. The client-side decoder accepts both the envelope AND raw null",
  "// (legacy / pre-v0.3, §57.4 dual-decoder).",
  "function _scrml_wire_encode(value) {",
  "  if (value == null) return { __scrml_absent: true };",
  "  return value;",
  "}",
  "",
].join("\n");

// ---------------------------------------------------------------------------
// CLIENT_WIRE_DECODER_HELPER — emitted to the client runtime template
//
// Lives in compiler/src/runtime-template.js (this string is referenced from
// the runtime template directly). Dual-decoder per §57.4 — accepts BOTH the
// canonical envelope AND raw JSON `null`, normalises both to scrml `not`
// (JS `null` per §42.5 / §42.8).
//
// The helper is small and always-inlined (no tree-shaking gate) because every
// `T | not` server-fn fetch-stub call site needs it.
//
// Forward-compat: at v1.0 / self-host (OQ-4 (a)), the dual-decoder retires.
// Today's behavior — accept both — is the scaffold-lifetime affordance.
// Any envelope shape OTHER than `{ __scrml_absent: true }` or raw `null` is
// passed through unchanged (the surrounding deserializer / type-check
// handles it per §57.4 "malformed payload" clause).
// ---------------------------------------------------------------------------

export const CLIENT_WIRE_DECODER_HELPER = [
  "// --- §57 Wire Format dual-decoder (M-7C-D-12 Track 2) ---",
  "// Accepts BOTH the canonical envelope { __scrml_absent: true } (encoder",
  "// always emits this) AND raw JSON null (legacy / pre-v0.3 / foreign-client).",
  "// Both lower to scrml `not` (JS null per §42.5 / §42.8). Any other value",
  "// passes through unchanged. Dual-decoder retires at v1.0 (OQ-4 (a)).",
  "function _scrml_wire_decode(value) {",
  "  if (value === null) return null;",
  "  if (value !== null && typeof value === \"object\" && value.__scrml_absent === true) return null;",
  "  return value;",
  "}",
].join("\n");
