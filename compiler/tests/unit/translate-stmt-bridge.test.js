// translate-stmt-bridge.test.js — M5-swap Unit R1 — the statement-catalog
// bridge unit tests.
//
// The unit under test is compiler/native-parser/translate-stmt.js's
// `translateStmtList` — the native PascalCase `Stmt[]` -> live lowercase
// `LogicStatement[]` translation. The brief mandates per-kind translation
// unit tests + a corpus diff. This file covers:
//   §1  statement substrate — Empty / Block / ExprStmt / VarDecl
//   §2  control flow — If / While / DoWhile / For / ForIn / ForOf / Return /
//       Break / Continue / Labeled
//   §3  declarations — FunctionDecl / Import / Export / ClassDecl
//   §4  forbidden-vocabulary kinds — Throw / Try
//   §5  scrml-only un-wrap — lift-expr / fail-expr from native Lift / Fail
//   §6  destructuring binding patterns
//   §7  id-stamping + span discipline
//   §8  defensive folds
//   §9  corpus diff — every translated node walks cleanly + carries a live
//       lowercase kind
//
// DRIVER: source -> `lex` -> `parseProgram` -> `translateStmtList`. The native
// parser is the FROM side; `translateStmtList` is the unit under test.

import { describe, test, expect } from "bun:test";

import { lex } from "../../native-parser/lex.js";
import { parseProgram } from "../../native-parser/parse-stmt.js";
import { translateStmtList } from "../../native-parser/translate-stmt.js";

// translate — drive the full source -> native Stmt[] -> live LogicStatement[]
// pipeline. Returns the live `LogicStatement[]`.
function translate(source, idGen) {
    const tokens = lex(source);
    const program = parseProgram(tokens);
    return translateStmtList(program.body, idGen);
}

// The set of live lowercase kinds the translation is permitted to emit. Used
// by the corpus diff to assert every translated node carries a live kind (NOT
// a leaked native PascalCase kind).
const LIVE_KINDS = new Set([
    "let-decl", "const-decl", "bare-expr", "lift-expr", "fail-expr",
    "if-stmt", "while-stmt", "do-while-stmt", "for-stmt", "return-stmt",
    "break-stmt", "continue-stmt", "function-decl", "import-decl",
    "export-decl", "throw-stmt", "try-stmt",
]);

// =============================================================================
describe("§1 — statement substrate", () => {
    test("Empty statement translates to nothing", () => {
        const out = translate(";");
        expect(out).toEqual([]);
    });

    test("ExprStmt translates to bare-expr", () => {
        const out = translate("foo(1);");
        expect(out.length).toBe(1);
        expect(out[0].kind).toBe("bare-expr");
        expect(out[0].exprNode).not.toBeNull();
        expect(out[0].exprNode.kind).toBe("Call");
    });

    test("Block flattens its body into the surrounding stream", () => {
        const out = translate("{ foo(); bar(); }");
        expect(out.length).toBe(2);
        expect(out[0].kind).toBe("bare-expr");
        expect(out[1].kind).toBe("bare-expr");
    });

    test("let VarDecl translates to let-decl", () => {
        const out = translate("let x = 1;");
        expect(out.length).toBe(1);
        expect(out[0].kind).toBe("let-decl");
        expect(out[0].name).toBe("x");
        expect(out[0].initExpr).not.toBeNull();
    });

    test("const VarDecl translates to const-decl", () => {
        const out = translate("const y = 2;");
        expect(out.length).toBe(1);
        expect(out[0].kind).toBe("const-decl");
        expect(out[0].name).toBe("y");
    });

    test("var VarDecl translates to let-decl (scrml has no var)", () => {
        const out = translate("var z = 3;");
        expect(out.length).toBe(1);
        expect(out[0].kind).toBe("let-decl");
        expect(out[0].name).toBe("z");
    });

    test("multi-declarator VarDecl fans out to one node per declarator", () => {
        const out = translate("let a = 1, b = 2, c = 3;");
        expect(out.length).toBe(3);
        expect(out.map((n) => n.kind)).toEqual(["let-decl", "let-decl", "let-decl"]);
        expect(out.map((n) => n.name)).toEqual(["a", "b", "c"]);
    });

    test("init-free declarator omits initExpr", () => {
        const out = translate("let u;");
        expect(out.length).toBe(1);
        expect(out[0].kind).toBe("let-decl");
        expect(out[0].name).toBe("u");
        expect(out[0].initExpr).toBeUndefined();
    });
});

