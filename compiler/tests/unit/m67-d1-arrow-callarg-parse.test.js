// m67-d1-arrow-callarg-parse.test.js — M6.7-D1 FIX-NATIVE.
//
// ROOT CAUSE (Phase-0 verified — see
// docs/changes/m67-phase-a-flag-flip/d1-arrow-callarg.md):
//   The native-flip `unexpected token — no statement begins here` cluster
//   (parse-stmt.js:457) was NOT an arrow-function gap (the original diagnostic
//   bucket label). Arrows — single-ident, paren-param, block-body-as-BlockStub,
//   object-literal concise body, block-body-in-call-arg — ALL parse clean under
//   the native parser. The DOMINANT real trigger was the `null` / `undefined`
//   literal keywords in expression position: the lexer emits KwNull / KwUndefined
//   (token.js:197-198) but parsePrimary (parse-expr.js) had NO arm for them, so
//   they fell through to E-EXPR-UNEXPECTED, which stranded the cursor and
//   cascaded to the statement-level `no statement begins here`.
//
//   scrml SOURCE has no `null`/`undefined` (the absence value is `not`, §42),
//   but the live/Acorn pipeline ACCEPTS them (self-host + stdlib internals use
//   JS-host `null` heavily) and maps:
//     null      -> lit  { raw:"null", value:null, litType:"not" }
//     undefined -> ident{ name:"undefined" }
//   (esTreeToExprNode, expression-parser.ts:1349-1405). Native MUST match — this
//   is parity-COMPLETENESS for a form live already accepts, not a subset
//   expansion. The forbidden-token (E-SYNTAX-042) detector still keys off the
//   `raw:"null"`/`"undefined"` provenance, so user-source `null` is unaffected.
//
// THE FIX:
//   - parse-expr.js parsePrimary: KwNull -> makeNotValue(span,"null");
//     KwUndefined -> makeIdent("undefined", span).
//   - ast-expr.js makeNotValue(span, raw): NotValue atom now carries `raw`
//     (default "not"); KwNull supplies "null".
//   - translate-expr.js NotValue arm: passes `raw` through to the live lit.
//
// These tests drive the native parser + bridge directly (Acorn = oracle) and
// assert (a) the previously-failing forms now parse with ZERO errors and
// (b) the bridged catalog node MATCHES the live esTreeToExprNode shape.

import { describe, test, expect } from "bun:test";
import * as acorn from "acorn";

import { lex } from "../../native-parser/lex.js";
import { parseExpr } from "../../native-parser/parse-expr.js";
import { parseProgram } from "../../native-parser/parse-stmt.js";
import { translateExpr } from "../../native-parser/translate-expr.js";
import { ExprKind } from "../../native-parser/ast-expr.js";
import { esTreeToExprNode } from "../../src/expression-parser.ts";

const SPAN = { file: "m67-d1.scrml", start: 0, end: 1, line: 1, col: 1 };

// Drive the native EXPRESSION parser for one source string.
function nativeExpr(src) {
    return parseExpr(lex(src));
}

// Drive the native STATEMENT parser (parseProgram) for a JS statement body —
// this is the surface that emits `no statement begins here`.
function nativeProgram(src) {
    return parseProgram(lex(src), src);
}

// The live catalog node Acorn + esTreeToExprNode produce for an expression —
// the parity ORACLE.
function liveCatalog(src) {
    const est = acorn.parseExpressionAt(src, 0, { ecmaVersion: 2025 });
    return esTreeToExprNode(est, SPAN.file, 0, src);
}

// Strip volatile fields (span/id) so only the structural shape is compared.
function shape(node) {
    if (node === null || typeof node !== "object") return node;
    if (Array.isArray(node)) return node.map(shape);
    const out = {};
    for (const k of Object.keys(node)) {
        if (k === "span" || k === "spans" || k === "id" || k === "_sourceText") continue;
        out[k] = shape(node[k]);
    }
    return out;
}

