/**
 * @module codegen/srcmap-provenance
 *
 * B1 use-site source-map provenance — emitter-recorded source spans.
 * (source-map-use-site-spans-b1-2026-05-31)
 *
 * ---------------------------------------------------------------------------
 * Why an in-string sentinel marker (not a threaded offset accumulator)
 * ---------------------------------------------------------------------------
 * The codegen emitters assemble output by composing template-literal STRINGS:
 * every `emitExpr(node, ctx)` returns a string that is `.join`ed / interpolated
 * up through ~16 emit-*.ts files before the per-file JS is assembled. The
 * GENERATED offset of any fragment is therefore unknown at emit time — it only
 * exists once the whole file string is assembled.
 *
 * B2 (the prior, eliminated approach) sidestepped this by RE-SCANNING the final
 * JS per line and mapping each line to the first author-name it mentions —
 * which resolves every USE of a cell to its DECLARATION, the confidently-wrong
 * behaviour this dispatch replaces.
 *
 * B1 (this module — the deep-dive's ratified approach) records the REAL source
 * span at the point each use-site fragment is EMITTED, by riding the source
 * position INSIDE the emitted string via a zero-content block-comment sentinel
 * placed immediately before the fragment:
 *
 *     SLASH-STAR #scrmlmap#BYTEOFFSET,name#scrmlmap# STAR-SLASH _scrml_reactive_get("count")
 *
 * The sentinel survives every intervening `.join` / template wrap because it is
 * inert JS (a block comment is legal anywhere an expression may start). After
 * the file's JS is assembled, `build-source-map.ts` scans for sentinels,
 * derives each one's GENERATED line/col from its position in the marker-STRIPPED
 * output, converts the recorded SOURCE BYTE OFFSET to a source line/col via a
 * LineIndex over the source, registers the author name in the `names` field, and
 * STRIPS every sentinel so the deployed JS is clean + readable (§47 / readability).
 *
 * ---------------------------------------------------------------------------
 * Byte offset (not line/col) is the recorded source position
 * ---------------------------------------------------------------------------
 * The AST `Span` carries `{ start, end, line, col }`, but the `line`/`col`
 * fields are NOT reliably populated on every emitted ExprNode (many spans are
 * built from byte offsets alone, leaving line/col at 0). The `start` byte
 * offset, by contrast, is always the real position into the preprocessed source.
 * So the marker records `start`, and the post-assembly converter resolves it to
 * line/col via the SAME LineIndex the encoder uses — the single authoritative
 * byte-offset -> line/col bridge.
 *
 * ---------------------------------------------------------------------------
 * Gating — zero footprint when source maps are off (the default)
 * ---------------------------------------------------------------------------
 * Marker emission is gated on a module-level flag set ONLY when `runCG` is
 * invoked with `sourceMap: true`. With the flag OFF (the default, used by the
 * entire test corpus and every production build that doesn't request maps),
 * `srcmapMark` returns "" — so the emitted JS is BYTE-IDENTICAL to pre-B1 and
 * there is no scan/strip cost. Mirrors the `var-counter.ts` module-singleton
 * pattern (`resetVarCounter()` runs once per compile inside `runCG`).
 */

/**
 * Sentinel boundary token. ASCII-only, distinctive, and never produced by any
 * other codegen path. Appears only transiently inside source-map-mode output
 * and is stripped before the JS is finalized.
 */
export const SRCMAP_MARK_TOKEN = "#scrmlmap#";

/** Module-level gate — true only between enable/disable inside a sourceMap compile. */
let provenanceEnabled = false;

/** Enable use-site marker emission (called by `runCG` when `sourceMap: true`). */
export function enableSrcmapProvenance(): void {
  provenanceEnabled = true;
}

/** Disable use-site marker emission (called by `runCG` for a non-sourceMap compile). */
export function disableSrcmapProvenance(): void {
  provenanceEnabled = false;
}

/** Whether marker emission is currently enabled (for tests / assertions). */
export function isSrcmapProvenanceEnabled(): boolean {
  return provenanceEnabled;
}

/** The span shape srcmapMark reads: a `start` byte offset into the source. */
export interface MarkableSpan {
  start?: number;
}