// =============================================================================
describe("§2 — control flow", () => {
    test("If translates to if-stmt with array-shaped consequent", () => {
        const out = translate("if (cond) { foo(); }");
        expect(out.length).toBe(1);
        expect(out[0].kind).toBe("if-stmt");
        expect(Array.isArray(out[0].consequent)).toBe(true);
        expect(out[0].consequent.length).toBe(1);
        expect(out[0].consequent[0].kind).toBe("bare-expr");
        expect(out[0].alternate).toBeNull();
        expect(out[0].condExpr).not.toBeNull();
    });

    test("If/else translates with array-shaped alternate", () => {
        const out = translate("if (cond) { foo(); } else { bar(); }");
        expect(out[0].kind).toBe("if-stmt");
        expect(Array.isArray(out[0].alternate)).toBe(true);
        expect(out[0].alternate.length).toBe(1);
        expect(out[0].alternate[0].kind).toBe("bare-expr");
    });

    test("else-if chain nests as a one-element if-stmt alternate", () => {
        const out = translate("if (a) { x(); } else if (b) { y(); } else { z(); }");
        expect(out[0].kind).toBe("if-stmt");
        expect(out[0].alternate.length).toBe(1);
        expect(out[0].alternate[0].kind).toBe("if-stmt");
        expect(out[0].alternate[0].alternate[0].kind).toBe("bare-expr");
    });

    test("un-braced if body translates to a one-element array", () => {
        const out = translate("if (cond) foo();");
        expect(out[0].kind).toBe("if-stmt");
        expect(out[0].consequent.length).toBe(1);
        expect(out[0].consequent[0].kind).toBe("bare-expr");
    });

    test("While translates to while-stmt", () => {
        const out = translate("while (cond) { tick(); }");
        expect(out[0].kind).toBe("while-stmt");
        expect(out[0].body.length).toBe(1);
        expect(out[0].condExpr).not.toBeNull();
    });

    test("DoWhile translates to do-while-stmt", () => {
        const out = translate("do { tick(); } while (cond);");
        expect(out[0].kind).toBe("do-while-stmt");
        expect(out[0].body.length).toBe(1);
        expect(out[0].condExpr).not.toBeNull();
    });

    test("C-style For translates to for-stmt with cStyleParts", () => {
        const out = translate("for (let i = 0; i < 10; i = i + 1) { step(); }");
        expect(out[0].kind).toBe("for-stmt");
        expect(out[0].variable).toBeNull();
        expect(out[0].cStyleParts).toBeDefined();
        expect(out[0].cStyleParts.initExpr).not.toBeNull();
        expect(out[0].cStyleParts.condExpr).not.toBeNull();
        expect(out[0].cStyleParts.updateExpr).not.toBeNull();
    });

    test("ForOf translates to for-stmt with variable + iterExpr", () => {
        const out = translate("for (const item of items) { use(item); }");
        expect(out[0].kind).toBe("for-stmt");
        expect(out[0].variable).toBe("item");
        expect(out[0].iterExpr).not.toBeNull();
        expect(out[0].forKind).toBe("of");
    });

    test("ForIn translates to for-stmt with forKind 'in'", () => {
        const out = translate("for (const key in obj) { read(key); }");
        expect(out[0].kind).toBe("for-stmt");
        expect(out[0].variable).toBe("key");
        expect(out[0].forKind).toBe("in");
    });

    test("Return with argument translates to return-stmt with exprNode", () => {
        const out = translate("return value;");
        expect(out[0].kind).toBe("return-stmt");
        expect(out[0].exprNode).not.toBeNull();
    });

    test("bare Return omits exprNode", () => {
        const out = translate("return;");
        expect(out[0].kind).toBe("return-stmt");
        expect(out[0].exprNode).toBeUndefined();
    });

    test("Break translates to break-stmt", () => {
        const out = translate("while (a) { break; }");
        expect(out[0].body[0].kind).toBe("break-stmt");
        expect(out[0].body[0].label).toBeNull();
    });

    test("Continue translates to continue-stmt", () => {
        const out = translate("while (a) { continue; }");
        expect(out[0].body[0].kind).toBe("continue-stmt");
        expect(out[0].body[0].label).toBeNull();
    });

    test("labeled break carries its label", () => {
        const out = translate("while (a) { break outer; }");
        expect(out[0].body[0].kind).toBe("break-stmt");
        expect(out[0].body[0].label).toBe("outer");
    });

    test("Labeled loop stamps label onto the loop node", () => {
        const out = translate("outer: while (cond) { tick(); }");
        expect(out[0].kind).toBe("while-stmt");
        expect(out[0].label).toBe("outer");
    });

    test("Labeled for stamps label onto the for-stmt", () => {
        const out = translate("loop: for (const x of xs) { use(x); }");
        expect(out[0].kind).toBe("for-stmt");
        expect(out[0].label).toBe("loop");
    });

    test("label on a non-loop emits the inner statement un-labelled", () => {
        const out = translate("tag: foo();");
        expect(out.length).toBe(1);
        expect(out[0].kind).toBe("bare-expr");
        expect(out[0].label).toBeUndefined();
    });
});

