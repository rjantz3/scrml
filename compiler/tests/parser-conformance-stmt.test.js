// parser-conformance-stmt.test.js — statement-parser conformance suite (M3.1).
//
// Per scrml-native-parser-design-2026-05-17.md §D6 + §D7 M3 gating:
//   "Conformance Tier 1+2 PASS on the full statement subset ... Tier 1 —
//    node-kind sequence ... Tier 2 — identifier / literal values."
//
// Scope (M3.1 — the FIRST sub-step of M3, the JS statement parser):
//   STATEMENT SUBSTRATE — variable declarations let/const/var (incl. object
//   + array destructuring binding patterns), expression statements (with
//   automatic semicolon insertion), block statements { }, the empty
//   statement ;. PLUS the BlockStub re-entry mechanism — M2.3/M2.4 left
//   function/arrow/match-arm block bodies as BlockStub Expr nodes; M3.1
//   re-parses them into a real Stmt list.
//
// The native statement parser (compiler/native-parser/parse-stmt.js) parses
// a token stream as a program body. This test runs a micro-corpus through
// both the native parser and Acorn (the conformance ORACLE per §D6 — never
// the design template) and asserts:
//   Tier 1 — the node-kind SEQUENCE produced by a tree walk matches.
//   Tier 2 — identifier names + literal values at corresponding positions
//            match.
//
// Control-flow statements (M3.2), function/class declarations + import/export
// + try/throw (M3.3), and error-recovery integration (M3.4) are LATER
// sub-steps — NOT exercised here (a corpus statement that begins with one of
// those keyword leads records a forward-seam diagnostic by design).
//
// This file MIRRORS parser-conformance-expr.test.js's structure. The
// statement-tree expression sub-grammar is M2's; the expression normalizer
// below covers exactly the simple expression shapes the M3.1 corpus uses
// (identifiers, literals, calls, member access, the small operator set).

import { describe, test, expect } from "bun:test";
import * as acorn from "acorn";

import { lex as scrmlNativeLex } from "../native-parser/lex.js";
import { parseProgram as scrmlNativeParseProgram } from "../native-parser/parse-stmt.js";
import { parseBlockStubBody, reenterBlockStubs } from "../native-parser/parse-stmt.js";
import { parseExpr as scrmlNativeParseExpr } from "../native-parser/parse-expr.js";
import { StmtKind, BindingKind } from "../native-parser/ast-stmt.js";
import { ExprKind } from "../native-parser/ast-expr.js";

const ACORN_OPTS = {
    ecmaVersion: 2025,
    sourceType:  "module",
};

// -----------------------------------------------------------------------------
// nativeExprToEstree — normalize a native Expr node into an ESTree-shaped
// node. The M3.1 statement corpus uses only simple expression shapes; this
// normalizer covers exactly those (identifiers, literals, call/member, the
// small operator set). The exhaustive expression normalizer lives in
// parser-conformance-expr.test.js — this is the M3.1-corpus subset.
// -----------------------------------------------------------------------------
function nativeExprToEstree(node) {
    if (node === undefined || node === null) return null;

    if (node.kind === ExprKind.Ident) {
        return { type: "Identifier", name: node.name };
    }
    if (node.kind === ExprKind.NumberLit) {
        return { type: "Literal", value: node.value, raw: node.raw };
    }
    if (node.kind === ExprKind.StringLit) {
        return { type: "Literal", value: node.value, raw: node.raw };
    }
    if (node.kind === ExprKind.BoolLit) {
        return { type: "Literal", value: node.value, raw: node.value ? "true" : "false" };
    }
    if (node.kind === ExprKind.Paren) {
        // Acorn produces no paren node — unwrap.
        return nativeExprToEstree(node.expression);
    }
    if (node.kind === ExprKind.Array) {
        return {
            type: "ArrayExpression",
            elements: node.elements.map((el) => {
                if (el.kind === "Hole") return null;
                if (el.kind === "Spread") {
                    return { type: "SpreadElement", argument: nativeExprToEstree(el.expression) };
                }
                return nativeExprToEstree(el.expression);
            }),
        };
    }
    if (node.kind === ExprKind.Object) {
        return {
            type: "ObjectExpression",
            properties: node.properties.map((p) => {
                if (p.kind === "Spread") {
                    return { type: "SpreadElement", argument: nativeExprToEstree(p.expression) };
                }
                if (p.kind === "Shorthand") {
                    return {
                        type: "Property", shorthand: true, computed: false,
                        key: { type: "Identifier", name: p.name },
                        value: { type: "Identifier", name: p.name },
                    };
                }
                return {
                    type: "Property", shorthand: false, computed: p.computed === true,
                    key: nativeExprToEstree(p.key),
                    value: nativeExprToEstree(p.value),
                };
            }),
        };
    }
    if (node.kind === ExprKind.Binary) {
        return {
            type: "BinaryExpression", operator: node.op,
            left: nativeExprToEstree(node.left),
            right: nativeExprToEstree(node.right),
        };
    }
    if (node.kind === ExprKind.Logical) {
        return {
            type: "LogicalExpression", operator: node.op,
            left: nativeExprToEstree(node.left),
            right: nativeExprToEstree(node.right),
        };
    }
    if (node.kind === ExprKind.Assignment) {
        return {
            type: "AssignmentExpression", operator: node.op,
            left: nativeExprToEstree(node.target),
            right: nativeExprToEstree(node.value),
        };
    }
    if (node.kind === ExprKind.Unary) {
        return {
            type: "UnaryExpression", operator: node.op, prefix: node.prefix === true,
            argument: nativeExprToEstree(node.operand),
        };
    }
    if (node.kind === ExprKind.Update) {
        return {
            type: "UpdateExpression", operator: node.op, prefix: node.prefix === true,
            argument: nativeExprToEstree(node.operand),
        };
    }
    if (node.kind === ExprKind.Member) {
        return {
            type: "MemberExpression",
            object: nativeExprToEstree(node.object),
            property: nativeExprToEstree(node.property),
            computed: node.computed === true,
            optional: node.optional === true,
        };
    }
    if (node.kind === ExprKind.Call) {
        return {
            type: "CallExpression",
            callee: nativeExprToEstree(node.callee),
            arguments: node.args.map(nativeExprToEstree),
            optional: node.optional === true,
        };
    }
    // Any expression shape the M3.1 corpus does not exercise — projected as a
    // generic node so the walk still terminates. The M3.1 corpus is curated
    // so this branch is not reached on a clean parse.
    return { type: "UnknownExpr", kind: node.kind };
}

