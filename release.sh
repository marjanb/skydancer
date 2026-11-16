#!/usr/bin/env bash
# Tag a release and make jsDelivr serve it straight away.
#
#   ./release.sh v1.6.0
#
# Without the purge, embeds on the floating @1 link keep the old file for
# up to about a week.
set -euo pipefail

REPO=marjanbajct2/skydancer
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

git tag "$tag"
git push origin HEAD
git push origin "$tag"

for f in "${FILES[@]}"; do
  echo "purging $f"
  curl -fsS "https://purge.jsdelivr.net/gh/$REPO@1/$f" >/dev/null
done

# the alias takes a moment to pick the new tag up
served=""
for _ in $(seq 1 20); do
  served=$(curl -fsS "https://cdn.jsdelivr.net/gh/$REPO@1/skydancer.min.js" | sed -n 's/.*Original file: [^@]*@\([^/]*\).*/\1/p' | head -1)
  [[ $served == "${tag#v}" ]] && break
  sleep 5
done

if [[ $served == "${tag#v}" ]]; then
  echo "$tag is live on the CDN"
else
  echo "warning: the CDN still serves ${served:-unknown}; try the purge again shortly" >&2
  exit 1
fi
