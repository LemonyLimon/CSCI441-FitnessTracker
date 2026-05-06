# Shareable Cursor Rules Pack (Strict)

This variant is strict by default:

- all rules use `alwaysApply: true`
- maximum consistency and guardrails
- best for teams that want high process enforcement

## Install

Copy `shareable-rules-pack-strict/.cursor/rules/*` into `<target-repo>/.cursor/rules/`.

## Install with helper script

From this repository root:

```sh
scripts/install-rules-pack.sh --variant strict --target /path/to/target-repo
```

Preview without writing:

```sh
scripts/install-rules-pack.sh --variant strict --target /path/to/target-repo --dry-run
```
