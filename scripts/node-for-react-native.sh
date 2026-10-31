#!/bin/bash
set -euo pipefail

node_binary="${NODE_BINARY:-$(command -v node || true)}"
node_major=0

if [[ -n "$node_binary" ]]; then
  node_major="$($node_binary -p "Number(process.versions.node.split('.')[0])" 2>/dev/null || echo 0)"
fi

if [[ "$node_major" -lt 22 && -d "$HOME/.nvm/versions/node" ]]; then
  while IFS= read -r candidate; do
    candidate_major="$($candidate -p "Number(process.versions.node.split('.')[0])" 2>/dev/null || echo 0)"
    if [[ "$candidate_major" -ge 22 ]]; then
      node_binary="$candidate"
    fi
  done < <(find "$HOME/.nvm/versions/node" -type f -path '*/bin/node' | sort -V)
fi

if [[ -z "$node_binary" ]]; then
  echo "Node.js is required to build Speakly." >&2
  exit 1
fi

exec "$node_binary" "$@"
