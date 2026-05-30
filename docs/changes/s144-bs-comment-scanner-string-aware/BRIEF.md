# BRIEF — S144 Cluster C-X (6nz Bug X, HIGH)
agent: a8c2da7affff5179a · scrml-dev-pipeline · isolation:worktree · model:opus · dispatched S144 2026-05-30 on HEAD 505f4ace.
discipline: standard S126/S99/S88/S83/S90/R26 verbatim per pa.md.

BUG: `//` inside a string literal (incl https://) treated as line comment by block-splitter scan → eats rest of line incl braces → brace/context unwind → misleading E-CTX-003 "Unclosed logic/program" hard compile FAIL (exit 1). Wrong-line error.
CHARACTERIZATION: both logic + ${} interp; "..." and '...'; https://, bare mid-string //, trailing //; /* */ in string does NOT trigger.
LEADS: block-splitter.js skipLineComment ~line 312; scan-loop callers ~360/528/1482 (`if(c==="/"&&source[p+1]==="/"){p=skipLineComment...}`) detect // WITHOUT checking inside-string-literal. Fix: make comment-scan string-aware (only enter skipLineComment when NOT inside "..."/'...'/backtick); reuse/extend existing string-state tracking in the file; handle escaped quotes + template backticks. Distinct from R28-3 (skipTriviaForCompoundScan = // between opener> and <child>).
SCOPE-FENCE: block-splitter.js + tests only. Don't regress real // line comments outside strings.
ACCEPTANCE: BS unit tests (// in "..", in '..', https://, mid-string, trailing, REAL // comment still stripped, /* */ in string). R26 repro exit 0 + @url intact. Pre-commit gate.
