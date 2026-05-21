// delegation-frame.js — JS-host shadow of delegation-frame.scrml.
// See span.js header for the .scrml<->.js duplication rationale.
// PILLAR 5b classification mirrors delegation-frame.scrml's header — see
// that file.
//
// This is the K9 leaf-module break (S114): the DelegationFrame surface
// originally exported from parse-ctx.scrml moved here so block-context
// no longer transitively cycles through parse-ctx. Mirrors K2's
// char-classify break (S113).

// --- DelegationKind / CloseCondition tag tables (pure data) ---

export function delegationKinds() {
    return {
        LogicEscape:   "LogicEscape",
        FunctionBody:  "FunctionBody",
        AttrExpr:      "AttrExpr",
        ShorthandBody: "ShorthandBody",
        MetaBody:      "MetaBody",
        Interpolation: "Interpolation",
        ElementValue:  "ElementValue",
    };
}

export function closeConditionKinds() {
    return {
        BraceDepth:       "BraceDepth",
        TagFrameBalanced: "TagFrameBalanced",
        AttrTerminator:   "AttrTerminator",
        ShorthandEol:     "ShorthandEol",
    };
}

// --- CloseCondition constructors (calculation — pure data builders) ---

export function closeOnBraceDepth(depthAtOpen) {
    return { kind: "BraceDepth", depthAtOpen };
}

export function closeOnTagFrameBalanced(tagDepthAtOpen) {
    return { kind: "TagFrameBalanced", tagDepthAtOpen };
}

export function closeOnAttrTerminator() {
    return { kind: "AttrTerminator" };
}

export function closeOnShorthandEol() {
    return { kind: "ShorthandEol" };
}

// --- DelegationFrame constructor (calculation — pure data builder) ---

export function makeDelegationFrame(kind, closeOn, openSpan, bodyMode) {
    return { kind, closeOn, openSpan, bodyMode };
}

// --- delegationStack helpers (state writes / reads) ---
// The push/pop ARE the §51.0.Q.1 inner-engine init/suspend events;
// MK4 drives them for the real markup<->JS delegation.

export function pushDelegationFrame(ctx, frame) {
    ctx.delegationStack.push(frame);
}

export function popDelegationFrame(ctx) {
    if (ctx.delegationStack.length === 0) return null;
    return ctx.delegationStack.pop();
}

export function topDelegationFrame(ctx) {
    if (ctx.delegationStack.length === 0) return null;
    return ctx.delegationStack[ctx.delegationStack.length - 1];
}

export function delegationDepth(ctx) {
    return ctx.delegationStack.length;
}

export function inDelegation(ctx) {
    return ctx.delegationStack.length > 0;
}
