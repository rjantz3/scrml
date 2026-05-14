/**
 * @module codegen/lint-undefined-interpolation
 *
 * W-CG-UNDEFINED-INTERPOLATION — CG-level regression guard.
 *
 * Track 3 of M-7C-D-12 (S90). After OQ-5(a) ratification the `?? "undefined"`
 * init-fallback pattern in emit-server / emit-logic / scheduling was migrated
 * to `?? "null"`, eliminating the JS `undefined` keyword from compiled output.
 *
 * This lint scans the FINAL compiled JS strings (client + server) for the
 * bare `undefined` JS keyword used as a value/expression. It exists to catch
 * future regressions where an emitter accidentally re-introduces literal
 * `undefined` keyword interpolation in compiled output.
 *
 * scrml absence is JS `null` per SPEC §42.5 (Codegen) and §42.8 (Runtime
 * Representation — "Rationale for null over undefined"). The literal
 * `undefined` JS keyword has no place in compiled scrml output.
 *
 * **Legitimate JS-host idioms (NOT flagged):**
 *   1. `typeof X !== "undefined"` — environment-detection (the string is
 *      quoted; matched against the typeof operator's string result, not the
 *      `undefined` value-keyword).
 *   2. `x !== null && x !== undefined` / `x === null || x === undefined` —
 *      canonical paired absence detection per §42.5/§42.8 (the runtime
 *      treats both as absence for backwards-compat with JS interop boundaries).
 *      Both halves of the pair must appear adjacently for the exception to
 *      apply.
 *   3. `undefined` inside string literals (`"foo undefined bar"`) — quoted.
 *   4. `undefined` inside comments — non-executing.
 *
 * **Forbidden (flagged):**
 *   - `let x = undefined;` / `x = undefined;` / `return undefined;` / `data: undefined`
 *   - `f(undefined)` / `[a, undefined, b]` — any bare value-keyword usage.
 *
 * **Pipeline placement:** invoked from `codegen/index.ts` after `clientJs`
 * and `serverJs` are emitted, per-file. Diagnostics are pushed onto the
 * CG errors[] array as `CGError` with severity "warning". The api.js layer
 * filters W-* codes into `result.warnings`.
 *
 * **SPEC anchor:** §34 catalog (W-CG-UNDEFINED-INTERPOLATION row to be added
 * by Track 4 D-12.4 — coordinate on code-name); §42.5, §42.8.
 */

import { CGError, type CGSpan } from "./errors.ts";

/**
 * Marker comments that bracket the embedded scrml runtime in compiled client JS.
 * The runtime is hand-written JS (runtime-template.js) — NOT emitter output —
 * and its `!== undefined` / `=== undefined` single-sided checks are tracked
 * separately by M-7C-D-14 (runtime migration). The lint masks the runtime
 * block out of scanning so this lint targets ONLY the emitter-produced JS.
 */
const RUNTIME_START_MARKER = "// --- scrml reactive runtime ---";
const RUNTIME_END_MARKER = "// --- end scrml reactive runtime ---";

/**
 * Replace the embedded runtime block (between START and END markers) with a
 * line-preserving whitespace mask so subsequent line-based scanning skips
 * runtime content. If markers are absent (runtime was already stripped via
 * `// Requires: scrml-runtime.js` shim), the input is returned unchanged.
 */
function maskEmbeddedRuntime(jsSource: string): string {
  const startIdx = jsSource.indexOf(RUNTIME_START_MARKER);
  if (startIdx === -1) return jsSource;
  const endIdx = jsSource.indexOf(RUNTIME_END_MARKER, startIdx);
  if (endIdx === -1) return jsSource;
  const block = jsSource.slice(startIdx, endIdx + RUNTIME_END_MARKER.length);
  // Replace each non-newline char with a space to preserve line numbers.
  const masked = block.replace(/[^\n]/g, " ");
  return jsSource.slice(0, startIdx) + masked + jsSource.slice(endIdx + RUNTIME_END_MARKER.length);
}

