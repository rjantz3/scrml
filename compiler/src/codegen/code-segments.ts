// code-segments.ts
// ---------------------------------------------------------------------------
// Shared regex-literal / comment / string-aware code-segment splitter.
//
// GITI-017 (S124 → S125): scrml keyword-lowering passes (`not `→`!`,
// `not`→`null`, `is not`→null-check, etc.) operate as text substitutions over
// emitted/parsed source. Without a fence, those substitutions corrupt the
// INTERIOR of regex literals, comments, and string literals — a silent
// data-corruption class: the JS stays syntactically valid and runs, but the
// regex body / comment text is wrong (e.g. `/not a jj repo/i` → `/!a jj repo/i`).
//
// S124 (f181d60a) fenced the codegen pass (rewriteNotKeyword in rewrite.ts).
// S125 (this module) extracts that fence into a leaf module with NO project
// imports so BOTH rewrite.ts AND expression-parser.ts (preprocessForAcorn,
// which has its OWN unfenced `not`-lowering — the residual half of the bug)
// can share ONE implementation rather than maintaining parallel mechanisms.
// Leaf placement avoids the rewrite.ts ↔ expression-parser.ts import cycle.

// Keywords that may precede a regex literal in expression position. Per
// ECMA-262, `/` after one of these ends an "expression-prefix" context, so the
// `/` opens a regex (not division). The set is intentionally minimal — false
// negatives (treating a regex as division) only fail to MASK and risk
// re-introducing the corruption; false positives (treating a division as
// regex) would mask code we should rewrite. Erring minimal preserves
// correctness on division-heavy code.
const REGEX_PERMISSIVE_KEYWORDS = new Set([
  "return", "typeof", "void", "delete", "new", "in", "of",
  "instanceof", "throw", "yield", "await",
]);

// Returns true if a `/` appearing immediately after `codeBefore` should be
// interpreted as the opener of a regex literal (rather than as division).
// `codeBefore` is the slice of source-text ending just before the `/`.
export function regexAllowedAfter(codeBefore: string): boolean {
  // Strip trailing whitespace to find the last meaningful character.
  let i = codeBefore.length - 1;
  while (i >= 0 && /\s/.test(codeBefore[i])) i--;
  // No prior code → expression start → regex.
  if (i < 0) return true;
  const lastCh = codeBefore[i];
  // After punctuation / operator → regex.
  // `}` is intentionally included: in JS it ends a block-statement (regex
  // follows) far more commonly than an object-literal in expression
  // position (where division would follow). Errs toward masking.
  if ("(,;:?[{=<>+-*%&|^!~}".includes(lastCh)) return true;
  // After identifier end → check for regex-permissive keyword.
  if (/[A-Za-z_$]/.test(lastCh)) {
    let j = i;
    while (j >= 0 && /[A-Za-z0-9_$]/.test(codeBefore[j])) j--;
    const token = codeBefore.slice(j + 1, i + 1);
    return REGEX_PERMISSIVE_KEYWORDS.has(token);
  }
  // After `)`, `]`, digit, `.` → division.
  return false;
}

/**
 * Split `expr` into code regions and opaque non-code regions (string / regex
 * literal / line-comment / block-comment). `transform` is applied ONLY to code
 * regions; non-code regions are emitted verbatim. Regex-vs-division is
 * disambiguated by regexAllowedAfter.
 *
 * This is the single shared fence used by every scrml keyword-lowering text
 * pass (see module header). Callers pass the substitution they want applied
 * only outside literals/comments.
 */
export function rewriteCodeSegments(
  expr: string,
  transform: (codeSegment: string) => string,
): string {
  if (!expr || typeof expr !== "string") return expr;

  const result: string[] = [];
  type Mode = "code" | "string" | "regex" | "line-comment" | "block-comment";
  let mode: Mode = "code";
  let stringDelim = "";
  let i = 0;
  let segStart = 0;

  while (i < expr.length) {
    const ch = expr[i];

    if (mode === "code") {
      // Block comment opener
      if (ch === "/" && expr[i + 1] === "*") {
        result.push(transform(expr.slice(segStart, i)));
        mode = "block-comment";
        segStart = i;
        i += 2;
        continue;
      }
      // Line comment opener
      if (ch === "/" && expr[i + 1] === "/") {
        result.push(transform(expr.slice(segStart, i)));
        mode = "line-comment";
        segStart = i;
        i += 2;
        continue;
      }
      // Regex literal opener — only when the preceding token-context admits it
      if (ch === "/" && regexAllowedAfter(expr.slice(segStart, i))) {
        result.push(transform(expr.slice(segStart, i)));
        mode = "regex";
        segStart = i;
        i++;
        continue;
      }
      // String literal opener
      if (ch === '"' || ch === "'" || ch === "`") {
        result.push(transform(expr.slice(segStart, i)));
        mode = "string";
        stringDelim = ch;
        segStart = i;
        i++;
        continue;
      }
      i++;
      continue;
    }

    if (mode === "string") {
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === stringDelim) {
        i++;
        result.push(expr.slice(segStart, i)); // preserve string literal as-is
        segStart = i;
        mode = "code";
        continue;
      }
      i++;
      continue;
    }

    if (mode === "regex") {
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === "[") {
        // Enter char-class — consume until unescaped `]`. `/` is literal inside.
        i++;
        while (i < expr.length) {
          if (expr[i] === "\\") { i += 2; continue; }
          if (expr[i] === "]") { i++; break; }
          i++;
        }
        continue;
      }
      if (ch === "/") {
        // Closing slash — consume IdentifierPart-shaped flags
        i++;
        while (i < expr.length && /[A-Za-z0-9_$]/.test(expr[i])) i++;
        result.push(expr.slice(segStart, i)); // preserve regex literal as-is
        segStart = i;
        mode = "code";
        continue;
      }
      if (ch === "\n") {
        // Unterminated regex — JS doesn't allow LF in regex bodies. Bail
        // back to code mode; what we accumulated may not parse downstream
        // but the masking layer doesn't try to be smarter than Acorn.
        mode = "code";
        continue;
      }
      i++;
      continue;
    }

    if (mode === "line-comment") {
      if (ch === "\n") {
        result.push(expr.slice(segStart, i)); // preserve comment text, newline stays in segStart slice
        segStart = i;
        mode = "code";
        continue;
      }
      i++;
      continue;
    }

    if (mode === "block-comment") {
      if (ch === "*" && expr[i + 1] === "/") {
        i += 2;
        result.push(expr.slice(segStart, i)); // preserve comment text
        segStart = i;
        mode = "code";
        continue;
      }
      i++;
      continue;
    }
  }

  // Final segment
  if (mode === "code") {
    result.push(transform(expr.slice(segStart)));
  } else {
    // Unterminated string/regex/comment — preserve as-is. Downstream
    // parsing will surface the syntax error.
    result.push(expr.slice(segStart));
  }

  return result.join("");
}
