// tag-frame.js — JS-host shadow of tag-frame.scrml.
// See span.js header for the .scrml<->.js duplication rationale.
// PILLAR 5b classification mirrors tag-frame.scrml's header.
//
// TagFrame is the markup-layer <tag>-tree engine (charter Q1.F) — the
// open-tag stack of the markup-layer engine graph. Where BlockContext
// answers "which scrml context are we in?", TagFrame answers "which tag
// is open right now, and how deep is the tag tree?".
//
// MK2.1 SCOPE: the engine declaration (3 payload-bearing state-children,
// the bracket-stack `.OpenAt` pattern — see the .scrml); the TagKind
// calculation (a pure fn — NOT an engine, per D1 OQ1); the
// structural-element registry (SPEC §4.15 / §24.4 — the normative SEVEN;
// see the STRUCTURAL-ELEMENT REGISTRY section for the brief-vs-SPEC
// discrepancy note); opener recognition (tokenizeOpener — the one-pass
// `skipOpener` primitive, charter Q2.A #4 — + recognizeOpener which
// computes TagKind + pushes the TagFrame).
//
// MK2.2 SCOPE (this amendment — the closer side of the <tag> tree): the
// 3 closer forms — `</>` inferred / `</name>` explicit / `/>`
// self-closing — recognized STRUCTURALLY (a closed set; no
// `looksLikeCloser` bare-`/` guess); opener/closer PAIRING via the
// TagFrame stack (closeTagFrame pops the matching frame — the
// `.Open* -> .Closed` transition; this eliminates BS heuristic #5
// `scanCompoundBlockEnd`); mismatch recovery (a mismatched `</name>`
// dispatches the M1 ErrorRecovery engine + records the diagnostic). See
// the MK2.2 section after recognizeOpener. The TagKind-driven
// decl-vs-markup classification + punch-list P4/P5 are MK2.3; BodyMode
// (§4.18) is MK3's engine.

import { advance, peekChar, peekStr } from "./cursor.js";
import { makeSpan } from "./span.js";
import { isAsciiLetter } from "./block-context.js";
// MK2.2 — the M1 ErrorRecovery engine. A mismatched `</name>` (or a
// stray closer) dispatches the SAME panic-mode recovery the JS layer
// uses, scoped to block grammar (see dispatchTagMismatchRecovery).
import {
    SyncToken,
    beginRecovery,
    accumulateSkipped,
    markResync,
    resumeNormal,
} from "./error-recovery.js";

// TagKind variant tags — all 4 per the .scrml's type declaration.
// PURE DATA (calculation classification, per D1 OQ1): the four-way
// classification of a markup-tag opener, computed once at
// opener-recognition time and carried by the TagFrame engine.
export const TagKind = Object.freeze({
    Html:            "Html",
    Component:       "Component",
    ScrmlStructural: "ScrmlStructural",
    StateOpener:     "StateOpener",
});

// TagFrameKind — the 3 TagFrame variant tags (the engine's
// state-children) surfaced as values. Distinct from the open-tag
// DESCRIPTOR struct below — a closed open-tag frame carries its payload
// as struct fields, mirroring bracket-stack.js's .OpenAt(depth, opener,
// span) → { opener, span } live frame.
export const TagFrameKind = Object.freeze({
    Closed:               "Closed",
    OpenExpectingChildren: "OpenExpectingChildren",
    OpenSelfClosed:       "OpenSelfClosed",
});

// initialTagFrame — calculation. Matches `initial=.Closed` on the
// engine in the .scrml.
export function initialTagFrame() {
    return TagFrameKind.Closed;
}

// ===========================================================================
// STRUCTURAL-ELEMENT REGISTRY (SPEC §4.15 + §24.4).
//
// The closed name-set the TagKind calculation consults to decide
// ScrmlStructural. SPEC §4.15 + §24.4 are the NORMATIVE registry — both
// register exactly these SEVEN scrml-defined structural elements:
//   engine / match / errors / onTransition / onTimeout / onIdle / page.
//
// NOTE — discrepancy surfaced at MK2.1 (REPORTED to PA). The MK2.1 brief's
// registry list named NINE elements — the seven above PLUS `channel` and
// `auth`. SPEC §38 DOES call `<channel>` "a scrml-defined structural
// element" (a SPEC internal inconsistency — §38 vs the §4.15/§24.4
// tables); `<auth>` is a block-grammar gate element (`<auth role=>`) —
// not an HTML element — but is never named "structural element" and is
// absent from the registry tables. Per pa.md Rule 4 (SPEC is normative;
// the §4.15/§24.4 registry tables are THE registry) MK2.1 encodes the
// normative SEVEN. The registry is a closed lookup — if SPEC §4.15/§24.4
// are later amended to add `channel` / `auth`, this is a one-line table
// change + a TagKind regression test, no structural rework.
// ===========================================================================

