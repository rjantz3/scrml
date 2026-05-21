// parse-state-body.js — JS-host shadow of parse-state-body.scrml.
// See span.js header for the .scrml<->.js duplication rationale.
// PILLAR 5b classification mirrors parse-state-body.scrml's header.
//
// F7.a / v0.6 BRIDGE-FULL — the native-parser analogue of the live
// pipeline's state-block payload shaping (compiler/src/ast-builder.js
// `parseTypedAttributes` ~L1992 + the `buildBlock` `case "state"` arm
// ~L11250). A pure calculation over a native Markup block that the
// markup layer has classified as a STATE opener (`TagKind.StateOpener` —
// the §4.3 `< Ident ...>` space-after-`<` signal).
//
// THE LIVE CONTRACT (the behavioral spec — ast-builder.js):
//   The live BS routes a `< Ident ...>` block to `case "state"`. There:
//     parseTypedAttributes(attrTokens) -> { attrs, typedAttrs, hasTypedDecls }
//   splits the opener's attribute tokens into
//     - attrs[]      — plain AttrNode entries (`name="v"` / `name=v` / bare),
//     - typedAttrs[] — TypedAttrDecl entries from `name(type)` decls:
//                      { name, typeExpr, optional, defaultValue, span }.
//   `hasTypedDecls` is true iff at least one `name(type)` decl appeared.
//   When hasTypedDecls is true the node kind is `state-constructor-def`
//   (§35.2 — a state TYPE declaration); otherwise it is `state` (a state
//   INSTANTIATION). `stateType` is the opener name in both cases.
//
// THE NATIVE NODE-CATALOG ADAPTATION (Phase 0 — M5-divergence-ledger):
//   The native parser does NOT have a dedicated state BlockKind — a
//   `< Ident ...>` element is a `Markup` block whose opener carries
//   `TagKind.StateOpener` (tag-frame.js `tagKindFor`: a space after the
//   `<` returns StateOpener — the same `openerHadSpaceAfterLt` signal the
//   live BS keys `case "state"` off). F1's `tokenizeAttributeRegion`
//   already emits `ATTR_TYPED_DECL` tokens (JSON `{name, typeExpr}`) for
//   `name(type)` decls in a state opener, AND plain `ATTR_NAME`/`ATTR_EQ`/
//   value tokens for ordinary attributes. F7.a is the SHAPING pass: it
//   reads `block.tokenizedAttrs` (the raw ATTR_* stream F1 produced) and
//   `block.attrs` (the F1 AttrNode[] — already excludes the typed decls,
//   since `tokenizeAttributeRegion` pushes a typed decl ONLY to `tokens`,
//   not to `attrs`) and stamps the state payload onto the Markup block:
//     block.stateNodeKind — "state" | "state-constructor-def"
//     block.stateType     — the opener name
//     block.typedAttrs    — TypedAttrDecl[] (empty for a plain `state`)
//   `block.attrs` is left as the F1 AttrNode[] (the live `state` /
//   `state-constructor-def` node's `attrs` field is exactly that — the
//   non-typed attrs). No native<->live translation layer: the stamped
//   fields ARE the live FileAST `StateNode` / `StateConstructorDefNode`
//   payload shape.
//
// The `name(type)` typeExpr split — `?` optional marker + `= default` —
// mirrors `parseTypedAttributes` byte-for-byte (live: an `=` in the
// typeExpr peels the default; a trailing `?` peels the optional marker; a
// default value implies optional).

