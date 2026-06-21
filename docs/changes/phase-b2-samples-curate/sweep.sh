#!/usr/bin/env bash
# Phase-1 mechanical compile-sweep over all samples/compilation-tests/*.scrml (excl. dist).
# Partition: exit 0 = PASS (still-compiles); exit 1 = FAIL (triage). Capture first error [E-...] code per fail.
# Run from worktree root. Writes a TSV to docs/changes/phase-b2-samples-curate/sweep-results.tsv
set -u
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
CLI="compiler/src/cli.js"
OUT="docs/changes/phase-b2-samples-curate"
TSV="$OUT/sweep-results.tsv"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

: > "$TSV"
pass=0
fail=0
i=0
total=$(find samples/compilation-tests -name '*.scrml' -not -path '*/dist/*' | wc -l)

while IFS= read -r f; do
  i=$((i+1))
  err="$TMP/e"
  bun run "$CLI" compile "$f" -o "$TMP/out/" >/dev/null 2>"$err"
  rc=$?
  if [ "$rc" -eq 0 ]; then
    pass=$((pass+1))
    printf 'PASS\t%s\t-\n' "$f" >> "$TSV"
  else
    fail=$((fail+1))
    # first fatal error code: line beginning with "error [E-...]"
    code=$(grep -oE '^error \[[A-Z0-9-]+\]' "$err" | head -1 | sed -E 's/^error \[//; s/\]$//')
    [ -z "$code" ] && code="UNKNOWN"
    printf 'FAIL\t%s\t%s\n' "$f" "$code" >> "$TSV"
  fi
  if [ $((i % 50)) -eq 0 ]; then echo "  ...$i/$total (pass=$pass fail=$fail)" >&2; fi
done < <(find samples/compilation-tests -name '*.scrml' -not -path '*/dist/*' | sort)

echo "DONE total=$i pass=$pass fail=$fail" >&2