// STRUCTURAL_ELEMENTS — the closed structural-element name set
// (SPEC §4.15 / §24.4). A frozen membership map: name -> true.
export const STRUCTURAL_ELEMENTS = Object.freeze({
    engine:       true,
    match:        true,
    errors:       true,
    onTransition: true,
    onTimeout:    true,
    onIdle:       true,
    page:         true,
});

// isStructuralElementName — calculation (predicate). Is `name` one of
// the SPEC §4.15 / §24.4 scrml-defined structural elements? A
// closed-name-set lookup — the heuristic-elimination shape (charter
// Q2.A #4 — the block-splitter's recursive classifier is replaced by
// this membership test + the rest of tagKindFor).
export function isStructuralElementName(name) {
    return STRUCTURAL_ELEMENTS[name] === true;
}

// ===========================================================================
// THE TagKind CALCULATION (charter Q1.F).
//
// A pure fn of the opener's bytes — per D1 OQ1 (a pure function of input
// bytes is calculation, NOT an engine). Inputs: the opener `name` + the
// `hadSpaceAfterLt` whitespace shape (`< ident` vs `<ident`). §4.3 makes
// the whitespace discriminator ADVISORY (informational only since Phase
// P1); StateOpener is the §4.3-convention state-type signal — the
// authoritative markup-vs-state/decl decision is MK2.3.
//
// The classification (priority order — see the .scrml header for the
// rationale; the registry names are lowercase, so the membership test
// MUST precede the first-char-case test):
//   1. hadSpaceAfterLt  -> StateOpener
//   2. name in registry -> ScrmlStructural
//   3. first char upper -> Component
//   4. otherwise         -> Html
// ===========================================================================

// firstCharIsUpper — calculation (predicate). Is the first character of
// `name` an ASCII uppercase letter (A-Z)? The PascalCase
// component-vs-HTML signal (§4.3 casing convention).
export function firstCharIsUpper(name) {
    if (name === "") return false;
    const c = name.charCodeAt(0);
    return c >= 65 && c <= 90;
}

// tagKindFor — calculation. The TagKind of a markup-tag opener with
// tag-name `name`, given whether whitespace followed the `<`. THE
// heuristic-elimination calculation (charter Q1.F + Q2.A #4) — a closed
// four-way classification from the opener's bytes.
export function tagKindFor(name, hadSpaceAfterLt) {
    // 1. The §4.3 advisory state-type-instantiation shape — a
    //    `< ident`-with-space opener. ADVISORY per §4.3; MK2.3 completes
    //    the authoritative markup-vs-state decision.
    if (hadSpaceAfterLt) return TagKind.StateOpener;
    // 2. A scrml-defined structural element (SPEC §4.15 / §24.4) — these
    //    names are lowercase, so this test MUST precede the
    //    first-char-case test below.
    if (isStructuralElementName(name)) return TagKind.ScrmlStructural;
    // 3. A PascalCase user-component reference (§4.3 casing).
    if (firstCharIsUpper(name)) return TagKind.Component;
    // 4. Otherwise — a lowercase HTML element.
    return TagKind.Html;
}

// ===========================================================================
// OPENER RECOGNITION — the one-pass opener tokenizer (charter Q2.A #4:
// the SPIKE's shared `skipOpener` primitive, done once).
//
// tokenizeOpener scans a markup-tag opener — `<ident ...attrs... >` or
// `<ident ... />` — in a SINGLE forward pass. It does NOT build an
// attribute AST (attribute parsing is later-milestone work); it
// recognizes the opener's STRUCTURE: the tag name, whether whitespace
// followed the `<`, whether the opener is self-closing (a trailing `/`
// before the `>`), and the opener's full extent. The cursor is advanced
// PAST the opener's closing `>`.
//
// MK2.1 is the OPENER side of the <tag> tree. The CHILDREN + the matching
// closer are MK2.2. tokenizeOpener reports `selfClosing` (MK2.1 uses it
// to pick .OpenSelfClosed vs .OpenExpectingChildren) but the
// opener/closer PAIRING is MK2.2.
//
// One-cursor invariant (R1 spike §3.3): tokenizeOpener advances the ONE
// shared cursor; it copies no sub-range; every Span it produces is
// already file-absolute.
// ===========================================================================

// isTagNameStart — calculation (predicate). A character that may START a
// markup-tag name: an ASCII letter. (Reuses block-context's
// isAsciiLetter — MK1.3's isMarkupTagOpener uses the same test for the
// `<ident` boundary; MK2 owns the deeper tag-name grammar.)
export function isTagNameStart(ch) {
    return isAsciiLetter(ch);
}

