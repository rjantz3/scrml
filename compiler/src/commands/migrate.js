/**
 * @module commands/migrate
 * scrml migrate subcommand.
 *
 * Automated source rewrites for the deprecation/migration patterns introduced
 * in S52+S53. The CLI is opt-in — it never runs as part of `compile`/`dev`/`build`.
 *
 * Migrations shipped (P4):
 *   1. Whitespace-after-`<` (W-WHITESPACE-001):  `< db>` → `<db>`, etc.
 *      Applies only to known scrml lifecycle/structural keywords.
 *   2. `<machine>` keyword (W-DEPRECATED-001):   `<machine` → `<engine`.
 *
 * Migrations gated by `--program-shape` (v0.3 Wave 2 — S86):
 *   3. Program-shape rewrite per SPEC §40.8 (one-program-per-application).
 *      File classified as entry / route / module / schema-anchor / ambiguous;
 *      route files with per-route-only attrs rewrite `<program ...>` → `<page ...>`.
 *      Entry files unwrap redundant `${...}` wrappers around top-level decls.
 *      Schema-anchor files (`<schema>` + `<program db=>`) are LEFT ALONE per
 *      §39.12.0 v0.3 workaround; advisory emitted in `--report` mode.
 *      See `classifyFile` + `applyProgramShapeRewrite` below.
 *
 * Migrations deferred (P4):
 *   3a. Form 2 → Form 1 component desugaring (`export const Name = <markup>` →
 *      `export <Name>{markup}</>`). Deferred because text-substitution can't
 *      cleanly handle the surrounding `${ ... }` block boundary — the
 *      transformation requires either splitting the block or an AST-level
 *      rewrite. Tracked for P5+.
 *
 * Usage:
 *   scrml migrate <file|dir> [options]
 *
 * Options:
 *   --dry-run            Print unified diff to stdout without writing
 *   --check              Exit non-zero if any file would be modified (CI-friendly)
 *   --include=<glob>     File pattern to match (default: '*.scrml')
 *   --exclude=<glob>     Pattern to exclude (default: 'samples/' is excluded by default)
 *   --no-default-excludes  Disable the built-in `samples/` exclusion
 *   --program-shape      Enable v0.3 program-shape rewrites (SPEC §40.8)
 *   --report             With --dry-run --program-shape, emit structured advisory report
 *   --help, -h           Show this message
 *
 * Safety model:
 *   - For each file: read source, apply text-substitution migrations, then
 *     verify the rewritten source via `compileScrml({ write: false })` using
 *     a transactional in-place stage (write rewrite to original path, run
 *     compile, restore original) so cross-file imports resolve correctly.
 *     See `sanityCheckParse` for the full option-β rationale. If the
 *     rewritten source fails to compile, the file is restored from the
 *     in-memory backup and the failure is reported.
 *   - `samples/compilation-tests/` and `compiler/tests/` directories are
 *     excluded by default — those exercise deprecation paths intentionally.
 *   - Default operation is in-place rewriting. Use `--dry-run` for preview.
 */

import {
  readFileSync,
  writeFileSync,
  statSync,
  readdirSync,
  existsSync,
} from "fs";
import { resolve, join, relative, sep } from "path";
import { compileScrml } from "../api.js";

// ---------------------------------------------------------------------------
// ANSI color helpers
// ---------------------------------------------------------------------------

const isTTY = process.stderr.isTTY && process.stdout.isTTY;

const c = {
  red:    (s) => isTTY ? `\x1b[31m${s}\x1b[0m` : s,
  yellow: (s) => isTTY ? `\x1b[33m${s}\x1b[0m` : s,
  green:  (s) => isTTY ? `\x1b[32m${s}\x1b[0m` : s,
  cyan:   (s) => isTTY ? `\x1b[36m${s}\x1b[0m` : s,
  dim:    (s) => isTTY ? `\x1b[2m${s}\x1b[0m` : s,
  bold:   (s) => isTTY ? `\x1b[1m${s}\x1b[0m` : s,
};

// ---------------------------------------------------------------------------
// Migration rules
// ---------------------------------------------------------------------------

/**
 * Lifecycle / structural keywords whose openers may legitimately be rewritten.
 *
 * These are the keywords that NR / TAB recognize as compiler-known top-level
 * forms — never user-defined identifiers, never plain HTML tags. Only these
 * are rewritten to keep Migration 1 conservative (false-positives on a generic
 * lowercase `<\s+ident>` would mangle bareword text inside `${ }` blocks or
 * literal HTML body content.)
 *
 * Sourced from name-resolver.ts LIFECYCLE_CATEGORY plus structural keywords
 * (program / page / body / lin) recognized by BS / TAB.
 */
const KNOWN_KEYWORDS = new Set([
  // Lifecycle (name-resolver.ts LIFECYCLE_CATEGORY)
  "channel",
  "engine",
  "machine",
  "timer",
  "poll",
  "db",
  "schema",
  "request",
  "errorBoundary",
  "errorboundary",
  // Structural (top-level scrml constructs)
  "program",
  "page",
  "body",
  "lin",
]);

/**
 * Apply Migration 1 (W-WHITESPACE-001) and Migration 2 (W-DEPRECATED-001)
 * to a source string. Returns the rewritten source.
 *
 * Migration 1 — whitespace-after-`<`:
 *   `< db>` / `< schema/>` / `< channel for=X>` → `<db>` / `<schema/>` etc.
 *
 *   The regex captures the `<`, any whitespace, an identifier matching a known
 *   keyword, and the boundary character (whitespace, `>`, or `/`). It rewrites
 *   to `<ident<boundary>`, preserving the rest of the opener verbatim.
 *
 *   We restrict the identifier to the KNOWN_KEYWORDS list. A generic
 *   `< [a-z]+` rule would falsely match arbitrary lowercase HTML / component
 *   refs and even tag-like text inside string literals, which the regex
 *   approach can't disambiguate.
 *
 *   We also avoid rewriting `< /name>` (close tag) — the regex only matches
 *   when the next char after `<\s+` is a letter, not `/`.
 *
 * Migration 2 — `<machine>` keyword:
 *   `<machine` / `< machine` → `<engine` / `< engine` (preserving any
 *   leading whitespace after `<` — Migration 1 will normalize that on a
 *   follow-up pass).
 *
 *   Applied AFTER Migration 1 in the same pass: Migration 1 may have already
 *   normalized `< machine` → `<machine`, in which case Migration 2 picks it
 *   up here. If Migration 2 runs first on `< machine`, it produces `< engine`,
 *   and Migration 1 then normalizes that to `<engine`.
 *
 * @param {string} source — raw source text
 * @returns {{ rewritten: string, changed: boolean, migrations: { whitespace: number, machine: number } }}
 */
export function applyMigrations(source) {
  let result = source;
  let whitespaceCount = 0;
  let machineCount = 0;

  // Migration 1: `< KEYWORD<boundary>` → `<KEYWORD<boundary>`
  //
  // Pattern: `<` + at-least-one whitespace char + lowercase identifier +
  //          (whitespace | `>` | `/`).
  // Capture the identifier and the boundary char so we can re-emit them.
  // Apply only when the identifier is a known scrml keyword.
  result = result.replace(
    /<(\s+)([a-zA-Z][a-zA-Z0-9]*)(\s|>|\/)/g,
    (match, _ws, ident, boundary) => {
      if (!KNOWN_KEYWORDS.has(ident)) return match;
      whitespaceCount++;
      return `<${ident}${boundary}`;
    }
  );

  // Migration 2: `<\s*machine` (opener) → `<\s*engine`
  //
  // Pattern matches `<` + optional whitespace + `machine` + (whitespace | `>` |
  // `/`). The trailing-boundary check ensures we don't mangle identifiers
  // like `<machineState>` (false positive — `machineState` starts with
  // `machine` but isn't `machine` itself).
  result = result.replace(
    /<(\s*)machine(\s|>|\/)/g,
    (_match, ws, boundary) => {
      machineCount++;
      return `<${ws}engine${boundary}`;
    }
  );

  return {
    rewritten: result,
    changed: result !== source,
    migrations: {
      whitespace: whitespaceCount,
      machine: machineCount,
    },
  };
}

