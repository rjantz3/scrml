/**
 * W-INTERP-IN-RAW-CONTENT — info-level lint that surfaces scrml-significant
 * tokens that appear LITERALLY (and silently) inside the body of a raw-content
 * element (`<pre>` / `<code>`, SPEC §4.17).
 *
 * **Why this lint exists.** §4.17 makes `<pre>` / `<code>` bodies a single raw
 * text run: `${...}` interpolation, `<TagName>` component/element openers, and
 * the brace sigils `?{` `#{` `!{` `^{` `_{` are NOT recognized — they pass
 * through as literal text. That rule is CORRECT (it is what lets authors show
 * code samples verbatim). The DEFECT this lint closes is the SILENCE: an author
 * who writes `<pre>${board}</pre>` expecting interpolation ships the literal
 * string `${board}` to the page with zero diagnostic (Flux dog-food, S193). The
 * lint restores a signal and steers the author to a non-raw wrapper.
 *
 * **Spec:** SPEC §4.17 (raw-content elements). The §4.17 "opt-back-in deferred"
 * note + the "compose markup AROUND the `<pre>`" example are the canonical
 * steer: to interpolate, wrap with a non-raw element. `<div class='whitespace-pre'>`
 * preserves the visual whitespace of a `<pre>` while keeping `${...}` live.
 *
 * **Pipeline placement:** runs as a post-BS pass invoked from api.js over the
 * block-split AST (`bsResults`). The raw body is already captured by the
 * block-splitter as a single `{ type: "text", raw }` child of the
 * `{ type: "markup", name }` raw-content node (lowercase-first HTML name), so the walk
 * scans that captured string directly. Diagnostics flow through `collectErrors`
 * into `allErrors`, where the `W-` prefix + `severity:"info"` partition them into
 * `result.warnings` (non-fatal; CLI exit stays 0) — never `result.errors`.
 *
 * **Detection (conservative — false positives are worse than misses).** A
 * raw-content body is flagged when its captured text contains ANY of:
 *   1. `${ ... }` interpolation — the UNAMBIGUOUS case, led with.
 *   2. `<` immediately followed by an uppercase ASCII letter (`<[A-Z]`) — a
 *      scrml component-ref opener shape. A bare `<` followed by lowercase
 *      (real HTML, e.g. `2 < 3` or `<button>`) is NOT a scrml token and is NOT
 *      flagged.
 *   3. One of the brace sigils §4.17 lists as inert: `?{` `#{` `!{` `^{` `_{`.
 *
 * @module lint-w-interp-in-raw-content
 */

/**
 * Raw-content element names (matched case-insensitively), mirroring
 * `RAW_CONTENT_ELEMENTS` in block-splitter.js. Kept local so the lint module
 * has no import-time coupling to the splitter internals.
 */
const RAW_CONTENT_NAMES = new Set(["pre", "code"]);

/**
 * Brace-sigil openers that §4.17 lists as inert inside a raw-content body.
 * Each is a two-character literal: a sigil char followed by `{`.
 */
const INERT_SIGILS = ["?{", "#{", "!{", "^{", "_{"];

/**
 * Detect the FIRST scrml-significant token shape in a raw-content body string.
 * Returns a short human label for the token that fired (used in the message),
 * or null when the body contains no token shape.
 *
 * Conservative by construction: a bare `<` followed by a non-uppercase char is
 * NOT a token; `$` not followed by `{` is NOT a token; a sigil char not
 * followed by `{` is NOT a token.
 *
 * @param {string} text — the captured raw-content body
 * @returns {string | null}
 */
function detectToken(text) {
  if (typeof text !== "string" || text.length === 0) return null;

  // 1. `${...}` interpolation — UNAMBIGUOUS, led with. Require the `{` after `$`
  //    and at least one `}` somewhere after it so a lone `${` (e.g. a price
  //    "$5{" typo) is not over-claimed as an interpolation.
  const interpIdx = text.indexOf("${");
  if (interpIdx !== -1 && text.indexOf("}", interpIdx + 2) !== -1) {
    return "`${...}` interpolation";
  }

  // 2. `<[A-Z]` — a component-ref opener shape. Real HTML (`<` then lowercase or
  //    `/` or whitespace) is deliberately NOT flagged.
  if (/<[A-Z]/.test(text)) {
    return "a `<TagName>` component-reference opener";
  }

  // 3. Brace sigils §4.17 lists as inert.
  for (const sigil of INERT_SIGILS) {
    if (text.includes(sigil)) {
      return `a \`${sigil}\` brace-context opener`;
    }
  }

  return null;
}

