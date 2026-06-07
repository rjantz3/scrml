// native-on-lifecycle-block.test.js — FIX 1 (leaf-gap Group P, SPEC §6.7.1a/b).
//
// change-id: native-parser-leaf-gaps-2026-06-06
//
// THE GAP. `on mount { body }` / `on dismount { body }` lifecycle blocks. The
// `on` / `mount` / `dismount` tokens all lex as plain `TokenKind.Ident` (none
// is a keyword), so before this fix the native parser parsed a statement-
// position `on mount { ... }` as TWO bare-ident expression statements (`on`,
// then `mount`) — firing E-SCOPE-001 (Undeclared `on` / `mount`) +
// E-STMT-MISSING-SEMICOLON and bailing the enclosing `${...}` logic block.
// This was the DOMINANT native-only leaf-gap (~52 flip-failures incl. the
// cross-file publish*Event / sessionToken cascade that false-positives only
// because the `on mount` mis-parse corrupts the same file's logic block).
//
// THE FIX (parse-stmt.js parseStatement arm + parseOnLifecycleBlock). The
// recognition arm matches the `on` IDENT + `mount`/`dismount` IDENT + `{` lead
// and routes into parseOnLifecycleBlock, which mirrors the LIVE desugar
// (ast-builder.js:7226-7248): `on mount { body }` -> the bare body expression;
// `on dismount { body }` -> `cleanup(() => body)`. The body is parsed as a
// SINGLE expression (the live `safeParseExprToNode(body, 0)` seam), then the
// remaining body tokens are skipped to the matching `}`.
//
// DRIVER: source -> `lex` -> `parseProgram` -> `translateStmtList` (the shared
// native-parser unit driver).

import { describe, test, expect } from "bun:test";

import { lex } from "../../native-parser/lex.js";
import { parseProgram } from "../../native-parser/parse-stmt.js";
import { translateStmtList } from "../../native-parser/translate-stmt.js";

function run(source) {
    const program = parseProgram(lex(source));
    return { errors: program.errors || [], out: translateStmtList(program.body) };
}

describe("FIX 1 — `on mount` / `on dismount` native lifecycle-block parsing", () => {

    test("`on mount { refresh() }` parses to a bare-expr Call (no E-SCOPE / E-STMT)", () => {
        const { errors, out } = run("on mount { refresh() }");
        // The native-only symptom (E-SCOPE-001 + E-STMT-MISSING-SEMICOLON) is gone.
        expect(errors).toEqual([]);
        expect(out.length).toBe(1);
        const node = out[0];
        expect(node.kind).toBe("bare-expr");
        expect(node.exprNode).toBeDefined();
        expect(node.exprNode.kind).toBe("call");
        expect(node.exprNode.callee.kind).toBe("ident");
        expect(node.exprNode.callee.name).toBe("refresh");
    });

    test("`on mount` keeps ONLY the first body expression (live single-expr parity)", () => {
        // The live desugar re-parses the body as ONE expression — a multi-
        // statement body keeps only its first expression. Native mirrors that.
        const { errors, out } = run("on mount {\n @count = 5\n @name = 7\n }");
        expect(errors).toEqual([]);
        expect(out.length).toBe(1);
        expect(out[0].kind).toBe("bare-expr");
        // The first expression `@count = 5` is the surviving body — the trailing
        // `@name = 7` is skipped to the matching `}` (live parity).
    });

    test("`on dismount { close() }` desugars to a `cleanup(() => ...)` Call", () => {
        const { errors, out } = run("on dismount { close() }");
        expect(errors).toEqual([]);
        expect(out.length).toBe(1);
        const node = out[0];
        expect(node.kind).toBe("bare-expr");
        expect(node.exprNode.kind).toBe("call");
        expect(node.exprNode.callee.kind).toBe("ident");
        expect(node.exprNode.callee.name).toBe("cleanup");
        // The single argument is a concise-body arrow over the body expression.
        expect(node.exprNode.args.length).toBe(1);
        expect(node.exprNode.args[0].kind).toBe("lambda");
        expect(node.exprNode.args[0].fnStyle).toBe("arrow");
    });

    test("`on mount {}` (empty body) is a clean no-op bare-expr", () => {
        const { errors, out } = run("on mount {}");
        expect(errors).toEqual([]);
        expect(out.length).toBe(1);
        expect(out[0].kind).toBe("bare-expr");
    });

    test("a BARE `on` identifier use (not + mount/dismount + {) is unaffected", () => {
        // `on = 5` — `on` is an ordinary identifier; the 3-token guard declines.
        const { errors, out } = run("on = 5");
        expect(errors).toEqual([]);
        expect(out.length).toBe(1);
        expect(out[0].kind).toBe("bare-expr");
        // `on x` (on NOT followed by `{` two tokens out) also stays bare.
        const r2 = run("on something");
        expect(r2.out.length).toBeGreaterThanOrEqual(1);
    });
});