// nativeBindingToEstree — normalize a native binding node (ast-stmt's binding
// catalog) into an ESTree binding/pattern node. ESTree's pattern shapes:
//   Ident             -> Identifier
//   ObjectPat         -> ObjectPattern  (Property / RestElement)
//   ArrayPat          -> ArrayPattern   (element / null hole / RestElement)
//   AssignmentPattern -> AssignmentPattern { left, right }
//   RestElement       -> RestElement    { argument }
function nativeBindingToEstree(node) {
    if (node === undefined || node === null) return null;

    if (node.bindingKind === BindingKind.Ident) {
        return { type: "Identifier", name: node.name };
    }
    if (node.bindingKind === "AssignmentPattern") {
        return {
            type: "AssignmentPattern",
            left: nativeBindingToEstree(node.left),
            right: nativeExprToEstree(node.right),
        };
    }
    if (node.bindingKind === "RestElement") {
        return { type: "RestElement", argument: nativeBindingToEstree(node.argument) };
    }
    if (node.bindingKind === BindingKind.ObjectPat) {
        return {
            type: "ObjectPattern",
            properties: node.properties.map((p) => {
                if (p.propertyKind === "Rest") {
                    return { type: "RestElement", argument: nativeBindingToEstree(p.argument) };
                }
                if (p.propertyKind === "Shorthand") {
                    return {
                        type: "Property", shorthand: true, computed: false, kind: "init",
                        key: { type: "Identifier", name: p.name },
                        value: nativeBindingToEstree(p.value),
                    };
                }
                return {
                    type: "Property", shorthand: false, computed: p.computed === true, kind: "init",
                    key: nativeExprToEstree(p.key),
                    value: nativeBindingToEstree(p.value),
                };
            }),
        };
    }
    if (node.bindingKind === BindingKind.ArrayPat) {
        return {
            type: "ArrayPattern",
            elements: node.elements.map((el) => {
                if (el.elementKind === "Hole") return null;
                if (el.elementKind === "Rest") {
                    return { type: "RestElement", argument: nativeBindingToEstree(el.argument) };
                }
                return nativeBindingToEstree(el.value);
            }),
        };
    }
    return { type: "UnknownBinding", bindingKind: node.bindingKind };
}

