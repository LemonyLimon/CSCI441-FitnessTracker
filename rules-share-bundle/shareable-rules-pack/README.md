# Shareable Cursor Rules Pack

This folder contains generalized `.mdc` rules you can reuse across repositories.

## Included

- instructor guidance mode
- question intake template
- decision escalation checkpoints
- definition of done
- API contract discipline
- small-slice execution guidance
- secrets and logging safety
- post-feature refactor trigger

## How to use in another repo

1. Copy `shareable-rules-pack/.cursor/rules/*` into `<target-repo>/.cursor/rules/`.
2. Keep file names as-is, or rename to match your conventions.
3. Adjust any team-specific wording as needed.

## Install with helper script

Use the installer from this repo root:

```sh
scripts/install-rules-pack.sh --variant strict --target /path/to/target-repo
scripts/install-rules-pack.sh --variant balanced --target /path/to/target-repo
```

Preview without writing:

```sh
scripts/install-rules-pack.sh --variant balanced --target /path/to/target-repo --dry-run
```

Detailed examples: `shareable-rules-pack/USAGE.md`

## Portable installer (can be copied anywhere)

This folder also includes a portable installer script:

```sh
shareable-rules-pack/install-rules-pack.sh --source <rules-dir> --target <target-repo-path>
```

It is layout-agnostic and works with any source directory containing `.mdc` files.

## Notes

- These rules are intentionally generic (no repo-specific file paths or command names).
- Existing repo rules can override or complement these based on your needs.
