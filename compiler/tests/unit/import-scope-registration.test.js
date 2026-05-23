/**
 * import-scope-registration.test.js — Imports in logic-block scope
 *
 * Regression: giti inbound 2026-04-20 GITI-002.
 *
 * `import { x } from './file.js'` inside a `${}` logic block was firing
 * a false E-SCOPE-001 whenever `x` was used elsewhere in the logic block
 * (including inside `server function` bodies). The codegen path already
 * wrote the import statement into `.server.js` and `.client.js`, so the
 * output was correct — but the scope-resolver rejected the use.
 *
 * Fix: `case "import-decl"` in type-system.ts now binds each imported
 * local name with `kind: "import"` so checkLogicExprIdents finds it via
 * scopeChain.lookup().
 *
 * Wave 11 Unit S (S121, 2026-05-22): import aliases —
 * `import { X as Y } from "..."` was registering the IMPORTED name `X`
 * in scope (because `n.names[]` contains source-side names per
 * ast-builder.js:7039-7044), causing E-SCOPE-001 on every use-site of
 * the alias `Y`. Per SPEC §21 + §38.12 line 17495 ("The local alias is
 * the tag name written in the markup"), the alias is the canonical
 * in-scope name; the imported (source-side) name is only consulted
 * during MOD's exportRegistry lookup.
 *
 * Fix: read `n.specifiers[].local` (canonical local-side binding) in
 * preference to `n.names[]`. The latter remains the fallback for
 * default imports, which produce `names: [X]` with no specifiers (and
 * default-import locals are unaliasable per ES syntax anyway).
 *
 * Coverage:
 *   §1  Named import used in a function body — no E-SCOPE-001
 *   §2  Named import used in a `server function` body — no E-SCOPE-001
 *   §3  Named import used in a top-level logic expression — no E-SCOPE-001
 *   §4  Default import used in a logic expression — no E-SCOPE-001
 *   §5  Undeclared name (no import) still fires E-SCOPE-001 (negative control)
 *   §6  Multiple named imports all registered
 *   §7  Aliased import — alias `Y` is in scope (Wave 11 Unit S)
 *   §8  Aliased import — original `X` is NOT in scope (Wave 11 Unit S)
 *   §9  Mixed aliased + non-aliased imports — both forms resolve (Wave 11 Unit S)
 *  §10  Multiple aliases on the same line — every alias resolves (Wave 11 Unit S)
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runTS } from "../../src/type-system.js";

function diagnose(src) {
  const bs = splitBlocks("/test/app.scrml", src);
  if (bs.errors && bs.errors.length > 0) return { errors: bs.errors };
  const { ast } = buildAST(bs);
  const res = runTS({ files: [ast] });
  return { errors: res.errors ?? [] };
}

function hasCode(errors, code) {
  return errors.some(e => e.code === code);
}

// ---------------------------------------------------------------------------
// §1: Named import used inside a regular function body — no E-SCOPE-001
// ---------------------------------------------------------------------------

describe("§1: named import used in a function body", () => {
  test("no E-SCOPE-001 on imported name used inside function body", () => {
    const src = `<program>

\${
  import { getGreeting } from './engine/probe.js'

  function greet() {
    lift getGreeting("world")
  }
}

<div>
  <button onclick=greet()>Greet</button>
</div>

</program>
`;
    const { errors } = diagnose(src);
    expect(hasCode(errors, "E-SCOPE-001")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §2: Named import used inside a server function body — no E-SCOPE-001
// (this is the exact giti GITI-002 repro shape)
// ---------------------------------------------------------------------------

describe("§2: named import used in a server function body", () => {
  test("no E-SCOPE-001 on imported name used inside server function", () => {
    const src = `<program>

\${
  import { getGreeting } from './engine/probe.js'

  server function loadGreeting() {
    lift getGreeting("world")
  }
}

<div>
  <p>\${loadGreeting()}</p>
</div>

</program>
`;
    const { errors } = diagnose(src);
    expect(hasCode(errors, "E-SCOPE-001")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §3: Named import used in a top-level logic expression — no E-SCOPE-001
// ---------------------------------------------------------------------------

describe("§3: named import used in a top-level logic expression", () => {
  test("no E-SCOPE-001 on imported name used in a bare-expr at logic top", () => {
    const src = `<program>

\${
  import { helper } from './engine/probe.js'

  @result = helper()
}

<p>\${@result}</p>

</program>
`;
    const { errors } = diagnose(src);
    expect(hasCode(errors, "E-SCOPE-001")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §4: Default import
// ---------------------------------------------------------------------------

describe("§4: default import used in a logic expression", () => {
  test("no E-SCOPE-001 on default-imported name", () => {
    const src = `<program>

\${
  import config from './engine/config.js'

  function read() {
    lift config
  }
}

<button onclick=read()>Go</button>

</program>
`;
    const { errors } = diagnose(src);
    expect(hasCode(errors, "E-SCOPE-001")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §5: Negative control — undeclared name still fires E-SCOPE-001
// ---------------------------------------------------------------------------

describe("§5: undeclared identifier still fires E-SCOPE-001", () => {
  test("bare use of a non-imported, non-declared name fires E-SCOPE-001", () => {
    const src = `<program>

\${
  function broken() {
    lift undeclaredHelper()
  }
}

<button onclick=broken()>X</button>

</program>
`;
    const { errors } = diagnose(src);
    expect(hasCode(errors, "E-SCOPE-001")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §6: Multiple named imports all registered
// ---------------------------------------------------------------------------

describe("§6: multiple named imports all enter scope", () => {
  test("all of {a, b, c} are resolvable", () => {
    const src = `<program>

\${
  import { alpha, beta, gamma } from './engine/probe.js'

  function demo() {
    lift alpha() + beta() + gamma()
  }
}

<button onclick=demo()>Run</button>

</program>
`;
    const { errors } = diagnose(src);
    expect(hasCode(errors, "E-SCOPE-001")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §7 (Wave 11 Unit S, S121): aliased import — alias `Y` is in scope
//
// `import { foo as fooAlias } from "..."` — the alias `fooAlias` must be
// the in-scope name. Per SPEC §21 + §38.12 line 17495, the local alias
// is the canonical in-scope name; the imported (source-side) name is
// only consulted during MOD's exportRegistry lookup.
// ---------------------------------------------------------------------------

describe("§7: aliased import — alias is in scope (Wave 11 Unit S)", () => {
  test("`import { foo as fooAlias }` admits use of `fooAlias` without E-SCOPE-001", () => {
    const src = `<program>

\${
  import { foo as fooAlias } from './engine/probe.js'

  function check() {
    lift fooAlias(42)
  }
}

<button onclick=check()>Go</button>

</program>
`;
    const { errors } = diagnose(src);
    expect(hasCode(errors, "E-SCOPE-001")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §8 (Wave 11 Unit S, S121): aliased import — original `X` is NOT in scope
//
// `import { foo as fooAlias } from "..."` — the ORIGINAL imported name
// `foo` MUST NOT leak into the importer's scope. Only `fooAlias` is
// reachable; using `foo` is an undeclared identifier per SPEC §21.
//
// Regression guard against a fix that registers BOTH names (or that
// just adds the alias without retiring the imported-name registration).
// ---------------------------------------------------------------------------

describe("§8: aliased import — original name is NOT in scope (Wave 11 Unit S)", () => {
  test("`import { foo as fooAlias }` then using `foo` fires E-SCOPE-001", () => {
    const src = `<program>

\${
  import { foo as fooAlias } from './engine/probe.js'

  function check() {
    lift foo(42)
  }
}

<button onclick=check()>Go</button>

</program>
`;
    const { errors } = diagnose(src);
    expect(hasCode(errors, "E-SCOPE-001")).toBe(true);
    // Verify the E-SCOPE-001 message names `foo`, not `fooAlias` —
    // i.e., the import-side name is the undeclared one, not the alias.
    const scopeErrors = errors.filter(e => e.code === "E-SCOPE-001");
    expect(scopeErrors.some(e => /\bfoo\b/.test(e.message))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §9 (Wave 11 Unit S, S121): mixed aliased + non-aliased imports
//
// `import { foo, bar as barAlias } from "..."` — both `foo` (no alias)
// AND `barAlias` (the alias) must be in scope. Ensures the fix handles
// the per-specifier mixed case correctly (not just all-or-nothing).
// ---------------------------------------------------------------------------

describe("§9: mixed aliased + non-aliased imports (Wave 11 Unit S)", () => {
  test("both `foo` and `barAlias` resolve when both appear on the same import", () => {
    const src = `<program>

\${
  import { foo, bar as barAlias } from './engine/probe.js'

  function check() {
    lift foo() + barAlias()
  }
}

<button onclick=check()>Go</button>

</program>
`;
    const { errors } = diagnose(src);
    expect(hasCode(errors, "E-SCOPE-001")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §10 (Wave 11 Unit S, S121): multiple aliases on the same line
//
// `import { a as aAlias, b as bAlias, c as cAlias } from "..."` — every
// alias must enter scope. Covers the per-specifier iteration shape.
// ---------------------------------------------------------------------------

describe("§10: multiple aliases on the same import (Wave 11 Unit S)", () => {
  test("all aliases resolve; no original names leak", () => {
    const src = `<program>

\${
  import { a as aAlias, b as bAlias, c as cAlias } from './engine/probe.js'

  function check() {
    lift aAlias() + bAlias() + cAlias()
  }
}

<button onclick=check()>Go</button>

</program>
`;
    const { errors } = diagnose(src);
    expect(hasCode(errors, "E-SCOPE-001")).toBe(false);
  });

  test("using an original (non-aliased) name from a fully-aliased import fires E-SCOPE-001", () => {
    const src = `<program>

\${
  import { a as aAlias, b as bAlias } from './engine/probe.js'

  function check() {
    lift a() + bAlias()
  }
}

<button onclick=check()>Go</button>

</program>
`;
    const { errors } = diagnose(src);
    // `a` is NOT in scope (only `aAlias` is); `bAlias` is fine.
    expect(hasCode(errors, "E-SCOPE-001")).toBe(true);
    const scopeErrors = errors.filter(e => e.code === "E-SCOPE-001");
    // Verify the offending identifier is `a`, not `aAlias` or `bAlias`.
    // The message includes the bare name; check at least one fires on `a`.
    expect(scopeErrors.some(e => /\ba\b/.test(e.message) && !/\baAlias\b/.test(e.message))).toBe(true);
  });
});
