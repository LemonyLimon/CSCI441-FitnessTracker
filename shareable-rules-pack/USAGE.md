# Rules Pack Installer Usage

Use the installer script from this repository root:

```sh
scripts/install-rules-pack.sh --variant <strict|balanced> --target <target-repo-path>
```

## Portable script (share this with other repos)

You can also use the portable script inside this folder:

```sh
shareable-rules-pack/install-rules-pack.sh --source <rules-dir> --target <target-repo-path>
```

Where `<rules-dir>` is any folder that contains `.mdc` files.

Examples:

```sh
shareable-rules-pack/install-rules-pack.sh \
  --source shareable-rules-pack-strict/.cursor/rules \
  --target ../my-other-repo

shareable-rules-pack/install-rules-pack.sh \
  --source shareable-rules-pack-balanced/.cursor/rules \
  --target ../my-other-repo \
  --dry-run
```

## Examples

Install strict rules into a sibling repo:

```sh
scripts/install-rules-pack.sh --variant strict --target ../my-other-repo
```

Install balanced rules into an absolute path:

```sh
scripts/install-rules-pack.sh --variant balanced --target /Users/me/code/my-repo
```

Preview files without writing:

```sh
scripts/install-rules-pack.sh --variant balanced --target ../my-other-repo --dry-run
```

## What the script does

- Validates `--variant` and `--target`.
- Creates `<target>/.cursor/rules` if needed.
- Copies `.mdc` files from selected pack into target rules folder.