// -----------------------------------------------------------------------------
// nativeStmtToEstree — normalize a native Stmt node into an ESTree-shaped node.
//   Block    -> BlockStatement     { body }
//   ExprStmt -> ExpressionStatement { expression }
//   Empty    -> EmptyStatement
//   VarDecl  -> VariableDeclaration { kind, declarations:[VariableDeclarator] }
// -----------------------------------------------------------------------------
function nativeStmtToEstree(node) {
    if (node === undefined || node === null) return null;

    if (node.kind === StmtKind.Block) {
        return { type: "BlockStatement", body: node.body.map(nativeStmtToEstree) };
    }
    if (node.kind === StmtKind.ExprStmt) {
        return { type: "ExpressionStatement", expression: nativeExprToEstree(node.expression) };
    }
    if (node.kind === StmtKind.Empty) {
        return { type: "EmptyStatement" };
    }
    if (node.kind === StmtKind.VarDecl) {
        return {
            type: "VariableDeclaration",
            kind: node.declKind,
            declarations: node.declarations.map((d) => ({
                type: "VariableDeclarator",
                id: nativeBindingToEstree(d.target),
                init: (d.init === undefined || d.init === null)
                    ? null : nativeExprToEstree(d.init),
            })),
        };
    }
    return { type: "UnknownStmt", kind: node.kind };
}

// nativeProgramToEstree — wrap a native program body (a Stmt array) as an
// ESTree Program node so the corpus walk compares apples-to-apples.
function nativeProgramToEstree(body) {
    return { type: "Program", body: body.map(nativeStmtToEstree) };
}

// -----------------------------------------------------------------------------
// nodeKindSequence — Tier 1. Pre-order tree walk collecting node `type`
// strings. A mismatch is a structural divergence (E-CONFORMANCE-1).
// -----------------------------------------------------------------------------
function nodeKindSequence(node, out) {
    const acc = out ?? [];
    if (node === undefined || node === null) return acc;
    if (typeof node !== "object" || typeof node.type !== "string") return acc;

    acc.push(node.type);

    if (node.type === "Program" || node.type === "BlockStatement") {
        for (const s of node.body) nodeKindSequence(s, acc);
    } else if (node.type === "ExpressionStatement") {
        nodeKindSequence(node.expression, acc);
    } else if (node.type === "VariableDeclaration") {
        for (const d of node.declarations) nodeKindSequence(d, acc);
    } else if (node.type === "VariableDeclarator") {
        nodeKindSequence(node.id, acc);
        if (node.init) nodeKindSequence(node.init, acc);
    } else if (node.type === "ObjectPattern" || node.type === "ObjectExpression") {
        for (const p of node.properties) nodeKindSequence(p, acc);
    } else if (node.type === "ArrayPattern" || node.type === "ArrayExpression") {
        for (const el of node.elements) {
            if (el !== null) nodeKindSequence(el, acc);
        }
    } else if (node.type === "Property") {
        if (!node.shorthand) nodeKindSequence(node.key, acc);
        nodeKindSequence(node.value, acc);
    } else if (node.type === "AssignmentPattern") {
        nodeKindSequence(node.left, acc);
        nodeKindSequence(node.right, acc);
    } else if (node.type === "RestElement") {
        nodeKindSequence(node.argument, acc);
    } else if (node.type === "SpreadElement") {
        nodeKindSequence(node.argument, acc);
    } else if (node.type === "BinaryExpression" || node.type === "LogicalExpression"
               || node.type === "AssignmentExpression") {
        nodeKindSequence(node.left, acc);
        nodeKindSequence(node.right, acc);
    } else if (node.type === "UnaryExpression" || node.type === "UpdateExpression") {
        nodeKindSequence(node.argument, acc);
    } else if (node.type === "MemberExpression") {
        nodeKindSequence(node.object, acc);
        nodeKindSequence(node.property, acc);
    } else if (node.type === "CallExpression") {
        nodeKindSequence(node.callee, acc);
        for (const a of node.arguments) nodeKindSequence(a, acc);
    }
    return acc;
}