// isTagNameChar — calculation (predicate). A character that may CONTINUE
// a markup-tag name: an ASCII letter, an ASCII digit, or `-`. (MK1.3's
// parse-markup.js carried a local isTagNameChar for boundary-only
// consumption; MK2.1 is the home of the full tag-name grammar — this is
// the canonical one. The values match 1:1 so the MK1.3 local can defer
// to it without behavior change.)
export function isTagNameChar(ch) {
    if (ch === "") return false;
    if (ch === "-") return true;
    const c = ch.charCodeAt(0);
    if (c >= 48 && c <= 57) return true;   // 0-9
    if (c >= 65 && c <= 90) return true;   // A-Z
    if (c >= 97 && c <= 122) return true;  // a-z
    return false;
}

// isOpenerWhitespace — calculation (predicate). Inter-token whitespace
// inside an opener — space, tab, CR, LF.
export function isOpenerWhitespace(ch) {
    if (ch === " ") return true;
    if (ch === String.fromCharCode(9)) return true;   // tab
    if (ch === String.fromCharCode(10)) return true;  // LF
    if (ch === String.fromCharCode(13)) return true;  // CR
    return false;
}

// scanTagName — calculation. Returns the END offset one past the last
// tag-name character, scanning a maximal `isTagNameChar` run from
// `start`. The caller has verified the char at `start` is a tag-name
// start (an ASCII letter).
export function scanTagName(source, start) {
    const len = source.length;
    let p = start;
    while (p < len) {
        if (!isTagNameChar(source.charAt(p))) return p;
        p = p + 1;
    }
    return p;
}

// skipOpenerWhitespace — calculation. Returns the END offset one past a
// maximal whitespace run from `start`.
export function skipOpenerWhitespace(source, start) {
    const len = source.length;
    let p = start;
    while (p < len) {
        if (!isOpenerWhitespace(source.charAt(p))) return p;
        p = p + 1;
    }
    return p;
}

// closeAngle — calculation. The one-character opener terminator `>`.
export function closeAngle() {
    return ">";
}

// slash — calculation. The one-character `/` — the self-closing marker
// (a trailing `/` before the `>`).
export function slash() {
    return String.fromCharCode(47);
}

// tokenizeOpener — calculation at its own locus (a pure fn over the
// shared cursor: it walks the cursor forward past the opener BODY and
// returns a descriptor; it writes no engine state). Scans the BODY of a
// markup-tag opener — `<ident ...>` / `<ident ... />` MINUS the leading
// `<` — in ONE pass.
//
// PARAMETERS:
//   cursor   — positioned at the byte AFTER the `<` (the `<` was
//              consumed by block-context.js's enterMarkupTagContext —
//              its MK1.2 contract).
//   ltAnchor — the `<`'s span: a record carrying { start, line, col }
//              (the .InMarkupTag BlockContext frame's openSpan IS this
//              record). The returned opener span anchors here so it
//              covers the `<`.
//
// The pass:
//   1. Skip any whitespace after the `<` — record hadSpaceAfterLt (the
//      §4.3 advisory state-type signal).
//   2. Scan the tag-name run. An opener with no name start after the `<`
//      is malformed — recorded as `ok: false`.
//   3. Scan the attribute REGION as opaque bytes up to the opener
//      terminator (string-aware — a `>` / `/` inside an attribute-value
//      string is not the terminator). No attribute AST is built.
//   4. Recognize the terminator: `>` closes; a `/` immediately before it
//      marks the opener self-closing.
//   5. Advance the cursor past the `>`.
//
// Returns { ok, name, hadSpaceAfterLt, selfClosing, span, malformed }.
export function tokenizeOpener(cursor, ltAnchor) {
    const source = cursor.source;
    const len = source.length;

    // 1. Whitespace after the `<` — the §4.3 advisory signal.
    const beforeWs = cursor.pos;
    const afterWs = skipOpenerWhitespace(source, beforeWs);
    const hadSpaceAfterLt = afterWs > beforeWs;
    advance(cursor, afterWs - beforeWs);

    // 2. The tag-name run.
    const nameStart = cursor.pos;
    let name = "";
    let malformed = false;
    if (nameStart < len && isTagNameStart(source.charAt(nameStart))) {
        const nameEnd = scanTagName(source, nameStart);
        name = source.substring(nameStart, nameEnd);
        advance(cursor, nameEnd - nameStart);
    } else {
        // No name start after the `<` — a malformed opener. Record the
        // flag; MK2.2's ErrorRecovery decides the recovery.
        malformed = true;
    }

    // 3 + 4. Scan the attribute region (opaque bytes, string-aware) up
    // to the opener terminator `>`; recognize a trailing `/`.
    let selfClosing = false;
    let terminated = false;
    let p = cursor.pos;
    // inString — null when outside a string; the quote char when inside
    // an attribute-value string (so a `>` / `/` inside the string does
    // not terminate the opener).
    let inString = null;
    while (p < len) {
        const ch = source.charAt(p);
        if (inString === null) {
            if (ch === "\"" || ch === "'") {
                inString = ch;
                p = p + 1;
            } else if (ch === closeAngle()) {
                // The opener terminator. A `/` immediately before it
                // marks the opener self-closing.
                terminated = true;
                p = p + 1;
                break;
            } else {
                p = p + 1;
            }
        } else {
            // Inside an attribute-value string — only the matching quote
            // closes it. (MK2.1 does not interpret string escapes; an
            // attribute-value string is opaque here.)
            if (ch === inString) {
                inString = null;
            }
            p = p + 1;
        }
    }

    // A trailing `/` before the `>` marks the opener self-closing. p
    // points one PAST the `>`; the `/`, if any, is at p-2.
    if (terminated && p >= 2) {
        if (source.charAt(p - 2) === slash()) {
            selfClosing = true;
        }
    }

    // Advance the cursor past the opener terminator. If the opener was
    // never terminated (EOF before `>`) the cursor advances to EOF and
    // `malformed` is set — MK2.2 owns the recovery.
    advance(cursor, p - cursor.pos);
    if (!terminated) {
        malformed = true;
    }

    // The opener span — anchored at the `<` (ltAnchor), ending one past
    // the opener terminator. File-absolute; no offset arithmetic.
    const span = makeSpan(ltAnchor.start, p, ltAnchor.line, ltAnchor.col);
    return {
        ok: !malformed,
        name,
        hadSpaceAfterLt,
        selfClosing,
        span,
        malformed,
    };
}

