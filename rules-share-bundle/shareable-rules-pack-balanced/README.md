# Shareable Cursor Rules Pack (Balanced)

This variant is balanced by default:

- core coaching/safety rules stay `alwaysApply: true`
- process-heavy rules are scoped (`alwaysApply: false` with globs)
- lower interruption while keeping strong guardrails

## Install

Copy `shareable-rules-pack-balanced/.cursor/rules/*` into `<target-repo>/.cursor/rules/`.

## Install with helper script

From this repository root:

```sh
scripts/install-rules-pack.sh --variant balanced --target /path/to/target-repo
```

Preview without writing:

```sh
scripts/install-rules-pack.sh --variant balanced --target /path/to/target-repo --dry-run
```