// ---------------------------------------------------------------------------
// v0.3 program-shape migration (SPEC §40.8) — classification + rewrite
// ---------------------------------------------------------------------------

/**
 * Per-route attributes allowed on `<page>` per SPEC §4.15 + §40.8 row.
 * Source-of-truth: the four PER-ROUTE concerns.
 */
const PER_ROUTE_ATTRS = new Set(["db", "auth", "csrf", "ratelimit"]);

/**
 * App-wide attributes — these belong on `<program>` per SPEC §40.8.
 * If a `<program>` opener carries ONLY per-route attrs (and none of these),
 * it is a candidate for `<program>` → `<page>` rewrite when classified as
 * a route file. If it carries MIXED (per-route + app-wide), surface to
 * `--report` and SKIP the rewrite (the author must split manually).
 */
const APP_WIDE_ATTRS = new Set([
  // §40.7 documentary
  "title", "description", "version", "author", "license",
  // §40.2 + §38.3.1 middleware
  "cors", "cors-max-age", "log", "headers",
  "idempotency-store", "idempotency-ttl",
  "channel-reconnect",
  // §43 nested-program attrs (also app-/process-scope)
  "name", "lang", "mode", "build", "port", "health",
  "protect", "callchar", "restart", "max-restarts",
  "within", "autostart",
]);

/**
 * Match the file-top `<program ...>` opener (NOT close tag, NOT nested).
 *
 * We scan from the top of the file, skipping blank lines and single-line
 * scrml/HTML comments (`//`, `<!--...-->`), and match the FIRST opener.
 * Returns `{ name, attrs, openerStart, openerEnd, attrsRaw }` or null.
 *
 * `attrs` is an array of `{name, value, raw, valueStart}` for each attribute
 * found. We keep parsing lightweight — regex-based — because the migrate
 * command runs PRE-parse (we don't have the AST at this point).
 *
 * @param {string} source
 * @returns {{name: string, attrs: Array<{name: string}>, openerStart: number, openerEnd: number, attrsRaw: string} | null}
 */
function findFileTopOpener(source) {
  // Skip a BOM if present.
  let i = source.charCodeAt(0) === 0xfeff ? 1 : 0;

  // Skip leading whitespace, `//` line comments, `<!--...-->` block comments,
  // and `${...}` logic blocks (legacy v0.2 file-top wrapper shape that v0.3
  // discourages but the migrate command must still tolerate when classifying).
  while (i < source.length) {
    const ch = source[i];
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      i++;
      continue;
    }
    if (ch === "/" && source[i + 1] === "/") {
      // Line comment — skip to EOL.
      const nl = source.indexOf("\n", i);
      i = nl === -1 ? source.length : nl + 1;
      continue;
    }
    if (ch === "<" && source[i + 1] === "!" && source[i + 2] === "-" && source[i + 3] === "-") {
      const end = source.indexOf("-->", i + 4);
      i = end === -1 ? source.length : end + 3;
      continue;
    }
    if (ch === "$" && source[i + 1] === "{") {
      // Skip past the matching `}` (brace-balanced, quote-aware).
      const close = findMatchingDollarClose(source, i);
      if (close === -1) return null;
      i = close + 1;
      continue;
    }
    break;
  }

  if (i >= source.length) return null;
  if (source[i] !== "<") return null;

  // Match an opener: `<identifier ... >` (skip close tags `</...>`).
  if (source[i + 1] === "/") return null;

  const openerStart = i;
  // Match identifier (allow alphanumeric + `-` since scrml uses kebab none here but be permissive).
  let j = i + 1;
  // Allow optional whitespace after `<` (the existing W-WHITESPACE-001 path,
  // but we treat that as still-valid input — we don't refuse to classify
  // a file whose `<program>` opener still has leading whitespace).
  while (j < source.length && (source[j] === " " || source[j] === "\t")) j++;
  const nameStart = j;
  while (j < source.length && /[A-Za-z0-9_-]/.test(source[j])) j++;
  if (j === nameStart) return null;
  const name = source.slice(nameStart, j);

  // Find the closing `>` of the opener. Watch out for `=...` attrs with
  // quoted values that may contain `>`. We track a quote state.
  let openerEnd = -1;
  let q = null;
  while (j < source.length) {
    const ch = source[j];
    if (q) {
      if (ch === q) q = null;
      j++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      q = ch;
      j++;
      continue;
    }
    if (ch === ">") {
      openerEnd = j;
      break;
    }
    j++;
  }
  if (openerEnd === -1) return null;

  // Extract the attrs region — between end-of-name and `>`. Strip a trailing
  // `/` if present (self-closing form).
  let attrsRaw = source.slice(nameStart + name.length, openerEnd);
  // Self-closing `<x .../>` has a trailing `/`; strip it from attrs region.
  attrsRaw = attrsRaw.replace(/\/\s*$/, "");

  const attrs = parseAttrsRaw(attrsRaw);

  return { name, attrs, openerStart, openerEnd, attrsRaw };
}

/**
 * Lightweight attribute parser for opener attrs. Returns a list of `{name}`
 * objects. We don't need values for classification — we only need the names.
 *
 * Handles: `attr`, `attr=value`, `attr="value"`, `attr='value'`. Skips
 * leading/trailing whitespace.
 *
 * @param {string} raw
 * @returns {Array<{name: string}>}
 */
function parseAttrsRaw(raw) {
  const out = [];
  let i = 0;
  while (i < raw.length) {
    // Skip whitespace.
    while (i < raw.length && /\s/.test(raw[i])) i++;
    if (i >= raw.length) break;
    // Read attr name.
    const nameStart = i;
    while (i < raw.length && /[A-Za-z0-9_-]/.test(raw[i])) i++;
    if (i === nameStart) {
      // No name — bail.
      i++;
      continue;
    }
    const name = raw.slice(nameStart, i);
    // Skip whitespace before `=` or next attr.
    while (i < raw.length && /\s/.test(raw[i])) i++;
    if (i < raw.length && raw[i] === "=") {
      i++; // consume `=`
      while (i < raw.length && /\s/.test(raw[i])) i++;
      // Skip the value.
      if (i < raw.length && (raw[i] === '"' || raw[i] === "'")) {
        const q = raw[i];
        i++;
        while (i < raw.length && raw[i] !== q) i++;
        if (i < raw.length) i++; // consume closing quote
      } else {
        // Unquoted value — read until whitespace.
        while (i < raw.length && !/\s/.test(raw[i])) i++;
      }
    }
    out.push({ name });
  }
  return out;
}

/**
 * Classify a `.scrml` file into one of five buckets per SPEC §40.8 +
 * page-helper-design.md Phase 2.1:
 *
 * - **entry**         — file contains a top-level `<program ...>` opener AND
 *                       is NOT located under a `pages/**` or `routes/**` parent.
 * - **route**         — file path matches `pages/**` or `routes/**` and the
 *                       basename is not `_layout.scrml`. (May or may not have
 *                       `<program>` — the rewrite handler decides what to do
 *                       based on the opener content.)
 * - **module**        — no `<program>` opener at file top AND not under
 *                       `pages/**` / `routes/**`. Module-shape: exports +
 *                       helpers + components, no app-wide markup wrapper.
 * - **schema-anchor** — file contains a `<schema>` block AND a `<program db=>`
 *                       wrapper. SPECIAL: per §39.12.0 v0.3 workaround, left
 *                       alone (advisory only in `--report`).
 * - **ambiguous**     — heuristic returns multi-bucket; surface to `--report`
 *                       and SKIP rewrite.
 *
 * @param {string} absPath — absolute file path
 * @param {string} sourceText
 * @param {string} projectRoot — absolute project root (used for relative-path
 *                               classification)
 * @returns {{bucket: string, evidence: string[]}}
 */