describe("M6.7-D1 — null/undefined primary atoms (native-flip cluster root cause)", () => {
    // ----- the previously-failing forms now parse with ZERO errors -----
    const formerlyFailing = {
        "bare null":               `null`,
        "bare undefined":          `undefined`,
        "ne-null ternary":         `decl.raw != null ? decl.raw : ""`,
        "eq-null ternary":         `a == null ? b : c`,
        "strict-ne-null":          `a !== null ? a : b`,
        "ne-undefined":            `a != undefined ? a : b`,
        "null in object literal":  `{ name: y, error: null }`,
        "null in array":           `[null, 1, 2]`,
        "null as call argument":   `foo(null)`,
        "undefined as call arg":   `foo(undefined)`,
        "null in arrow body":      `x => x != null ? x : 0`,
    };

    for (const [label, src] of Object.entries(formerlyFailing)) {
        test(`expr parses with no error: ${label}`, () => {
            const r = nativeExpr(src);
            expect(r.errors.length).toBe(0);
            expect(r.ast).not.toBeNull();
        });
    }

    // ----- the statement-level cascade is gone -----
    const stmtForms = {
        "const null-ternary":      `const x = decl.raw != null ? decl.raw : ""`,
        "return null":             `function f() { return null }`,
        "let null":                `let renders = null`,
        "obj null field":          `const v = { name: n, payload: null }`,
        "undefined ternary stmt":  `const u = y != undefined ? y : 0`,
    };
    for (const [label, src] of Object.entries(stmtForms)) {
        test(`statement parses without 'no statement begins here': ${label}`, () => {
            const r = nativeProgram(src);
            const nsbh = r.errors.filter(
                (e) => /no statement begins here/i.test(JSON.stringify(e)));
            expect(nsbh.length).toBe(0);
            expect(r.errors.length).toBe(0);
            // Acorn (oracle) accepts the same source.
            expect(() => acorn.parse(src, { ecmaVersion: 2025, sourceType: "module" }))
                .not.toThrow();
        });
    }

    // ----- native node-kind: null -> NotValue(raw "null"), undefined -> Ident -----
    test("native `null` is a NotValue atom carrying raw 'null'", () => {
        const r = nativeExpr(`null`);
        expect(r.errors.length).toBe(0);
        expect(r.ast.kind).toBe(ExprKind.NotValue);
        expect(r.ast.raw).toBe("null");
    });

    test("native `undefined` is an Ident atom named 'undefined'", () => {
        const r = nativeExpr(`undefined`);
        expect(r.errors.length).toBe(0);
        expect(r.ast.kind).toBe(ExprKind.Ident);
        expect(r.ast.name).toBe("undefined");
    });

    test("canonical `not` still defaults raw to 'not' (no regression)", () => {
        const r = nativeExpr(`not`);
        expect(r.errors.length).toBe(0);
        expect(r.ast.kind).toBe(ExprKind.NotValue);
        expect(r.ast.raw).toBe("not");
    });

    // ----- bridged catalog node MATCHES the live esTreeToExprNode shape -----
    test("bridge: native `null` -> live lit{raw:'null',value:null,litType:'not'}", () => {
        const bridged = shape(translateExpr(nativeExpr(`null`).ast));
        const live = shape(liveCatalog(`null`));
        expect(live).toEqual({ kind: "lit", raw: "null", value: null, litType: "not" });
        expect(bridged).toEqual(live);
    });

    test("bridge: native `undefined` -> live ident{name:'undefined'}", () => {
        const bridged = shape(translateExpr(nativeExpr(`undefined`).ast));
        const live = shape(liveCatalog(`undefined`));
        expect(live).toEqual({ kind: "ident", name: "undefined" });
        expect(bridged).toEqual(live);
    });

    test("bridge: canonical `not` -> live lit{raw:'not',value:null,litType:'not'}", () => {
        const bridged = shape(translateExpr(nativeExpr(`not`).ast));
        const live = shape(liveCatalog(`not`));
        expect(live).toEqual({ kind: "lit", raw: "not", value: null, litType: "not" });
        expect(bridged).toEqual(live);
    });

    test("bridge parity inside a ternary: `a != null ? a : b`", () => {
        const bridged = shape(translateExpr(nativeExpr(`a != null ? a : b`).ast));
        const live = shape(liveCatalog(`a != null ? a : b`));
        expect(bridged).toEqual(live);
    });
});
