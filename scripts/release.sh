#!/usr/bin/env bash
# Release a new version: bump package.json, commit, tag, and push.
# The pushed tag triggers .github/workflows/release.yml, which publishes to npm.
#
# Usage: pnpm release [patch|minor|major|<exact version>]  (default: patch)
set -euo pipefail

bump="${1:-patch}"

branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$branch" != "main" ]; then
  echo "Releases must be cut from main (currently on $branch)" >&2
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is not clean, commit or stash your changes first" >&2
  exit 1
fi

git fetch origin main
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
  echo "Local main is not in sync with origin/main" >&2
  exit 1
fi

echo "Running checks..."
pnpm run lint
pnpm run test
pnpm run build

npm version "$bump" -m "release: v%s"

version="$(node -p "require('./package.json').version")"
echo "Pushing v$version..."
git push --follow-tags origin main

echo "Done. Watch the Release workflow: https://github.com/fabiankachlock/vue-uni-intent/actions"
