/**
 * @module codegen/source-map
 *
 * Source Map v3 generator for scrml compiled JS output (client + server).
 *
 * Implements Source Map v3: https://sourcemaps.info/spec.html
 * VLQ encoding per the Source Map v3 wire format.
 *
 * No npm dependencies — VLQ is implemented inline (it's ~15 lines).
 *
 * ---------------------------------------------------------------------------
 * Provenance model (source-map-real-provenance-js-2026-05-31)
 * ---------------------------------------------------------------------------
 * Every line of compiled JS falls into exactly one of two categories:
 *
 *   - SOURCE-DERIVED — the line was produced because of a specific construct
 *     in the author's `.scrml` source (a state declaration, a function body,
 *     a reactive binding, an event handler). Such a line maps to the real
 *     `.scrml` line/column the construct came from, and — where the line
 *     mentions a named author construct — registers the AUTHOR name in the
 *     `names` field (§47 / Source Map v3 `names`), so a renamed/encoded
 *     identifier in the output (e.g. `_scrml_t_count`) resolves back to the
 *     author identifier (`count`).
 *
 *   - SYNTHETIC — the line has NO author origin: the IIFE preamble, the
 *     runtime-assembly placeholder, banner comments, generated wiring
 *     boilerplate. Synthetic lines carry an explicit SENTINEL position (0,0)
 *     that is RECORDED as synthetic, never silently emitted as if it were a
 *     real (0,0) author position.
 *
 * The distinction matters in devtools: a SOURCE-DERIVED line that falls back
 * to (0,0) renders as a wrong / "dead" highlight region — "9 of 14 lines
 * light up, 5 don't" reads as a broken compiler. The coverage canary test
 * asserts no source-derived line is silently (0,0).
 *
 * SPEC §47 prose: "All JavaScript variable names in compiled output SHALL use
 * encoded names as specified in this section. The compiled JS is an IR;
 * encoded names are correct and intentional. Source maps (PIPELINE.md §Stage
 * 8) are the specified debugging path back to `.scrml` source." This module
 * fulfills that promise for JS (Phase 1). CSS source maps + HTML span
 * correlation are later phases.
 *
 * Usage:
 *   const builder = new SourceMapBuilder("app.scrml", scrmlSource);
 *   builder.addSourceMapping(genLine, genCol, srcLine, srcCol, "count");
 *   builder.addSyntheticLine(genLine);
 *   const mapJson = builder.generate("app.client.js");
 *   const jsWithComment = appendSourceMappingUrl(jsCode, "app.client.js.map");
 */

// ---------------------------------------------------------------------------
// VLQ Base64 encoding
// ---------------------------------------------------------------------------

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * Encode a single signed integer as a VLQ base64 string.
 *
 * VLQ encoding:
 *   1. Map signed integer to unsigned: negative n -> (-n << 1) | 1, non-negative n -> n << 1
 *   2. Chunk into 5-bit groups, LSB first
 *   3. Set continuation bit (bit 5) on all chunks except the last
 *   4. Base64-encode each 6-bit chunk (5 data bits + 1 continuation bit)
 */
export function encodeVlq(value: number): string {
  // Map signed to unsigned (sign bit in LSB). `>>> 0` keeps the result an
  // unsigned 32-bit int so large source offsets encode without sign drift.
  let vlq = value < 0 ? (((-value) << 1) | 1) >>> 0 : (value << 1) >>> 0;
  let result = "";
  do {
    let digit = vlq & 0x1f; // take 5 bits
    vlq >>>= 5;
    if (vlq > 0) digit |= 0x20; // set continuation bit if more to come
    result += BASE64_CHARS[digit];
  } while (vlq > 0);
  return result;
}

/**
 * Encode an array of signed integers as a single VLQ segment.
 */
export function encodeVlqGroup(values: number[]): string {
  return values.map(encodeVlq).join("");
}

// ---------------------------------------------------------------------------
// LineIndex — byte-offset -> 0-indexed {line, column}
// ---------------------------------------------------------------------------

/**
 * Convert a 0-indexed byte offset into the source string to a 0-indexed
 * {line, column} pair. AST node spans are `[startByte, endByte)` offsets into
 * the source; Source Map v3 positions are 0-indexed line + 0-indexed column.
 * This is the bridge.
 *
 * A line-start index is built once per source string so a file with thousands
 * of mappings does a binary search per lookup rather than re-scanning the
 * whole source each time.
 */
export class LineIndex {
  /** Byte offset at which each line starts (lineStarts[i] = start of line i). */
  private readonly lineStarts: number[];
  private readonly length: number;

  constructor(source: string) {
    this.length = source.length;
    const starts = [0];
    for (let i = 0; i < source.length; i++) {
      if (source.charCodeAt(i) === 10 /* \n */) starts.push(i + 1);
    }
    this.lineStarts = starts;
  }

