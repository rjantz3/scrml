/** Source location span produced by the compiler parser stages. */
export interface CGSpan {
  file?: string;
  start: number;
  end: number;
  line?: number;
  col?: number;
  [key: string]: unknown;
}

export class CGError {
  code: string;
  message: string;
  span: CGSpan | object;
  severity: 'error' | 'warning' | 'info';

  constructor(
    code: string,
    message: string,
    span: CGSpan | object,
    severity: 'error' | 'warning' | 'info' = "error",
  ) {
    this.code = code;
    this.message = message;
    this.span = span;
    this.severity = severity;
  }
}

// ---------------------------------------------------------------------------
// E-TEST-* — Test context error codes (SPEC §34, severity: Test)
// ---------------------------------------------------------------------------
//
// Authoritative source: compiler/SPEC.md §34 catalog (lines ~14420-14425) +
// §19.13 (line ~11435+). This comment block is documentation; SPEC.md is
// normative per pa.md Rule 4.
//
// E-TEST-001  `~{}` test block: assertion failed.
// E-TEST-002  `~{}` test block: unexpected error during execution.
// E-TEST-003  `~{}` test block: timeout exceeded.
// E-TEST-004  `~{}` test block: references variable from outer scope (§19.12).
// E-TEST-005  `~{}` test block: invalid test structure (umbrella code; A6-2
//             reuses for parser-level violations including `test-bind`
//             duplicate identifier, context violation, missing identifier,
//             missing `=`, missing RHS — verified verbatim fit per Rule 4).
// E-TEST-006  `~{}` test block: server-function call inside an active
//             `test-bind` context references a server function with no
//             `test-bind` declaration in scope (§19.12.6 / §19.12.7,
//             design-insight 22, S74). Fail-fast over silent passthrough.
//             Test-mode-only; dead-code-eliminated from release builds.