// ===========================================================================
// THE TagFrame STACK — the live open-tag stack (the JS-host mirror of
// the @tagFrame engine).
//
// The CURRENT TagFrame variant is the top of ctx.tagFrameStack
// (`.Closed` when the stack is empty). Each push IS a `.Closed ->
// .Open*` (or nested `.OpenExpectingChildren -> .OpenExpectingChildren`)
// transition; each pop IS a `.Open* -> .Closed` transition. This is the
// bracket-stack.js pattern exactly — the canonical
// payload-bearing-state-child engine mirror.
//
// MK2.1 lands the PUSH side (recognizeOpener). The POP side (a closer
// popping its matching opener — MK2.2) consumes this same stack.
// ===========================================================================

// ensureTagFrameStack — STATE write (lazy init). Mirrors
// block-context.js's ensureBlockContextStack — a parse context built
// before MK2.1 (an MK1-vintage ctx) has no tagFrameStack slot; this
// keeps the helpers total.
export function ensureTagFrameStack(ctx) {
    if (ctx.tagFrameStack === undefined || ctx.tagFrameStack === null) {
        ctx.tagFrameStack = [];
    }
}

// tagFrameDepth — calculation (read). The tag-tree depth — how many tags
// are open. Punch-list P5 (the TagFrame stack depth datum the
// CloseCondition.TagFrameBalanced close-condition consumes) is exposed
// via this read; MK2.3 wires P5's consumer.
export function tagFrameDepth(ctx) {
    ensureTagFrameStack(ctx);
    return ctx.tagFrameStack.length;
}

// currentTagFrame — calculation (peek). The CURRENT @tagFrame variant
// tag — the kind of the top frame, or `.Closed` when the stack is empty.
export function currentTagFrame(ctx) {
    ensureTagFrameStack(ctx);
    if (ctx.tagFrameStack.length === 0) return TagFrameKind.Closed;
    return ctx.tagFrameStack[ctx.tagFrameStack.length - 1].kind;
}

// topTagFrame — calculation (peek). The top open-tag frame (the
// descriptor — kind + payload), or null when no tag is open. The frame a
// matching closer (MK2.2) pops.
export function topTagFrame(ctx) {
    ensureTagFrameStack(ctx);
    if (ctx.tagFrameStack.length === 0) return null;
    return ctx.tagFrameStack[ctx.tagFrameStack.length - 1];
}

// makeOpenExpectingChildrenFrame — calculation (pure data builder). The
// live mirror of the canonical `.OpenExpectingChildren(name, kind,
// depth, span)` payload-bearing state-child — a frame struct carrying
// { kind: "OpenExpectingChildren", name, tagKind, depth, span, bodyMode }.
// `bodyMode` is MK3's BodyMode — carried as a tag here (a TagFrame
// payload may carry a body-mode-relevant field per the MK2.1 brief; the
// BodyMode engine itself is MK3's).
export function makeOpenExpectingChildrenFrame(name, tagKind, depth, span) {
    return {
        kind:     TagFrameKind.OpenExpectingChildren,
        name,
        tagKind,
        depth,
        span,
        // bodyMode — MK3 threads the §4.18 mode; null at MK2.1.
        bodyMode: null,
    };
}

