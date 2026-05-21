// parse-css-body.js — JS-host shadow of parse-css-body.scrml.
// See span.js header for the .scrml<->.js duplication rationale.
// PILLAR 5b classification mirrors parse-css-body.scrml's header.
//
// F7.c / v0.6 BRIDGE-FULL — the native-parser analogue of the live
// pipeline's CSS-block payload shaping (compiler/src/tokenizer.ts
// `tokenizeCSS` ~L1275 + compiler/src/ast-builder.js `parseCSSTokens`
// ~L9564 + `scanCSSValueForReactiveRefs` ~L9526 + the `buildBlock`
// `case "css"` arm ~L11457). A pure calculation over a native `Css`
// block's body text.
//
// THE LIVE CONTRACT (the behavioral spec — tokenizer.ts + ast-builder.js):
//   The live BS routes a `#{ ... }` block to `case "css"`. There
//   `tokenizeCSS` + `parseCSSTokens` produce a `CSSRule[]`. A rule is one
//   of three shapes:
//     - property rule  — { prop, value, span, reactiveRefs?, isExpression? }
//     - selector rule  — { selector, declarations:CSSDeclaration[], span }
//     - at-rule        — { atRule, span }   (verbatim passthrough — GITI-011)
//   A CSSDeclaration is { prop, value, span, reactiveRefs?, isExpression? }.
//   `scanCSSValueForReactiveRefs` scans a value for `@ident` references and
//   attaches `reactiveRefs` (+ `isExpression`) when any appear.
//
// THE NATIVE NODE-CATALOG ADAPTATION (Phase 0 — M5-divergence-ledger):
//   The native parser's `Css` block (parse-markup.js — entered by the
//   `#{` sigil, closed by the matching `}`) was SKETCH-DEPTH: it captured
//   the brace extent but not the declaration/rule structure. F7.c lights
//   it up:
//     - the markup layer captures `block.bodyText` (the verbatim body
//       slice — F7.b/F7.c extend the LogicEscape body-capture to Css/Sql);
//     - shapeCssBlock parses `bodyText` into `block.rules` — the live
//       `CSSInlineNode.rules` payload.
//   The stamped `rules` array IS the live FileAST shape — no native<->live
//   translation layer. Spans on the produced rules are body-LOCAL offsets
//   (relative to the body slice); a host-absolute shift is M5-swap scope
//   (the same posture parse-markup.js's `parseLogicBodyBestEffort` takes
//   for LogicEscape statement spans).
//
// The `@ident` reactive-ref scan delegates to the JS-layer-free
// `scanReactiveRefs` below (a `@`-prefixed identifier run — the same shape
// the live `scanCSSValueForReactiveRefs` regex `@([A-Za-z_$][\w$]*)`
// recognizes). The CSS value is NOT a full scrml expression at this layer;
// the live builder keeps the value as a STRING and only records which
// `@vars` it references. F7.c mirrors that — it does NOT delegate the CSS
// value to parse-expr.

// =============================================================================
// shapeCssBlock — calculation (mutates the passed Css block in place, the
// same way emitContextBlock stamps `.bodyText`). Given a native `Css` block
// with `block.bodyText` set, parse the body into `block.rules` — the live
// `CSSInlineNode.rules` payload.
// =============================================================================
export function shapeCssBlock(block) {
    if (block === undefined || block === null || block.kind !== "Css") {
        return block;
    }
    const bodyText = typeof block.bodyText === "string" ? block.bodyText : "";
    block.rules = parseCssRules(bodyText);
    return block;
}

