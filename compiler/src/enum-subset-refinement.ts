/* SPDX-License-Identifier: MIT
 *
 * S156 (d)-A batch 2 — shared enum-subset refinement recognizer (SPEC §53.15.1).
 *
 * The enum-subset refinement form `Enum oneOf([.A, .B])` / `Enum notIn([.C])`
 * (§53.15.1) is recognized at two independent loci:
 *
 *   1. The type-system resolver (`type-system.ts:parseEnumSubsetRefinement`),
 *      which materializes a full `PredicatedType` carrying `subsetVariants`.
 *   2. The symbol-table block-form `<match>` exhaustiveness pass
 *      (`symbol-table.ts:validateMatchBlock`, PASS 20), which is a string-based
 *      self-contained pass with NO access to the type-system's resolved types —
 *      it only sees the raw `typeAnnotation` text on cell-decl AST nodes.
 *
 * To keep BOTH loci agreeing on the recognizer (whitespace tolerance, the
 * §53.15.1 range-form rejection, the `notIn` complement), the pure parse +
 * complement logic lives here. type-system.ts wraps the result in a
 * `PredicatedType`; symbol-table.ts uses the raw variant set directly.
 *
 * This module is intentionally dependency-free (no type imports from
 * type-system.ts) so symbol-table.ts can import it without a circular edge.
 */

/**
 * Result of parsing an enum-subset refinement annotation string.
 *
 *   - `null`           — the string is NOT an enum-subset refinement (the base
 *                        is not a known enum, or the form is not `oneOf`/`notIn`).
 *                        Callers fall through to their existing paths.
 *   - `{ kind: "error" }` — a recognized `oneOf`/`notIn` over a known enum BUT
 *                        with an illegal arg shape (range form `.A .. .B`, an
 *                        empty list, or a malformed entry). type-system lowers
 *                        this to E-CONTRACT-002; symbol-table ignores it (the
 *                        decl-site already fired the diagnostic).
 *   - `{ kind: "subset" }` — a valid subset. `mode` is the surface keyword;
 *                        `variants` is the RESOLVED positive IN-SET (for `notIn`,
 *                        already complemented to `base \ excluded`). `baseEnum`
 *                        is the base enum name. `label` is the optional `[label]`.
 */
export type EnumSubsetParse =
  | null
  | { kind: "error"; baseEnum: string; mode: "oneOf" | "notIn"; message: string }
  | { kind: "subset"; baseEnum: string; mode: "oneOf" | "notIn"; variants: string[]; label: string | null };

/**
 * Parse an enum-subset refinement annotation string.
 *
 * @param expr            the raw type-annotation text (e.g. `"Role oneOf([.Admin, .Editor])"`).
 * @param enumVariantsOf  a lookup `enumName -> full variant-name list`, or `null`
 *                        if no variants are known (returns `null` for any base —
 *                        a base that doesn't resolve to a known enum is treated
 *                        as a non-subset form). type-system passes its
 *                        type-registry-backed lookup; symbol-table passes its
 *                        file-scope enum registry.
 *
 * Whitespace-tolerant: the args list is whitespace-collapsed so `. Admin` and
 * `.Admin` and the optional `[...]` array wrapper all normalise.
 */
export function parseEnumSubsetAnnotation(
  expr: string,
  enumVariantsOf: (enumName: string) => string[] | null,
): EnumSubsetParse {
  const m = /^([A-Za-z_][A-Za-z0-9_]*)\s+(oneOf|notIn)\s*\((.*)\)\s*(?:\[\s*([A-Za-z_][A-Za-z0-9_]*)\s*\])?\s*$/s.exec(
    expr.trim(),
  );
  if (!m) return null;

  const baseName = m[1];
  const mode = m[2] as "oneOf" | "notIn";
  const argInner = m[3];
  const label = m[4] ?? null;

  // The base must resolve to a known enum. If it doesn't, this is NOT an
  // enum-subset refinement (e.g. `number oneOf(...)` mis-write falls through to
  // the caller's existing path).
  const baseVariants = enumVariantsOf(baseName);
  if (!baseVariants) return null;

  // Collapse all whitespace so spacing variants and the optional `[...]` array
  // wrapper both normalise.
  const compact = argInner.replace(/\s+/g, "");

  // §53.15.1 — NO range form. `oneOf(.A .. .B)` reintroduces the SPARK RPP02
  // union-evolution hazard. Reject.
  if (compact.includes("..")) {
    return {
      kind: "error",
      baseEnum: baseName,
      mode,
      message:
        `Range form \`${baseName} ${mode}(.A .. .B)\` is not permitted in enum-subset ` +
        `refinement position. \`${mode}\` over an enum is an EXPLICIT enumerated set ` +
        `(\`${baseName} ${mode}([.A, .B])\`); a range form reintroduces the union-evolution ` +
        `hazard a newly-added neighbour variant is silently absorbed (§53.15.1).`,
    };
  }

  // Strip an optional `[...]` array-literal wrapper, then split on commas.
  let listBody = compact;
  if (listBody.startsWith("[") && listBody.endsWith("]")) {
    listBody = listBody.slice(1, -1);
  }

  // Empty subset list — `oneOf([])` / `notIn([])` are malformed in this position.
  if (listBody.length === 0) {
    return {
      kind: "error",
      baseEnum: baseName,
      mode,
      message:
        `Empty variant set in \`${baseName} ${mode}([])\`. An enum-subset refinement ` +
        `must list at least one variant (§53.15.1).`,
    };
  }

  // Each entry must be `.VariantName`.
  const listed: string[] = [];
  for (const rawEntry of listBody.split(",")) {
    const entry = rawEntry.trim();
    if (entry.length === 0) continue;
    if (entry[0] !== "." || !/^\.[A-Za-z_][A-Za-z0-9_]*$/.test(entry)) {
      return {
        kind: "error",
        baseEnum: baseName,
        mode,
        message:
          `Malformed variant \`${entry}\` in \`${baseName} ${mode}(...)\`. ` +
          `Enum-subset refinement args must be bare variant literals (\`.Admin\`) (§53.15.1).`,
      };
    }
    listed.push(entry.slice(1));
  }

  // For `oneOf`, the positive set IS the listed variants; for `notIn`, the
  // positive set is `base \ excluded` (complemented here so every consumer
  // reads a single positive membership set).
  const variants =
    mode === "oneOf"
      ? listed
      : baseVariants.filter(n => !listed.includes(n));

  return { kind: "subset", baseEnum: baseName, mode, variants, label };
}