// -----------------------------------------------------------------------------
// valueSequence — Tier 2. Walk the same tree, collect identifier names +
// literal values + the var-declaration keyword + the operator strings, in the
// same pre-order. A mismatch is a value divergence (E-CONFORMANCE-2).
// -----------------------------------------------------------------------------
function valueSequence(node, out) {
    const acc = out ?? [];
    if (node === undefined || node === null) return acc;
    if (typeof node !== "object" || typeof node.type !== "string") return acc;

    if (node.type === "Identifier") {
        acc.push("id:" + node.name);
    } else if (node.type === "Literal") {
        acc.push("lit:" + JSON.stringify(node.value));
    } else if (node.type === "VariableDeclaration") {
        acc.push("varkind:" + node.kind);
    } else if (node.type === "BinaryExpression" || node.type === "LogicalExpression"
               || node.type === "AssignmentExpression" || node.type === "UnaryExpression"
               || node.type === "UpdateExpression") {
        acc.push("op:" + node.operator);
    } else if (node.type === "MemberExpression") {
        acc.push("member:computed=" + (node.computed === true));
    } else if (node.type === "CallExpression") {
        acc.push("call");
    }

    if (node.type === "Program" || node.type === "BlockStatement") {
        for (const s of node.body) valueSequence(s, acc);
    } else if (node.type === "ExpressionStatement") {
        valueSequence(node.expression, acc);
    } else if (node.type === "VariableDeclaration") {
        for (const d of node.declarations) valueSequence(d, acc);
    } else if (node.type === "VariableDeclarator") {
        valueSequence(node.id, acc);
        if (node.init) valueSequence(node.init, acc);
    } else if (node.type === "ObjectPattern" || node.type === "ObjectExpression") {
        for (const p of node.properties) valueSequence(p, acc);
    } else if (node.type === "ArrayPattern" || node.type === "ArrayExpression") {
        for (const el of node.elements) {
            if (el !== null) valueSequence(el, acc);
        }
    } else if (node.type === "Property") {
        if (!node.shorthand) valueSequence(node.key, acc);
        valueSequence(node.value, acc);
    } else if (node.type === "AssignmentPattern") {
        valueSequence(node.left, acc);
        valueSequence(node.right, acc);
    } else if (node.type === "RestElement" || node.type === "SpreadElement") {
        valueSequence(node.argument, acc);
    } else if (node.type === "BinaryExpression" || node.type === "LogicalExpression"
               || node.type === "AssignmentExpression") {
        valueSequence(node.left, acc);
        valueSequence(node.right, acc);
    } else if (node.type === "UnaryExpression" || node.type === "UpdateExpression") {
        valueSequence(node.argument, acc);
    } else if (node.type === "MemberExpression") {
        valueSequence(node.object, acc);
        valueSequence(node.property, acc);
    } else if (node.type === "CallExpression") {
        valueSequence(node.callee, acc);
        for (const a of node.arguments) valueSequence(a, acc);
    }
    return acc;
}

function parseWithAcorn(source) {
    try {
        const ast = acorn.parse(source, ACORN_OPTS);
        return { ok: true, ast };
    } catch (e) {
        return { ok: false, error: e && e.message ? e.message : String(e) };
    }
}

function parseWithNative(source) {
    try {
        const result = scrmlNativeParseProgram(scrmlNativeLex(source));
        return { ok: true, body: result.body, errors: result.errors };
    } catch (e) {
        return { ok: false, error: e && e.message ? e.message : String(e) };
    }
}

// -----------------------------------------------------------------------------
// Acorn-comparable statement micro-corpus. Every entry is a program built
// only from M3.1 substrate statements (declarations, blocks, expression
// statements, the empty statement) — so raw Acorn parses it and the
// native-vs-Acorn Tier 1+2 diff is meaningful.
// -----------------------------------------------------------------------------
const ACORN_CORPUS = [
    // --- the empty statement ---
    { name: "empty statement",                 src: ";" },
    { name: "two empty statements",            src: ";;" },

    // --- expression statements ---
    { name: "expr stmt — identifier",          src: "foo;" },
    { name: "expr stmt — call",                src: "doThing();" },
    { name: "expr stmt — call with args",      src: "add(1, 2);" },
    { name: "expr stmt — binary",              src: "a + b;" },
    { name: "expr stmt — assignment",          src: "x = 1;" },
    { name: "expr stmt — member call",         src: "obj.method();" },
    { name: "expr stmt — number literal",      src: "42;" },
    { name: "expr stmt — string literal",      src: '"hello";' },
    { name: "expr stmt — update",              src: "i++;" },

    // --- ASI — no explicit semicolon ---
    { name: "ASI — bare identifier",           src: "foo" },
    { name: "ASI — two stmts on two lines",    src: "a\nb" },
    { name: "ASI — call then call",            src: "first()\nsecond()" },
    { name: "ASI — decl then decl",            src: "let x = 1\nlet y = 2" },

    // --- let / const / var declarations ---
    { name: "let — single declarator",         src: "let x = 1;" },
    { name: "let — no initializer",            src: "let x;" },
    { name: "const — single declarator",       src: "const k = 9;" },
    { name: "var — single declarator",         src: "var v = 0;" },
    { name: "let — two declarators",           src: "let a = 1, b = 2;" },
    { name: "let — three declarators",         src: "let p = 1, q, r = 3;" },
    { name: "const — string init",            src: 'const name = "scrml";' },
    { name: "let — expression init",           src: "let sum = a + b;" },
    { name: "let — call init",                 src: "let r = compute();" },
    { name: "let — array init",                src: "let xs = [1, 2, 3];" },
    { name: "let — object init",               src: "let o = {a: 1};" },

    // --- block statements ---
    { name: "block — empty",                   src: "{}" },
    { name: "block — single stmt",             src: "{ foo(); }" },
    { name: "block — two stmts",               src: "{ a; b; }" },
    { name: "block — declaration inside",      src: "{ let x = 1; }" },
    { name: "block — nested block",            src: "{ { } }" },
    { name: "block — deeply nested",           src: "{ { { x; } } }" },

    // --- object-destructuring declarations ---
    { name: "obj pattern — single",            src: "let {a} = o;" },
    { name: "obj pattern — two",               src: "let {a, b} = o;" },
    { name: "obj pattern — keyed",             src: "let {a: x} = o;" },
    { name: "obj pattern — keyed + shorthand", src: "let {a: x, b} = o;" },
    { name: "obj pattern — default",           src: "let {a = 1} = o;" },
    { name: "obj pattern — keyed default",     src: "let {a: x = 1} = o;" },
    { name: "obj pattern — rest",              src: "let {a, ...rest} = o;" },
    { name: "obj pattern — string key",        src: 'let {"k": v} = o;' },
    { name: "obj pattern — nested object",     src: "let {a: {b}} = o;" },
    { name: "obj pattern — nested array",      src: "let {a: [b]} = o;" },

    // --- array-destructuring declarations ---
    { name: "arr pattern — single",            src: "let [a] = xs;" },
    { name: "arr pattern — two",               src: "let [a, b] = xs;" },
    { name: "arr pattern — hole",              src: "let [a, , c] = xs;" },
    { name: "arr pattern — leading hole",      src: "let [, b] = xs;" },
    { name: "arr pattern — default",           src: "let [a = 0] = xs;" },
    { name: "arr pattern — rest",              src: "let [a, ...tail] = xs;" },
    { name: "arr pattern — nested array",      src: "let [[a], [b]] = xs;" },
    { name: "arr pattern — nested object",     src: "let [{a}, {b}] = xs;" },

    // --- mixed multi-statement programs ---
    { name: "program — decl + expr + block",   src: "let x = 1; foo(); { bar(); }" },
    { name: "program — two decls + block",     src: "const a = 1; let b = 2; { a; }" },
    { name: "program — empties between",       src: "foo(); ; bar();" },
];