export function classifyFile(absPath, sourceText, projectRoot) {
  const evidence = [];
  const rel = projectRoot
    ? relative(projectRoot, absPath).split(sep).join("/")
    : absPath.split(sep).join("/");

  // Normalize: lower-case path-segment check (case-sensitive on the filename
  // itself, but the `pages/` / `routes/` directory convention is case-fixed).
  const pathSegments = rel.split("/");
  const inPages = pathSegments.includes("pages");
  const inRoutes = pathSegments.includes("routes");
  const isLayoutFile = pathSegments[pathSegments.length - 1] === "_layout.scrml";

  // Content-level checks.
  const hasSchemaBlock = /<\s*schema\b[\s>/]/.test(sourceText);
  // Detect a file-top `<program ...>` opener (skipping comments/whitespace).
  const opener = findFileTopOpener(sourceText);
  const hasProgramOpener = !!opener && opener.name === "program";
  const hasPageOpener = !!opener && opener.name === "page";

  // Schema-anchor check: `<schema>` present + `<program db=>` wrapper.
  if (hasSchemaBlock && hasProgramOpener) {
    const hasDbAttr = opener.attrs.some((a) => a.name === "db");
    if (hasDbAttr) {
      evidence.push("contains `<schema>` block");
      evidence.push("file-top opener is `<program db=...>` (db-anchor)");
      return { bucket: "schema-anchor", evidence };
    }
  }

  // Route file: under pages/ or routes/, not a _layout.
  if ((inPages || inRoutes) && !isLayoutFile) {
    evidence.push(
      inPages ? "located under `pages/`" : "located under `routes/`"
    );
    if (hasProgramOpener) {
      evidence.push("file-top opener is `<program ...>`");
    } else if (hasPageOpener) {
      evidence.push("file-top opener is `<page ...>` (already v0.3 shape)");
    } else if (opener) {
      evidence.push(`file-top opener is \`<${opener.name}...>\``);
    } else {
      evidence.push("no recognizable file-top structural opener");
    }
    return { bucket: "route", evidence };
  }

  // Entry file: `<program ...>` at top, not under pages/routes/.
  if (hasProgramOpener) {
    evidence.push("file-top opener is `<program ...>`");
    if (inPages || inRoutes) {
      // Ambiguous: under pages/routes/ AND has <program> — but we already
      // returned "route" above for the (inPages||inRoutes)&&!isLayoutFile
      // branch. If we got here, it's a _layout.scrml under pages — that's a
      // route convention layout file; mark ambiguous.
      evidence.push("but located under pages/ or routes/ (ambiguous)");
      return { bucket: "ambiguous", evidence };
    }
    return { bucket: "entry", evidence };
  }

  // Module file: no <program> wrapper, not a route file.
  evidence.push("no file-top `<program>` opener");
  if (opener) {
    evidence.push(`file-top opener is \`<${opener.name}...>\``);
  } else {
    evidence.push("no recognizable file-top structural opener");
  }
  return { bucket: "module", evidence };
}

/**
 * Apply v0.3 program-shape rewrites per bucket. See SPEC §40.8 + brief §3.3.2.
 *
 * Bucket-by-bucket behavior:
 *
 * - **entry**:
 *   - Preserve `<program ...>` opener verbatim.
 *   - If the entry file has a file-top `${...}` block OUTSIDE `<program>`,
 *     surface as ADVISORY (user must move it manually).
 *   - Inside `<program>` body: if a top-level `${...}` block contains ONLY
 *     recognized top-level declarations (V5-strict decls, function, fn, type,
 *     const, let, etc.), UNWRAP — the declarations become direct text
 *     children of `<program>` (the §40.8 default-logic body shape).
 *   - Otherwise leave wrapped + advisory.
 *
 * - **route**:
 *   - If opener is `<program ...>` with ONLY per-route attrs: REWRITE
 *     `<program` → `<page` (opener and matching close tag).
 *   - If opener is `<program ...>` with MIXED attrs: SKIP; advisory.
 *   - If opener is `<page ...>` already: no-op (idempotent).
 *   - If opener is something else: SKIP; advisory.
 *
 * - **module**:
 *   - Leave alone. If a `<program>` wrapper is present, advisory only (no
 *     automatic strip in Wave 2 — defer to Wave 3 sweep).
 *
 * - **schema-anchor**:
 *   - Leave alone (per §39.12.0); advisory only ("v0.3 workaround; v0.4 will
 *     promote `<schema db=>` direct").
 *
 * - **ambiguous**:
 *   - SKIP + advisory.
 *
 * @param {string} source
 * @param {{bucket: string, evidence: string[]}} classification
 * @returns {{rewritten: string, changed: boolean, advisories: Array<{level: string, message: string, hint?: string}>, action: string}}
 */