// =============================================================================
describe("§3 — declarations", () => {
    test("FunctionDecl translates to function-decl with recursive body", () => {
        const out = translate("function greet(name) { return name; }");
        expect(out[0].kind).toBe("function-decl");
        expect(out[0].name).toBe("greet");
        expect(out[0].params).toEqual(["name"]);
        expect(out[0].body.length).toBe(1);
        expect(out[0].body[0].kind).toBe("return-stmt");
        expect(out[0].fnKind).toBe("function");
        expect(out[0].isServer).toBe(false);
        expect(out[0].canFail).toBe(false);
    });

    test("generator FunctionDecl carries isGenerator", () => {
        const out = translate("function* gen() { yield 1; }");
        expect(out[0].kind).toBe("function-decl");
        expect(out[0].isGenerator).toBe(true);
    });

    test("rest param renders as ...name", () => {
        const out = translate("function variadic(a, ...rest) { return a; }");
        expect(out[0].params).toEqual(["a", "...rest"]);
    });

    test("Import named specifiers translate to import-decl", () => {
        const out = translate('import { Button, Card } from "scrml:ui";');
        expect(out[0].kind).toBe("import-decl");
        expect(out[0].names).toEqual(["Button", "Card"]);
        expect(out[0].source).toBe("scrml:ui");
        expect(out[0].isDefault).toBe(false);
        expect(out[0].specifiers.length).toBe(2);
        expect(out[0].specifiers[0]).toEqual({ imported: "Button", local: "Button", pinned: false });
    });

    test("Import aliased specifier preserves imported vs local", () => {
        const out = translate('import { foo as bar } from "./mod";');
        expect(out[0].specifiers[0]).toEqual({ imported: "foo", local: "bar", pinned: false });
    });

    test("default Import sets isDefault", () => {
        const out = translate('import Thing from "./thing";');
        expect(out[0].kind).toBe("import-decl");
        expect(out[0].isDefault).toBe(true);
        expect(out[0].names).toEqual(["Thing"]);
    });

    test("Export of a function-declaration carries exportKind + name", () => {
        const out = translate("export function helper() { return 1; }");
        expect(out[0].kind).toBe("export-decl");
        expect(out[0].exportKind).toBe("function");
        expect(out[0].exportedName).toBe("helper");
    });

    test("Export of a const declaration", () => {
        const out = translate("export const VERSION = 1;");
        expect(out[0].kind).toBe("export-decl");
        expect(out[0].exportKind).toBe("const");
        expect(out[0].exportedName).toBe("VERSION");
    });

    test("re-export carries reExportSource + re-export kind", () => {
        const out = translate('export { thing } from "./other";');
        expect(out[0].kind).toBe("export-decl");
        expect(out[0].exportKind).toBe("re-export");
        expect(out[0].reExportSource).toBe("./other");
    });

    test("ClassDecl translates to bare-expr (no live class kind)", () => {
        const out = translate("class Widget { }");
        expect(out[0].kind).toBe("bare-expr");
    });
});

