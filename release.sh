#!/usr/bin/env bash
# Tag a release and make jsDelivr serve it straight away.
#
#   ./release.sh v1.6.0
#
# Without the purge, embeds on the floating @1 link keep the old file for
# up to about a week.
set -euo pipefail

REPO=marjanbajct2/skydancer
# .min.js is not in the repo: jsDelivr minifies the source on request, and
# caches that result separately, so it needs purging too.
FILES=(skydancer.js skydancer.min.js)

tag=${1:-}
if [[ ! $tag =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "usage: $0 vX.Y.Z" >&2
  exit 1
fi

cd "$(dirname "$0")"

if [[ -n $(git status --porcelain) ]]; then
  echo "working tree is dirty; commit first" >&2
  exit 1
fi

if git rev-parse -q --verify "refs/tags/$tag" >/dev/null; then
  echo "$tag already exists" >&2
  exit 1
fi

# drop the local tag again if either push fails, so a rerun isn't blocked by it
trap 'git tag -d "$tag" >/dev/null 2>&1 || true' ERR
git tag "$tag"
git push origin HEAD
git push origin "$tag"
trap - ERR

for f in "${FILES[@]}"; do
  echo "purging $f"
  curl -fsS "https://purge.jsdelivr.net/gh/$REPO@1/$f" >/dev/null
done

# the alias takes a moment to pick the new tag up
served=""
for _ in $(seq 1 20); do
  # a blip here should cost one attempt, not the whole run
  served=$(curl -fsS "https://cdn.jsdelivr.net/gh/$REPO@1/skydancer.min.js" | sed -n 's/.*Original file: [^@]*@\([^/]*\).*/\1/p' | head -1) || true
  [[ $served == "${tag#v}" ]] && break
  sleep 5
done

if [[ $served == "${tag#v}" ]]; then
  echo "$tag is live on the CDN"
else
  echo "warning: the CDN still serves ${served:-unknown}; try the purge again shortly" >&2
  exit 1
fi