// =============================================================================
// parseCssRules — calculation (pure). Parse a CSS body string into a
// CSSRule[]. A single-pass scan recognizing comments, at-rules, property
// declarations, and selector rules (with their declaration blocks).
//
// Mirrors the live `tokenizeCSS` + `parseCSSTokens` two-pass pipeline,
// fused into one scan — the native parser produces the rule structure
// directly (no intermediate CSS_* token stream).
// =============================================================================
export function parseCssRules(bodyText) {
    const rules = [];
    const src = typeof bodyText === "string" ? bodyText : "";
    const len = src.length;
    let p = 0;

    while (p < len) {
        p = skipCssWhitespace(src, p);
        if (p >= len) break;

        // A `/* ... */` comment — skipped (not a rule).
        if (src.charAt(p) === "/" && p + 1 < len && src.charAt(p + 1) === "*") {
            p = skipCssComment(src, p);
            continue;
        }

        // An `@`-rule — captured verbatim (prelude + brace body or `;`).
        if (src.charAt(p) === "@") {
            const at = scanAtRule(src, p);
            if (at.atRule.length > 0) {
                rules.push({ atRule: at.atRule, span: makeLocalSpan(p, at.end) });
            }
            p = at.end;
            continue;
        }

        // An identifier-leading run — either a property name or an
        // element-leading selector. Disambiguate after the ident.
        if (isCssIdentStart(src.charAt(p))) {
            const identStart = p;
            let q = p;
            while (q < len && isCssIdentChar(src.charAt(q))) {
                q = q + 1;
            }
            const ident = src.substring(identStart, q);
            const afterIdent = q;
            q = skipCssWhitespace(src, q);
            const hadWs = q > afterIdent;
            const nextCh = q < len ? src.charAt(q) : "";

            const isCompoundSelectorChar =
                nextCh === "." || nextCh === "#" || nextCh === "[" || nextCh === "," ||
                nextCh === ">" || nextCh === "+" || nextCh === "~" || nextCh === "*";
            const isPseudoThenBrace =
                nextCh === ":" && colonIntroducesSelector(src, q);
            const isDescendantCombinator =
                hadWs && isCssIdentStart(nextCh) && hasBraceBeforeSemiOrRbrace(src, q);

            if (nextCh === "{") {
                // A bare element selector — `body { ... }`.
                const sel = scanSelectorRule(src, identStart, ident, hadWs, q);
                rules.push(sel.rule);
                p = sel.end;
                continue;
            }
            if (isCompoundSelectorChar || isPseudoThenBrace || isDescendantCombinator) {
                // A compound selector beginning with an element name.
                const sel = scanCompoundSelectorRule(src, identStart, ident, hadWs, q);
                rules.push(sel.rule);
                p = sel.end;
                continue;
            }
            // Otherwise — a property declaration.
            const decl = scanPropertyRule(src, identStart, ident, q);
            rules.push(decl.rule);
            p = decl.end;
            continue;
        }

        // A selector-leading char (`.` / `#` / `*` / `[` / `>` / `+` / `~`
        // / `:`) — always a selector run. Capture the selector text up to
        // the terminating `{` (or `}` / EOF), then the declaration block.
        if (isSelectorLeadChar(src.charAt(p))) {
            const selEnd = scanSelectorPrelude(src, p);
            const selectorText = src.substring(p, selEnd).trim();
            const sel = finishSelectorRule(src, p, selectorText, selEnd);
            rules.push(sel.rule);
            p = sel.end;
            continue;
        }

        // An unrecognized char (a stray `;` / `}` / punctuation) — skip it.
        p = p + 1;
    }

    return rules;
}

// =============================================================================
// scanPropertyRule — calculation (pure). The cursor is past a property-name
// ident; `valueScan` is the offset after inter-token whitespace (at the `:`
// or wherever). Produce a property rule { prop, value, span, reactiveRefs?,
// isExpression? } and return the offset one past the rule (past the `;` if
// present). A property name with no `:` yields a value-less rule.
// =============================================================================
function scanPropertyRule(src, propStart, prop, afterIdent) {
    const len = src.length;
    let p = afterIdent;
    let value = "";

    if (p < len && src.charAt(p) === ":") {
        p = p + 1; // consume `:`
        p = skipCssWhitespace(src, p);
        const valStart = p;
        while (p < len && src.charAt(p) !== ";" && src.charAt(p) !== "}") {
            p = p + 1;
        }
        value = src.substring(valStart, p).trim();
        if (p < len && src.charAt(p) === ";") {
            p = p + 1; // consume `;`
        }
    }

    const rule = { prop, value, span: makeLocalSpan(propStart, p) };
    attachReactiveRefs(rule, value);
    return { rule, end: p };
}

