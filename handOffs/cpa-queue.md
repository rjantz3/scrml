# cPA stow queue — FIFO prompts waiting for a PA

**Created S209 (2026-06-19).** The cPA's FIFO stow buffer. cPA-owned, **write-before-act** (append a
row BEFORE acknowledging a stow — a crash mid-stow loses nothing; DD Fork G). When the PA reports
warm, the cPA feeds these to it in order, then clears the fed rows.

## Schema

`| seq | received | from | for-PA | verbatim-prompt (or pointer) | status |`
status: `stowed` (waiting) · `fed` (delivered to a warm PA) · `dropped` (user retracted).

## Queue (FIFO — oldest first)

| seq | received | from | for-PA | prompt | status |
|-----|----------|------|--------|--------|--------|
| _(empty)_ | | | | | |

> Empty at creation. The cPA has not yet run a live session — this template seeds the first boot.
