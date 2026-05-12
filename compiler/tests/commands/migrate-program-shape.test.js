/**
 * Tests for `scrml migrate --program-shape` (v0.3 Wave 2 — S86).
 *
 * Covers:
 *  §1  classifyFile — entry / route / module / schema-anchor / ambiguous buckets
 *  §2  applyProgramShapeRewrite — per-bucket rewrite behavior
 *  §3  fixture corpus snapshots (5 fixtures, one per bucket)
 *  §4  idempotency (running rewrite twice produces same source)
 *  §5  safety harness — broken rewrites leave file untouched
 *  §6  --report mode renders structured advisories
 *  §7  zero-regression on baseline W-* migrations
 *
 * Fixture corpus: compiler/tests/commands/migrate-program-shape-fixtures/
 *   - entry-app.scrml             — entry bucket (REWRITE: unwrap `${...}`)
 *   - pages/dashboard.scrml       — route bucket (REWRITE: program → page)
 *   - pages/dashboard-mixed.scrml — route bucket (SKIP: mixed attrs)
 *   - components/button.scrml     — module bucket (NOOP)
 *   - schema-anchor.scrml         — schema-anchor bucket (ADVISORY)
 */

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import {
  mkdirSync,
  rmSync,
  cpSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from "fs";
import { join, sep, dirname, resolve } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import {
  classifyFile,
  applyProgramShapeRewrite,
  applyMigrations,
  migrateFile,
} from "../../src/commands/migrate.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, "migrate-program-shape-fixtures");

let tmpDir;

function setupTmp() {
  tmpDir = join(
    tmpdir(),
    `scrml-migrate-shape-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(tmpDir, { recursive: true });
}

function teardownTmp() {
  if (tmpDir && existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Copy the fixture corpus into a fresh tmp dir so tests can rewrite files
 * in-place without touching the checked-in fixtures.
 */
function copyFixturesTo(tmp) {
  cpSync(FIXTURES_DIR, tmp, { recursive: true });
}

// ---------------------------------------------------------------------------
// §1  classifyFile — bucket inference
// ---------------------------------------------------------------------------

describe("§1 classifyFile — bucket inference", () => {
  test("entry file with `<program>` only (no pages/ parent) → 'entry'", () => {
    const absPath = "/project/app.scrml";
    const src = `<program title="x">\n  <div>hi</div>\n</program>`;
    const r = classifyFile(absPath, src, "/project");
    expect(r.bucket).toBe("entry");
    expect(r.evidence.some((e) => e.includes("`<program ...>`"))).toBe(true);
  });

  test("route file under `pages/` with `<program ...>` opener → 'route'", () => {
    const absPath = "/project/pages/dashboard.scrml";
    const src = `<program auth="required">\n  <div/>\n</program>`;
    const r = classifyFile(absPath, src, "/project");
    expect(r.bucket).toBe("route");
    expect(r.evidence.some((e) => e.includes("`pages/`"))).toBe(true);
  });

  test("route file under `routes/` is also classified as 'route'", () => {
    const absPath = "/project/routes/home.scrml";
    const src = `<program>\n  <div/>\n</program>`;
    const r = classifyFile(absPath, src, "/project");
    expect(r.bucket).toBe("route");
    expect(r.evidence.some((e) => e.includes("`routes/`"))).toBe(true);
  });

  test("module file under `components/` with no wrapper → 'module'", () => {
    const absPath = "/project/components/button.scrml";
    const src = `\${\n  export fn x() {}\n}`;
    const r = classifyFile(absPath, src, "/project");
    expect(r.bucket).toBe("module");
  });

  test("schema-anchor file (<schema> + <program db=>) → 'schema-anchor'", () => {
    const absPath = "/project/schema.scrml";
    const src = `<program db="./x.db">\n  <schema>\n    users: { id: int }\n  </schema>\n</program>`;
    const r = classifyFile(absPath, src, "/project");
    expect(r.bucket).toBe("schema-anchor");
  });

  test("`<page>`-already file under pages/ → 'route' (idempotent NOOP applies)", () => {
    const absPath = "/project/pages/home.scrml";
    const src = `<page auth="required">\n  <div/>\n</page>`;
    const r = classifyFile(absPath, src, "/project");
    expect(r.bucket).toBe("route");
  });

  test("ambiguous: `_layout.scrml` under pages/ with `<program>` → 'ambiguous'", () => {
    const absPath = "/project/pages/_layout.scrml";
    const src = `<program>\n  <div/>\n</program>`;
    const r = classifyFile(absPath, src, "/project");
    expect(r.bucket).toBe("ambiguous");
  });

  test("entry file with leading `//` comments before `<program>` is still classified", () => {
    const absPath = "/project/app.scrml";
    const src = `// header comment\n// second line\n<program title="x">\n  <div/>\n</program>`;
    const r = classifyFile(absPath, src, "/project");
    expect(r.bucket).toBe("entry");
  });

  test("module file at project root with no opener → 'module'", () => {
    const absPath = "/project/seeds.scrml";
    const src = `\${\n  export fn runSeeds() {}\n}`;
    const r = classifyFile(absPath, src, "/project");
    expect(r.bucket).toBe("module");
  });
});