  /** 0-indexed {line, column} for a 0-indexed byte offset (clamped to range). */
  locate(offset: number): { line: number; column: number } {
    const clamped = offset < 0 ? 0 : offset > this.length ? this.length : offset;
    // Binary search for the greatest lineStart <= clamped.
    let lo = 0;
    let hi = this.lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.lineStarts[mid] <= clamped) lo = mid;
      else hi = mid - 1;
    }
    return { line: lo, column: clamped - this.lineStarts[lo] };
  }
}

// ---------------------------------------------------------------------------
// SourceMapBuilder
// ---------------------------------------------------------------------------

/** Discriminates a real author-origin mapping from a synthetic sentinel. */
export type MappingKind = "source" | "synthetic";

/** A single mapping entry: a generated position -> a source location. */
interface Mapping {
  generatedLine: number;
  generatedColumn: number;
  sourceLine: number;
  sourceColumn: number;
  /** Author name index into the `names` array, or -1 when no name applies. */
  nameIndex: number;
  /** Provenance category — load-bearing for the coverage canary. */
  kind: MappingKind;
}

/** Source Map v3 JSON structure. */
interface SourceMapV3 {
  version: 3;
  file: string;
  sourceRoot: string;
  sources: string[];
  sourcesContent?: (string | null)[];
  names: string[];
  mappings: string;
  /**
   * NON-STANDARD diagnostic sidecar (ignored by every devtools consumer — the
   * Source Map v3 spec permits extra top-level keys). Records, per generated
   * line, whether the line's mapping is "source"-derived or "synthetic". The
   * coverage canary test reads this to assert no source-derived line silently
   * collapsed to (0,0). Devtools never read `x_scrml_kinds`.
   */
  x_scrml_kinds?: MappingKind[];
}

/**
 * Build a Source Map v3 for a single generated JS output file.
 *
 * Real column + source-column precision and the `names` field are emitted.
 * Mappings are delta-encoded per the Source Map v3 spec:
 *   - generatedColumn is a delta from the previous segment IN THE SAME line
 *     (resets to absolute at the start of each generated line)
 *   - sourceFileIndex / sourceLine / sourceColumn / nameIndex are deltas from
 *     the previous segment GLOBALLY (carry across line boundaries)
 */
export class SourceMapBuilder {
  private readonly _sourceFile: string;
  private readonly _sourceContent: string | null;
  private readonly _mappings: Mapping[] = [];
  private readonly _names: string[] = [];
  private readonly _nameToIndex = new Map<string, number>();

  /**
   * @param sourceFile    — basename of the source .scrml file (e.g. "app.scrml")
   * @param sourceContent — the exact source string the spans index into
   *                        (embedded as sourcesContent so the map is
   *                        self-contained). Pass null to omit sourcesContent.
   */
  constructor(sourceFile: string, sourceContent: string | null = null) {
    this._sourceFile = sourceFile;
    this._sourceContent = sourceContent;
  }

  /** Intern an author name, returning its index in the `names` array. */
  private internName(name: string): number {
    const existing = this._nameToIndex.get(name);
    if (existing !== undefined) return existing;
    const idx = this._names.length;
    this._names.push(name);
    this._nameToIndex.set(name, idx);
    return idx;
  }

  /**
   * Record a SOURCE-DERIVED mapping: a generated position that came from a
   * specific `.scrml` source position. Optionally register an author name.
   *
   * @param generatedLine   — 0-indexed output JS line
   * @param generatedColumn — 0-indexed output JS column
   * @param sourceLine      — 0-indexed .scrml line
   * @param sourceColumn    — 0-indexed .scrml column
   * @param name            — author identifier this position binds (optional)
   */
  addSourceMapping(
    generatedLine: number,
    generatedColumn: number,
    sourceLine: number,
    sourceColumn: number,
    name?: string
  ): void {
    const nameIndex = name && name.length > 0 ? this.internName(name) : -1;
    this._mappings.push({
      generatedLine,
      generatedColumn,
      sourceLine,
      sourceColumn,
      nameIndex,
      kind: "source",
    });
  }

  /**
   * Backward-compatibility alias for the historical line-level signature
   * `addMapping(generatedLine, sourceLine, sourceColumn)`. The historical
   * builder mapped every output line to generated column 0; this alias
   * preserves that on top of the column-aware core so legacy callers and the
   * existing unit suite keep working. New code SHOULD call `addSourceMapping`
   * (with a generated column) or `addSyntheticLine`.
   *
   * @param generatedLine — 0-indexed output JS line
   * @param sourceLine    — 0-indexed source .scrml line
   * @param sourceColumn  — 0-indexed source column (default 0)
   */
  addMapping(generatedLine: number, sourceLine: number, sourceColumn = 0): void {
    this.addSourceMapping(generatedLine, 0, sourceLine, sourceColumn);
  }

  /**
   * Record a SYNTHETIC line: compiler-emitted output with no author origin
   * (preamble, runtime placeholder, wiring boilerplate). Emitted with a
   * sentinel (0,0) source position but explicitly CATEGORIZED synthetic so
   * the coverage canary can tell it apart from a real-but-forgotten (0,0).
   */
  addSyntheticLine(generatedLine: number): void {
    this._mappings.push({
      generatedLine,
      generatedColumn: 0,
      sourceLine: 0,
      sourceColumn: 0,
      nameIndex: -1,
      kind: "synthetic",
    });
  }