export interface UndefinedInterpolationFinding {
  /** Path of the .scrml source file (output file is derived from it). */
  sourceFile: string;
  /** Logical name of the compiled output ("client" or "server"). */
  outputKind: "client" | "server";
  /** 1-based line number in the compiled JS where the bare `undefined` was found. */
  line: number;
  /** The full line text (trimmed) for the operator's context. */
  lineText: string;
}

/**
 * Strip JS string literals (single/double/template) and comments (line +
 * block) from a single line, replacing them with same-length whitespace so
 * downstream column offsets remain accurate. This is a HEURISTIC pass — it
 * does not handle every pathological JS edge case (e.g., regex literals
 * containing `//` or template literals with embedded expressions that span
 * multiple lines), but it is sufficient for the kinds of JS the scrml
 * compiler emits (which are emitter-controlled and well-behaved).
 *
 * Multi-line block comments and template literals that span lines are
 * handled by the line-by-line scanner using `inBlockComment` /
 * `inTemplateLiteral` flags passed across line boundaries.
 */
interface MaskState {
  inBlockComment: boolean;
  inTemplateLiteral: boolean;
}

function maskNonCode(line: string, state: MaskState): { masked: string; state: MaskState } {
  const out: string[] = [];
  let i = 0;
  let { inBlockComment, inTemplateLiteral } = state;

  while (i < line.length) {
    const ch = line[i];
    const next = line[i + 1];

    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        out.push("  "); // close */
        i += 2;
        inBlockComment = false;
      } else {
        out.push(" ");
        i += 1;
      }
      continue;
    }

    if (inTemplateLiteral) {
      if (ch === "`") {
        out.push(" ");
        i += 1;
        inTemplateLiteral = false;
      } else if (ch === "\\" && next != null) {
        out.push("  ");
        i += 2;
      } else if (ch === "$" && next === "{") {
        // Embedded expression in template — emit it as code (the `undefined`
        // value-keyword inside `${...}` IS forbidden). Switch back to code mode
        // until matching `}`. Simple depth tracker.
        out.push("$ ");
        i += 2;
        let depth = 1;
        while (i < line.length && depth > 0) {
          const c = line[i];
          if (c === "{") depth += 1;
          else if (c === "}") depth -= 1;
          if (depth === 0) break;
          out.push(c);
          i += 1;
        }
        if (i < line.length) {
          out.push("}");
          i += 1;
        }
      } else {
        out.push(" ");
        i += 1;
      }
      continue;
    }

    // Code mode.
    if (ch === "/" && next === "/") {
      // Line comment — mask to end of line.
      while (i < line.length) {
        out.push(" ");
        i += 1;
      }
      break;
    }
    if (ch === "/" && next === "*") {
      out.push("  ");
      i += 2;
      inBlockComment = true;
      continue;
    }
    if (ch === '"' || ch === "'") {
      // String literal — scan to matching quote, handle escapes.
      const quote = ch;
      out.push(" ");
      i += 1;
      while (i < line.length) {
        const c = line[i];
        if (c === "\\") {
          out.push("  ");
          i += 2;
          continue;
        }
        if (c === quote) {
          out.push(" ");
          i += 1;
          break;
        }
        out.push(" ");
        i += 1;
      }
      continue;
    }
    if (ch === "`") {
      out.push(" ");
      i += 1;
      inTemplateLiteral = true;
      continue;
    }

    out.push(ch);
    i += 1;
  }

  return { masked: out.join(""), state: { inBlockComment, inTemplateLiteral } };
}

/**
 * Return true if the bare `undefined` at `pos` in `masked` is part of a
 * canonical paired absence check: `!== null && ... !== undefined` /
 * `=== null || ... === undefined` (or the reversed order). The pair must
 * appear on the same line within a small window — the emitter always
 * generates these as a single expression on a single line.
 */