export function applyProgramShapeRewrite(source, classification) {
  const advisories = [];
  const bucket = classification.bucket;

  if (bucket === "schema-anchor") {
    advisories.push({
      level: "info",
      message:
        "schema-anchor file uses `<program db=>` v0.3 workaround (SPEC §39.12.0).",
      hint:
        "v0.4 will promote `<schema db=>` direct; the wrapper will be removed automatically when v0.4 ships. No action needed now.",
    });
    return { rewritten: source, changed: false, advisories, action: "ADVISORY" };
  }

  if (bucket === "module") {
    const opener = findFileTopOpener(source);
    if (opener && opener.name === "program") {
      advisories.push({
        level: "warn",
        message:
          "module-shape file carries a `<program ...>` wrapper. Under v0.3 one-program-per-application (SPEC §40.8), only the entry file declares `<program>`.",
        hint:
          "Manually strip the wrapper, leaving the file as a pure module (exports + helpers + components). Wave 3 sweep will not auto-strip (deferred).",
      });
    }
    return { rewritten: source, changed: false, advisories, action: "ADVISORY" };
  }

  if (bucket === "ambiguous") {
    advisories.push({
      level: "warn",
      message:
        "file classification is ambiguous (e.g. `<program>` under `pages/` named `_layout.scrml`).",
      hint:
        "Inspect the file manually and migrate by hand. The migrate command requires unambiguous bucket assignment to rewrite.",
    });
    return { rewritten: source, changed: false, advisories, action: "SKIP" };
  }

  if (bucket === "route") {
    const opener = findFileTopOpener(source);
    if (!opener) {
      advisories.push({
        level: "info",
        message:
          "route file has no file-top structural opener; no rewrite possible.",
      });
      return { rewritten: source, changed: false, advisories, action: "SKIP" };
    }
    if (opener.name === "page") {
      // Already v0.3 shape — idempotent no-op.
      return {
        rewritten: source,
        changed: false,
        advisories,
        action: "NOOP",
      };
    }
    if (opener.name !== "program") {
      advisories.push({
        level: "info",
        message: `route file file-top opener is \`<${opener.name}...>\`; not a `+
          `\`<program>\`-shaped route. Skipping rewrite.`,
        hint:
          "If this file should be a route, ensure the file-top opener is `<page ...>` (v0.3 shape) or `<program ...>` (legacy v0.2 shape eligible for rewrite).",
      });
      return { rewritten: source, changed: false, advisories, action: "SKIP" };
    }

    // Opener is `<program ...>`. Classify its attrs.
    const attrNames = opener.attrs.map((a) => a.name);
    const perRouteAttrs = attrNames.filter((n) => PER_ROUTE_ATTRS.has(n));
    const appWideAttrs = attrNames.filter((n) => APP_WIDE_ATTRS.has(n));
    const unknownAttrs = attrNames.filter(
      (n) => !PER_ROUTE_ATTRS.has(n) && !APP_WIDE_ATTRS.has(n)
    );

    if (appWideAttrs.length > 0) {
      advisories.push({
        level: "warn",
        message:
          `route file's \`<program>\` opener carries app-wide attrs `+
          `(${appWideAttrs.join(", ")}) mixed with `+
          `${perRouteAttrs.length > 0 ? `per-route attrs (${perRouteAttrs.join(", ")})` : "no per-route attrs"}. `+
          `Cannot auto-split.`,
        hint:
          "Manually split: move app-wide attrs to the entry file's `<program>`; keep only `{db, auth, csrf, ratelimit}` on this file (then re-run with `--program-shape`).",
      });
      return { rewritten: source, changed: false, advisories, action: "SKIP" };
    }

    // Pure per-route (or empty) attrs: REWRITE `<program` → `<page` at the
    // opener, AND rewrite the matching close tag `</program>` → `</page>`.
    // Both rewrites need to happen exactly once at known sites. Close tag
    // `</>` (close-elision) is preserved as-is.
    if (unknownAttrs.length > 0) {
      advisories.push({
        level: "info",
        message:
          `route file's \`<program>\` opener carries unrecognized attrs `+
          `(${unknownAttrs.join(", ")}); rewriting opener to \`<page>\` `+
          `but downstream may emit E-PAGE-INVALID-ATTR on these.`,
      });
    }

    const rewritten = rewriteProgramToPage(source, opener);
    if (rewritten === source) {
      // No-op fallback (shouldn't generally happen).
      return { rewritten, changed: false, advisories, action: "NOOP" };
    }
    return {
      rewritten,
      changed: true,
      advisories,
      action: "REWRITE",
    };
  }

  if (bucket === "entry") {
    // Entry file: preserve `<program ...>` opener; check for file-top `${...}`
    // OUTSIDE `<program>` and emit advisory; UNWRAP `${...}` inside the program
    // body if its content is ALL top-level decls.
    const opener = findFileTopOpener(source);
    if (!opener || opener.name !== "program") {
      // Should not happen for "entry" bucket, but defensive.
      return { rewritten: source, changed: false, advisories, action: "SKIP" };
    }

    // Find file-top `${...}` OUTSIDE `<program>` — between start-of-file and
    // openerStart.
    const preOpener = source.slice(0, opener.openerStart);
    if (/\$\{/.test(preOpener)) {
      advisories.push({
        level: "warn",
        message:
          "entry file has a `${...}` logic block ABOVE the `<program>` opener.",
        hint:
          "Move the `${...}` block contents INSIDE the `<program>` body. The migrate command does not auto-move pre-`<program>` logic blocks.",
      });
    }

    // Inside `<program>` body: find the matching `</program>` close tag (or
    // `</>` close-elision sibling — we conservatively use `</program>` since
    // close-elision is unambiguous only in context).
    const bodyStart = opener.openerEnd + 1;
    const closeMatch = findMatchingProgramClose(source, bodyStart);
    if (closeMatch === -1) {
      // Couldn't find the matching close — bail without rewriting.
      advisories.push({
        level: "info",
        message:
          "entry file's `<program>` close tag not found (close-elision or malformed); skipping body-unwrap pass.",
      });
      return { rewritten: source, changed: false, advisories, action: "SKIP" };
    }
    const body = source.slice(bodyStart, closeMatch);

    const unwrapResult = unwrapRedundantLogicBlocks(body);
    if (!unwrapResult.changed) {
      return {
        rewritten: source,
        changed: false,
        advisories: advisories.concat(unwrapResult.advisories),
        action: advisories.length > 0 ? "ADVISORY" : "NOOP",
      };
    }
    const rewritten =
      source.slice(0, bodyStart) +
      unwrapResult.rewritten +
      source.slice(closeMatch);
    return {
      rewritten,
      changed: true,
      advisories: advisories.concat(unwrapResult.advisories),
      action: "REWRITE",
    };
  }

  // Fall-through (unknown bucket).
  return { rewritten: source, changed: false, advisories, action: "SKIP" };
}

/**
 * Rewrite `<program ...>` opener and its matching `</program>` close tag to
 * `<page ...>` / `</page>`. Preserves attrs verbatim. Does NOT touch `</>`
 * close-elision sibling — those are syntactic neutrals.
 *
 * @param {string} source
 * @param {{name: string, openerStart: number, openerEnd: number}} opener
 * @returns {string}
 */
function rewriteProgramToPage(source, opener) {
  // The opener begins with `<` followed by optional whitespace then `program`.
  // We want to rewrite the IDENTIFIER `program` to `page` at the opener site.
  const beforeOpener = source.slice(0, opener.openerStart);
  const openerSlice = source.slice(opener.openerStart, opener.openerEnd + 1);
  // Replace exactly one occurrence of `program` in the opener slice (the
  // identifier — should be the first identifier-like token after `<`).
  const newOpenerSlice = openerSlice.replace(/^<(\s*)program\b/, "<$1page");
  if (newOpenerSlice === openerSlice) return source;

  const afterOpener = source.slice(opener.openerEnd + 1);

  // Find the matching `</program>` close tag in afterOpener. We use the
  // same nesting-aware scan to avoid mis-pairing on nested `<program>` (e.g.
  // §43 worker) — though Wave 2 explicitly does not handle nested.
  const closeIdx = findMatchingProgramClose(afterOpener, 0);
  if (closeIdx === -1) {
    // No explicit close tag (close-elision); just rewrite opener.
    return beforeOpener + newOpenerSlice + afterOpener;
  }

  // The matching close tag spans `</program>` — rewrite to `</page>`.
  // closeIdx points at the `<` of `</program>` (per findMatchingProgramClose).
  // Length of `</program>` is 10.
  const beforeClose = afterOpener.slice(0, closeIdx);
  const closeSlice = afterOpener.slice(closeIdx, closeIdx + "</program>".length);
  const afterClose = afterOpener.slice(closeIdx + "</program>".length);
  if (closeSlice !== "</program>") {
    // Defensive — shouldn't happen if findMatchingProgramClose is correct.
    return beforeOpener + newOpenerSlice + afterOpener;
  }
  return (
    beforeOpener +
    newOpenerSlice +
    beforeClose +
    "</page>" +
    afterClose
  );
}

/**
 * Find the matching `</program>` close tag in `source` starting from offset
 * `start`. Tracks nesting on `<program ...>` openers to handle nested
 * `<program>` blocks (§43 worker form). Returns the absolute index of `<`
 * of the matching close tag, or -1 if not found.
 *
 * NOTE: we use this for BOTH the entry-file body unwrap pass AND the
 * route-file rewrite pass. The function is conservative: it does NOT
 * resolve `</>` close-elision (which is permitted scrml syntax; an explicit
 * `</program>` is the only shape we can safely rewrite).
 *
 * @param {string} source
 * @param {number} start
 * @returns {number}
 */
function findMatchingProgramClose(source, start) {
  let depth = 1;
  let i = start;
  while (i < source.length) {
    const ch = source[i];
    if (ch !== "<") {
      i++;
      continue;
    }
    // Skip strings / `${...}` carefully — but for `</program>` detection we
    // just need to avoid matching `<` inside attribute values. We track quote
    // state on `<...>` parses only. Keep it simple: look for the exact
    // sequences `<program ` / `<program>` / `<program/` / `</program>`.
    if (source.startsWith("</program>", i)) {
      depth--;
      if (depth === 0) return i;
      i += "</program>".length;
      continue;
    }
    // Detect a NESTED `<program>` opener — increment depth.
    if (
      source.startsWith("<program", i) &&
      i + "<program".length < source.length &&
      /[\s>/]/.test(source[i + "<program".length])
    ) {
      depth++;
      i += "<program".length;
      continue;
    }
    i++;
  }
  return -1;
}

/**
 * Inside an entry file's `<program>` body, find top-level `${...}` blocks
 * whose content is ENTIRELY recognized top-level declarations (state-decl,
 * derived-decl, function, fn, type, plain const/let), and unwrap them so the
 * declarations sit directly in the `<program>` body (the §40.8 default-logic
 * body shape).
 *
 * Conservative: if a `${...}` block contains anything other than recognized
 * top-level declarations (e.g. imperative statements, control flow, calls),
 * leave it wrapped + emit an `info` advisory.
 *
 * @param {string} body — the contents between `<program ...>` opener-end and
 *                        `</program>` close-start (or close-elision boundary).
 * @returns {{rewritten: string, changed: boolean, advisories: Array}}
 */
function unwrapRedundantLogicBlocks(body) {
  const advisories = [];
  let changed = false;
  let result = "";
  let i = 0;
  while (i < body.length) {
    // Find the next `${` at the top level (we don't track markup nesting; the
    // brace-matching catches naked top-level `${...}`).
    const dollarIdx = body.indexOf("${", i);
    if (dollarIdx === -1) {
      result += body.slice(i);
      break;
    }

    // Verify it's at the "top level" — between markup siblings, NOT inside
    // an attribute or markup body. Heuristic: look backward for the closest
    // `>` or start-of-body — only unwrap if the `${...}` is at the top level
    // of the body (not e.g. inside an event handler or attribute value).
    // We treat anything in the body that's bare (whitespace-only between the
    // previous markup `>` and `${`) as top-level.
    const before = body.slice(i, dollarIdx);
    const trailingBeforeDollar = before.slice(
      before.lastIndexOf(">") + 1
    );
    const isTopLevel = /^[\s\n\r]*$/.test(trailingBeforeDollar);

    if (!isTopLevel) {
      // Not a top-level `${...}` — leave alone, advance past `${` and continue.
      const closeIdx = findMatchingDollarClose(body, dollarIdx);
      if (closeIdx === -1) {
        result += body.slice(i);
        break;
      }
      result += body.slice(i, closeIdx + 1);
      i = closeIdx + 1;
      continue;
    }

    // Find matching `}` for this `${...}` block.
    const closeIdx = findMatchingDollarClose(body, dollarIdx);
    if (closeIdx === -1) {
      // Unmatched — bail.
      result += body.slice(i);
      break;
    }

    const innerStart = dollarIdx + 2;
    const innerEnd = closeIdx;
    const inner = body.slice(innerStart, innerEnd);

    if (isTopLevelDeclOnly(inner)) {
      // Unwrap: emit body before `${`, then the inner contents directly.
      result += body.slice(i, dollarIdx);
      result += inner;
      changed = true;
      advisories.push({
        level: "info",
        message:
          "unwrapped a `${...}` block whose contents are all top-level declarations (v0.3 default-logic body — SPEC §40.8).",
      });
      i = closeIdx + 1;
    } else {
      // Mixed / imperative content — leave wrapped.
      advisories.push({
        level: "info",
        message:
          "a `${...}` block was left wrapped (contains non-declaration content).",
      });
      result += body.slice(i, closeIdx + 1);
      i = closeIdx + 1;
    }
  }
  return { rewritten: result, changed, advisories };
}

/**
 * Find the matching `}` for a `${...}` block at `dollarIdx`. Tracks brace
 * nesting, string state (`"..."`, `'...'`, backticks), and `//` / `/* *\/`
 * comments. Returns the absolute index of the matching `}`, or -1 if
 * unmatched.
 *
 * @param {string} src
 * @param {number} dollarIdx — index of the `$` of `${`
 * @returns {number}
 */
function findMatchingDollarClose(src, dollarIdx) {
  let i = dollarIdx + 2;
  let depth = 1;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "/" && src[i + 1] === "/") {
      const nl = src.indexOf("\n", i);
      i = nl === -1 ? src.length : nl + 1;
      continue;
    }
    if (ch === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      i = end === -1 ? src.length : end + 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      // Skip string contents.
      const q = ch;
      i++;
      while (i < src.length && src[i] !== q) {
        if (src[i] === "\\") i++;
        i++;
      }
      i++;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}

/**
 * Heuristic: does a `${...}` body contain ONLY top-level declarations?
 *
 * Recognized shapes (per SPEC §40.8 default-logic body + cross-ref §21):
 * - V5-strict state decl: `<x> = ...` / `const <x> = ...` / `<x>: Type = ...`
 * - `import ... from ...`
 * - `export ... { ... }` / `export const ... = ...` / `export function ...`
 * - `function name(...) { ... }`
 * - `fn name(...) ...`
 * - `server function name(...) { ... }`
 * - `type Name:enum = { ... }` / `type Name = { ... }`
 * - `const name = ...` / `let name = ...` (plain locals)
 *
 * If ANY non-recognized statement appears (control flow, bare call,
 * assignment, etc.), return false.
 *
 * @param {string} inner
 * @returns {boolean}
 */
function isTopLevelDeclOnly(inner) {
  // Split into statements by walking and respecting brace/quote depth.
  const stmts = splitTopLevelStatements(inner);
  if (stmts.length === 0) return false;
  for (const stmt of stmts) {
    const trimmed = stmt.trim();
    if (trimmed === "") continue;
    if (trimmed.startsWith("//")) continue;
    if (trimmed.startsWith("/*")) continue;
    if (!isRecognizedTopLevelDecl(trimmed)) return false;
  }
  return true;
}

/**
 * Recognize a single statement as a top-level declaration shape.
 *
 * Conservative — matches by anchored regex on the trimmed statement text.
 *
 * @param {string} stmt — trimmed statement
 * @returns {boolean}
 */
function isRecognizedTopLevelDecl(stmt) {
  // V5-strict state decl shapes: `<x> = ...`, `<x>: Type = ...`,
  // `const <x> = ...`, `export const <x> = ...`.
  if (/^(?:export\s+)?(?:const\s+)?<\s*[A-Za-z_][A-Za-z0-9_]*\s*>\s*[=:]/.test(stmt)) {
    return true;
  }
  // import
  if (/^import\s/.test(stmt)) return true;
  // export ... { ... } / export const / export let / export function / export fn / export type
  // (export prefix consumed in subsequent rules; check `export` alone for `export { X }`).
  if (/^export\s*\{/.test(stmt)) return true;
  if (/^export\s+(?:default\s+)?(?:const|let|var|function|fn|type|server)\b/.test(stmt)) {
    return true;
  }
  // function / fn / server function / type / const / let
  if (/^function\s+[A-Za-z_]/.test(stmt)) return true;
  if (/^fn\s+[A-Za-z_]/.test(stmt)) return true;
  if (/^server\s+function\s+[A-Za-z_]/.test(stmt)) return true;
  if (/^type\s+[A-Za-z_]/.test(stmt)) return true;
  if (/^const\s+[A-Za-z_]/.test(stmt)) return true;
  if (/^let\s+[A-Za-z_]/.test(stmt)) return true;
  return false;
}

/**
 * Split a `${...}` body into top-level statements. Statements are separated
 * by either:
 *   - one or more blank lines (multi-decl text block convention), OR
 *   - a top-level `}` closer (function body / type body / object literal at
 *     a top-level decl), recognized as end-of-statement when followed by
 *     newline.
 *
 * Naive but workable: we walk char-by-char, tracking brace depth + string
 * state. When brace depth returns to 0 AND we hit either a newline or a `;`,
 * we flush the current statement.
 *
 * @param {string} src
 * @returns {string[]}
 */
function splitTopLevelStatements(src) {
  const out = [];
  let buf = "";
  let depth = 0;
  let i = 0;
  // Track whether we've seen non-whitespace since last flush — empty buffer
  // skips on flush.
  while (i < src.length) {
    const ch = src[i];
    if (ch === "/" && src[i + 1] === "/") {
      const nl = src.indexOf("\n", i);
      const end = nl === -1 ? src.length : nl;
      buf += src.slice(i, end);
      i = end;
      continue;
    }
    if (ch === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      const stop = end === -1 ? src.length : end + 2;
      buf += src.slice(i, stop);
      i = stop;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      const q = ch;
      const start = i;
      i++;
      while (i < src.length && src[i] !== q) {
        if (src[i] === "\\") i++;
        i++;
      }
      i = Math.min(i + 1, src.length);
      buf += src.slice(start, i);
      continue;
    }
    if (ch === "{") {
      depth++;
      buf += ch;
      i++;
      continue;
    }
    if (ch === "}") {
      depth = Math.max(0, depth - 1);
      buf += ch;
      i++;
      // If depth went to zero and the next non-whitespace char is a newline,
      // treat as end-of-statement.
      if (depth === 0) {
        // Peek ahead — flush after consuming trailing whitespace on the line.
        let j = i;
        while (j < src.length && (src[j] === " " || src[j] === "\t")) j++;
        if (j === src.length || src[j] === "\n" || src[j] === ";") {
          out.push(buf);
          buf = "";
          i = j;
          if (src[i] === "\n" || src[i] === ";") i++;
        }
      }
      continue;
    }
    if (ch === ";" && depth === 0) {
      buf += ch;
      out.push(buf);
      buf = "";
      i++;
      continue;
    }
    if (ch === "\n" && depth === 0) {
      // Statement boundary on blank-line OR if the buffer contains a
      // complete decl already.
      // Look for the next non-whitespace char. If it's another non-blank
      // line, AND the buf has terminated (e.g. `<x> = 0` then newline),
      // flush.
      // Heuristic: flush only on blank-line boundary, otherwise we'd split
      // multi-line statements like `const x = {\n  a: 1,\n}`. We already
      // handle the `}` closer above; here we just flush if the next line is
      // blank.
      buf += ch;
      // Peek next char.
      let j = i + 1;
      while (j < src.length && (src[j] === " " || src[j] === "\t")) j++;
      if (j < src.length && src[j] === "\n") {
        // Blank line — flush.
        out.push(buf);
        buf = "";
        i = j + 1;
        continue;
      }
      // Single newline — keep accumulating, but check if buf is a complete
      // V5-strict-style decl in one line (e.g. `<x> = 0\n<y> = 1`).
      // Detect single-line decls: trimmed buf matches our recognized decl
      // shapes AND ends with not-an-opener.
      const trimmed = buf.trim();
      if (
        depth === 0 &&
        trimmed !== "" &&
        /^(?:export\s+)?(?:const\s+)?<\s*[A-Za-z_][A-Za-z0-9_]*\s*>\s*[=:][^{]*$/.test(
          trimmed
        )
      ) {
        out.push(buf);
        buf = "";
      }
      i++;
      continue;
    }
    buf += ch;
    i++;
  }
  if (buf.trim() !== "") {
    out.push(buf);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Sanity-check parse — verify rewritten source still compiles
// ---------------------------------------------------------------------------

/**
 * Parse the rewritten source via the existing pipeline to verify it's still
 * valid scrml.
 *
 * Strategy — option β (transactional in-place rewrite + verify + restore):
 *
 *   The earlier implementation staged the rewritten source under a unique
 *   tmp directory and invoked `compileScrml` on that staged path. That broke
 *   for any file with cross-file imports — `module-resolver.js#resolveModulePath`
 *   resolves relative imports against `dirname(importerPath)`, so an importer
 *   staged under `/tmp/scrml-migrate-check-XXX/` resolves `./foo.scrml` to
 *   `/tmp/scrml-migrate-check-XXX/foo.scrml` which doesn't exist, MOD fires
 *   E-IMPORT-006, and the gate fails on every multi-file route file.
 *
 *   Option β writes the rewritten content to the file's ORIGINAL path,
 *   invokes `compileScrml` with `gather: true` so the existing auto-gather
 *   pre-pass walks the real import graph, and then ALWAYS restores the
 *   original content from an in-memory backup before returning. The caller
 *   (`migrateFile`) decides separately whether to write the rewrite
 *   permanently — this function never leaves the file mutated.
 *
 *   Trade-off: there is a microseconds-wide window during the compile call
 *   where the on-disk content is the rewrite candidate. A SIGKILL or crash
 *   during that window leaves the file at the rewrite candidate's content.
 *   The try/finally always restores the backup on normal control flow,
 *   including compiler crashes. For dry-run mode this is essential — the
 *   user expects no on-disk change. For in-place mode, `migrateFile` writes
 *   the rewrite immediately after this returns ok, so the brief window does
 *   not change net behavior.
 *
 *   Constraint: "Do not weaken the gate" (S86 standing rule) is preserved
 *   end-to-end — the compile invocation is identical to the pre-existing one
 *   except for `gather: true` (which is what `compileScrml` defaults to and
 *   what the real `compile` / `dev` / `build` paths use). Cross-file
 *   E-IMPORT-006 and downstream MOD/NR/SYM/TS/DG/CE/CG diagnostics still
 *   fire on real breakage.
 *
 * @param {string} rewrittenSource
 * @param {string} originalPath — absolute path of the file under migration.
 *                                 The rewritten source is written here for
 *                                 the duration of the compile call, then
 *                                 restored from the in-memory backup.
 * @returns {{ ok: boolean, errors: object[] }}
 */
function sanityCheckParse(rewrittenSource, originalPath) {
  // Step 1: capture the on-disk original so we can always restore.
  //
  // If readFileSync throws here, the file isn't readable — there's nothing
  // sane we can stage or check. Report a synthetic error so the gate fails
  // closed; do NOT attempt the in-place rewrite (we'd be writing to a path
  // we couldn't read, which is recoverable but indicates an unusual state).
  let originalContent;
  try {
    originalContent = readFileSync(originalPath, "utf8");
  } catch (err) {
    return {
      ok: false,
      errors: [{ message: `safety-harness: cannot read original file for backup: ${err.message}` }],
    };
  }

  // Step 2: stage the rewrite in place. Use try/finally so a crash during
  // either the write or the compile call still restores the original.
  let result;
  let stagingError = null;
  try {
    try {
      writeFileSync(originalPath, rewrittenSource, "utf8");
    } catch (err) {
      stagingError = err;
    }

    if (!stagingError) {
      try {
        result = compileScrml({
          inputFiles: [originalPath],
          write: false,
          // Enable auto-gather so the real import graph is walked from the
          // file's real on-disk position — see option-β rationale above.
          gather: true,
          log: () => {},
        });
      } catch (err) {
        return {
          ok: false,
          errors: [{ message: `compiler crashed: ${err.message}` }],
        };
      }
    }
  } finally {
    // Step 3: ALWAYS restore the original content. Even on a thrown error
    // from compileScrml (the outer return above does its own short-circuit,
    // but `finally` runs on the way out regardless). If the restore itself
    // fails, surface that — it indicates a serious environmental issue
    // (filesystem suddenly read-only, etc.) and the user needs to know.
    try {
      writeFileSync(originalPath, originalContent, "utf8");
    } catch (restoreErr) {
      // Restoration failed; data loss is possible. This is a rare edge.
      // Throw rather than silently leave a broken state — the migrate
      // command should surface this as a hard failure.
      throw new Error(
        `safety-harness: failed to restore original content at ${originalPath} ` +
        `(file may be left in rewritten state): ${restoreErr.message}`,
      );
    }
  }

  if (stagingError) {
    return {
      ok: false,
      errors: [{ message: `safety-harness: staging write failed: ${stagingError.message}` }],
    };
  }

  // Errors (severity 'error' or unspecified) block the migration.
  // Warnings are fine — the whole point is fixing W-WHITESPACE-001 /
  // W-DEPRECATED-001, but the rewritten source may still surface OTHER
  // unrelated warnings, which we don't want to block on.
  const blockingErrors = (result.errors || []).filter(
    (e) => !e.severity || e.severity === "error"
  );

  return {
    ok: blockingErrors.length === 0,
    errors: blockingErrors,
  };
}

// ---------------------------------------------------------------------------
// Diff rendering (unified, simplified — no external deps)
// ---------------------------------------------------------------------------

/**
 * Produce a simple unified-diff-style preview of two source texts.
 *
 * Not a full unified diff — we don't need hunks. We just emit:
 *   - file header
 *   - line-by-line `-` (removed) / `+` (added) for changed lines
 *   - unchanged lines elided to `...`
 *
 * @param {string} oldText
 * @param {string} newText
 * @param {string} relPath
 * @returns {string}
 */
function simpleDiff(oldText, newText, relPath) {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const out = [];

  out.push(c.bold(`--- ${relPath}`));
  out.push(c.bold(`+++ ${relPath}`));

  // Walk both line arrays. When lines match, advance both. When they differ,
  // emit a `-` for the old line and a `+` for the new line. We don't try to
  // align — the migrations are line-local, so 1-for-1 substitution holds.
  const max = Math.max(oldLines.length, newLines.length);
  let inHunk = false;
  for (let i = 0; i < max; i++) {
    const oldL = i < oldLines.length ? oldLines[i] : null;
    const newL = i < newLines.length ? newLines[i] : null;
    if (oldL === newL) {
      if (inHunk) {
        out.push(c.dim("..."));
        inHunk = false;
      }
      continue;
    }
    inHunk = true;
    if (oldL !== null) out.push(c.red(`- ${oldL}`));
    if (newL !== null) out.push(c.green(`+ ${newL}`));
  }
  return out.join("\n");
}

// ---------------------------------------------------------------------------
// Argument parser
// ---------------------------------------------------------------------------

function printHelp() {
  console.log(`scrml migrate <file|directory> [options]

Apply automated source rewrites for deprecated scrml syntax patterns.

Migrations shipped:
  - Whitespace-after-\`<\`  (W-WHITESPACE-001): \`< db>\` → \`<db>\`
  - \`<machine>\` keyword     (W-DEPRECATED-001): \`<machine\` → \`<engine\`

Optional migrations (opt-in flags):
  - v0.3 program-shape      (--program-shape, SPEC §40.8): rewrites legacy
                            v0.2 source into v0.3 one-program-per-application
                            shape. Route files with per-route attrs only get
                            \`<program ...>\` → \`<page ...>\` rewrite; entry files
                            unwrap redundant \`\${...}\` wrappers around top-level
                            declarations. Schema-anchor files (per §39.12.0
                            workaround) are left alone with an advisory.

Arguments:
  <file>                  A single .scrml file
  <directory>             A directory — all matching files inside are migrated

Options:
  --dry-run               Print unified diff to stdout without writing
  --check                 Exit non-zero if any file would be modified (CI-friendly)
  --include=<glob>        File pattern (default: '*.scrml')
  --exclude=<glob>        Additional exclude pattern (substring match)
  --no-default-excludes   Disable built-in samples/ + tests/ exclusions
  --program-shape         Enable v0.3 program-shape migration (SPEC §40.8)
  --report                With --dry-run --program-shape, emit a structured
                          advisory report listing every in-scope file's bucket,
                          evidence, and proposed action (REWRITE / SKIP /
                          ADVISORY / NOOP). Recommended first step before
                          running --program-shape rewrites in place.
  --help, -h              Show this message

Safety:
  Each file is sanity-parsed after rewriting. If the result fails to compile,
  the file is left untouched and the failure is reported.

  By default, paths under \`samples/\` or \`tests/\` are skipped — they exercise
  deprecation paths on purpose. Pass --no-default-excludes to override.

Examples:
  scrml migrate src/                                # in-place rewrite (W-* only)
  scrml migrate src/app.scrml --dry-run             # preview only
  scrml migrate src/ --check                        # CI gate
  scrml migrate src/ --program-shape --dry-run --report   # v0.3 report
  scrml migrate src/ --program-shape                # apply v0.3 rewrites
`);
}

/**
 * @param {string[]} args
 * @returns {{ paths: string[], dryRun: boolean, check: boolean,
 *             include: string, excludes: string[], help: boolean,
 *             programShape: boolean, report: boolean }}
 */
function parseArgs(args) {
  const paths = [];
  let dryRun = false;
  let check = false;
  let include = "*.scrml";
  const excludes = [];
  let useDefaultExcludes = true;
  let help = false;
  let programShape = false;
  let report = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      help = true;
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--check") {
      check = true;
    } else if (arg.startsWith("--include=")) {
      include = arg.slice("--include=".length);
    } else if (arg === "--include") {
      include = args[++i];
      if (!include) {
        console.error(c.red("error:") + ` --include requires a value`);
        process.exit(1);
      }
    } else if (arg.startsWith("--exclude=")) {
      excludes.push(arg.slice("--exclude=".length));
    } else if (arg === "--exclude") {
      const val = args[++i];
      if (!val) {
        console.error(c.red("error:") + ` --exclude requires a value`);
        process.exit(1);
      }
      excludes.push(val);
    } else if (arg === "--no-default-excludes") {
      useDefaultExcludes = false;
    } else if (arg === "--program-shape") {
      programShape = true;
    } else if (arg === "--report") {
      report = true;
    } else if (arg.startsWith("-")) {
      console.error(c.red("error:") + ` Unknown option: ${arg}`);
      console.error(c.dim("Run `scrml migrate --help` for usage."));
      process.exit(1);
    } else {
      paths.push(arg);
    }
  }

  if (useDefaultExcludes) {
    // Skip directories that exercise deprecation paths on purpose.
    excludes.push(`${sep}samples${sep}`);
    excludes.push(`${sep}tests${sep}`);
  }

  return { paths, dryRun, check, include, excludes, help, programShape, report };
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

/**
 * Recursively collect .scrml files under a path.
 *
 * Filters: include pattern (suffix-only, since we accept '*.scrml'-style
 * globs), exclude substring matches.
 *
 * @param {string} root — absolute path to a file or directory
 * @param {string} include — pattern (e.g. '*.scrml')
 * @param {string[]} excludes — substring exclude patterns
 * @returns {string[]} absolute file paths
 */
function collectFiles(root, include, excludes) {
  const suffix = include.startsWith("*") ? include.slice(1) : include;
  const out = [];

  function isExcluded(absPath) {
    for (const pat of excludes) {
      if (absPath.includes(pat)) return true;
    }
    return false;
  }

  function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.startsWith(".")) continue; // skip dotfiles / .git
      const full = join(dir, entry);
      let st;
      try { st = statSync(full); } catch { continue; }
      if (st.isDirectory()) {
        if (isExcluded(full + sep)) continue;
        walk(full);
      } else if (st.isFile()) {
        if (isExcluded(full)) continue;
        if (full.endsWith(suffix)) {
          out.push(full);
        }
      }
    }
  }

  let st;
  try { st = statSync(root); } catch {
    return [];
  }
  if (st.isFile()) {
    if (!isExcluded(root) && root.endsWith(suffix)) {
      out.push(root);
    }
  } else if (st.isDirectory()) {
    walk(root);
  }
  return out.sort();
}

// ---------------------------------------------------------------------------
// Per-file processing
// ---------------------------------------------------------------------------

/**
 * Process a single file: read, apply migrations, sanity-parse, write or report.
 *
 * When `opts.programShape` is true, the v0.3 program-shape migration is run
 * in addition to the existing W-* migrations. The flow is:
 *   1. Apply W-* migrations (existing).
 *   2. Classify the file (entry / route / module / schema-anchor / ambiguous).
 *   3. Apply program-shape rewrite per bucket.
 *   4. Sanity-parse the combined rewrite.
 *
 * @param {string} filePath
 * @param {{ dryRun: boolean, check: boolean, programShape?: boolean,
 *           report?: boolean, projectRoot?: string }} opts
 * @param {string} cwd
 * @returns {{ status: 'unchanged' | 'changed' | 'failed' | 'unreadable',
 *             migrations?: { whitespace: number, machine: number },
 *             reason?: string,
 *             diff?: string,
 *             classification?: {bucket: string, evidence: string[]},
 *             advisories?: Array<{level: string, message: string, hint?: string}>,
 *             action?: string }}
 */
export function migrateFile(filePath, opts, cwd) {
  const relPath = relative(cwd, filePath);
  const projectRoot = opts.projectRoot || cwd;

  let source;
  try {
    source = readFileSync(filePath, "utf8");
  } catch (err) {
    return { status: "unreadable", reason: err.message };
  }

  // Step 1: apply baseline W-* migrations.
  const baseline = applyMigrations(source);
  let rewritten = baseline.rewritten;
  let changed = baseline.changed;
  const migrations = baseline.migrations;

  // Step 2: optionally apply v0.3 program-shape migration.
  let classification = null;
  let advisories = [];
  let action = changed ? "REWRITE" : "NOOP";
  if (opts.programShape) {
    classification = classifyFile(filePath, rewritten, projectRoot);
    const shapeResult = applyProgramShapeRewrite(rewritten, classification);
    if (shapeResult.changed) {
      rewritten = shapeResult.rewritten;
      changed = true;
      action = "REWRITE";
    } else if (changed) {
      // W-* migration produced a change; keep REWRITE.
      action = "REWRITE";
    } else if (shapeResult.action === "ADVISORY") {
      action = "ADVISORY";
    } else if (shapeResult.action === "SKIP") {
      action = "SKIP";
    } else {
      action = shapeResult.action || "NOOP";
    }
    advisories = shapeResult.advisories || [];
  }

  if (!changed) {
    // Always return classification + advisories when programShape is on so
    // --report can render them.
    return opts.programShape
      ? {
          status: "unchanged",
          classification,
          advisories,
          action,
        }
      : { status: "unchanged" };
  }

  // Step 3: sanity-check parse the rewritten source.
  const parseResult = sanityCheckParse(rewritten, filePath);
  if (!parseResult.ok) {
    const messages = parseResult.errors.map(e => e.message || String(e)).join("; ");
    return {
      status: "failed",
      reason: `rewritten source failed to parse: ${messages}`,
      classification,
      advisories,
      action,
    };
  }

  if (opts.dryRun) {
    const diff = simpleDiff(source, rewritten, relPath);
    return {
      status: "changed",
      migrations,
      diff,
      classification,
      advisories,
      action,
    };
  }

  if (opts.check) {
    // --check: do not write; signal "would change" via status.
    return {
      status: "changed",
      migrations,
      classification,
      advisories,
      action,
    };
  }

  // Write in-place.
  try {
    writeFileSync(filePath, rewritten, "utf8");
  } catch (err) {
    return { status: "failed", reason: `write failed: ${err.message}` };
  }
  return {
    status: "changed",
    migrations,
    classification,
    advisories,
    action,
  };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Entry point for the migrate subcommand.
 *
 * @param {string[]} args — raw argv slice after "migrate"
 */
export function runMigrate(args) {
  const { paths, dryRun, check, include, excludes, help, programShape, report } = parseArgs(args);

  if (help) {
    printHelp();
    return;
  }

  if (paths.length === 0) {
    console.error(c.red("error:") + " scrml migrate requires at least one file or directory");
    console.error(c.dim("Run `scrml migrate --help` for usage."));
    process.exit(1);
  }

  if (report && !programShape) {
    console.error(c.yellow("warning:") + " --report has no effect without --program-shape; ignoring.");
  }

  const cwd = process.cwd();

  // Collect all files to process across all input paths.
  const allFiles = [];
  for (const p of paths) {
    const abs = resolve(cwd, p);
    if (!existsSync(abs)) {
      console.error(c.red("error:") + ` Path not found: ${p}`);
      process.exit(1);
    }
    const files = collectFiles(abs, include, excludes);
    allFiles.push(...files);
  }

  // Dedupe (paths may overlap when both a parent dir and child file are passed).
  const seen = new Set();
  const uniqueFiles = [];
  for (const f of allFiles) {
    if (seen.has(f)) continue;
    seen.add(f);
    uniqueFiles.push(f);
  }

  if (uniqueFiles.length === 0) {
    console.log(c.yellow("No files matched."));
    return;
  }

  // Process.
  let changedCount = 0;
  let unchangedCount = 0;
  let failedCount = 0;
  let totalWhitespace = 0;
  let totalMachine = 0;
  const failures = [];
  const reportRows = []; // for --report aggregation

  // Determine project root for classification (heuristic: deepest common
  // ancestor of input paths, falling back to cwd).
  const projectRoot = cwd;

  for (const file of uniqueFiles) {
    const r = migrateFile(
      file,
      { dryRun, check, programShape, report, projectRoot },
      cwd
    );
    if (programShape && report) {
      reportRows.push({ file: relative(cwd, file), result: r });
    }
    if (r.status === "changed") {
      changedCount++;
      if (r.migrations) {
        totalWhitespace += r.migrations.whitespace;
        totalMachine += r.migrations.machine;
      }
      if (dryRun && r.diff && !report) {
        console.log(r.diff);
        console.log("");
      } else if (!dryRun) {
        const verb = check ? "would migrate" : "migrated";
        console.log(c.green(`  ${verb}`) + `  ${relative(cwd, file)}`);
      }
    } else if (r.status === "unchanged") {
      unchangedCount++;
    } else {
      failedCount++;
      failures.push({ file: relative(cwd, file), reason: r.reason });
      console.error(c.red("  failed   ") + `${relative(cwd, file)}: ${r.reason}`);
    }
  }

  // Emit structured --report output (only when --program-shape + --report).
  if (programShape && report) {
    emitProgramShapeReport(reportRows);
  }

  // Summary.
  console.log("");
  console.log(c.bold("Summary:"));
  console.log(`  ${uniqueFiles.length} file${uniqueFiles.length !== 1 ? "s" : ""} scanned`);
  if (changedCount > 0) {
    const verb = dryRun ? "would change" : (check ? "would change" : "changed");
    console.log(`  ${c.green(changedCount)} ${verb}`);
    if (totalWhitespace > 0) console.log(`    ${c.dim(`whitespace migrations:`)} ${totalWhitespace}`);
    if (totalMachine > 0) console.log(`    ${c.dim(`<machine> migrations:`)} ${totalMachine}`);
  }
  if (unchangedCount > 0) {
    console.log(`  ${c.dim(`${unchangedCount} unchanged`)}`);
  }
  if (failedCount > 0) {
    console.log(`  ${c.red(failedCount)} failed`);
  }

  // Exit codes:
  //   --check   → 1 if any file would change OR any file failed
  //   default   → 1 if any file failed (writes succeeded → 0)
  if (check && (changedCount > 0 || failedCount > 0)) {
    process.exit(1);
  }
  if (!check && failedCount > 0) {
    process.exit(1);
  }
}

/**
 * Emit a structured `--report` listing each file's bucket, evidence, proposed
 * action, and advisories. Format is human-readable but stable (snapshot-able).
 *
 * @param {Array<{file: string, result: object}>} rows
 */
function emitProgramShapeReport(rows) {
  console.log("");
  console.log(c.bold("Program-shape report (v0.3 SPEC §40.8):"));
  console.log("");

  // Group by bucket for easier scanning.
  const groups = new Map();
  for (const row of rows) {
    const bucket = (row.result.classification && row.result.classification.bucket) || "unknown";
    if (!groups.has(bucket)) groups.set(bucket, []);
    groups.get(bucket).push(row);
  }

  // Stable group ordering.
  const order = ["entry", "route", "module", "schema-anchor", "ambiguous", "unknown"];
  for (const bucket of order) {
    if (!groups.has(bucket)) continue;
    const items = groups.get(bucket);
    console.log(c.bold(`[${bucket}]`) + c.dim(`  (${items.length} file${items.length !== 1 ? "s" : ""})`));
    for (const row of items) {
      const action = row.result.action || "UNKNOWN";
      const actionTag =
        action === "REWRITE" ? c.green(action) :
        action === "SKIP"    ? c.yellow(action) :
        action === "ADVISORY"? c.yellow(action) :
                               c.dim(action);
      console.log(`  ${actionTag}  ${row.file}`);
      if (row.result.classification && row.result.classification.evidence) {
        for (const ev of row.result.classification.evidence) {
          console.log(`    ${c.dim("·")} ${c.dim(ev)}`);
        }
      }
      if (row.result.advisories && row.result.advisories.length > 0) {
        for (const adv of row.result.advisories) {
          const tag = adv.level === "warn" ? c.yellow("warn:") : c.dim("info:");
          console.log(`    ${tag} ${adv.message}`);
          if (adv.hint) {
            console.log(`      ${c.dim("hint:")} ${c.dim(adv.hint)}`);
          }
        }
      }
    }
    console.log("");
  }
}
