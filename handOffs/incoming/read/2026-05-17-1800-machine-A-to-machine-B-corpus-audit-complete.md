---
from: scrmlTS-PA-machine-A (S99)
to: scrmlTS-PA-machine-B (next pickup)
date: 2026-05-17
subject: Machine-A corpus-refresh DONE (425 candidates) + extraction script promoted
needs: fyi
status: unread
---

# Machine-A corpus-refresh — DONE

You flagged this in your S98B wrap as a "when you have a session-end window" item; user authorized + I ran it inline this session. Pushed at scrml-support `bb6d51d`.

## Output

```
scrml-support/voice/machine-A-corpus-candidates-2026-05-17.json   (1.4 MB; 425 candidates)
scrml-support/scripts/regen-corpus-candidates.py                  (promoted from /tmp/)
```

## Stats

| Project | Files | Quotes |
|---|---:|---:|
| -home-bryan-scrmlMaster-scrmlTS | 34 | 322 |
| -home-bryan-scrmlMaster | 8 | 76 |
| -home-bryan-scrmlMaster-giti | 3 | 10 |
| -home-bryan-scrmlMaster-6NZ | 2 | 17 |
| -home-bryan-scrmlMaster-scrml | 0 | 0 |
| -home-bryan-scrmlMaster-scrml-support | 0 | 0 |
| **Total** | **47** | **425** |

vs your machine: 55 files / 645 quotes. Machine A has fewer because (a) newer / fewer sessions logged on this filesystem and (b) your side carries the heaviest session activity.

## Schema parity

Output JSON schema matches your `machine-B-corpus-candidates-2026-05-17.json` exactly — `{ _meta: {...}, candidates: [{ id, topics, text-verbatim, source, timestamp, length }, ...] }`. Same hash-based ID scheme (SHA-1 of text → 12 char prefix); same 20-topic keyword vector; same `command-shaped` exclusions; same `> 50 char + has lowercase + low code-char ratio` substantive filter.

## Script promotion

Your wrap report flagged "promote to scripts/regen-corpus-candidates.py if/when this becomes a recurring task." User running it on both machines confirmed recurring → script promoted at `scrml-support/scripts/regen-corpus-candidates.py`. Parameterized via `PROJECTS_ROOT` + `INCLUDED_PROJECT_DIRS` constants — adjust the project_dir prefixes for the running machine's session-path naming (your `-home-bryan-maclee-*` vs my `-home-bryan-*` user-name divergence is the load-bearing parameter).

## Merge protocol (your S98B wrap rule)

User reviews candidates from BOTH machines' files; selectively promotes to canonical `quote-library.json` with quality-curated topics + clean-text variant + notes field. Topic tags in both files are KEYWORD-HEURISTIC and need user refinement. No automated merge.

## Combined corpus pool now

645 (Machine B) + 425 (Machine A) = **1,070 candidate quotes** awaiting user review across two source files. Twitter archive from this morning is a third corpus source (raw `.zip`); awaits its own extraction pass.

## Tags

#cross-machine #s99 #voice-corpus #machine-a-audit-done #425-candidates #script-promoted #merge-protocol
