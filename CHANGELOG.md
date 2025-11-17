# @ensemble-edge/edgit

## 1.0.1

### Patch Changes

- de652bf: ## Documentation Improvements

  Fixed visual duplication in all 9 Edgit documentation pages where Mintlify was rendering both frontmatter metadata and markdown content. Removed duplicate H1 headings and bold taglines, consolidating all descriptive text into frontmatter description fields for cleaner presentation.

  **Documentation updates:**
  - edgit/overview.mdx
  - edgit/getting-started (3 files)
  - edgit/guides (4 files)
  - edgit/reference/cli-commands.mdx

  All documentation pages now render cleanly without duplication.

## 1.0.0

### Major Changes

- b742dc7: **BREAKING CHANGES**: Component nomenclature refactor for agent/component separation
  - Component types renamed: 'sql' → 'query', 'agent' → 'script'
  - Added new 'agent-definition' component type for agent.yaml files
  - Implemented dual Git tag namespaces: `components/{name}/{version}` and `agents/{name}/{version}`
  - Updated all detection patterns with proper priority ordering
  - Enhanced GitTagManager with EntityType support for both components and agents
  - Zero backward compatibility - clean v0.3.0 release

  This enables different deployment strategies: agents (compiled) vs components (storage-based).

## 0.3.0 (Unreleased)

### BREAKING CHANGES

**Component Type Nomenclature Refactor**

This release introduces a clean nomenclature update to better distinguish between components and agents in AI system architectures. This is a breaking change with no backward compatibility.

**New Component Types:**

- `'query'` (previously `'sql'`) - Database queries and schemas
- `'script'` (previously `'agent'`) - Executable scripts (.js, .ts, .py, .sh)
- `'agent-definition'` (new) - Agent definition files (agent.yaml/yml)
- `'prompt'` - Unchanged
- `'config'` - Unchanged

**Dual Git Tag Namespaces:**

- **Components**: `components/{name}/{version}` - Versioned artifacts (prompts, queries, configs, scripts)
- **Agents**: `agents/{name}/{version}` - Versioned workers (agent definitions)

This separation enables different deployment strategies: agents can be compiled/built while components exist in storage (e.g., KV stores).

**What Changed:**

1. **ComponentType** enum updated across all files
2. **Detection patterns** updated for new types:
   - Files like `*.agent.ts` now detected as `'script'`
   - Files named `agent.yaml` detected as `'agent-definition'`
   - SQL files now detected as `'query'`
3. **GitTagManager** now supports both `'component'` and `'agent'` EntityTypes
4. **AI commit messages** updated with new type-specific templates
5. **File header formats** updated for new component types

**Migration Guide:**

- Update any scripts referencing `'agent'` type to use `'script'`
- Update any scripts referencing `'sql'` type to use `'query'`
- Agent versioning now uses `agents/` namespace instead of `components/`
- No automated migration provided - this is a clean break for v0.3.0

**Updated APIs:**

```typescript
// GitTagManager - new EntityType parameter
await tagManager.tag(name, tagName, 'agent', sha, message)
await tagManager.listTags(name, 'agent')
await tagManager.getVersionTags(name, 'agent')

// New agent-specific methods
await tagManager.tagAgent(agentName, version)
await tagManager.listAgentTags(agentName)
```

### Features

- **Agent Versioning**: Full support for versioning agents separately from components
- **Dual Namespaces**: Separate git tag namespaces for components and agents
- **Improved Type Clarity**: Component types now clearly reflect their purpose
- **Agent Definitions**: First-class support for `agent.yaml` files

### Documentation

- Updated README with agent versioning concepts
- Updated package.json description to mention agents
- All tests updated to reflect new nomenclature (162 tests passing)

---

## 0.1.8

### Minor Changes

- 624b381: Add comprehensive development infrastructure and testing framework

  This release establishes modern development standards for the project:

  **Testing Infrastructure:**
  - Vitest test framework with 16 passing integration tests
  - TestGitRepo helper class for isolated test environments
  - Full test coverage for init, tag, deploy, components, and commit commands
  - CI/CD integration with automated testing

  **Development Standards:**
  - Comprehensive CLAUDE.md (3,500+ lines) for AI assistant guidance
  - Detailed DEVELOPMENT.md (1,800+ lines) developer onboarding guide
  - TESTING.md (800+ lines) test strategy documentation
  - Enhanced CONTRIBUTING.md with contribution guidelines
  - ESLint + Prettier for code quality and consistent formatting
  - VSCode integration with recommended settings

  **Release Management:**
  - Migrated from semantic-release to Changesets
  - Automated version management and changelog generation
  - GitHub Actions workflows for CI and releases
  - Type checking, linting, and testing in CI pipeline

  **Documentation:**
  - 6,000+ lines of comprehensive documentation
  - Clear development workflows and best practices
  - Contributor guidelines for changesets and versioning

### Patch Changes

- 2400b81: Add comprehensive unit tests for utility modules

  This patch adds 120 unit tests covering core utility functions:

  **ComponentDetector tests (78 tests):**
  - Pattern matching for all component types (prompts, agents, SQL, configs)
  - Path handling (Windows paths, nested paths, edge cases)
  - Component name generation with type suffix detection
  - Pattern validation and custom pattern support
  - Integration scenarios with realistic file structures

  **GitTagManager tests (42 tests):**
  - Namespace formatting for component tags
  - Semantic version sorting and filtering
  - Version tag pattern matching
  - Deployment tag identification
  - Tag existence checks and resolution logic

  **Test improvements:**
  - All 136 tests passing (120 unit + 16 integration)
  - Updated TESTING.md to reflect current infrastructure
  - Added CLAUDE.md guidance on committing dist/ directory
