/**
 * stdlib-canonical-form-cleanup — regression guard for stdlib source-bug cleanup.
 *
 * Verifies that the stdlib `.scrml` source files are free of pre-existing
 * JS-style anti-patterns that scrml (per SPEC §45 + §19 + §40.4) forbids:
 *
 *   - E-EQ-004      `===` / `!==` operators       (Phase 1 — DONE this dispatch)
 *   - E-ERROR-006   `throw new Error(...)`        (Phase 3 — surfaced for PA)
 *   - E-ERROR-007   `try { ... } catch (e) ...`   (Phase 3 — surfaced for PA)
 *   - E-IMPORT-005  bare `bun` / `bun:sqlite`     (Phase 3 — surfaced for PA)
 *
 * Phase 1 (this dispatch) closes the E-EQ-004 surface across all 20 affected
 * stdlib modules — 173 occurrences mechanically rewritten to canonical form.
 * The Phase 1 assertions below should remain green; if any new `===` / `!==`
 * is introduced into a stdlib `.scrml` file, this test fails immediately.
 *
 * Phase 3 surfaces (E-ERROR-006/007 + E-IMPORT-005) are documented as KNOWN-
 * REMAINING via .skip-marked assertions for visibility — they will be lifted
 * to non-skip when PA authorizes the coordinated API refactor.
 *
 * Coverage (Phase 1 — active):
 *   C1   no `===` in any stdlib/**\/*.scrml
 *   C2   no `!==` in any stdlib/**\/*.scrml
 *   C3   per-module: stdlib/auth/index.scrml is `===`/`!==`-clean
 *   C4   per-module: stdlib/auth/jwt.scrml is `===`/`!==`-clean
 *   C5   per-module: stdlib/auth/password.scrml is `===`/`!==`-clean
 *   C6   per-module: stdlib/crypto/index.scrml is `===`/`!==`-clean
 *   C7   per-module: stdlib/data/transform.scrml is `===`/`!==`-clean
 *   C8   per-module: stdlib/data/validate.scrml is `===`/`!==`-clean
 *   C9   per-module: stdlib/format/index.scrml is `===`/`!==`-clean
 *   C10  per-module: stdlib/fs/index.scrml is `===`/`!==`-clean
 *   C11  per-module: stdlib/http/index.scrml is `===`/`!==`-clean
 *   C12  per-module: stdlib/oauth/index.scrml + presets are `===`/`!==`-clean
 *   C13  per-module: stdlib/path/index.scrml is `===`/`!==`-clean
 *   C14  per-module: stdlib/process/index.scrml is `===`/`!==`-clean
 *   C15  per-module: stdlib/regex/index.scrml is `===`/`!==`-clean
 *   C16  per-module: stdlib/router/index.scrml is `===`/`!==`-clean
 *   C17  per-module: stdlib/store/kv.scrml is `===`/`!==`-clean
 *   C18  per-module: stdlib/test/index.scrml is `===`/`!==`-clean
 *   C19  per-module: stdlib/time/index.scrml is `===`/`!==`-clean
 *   C20  no `===` / `!==` token leaks via grep across the whole stdlib tree
 *
 * Coverage (Phase 3 — surfaced; tests skipped pending PA scope decision):
 *   C21  (skip) no `throw new Error` in stdlib code (excluding JSDoc)
 *   C22  (skip) no `try {` in stdlib code
 *   C23  (skip) no `import { ... } from "bun"` / `from "bun:sqlite"` in stdlib code
 */

import { describe, test, expect } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STDLIB_ROOT = resolve(__dirname, "..", "..", "..", "stdlib");

// Recursively collect all .scrml files under stdlib/.
function collectScrmlFiles(dir) {
    const out = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const st = statSync(full);
        if (st.isDirectory()) {
            out.push(...collectScrmlFiles(full));
        } else if (entry.endsWith(".scrml")) {
            out.push(full);
        }
    }
    return out;
}

