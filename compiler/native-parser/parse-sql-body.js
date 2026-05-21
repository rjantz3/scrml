// parse-sql-body.js — JS-host shadow of parse-sql-body.scrml.
// See span.js header for the .scrml<->.js duplication rationale.
// PILLAR 5b classification mirrors parse-sql-body.scrml's header.
//
// F7.b / v0.6 BRIDGE-FULL — the native-parser analogue of the live
// pipeline's SQL-block payload shaping (compiler/src/ast-builder.js
// `parseSQLTokens` ~L9464 + `consumeSqlChainedCalls` ~L3576 + the
// `buildBlock` `case "sql"` arm ~L11426). A pure calculation over a
// native `Sql` block's body text + the source bytes trailing its `}`.
//
// THE LIVE CONTRACT (the behavioral spec — ast-builder.js):
//   The live BS routes a `?{ query }` block to `case "sql"`. There:
//     - the body text (between `?{` and `}`) is the raw SQL `query`;
//     - the `.method(args)` chain trailing the `}` is consumed into
//       `chainedCalls[]` — each entry is `{ method, args }`;
//     - `.nobatch()` is a §8.9.5 compile-time marker — it is STRIPPED
//       from the chain and the node's `nobatch` flag is set instead.
//   The resulting SQLNode: { kind:"sql", query, chainedCalls, nobatch? }.
//
// THE NATIVE NODE-CATALOG ADAPTATION (Phase 0 — M5-divergence-ledger):
//   The native parser's `Sql` block (parse-markup.js — entered by the
//   `?{` sigil, closed by the matching `}`) was SKETCH-DEPTH: it captured
//   the brace extent but neither the query text nor the chained calls.
//   F7.b lights both up:
//     - the markup layer captures `block.bodyText` (the verbatim body
//       slice — already done for LogicEscape blocks; F7.b extends it to
//       Sql blocks);
//     - shapeSqlBlock parses `bodyText` into `block.query` and consumes
//       the trailing `.method(args)` chain into `block.chainedCalls`;
//     - `.nobatch()` is stripped → `block.nobatch`.
//   The stamped fields ARE the live FileAST `SQLNode` payload shape — no
//   native<->live translation layer.
//
// The chained-call grammar — the markup layer hands shapeSqlBlock the
// source string + the offset one PAST the `}`; scanChainedCalls walks
// `.method(args)` runs from there and returns both the parsed chain AND
// the offset where the chain ENDS (so the markup trampoline can advance
// the cursor past a consumed chain — the chain bytes are the Sql block's,
// not free TopLevel text).

// =============================================================================
// shapeSqlBlock — calculation (mutates the passed Sql block in place, the
// same way emitContextBlock stamps `.bodyText`). Given a native `Sql` block
// with `block.bodyText` set + the host source string + the offset one past
// the block's closing `}`, derive + stamp the SQL payload:
//   block.query        — the SQL query text (the body, trimmed of the
//                          backtick delimiters if present — live parity).
//   block.chainedCalls — { method, args }[] (the `.nobatch()` call stripped).
//   block.nobatch      — set true iff a `.nobatch()` call appeared.
// Returns { chainEnd } — the source offset where the trailing chain ends
// (equal to `afterBrace` when no chain trails the block).
// =============================================================================
export function shapeSqlBlock(block, source, afterBrace) {
    if (block === undefined || block === null || block.kind !== "Sql") {
        return { chainEnd: afterBrace };
    }

    const bodyText = typeof block.bodyText === "string" ? block.bodyText : "";
    block.query = extractSqlQuery(bodyText);
    block.chainedCalls = [];

    const chain = scanChainedCalls(source, afterBrace);
    let nobatch = false;
    for (const call of chain.calls) {
        // §8.9.5 — `.nobatch()` is a compile-time marker with no runtime
        // effect: drop it from the chain and flag the node.
        if (call.method === "nobatch") {
            nobatch = true;
        } else {
            block.chainedCalls.push({ method: call.method, args: call.args });
        }
    }
    if (nobatch) block.nobatch = true;

    return { chainEnd: chain.end };
}