// makeOpenSelfClosedFrame — calculation (pure data builder). The live
// mirror of the canonical `.OpenSelfClosed(name, kind, span)`
// payload-bearing state-child. No `depth` payload — a self-closed tag
// opens no child subtree.
export function makeOpenSelfClosedFrame(name, tagKind, span) {
    return {
        kind:    TagFrameKind.OpenSelfClosed,
        name,
        tagKind,
        span,
    };
}

// pushTagFrame — STATE write: a tag opens. Appends an open-tag frame to
// ctx.tagFrameStack. The `.Closed -> .Open*` (or nested
// `.OpenExpectingChildren -> .OpenExpectingChildren`) @tagFrame
// transition.
export function pushTagFrame(ctx, frame) {
    ensureTagFrameStack(ctx);
    ctx.tagFrameStack.push(frame);
}

// popTagFrame — STATE write: a tag closes. Returns the popped frame, or
// null if the stack was empty (an unbalanced closer — MK2.2's
// ErrorRecovery dispatch). The `.Open* -> .Closed` @tagFrame transition.
// MK2.1 provides it as the substrate; MK2.2 drives it from the
// closer-form recognizers.
export function popTagFrame(ctx) {
    ensureTagFrameStack(ctx);
    if (ctx.tagFrameStack.length === 0) return null;
    return ctx.tagFrameStack.pop();
}

// ===========================================================================
// recognizeOpener — the MK2.1 opener-side entry point.
//
// STATE transition at its own locus (it walks the cursor past the opener
// BODY via tokenizeOpener, then PUSHES a TagFrame — a @tagFrame rule=
// transition).
//
// PARAMETERS:
//   ctx      — the parse context (carries ctx.tagFrameStack).
//   cursor   — positioned at the byte AFTER the `<` (the `<` was consumed
//              by enterMarkupTagContext).
//   ltAnchor — the `<`'s span (the .InMarkupTag BlockContext frame's
//              openSpan) — the opener-span anchor.
//
// The steps:
//   1. Tokenize the opener BODY in one pass (tokenizeOpener).
//   2. Compute the opener's TagKind (tagKindFor).
//   3. Build the open-tag frame (self-closing -> .OpenSelfClosed;
//      otherwise -> .OpenExpectingChildren carrying the tag-tree depth).
//   4. Push the frame onto ctx.tagFrameStack.
//
// Returns the pushed frame descriptor (also carrying the tokenizer
// descriptor as `.opener` so the caller — parse-markup's .InMarkupTag
// dispatcher — can emit the Markup block at the opener's full span and
// observe `malformed`).
//
// The closer side (MK2.2) and the decl-vs-markup classification
// completion (MK2.3) consume this same frame; MK2.1 lands the push.
export function recognizeOpener(ctx, cursor, ltAnchor) {
    // 1. One-pass opener-body tokenization.
    const opener = tokenizeOpener(cursor, ltAnchor);

    // 2. The TagKind calculation.
    const tagKind = tagKindFor(opener.name, opener.hadSpaceAfterLt);

    // 3 + 4. Build + push the open-tag frame.
    let frame = null;
    if (opener.selfClosing) {
        frame = makeOpenSelfClosedFrame(opener.name, tagKind, opener.span);
    } else {
        // The tag-tree depth at which this frame opens — the stack
        // length BEFORE the push (a top-level tag opens at depth 0).
        const depthAtOpen = tagFrameDepth(ctx);
        frame = makeOpenExpectingChildrenFrame(
            opener.name,
            tagKind,
            depthAtOpen,
            opener.span,
        );
    }
    pushTagFrame(ctx, frame);

    // Carry the tokenizer descriptor so the caller can emit the Markup
    // block at the opener's full span + observe `malformed`.
    frame.opener = opener;
    return frame;
}

