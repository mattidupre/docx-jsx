#!/bin/sh
# Bump the version, build, and publish to GitHub Packages.
# Usage: pnpm release [patch|minor|major|<version>]   (default: patch)
# pnpm publish delegates to npm, which can't use the pnpm tokenHelper, so the
# gh CLI token (needs write:packages) goes into a throwaway npm user config.
set -eu
bump="${1:-patch}"
npmrc="$(mktemp)"
trap 'rm -f "$npmrc"' EXIT
printf '//npm.pkg.github.com/:_authToken=%s\n' "$(gh auth token --hostname github.com)" > "$npmrc"
chmod 600 "$npmrc"
pnpm version --no-git-tag-version "$bump"
pnpm build
NPM_CONFIG_USERCONFIG="$npmrc" clean-publish --package-manager pnpm