describe("M3.1 statement-parser conformance — Tier 1 (node-kind sequence)", () => {
    for (const c of ACORN_CORPUS) {
        test(`(tier1) ${c.name} — ${c.src}`, () => {
            const a = parseWithAcorn(c.src);
            const n = parseWithNative(c.src);

            expect(a.ok).toBe(true);
            expect(n.ok).toBe(true);
            // The native parser must report NO diagnostics on a clean
            // M3.1-substrate program.
            expect(n.errors).toEqual([]);

            const acornSeq = nodeKindSequence(a.ast);
            const nativeSeq = nodeKindSequence(nativeProgramToEstree(n.body));
            expect(nativeSeq).toEqual(acornSeq);
        });
    }
});

describe("M3.1 statement-parser conformance — Tier 2 (identifier / literal values)", () => {
    for (const c of ACORN_CORPUS) {
        test(`(tier2) ${c.name} — ${c.src}`, () => {
            const a = parseWithAcorn(c.src);
            const n = parseWithNative(c.src);

            expect(a.ok).toBe(true);
            expect(n.ok).toBe(true);

            const acornVals = valueSequence(a.ast);
            const nativeVals = valueSequence(nativeProgramToEstree(n.body));
            expect(nativeVals).toEqual(acornVals);
        });
    }
});