// =============================================================================
// scanSelectorRule — calculation (pure). The cursor sits at a `{` opening a
// selector's declaration block (`selectorEnd` points at the `{`). Produce a
// selector rule { selector, declarations, span } and return the offset one
// past the closing `}`.
// =============================================================================
function scanSelectorRule(src, ruleStart, baseSelector, hadWs, selectorEnd) {
    const selector = (typeof baseSelector === "string" ? baseSelector : "").trim();
    return finishSelectorRule(src, ruleStart, selector, selectorEnd);
}

// =============================================================================
// scanCompoundSelectorRule — calculation (pure). The cursor is past a
// compound-selector run's leading element name; consume the rest of the
// selector text up to the `{` (or `}`), then the declaration block.
// =============================================================================
function scanCompoundSelectorRule(src, ruleStart, ident, hadWs, afterIdent) {
    const len = src.length;
    let p = afterIdent;
    // Preserve a single space when the source separated the ident from the
    // continuation (descendant combinator) — live `tokenizeCSS` parity.
    let sel = ident + (hadWs ? " " : "");
    while (p < len && src.charAt(p) !== "{" && src.charAt(p) !== "}") {
        sel = sel + src.charAt(p);
        p = p + 1;
    }
    return finishSelectorRule(src, ruleStart, sel.trim(), p);
}

// =============================================================================
// finishSelectorRule — calculation (pure). Shared selector-rule completion:
// `selectorEnd` is the offset at the `{` (or `}` / EOF for a brace-less
// selector). Consume the declaration block + return the rule + end offset.
// =============================================================================
function finishSelectorRule(src, ruleStart, selector, selectorEnd) {
    const len = src.length;
    let p = selectorEnd;

    if (p >= len || src.charAt(p) !== "{") {
        // A selector with no `{` — a brace-less selector (degenerate input;
        // live `tokenizeCSS` keeps it as a flat selector for backcompat).
        return {
            rule: { selector, span: makeLocalSpan(ruleStart, p) },
            end: p,
        };
    }

    p = p + 1; // consume `{`
    const declarations = [];
    while (p < len && src.charAt(p) !== "}") {
        p = skipCssWhitespace(src, p);
        if (p >= len || src.charAt(p) === "}") break;

        // A nested `/* ... */` comment inside the block.
        if (src.charAt(p) === "/" && p + 1 < len && src.charAt(p + 1) === "*") {
            p = skipCssComment(src, p);
            continue;
        }

        if (isCssIdentStart(src.charAt(p))) {
            const declStart = p;
            let q = p;
            while (q < len && isCssIdentChar(src.charAt(q))) {
                q = q + 1;
            }
            const prop = src.substring(declStart, q);
            q = skipCssWhitespace(src, q);
            const decl = scanPropertyRule(src, declStart, prop, q);
            declarations.push(decl.rule);
            p = decl.end;
            continue;
        }
        // An unrecognized char inside the block — skip it.
        p = p + 1;
    }
    if (p < len && src.charAt(p) === "}") {
        p = p + 1; // consume `}`
    }

    return {
        rule: { selector, declarations, span: makeLocalSpan(ruleStart, p) },
        end: p,
    };
}

// =============================================================================
// scanAtRule — calculation (pure). Capture an `@`-rule verbatim. A statement
// at-rule (`@import` / `@charset` / `@namespace`) ends at `;`; a block
// at-rule (`@media` / `@keyframes` / ...) has a depth-tracked brace body.
// Mirrors the live `tokenizeCSS` at-rule arm (GITI-011). Returns
// { atRule, end }.
// =============================================================================
function scanAtRule(src, start) {
    const len = src.length;
    let p = start + 1; // skip `@`

    let name = "";
    while (p < len && isAtRuleNameChar(src.charAt(p))) {
        name = name + src.charAt(p);
        p = p + 1;
    }
    if (name.length === 0) {
        // A bare `@` with no name — degenerate; consume the `@`.
        return { atRule: "", end: start + 1 };
    }

    let text = "@" + name;
    if (name === "import" || name === "charset" || name === "namespace") {
        // Statement at-rule — consume through `;`.
        while (p < len && src.charAt(p) !== ";") {
            text = text + src.charAt(p);
            p = p + 1;
        }
        if (p < len && src.charAt(p) === ";") {
            text = text + ";";
            p = p + 1;
        }
        return { atRule: text, end: p };
    }

    // Block at-rule — consume the prelude, then the brace body.
    while (p < len && src.charAt(p) !== "{" && src.charAt(p) !== ";") {
        text = text + src.charAt(p);
        p = p + 1;
    }
    if (p < len && src.charAt(p) === ";") {
        // Ended with `;` instead of `{` (e.g. `@layer name;`).
        text = text + ";";
        p = p + 1;
        return { atRule: text, end: p };
    }
    if (p < len && src.charAt(p) === "{") {
        text = text + " {";
        p = p + 1; // consume `{`
        let depth = 1;
        while (p < len && depth > 0) {
            const ch = src.charAt(p);
            if (ch === "{") {
                depth = depth + 1;
            } else if (ch === "}") {
                depth = depth - 1;
            }
            if (depth > 0) {
                text = text + ch;
            }
            p = p + 1;
        }
        text = text + " }";
        return { atRule: text, end: p };
    }

    // No `{` / `;` — degenerate truncated input.
    return { atRule: text.trim(), end: p };
}

