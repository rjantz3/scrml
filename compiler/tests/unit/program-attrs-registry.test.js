/**
 * B6 — `<program>` attribute-registry completion
 *
 * Verifies that every SPEC-cited `<program>` attribute is recognized by the
 * VP-1 attribute-allowlist registry, so canonical adopter usage does not
 * fire W-ATTR-001. Companion to `uvb-w1-attr-allowlist.test.js` (which
 * verifies the validator wiring); this file specifically guards against
 * registry regressions for every program-attribute the SPEC names.
 *
 * Audit reference: docs/changes/b6/* (B1 surfacing — `log=`, `headers=`,
 * `cors=`, `idempotency-store=` were not in the registry pre-B6).
 *
 * Per pa.md "Write test, always": ≥1 test per added attr.
 *
 * Covered attributes (SPEC cite in comment):
 *   §40.2 / §39.2 — cors, log, headers, ratelimit, idempotency-store
 *   §19.9.6 / §8.9.5 (S79) — idempotency-ttl, batch-in-list-cap
 *   §39.2.1 / §38.3.1 (S81) — cors-max-age, channel-reconnect
 *   §43 — lang, mode, callchar, build, autostart (worker/sidecar)
 *   §43.4 — restart, max-restarts, within (supervision)
 *
 * Plus regression coverage for the previously-recognized attrs:
 *   §6 / §39 — db, tables, html, name
 *   §52 — auth, loginRedirect, csrf, sessionExpiry
 *   §40.7 — title, description, version, author, license
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runAttributeAllowlistFile } from "../../src/validators/attribute-allowlist.ts";
import { getElementAttrSchema } from "../../src/attribute-registry.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function compile(source) {
  const filePath = "/test/program-attrs-registry.scrml";
  const bs = splitBlocks(filePath, source);
  const tab = buildAST(bs);
  const warnings = runAttributeAllowlistFile({ filePath, ast: tab.ast });
  return { ast: tab.ast, warnings };
}

function codes(warnings) {
  return warnings.map((w) => w.code);
}

/**
 * Compile `<program ${attr}=${valLiteral}>` and assert no W-ATTR-001 fires
 * for that attribute. Returns the full warning array for additional assertions.
 */
function assertProgramAttrRecognized(attr, valLiteral) {
  const src = `<program ${attr}=${valLiteral}>
<div>x</div>
</program>`;
  const { warnings } = compile(src);
  const attr001 = warnings.filter(
    (w) => w.code === "W-ATTR-001" && w.message.includes(`\`${attr}=\``)
  );
  expect(attr001).toHaveLength(0);
  return warnings;
}

// ---------------------------------------------------------------------------
// §1: Registry schema sanity — every attr is in the schema map
// ---------------------------------------------------------------------------

