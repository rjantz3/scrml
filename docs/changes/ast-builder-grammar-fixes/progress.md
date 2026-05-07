## ast-builder grammar fixes — STATUS

[2026-05-06] - Survey complete. SURVEY-NOTE.md written. Probe confirms:
  - F1 export function: only export-decl emitted, no function-decl
  - F2 export *: completely unparsed (exportedName=null, exportKind=null)
  - F3 export { A as B }: regex captures literal "A as B" as exportedName

Approach decisions documented in SURVEY-NOTE.md.