// ===========================================================================
// MK2.2 — THE 3 CLOSER FORMS + opener/closer PAIRING + mismatch recovery.
//
// MK2.1 landed the OPENER side (recognizeOpener pushes a TagFrame). MK2.2
// lands the CLOSER side — the `.Open* -> .Closed` @tagFrame transition —
// and the opener/closer PAIRING the stack discipline gives by construction
// (the elimination of BS heuristic #5 `scanCompoundBlockEnd`, which
// forward-scans for the matching `</>` by counting nested pairs; the
// recursive-descent stack finds the match WITHOUT a separate scan).
//
// THE THREE FORMS (charter Q1.F; SPEC §4.4 + §4.14):
//   - `</>`      inferred closer (SPEC §4.4.2) — closes the innermost open
//                tag REGARDLESS of name.
//   - `</name>`  explicit closer (SPEC §4.4.1) — closes the innermost open
//                tag whose name is `name`; a non-matching name is
//                E-MARKUP-002 (SPEC §4.4.1 normative).
//   - `/>`       self-closing (SPEC §4.14 body form) — recognized at the
//                OPENER by MK2.1's recognizeOpener (an .OpenSelfClosed
//                frame). MK2.2 completes its lifecycle: an .OpenSelfClosed
//                frame closes immediately (no separate closer token).
//
// Recognized STRUCTURALLY — a CLOSED SET. There is NO `looksLikeCloser`
// bare-`/` heuristic (BS heuristic #12); a `/` that is not part of `</>`
// / `</name>` / `/>` is not a closer.
//
// SPEC-CODE NOTE (load-bearing — corrects the MK2.2 brief): the brief
// said a mismatched `</name>` is "E-CTX-001 panic-mode recovery". SPEC
// §4.4.1 (line 397) + §34 (E-MARKUP-002, line 14928) are normative: an
// explicit closer whose name does NOT match the innermost open tag is
// E-MARKUP-002. E-CTX-001 (§34 line 14878) is "wrong closer for context
// type"; SPEC §4 line 1072 uses E-CTX-001 for an UNTERMINATED tag (EOF
// before the closer). So MK2.2 encodes: mismatched `</name>` ->
// E-MARKUP-002; an EOF-unterminated tag -> E-CTX-001; a stray closer
// with no open tag -> E-CTX-003. The brief's load-bearing instruction
// (dispatch the ErrorRecovery engine — the same panic-mode the JS layer
// uses, scoped to block grammar) is honored regardless of the code name.
// ===========================================================================

// CloserForm — PURE DATA tags. The closer forms whose lifecycle the
// TagFrame engine completes. `Inferred` / `Explicit` are the two SPEC
// §4.4 closer FORMS; `SelfClosing` is the §4.14 self-closing body form
// (recognized at the opener — surfaced here for a uniform close API).
export const CloserForm = Object.freeze({
    Inferred:    "Inferred",
    Explicit:    "Explicit",
    SelfClosing: "SelfClosing",
});

// lessThanSlash — calculation. The two-character `</` closer prelude.
export function lessThanSlash() {
    return "<" + slash();
}

// inferredCloser — calculation. The three-character `</>` inferred-closer
// token (SPEC §4.4.2). Assembled via slash() per the README ANOMALY-1
// string-literal discipline (the `.scrml` shadow needs it; the `.js`
// keeps the shape 1:1).
export function inferredCloser() {
    return "<" + slash() + closeAngle();
}

// recognizeCloserForm — calculation (pure fn over the cursor). Returns
// the CloserForm a closer STARTING at the cursor would be, or null if no
// closer opener is at the cursor. A CLOSED structural test — the
// heuristic-elimination shape (no bare-`/` `looksLikeCloser` guess).
//
//   `</>`            -> CloserForm.Inferred  (checked FIRST — `</>` is a
//                       prefix-superset start of `</`, so the 3-char
//                       inferred test must precede the explicit test).
//   `</` + name char -> CloserForm.Explicit  (an explicit `</name>`).
//   anything else     -> null.
//
// Does NOT advance the cursor; does NOT decide whether the closer is
// legal here (that is the trampoline's per-context dispatch — a closer
// inside a `${ }` logic context is E-CTX-002, the trampoline's concern).
export function recognizeCloserForm(cursor) {
    if (peekStr(cursor, 3) === inferredCloser()) return CloserForm.Inferred;
    if (peekStr(cursor, 2) === lessThanSlash()) {
        // `</` followed by a tag-name start is an explicit `</name>`.
        const afterSlash = peekChar(cursor, 2);
        if (isTagNameStart(afterSlash)) return CloserForm.Explicit;
    }
    return null;
}