// -----------------------------------------------------------------------------
// M3.1 statement-parser — native AST shape. Asserts the native Stmt node
// shapes directly (not via the Acorn diff) — kind tags, declaration kind,
// binding-pattern structure.
// -----------------------------------------------------------------------------
describe("M3.1 statement-parser — native Stmt node shape", () => {
    test("empty statement — Empty node", () => {
        const r = parseWithNative(";");
        expect(r.ok).toBe(true);
        expect(r.body.length).toBe(1);
        expect(r.body[0].kind).toBe(StmtKind.Empty);
    });

    test("expression statement — ExprStmt wrapping an Expr", () => {
        const r = parseWithNative("foo();");
        expect(r.body[0].kind).toBe(StmtKind.ExprStmt);
        expect(r.body[0].expression.kind).toBe(ExprKind.Call);
    });

    test("block statement — Block with a Stmt body array", () => {
        const r = parseWithNative("{ a; b; }");
        expect(r.body[0].kind).toBe(StmtKind.Block);
        expect(r.body[0].body.length).toBe(2);
        expect(r.body[0].body[0].kind).toBe(StmtKind.ExprStmt);
    });

    test("var declaration — VarDecl carries declKind + declarators", () => {
        const r = parseWithNative("let x = 1, y = 2;");
        const decl = r.body[0];
        expect(decl.kind).toBe(StmtKind.VarDecl);
        expect(decl.declKind).toBe("let");
        expect(decl.declarations.length).toBe(2);
    });

    test("const / var declKind round-trips", () => {
        expect(parseWithNative("const k = 1;").body[0].declKind).toBe("const");
        expect(parseWithNative("var v = 1;").body[0].declKind).toBe("var");
    });

    test("declarator without initializer — init is absent", () => {
        const r = parseWithNative("let x;");
        const declarator = r.body[0].declarations[0];
        expect(declarator.target.bindingKind).toBe(BindingKind.Ident);
        expect(declarator.target.name).toBe("x");
        expect(declarator.init === null || declarator.init === undefined).toBe(true);
    });

    test("plain identifier binding — BindingIdent target", () => {
        const r = parseWithNative("let count = 0;");
        const declarator = r.body[0].declarations[0];
        expect(declarator.target.bindingKind).toBe(BindingKind.Ident);
        expect(declarator.target.name).toBe("count");
        expect(declarator.init.kind).toBe(ExprKind.NumberLit);
    });

    test("object pattern — ObjectPat with shorthand + keyed + rest", () => {
        const r = parseWithNative("let {a, b: c, ...rest} = o;");
        const target = r.body[0].declarations[0].target;
        expect(target.bindingKind).toBe(BindingKind.ObjectPat);
        expect(target.properties.length).toBe(3);
        expect(target.properties[0].propertyKind).toBe("Shorthand");
        expect(target.properties[1].propertyKind).toBe("KeyValue");
        expect(target.properties[2].propertyKind).toBe("Rest");
    });

    test("object pattern — shorthand with default is an AssignmentPattern", () => {
        const r = parseWithNative("let {a = 1} = o;");
        const prop = r.body[0].declarations[0].target.properties[0];
        expect(prop.propertyKind).toBe("Shorthand");
        expect(prop.value.bindingKind).toBe("AssignmentPattern");
    });

    test("array pattern — ArrayPat with item + hole + rest", () => {
        const r = parseWithNative("let [a, , ...tail] = xs;");
        const target = r.body[0].declarations[0].target;
        expect(target.bindingKind).toBe(BindingKind.ArrayPat);
        expect(target.elements.length).toBe(3);
        expect(target.elements[0].elementKind).toBe("Item");
        expect(target.elements[1].elementKind).toBe("Hole");
        expect(target.elements[2].elementKind).toBe("Rest");
    });

    test("array pattern — element default is an AssignmentPattern", () => {
        const r = parseWithNative("let [x = 0] = xs;");
        const el = r.body[0].declarations[0].target.elements[0];
        expect(el.elementKind).toBe("Item");
        expect(el.value.bindingKind).toBe("AssignmentPattern");
    });

    test("nested pattern — object pattern inside an array pattern", () => {
        const r = parseWithNative("let [{a}] = xs;");
        const el = r.body[0].declarations[0].target.elements[0];
        expect(el.elementKind).toBe("Item");
        expect(el.value.bindingKind).toBe(BindingKind.ObjectPat);
    });
});

// -----------------------------------------------------------------------------
// M3.1 statement-parser — ASI. Asserts automatic semicolon insertion: a
// statement boundary is accepted at a newline / `}` / EOF without an explicit
// `;`, and that the program splits into the same statement count Acorn produces.
// -----------------------------------------------------------------------------
describe("M3.1 statement-parser — automatic semicolon insertion", () => {
    test("bare identifier with no semicolon — one ExprStmt, no error", () => {
        const r = parseWithNative("foo");
        expect(r.body.length).toBe(1);
        expect(r.body[0].kind).toBe(StmtKind.ExprStmt);
        expect(r.errors).toEqual([]);
    });

    test("two statements separated only by a newline", () => {
        const r = parseWithNative("a\nb");
        expect(r.body.length).toBe(2);
        expect(r.errors).toEqual([]);
    });

    test("declaration ASI at a newline", () => {
        const r = parseWithNative("let x = 1\nlet y = 2");
        expect(r.body.length).toBe(2);
        expect(r.body.every((s) => s.kind === StmtKind.VarDecl)).toBe(true);
        expect(r.errors).toEqual([]);
    });

    test("ASI before a closing brace", () => {
        const r = parseWithNative("{ foo() }");
        expect(r.body[0].kind).toBe(StmtKind.Block);
        expect(r.body[0].body.length).toBe(1);
        expect(r.errors).toEqual([]);
    });

    test("missing semicolon on the same line records E-STMT-MISSING-SEMICOLON", () => {
        // Two expression statements on ONE line with no `;` — no ASI condition
        // holds (same line, next token is not `}` / EOF).
        const r = parseWithNative("foo bar");
        const codes = r.errors.map((e) => e.code);
        expect(codes).toContain("E-STMT-MISSING-SEMICOLON");
    });
});