// Strip JSDoc comment blocks (`/** ... */`) and line comments (`//...`) from a
// source string. Used so the regression guard does not false-fire on
// legitimately-anti-pattern-shaped strings inside example-code comments.
function stripComments(source) {
    return source
        // Strip /** ... */ blocks (non-greedy).
        .replace(/\/\*[\s\S]*?\*\//g, "")
        // Strip // ... line comments (excluding the // inside string literals
        // is best-effort; the regression matters for code, not for stripped
        // output that's only fed to a token grep).
        .replace(/^\s*\/\/.*$/gm, "");
}

const STDLIB_FILES = collectScrmlFiles(STDLIB_ROOT);

describe("stdlib-canonical-form-cleanup — Phase 1 (E-EQ-004) regression guard", () => {

    test("C1 — no `===` operator in any stdlib/**/*.scrml source code", () => {
        const offenders = [];
        for (const file of STDLIB_FILES) {
            const src = stripComments(readFileSync(file, "utf8"));
            if (src.includes("===")) {
                offenders.push(file);
            }
        }
        expect(offenders).toEqual([]);
    });

    test("C2 — no `!==` operator in any stdlib/**/*.scrml source code", () => {
        const offenders = [];
        for (const file of STDLIB_FILES) {
            const src = stripComments(readFileSync(file, "utf8"));
            if (src.includes("!==")) {
                offenders.push(file);
            }
        }
        expect(offenders).toEqual([]);
    });

    // Per-module assertions — keyed by the 20 modules in scope at the time of
    // the cleanup dispatch. If any future stdlib edit reintroduces `===` or
    // `!==`, the failing per-module assertion makes the regression bisectable.

    const PHASE_1_MODULES = [
        "auth/index.scrml",
        "auth/jwt.scrml",
        "auth/password.scrml",
        "crypto/index.scrml",
        "data/transform.scrml",
        "data/validate.scrml",
        "format/index.scrml",
        "fs/index.scrml",
        "http/index.scrml",
        "oauth/index.scrml",
        "oauth/google.scrml",
        "oauth/github.scrml",
        "oauth/discord.scrml",
        "oauth/microsoft.scrml",
        "oauth/pkce.scrml",
        "path/index.scrml",
        "process/index.scrml",
        "regex/index.scrml",
        "router/index.scrml",
        "store/kv.scrml",
        "test/index.scrml",
        "time/index.scrml",
    ];

    for (const mod of PHASE_1_MODULES) {
        test(`C3+ — ${mod} is free of \`===\` / \`!==\``, () => {
            const file = join(STDLIB_ROOT, mod);
            const src = stripComments(readFileSync(file, "utf8"));
            expect(src.includes("===")).toBe(false);
            expect(src.includes("!==")).toBe(false);
        });
    }

    test("C20 — composite token grep across stdlib tree returns 0 hits", () => {
        let strictEqHits = 0;
        let strictNeqHits = 0;
        for (const file of STDLIB_FILES) {
            const src = stripComments(readFileSync(file, "utf8"));
            // Count tokens, not lines (defensive against multiple-per-line
            // patterns in dense expressions).
            const eqMatches = src.match(/===/g);
            const neqMatches = src.match(/!==/g);
            if (eqMatches) strictEqHits += eqMatches.length;
            if (neqMatches) strictNeqHits += neqMatches.length;
        }
        expect(strictEqHits).toBe(0);
        expect(strictNeqHits).toBe(0);
    });
});

describe("stdlib-canonical-form-cleanup — Phase 3 surfaces (skipped pending PA)", () => {

    // These assertions document the KNOWN-REMAINING anti-patterns as of this
    // dispatch. They are deliberately .skip'd — the cleanup requires
    // coordinated API refactor (signatures + callers + spec extension) which
    // is out of scope for this dispatch. PA review will scope a follow-up.

    test.skip("C21 — no `throw new Error` in stdlib code (Phase 3a — needs `fail .Variant` migration + caller refactor)", () => {
        const offenders = [];
        for (const file of STDLIB_FILES) {
            const src = stripComments(readFileSync(file, "utf8"));
            if (/throw\s+new\s+(Error|TypeError|RangeError)/.test(src)) {
                offenders.push(file);
            }
        }
        expect(offenders).toEqual([]);
    });

    test.skip("C22 — no `try {` in stdlib code (Phase 3b — needs `!{}` boundary shim)", () => {
        const offenders = [];
        for (const file of STDLIB_FILES) {
            const src = stripComments(readFileSync(file, "utf8"));
            if (/(^|\n)\s*try\s*\{/.test(src)) {
                offenders.push(file);
            }
        }
        expect(offenders).toEqual([]);
    });

    test.skip("C23 — no `from \"bun\"` / `from \"bun:sqlite\"` in stdlib (Phase 3c — needs SPEC §40.4 amendment OR vendoring)", () => {
        const offenders = [];
        for (const file of STDLIB_FILES) {
            const src = stripComments(readFileSync(file, "utf8"));
            if (/import\s+[^;]*\s+from\s+['"](bun|bun:[a-z]+)['"]/.test(src)) {
                offenders.push(file);
            }
        }
        expect(offenders).toEqual([]);
    });
});
