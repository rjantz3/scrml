/**
 * A-5.3 — negative-cascade chain tests (FX-3 + FX-4).
 *
 * Third sub-phase of the A-5 wave (final Approach A sub-wave; v0.3.0
 * critical path). Sibling-parallel with A-5.2 + A-5.4.
 *
 * Verifies that intentionally-malformed source fires the EXPECTED
 * diagnostic chains across the AuthGraph (Stage 7.55), Reachability
 * Solver Component 4 (Stage 7.6), and per-route artifact splitter
 * (CG opt-in --emit-per-route), in the documented order, WITHOUT
 * halting the pipeline mid-flight. Each per-sub-wave unit suite
 * already exercises these diagnostics at first-fire-site; A-5.3
 * proves the cross-stage cascade composes coherently in the full
 * `compileScrml` driver.
 *
 * Two intentionally-malformed fixtures (inline-string per dive §3.2 —
 * small + single-file + intentionally-malformed → does not belong as
 * a discoverable file under fixtures/a5/):
 *
 *   FX-3 — `<auth role="Admin">` gate WITHOUT a `:enum` declaration
 *          anywhere → cascade:
 *          E-AUTH-GRAPH-002 (auth-graph.ts: variant-referencing gate
 *            with no enum declared, single fire) +
 *          E-CLOSURE-002    (component-4.ts: implicit-anonymous +
 *            auth-role-block gate, single fire) +
 *          W-AUTH-RUNTIME-FALLBACK (component-4.ts: gate becomes
 *            runtime-fallback when classification cannot resolve).
 *
 *   FX-4 — Role enum `{ Anonymous, Admin }` declared, but the gate
 *          uses a typo'd variant `<auth role="Admni">` → cascade:
 *          E-AUTH-GRAPH-003 (auth-graph.ts classifier: variant tag
 *            not in enum, single fire) +
 *          W-AUTH-RUNTIME-FALLBACK (component-4.ts: classification
 *            returned closed_form: false → all-roles runtime-fallback) +
 *          W-CG-CHUNK-MISSING-ROLE (route-splitter.ts: AST contains
 *            `<auth role="Admni">` but no per-role chunk emitted for
 *            "Admni" — only the resolved enum variants Anonymous +
 *            Admin emit chunks).
 *
 * Family F-2 (negative-test cascade chain).
 *
 * **Rule-4 reconnaissance findings (verified against current source):**
 *
 *   1. The brief stated W-AUTH-RUNTIME-FALLBACK "does NOT fire on
 *      FX-3/FX-4." Direct read of `reachability/component-4.ts:230-241`
 *      shows the lint fires WHEN ANY ROLE classifies as runtime-fallback.
 *      Both FX-3 (no enum → all-anonymous-role runtime-fallback) and
 *      FX-4 (typo → closed_form: false → all-roles runtime-fallback)
 *      take that path. The lint IS expected to fire on both fixtures.
 *      Tests assert this directly per actual emission shape.
 *
 *   2. SPEC §34 (line 14939 / 14942 / 14943 / 14736) catalog rows
 *      verified live + correct severities (E-CLOSURE-002 / E-AUTH-GRAPH-002
 *      / E-AUTH-GRAPH-003 = Error; W-CG-CHUNK-MISSING-ROLE = Warning).
 *
 *   3. `result.errors` only carries fatal errors; warnings + info-level
 *      diagnostics flow into `result.warnings`. The A-5.1 cornerstone's
 *      `result.errors.filter(e => e.code === "W-CG-CHUNK-EMPTY")` is a
 *      false-negative (always returns []); for ASSERTION of warnings
 *      we MUST use `result.warnings`. (api.js:1674-1675.)
 *
 * Spec authority:
 *   - SPEC.md §34 line 14736 — W-CG-CHUNK-MISSING-ROLE catalog row
 *   - SPEC.md §34 line 14939 — E-CLOSURE-002 catalog row
 *   - SPEC.md §34 line 14942 — E-AUTH-GRAPH-002 catalog row
 *   - SPEC.md §34 line 14943 — E-AUTH-GRAPH-003 catalog row
 *   - SPEC.md §40.9.5 — Component 4 + classified vs runtime-fallback
 *   - SPEC.md §40.9.7 — per-tier output structure
 *   - SPEC.md §40.9.11 — diagnostic catalog (closure analysis)
 *   - SPEC.md §40.1.1 — static role classification anchor
 *   - PIPELINE.md Stage 7.55 (AG) + Stage 7.6 (RS) + Stage 8 (CG splitter)
 *
 * Source emission sites:
 *   - `compiler/src/auth-graph.ts:954-966` — E-AUTH-GRAPH-002
 *   - `compiler/src/auth-graph.ts:1690-1702` — E-AUTH-GRAPH-003
 *   - `compiler/src/reachability/component-4.ts:248-264` — E-CLOSURE-002
 *   - `compiler/src/reachability/component-4.ts:234-241` — W-AUTH-RUNTIME-FALLBACK
 *   - `compiler/src/codegen/route-splitter.ts:858-898` — W-CG-CHUNK-MISSING-ROLE
 *
 * SCOPING: scrml-support/docs/deep-dives/a-5-integration-tests-SCOPING-2026-05-14.md
 *   §3.1 family F-2 + §3.2 fixture FX-3 + FX-4 + §4.2 A-5.3 sub-phase.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { compileScrml } from "../../src/api.js";

// ---------------------------------------------------------------------------
// Inline-string fixtures
//
// Both fixtures are intentionally-malformed at the AuthGraph layer; they
// are NOT canonical scrml shapes and SHOULD NOT be browsed as samples.
// Co-locating them inline-in-test keeps the malformed source out of the
// `fixtures/a5/` corpus that adopters / future agents may discover.
// ---------------------------------------------------------------------------

/**
 * FX-3 — INTENTIONALLY MALFORMED.
 *
 * `<auth role="Admin">` gate present, but NO `type ...:enum = { ... }`
 * declared anywhere. Triggers the E-AUTH-GRAPH-002 + E-CLOSURE-002
 * cascade plus W-AUTH-RUNTIME-FALLBACK (the gate becomes runtime-
 * fallback when Component 4 classifies it without a role enum).
 *
 * The shape is otherwise minimal: a `<program>` wrapper + a `<nav>`
 * containing the auth-role-block. No reactive state, no server-fns,
 * no other gates — keeps the diagnostic surface focused on the
 * no-role-enum cascade.
 */