// -----------------------------------------------------------------------------
// M3.1 statement-parser — BlockStub re-entry (THE load-bearing M3.1
// mechanism). M2.3 left function/arrow block bodies, and M2.4 left match-arm
// block bodies, as BlockStub Expr nodes capturing a token range.
// parseBlockStubBody re-parses any BlockStub into a real Stmt list.
// -----------------------------------------------------------------------------
describe("M3.1 statement-parser — BlockStub re-entry", () => {
    test("arrow block body — re-enters into a Stmt list", () => {
        const e = scrmlNativeParseExpr(scrmlNativeLex("(a, b) => { let s = a + b; foo(s); }"));
        expect(e.ast.kind).toBe(ExprKind.Arrow);
        expect(e.ast.body.kind).toBe("BlockStub");

        const re = parseBlockStubBody(e.ast.body);
        expect(re.errors).toEqual([]);
        expect(re.body.length).toBe(2);
        expect(re.body[0].kind).toBe(StmtKind.VarDecl);
        expect(re.body[1].kind).toBe(StmtKind.ExprStmt);
    });

    test("function-expression block body — re-enters into a Stmt list", () => {
        const e = scrmlNativeParseExpr(scrmlNativeLex("function f(x) { let y = x; { y; } }"));
        expect(e.ast.kind).toBe(ExprKind.Function);
        expect(e.ast.body.kind).toBe("BlockStub");

        const re = parseBlockStubBody(e.ast.body);
        expect(re.errors).toEqual([]);
        expect(re.body.length).toBe(2);
        expect(re.body[0].kind).toBe(StmtKind.VarDecl);
        expect(re.body[1].kind).toBe(StmtKind.Block);
    });

    test("empty block body — re-enters into an empty Stmt list", () => {
        const e = scrmlNativeParseExpr(scrmlNativeLex("() => {}"));
        const re = parseBlockStubBody(e.ast.body);
        expect(re.body.length).toBe(0);
        expect(re.errors).toEqual([]);
    });

    test("match-arm block body — re-enters into a Stmt list", () => {
        // M2.4 captures `match` block-form arm bodies as BlockStubs.
        const e = scrmlNativeParseExpr(scrmlNativeLex("match x { .A => { foo(); }, else => bar }"));
        expect(e.ast.kind).toBe(ExprKind.Match);
        const blockArm = e.ast.arms[0];
        expect(blockArm.body.kind).toBe("BlockStub");

        const re = parseBlockStubBody(blockArm.body);
        expect(re.errors).toEqual([]);
        expect(re.body.length).toBe(1);
        expect(re.body[0].kind).toBe(StmtKind.ExprStmt);
    });

    test("nested block inside a block-stub body re-enters correctly", () => {
        const e = scrmlNativeParseExpr(scrmlNativeLex("() => { { let a = 1; } foo(); }"));
        const re = parseBlockStubBody(e.ast.body);
        expect(re.errors).toEqual([]);
        expect(re.body.length).toBe(2);
        expect(re.body[0].kind).toBe(StmtKind.Block);
        expect(re.body[0].body[0].kind).toBe(StmtKind.VarDecl);
        expect(re.body[1].kind).toBe(StmtKind.ExprStmt);
    });

    test("reenterBlockStubs deep-walk — attaches .parsedBody to every stub", () => {
        const e = scrmlNativeParseExpr(scrmlNativeLex("(a) => { let g = (b) => { foo(b); }; }"));
        const count = reenterBlockStubs(e.ast);
        // Two stubs: the outer arrow body + the inner arrow body.
        expect(count).toBe(2);
        expect(Array.isArray(e.ast.body.parsedBody)).toBe(true);
        expect(e.ast.body.parsedBody[0].kind).toBe(StmtKind.VarDecl);

        const innerArrow = e.ast.body.parsedBody[0].declarations[0].init;
        expect(innerArrow.kind).toBe(ExprKind.Arrow);
        expect(Array.isArray(innerArrow.body.parsedBody)).toBe(true);
        expect(innerArrow.body.parsedBody[0].kind).toBe(StmtKind.ExprStmt);
    });

    test("reenterBlockStubs is idempotent — a re-walk re-enters zero stubs", () => {
        const e = scrmlNativeParseExpr(scrmlNativeLex("() => { foo(); }"));
        const first = reenterBlockStubs(e.ast);
        const second = reenterBlockStubs(e.ast);
        expect(first).toBe(1);
        expect(second).toBe(0);
    });

    test("re-entered block-stub body matches Acorn on the body statements", () => {
        // The body of `function f() { let x = 1; g(); }` re-parsed by M3.1
        // must produce the same Stmt sequence as the corresponding standalone
        // program `let x = 1; g();` parsed via parseProgram + Acorn.
        const e = scrmlNativeParseExpr(scrmlNativeLex("function f() { let x = 1; g(); }"));
        const re = parseBlockStubBody(e.ast.body);
        const reEstree = { type: "Program", body: re.body.map(nativeStmtToEstree) };

        const a = parseWithAcorn("let x = 1; g();");
        expect(a.ok).toBe(true);
        expect(nodeKindSequence(reEstree)).toEqual(nodeKindSequence(a.ast));
        expect(valueSequence(reEstree)).toEqual(valueSequence(a.ast));
    });
});