// =============================================================================
describe("§4 — forbidden-vocabulary kinds (diagnostic-recovery shapes)", () => {
    test("Throw translates to throw-stmt with exprNode", () => {
        const out = translate("throw err;");
        expect(out[0].kind).toBe("throw-stmt");
        expect(out[0].exprNode).not.toBeNull();
    });

    test("Try translates to try-stmt with body + catch", () => {
        const out = translate("try { risky(); } catch (e) { recover(e); }");
        expect(out[0].kind).toBe("try-stmt");
        expect(out[0].body.length).toBe(1);
        expect(out[0].body[0].kind).toBe("bare-expr");
        expect(out[0].catchNode).toBeDefined();
        expect(out[0].catchNode.header).toBe("e");
        expect(out[0].catchNode.body.length).toBe(1);
    });

    test("Try with finally carries finallyNode", () => {
        const out = translate("try { a(); } finally { b(); }");
        expect(out[0].kind).toBe("try-stmt");
        expect(out[0].finallyNode).toBeDefined();
        expect(out[0].finallyNode.body.length).toBe(1);
    });

    test("Try with optional catch binding has empty catch header", () => {
        const out = translate("try { a(); } catch { b(); }");
        expect(out[0].catchNode.header).toBe("");
    });
});

// =============================================================================
describe("§5 — scrml-only un-wrap from native expression kinds", () => {
    test("lift in statement position un-wraps to lift-expr", () => {
        const out = translate("lift value;");
        expect(out.length).toBe(1);
        expect(out[0].kind).toBe("lift-expr");
        expect(out[0].expr).toBeDefined();
        expect(out[0].expr.kind).toBe("expr");
        expect(out[0].expr.exprNode).not.toBeNull();
    });

    test("fail in statement position un-wraps to fail-expr", () => {
        const out = translate("fail AppError::NotFound;");
        expect(out.length).toBe(1);
        expect(out[0].kind).toBe("fail-expr");
        expect(out[0].variantExpr).not.toBeNull();
    });

    test("a plain bare assignment stays bare-expr (no tilde-decl promotion)", () => {
        const out = translate("counter = counter + 1;");
        expect(out[0].kind).toBe("bare-expr");
    });
});

// =============================================================================
describe("§6 — destructuring binding patterns", () => {
    test("array destructuring let translates to destructure-array name", () => {
        const out = translate("let [a, b] = pair;");
        expect(out[0].kind).toBe("let-decl");
        expect(out[0].name.kind).toBe("destructure-array");
        expect(out[0].name.elements.length).toBe(2);
        expect(out[0].name.elements[0]).toEqual({ kind: "name", name: "a" });
    });

    test("array destructuring hole translates to a hole element", () => {
        const out = translate("let [x, , z] = triple;");
        expect(out[0].name.kind).toBe("destructure-array");
        expect(out[0].name.elements[1]).toEqual({ kind: "hole" });
    });

    test("array destructuring rest captures the rest name", () => {
        const out = translate("let [head, ...tail] = list;");
        expect(out[0].name.rest).toBe("tail");
    });

    test("object destructuring shorthand", () => {
        const out = translate("const { name, age } = person;");
        expect(out[0].name.kind).toBe("destructure-object");
        expect(out[0].name.properties[0]).toEqual({
            kind: "name", fieldName: "name", bindName: "name",
        });
    });

    test("object destructuring rename", () => {
        const out = translate("const { name: who } = person;");
        expect(out[0].name.properties[0]).toEqual({
            kind: "name", fieldName: "name", bindName: "who",
        });
    });

    test("object destructuring rest", () => {
        const out = translate("const { a, ...others } = obj;");
        expect(out[0].name.rest).toBe("others");
    });

    test("for-of with array destructuring carries a DestructurePattern variable", () => {
        const out = translate("for (const [k, v] of entries) { use(k, v); }");
        expect(out[0].kind).toBe("for-stmt");
        expect(out[0].variable.kind).toBe("destructure-array");
    });
});