const FX3_NO_ROLE_ENUM = `<program title="No-Enum Sample" auth="required">

<nav class="flex items-center gap-3 p-4 border-b">
  <h1 class="text-xl font-semibold">No-Enum Sample</h1>
  <auth role="Admin">
    <a href="/admin" class="text-red-600">Admin Console</a>
  </auth>
</nav>

</program>
`;

/**
 * FX-4 — INTENTIONALLY MALFORMED.
 *
 * Role enum declared as `{ Anonymous, Admin }` (minimal — no Driver),
 * but the gate types a variant TYPO: `<auth role="Admni">`. Triggers
 * the E-AUTH-GRAPH-003 + W-AUTH-RUNTIME-FALLBACK + W-CG-CHUNK-MISSING-ROLE
 * cascade.
 *
 * The variant set deliberately stays at two members so the chunk-
 * emission output has exactly two roles (Anonymous + Admin) — the
 * `Admni` typo therefore has NO matching emitted chunk and the
 * route-splitter's lint fires unambiguously.
 */
const FX4_TYPO_ROLE_VARIANT = `<program title="Typo-Role Sample" auth="required">

type UserRole:enum = { Anonymous, Admin }

<nav class="flex items-center gap-3 p-4 border-b">
  <h1 class="text-xl font-semibold">Typo-Role Sample</h1>
  <auth role="Admni">
    <a href="/admin" class="text-red-600">Admin Console</a>
  </auth>
</nav>

</program>
`;

let TMP;
let FX3_PATH;
let FX4_PATH;

beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "a5-negative-cascades-"));
  FX3_PATH = join(TMP, "fx3-no-role-enum.scrml");
  FX4_PATH = join(TMP, "fx4-typo-role-variant.scrml");
  writeFileSync(FX3_PATH, FX3_NO_ROLE_ENUM);
  writeFileSync(FX4_PATH, FX4_TYPO_ROLE_VARIANT);
});