// ---------------------------------------------------------------------------
// §2  applyProgramShapeRewrite — per-bucket behavior
// ---------------------------------------------------------------------------

describe("§2 applyProgramShapeRewrite — per-bucket rewrite behavior", () => {
  test("schema-anchor bucket → ADVISORY only; source unchanged", () => {
    const src = `<program db="./x.db">\n  <schema>users: { id: int }</schema>\n</program>`;
    const r = applyProgramShapeRewrite(src, {
      bucket: "schema-anchor",
      evidence: [],
    });
    expect(r.changed).toBe(false);
    expect(r.action).toBe("ADVISORY");
    expect(r.rewritten).toBe(src);
    expect(r.advisories.some((a) => a.message.includes("§39.12.0"))).toBe(true);
  });

  test("module bucket with no `<program>` wrapper → NOOP, no advisory", () => {
    const src = `\${\n  export fn x() {}\n}`;
    const r = applyProgramShapeRewrite(src, { bucket: "module", evidence: [] });
    expect(r.changed).toBe(false);
    expect(r.action).toBe("ADVISORY"); // module always gets ADVISORY action label
    // ...but in this case no advisory message (no wrapper to flag).
    expect(r.advisories.length).toBe(0);
  });

  test("module bucket with `<program>` wrapper → ADVISORY with hint", () => {
    const src = `<program>\n  \${\n    export fn x() {}\n  }\n</program>`;
    const r = applyProgramShapeRewrite(src, { bucket: "module", evidence: [] });
    expect(r.changed).toBe(false);
    expect(r.action).toBe("ADVISORY");
    expect(r.advisories.length).toBe(1);
    expect(r.advisories[0].message).toContain("module-shape file");
    expect(r.advisories[0].hint).toContain("strip the wrapper");
  });

  test("route bucket with `<program>` per-route attrs only → REWRITE to `<page>`", () => {
    const src = `<program auth="required" db="./x.db">\n  <div/>\n</program>`;
    const r = applyProgramShapeRewrite(src, { bucket: "route", evidence: [] });
    expect(r.changed).toBe(true);
    expect(r.action).toBe("REWRITE");
    expect(r.rewritten).toContain(`<page auth="required" db="./x.db">`);
    expect(r.rewritten).toContain(`</page>`);
    expect(r.rewritten).not.toContain(`<program`);
    expect(r.rewritten).not.toContain(`</program>`);
  });

  test("route bucket with `<program>` mixed attrs → SKIP + advisory", () => {
    const src = `<program title="x" auth="required" cors="*">\n  <div/>\n</program>`;
    const r = applyProgramShapeRewrite(src, { bucket: "route", evidence: [] });
    expect(r.changed).toBe(false);
    expect(r.action).toBe("SKIP");
    expect(r.advisories[0].message).toContain("app-wide attrs");
    expect(r.advisories[0].hint).toContain("split");
  });

  test("route bucket with `<page>` already → NOOP (idempotent)", () => {
    const src = `<page auth="required">\n  <div/>\n</page>`;
    const r = applyProgramShapeRewrite(src, { bucket: "route", evidence: [] });
    expect(r.changed).toBe(false);
    expect(r.action).toBe("NOOP");
    expect(r.rewritten).toBe(src);
  });

  test("route bucket with non-program/non-page opener → SKIP + advisory", () => {
    const src = `<channel name="x">\n  <q> = ""\n</channel>`;
    const r = applyProgramShapeRewrite(src, { bucket: "route", evidence: [] });
    expect(r.changed).toBe(false);
    expect(r.action).toBe("SKIP");
  });

  test("entry bucket with redundant `${...}` wrapping decls → UNWRAP", () => {
    const src = `<program title="x">\n  \${\n    <count> = 0\n    <message> = "hi"\n  }\n  <div>x</div>\n</program>`;
    const r = applyProgramShapeRewrite(src, { bucket: "entry", evidence: [] });
    expect(r.changed).toBe(true);
    expect(r.action).toBe("REWRITE");
    // The `${...}` wrapper should be gone; decls remain as bare text.
    expect(r.rewritten).toContain(`<count> = 0`);
    expect(r.rewritten).toContain(`<message> = "hi"`);
    expect(r.rewritten).not.toMatch(/\$\{\s*\n\s*<count>/);
  });

  test("entry bucket with `${...}` containing non-decl content → leave wrapped", () => {
    const src = `<program title="x">\n  \${\n    for (let i = 0; i < 10; i++) {}\n  }\n  <div/>\n</program>`;
    const r = applyProgramShapeRewrite(src, { bucket: "entry", evidence: [] });
    // Should NOT unwrap (for-loop is imperative, not a declaration).
    expect(r.rewritten).toContain(`\${`);
    expect(r.rewritten).toContain(`for (let i = 0`);
  });

  test("entry bucket with file-top `${...}` ABOVE <program> → advisory", () => {
    const src = `\${\n  const x = 0\n}\n<program title="x">\n  <div/>\n</program>`;
    const r = applyProgramShapeRewrite(src, { bucket: "entry", evidence: [] });
    expect(r.advisories.some((a) => a.message.includes("ABOVE the `<program>`"))).toBe(true);
  });

  test("ambiguous bucket → SKIP + advisory", () => {
    const src = `<program>\n  <div/>\n</program>`;
    const r = applyProgramShapeRewrite(src, { bucket: "ambiguous", evidence: [] });
    expect(r.changed).toBe(false);
    expect(r.action).toBe("SKIP");
    expect(r.advisories[0].message).toContain("ambiguous");
  });
});

// ---------------------------------------------------------------------------
// §3  Fixture corpus — classification + rewrite snapshots
// ---------------------------------------------------------------------------

describe("§3 fixture corpus snapshots", () => {
  test("entry-app.scrml is classified 'entry'", () => {
    const path = join(FIXTURES_DIR, "entry-app.scrml");
    const src = readFileSync(path, "utf8");
    const r = classifyFile(path, src, FIXTURES_DIR);
    expect(r.bucket).toBe("entry");
  });

  test("pages/dashboard.scrml is classified 'route' + REWRITES <program> → <page>", () => {
    const path = join(FIXTURES_DIR, "pages", "dashboard.scrml");
    const src = readFileSync(path, "utf8");
    const r = classifyFile(path, src, FIXTURES_DIR);
    expect(r.bucket).toBe("route");
    const shape = applyProgramShapeRewrite(src, r);
    expect(shape.action).toBe("REWRITE");
    expect(shape.changed).toBe(true);
    expect(shape.rewritten).toContain(`<page auth="required" db="./local.db">`);
    expect(shape.rewritten).toContain(`</page>`);
  });

  test("pages/dashboard-mixed.scrml is classified 'route' + SKIPS (mixed attrs)", () => {
    const path = join(FIXTURES_DIR, "pages", "dashboard-mixed.scrml");
    const src = readFileSync(path, "utf8");
    const r = classifyFile(path, src, FIXTURES_DIR);
    expect(r.bucket).toBe("route");
    const shape = applyProgramShapeRewrite(src, r);
    expect(shape.action).toBe("SKIP");
    expect(shape.changed).toBe(false);
    expect(shape.advisories[0].message).toContain("app-wide");
  });

  test("components/button.scrml is classified 'module' + NOOPs (no wrapper)", () => {
    const path = join(FIXTURES_DIR, "components", "button.scrml");
    const src = readFileSync(path, "utf8");
    const r = classifyFile(path, src, FIXTURES_DIR);
    expect(r.bucket).toBe("module");
    const shape = applyProgramShapeRewrite(src, r);
    expect(shape.changed).toBe(false);
    expect(shape.action).toBe("ADVISORY"); // module-bucket action label
    expect(shape.advisories.length).toBe(0);
  });

  test("schema-anchor.scrml is classified 'schema-anchor' + ADVISORY only", () => {
    const path = join(FIXTURES_DIR, "schema-anchor.scrml");
    const src = readFileSync(path, "utf8");
    const r = classifyFile(path, src, FIXTURES_DIR);
    expect(r.bucket).toBe("schema-anchor");
    const shape = applyProgramShapeRewrite(src, r);
    expect(shape.action).toBe("ADVISORY");
    expect(shape.changed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §4  Idempotency
// ---------------------------------------------------------------------------

describe("§4 idempotency", () => {
  test("rewriting a route file twice produces the same result", () => {
    const path = join(FIXTURES_DIR, "pages", "dashboard.scrml");
    const src = readFileSync(path, "utf8");
    const r1 = classifyFile(path, src, FIXTURES_DIR);
    const pass1 = applyProgramShapeRewrite(src, r1);
    expect(pass1.changed).toBe(true);

    // Pass 2: re-classify rewritten output and re-apply.
    const r2 = classifyFile(path, pass1.rewritten, FIXTURES_DIR);
    const pass2 = applyProgramShapeRewrite(pass1.rewritten, r2);
    expect(pass2.changed).toBe(false);
    expect(pass2.action).toBe("NOOP");
    expect(pass2.rewritten).toBe(pass1.rewritten);
  });

  test("rewriting an entry file twice produces the same result", () => {
    const path = join(FIXTURES_DIR, "entry-app.scrml");
    const src = readFileSync(path, "utf8");
    const r1 = classifyFile(path, src, FIXTURES_DIR);
    const pass1 = applyProgramShapeRewrite(src, r1);
    expect(pass1.changed).toBe(true);

    const r2 = classifyFile(path, pass1.rewritten, FIXTURES_DIR);
    const pass2 = applyProgramShapeRewrite(pass1.rewritten, r2);
    expect(pass2.changed).toBe(false);
    expect(pass2.rewritten).toBe(pass1.rewritten);
  });

  test("rewriting a schema-anchor file twice is always a no-op", () => {
    const path = join(FIXTURES_DIR, "schema-anchor.scrml");
    const src = readFileSync(path, "utf8");
    const r1 = classifyFile(path, src, FIXTURES_DIR);
    const pass1 = applyProgramShapeRewrite(src, r1);
    expect(pass1.changed).toBe(false);
    const pass2 = applyProgramShapeRewrite(pass1.rewritten, r1);
    expect(pass2.rewritten).toBe(pass1.rewritten);
  });
});

// ---------------------------------------------------------------------------
// §5  Safety harness — broken rewrites leave file untouched
// ---------------------------------------------------------------------------

describe("§5 safety harness", () => {
  beforeEach(setupTmp);
  afterEach(teardownTmp);

  test("if rewritten source fails to compile, file on disk is untouched", () => {
    // Engineer a rewrite that the safety-harness must reject: a route file
    // whose body imports `./nonexistent.scrml`. The import target literally
    // does not exist on disk, so MOD fires E-IMPORT-006 regardless of how
    // the harness stages the rewrite. The migrate command must restore the
    // original content (option-β: writeFileSync the original from the
    // in-memory backup) and report `failed`.
    const route = join(tmpDir, "pages", "broken.scrml");
    mkdirSync(dirname(route), { recursive: true });
    const original = `<program auth="required">\n  \${ import { x } from "./nonexistent.scrml" }\n  <div/>\n</program>`;
    writeFileSync(route, original, "utf8");

    const r = migrateFile(
      route,
      { dryRun: false, check: false, programShape: true, projectRoot: tmpDir },
      tmpDir,
    );

    expect(r.status).toBe("failed");
    expect(r.reason).toContain("failed to parse");
    // Original file untouched on disk.
    expect(readFileSync(route, "utf8")).toBe(original);
  });

  // -------------------------------------------------------------------------
  // §5b — Option-β cross-file-import safety-harness coverage
  //
  // Pre-fix (per-call tmp staging): every route file with any relative
  // `.scrml` import failed the safety harness because the staged tmp dir
  // did not contain the import target. This sweep blocked v0.3 fixture
  // migration on 20 of 36 trucking-dispatch files.
  //
  // Post-fix (transactional in-place rewrite + restore): the rewrite is
  // staged at the file's real on-disk path, `compileScrml({ gather: true })`
  // walks the real import graph, and the original content is restored from
  // an in-memory backup before this function returns. The gate fires only
  // on real breakage — not on environmental mismatch.
  //
  // Coverage:
  //   (i)   positive — single-file (no imports) — regression of pre-fix happy path
  //   (ii)  positive — multi-file (cross-file imports) — THE FIX
  //   (iii) negative — broken rewrite (covered by §5 above)
  //   (iv)  edge — module file with no rewrite — gate not invoked
  //   (v)   on-disk invariant — dry-run leaves the file untouched even when
  //         the harness writes the rewrite mid-check (option-β restore path)
  // -------------------------------------------------------------------------
  describe("§5b option-β harness — cross-file imports + restore semantics", () => {
    test("(i) positive — self-contained route file: gate passes (regression)", () => {
      // Single-file route under pages/ with NO imports. Pre-fix and post-fix
      // both pass — this verifies the fix didn't break the happy path.
      const route = join(tmpDir, "pages", "self-contained.scrml");
      mkdirSync(dirname(route), { recursive: true });
      const original = `<program auth="required">\n  <div>hi</div>\n</program>`;
      writeFileSync(route, original, "utf8");

      const r = migrateFile(
        route,
        { dryRun: false, check: false, programShape: true, projectRoot: tmpDir },
        tmpDir,
      );

      expect(r.status).toBe("changed");
      expect(r.action).toBe("REWRITE");
      // Post-rewrite, the file on disk now has `<page>` (in-place mode).
      const onDisk = readFileSync(route, "utf8");
      expect(onDisk).toContain(`<page auth="required">`);
      expect(onDisk).toContain(`</page>`);
    });

    test("(ii) positive — multi-file route with cross-file imports: gate passes (THE FIX)", () => {
      // The case the option-β fix is for: a route file imports a helper from
      // a sibling `models/` file. Pre-fix this hit E-IMPORT-006 in the staged
      // tmp dir and the rewrite was rejected. Post-fix the gate passes.
      // Use the checked-in multi-file-app fixture, copied to a tmp tree so
      // we can rewrite in place without mutating the source tree.
      copyFixturesTo(tmpDir);
      const route = join(tmpDir, "multi-file-app", "pages", "dashboard.scrml");
      const original = readFileSync(route, "utf8");
      expect(original).toContain(`<program auth="required">`);
      expect(original).toContain(`import { requireAuth, AUTH_HEADER } from '../models/auth.scrml'`);

      const r = migrateFile(
        route,
        {
          dryRun: false,
          check: false,
          programShape: true,
          projectRoot: join(tmpDir, "multi-file-app"),
        },
        tmpDir,
      );

      expect(r.status).toBe("changed");
      expect(r.action).toBe("REWRITE");
      // On-disk: opener rewritten, imports preserved verbatim.
      const onDisk = readFileSync(route, "utf8");
      expect(onDisk).toContain(`<page auth="required">`);
      expect(onDisk).toContain(`</page>`);
      expect(onDisk).toContain(
        `import { requireAuth, AUTH_HEADER } from '../models/auth.scrml'`,
      );
    });

    test("(iv) edge — module file with no rewrite: gate is never invoked", () => {
      // Pure-fn module file. `applyProgramShapeRewrite` returns `changed:false`
      // and `migrateFile` short-circuits before calling sanityCheckParse.
      // We verify this by giving the file a body whose imports would FAIL
      // the harness if it ran — yet the file remains untouched (status
      // 'unchanged', not 'failed').
      const mod = join(tmpDir, "models", "lib.scrml");
      mkdirSync(dirname(mod), { recursive: true });
      const original = `\${\n  import { gone } from "./nonexistent.scrml"\n  export fn x() { gone() }\n}`;
      writeFileSync(mod, original, "utf8");

      const r = migrateFile(
        mod,
        { dryRun: false, check: false, programShape: true, projectRoot: tmpDir },
        tmpDir,
      );

      // Module bucket: NOOP/ADVISORY, not 'failed' (harness not run because
      // changed === false).
      expect(r.status).toBe("unchanged");
      expect(r.classification?.bucket).toBe("module");
      // File on disk is unchanged.
      expect(readFileSync(mod, "utf8")).toBe(original);
    });

    test("(v) on-disk invariant — dry-run never leaves the file rewritten", () => {
      // Option-β's transactional flow writes the rewrite to the file mid-check
      // and then restores from the in-memory backup. Verify the restore path
      // runs in dry-run mode (where the caller explicitly does not want any
      // on-disk change).
      copyFixturesTo(tmpDir);
      const route = join(tmpDir, "multi-file-app", "pages", "dashboard.scrml");
      const before = readFileSync(route, "utf8");

      const r = migrateFile(
        route,
        {
          dryRun: true,
          check: false,
          programShape: true,
          report: true,
          projectRoot: join(tmpDir, "multi-file-app"),
        },
        tmpDir,
      );

      expect(r.status).toBe("changed");
      expect(r.action).toBe("REWRITE");
      // Dry-run: file on disk MUST be byte-identical to the pre-call content.
      // This is the option-β restore-from-backup invariant.
      const after = readFileSync(route, "utf8");
      expect(after).toBe(before);
    });
  });
});

// ---------------------------------------------------------------------------
// §6  --report mode advisories
// ---------------------------------------------------------------------------

describe("§6 --report mode", () => {
  beforeEach(setupTmp);
  afterEach(teardownTmp);

  test("dry-run programShape returns classification + advisories per file", () => {
    copyFixturesTo(tmpDir);

    // Entry file
    const entryRes = migrateFile(
      join(tmpDir, "entry-app.scrml"),
      { dryRun: true, check: false, programShape: true, report: true, projectRoot: tmpDir },
      tmpDir,
    );
    expect(entryRes.classification.bucket).toBe("entry");

    // Mixed-attrs route file
    const mixedRes = migrateFile(
      join(tmpDir, "pages", "dashboard-mixed.scrml"),
      { dryRun: true, check: false, programShape: true, report: true, projectRoot: tmpDir },
      tmpDir,
    );
    expect(mixedRes.classification.bucket).toBe("route");
    expect(mixedRes.action).toBe("SKIP");
    expect(mixedRes.advisories.length).toBeGreaterThan(0);

    // Schema-anchor file
    const schemaRes = migrateFile(
      join(tmpDir, "schema-anchor.scrml"),
      { dryRun: true, check: false, programShape: true, report: true, projectRoot: tmpDir },
      tmpDir,
    );
    expect(schemaRes.classification.bucket).toBe("schema-anchor");
    expect(schemaRes.action).toBe("ADVISORY");
  });
});

// ---------------------------------------------------------------------------
// §7  Zero-regression on baseline W-* migrations
// ---------------------------------------------------------------------------

describe("§7 baseline W-* migrations untouched", () => {
  test("applyMigrations still rewrites W-WHITESPACE-001 patterns", () => {
    const { rewritten, migrations } = applyMigrations(`<program>< db>x</></program>`);
    expect(rewritten).toContain(`<db>`);
    expect(migrations.whitespace).toBe(1);
  });

  test("applyMigrations still rewrites W-DEPRECATED-001 <machine> → <engine>", () => {
    const { rewritten, migrations } = applyMigrations(`<machine name=Foo>`);
    expect(rewritten).toBe(`<engine name=Foo>`);
    expect(migrations.machine).toBe(1);
  });

  test("--program-shape composes with W-* migrations cleanly", () => {
    // Source has BOTH a W-WHITESPACE pattern AND a route-shape <program>.
    // After applying both: `< db>` → `<db>` AND `<program>` opener → `<page>`.
    const src = `<program auth="required">\n  < db>?{ users: {id: int} }</>\n  <div/>\n</program>`;
    const baseline = applyMigrations(src);
    const cls = {
      bucket: "route",
      evidence: [],
    };
    const shape = applyProgramShapeRewrite(baseline.rewritten, cls);
    const final = shape.rewritten;
    expect(final).toContain(`<page auth="required">`);
    expect(final).toContain(`<db>`);
    expect(final).not.toContain(`< db>`);
    expect(final).toContain(`</page>`);
  });
});
