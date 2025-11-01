# @ensemble-edge/edgit

## 0.1.0

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