// =============================================================================
// shapeStateBlock — calculation (pure-ish: mutates the passed Markup block
// in place, the same way emitMarkupElement stamps `.attrs`). Given a Markup
// block whose opener TagKind is StateOpener, derive + stamp the state
// payload. A non-state Markup block (or a missing block) is left untouched.
//
// The stamped fields:
//   block.stateNodeKind — "state-constructor-def" when any `name(type)`
//                          typed decl appeared, else "state".
//   block.stateType     — block.name (the opener name).
//   block.typedAttrs    — TypedAttrDecl[] (empty for a plain `state`).
// =============================================================================
export function shapeStateBlock(block) {
    if (block === undefined || block === null) return block;
    if (block.kind !== "Markup") return block;

    const tokens = Array.isArray(block.tokenizedAttrs) ? block.tokenizedAttrs : [];
    const typedAttrs = parseTypedAttrTokens(tokens);

    block.stateType = typeof block.name === "string" ? block.name : "";
    block.typedAttrs = typedAttrs;
    // §35.2 — a state opener carrying typed `name(type)` decls is a state
    // TYPE declaration (state-constructor-def); otherwise it is a state
    // INSTANTIATION (state).
    block.stateNodeKind = typedAttrs.length > 0 ? "state-constructor-def" : "state";
    return block;
}

// =============================================================================
// isStateBlock — calculation (pure predicate). True iff `block` is a Markup
// block the markup layer classified as a state opener (the `< Ident ...>`
// §4.3 space-after-`<` signal — TagKind.StateOpener). The markup layer
// stamps `block.tagKind` from the opener's TagKind; this is the read-side
// discriminator the M5 swap keys the state-vs-markup routing off.
// =============================================================================
export function isStateBlock(block) {
    if (block === undefined || block === null) return false;
    if (block.kind !== "Markup") return false;
    return block.tagKind === "StateOpener";
}

// =============================================================================
// parseTypedAttrTokens — calculation (pure). Scan an ATTR_* token stream
// for `ATTR_TYPED_DECL` tokens and produce the TypedAttrDecl[] the live
// `parseTypedAttributes` produces. Each ATTR_TYPED_DECL token's `.text` is
// the JSON `{ name, typeExpr }` F1's `tokenizeAttributeRegion` emitted; this
// peels the `= default` and trailing `?` exactly as the live builder does.
//
// A TypedAttrDecl: { name, typeExpr, optional, defaultValue, span }.
//   - defaultValue — the text after `=` in the typeExpr, or null.
//   - optional     — true if the typeExpr ends with `?` OR a default is set.
// =============================================================================
export function parseTypedAttrTokens(tokens) {
    const typedAttrs = [];
    if (tokens === undefined || tokens === null || Array.isArray(tokens) === false) {
        return typedAttrs;
    }
    for (const tok of tokens) {
        if (tok === undefined || tok === null) continue;
        if (tok.kind !== "ATTR_TYPED_DECL") continue;

        let parsed;
        try {
            parsed = JSON.parse(typeof tok.text === "string" ? tok.text : "{}");
        } catch (_e) {
            parsed = { name: "?", typeExpr: "" };
        }
        const name = typeof parsed.name === "string" ? parsed.name : "?";
        const rawTypeExpr = typeof parsed.typeExpr === "string" ? parsed.typeExpr : "";

        const decl = splitTypedAttr(name, rawTypeExpr, tok.span ?? null);
        typedAttrs.push(decl);
    }
    return typedAttrs;
}

// =============================================================================
// splitTypedAttr — calculation (pure). Split a raw `name(type)` typeExpr
// into the TypedAttrDecl shape. Mirrors the live `parseTypedAttributes`
// inner block:
//   1. trim the typeExpr;
//   2. an `=` peels the default value (text after the FIRST `=`);
//   3. a trailing `?` peels the optional marker;
//   4. a default value implies `optional`.
// =============================================================================
export function splitTypedAttr(name, rawTypeExpr, span) {
    let typeExpr = (typeof rawTypeExpr === "string" ? rawTypeExpr : "").trim();
    let defaultValue = null;

    const eqIdx = typeExpr.indexOf("=");
    if (eqIdx !== -1) {
        defaultValue = typeExpr.slice(eqIdx + 1).trim();
        typeExpr = typeExpr.slice(0, eqIdx).trim();
    }

    let optional = false;
    if (typeExpr.endsWith("?")) {
        optional = true;
        typeExpr = typeExpr.slice(0, -1).trim();
    }
    // A default value implies optional (live parity).
    if (defaultValue !== null) {
        optional = true;
    }

    return { name, typeExpr, optional, defaultValue, span };
}