// tokenizeCloser — calculation at its own locus (a pure fn over the
// shared cursor: it walks the cursor forward past the closer token and
// returns a descriptor; it writes no engine state). The closer-side
// analogue of tokenizeOpener.
//
// PARAMETERS:
//   cursor — positioned at the `<` of a `</>` or `</name>` closer (the
//            caller has verified recognizeCloserForm is non-null).
//
// The pass, by form:
//   - Inferred `</>` — consume the three characters; span covers `</>`.
//   - Explicit `</name>` — consume `</`, scan the tag-name run, skip
//     trailing whitespace, then a `>` terminates. A missing `>` (EOF
//     before it) is recorded `malformed`.
//
// Returns { ok, form, name, span, malformed } where `name` is "" for an
// inferred closer and the closed tag's name for an explicit one. The
// span is file-absolute (the one-cursor invariant — no offset math).
export function tokenizeCloser(cursor) {
    const source = cursor.source;
    const len = source.length;
    const startPos = cursor.pos;
    const startLine = cursor.line;
    const startCol = cursor.col;

    const form = recognizeCloserForm(cursor);

    if (form === CloserForm.Inferred) {
        // `</>` — three characters, no name, always well-formed.
        advance(cursor, 3);
        return {
            ok:        true,
            form:      CloserForm.Inferred,
            name:      "",
            span:      makeSpan(startPos, cursor.pos, startLine, startCol),
            malformed: false,
        };
    }

    // CloserForm.Explicit — `</name>`. Consume the `</` prelude.
    advance(cursor, 2);

    // The tag-name run. recognizeCloserForm verified a name start follows.
    const nameStart = cursor.pos;
    const nameEnd = scanTagName(source, nameStart);
    const name = source.substring(nameStart, nameEnd);
    advance(cursor, nameEnd - nameStart);

    // Optional whitespace before the `>` (e.g. `</div >`).
    const afterWs = skipOpenerWhitespace(source, cursor.pos);
    advance(cursor, afterWs - cursor.pos);

    // The terminator `>`.
    let malformed = false;
    if (cursor.pos < len && source.charAt(cursor.pos) === closeAngle()) {
        advance(cursor, 1);
    } else {
        // EOF (or a non-`>`) before the terminator — a malformed closer.
        malformed = true;
    }

    return {
        ok:        !malformed,
        form:      CloserForm.Explicit,
        name,
        span:      makeSpan(startPos, cursor.pos, startLine, startCol),
        malformed,
    };
}

// ===========================================================================
// THE DIAGNOSTIC SINK — the markup-layer error stream (MK2.2).
//
// MK2.2 is the first native-parser milestone that PRODUCES a structured
// markup diagnostic — the closer-grammar diagnostics: a mismatched
// explicit closer (E-MARKUP-002), a stray closer with nothing open
// (E-CTX-003), an EOF-unterminated tag (E-CTX-001). M1/MK1 deferred the
// markup diagnostic stream ("a later milestone" — parse-markup MK1.3
// header); the closer-pairing milestone is where it must exist, because
// a mismatch outcome MUST be observable (for conformance + downstream
// stages). The sink is a `ctx.diagnostics` array — the same shape as the
// `ctx.nodes` block sink (parse-ctx). It carries closer-grammar
// diagnostics only at MK2.2; later milestones extend it.
// ===========================================================================

// ensureDiagnostics — STATE write (lazy init). Mirrors
// ensureTagFrameStack — a parse context built before MK2.2 has no
// diagnostics slot; this keeps the helpers total.
export function ensureDiagnostics(ctx) {
    if (ctx.diagnostics === undefined || ctx.diagnostics === null) {
        ctx.diagnostics = [];
    }
}

// makeDiagnostic — calculation (pure data builder). One structured
// markup diagnostic: { code, message, span }.
export function makeDiagnostic(code, message, span) {
    return { code, message, span };
}

// pushDiagnostic — STATE write: append a diagnostic to ctx.diagnostics.
export function pushDiagnostic(ctx, diagnostic) {
    ensureDiagnostics(ctx);
    ctx.diagnostics.push(diagnostic);
}

// ===========================================================================
// THE ErrorRecovery DISPATCH — panic-mode recovery for a closer mismatch.
//
// On a mismatched `</name>` (or a stray closer), MK2.2 dispatches the M1
// `ErrorRecovery` engine — the SAME engine + the SAME panic-mode
// lifecycle (.ParsingNormally -> .AccumulatingSkipped -> .ReSynchronized)
// the JS layer uses, scoped to block grammar. The closer that triggered
// recovery is itself the re-sync token: a closer is a statement-boundary-
// equivalent block-grammar token, so recovery accumulates the offending
// closer as the skipped token and immediately re-synchronizes on it (the
// `ClosingBrace` SyncToken — the closest block-grammar sync class). This
// is the markup-layer analogue of the JS layer re-syncing on `;`.
// ===========================================================================

// dispatchTagMismatchRecovery — STATE write. Drive ctx.recovery through
// the panic-mode lifecycle for a closer mismatch, accumulating `closer`
// (the offending closer descriptor) as the skipped token and re-syncing
// on it. Returns ctx.recovery (re-synchronized) so the caller can
// observe the recovery outcome.
export function dispatchTagMismatchRecovery(ctx, closer) {
    beginRecovery(ctx.recovery);
    accumulateSkipped(ctx.recovery, closer);
    markResync(ctx.recovery, SyncToken.ClosingBrace);
    // The closer is a single re-sync point — recovery completes here; the
    // trampoline resumes normal parsing immediately after the closer.
    resumeNormal(ctx.recovery);
    return ctx.recovery;
}