/**
 * Build a use-site provenance marker for an AST node's source span, or "".
 *
 * Returns "" when:
 *   - provenance is disabled (the default — no source-map mode), OR
 *   - the span is absent / has no real byte `start` (a synthetic node).
 * In the synthetic-span case the fragment carries no marker and is therefore
 * honestly categorized synthetic downstream (never a fake (0,0) author position).
 *
 * @param span  AST node span — only `start` (byte offset) is read.
 * @param name  optional bare author identifier this use-site binds (for `names`).
 * @returns the block-comment marker to PREFIX the fragment, or "".
 */
export function srcmapMark(
  span: MarkableSpan | null | undefined,
  name?: string | null
): string {
  if (!provenanceEnabled) return "";
  return formatSrcmapMark(span, name);
}

/**
 * The PURE marker formatter — produces a marker for a valid span REGARDLESS of
 * the module gate. Used (a) internally by the gated `srcmapMark`, and (b)
 * directly by tests, which must NOT toggle the shared module gate: bun runs test
 * files concurrently, so a test that flipped the gate could race a concurrently-
 * running compile's emission and drop its markers. Production code calls the
 * GATED `srcmapMark`; tests call this.
 *
 * Returns "" for an absent / non-positive (synthetic) byte offset.
 *
 * NOTE on byte offset 0: many interpolation-lowered / synthesized reactive-ref
 * ExprNodes carry `span.start === 0` as a NOT-SET sentinel rather than a real
 * position (e.g. `{@coins}` markup reads lowered through emit-lift). A GENUINE
 * use-site at the literal first byte of a `.scrml` file is impossible — every
 * file opens with markup / `<title>` / `<program>`, never a bare `@x` at byte 0.
 * So treating `start === 0` as "no marker" (the node stays categorized
 * synthetic) eliminates the false (0,0) author mappings those synthesized nodes
 * would otherwise produce, at zero cost to any real use-site. The "no marker"
 * cases are therefore: no span, start <= 0, or start is not a number.
 */
export function formatSrcmapMark(
  span: MarkableSpan | null | undefined,
  name?: string | null
): string {
  if (!span) return "";
  const start = span.start;
  if (typeof start !== "number" || start <= 0) return "";
  // Restrict the name field to the bare-identifier charset so the marker can
  // never contain the comment terminator and close the comment early. Anything
  // else -> no name (the position is still recorded; only name-recovery skips).
  const safeName = name && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : "";
  return `/*${SRCMAP_MARK_TOKEN}${start},${safeName}${SRCMAP_MARK_TOKEN}*/`;
}

/**
 * One parsed use-site marker occurrence found in assembled JS.
 *   - `index` is the byte offset of the marker's FIRST char in the ORIGINAL
 *     (marker-bearing) string.
 *   - `raw` is the full matched marker text (so callers can compute its length).
 *   - the fragment the marker annotates begins immediately AFTER `raw`.
 *   - `sourceByteOffset` is the recorded source byte offset of the use site.
 */
export interface SrcmapMarkHit {
  index: number;
  raw: string;
  sourceByteOffset: number;
  name: string; // "" when no name was recorded
}

/** Matches a use-site marker (block comment carrying byteOffset,name). */
const MARK_RE = new RegExp(
  `/\\*${SRCMAP_MARK_TOKEN}(\\d+),([A-Za-z_$][A-Za-z0-9_$]*)?${SRCMAP_MARK_TOKEN}\\*/`,
  "g"
);

/**
 * Find every use-site marker in `js`, in source order. Does NOT mutate `js`.
 */
export function findSrcmapMarks(js: string): SrcmapMarkHit[] {
  const hits: SrcmapMarkHit[] = [];
  MARK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MARK_RE.exec(js)) !== null) {
    hits.push({
      index: m.index,
      raw: m[0],
      sourceByteOffset: parseInt(m[1], 10),
      name: m[2] ?? "",
    });
  }
  return hits;
}

/** Remove every use-site marker from `js`, returning the cleaned string. */
export function stripSrcmapMarks(js: string): string {
  MARK_RE.lastIndex = 0;
  return js.replace(MARK_RE, "");
}
