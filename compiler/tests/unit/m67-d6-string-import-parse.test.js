// m67-d6-string-import-parse.test.js — M6.7-D6 FIX-NATIVE.
//
// ROOT CAUSE (Phase-0 verified — see
// docs/changes/m67-phase-a-flag-flip/d6-string-import.md):
//   The native parser's named-import-clause parser
//   (`parseNamedImportSpecifiers`, parse-stmt.js) accepted ONLY a
//   `TokenKind.Ident` as the imported name; a string-literal specifier —
//   `import { "dispatch-board" as dispatchBoard } from '...'` (SPEC §38.12.5 /
//   §12821, the kebab-case channel-name import form) — hit the
//   non-identifier arm and recorded `E-STMT-IMPORT-NAME`, then cascaded
//   (`E-STMT-UNCLOSED-IMPORT` + `E-STMT-EXPECT-FROM` + `E-EXPR-UNEXPECTED:KwAs`
//   + `...:KwFrom` + the `no statement begins here` tail). The code comment
//   even named the deferral: "M3.3 takes the identifier form, the corpus
//   shape". The gap was UNIVERSAL to the StringLit specifier — it fired at the
//   file top, inside a `${ }` logic-escape, and in a multi-specifier clause
//   alike (NOT a positional variant). The live/Acorn pipeline ACCEPTS the form
//   in every position. This was the E-STMT-IMPORT-NAME native-flip residual
//   cluster (12 trucking-dispatch files, 15 fires).
//
//   This is parity-COMPLETENESS for a form live already accepts (SPEC §17561-
//   §17562: the stored imported name SHALL be the UNQUOTED form), not a subset
//   expansion. `null`/`undefined` aside (D1), no new JS-superset surface.
//
// THE FIX (compiler/native-parser/parse-stmt.js only):
//   parseNamedImportSpecifiers — accept `TokenKind.StringLit` in addition to
//   `TokenKind.Ident` as the imported-name token. When the token is a
//   StringLit, the imported name is its UNQUOTED cooked value
//   (`importedTok.cooked`); for an Ident it remains `importedTok.name`. `local`
//   defaults to the imported name (the cooked string for a bare quoted
//   specifier — live parity) and is overridden by an `as` alias. No node /
//   bridge change: makeImportNamed + translate-stmt.js makeImportDecl already
//   carry `imported`/`local` verbatim into the live import-decl
//   names[]/specifiers[] shape.
//
// These tests drive BOTH pipelines (LIVE = splitBlocks+buildAST = the Acorn-
// backed oracle; NATIVE = nativeParseFile) and assert (a) the previously-
// failing string-import forms now parse native with ZERO errors and (b) the
// bridged import-decl MATCHES the live ast-builder shape (names / specifiers /
// source / isDefault). The bare-identifier baseline is asserted UNCHANGED.
//
// LOAD-BEARING: against the pre-fix parser EVERY "native parses ... zero
// errors" and every "parity" assertion in the STRING-LITERAL block FAILS
// (E-STMT-IMPORT-NAME cascade; the import-decl is malformed/absent). Pre-fix
// fail count: the 5 zero-error tests + the 5 parity tests + the 5 shape tests
// = 15 failing (the 5 baseline-identifier tests + the §38.12.5 unquoted-store
// test still pass pre-fix). The fix turns all 15 GREEN.

import { describe, test, expect } from "bun:test";

import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { nativeParseFile } from "../../native-parser/parse-file.js";

const FP = "m67-d6.scrml";

// Wrap a logic body in a `${ }` block so the ast-builder logic-decl path runs
// — the corpus-canonical position (SPEC §17503 shows the channel import inside
// `${ }`). A bare file-top import reaches the SAME import-clause parser in both
// pipelines; the gap was identical regardless of position (Phase-0).
function wrap(body) {
  return "${\n" + body + "\n}";
}

function liveParse(body) {
  const bs = splitBlocks(FP, wrap(body));
  const tab = buildAST(bs, null);
  return { ast: tab.ast, errors: (tab.errors || []).map((e) => e.code) };
}

function nativeParse(body) {
  const r = nativeParseFile(FP, wrap(body));
  return { ast: r.ast, errors: (r.errors || []).map((e) => e.code) };
}

// Depth-first find the FIRST import-decl node anywhere in a FileAST. The `${ }`
// logic-decl rollup duplicates the node; the first is sufficient for parity.
function findImportDecl(ast) {
  if (!ast || !Array.isArray(ast.nodes)) return null;
  const stack = [...ast.nodes];
  while (stack.length > 0) {
    const n = stack.shift();
    if (!n || typeof n !== "object") continue;
    if (n.kind === "import-decl") return n;
    for (const k of Object.keys(n)) {
      const v = n[k];
      if (Array.isArray(v)) stack.push(...v);
      else if (v && typeof v === "object") stack.push(v);
    }
  }
  return null;
}

// The load-bearing structural fields the native fix must match the live oracle
// on (`raw` is intentionally OMITTED — the native bridge emits raw "" by design;
// it is a within-node SPAN/raw concern handled by the conformance allowlist, not
// a content-class parity field).
function importShape(node) {
  if (!node) return null;
  return {
    names: node.names,
    specifiers: node.specifiers,
    source: node.source,
    isDefault: node.isDefault === true,
  };
}

