#!/usr/bin/env bash
# File the validated scrml v0.7.0 findings as issues on the upstream tracker.
#
# Requires: gh CLI authenticated with write access to the target repo.
# Source of truth for titles/bodies: ./ISSUES.md (same directory).
#
# Usage:
#   ./file-issues.sh                      # dry-run: print what would be filed
#   ./file-issues.sh --go                 # actually create the issues
#   REPO=owner/name ./file-issues.sh --go # override target repo
#
set -euo pipefail
cd "$(dirname "$0")"

REPO="${REPO:-bryanmaclee/scrml}"
SRC="ISSUES.md"
GO=0; [[ "${1:-}" == "--go" ]] && GO=1

command -v gh >/dev/null || { echo "error: gh CLI not found"; exit 1; }
[[ -f "$SRC" ]] || { echo "error: $SRC not found"; exit 1; }

work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT

# Split ISSUES.md on lines like "## 01" into per-issue files: title is the
# **Title:** line; body is everything after the blank line following **Body:**.
awk -v dir="$work" '
  /^## [0-9]/      { n=$2; tf=dir"/"n".title"; bf=dir"/"n".body"; inbody=0; next }
  n=="" { next }
  /^\*\*Title:\*\* / { sub(/^\*\*Title:\*\* /,""); print > tf; next }
  /^\*\*Body:\*\*$/   { inbody=1; next }
  inbody==1          { print >> bf }
' "$SRC"

filed=0
for tf in "$work"/*.title; do
  n="$(basename "$tf" .title)"; bf="$work/$n.body"
  title="$(cat "$tf")"
  # trim leading/trailing blank lines from body
  body="$(sed -e :a -e '/^\n*$/{$d;N;ba}' "$bf")"
  if [[ $GO -eq 1 ]]; then
    echo "Filing #$n → $REPO"
    gh issue create --repo "$REPO" --title "$title" --body "$body"
  else
    echo "── [$n] $title"
  fi
  filed=$((filed+1))
done

if [[ $GO -eq 0 ]]; then
  echo
  echo "Dry run: $filed issues would be filed to $REPO. Re-run with --go to create them."
else
  echo "Done: $filed issues filed to $REPO."
fi
