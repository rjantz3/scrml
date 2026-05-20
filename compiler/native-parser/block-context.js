// block-context.js — JS-host shadow of block-context.scrml.
// See span.js header for the .scrml<->.js duplication rationale.
// PILLAR 5b classification mirrors block-context.scrml's header.
//
// BlockContext is the markup-layer context-grid engine (charter Q1.C) —
// the top-level engine of the markup-layer engine graph. It is to the
// markup layer what LexMode is to the JS layer.
//
// MK1.1 SCOPE: the engine declaration is complete (all 9 variants, full
// rule= contract — see the .scrml). The `.TopLevel` body work below is
// substantive at a RECOGNITION level (the context-entry recognizers);
// the deep sigil-consume + brace-depth tracking is MK1.2.

// BlockContext variant tags — all 9 per charter Q1.C.
export const BlockContext = Object.freeze({
    TopLevel:      "TopLevel",
    InMarkupTag:   "InMarkupTag",
    InLogicEscape: "InLogicEscape",
    InCss:         "InCss",
    InSql:         "InSql",
    InErrorEffect: "InErrorEffect",
    InMeta:        "InMeta",
    InTest:        "InTest",
    InForeignCode: "InForeignCode",
});

// initialBlockContext — calculation. Matches `initial=.TopLevel`.
export function initialBlockContext() {
    return BlockContext.TopLevel;
}

// setBlockContext — STATE write (ctx.blockContext). Canonical form:
// `@blockContext = .NewContext`.
export function setBlockContext(ctx, context) {
    ctx.blockContext = context;
}

// getBlockContext — calculation (read).
export function getBlockContext(ctx) {
    return ctx.blockContext;
}

// LEGAL_FROM_TOP_LEVEL — the rule= matrix on the <TopLevel> state-child
// as a lookup table. (.InForeignCode is reached from a tag context, not
// directly from .TopLevel — matching the charter Q1.C contract.)
export const LEGAL_FROM_TOP_LEVEL = Object.freeze({
    InMarkupTag:   true,
    InLogicEscape: true,
    InCss:         true,
    InSql:         true,
    InErrorEffect: true,
    InMeta:        true,
    InTest:        true,
});

// makeSigilTable — calculation. Builds the closed map from a two-char
// block-opener sigil to the BlockContext it enters. Mirrors the
// .scrml's character-concatenation form 1:1 (the .scrml uses concat as
// the README ANOMALY-1 string-literal workaround; the .js shadow keeps
// the same structure so the pair stays 1:1). Replaces the
// block-splitter's sigil-guessing — a closed lookup, not a heuristic.
export function makeSigilTable() {
    const brace = "{";
    const table = {};
    table["$" + brace] = BlockContext.InLogicEscape;
    table["?" + brace] = BlockContext.InSql;
    table["#" + brace] = BlockContext.InCss;
    table["!" + brace] = BlockContext.InErrorEffect;
    table["^" + brace] = BlockContext.InMeta;
    table["~" + brace] = BlockContext.InTest;
    table["_" + brace] = BlockContext.InForeignCode;
    return table;
}

// SIGIL_TO_CONTEXT — the closed sigil->BlockContext map (built once).
export const SIGIL_TO_CONTEXT = makeSigilTable();

// contextForSigil — calculation. Returns the BlockContext a two-char
// sigil enters, or null if the two chars are not a block-opener sigil.
export function contextForSigil(twoChar) {
    const ctxName = SIGIL_TO_CONTEXT[twoChar];
    if (ctxName === undefined) return null;
    return ctxName;
}

// isBlockOpenerSigil — calculation (predicate).
export function isBlockOpenerSigil(twoChar) {
    return contextForSigil(twoChar) !== null;
}

// isMarkupTagOpener — calculation (predicate). A `<` immediately
// followed by an ASCII letter opens a markup-tag context. The deep
// tag-tree recognition is MK2 — this only recognizes the boundary.
export function isMarkupTagOpener(lessThanChar, nextChar) {
    if (lessThanChar !== "<") return false;
    return isAsciiLetter(nextChar);
}

// isAsciiLetter — calculation (predicate). ASCII a-z / A-Z.
export function isAsciiLetter(ch) {
    if (ch === "") return false;
    const c = ch.charCodeAt(0);
    const isUpper = c >= 65 && c <= 90;
    const isLower = c >= 97 && c <= 122;
    return isUpper || isLower;
}