// =============================================================================
// THE GAP — string-literal import specifier now parses native with ZERO errors
// and matches the live AST shape (names = UNQUOTED imported name).
// =============================================================================
describe("M6.7-D6 — string-literal import specifier parses native", () => {
  const FORMS = [
    {
      label: "quoted name with alias (the corpus form, SPEC §38.12.5)",
      body: `import { "dispatch-board" as dispatchBoard } from '../../channels/dispatch-board.scrml'`,
      expect: {
        names: ["dispatch-board"],
        specifiers: [{ imported: "dispatch-board", local: "dispatchBoard", pinned: false }],
        source: "../../channels/dispatch-board.scrml",
        isDefault: false,
      },
    },
    {
      label: "quoted name WITHOUT alias (local defaults to the cooked string)",
      body: `import { "dispatch-board" } from './c.scrml'`,
      expect: {
        names: ["dispatch-board"],
        specifiers: [{ imported: "dispatch-board", local: "dispatch-board", pinned: false }],
        source: "./c.scrml",
        isDefault: false,
      },
    },
    {
      label: "multi-specifier mixed ident + quoted + ident",
      body: `import { foo, "dispatch-board" as db, bar } from './c.scrml'`,
      expect: {
        names: ["foo", "dispatch-board", "bar"],
        specifiers: [
          { imported: "foo", local: "foo", pinned: false },
          { imported: "dispatch-board", local: "db", pinned: false },
          { imported: "bar", local: "bar", pinned: false },
        ],
        source: "./c.scrml",
        isDefault: false,
      },
    },
    {
      label: "single-quoted specifier (cooked is quote-agnostic)",
      body: `import { 'load-events' as loadEvents } from './c.scrml'`,
      expect: {
        names: ["load-events"],
        specifiers: [{ imported: "load-events", local: "loadEvents", pinned: false }],
        source: "./c.scrml",
        isDefault: false,
      },
    },
    {
      label: "two consecutive channel imports (load-detail.scrml shape)",
      body:
        `import { "customer-events" as customerEvents } from '../../channels/customer-events.scrml'\n` +
        `  import { "load-events" as loadEvents } from '../../channels/load-events.scrml'`,
      // findImportDecl returns the FIRST — assert the first import here.
      expect: {
        names: ["customer-events"],
        specifiers: [{ imported: "customer-events", local: "customerEvents", pinned: false }],
        source: "../../channels/customer-events.scrml",
        isDefault: false,
      },
    },
  ];

  for (const form of FORMS) {
    test(`native parses \`${form.label}\` with zero errors`, () => {
      const n = nativeParse(form.body);
      expect(n.errors).toEqual([]);
    });

    test(`native AST for \`${form.label}\` matches the expected import shape`, () => {
      const node = findImportDecl(nativeParse(form.body).ast);
      expect(importShape(node)).toEqual(form.expect);
    });

    test(`native \`${form.label}\` shape == live oracle shape (parity)`, () => {
      const live = liveParse(form.body);
      const native = nativeParse(form.body);
      expect(live.errors).toEqual([]);
      expect(native.errors).toEqual([]);
      const liveNode = findImportDecl(live.ast);
      const nativeNode = findImportDecl(native.ast);
      expect(importShape(nativeNode)).toEqual(importShape(liveNode));
    });
  }
});

// =============================================================================
// SPEC §17561-§17562 — the STORED imported name is the UNQUOTED form (not the
// quoted source text). This is the binding invariant the fix preserves.
// =============================================================================
describe("M6.7-D6 — stored imported name is unquoted (§17562)", () => {
  test("`\"dispatch-board\"` is stored as names[0] === 'dispatch-board' (no quotes)", () => {
    const node = findImportDecl(
      nativeParse(`import { "dispatch-board" as dispatchBoard } from './c.scrml'`).ast,
    );
    expect(node).not.toBeNull();
    expect(node.names[0]).toBe("dispatch-board");
    expect(node.specifiers[0].imported).toBe("dispatch-board");
    expect(node.specifiers[0].local).toBe("dispatchBoard");
    // The alias is the markup tag name; the wire identity is the imported name.
    expect(node.names[0]).not.toContain('"');
  });
});

// =============================================================================
// NO REGRESSION — the bare-identifier named-import baseline is unchanged.
// =============================================================================
describe("M6.7-D6 — bare-identifier imports unchanged", () => {
  const BASELINE = [
    {
      label: "bare ident",
      body: `import { AddressForm } from '../../components/address-form.scrml'`,
      expect: {
        names: ["AddressForm"],
        specifiers: [{ imported: "AddressForm", local: "AddressForm", pinned: false }],
        source: "../../components/address-form.scrml",
        isDefault: false,
      },
    },
    {
      label: "bare ident with alias",
      body: `import { createSessionStore as store } from 'scrml:store'`,
      expect: {
        names: ["createSessionStore"],
        specifiers: [{ imported: "createSessionStore", local: "store", pinned: false }],
        source: "scrml:store",
        isDefault: false,
      },
    },
  ];

  for (const b of BASELINE) {
    test(`native parses baseline \`${b.label}\` with zero errors`, () => {
      expect(nativeParse(b.body).errors).toEqual([]);
    });

    test(`native baseline \`${b.label}\` shape == live oracle (unchanged)`, () => {
      const liveNode = findImportDecl(liveParse(b.body).ast);
      const nativeNode = findImportDecl(nativeParse(b.body).ast);
      expect(importShape(nativeNode)).toEqual(b.expect);
      expect(importShape(nativeNode)).toEqual(importShape(liveNode));
    });
  }
});