  /**
   * Generate the Source Map v3 JSON string.
   *
   * @param outputFile   — basename of the generated JS file (e.g. "app.client.js")
   * @param includeKinds — include the `x_scrml_kinds` diagnostic sidecar
   *                       (default true; the coverage canary needs it).
   */
  generate(outputFile: string, includeKinds = true): string {
    const { mappings, kindsByLine } = this._buildMappingsField();
    const map: SourceMapV3 = {
      version: 3,
      file: outputFile,
      sourceRoot: "",
      sources: [this._sourceFile],
      names: this._names,
      mappings,
    };
    if (this._sourceContent !== null) {
      map.sourcesContent = [this._sourceContent];
    }
    if (includeKinds) {
      map.x_scrml_kinds = kindsByLine;
    }
    return JSON.stringify(map, null, 2);
  }

  /**
   * Build the VLQ-encoded `mappings` string + the per-line kind sidecar.
   *
   * Groups are generated lines (separated by ";"). Each group holds
   * comma-separated segments. Each segment is a 4- or 5-field VLQ tuple:
   *   [genColDelta, srcFileDelta, srcLineDelta, srcColDelta]            (no name)
   *   [genColDelta, srcFileDelta, srcLineDelta, srcColDelta, nameDelta] (named)
   * genColDelta is relative to the previous segment in the same line (reset
   * per line); the rest are global deltas.
   */
  private _buildMappingsField(): { mappings: string; kindsByLine: MappingKind[] } {
    if (this._mappings.length === 0) return { mappings: "", kindsByLine: [] };

    // Group by generated line, preserving insertion order within a line.
    const lineMap = new Map<number, Mapping[]>();
    let maxLine = 0;
    for (const m of this._mappings) {
      if (m.generatedLine > maxLine) maxLine = m.generatedLine;
      const arr = lineMap.get(m.generatedLine);
      if (arr) arr.push(m);
      else lineMap.set(m.generatedLine, [m]);
    }

    // Global delta state (carries across line boundaries per the spec).
    let prevSourceFileIndex = 0;
    let prevSourceLine = 0;
    let prevSourceColumn = 0;
    let prevNameIndex = 0;

    const groups: string[] = [];
    const kindsByLine: MappingKind[] = [];

    for (let line = 0; line <= maxLine; line++) {
      const segments = lineMap.get(line);
      if (!segments || segments.length === 0) {
        groups.push("");
        // A generated line with no mapping carries no author provenance.
        kindsByLine.push("synthetic");
        continue;
      }

      const parts: string[] = [];
      let prevGeneratedColumn = 0; // resets per generated line

      // The line's kind is "source" if ANY segment on it is source-derived.
      let lineKind: MappingKind = "synthetic";

      for (const seg of segments) {
        if (seg.kind === "source") lineKind = "source";

        const genColDelta = seg.generatedColumn - prevGeneratedColumn;
        const srcFileDelta = 0 - prevSourceFileIndex; // single source -> index 0
        const srcLineDelta = seg.sourceLine - prevSourceLine;
        const srcColDelta = seg.sourceColumn - prevSourceColumn;

        if (seg.nameIndex >= 0) {
          const nameDelta = seg.nameIndex - prevNameIndex;
          parts.push(
            encodeVlqGroup([genColDelta, srcFileDelta, srcLineDelta, srcColDelta, nameDelta])
          );
          prevNameIndex = seg.nameIndex;
        } else {
          parts.push(encodeVlqGroup([genColDelta, srcFileDelta, srcLineDelta, srcColDelta]));
        }

        prevGeneratedColumn = seg.generatedColumn;
        prevSourceFileIndex = 0;
        prevSourceLine = seg.sourceLine;
        prevSourceColumn = seg.sourceColumn;
      }

      groups.push(parts.join(","));
      kindsByLine.push(lineKind);
    }

    return { mappings: groups.join(";"), kindsByLine };
  }
}

// ---------------------------------------------------------------------------
// Utility: append sourceMappingURL comment
// ---------------------------------------------------------------------------

/**
 * Append a `//# sourceMappingURL=<file>` comment to a JS string.
 *
 * Per convention this is the last line of the generated JS file. Idempotent —
 * if the code already ends with this comment it is not added again.
 *
 * @param jsCode — the generated JS string
 * @param mapFile — the basename of the .map file (e.g. "app.client.js.map")
 * @returns the JS with the comment appended
 */
export function appendSourceMappingUrl(jsCode: string, mapFile: string): string {
  const comment = `//# sourceMappingURL=${mapFile}`;
  if (jsCode.includes(comment)) return jsCode;
  const separator = jsCode.endsWith("\n") ? "" : "\n";
  return `${jsCode}${separator}${comment}\n`;
}
