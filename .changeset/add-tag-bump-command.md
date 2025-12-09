---
"@ensemble-edge/edgit": patch
---

Add `edgit tag bump` command for automated semantic version bumping

- New `edgit tag bump <component> <major|minor|patch|prerelease>` command
- Automatically finds the latest version tag and creates a bumped version
- Supports optional `--ref <ref>` to specify the Git ref for the new tag
- Handles edge cases: components with no existing tags start at v0.0.1
- Full semver support including prerelease increments (v1.0.0-alpha.1 → v1.0.0-alpha.2)