// =============================================================================
// attachReactiveRefs — state write (mutates `rule`). Scan a CSS value for
// `@ident` reactive references; when any appear attach `reactiveRefs` +
// `isExpression` to the rule. Mirrors the live `scanCSSValueForReactiveRefs`.
// =============================================================================
function attachReactiveRefs(rule, value) {
    const scanned = scanReactiveRefs(value);
    if (scanned.refs.length > 0) {
        rule.reactiveRefs = scanned.refs;
        rule.isExpression = scanned.isExpression;
    }
}

// =============================================================================
// scanReactiveRefs — calculation (pure). Scan a CSS value string for
// `@identifier` reactive references. Returns { refs, isExpression }.
//   refs         — { name, expr }[] (first-seen order, deduped by name).
//   isExpression — true when the value is more than a bare `@var` (it has
//                  operators / a ternary / a call around the `@var`).
// Mirrors the live `scanCSSValueForReactiveRefs`: a simple reference is
// exactly `@name` or `@name unit`; anything else is an expression and each
// ref carries the full trimmed value as `expr`.
// =============================================================================
export function scanReactiveRefs(value) {
    const refs = [];
    const seen = {};
    const text = typeof value === "string" ? value : "";
    const len = text.length;
    let p = 0;

    while (p < len) {
        if (text.charAt(p) === "@" && p + 1 < len && isCssIdentStart(text.charAt(p + 1))) {
            let q = p + 1;
            while (q < len && isCssIdentChar(text.charAt(q))) {
                q = q + 1;
            }
            const name = text.substring(p + 1, q);
            if (seen[name] !== true) {
                seen[name] = true;
                refs.push({ name });
            }
            p = q;
            continue;
        }
        p = p + 1;
    }

    if (refs.length === 0) {
        return { refs: [], isExpression: false };
    }

    const trimmed = text.trim();
    const isExpression = isSimpleReactiveRef(trimmed) === false;
    for (const ref of refs) {
        ref.expr = isExpression ? trimmed : null;
    }
    return { refs, isExpression };
}

// =============================================================================
// isSimpleReactiveRef — calculation (pure predicate). True iff `trimmed` is
// a bare `@name` or `@name unit` reference (no operators). Mirrors the live
// `simpleRefRe` regex `^@[A-Za-z_$][\w$]*(\s+[A-Za-z%]+)?$`.
// =============================================================================
function isSimpleReactiveRef(trimmed) {
    if (typeof trimmed !== "string" || trimmed.length < 2) return false;
    if (trimmed.charAt(0) !== "@") return false;
    if (isCssIdentStart(trimmed.charAt(1)) === false) return false;

    let p = 2;
    const len = trimmed.length;
    while (p < len && isCssIdentChar(trimmed.charAt(p))) {
        p = p + 1;
    }
    if (p === len) return true; // exactly `@name`

    // An optional ` unit` suffix — whitespace then a letters/`%` run.
    if (isCssWhitespaceChar(trimmed.charAt(p)) === false) return false;
    while (p < len && isCssWhitespaceChar(trimmed.charAt(p))) {
        p = p + 1;
    }
    if (p >= len) return false; // trailing whitespace only — not a unit
    const unitStart = p;
    while (p < len && isUnitChar(trimmed.charAt(p))) {
        p = p + 1;
    }
    return p === len && p > unitStart;
}