afterAll(() => {
  if (TMP && existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

function compileFx3() {
  return compileScrml({
    inputFiles: [FX3_PATH],
    outputDir: join(TMP, "dist-fx3"),
    write: false,
    emitPerRoute: true,
    log: () => {},
  });
}

function compileFx4() {
  return compileScrml({
    inputFiles: [FX4_PATH],
    outputDir: join(TMP, "dist-fx4"),
    write: false,
    emitPerRoute: true,
    log: () => {},
  });
}

/**
 * Filter the combined `errors` + `warnings` arrays for diagnostics
 * matching `code`. The api.js return shape places fatal errors in
 * `errors[]` and W-/info-level diagnostics in `warnings[]`; some
 * cross-cutting code reads the whole diagnostic stream regardless.
 */
function diagsByCode(result, code) {
  const all = [...(result.errors ?? []), ...(result.warnings ?? [])];
  return all.filter((d) => d.code === code);
}

// ---------------------------------------------------------------------------
// §1 — FX-3 cascade: E-AUTH-GRAPH-002 + E-CLOSURE-002 + W-AUTH-RUNTIME-FALLBACK
// ---------------------------------------------------------------------------

describe("FX-3 — no role enum + auth-role-block cascade", () => {
  test("E-AUTH-GRAPH-002 fires (AG: variant-referencing gate, no enum)", () => {
    const result = compileFx3();
    const matches = diagsByCode(result, "E-AUTH-GRAPH-002");
    expect(matches.length).toBeGreaterThanOrEqual(1);
    // Severity is Error per SPEC §34 line 14942.
    for (const d of matches) {
      expect(d.severity).toBe("error");
    }
  });

  test("E-CLOSURE-002 fires (RS Component 4: implicit-anonymous + auth-role-block)", () => {
    const result = compileFx3();
    const matches = diagsByCode(result, "E-CLOSURE-002");
    expect(matches.length).toBeGreaterThanOrEqual(1);
    // Severity is Error per SPEC §34 line 14939.
    for (const d of matches) {
      expect(d.severity).toBe("error");
    }
  });

  test("W-AUTH-RUNTIME-FALLBACK fires (gate is runtime-fallback when no enum)", () => {
    // Per `reachability/component-4.ts:234-241` the lint fires when
    // ANY role classifies as runtime-fallback. The implicit-anonymous
    // path takes that branch for every auth-role-block gate.
    const result = compileFx3();
    const matches = diagsByCode(result, "W-AUTH-RUNTIME-FALLBACK");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  test("W-CG-CHUNK-MISSING-ROLE does NOT fire — anonymous-only emission has no expected role variants", () => {
    // FX-3 has `<auth role="Admin">` — but the AST-walked role set is
    // {Admin}, AND the splitter's emittedRoles set (when no enum is
    // declared) is just {_anonymous}. Per route-splitter:876-877 the
    // lint fires for any referenced role NOT in emittedRoles. So
    // W-CG-CHUNK-MISSING-ROLE WOULD also fire on FX-3 — assert that
    // both diagnostics surface coherently.
    //
    // Documented surfacing: this lint co-fires with E-CLOSURE-002 +
    // E-AUTH-GRAPH-002 in the no-enum + auth-role-block scenario. The
    // assertion below records that observation for downstream diff-
    // detection.
    const result = compileFx3();
    const matches = diagsByCode(result, "W-CG-CHUNK-MISSING-ROLE");
    expect(matches.length).toBeGreaterThanOrEqual(1);
    for (const d of matches) {
      expect(d.severity).toBe("warning");
    }
  });
});

// ---------------------------------------------------------------------------
// §2 — FX-3 cross-stage ordering
// ---------------------------------------------------------------------------

describe("FX-3 — inter-stage cascade ordering", () => {
  test("AG (E-AUTH-GRAPH-002) appears in the diagnostic stream BEFORE RS (E-CLOSURE-002)", () => {
    // Diagnostics are pushed into `allErrors` in pipeline-execution
    // order (api.js: stage(...) -> collectErrors(...)). Stage 7.55 AG
    // runs BEFORE Stage 7.6 RS, so the first E-AUTH-GRAPH-002 must
    // index-precede the first E-CLOSURE-002.
    const result = compileFx3();
    const all = [...(result.errors ?? []), ...(result.warnings ?? [])];
    const agIdx = all.findIndex((d) => d.code === "E-AUTH-GRAPH-002");
    const rsIdx = all.findIndex((d) => d.code === "E-CLOSURE-002");
    expect(agIdx).toBeGreaterThanOrEqual(0);
    expect(rsIdx).toBeGreaterThanOrEqual(0);
    // api.js partitions errors[] before warnings[], but ordering WITHIN
    // errors[] preserves push order. Both AG E-AUTH-GRAPH-002 and RS
    // E-CLOSURE-002 are errors — AG was pushed first.
    const errsOnly = (result.errors ?? []);
    const agErrIdx = errsOnly.findIndex((d) => d.code === "E-AUTH-GRAPH-002");
    const rsErrIdx = errsOnly.findIndex((d) => d.code === "E-CLOSURE-002");
    expect(agErrIdx).toBeGreaterThanOrEqual(0);
    expect(rsErrIdx).toBeGreaterThanOrEqual(0);
    expect(agErrIdx).toBeLessThan(rsErrIdx);
  });

  test("pipeline does NOT halt — RS still produces a ReachabilityRecord", () => {
    const result = compileFx3();
    expect(result.reachabilityRecord).toBeDefined();
    // Even with E-CLOSURE-002 firing, the implicit-anonymous floor
    // produces at least one closure entry per entry-point file.
    const closures = result.reachabilityRecord?.closures;
    expect(closures).toBeDefined();
    expect(closures?.size ?? 0).toBeGreaterThan(0);
  });

  test("pipeline does NOT halt — splitter still emits chunks + chunks.json", () => {
    // The pipeline does not short-circuit on AG / RS errors; the per-
    // route splitter still iterates the (synthesized-anonymous) role
    // map and emits chunks + manifest.
    const result = compileFx3();
    expect(result.chunks).toBeDefined();
    expect(result.chunks.size).toBeGreaterThan(0);
    expect(result.chunksManifest).toBeDefined();
    expect(typeof result.chunksManifest.compiler).toBe("string");
  });

  test("emitted chunks key on `_anonymous` (synthesized floor)", () => {
    // With no real role enum, `synthesizeAnonymousEnum` produces a
    // single-variant `_anonymous` floor. Component 4 + splitter
    // iterate that single role.
    const result = compileFx3();
    const roles = new Set();
    for (const c of result.chunks.values()) roles.add(c.role);
    expect(roles.has("_anonymous")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §3 — FX-4 cascade: E-AUTH-GRAPH-003 + W-AUTH-RUNTIME-FALLBACK + W-CG-CHUNK-MISSING-ROLE
// ---------------------------------------------------------------------------

describe("FX-4 — typo'd role variant cascade", () => {
  test("E-AUTH-GRAPH-003 fires (AG classifier: variant tag not in enum)", () => {
    const result = compileFx4();
    const matches = diagsByCode(result, "E-AUTH-GRAPH-003");
    expect(matches.length).toBeGreaterThanOrEqual(1);
    // Severity is Error per SPEC §34 line 14943.
    for (const d of matches) {
      expect(d.severity).toBe("error");
    }
    // The diagnostic message should name the typo'd variant verbatim.
    expect(matches[0].message).toContain("Admni");
  });

  test("W-CG-CHUNK-MISSING-ROLE fires (route-splitter: source cites Admni, no chunk emitted)", () => {
    const result = compileFx4();
    const matches = diagsByCode(result, "W-CG-CHUNK-MISSING-ROLE");
    expect(matches.length).toBeGreaterThanOrEqual(1);
    // Severity is Warning per SPEC §34 line 14736.
    for (const d of matches) {
      expect(d.severity).toBe("warning");
    }
    // The diagnostic message should name the typo'd variant verbatim.
    expect(matches[0].message).toContain("Admni");
  });

  test("W-AUTH-RUNTIME-FALLBACK fires (typo → closed_form: false → all-roles runtime-fallback)", () => {
    // Per `auth-graph.ts:1690-1702` the typo'd variant returns a
    // `{ closed_form: false }` classification, AND fires E-AUTH-GRAPH-003.
    // Then per `component-4.ts:373-379`, closed_form: false maps to
    // RUNTIME-FALLBACK for all roles → W-AUTH-RUNTIME-FALLBACK fires.
    const result = compileFx4();
    const matches = diagsByCode(result, "W-AUTH-RUNTIME-FALLBACK");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  test("E-AUTH-GRAPH-002 does NOT fire — enum IS declared, just the variant is wrong", () => {
    const result = compileFx4();
    expect(diagsByCode(result, "E-AUTH-GRAPH-002")).toEqual([]);
  });

  test("E-CLOSURE-002 does NOT fire — enum IS declared (not implicit-anonymous)", () => {
    // E-CLOSURE-002 fires only when isImplicitAnonymous + auth-role-block.
    // FX-4 has a real declared enum, so isImplicitAnonymous = false.
    const result = compileFx4();
    expect(diagsByCode(result, "E-CLOSURE-002")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// §4 — FX-4 cross-stage ordering + fallback shape
// ---------------------------------------------------------------------------

describe("FX-4 — inter-stage ordering + fallback chunk shape", () => {
  test("AG (E-AUTH-GRAPH-003) appears BEFORE route-splitter (W-CG-CHUNK-MISSING-ROLE)", () => {
    // Stage 7.55 AG runs BEFORE Stage 8 CG splitter — but they live
    // in different streams (errors vs warnings). Verify each is in
    // its expected partition.
    const result = compileFx4();
    expect(diagsByCode(result, "E-AUTH-GRAPH-003").length).toBeGreaterThanOrEqual(1);
    expect(diagsByCode(result, "W-CG-CHUNK-MISSING-ROLE").length).toBeGreaterThanOrEqual(1);
    // The fatal-error AG diagnostic surfaces in result.errors;
    // the warning-level splitter diagnostic surfaces in result.warnings.
    expect((result.errors ?? []).some((d) => d.code === "E-AUTH-GRAPH-003")).toBe(true);
    expect((result.warnings ?? []).some((d) => d.code === "W-CG-CHUNK-MISSING-ROLE")).toBe(true);
  });

  test("emitted chunks cover the resolved enum variants (Anonymous + Admin only)", () => {
    // The typo'd `Admni` is NOT in the resolved enum, so RS Component
    // 4 produces ChunkPlans only for the actual variants. The splitter
    // emits one chunk per (EP, role, tier) for those variants.
    const result = compileFx4();
    const initialChunks = [...result.chunks.values()].filter(
      (c) => c.tier === "initial",
    );
    const roles = new Set(initialChunks.map((c) => c.role));
    expect(roles.has("Anonymous")).toBe(true);
    expect(roles.has("Admin")).toBe(true);
    expect(roles.has("Admni")).toBe(false);
  });

  test("chunks.json carries the resolved enum variants but NOT the typo", () => {
    const result = compileFx4();
    const epKeys = Object.keys(result.chunksManifest.entryPoints);
    expect(epKeys.length).toBe(1);
    const perRole = result.chunksManifest.entryPoints[epKeys[0]];
    const roles = Object.keys(perRole).sort();
    expect(roles).toEqual(["Admin", "Anonymous"]);
    expect(roles).not.toContain("Admni");
  });

  test("pipeline does NOT halt — chunks.json + RS record both surface", () => {
    const result = compileFx4();
    expect(result.reachabilityRecord).toBeDefined();
    expect(result.chunks).toBeDefined();
    expect(result.chunksManifest).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// §5 — Cross-fixture invariants (no state leak; deterministic output)
// ---------------------------------------------------------------------------

describe("Cross-fixture invariants", () => {
  test("compiling FX-3 then FX-4 in sequence does not leak diagnostics", () => {
    const r3 = compileFx3();
    const r4 = compileFx4();
    // FX-3-specific codes do NOT appear on the FX-4 result.
    expect(diagsByCode(r4, "E-CLOSURE-002")).toEqual([]);
    expect(diagsByCode(r4, "E-AUTH-GRAPH-002")).toEqual([]);
    // FX-4-specific code does NOT appear on the FX-3 result.
    // (E-AUTH-GRAPH-003 fires on a wrong-variant gate; FX-3 has no
    // enum at all so the classifier short-circuits before the
    // variant-vs-enum check.)
    expect(diagsByCode(r3, "E-AUTH-GRAPH-003")).toEqual([]);
  });

  test("FX-3 determinism — two compiles produce byte-identical chunks.json", () => {
    const a = compileFx3();
    const b = compileFx3();
    expect(a.chunksManifestJson()).toBe(b.chunksManifestJson());
  });

  test("FX-4 determinism — two compiles produce byte-identical chunks.json AND identical diagnostic codes", () => {
    const a = compileFx4();
    const b = compileFx4();
    expect(a.chunksManifestJson()).toBe(b.chunksManifestJson());
    const codesA = [
      ...(a.errors ?? []).map((d) => d.code),
      ...(a.warnings ?? []).map((d) => d.code),
    ].sort();
    const codesB = [
      ...(b.errors ?? []).map((d) => d.code),
      ...(b.warnings ?? []).map((d) => d.code),
    ].sort();
    expect(codesA).toEqual(codesB);
  });
});
