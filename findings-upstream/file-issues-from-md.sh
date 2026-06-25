#!/usr/bin/env bash
#
# file-issues-from-md.sh — file N GitHub issues from a single markdown file.
#
# FORMAT (simple and editable):
#   Each issue is one `## ` (H2) heading. The heading text is the issue TITLE.
#   Everything below it, until the next `## ` heading or end-of-file, is the
#   issue BODY (markdown, verbatim). Content before the first `## ` is ignored,
#   so you can keep a title/intro at the top of the file.
#
#   `## ` headings inside fenced code blocks (``` ... ```) are NOT treated as
#   issue boundaries, so code samples containing comments are safe.
#
# Example input file:
#   # My issues          <- ignored (not H2)
#   ## First bug title
#   Body of the first issue.
#   ```
#   ## this is inside a fence, ignored as a boundary
#   ```
#   ## Second bug title
#   Body of the second issue.
#
# Requirements (only for --go): gh CLI installed and authenticated, with write
# access to the target repo.
#
# Usage:
#   ./file-issues-from-md.sh ISSUES.md                      # dry run (lists titles)
#   ./file-issues-from-md.sh ISSUES.md --go                 # actually file them
#   ./file-issues-from-md.sh ISSUES.md --go --repo owner/name
#   REPO=owner/name ./file-issues-from-md.sh ISSUES.md --go # repo via env
#
set -euo pipefail

SRC=""; GO=0; REPO="${REPO:-}"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --go)        GO=1; shift ;;
    --repo)      REPO="${2:-}"; shift 2 ;;
    --repo=*)    REPO="${1#--repo=}"; shift ;;
    -h|--help)   sed -n '2,40p' "$0"; exit 0 ;;
    -*)          echo "error: unknown flag $1" >&2; exit 1 ;;
    *)           SRC="$1"; shift ;;
  esac
done

[[ -n "$SRC" ]]   || { echo "error: no markdown file given (usage: $0 <file.md> [--go] [--repo owner/name])" >&2; exit 1; }
[[ -f "$SRC" ]]   || { echo "error: file not found: $SRC" >&2; exit 1; }

if [[ $GO -eq 1 ]]; then
  [[ -n "$REPO" ]] || { echo "error: --repo owner/name (or REPO env) required with --go" >&2; exit 1; }
  command -v gh >/dev/null || { echo "error: gh CLI not found" >&2; exit 1; }
  gh auth status >/dev/null 2>&1 || { echo "error: gh not authenticated (run: gh auth login)" >&2; exit 1; }
fi

work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT

# Split SRC into per-issue title/body files. Fence-aware so `## ` inside ``` is
# not a boundary. Index files are zero-padded for stable ordering.
count="$(
  awk -v dir="$work" '
    function flush() { if (n>0) { close(bf) } }
    BEGIN { n=0; infence=0 }
    /^```/ { infence = !infence; if (n>0) print >> bf; next }
    (!infence && /^## /) {
      flush(); n++
      idx=sprintf("%03d", n)
      tf=dir"/"idx".title"; bf=dir"/"idx".body"
      title=$0; sub(/^## /,"",title)
      print title > tf; close(tf)
      next
    }
    n>0 { print >> bf }
    END { print n }
  ' "$SRC"
)"

if [[ "$count" -eq 0 ]]; then
  echo "error: no '## ' issue headings found in $SRC" >&2
  exit 1
fi

echo "Source: $SRC"
echo "Found $count issue(s)."
[[ $GO -eq 1 ]] && echo "Target repo: $REPO" || echo "(dry run — pass --go --repo owner/name to file them)"
echo

filed=0
for tf in "$work"/*.title; do
  idx="$(basename "$tf" .title)"; bf="$work/$idx.body"
  title="$(cat "$tf")"
  # trim leading and trailing blank lines from the body
  sed -e '/./,$!d' "$bf" | sed -e ':a' -e '/^\n*$/{$d;N;ba}' > "$bf.trim" || cp "$bf" "$bf.trim"
  if [[ $GO -eq 1 ]]; then
    echo ">> filing: $title"
    gh issue create --repo "$REPO" --title "$title" --body-file "$bf.trim"
  else
    blines="$(wc -l < "$bf.trim" | tr -d ' ')"
    echo "── $title   (${blines} body lines)"
  fi
  filed=$((filed+1))
done

echo
if [[ $GO -eq 0 ]]; then
  echo "$filed issue(s) ready. Re-run with --go --repo owner/name to file them."
else
  echo "Done — $filed issue(s) filed to $REPO."
fi