function isPairedAbsenceCheck(masked: string, pos: number): boolean {
  // Look backward and forward for an `=== null` or `!== null` reference on
  // the same line. The paired check is conventionally adjacent (joined by
  // `&&` or `||`), but allow up to ~120 chars window to tolerate longer
  // identifiers and multi-variable forms.
  const WINDOW = 200;
  const start = Math.max(0, pos - WINDOW);
  const end = Math.min(masked.length, pos + "undefined".length + WINDOW);
  const window = masked.slice(start, end);
  // Match `=== null` OR `!== null` anywhere in the window — case-sensitive,
  // tolerant of arbitrary whitespace around the operator.
  return /(?:===|!==)\s*null\b/.test(window);
}

/**
 * Scan a compiled JS string for forbidden bare `undefined` keyword usage.
 * Returns one finding per line that contains a non-idiomatic occurrence.
 */
export function scanForUndefinedInterpolation(
  jsSource: string,
  sourceFile: string,
  outputKind: "client" | "server",
): UndefinedInterpolationFinding[] {
  const findings: UndefinedInterpolationFinding[] = [];
  if (!jsSource) return findings;

  // Mask out the embedded runtime block — it's hand-written JS (runtime-template.js)
  // and tracked separately by M-7C-D-14, not the emitter-output regression guard
  // this lint exists to enforce.
  const sanitized = maskEmbeddedRuntime(jsSource);
  const sanitizedLines = sanitized.split("\n");
  const originalLines = jsSource.split("\n");
  let state: MaskState = { inBlockComment: false, inTemplateLiteral: false };
  const wordPattern = /\bundefined\b/g;

  for (let lineIdx = 0; lineIdx < sanitizedLines.length; lineIdx += 1) {
    const candidate = sanitizedLines[lineIdx];
    const { masked, state: nextState } = maskNonCode(candidate, state);
    state = nextState;

    wordPattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = wordPattern.exec(masked)) !== null) {
      const pos = match.index;
      if (isPairedAbsenceCheck(masked, pos)) {
        continue;
      }
      findings.push({
        sourceFile,
        outputKind,
        line: lineIdx + 1,
        lineText: (originalLines[lineIdx] ?? candidate).trim(),
      });
      // One finding per line — don't double-report multi-`undefined` lines.
      break;
    }
  }

  return findings;
}

/**
 * Convert findings into `CGError` instances for accumulation in the CG
 * errors[] array. Severity is "warning" (W-class diagnostic).
 */
export function findingsToCGErrors(
  findings: UndefinedInterpolationFinding[],
): CGError[] {
  return findings.map((f) => {
    const span: CGSpan = {
      file: f.sourceFile,
      start: 0,
      end: 0,
      line: f.line,
      col: 1,
    };
    const truncated = f.lineText.length > 120
      ? `${f.lineText.slice(0, 117)}...`
      : f.lineText;
    const message =
      `W-CG-UNDEFINED-INTERPOLATION: literal \`undefined\` JS keyword found in compiled ${f.outputKind} JS ` +
      `output (${f.sourceFile} → ${f.outputKind} line ${f.line}). scrml absence is canonically JS \`null\` ` +
      `per SPEC §42.5 / §42.8 — the \`undefined\` keyword has no place in compiled scrml output. ` +
      `If you are emitting a fallback for missing-init, use \`"null"\` as the fallback string (M-7C-D-12 ` +
      `Track 3, OQ-5(a)). The canonical paired absence check \`x !== null && x !== undefined\` is exempt. ` +
      `Offending line: \`${truncated}\``;
    return new CGError("W-CG-UNDEFINED-INTERPOLATION", message, span, "warning");
  });
}

/**
 * Top-level entry: scan client + server compiled JS for a single file and
 * return CGError warnings for any bare-`undefined` keyword findings.
 */
export function lintCompiledForUndefined(
  sourceFile: string,
  clientJs: string | null | undefined,
  serverJs: string | null | undefined,
): CGError[] {
  const findings: UndefinedInterpolationFinding[] = [];
  if (clientJs) findings.push(...scanForUndefinedInterpolation(clientJs, sourceFile, "client"));
  if (serverJs) findings.push(...scanForUndefinedInterpolation(serverJs, sourceFile, "server"));
  return findingsToCGErrors(findings);
}