/**
 * Build the W-INTERP-IN-RAW-CONTENT diagnostic message. Names the raw-content
 * element + the token shape that fired, states the §4.17 raw-pass-through
 * behavior, and steers to a non-raw wrapper / explicit escaping.
 *
 * @param {string} elementName — `pre` or `code` (lower-cased)
 * @param {string} tokenLabel — short label from detectToken
 * @returns {string}
 */
function buildMessage(elementName, tokenLabel) {
  return (
    `W-INTERP-IN-RAW-CONTENT: ${tokenLabel} appears inside a raw-content ` +
    `<${elementName}> body. Per SPEC §4.17, \`<pre>\` / \`<code>\` bodies are a ` +
    `single raw text run — this token is NOT interpolated/parsed and ships to ` +
    `the page LITERALLY. To interpolate, wrap the content in a non-raw element ` +
    `(e.g. \`<div class='whitespace-pre'>\${...}</div>\`, which preserves the ` +
    `pre-formatted whitespace while keeping \`\${...}\` live). To show the token ` +
    `verbatim as intended, escape its leading character (HTML entity for \`<\`, ` +
    `or a literal note that the raw body passes \`\${...}\` through unchanged). ` +
    `Informational only — the raw body continues to compile.`
  );
}

/**
 * Walk a block-split AST node tree and visit every raw-content markup node
 * (`<pre>` / `<code>`, non-component) together with its captured raw-body text.
 *
 * Block-split nodes nest via `children`. A raw-content node has
 * `type === "markup"` and a name in RAW_CONTENT_NAMES (case-insensitive); its
 * single body text run is the first `{ type: "text" }` child (exactly one per
 * §4.17).
 *
 * Component-ref exclusion is a PRE-NR SYNTACTIC check on the name's first
 * character: scrml component refs are PascalCase (uppercase-first), so `<Pre>`
 * / `<Code>` have an uppercase first char and are NOT raw-content elements
 * (the block-splitter routes them to the markup/component path, never the
 * §4.17 raw-content branch). Raw-content HTML element names are lowercase-first.
 * This lint runs at Stage 2.5 (after BS, before NR), so the first-char casing
 * — the same signal BS's `isComp` stamp derives from — is the correct syntactic
 * predicate here (no NR-resolved kind exists yet); it also keeps the guard
 * robust on hand-built synthetic ASTs.
 *
 * @param {object[]} blocks — root blocks from a BS result
 * @param {(node: object, text: string) => void} visit
 */
function isPascalCaseName(name) {
  const c = name.charCodeAt(0);
  return c >= 65 && c <= 90; // first char is an uppercase ASCII letter
}

function walkRawContent(blocks, visit) {
  const seen = new WeakSet();
  function walk(node) {
    if (!node || typeof node !== "object") return;
    if (seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      for (const n of node) walk(n);
      return;
    }
    if (
      node.type === "markup" &&
      typeof node.name === "string" &&
      !isPascalCaseName(node.name) &&
      RAW_CONTENT_NAMES.has(node.name.toLowerCase())
    ) {
      const children = Array.isArray(node.children) ? node.children : [];
      const textChild = children.find(
        (c) => c && c.type === "text" && typeof c.raw === "string"
      );
      if (textChild) {
        visit(node, textChild.raw);
      }
      // A raw-content body cannot itself contain recognized scrml children
      // (§4.17), so there is nothing deeper to descend into here. Fall through
      // anyway for defensiveness (children are only the text run).
    }
    if (Array.isArray(node.children)) walk(node.children);
  }
  walk(blocks);
}

/**
 * Collect W-INTERP-IN-RAW-CONTENT diagnostics over the block-split AST.
 *
 * @param {Array<{ filePath?: string, blocks?: object[] }>} bsResults — array of
 *   block-splitter results (`{ filePath, blocks, errors }`)
 * @returns {Array<{ filePath: string, line: number, column: number, code: string, severity: string, message: string, span: object }>}
 */
export function runWInterpInRawContent(bsResults) {
  const diagnostics = [];
  if (!bsResults || !Array.isArray(bsResults)) return diagnostics;

  for (const result of bsResults) {
    if (!result || !Array.isArray(result.blocks)) continue;
    const filePath = result.filePath || "";
    walkRawContent(result.blocks, (node, text) => {
      const tokenLabel = detectToken(text);
      if (!tokenLabel) return;
      const elementName =
        typeof node.name === "string" ? node.name.toLowerCase() : "pre";
      const span = node.span || {};
      diagnostics.push({
        filePath,
        line: span.line ?? 0,
        column: span.col ?? 0,
        code: "W-INTERP-IN-RAW-CONTENT",
        severity: "info",
        message: buildMessage(elementName, tokenLabel),
        span,
      });
    });
  }

  return diagnostics;
}
