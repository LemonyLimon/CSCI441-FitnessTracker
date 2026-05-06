#!/usr/bin/env bash

set -euo pipefail

print_usage() {
  cat <<'EOF'
Install shareable Cursor rules into a target repository.

Usage:
  scripts/install-rules-pack.sh --variant <strict|balanced> --target <repo-path> [--dry-run]

Options:
  --variant   Rules pack variant to install (strict or balanced)
  --target    Path to target repository root
  --dry-run   Show what would be copied without writing files
  -h, --help  Show this help message

Examples:
  scripts/install-rules-pack.sh --variant strict --target /path/to/repo
  scripts/install-rules-pack.sh --variant balanced --target ../another-repo
  scripts/install-rules-pack.sh --variant balanced --target ../another-repo --dry-run
EOF
}

variant=""
target=""
dry_run="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --variant)
      variant="${2:-}"
      shift 2
      ;;
    --target)
      target="${2:-}"
      shift 2
      ;;
    --dry-run)
      dry_run="true"
      shift
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      print_usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$variant" || -z "$target" ]]; then
  echo "Error: --variant and --target are required." >&2
  print_usage >&2
  exit 1
fi

if [[ "$variant" != "strict" && "$variant" != "balanced" ]]; then
  echo "Error: --variant must be 'strict' or 'balanced'." >&2
  exit 1
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
source_rules_dir="$repo_root/shareable-rules-pack-$variant/.cursor/rules"
target_rules_dir="$target/.cursor/rules"

if [[ ! -d "$source_rules_dir" ]]; then
  echo "Error: source rules directory not found: $source_rules_dir" >&2
  exit 1
fi

if [[ ! -d "$target" ]]; then
  echo "Error: target repository path not found: $target" >&2
  exit 1
fi

echo "Variant: $variant"
echo "Source:  $source_rules_dir"
echo "Target:  $target_rules_dir"

if [[ "$dry_run" == "true" ]]; then
  echo ""
  echo "[dry-run] Would create: $target_rules_dir"
  echo "[dry-run] Would copy files:"
  for file in "$source_rules_dir"/*.mdc; do
    echo "  - $(basename "$file")"
  done
  exit 0
fi

mkdir -p "$target_rules_dir"
cp "$source_rules_dir"/*.mdc "$target_rules_dir"/

echo ""
echo "Installed rules into: $target_rules_dir"
echo "Copied files:"
for file in "$source_rules_dir"/*.mdc; do
  echo "  - $(basename "$file")"
done