// --- character-class + lookahead helpers (mirror tokenizer.ts) --------------

// colonIntroducesSelector — calculation (pure). At a `:` after an ident,
// scan forward for the earliest `{` / `;` / `}`: a `{` first means a pseudo
// selector; a `;` / `}` first means a property declaration.
function colonIntroducesSelector(src, colonPos) {
    for (let p = colonPos + 1; p < src.length; p++) {
        const c = src.charAt(p);
        if (c === "{") return true;
        if (c === ";" || c === "}") return false;
    }
    return false;
}

// hasBraceBeforeSemiOrRbrace — calculation (pure). True iff a `{` appears
// before the next `;` / `}` (GITI-007 descendant-combinator disambiguation).
function hasBraceBeforeSemiOrRbrace(src, startPos) {
    for (let p = startPos; p < src.length; p++) {
        const c = src.charAt(p);
        if (c === "{") return true;
        if (c === ";" || c === "}") return false;
    }
    return false;
}

// scanSelectorPrelude — calculation (pure). From a selector-leading char,
// return the offset of the terminating `{` / `}` / EOF.
function scanSelectorPrelude(src, start) {
    let p = start;
    while (p < src.length && src.charAt(p) !== "{" && src.charAt(p) !== "}") {
        p = p + 1;
    }
    return p;
}

// skipCssWhitespace — calculation (pure). Advance past CSS whitespace.
function skipCssWhitespace(src, p) {
    while (p < src.length && isCssWhitespaceChar(src.charAt(p))) {
        p = p + 1;
    }
    return p;
}

// skipCssComment — calculation (pure). The cursor is at a `/*`; return the
// offset one past the closing `*/` (or EOF for an unterminated comment).
function skipCssComment(src, p) {
    p = p + 2; // skip `/*`
    while (p < src.length && !(src.charAt(p) === "*" && p + 1 < src.length && src.charAt(p + 1) === "/")) {
        p = p + 1;
    }
    if (p < src.length) p = p + 2; // skip `*/`
    return p;
}

// isCssWhitespaceChar — calculation (pure predicate).
function isCssWhitespaceChar(ch) {
    return ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f";
}

// isCssIdentStart — calculation (pure predicate). A CSS property/selector
// identifier start: a letter, `_`, or `-` (a `--custom-prop` leads with `-`).
function isCssIdentStart(ch) {
    if (ch === undefined || ch === null || ch.length === 0) return false;
    return (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z")
        || ch === "_" || ch === "-";
}

// isCssIdentChar — calculation (pure predicate). A CSS identifier
// continuation char: a letter, digit, `_`, or `-`.
function isCssIdentChar(ch) {
    if (ch === undefined || ch === null || ch.length === 0) return false;
    return (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z")
        || (ch >= "0" && ch <= "9") || ch === "_" || ch === "-";
}

// isSelectorLeadChar — calculation (pure predicate). A char that always
// begins a CSS selector run (class / id / universal / attribute / combinator
// / pseudo).
function isSelectorLeadChar(ch) {
    return ch === "." || ch === "#" || ch === "*" || ch === "["
        || ch === ">" || ch === "+" || ch === "~" || ch === ":";
}

// isAtRuleNameChar — calculation (pure predicate). A char legal in an
// at-rule name.
function isAtRuleNameChar(ch) {
    if (ch === undefined || ch === null || ch.length === 0) return false;
    return (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z")
        || (ch >= "0" && ch <= "9") || ch === "_" || ch === "-";
}

// isUnitChar — calculation (pure predicate). A char legal in a CSS unit
// suffix (`px` / `%` / `em` / ...).
function isUnitChar(ch) {
    if (ch === undefined || ch === null || ch.length === 0) return false;
    return (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "%";
}

// makeLocalSpan — calculation (pure). A body-LOCAL span (offsets relative to
// the CSS body slice). The host-absolute shift is M5-swap scope — the same
// posture parse-markup.js's LogicEscape body parse takes for its statement
// spans (only the top-level spans are host-shifted at the markup layer).
function makeLocalSpan(start, end) {
    return { start, end, line: 1, col: 1 };
}
