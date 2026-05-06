#!/usr/bin/env bash

set -euo pipefail

print_usage() {
  cat <<'EOF'
Portable Cursor rules installer.

Usage:
  install-rules-pack.sh --source <rules-dir> --target <repo-path> [--dry-run]

Options:
  --source    Path to folder containing .mdc files (for example ./strict/.cursor/rules)
  --target    Path to target repository root
  --dry-run   Show actions without writing files
  -h, --help  Show this help message

Examples:
  ./install-rules-pack.sh --source ./strict/.cursor/rules --target ../my-repo
  ./install-rules-pack.sh --source ./balanced/.cursor/rules --target /path/to/repo --dry-run
EOF
}

source_rules=""
target_repo=""
dry_run="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source)
      source_rules="${2:-}"
      shift 2
      ;;
    --target)
      target_repo="${2:-}"
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

if [[ -z "$source_rules" || -z "$target_repo" ]]; then
  echo "Error: --source and --target are required." >&2
  print_usage >&2
  exit 1
fi

if [[ ! -d "$source_rules" ]]; then
  echo "Error: source directory not found: $source_rules" >&2
  exit 1
fi

if [[ ! -d "$target_repo" ]]; then
  echo "Error: target repository path not found: $target_repo" >&2
  exit 1
fi

shopt -s nullglob
rule_files=("$source_rules"/*.mdc)
shopt -u nullglob

if [[ ${#rule_files[@]} -eq 0 ]]; then
  echo "Error: no .mdc files found in source directory: $source_rules" >&2
  exit 1
fi

target_rules_dir="$target_repo/.cursor/rules"

echo "Source: $source_rules"
echo "Target: $target_rules_dir"

if [[ "$dry_run" == "true" ]]; then
  echo ""
  echo "[dry-run] Would create: $target_rules_dir"
  echo "[dry-run] Would copy files:"
  for file in "${rule_files[@]}"; do
    echo "  - $(basename "$file")"
  done
  exit 0
fi

mkdir -p "$target_rules_dir"
cp "${rule_files[@]}" "$target_rules_dir"/

echo ""
echo "Installed rules into: $target_rules_dir"
echo "Copied files:"
for file in "${rule_files[@]}"; do
  echo "  - $(basename "$file")"
done