// =============================================================================
// extractSqlQuery — calculation (pure). The SQL query text of a `?{...}`
// body. The live `tokenizeSQL` recognizes a backtick-delimited query (`...`)
// and emits the text BETWEEN the backticks; a non-backtick body is treated
// as raw and trimmed. This mirrors that: a body whose trimmed text is
// wrapped in matching backticks yields the inter-backtick text; otherwise
// the trimmed body.
// =============================================================================
export function extractSqlQuery(bodyText) {
    const text = (typeof bodyText === "string" ? bodyText : "").trim();
    if (text.length >= 2 && text.charAt(0) === "`" && text.charAt(text.length - 1) === "`") {
        return text.substring(1, text.length - 1);
    }
    return text;
}

// =============================================================================
// scanChainedCalls — calculation (pure). Walk a `.method(args)` chain from
// `start` in `source`. Mirrors the live `consumeSqlChainedCalls`: each link
// is a `.`, a method identifier, then an OPTIONAL `( args )` group whose
// `args` is the verbatim inter-paren text. Inter-link whitespace is skipped
// (a `?{...}\n  .run()` chain is still one chain). The scan STOPS at the
// first byte that is not a chain continuation.
//
// Returns { calls: { method, args }[], end }. `end` is the offset one past
// the last consumed chain byte (equal to `start` when no chain is present).
// =============================================================================
export function scanChainedCalls(source, start) {
    const calls = [];
    if (typeof source !== "string") return { calls, end: start ?? 0 };

    const len = source.length;
    let p = typeof start === "number" ? start : 0;
    let lastConsumed = p;

    for (;;) {
        // Skip inter-link whitespace — a chain may wrap across lines.
        let q = p;
        while (q < len && isChainWhitespace(source.charAt(q))) {
            q = q + 1;
        }
        // A chain link begins with `.`.
        if (q >= len || source.charAt(q) !== ".") break;
        q = q + 1; // consume `.`

        // The method name — an identifier run.
        const nameStart = q;
        while (q < len && isIdentChar(source.charAt(q))) {
            q = q + 1;
        }
        // A `.` not followed by an identifier is not a chain link — bail
        // (live `consumeSqlChainedCalls` breaks on a non-IDENT after `.`).
        if (q === nameStart) break;
        const method = source.substring(nameStart, q);

        // An OPTIONAL `( args )` group — depth-aware so a nested `(` in the
        // args (a call argument `f(x)`) does not end the group early.
        let args = "";
        if (q < len && source.charAt(q) === "(") {
            q = q + 1; // consume `(`
            const argStart = q;
            let depth = 1;
            while (q < len && depth > 0) {
                const ch = source.charAt(q);
                if (ch === "(") {
                    depth = depth + 1;
                } else if (ch === ")") {
                    depth = depth - 1;
                    if (depth === 0) break;
                }
                q = q + 1;
            }
            args = source.substring(argStart, q);
            if (q < len && source.charAt(q) === ")") {
                q = q + 1; // consume `)`
            }
        }

        calls.push({ method, args });
        lastConsumed = q;
        p = q;
    }

    return { calls, end: lastConsumed };
}

// =============================================================================
// isChainWhitespace — calculation (pure predicate). Whitespace that may
// separate `?{...}` from its chain, or one chain link from the next.
// =============================================================================
export function isChainWhitespace(ch) {
    return ch === " " || ch === "\t" || ch === "\r" || ch === "\n";
}

// =============================================================================
// isIdentChar — calculation (pure predicate). A character legal in a SQL
// chained-method identifier (`run` / `all` / `get` / `batch` / `nobatch`).
// =============================================================================
export function isIdentChar(ch) {
    if (ch === undefined || ch === null || ch.length === 0) return false;
    return (ch >= "a" && ch <= "z")
        || (ch >= "A" && ch <= "Z")
        || (ch >= "0" && ch <= "9")
        || ch === "_" || ch === "$";
}
