---
"@ensemble-edge/edgit": minor
---

Remove deprecated deploy command in favor of tag set + push workflow

Breaking change: The `edgit deploy` command has been removed entirely.

New workflow:
- `edgit tag set <component> <env> <version>` - Set environment tag
- `edgit push --tags --force` - Push tags to remote

Philosophy: Edgit creates and manages git tags. That's it.
GitHub Actions handles deployment after git push.