// ===========================================================================
// closeTagFrame — the MK2.2 closer-side entry point: the opener/closer
// PAIRING. STATE transition at its own locus (it pops the matching
// TagFrame — a @tagFrame `.Open* -> .Closed` transition — and, on a
// mismatch, drives ErrorRecovery + the diagnostic sink).
//
// PARAMETERS:
//   ctx    — the parse context (carries ctx.tagFrameStack +
//            ctx.diagnostics + ctx.recovery).
//   closer — the closer descriptor from tokenizeCloser (form + name +
//            span). For a `/>` self-close the caller passes a synthetic
//            descriptor { form: .SelfClosing, name, span } — see
//            closeSelfClosedFrame.
//
// THE PAIRING LOGIC (charter Q1.F rule= contract):
//   - `</>` inferred — pops the innermost open tag REGARDLESS of name.
//     A non-empty stack pop always succeeds; an empty stack is a stray
//     closer (E-CTX-003).
//   - `</name>` explicit — the innermost open tag's name MUST be `name`.
//     A match pops it. A mismatch is E-MARKUP-002: dispatch ErrorRecovery,
//     record the diagnostic, and recover by NOT popping (the open tag
//     stays — the mismatched closer is treated as skipped, the trampoline
//     resumes; the open tag will be paired by a later correct closer or
//     surface as unterminated at EOF). An empty stack is a stray closer
//     (E-CTX-003).
//
// Returns { ok, popped, code } — `popped` is the closed TagFrame (null on
// a mismatch / stray closer) and `code` is the diagnostic code (null on a
// clean close). The `ok` flag is true only for a clean close.
export function closeTagFrame(ctx, closer) {
    ensureTagFrameStack(ctx);
    const top = topTagFrame(ctx);

    // A stray closer — the stack is empty, there is no open tag to close.
    if (top === null) {
        const code = "E-CTX-003";
        pushDiagnostic(ctx, makeDiagnostic(
            code,
            "Closer with no matching open tag.",
            closer.span,
        ));
        dispatchTagMismatchRecovery(ctx, closer);
        return { ok: false, popped: null, code };
    }

    // An explicit `</name>` whose name does NOT match the innermost open
    // tag — E-MARKUP-002. Dispatch ErrorRecovery; do NOT pop (recover by
    // skipping the mismatched closer).
    if (closer.form === CloserForm.Explicit && closer.name !== top.name) {
        const code = "E-MARKUP-002";
        pushDiagnostic(ctx, makeDiagnostic(
            code,
            "Explicit closer </" + closer.name + "> does not match the open tag <" + top.name + ">.",
            closer.span,
        ));
        dispatchTagMismatchRecovery(ctx, closer);
        return { ok: false, popped: null, code };
    }

    // A clean close — `</>` inferred (any name), `</name>` matching, or a
    // `/>` self-close. Pop the matching frame: the `.Open* -> .Closed`
    // @tagFrame transition.
    const popped = popTagFrame(ctx);
    return { ok: true, popped, code: null };
}

// closeSelfClosedFrame — STATE transition. The lifecycle completion for a
// `/>` self-closing opener (SPEC §4.14). MK2.1's recognizeOpener pushes
// an .OpenSelfClosed frame; a self-closed tag has no separate closer
// token, so the frame closes IMMEDIATELY — at the opener. This pops the
// just-pushed .OpenSelfClosed frame (the `.OpenSelfClosed -> .Closed`
// @tagFrame transition per the Q1.F rule= contract). Returns the popped
// frame, or null if the top frame was not an .OpenSelfClosed (defensive).
export function closeSelfClosedFrame(ctx) {
    ensureTagFrameStack(ctx);
    const top = topTagFrame(ctx);
    if (top === null) return null;
    if (top.kind !== TagFrameKind.OpenSelfClosed) return null;
    return popTagFrame(ctx);
}

// reportUnterminatedTags — STATE write. At EOF, every TagFrame still on
// the stack is an unterminated tag (the opener was never paired with a
// closer) — SPEC §4 (line 1072) E-CTX-001. One diagnostic per
// still-open frame, blamed at the opener's span. Returns the count of
// unterminated tags reported. The trampoline calls this once at EOF.
export function reportUnterminatedTags(ctx) {
    ensureTagFrameStack(ctx);
    let count = 0;
    let i = 0;
    while (i < ctx.tagFrameStack.length) {
        const frame = ctx.tagFrameStack[i];
        // An .OpenSelfClosed frame on the stack at EOF means a self-close
        // whose lifecycle was never completed by the trampoline — still
        // an unterminated tag; blame the opener span. .OpenExpectingChildren
        // is the ordinary unterminated case.
        pushDiagnostic(ctx, makeDiagnostic(
            "E-CTX-001",
            "Unterminated tag <" + frame.name + "> — no closer before end of input.",
            frame.span,
        ));
        count = count + 1;
        i = i + 1;
    }
    return count;
}