// -----------------------------------------------------------------------------
// M3.1 statement-parser — forward seams. M3.1 does NOT parse control-flow
// (M3.2) or function/class declarations + import/export + try/throw (M3.3).
// A statement that begins with one of those keyword leads records the
// documented forward-seam diagnostic instead of mis-parsing it. This pins the
// M3.2 / M3.3 boundary so a later sub-step (or a corpus file) surfaces the
// seam cleanly.
// -----------------------------------------------------------------------------
describe("M3.1 statement-parser — M3.2 / M3.3 forward seams", () => {
    test("an `if` lead records the M3.2 forward seam", () => {
        const r = parseWithNative("if (a) b;");
        expect(r.errors.map((e) => e.code)).toContain("E-STMT-FORWARD-M3-2");
    });

    test("a `for` lead records the M3.2 forward seam", () => {
        const r = parseWithNative("for (;;) {}");
        expect(r.errors.map((e) => e.code)).toContain("E-STMT-FORWARD-M3-2");
    });

    test("a `while` lead records the M3.2 forward seam", () => {
        const r = parseWithNative("while (a) b;");
        expect(r.errors.map((e) => e.code)).toContain("E-STMT-FORWARD-M3-2");
    });

    test("a `return` lead records the M3.2 forward seam", () => {
        const r = parseWithNative("return x;");
        expect(r.errors.map((e) => e.code)).toContain("E-STMT-FORWARD-M3-2");
    });

    test("a `function` declaration lead records the M3.3 forward seam", () => {
        const r = parseWithNative("function f() {}");
        expect(r.errors.map((e) => e.code)).toContain("E-STMT-FORWARD-M3-3");
    });

    test("a `class` declaration lead records the M3.3 forward seam", () => {
        const r = parseWithNative("class C {}");
        expect(r.errors.map((e) => e.code)).toContain("E-STMT-FORWARD-M3-3");
    });

    test("an `import` lead records the M3.3 forward seam", () => {
        const r = parseWithNative('import x from "m";');
        expect(r.errors.map((e) => e.code)).toContain("E-STMT-FORWARD-M3-3");
    });

    test("a `try` lead records the M3.3 forward seam", () => {
        const r = parseWithNative("try {} catch (e) {}");
        expect(r.errors.map((e) => e.code)).toContain("E-STMT-FORWARD-M3-3");
    });
});

// -----------------------------------------------------------------------------
// M3.1 statement-parser — error paths. The parser records structured
// diagnostics and does NOT throw (the stage contract — diagnostics are
// objects, not exceptions).
// -----------------------------------------------------------------------------
describe("M3.1 statement-parser — error paths (diagnostics, no throw)", () => {
    test("an unclosed block records E-STMT-UNCLOSED-BLOCK", () => {
        const r = parseWithNative("{ foo();");
        expect(r.ok).toBe(true);
        expect(r.errors.map((e) => e.code)).toContain("E-STMT-UNCLOSED-BLOCK");
    });

    test("an unclosed object pattern records E-STMT-UNCLOSED-PATTERN", () => {
        const r = parseWithNative("let {a, b = o;");
        expect(r.ok).toBe(true);
        expect(r.errors.map((e) => e.code)).toContain("E-STMT-UNCLOSED-PATTERN");
    });

    test("an unclosed array pattern records E-STMT-UNCLOSED-PATTERN", () => {
        const r = parseWithNative("let [a, b = xs;");
        expect(r.ok).toBe(true);
        expect(r.errors.map((e) => e.code)).toContain("E-STMT-UNCLOSED-PATTERN");
    });

    test("a non-identifier binding target records E-STMT-BINDING-NAME", () => {
        const r = parseWithNative("let 5 = 1;");
        expect(r.ok).toBe(true);
        expect(r.errors.map((e) => e.code)).toContain("E-STMT-BINDING-NAME");
    });
});