describe("B6 §1: registry schema contains every SPEC-cited program attr", () => {
  const schema = getElementAttrSchema("program");

  test("schema is non-null", () => {
    expect(schema).not.toBeNull();
    expect(schema.allowedAttrs.size).toBeGreaterThan(20);
  });

  // Each SPEC-cited attr must exist in the schema. This guards against
  // accidental deletion or rename.
  const SPEC_CITED_PROGRAM_ATTRS = [
    // §6 / §39 — program shape
    "db", "tables", "html", "name",
    // §52 — auth/session
    "auth", "loginRedirect", "csrf", "sessionExpiry",
    // §40.7 — documentary
    "title", "description", "version", "author", "license",
    // §40.2 / §39.2 — middleware
    "cors", "log", "headers", "ratelimit", "idempotency-store",
    // §19.9.6 / §8.9.5 (S79)
    "idempotency-ttl", "batch-in-list-cap",
    // §39.2.1 / §38.3.1 (S81)
    "cors-max-age", "channel-reconnect",
    // §43 — worker/sidecar
    "lang", "mode", "callchar", "build", "autostart",
    // §43.4 — supervision
    "restart", "max-restarts", "within",
  ];

  for (const attr of SPEC_CITED_PROGRAM_ATTRS) {
    test(`schema includes "${attr}"`, () => {
      expect(schema.allowedAttrs.has(attr)).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// §2: Middleware attrs — canonical use emits no W-ATTR-001 (B1 surface)
// ---------------------------------------------------------------------------

describe("B6 §2: §40.2 middleware attrs are recognized", () => {
  test('<program cors="*"> — no W-ATTR-001', () => {
    assertProgramAttrRecognized("cors", '"*"');
  });

  test('<program log="structured"> — no W-ATTR-001', () => {
    const warnings = assertProgramAttrRecognized("log", '"structured"');
    // Also: recognized enumerated value → no W-ATTR-002
    expect(codes(warnings)).not.toContain("W-ATTR-002");
  });

  test('<program log="minimal"> — no W-ATTR-002', () => {
    const warnings = assertProgramAttrRecognized("log", '"minimal"');
    expect(codes(warnings)).not.toContain("W-ATTR-002");
  });

  test('<program log="off"> — no W-ATTR-002', () => {
    const warnings = assertProgramAttrRecognized("log", '"off"');
    expect(codes(warnings)).not.toContain("W-ATTR-002");
  });

  test('<program log="bogus"> — emits W-ATTR-002 (value enforcement)', () => {
    const src = `<program log="bogus">
<div>x</div>
</program>`;
    const { warnings } = compile(src);
    expect(codes(warnings)).toContain("W-ATTR-002");
  });

  test('<program headers="strict"> — no warning', () => {
    const warnings = assertProgramAttrRecognized("headers", '"strict"');
    expect(codes(warnings)).not.toContain("W-ATTR-002");
  });

  test('<program ratelimit="100/min"> — no W-ATTR-001', () => {
    // ratelimit shape is enforced by E-MW-002 (compile error), not VP-1.
    // Registry just needs to suppress W-ATTR-001.
    assertProgramAttrRecognized("ratelimit", '"100/min"');
  });

  test('<program idempotency-store="auto"> — no warning', () => {
    const warnings = assertProgramAttrRecognized("idempotency-store", '"auto"');
    expect(codes(warnings)).not.toContain("W-ATTR-002");
  });

  test('<program idempotency-store="redis"> — no warning', () => {
    const warnings = assertProgramAttrRecognized("idempotency-store", '"redis"');
    expect(codes(warnings)).not.toContain("W-ATTR-002");
  });

  test('<program idempotency-store="bogus"> — emits W-ATTR-002', () => {
    const src = `<program idempotency-store="bogus">
<div>x</div>
</program>`;
    const { warnings } = compile(src);
    expect(codes(warnings)).toContain("W-ATTR-002");
  });

  // The B1-surfaced combination that triggered the bug.
  test('<program log= headers= cors= idempotency-store=> — none fire W-ATTR-001', () => {
    const src = `<program db="./app.db" log="structured" headers="strict" cors="*" idempotency-store="auto">
<div>x</div>
</program>`;
    const { warnings } = compile(src);
    expect(codes(warnings)).not.toContain("W-ATTR-001");
  });
});

// ---------------------------------------------------------------------------
// §3: S79/S81 adopter-override knobs
// ---------------------------------------------------------------------------

describe("B6 §3: S79/S81 adopter-override attrs are recognized", () => {
  test('<program idempotency-ttl="7d"> — no W-ATTR-001', () => {
    assertProgramAttrRecognized("idempotency-ttl", '"7d"');
  });

  test('<program batch-in-list-cap="65535"> — no W-ATTR-001', () => {
    assertProgramAttrRecognized("batch-in-list-cap", '"65535"');
  });

  test('<program cors-max-age="3600"> — no W-ATTR-001 (S81 F.1)', () => {
    assertProgramAttrRecognized("cors-max-age", '"3600"');
  });

  test('<program channel-reconnect="5000"> — no W-ATTR-001 (S81 F.2)', () => {
    assertProgramAttrRecognized("channel-reconnect", '"5000"');
  });
});

// ---------------------------------------------------------------------------
// §4: §43 worker/sidecar attrs
// ---------------------------------------------------------------------------

describe("B6 §4: §43 worker/sidecar attrs are recognized", () => {
  test('nested <program lang="go" build="..."> — no W-ATTR-001', () => {
    const src = `<program>
<program name="api" lang="go" build="go build -o ./bin/api ./cmd/api">
</program>
</program>`;
    const { warnings } = compile(src);
    const attr001 = warnings.filter((w) => w.code === "W-ATTR-001");
    // Neither lang= nor build= should fire W-ATTR-001.
    expect(attr001.filter((w) => w.message.includes("`lang=`"))).toHaveLength(0);
    expect(attr001.filter((w) => w.message.includes("`build=`"))).toHaveLength(0);
  });

  test('nested <program mode="wasm" callchar="g"> — no W-ATTR-001', () => {
    const src = `<program>
<program name="math" lang="go" mode="wasm" callchar="g" build="tinygo build -o ./wasm/math.wasm -target wasm ./cmd/math">
</program>
</program>`;
    const { warnings } = compile(src);
    const attr001 = warnings.filter((w) => w.code === "W-ATTR-001");
    expect(attr001.filter((w) => w.message.includes("`mode=`"))).toHaveLength(0);
    expect(attr001.filter((w) => w.message.includes("`callchar=`"))).toHaveLength(0);
  });

  test('<program autostart="false"> — no W-ATTR-001', () => {
    assertProgramAttrRecognized("autostart", '"false"');
  });
});

// ---------------------------------------------------------------------------
// §5: §43.4 supervision attrs
// ---------------------------------------------------------------------------

describe("B6 §5: §43.4 supervision attrs are recognized", () => {
  test('<program restart="always"> — no warning', () => {
    const warnings = assertProgramAttrRecognized("restart", '"always"');
    expect(codes(warnings)).not.toContain("W-ATTR-002");
  });

  test('<program restart="on-error"> — no W-ATTR-002', () => {
    const warnings = assertProgramAttrRecognized("restart", '"on-error"');
    expect(codes(warnings)).not.toContain("W-ATTR-002");
  });

  test('<program restart="never"> — no W-ATTR-002', () => {
    const warnings = assertProgramAttrRecognized("restart", '"never"');
    expect(codes(warnings)).not.toContain("W-ATTR-002");
  });

  test('<program restart="bogus"> — emits W-ATTR-002 (value enforcement)', () => {
    const src = `<program restart="bogus">
<div>x</div>
</program>`;
    const { warnings } = compile(src);
    expect(codes(warnings)).toContain("W-ATTR-002");
  });

  test('<program max-restarts="3"> — no W-ATTR-001', () => {
    assertProgramAttrRecognized("max-restarts", '"3"');
  });

  test('<program within="60"> — no W-ATTR-001', () => {
    assertProgramAttrRecognized("within", '"60"');
  });
});

// ---------------------------------------------------------------------------
// §6: Regression — W-ATTR-001 still fires on genuinely unknown attrs
// ---------------------------------------------------------------------------

describe("B6 §6: regression — W-ATTR-001 still fires on unknown attrs", () => {
  test('<program totally-made-up="x"> — emits W-ATTR-001', () => {
    const src = `<program totally-made-up="x">
<div>y</div>
</program>`;
    const { warnings } = compile(src);
    expect(codes(warnings)).toContain("W-ATTR-001");
    const w = warnings.find((x) => x.code === "W-ATTR-001");
    expect(w?.message).toContain("`totally-made-up=`");
  });

  test('<program protect="x"> — emits W-ATTR-001 (S80 retired)', () => {
    // The legacy `<program protect=>` attribute was retired in S80
    // (csrf/protect/auth surface codification). It should now fire
    // W-ATTR-001 as an unrecognized attribute.
    const src = `<program protect="x">
<div>y</div>
</program>`;
    const { warnings } = compile(src);
    expect(codes(warnings)).toContain("W-ATTR-001");
  });
});

// ---------------------------------------------------------------------------
// §7: Real-world canonical compositions from SPEC examples
// ---------------------------------------------------------------------------

describe("B6 §7: canonical SPEC-example compositions emit no W-ATTR-001", () => {
  test('§39.2 example: <program db log cors>', () => {
    const src = `<program db="./app.db" log="structured" cors="*">
<div>x</div>
</program>`;
    const { warnings } = compile(src);
    expect(codes(warnings)).not.toContain("W-ATTR-001");
  });

  test('§40.7 example: full documentary attrs + db + middleware', () => {
    const src = `<program db="./app.db"
                          title="Counter"
                          description="A counter app demonstrating reactive state."
                          version="0.1.0"
                          author="Bryan MacLee"
                          license="MIT"
                          log="structured"
                          headers="strict"
                          cors="*">
<div>x</div>
</program>`;
    const { warnings } = compile(src);
    expect(codes(warnings)).not.toContain("W-ATTR-001");
  });

  test('S79 example: <program idempotency-ttl batch-in-list-cap>', () => {
    const src = `<program db="./app.db" idempotency-store="sqlite" idempotency-ttl="7d" batch-in-list-cap="65535">
<div>x</div>
</program>`;
    const { warnings } = compile(src);
    expect(codes(warnings)).not.toContain("W-ATTR-001");
  });

  test('S81 F.1+F.2 example: <program cors-max-age channel-reconnect>', () => {
    const src = `<program db="./app.db" cors="*" cors-max-age="3600" channel-reconnect="5000">
<div>x</div>
</program>`;
    const { warnings } = compile(src);
    expect(codes(warnings)).not.toContain("W-ATTR-001");
  });
});