// =============================================================================
describe("§7 — id-stamping + span discipline", () => {
    test("every translated node carries a numeric id", () => {
        const out = translate("let a = 1; foo(); if (b) { bar(); }");
        for (const node of out) {
            expect(typeof node.id).toBe("number");
        }
    });

    test("ids are unique within a translation using a shared counter", () => {
        const out = translate("let a = 1; let b = 2; function f() { return a; }");
        const ids = [];
        function collect(nodes) {
            for (const n of nodes) {
                ids.push(n.id);
                if (Array.isArray(n.body)) collect(n.body);
                if (Array.isArray(n.consequent)) collect(n.consequent);
            }
        }
        collect(out);
        expect(new Set(ids).size).toBe(ids.length);
    });

    test("a caller-supplied counter continues from its current value", () => {
        const counter = { next: 100 };
        const out = translate("let a = 1;", counter);
        expect(out[0].id).toBe(101);
        expect(counter.next).toBe(101);
    });

    test("every translated node carries a span", () => {
        const out = translate("let a = 1; foo();");
        for (const node of out) {
            expect(node.span).toBeDefined();
            expect(typeof node.span.start).toBe("number");
        }
    });
});

// =============================================================================
describe("§8 — defensive folds", () => {
    test("a missing native body folds to an empty array", () => {
        expect(translateStmtList(undefined)).toEqual([]);
        expect(translateStmtList(null)).toEqual([]);
    });

    test("a non-array native body folds to an empty array", () => {
        expect(translateStmtList({ kind: "VarDecl" })).toEqual([]);
        expect(translateStmtList("not an array")).toEqual([]);
    });

    test("null entries in the body are skipped", () => {
        const counter = { next: 0 };
        const out = translateStmtList([null, undefined], counter);
        expect(out).toEqual([]);
    });
});

// =============================================================================
describe("§9 — corpus diff: translated nodes walk cleanly", () => {
    // A micro-corpus of statement-shape sources. For each, the translated
    // output is asserted to (a) be a flat live LogicStatement[], (b) carry ONLY
    // live lowercase kinds (no leaked native PascalCase kind), recursively.
    const CORPUS = [
        "let total = 0;",
        "const items = [1, 2, 3];",
        "function sum(xs) { let acc = 0; for (const x of xs) { acc = acc + x; } return acc; }",
        "if (ready) { start(); } else { wait(); }",
        "while (running) { tick(); if (done) { break; } }",
        "do { poll(); } while (pending);",
        "for (let i = 0; i < n; i = i + 1) { visit(i); }",
        'import { helper } from "./util";',
        "export const NAME = 1;",
        "lift result;",
        "fail Err::Bad;",
        "outer: for (const a of as) { for (const b of bs) { if (a) { continue outer; } } }",
        "const { x, y: yy, ...rest } = point;",
        "let [first, , third] = row;",
    ];

    // walkKinds — recursively collect every node `kind` in a translated tree.
    function walkKinds(nodes, acc) {
        for (const n of nodes) {
            if (n === null || n === undefined) continue;
            acc.push(n.kind);
            if (Array.isArray(n.body)) walkKinds(n.body, acc);
            if (Array.isArray(n.consequent)) walkKinds(n.consequent, acc);
            if (Array.isArray(n.alternate)) walkKinds(n.alternate, acc);
            if (n.catchNode && Array.isArray(n.catchNode.body)) walkKinds(n.catchNode.body, acc);
            if (n.finallyNode && Array.isArray(n.finallyNode.body)) walkKinds(n.finallyNode.body, acc);
        }
        return acc;
    }

    for (const source of CORPUS) {
        test(`corpus walks to live kinds only: ${source}`, () => {
            const out = translate(source);
            expect(Array.isArray(out)).toBe(true);
            const kinds = walkKinds(out, []);
            expect(kinds.length).toBeGreaterThan(0);
            for (const k of kinds) {
                expect(LIVE_KINDS.has(k)).toBe(true);
            }
        });
    }

    test("the full corpus translates without throwing", () => {
        for (const source of CORPUS) {
            expect(() => translate(source)).not.toThrow();
        }
    });
});
