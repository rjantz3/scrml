// parse-markup.js — JS-host shadow of parse-markup.scrml.
// See span.js header for the .scrml<->.js duplication rationale.
// PILLAR 5b classification mirrors parse-markup.scrml's header.
//
// The markup-layer trampoline (charter Q1.G) — the same shape as M1's
// lex.js: a loop dispatching by the BlockContext engine, with a safety
// bound and a cursor-progress sentinel.
//
// MK1.1 SCOPE: the trampoline runs; `.TopLevel` dispatch is substantive
// at a RECOGNITION level (it exercises the context-entry recognizers
// and advances one char); the other 8 BlockContext dispatches are
// skeletal. MK1.2 lands the sigil-consume + transition + brace-depth.

import { makeCursor, isEof, peekChar, peekStr, advance } from "./cursor.js";
import { makeParseContext } from "./parse-ctx.js";
import {
    BlockContext,
    getBlockContext,
    setBlockContext,
    contextForSigil,
    isMarkupTagOpener,
} from "./block-context.js";

// recognizeContextEntryAt — calculation. Does a context-entry boundary
// begin at the cursor right now, and if so which BlockContext does it
// enter? Returns { kind: "sigil"|"markupTag"|"none", ... }. Recognition
// only — no cursor advance, no engine transition (that is MK1.2).
export function recognizeContextEntryAt(cursor) {
    // Two-character block-opener sigil? (${ ?{ #{ !{ ^{ ~{ _{)
    const twoChar = peekStr(cursor, 2);
    const sigilContext = contextForSigil(twoChar);
    if (sigilContext !== null) {
        return { kind: "sigil", enters: sigilContext, sigil: twoChar };
    }

    // `<ident`-shaped markup-tag-context boundary?
    const here = peekChar(cursor, 0);
    const next = peekChar(cursor, 1);
    if (isMarkupTagOpener(here, next)) {
        return { kind: "markupTag", enters: BlockContext.InMarkupTag };
    }

    return { kind: "none" };
}

// dispatchTopLevel — the `.TopLevel` BlockContext state-child body
// (MK1.1 substantive at a recognition level). Recognizes a context-
// entry boundary, then advances ONE character. MK1.2 will consume a
// recognized sigil and call setBlockContext instead.
export function dispatchTopLevel(cursor, ctx) {
    const recognized = recognizeContextEntryAt(cursor);
    advance(cursor, 1);
    return recognized;
}

// dispatchSkeletalContext — the skeletal body shared by the 8
// non-.TopLevel BlockContext state-children at MK1.1. Unreachable at
// MK1.1 (`.TopLevel` never transitions out); advances the cursor and
// returns to .TopLevel. MK1.2/MK1.3 replace this per-context.
export function dispatchSkeletalContext(cursor, ctx) {
    advance(cursor, 1);
    setBlockContext(ctx, BlockContext.TopLevel);
}

// parseMarkup — entry point. Pure fn over the source string; the loop
// is a thin trampoline dispatching by BlockContext, mirroring lex.js.
// Returns ctx.nodes (the shared node sink) — empty at MK1.1 since
// `.TopLevel` is recognition-only.
export function parseMarkup(source) {
    const cursor = makeCursor(source);
    const ctx = makeParseContext();

    const maxIters = (source.length + 1) * 4;
    let iters = 0;

    while (!isEof(cursor) && iters < maxIters) {
        const context = getBlockContext(ctx);
        const beforePos = cursor.pos;

        if (context === BlockContext.TopLevel) {
            dispatchTopLevel(cursor, ctx);
        } else if (context === BlockContext.InMarkupTag) {
            dispatchSkeletalContext(cursor, ctx);
        } else if (context === BlockContext.InLogicEscape) {
            dispatchSkeletalContext(cursor, ctx);
        } else if (context === BlockContext.InCss) {
            dispatchSkeletalContext(cursor, ctx);
        } else if (context === BlockContext.InSql) {
            dispatchSkeletalContext(cursor, ctx);
        } else if (context === BlockContext.InErrorEffect) {
            dispatchSkeletalContext(cursor, ctx);
        } else if (context === BlockContext.InMeta) {
            dispatchSkeletalContext(cursor, ctx);
        } else if (context === BlockContext.InTest) {
            dispatchSkeletalContext(cursor, ctx);
        } else if (context === BlockContext.InForeignCode) {
            dispatchSkeletalContext(cursor, ctx);
        } else {
            // Defensive safety net for an unreachable future
            // BlockContext variant — return to .TopLevel.
            setBlockContext(ctx, BlockContext.TopLevel);
        }

        // Loop-progress sentinel — every iteration must consume input.
        if (cursor.pos === beforePos && !isEof(cursor)) {
            cursor.pos = cursor.pos + 1;
        }
        iters = iters + 1;
    }

    return ctx.nodes;
}
