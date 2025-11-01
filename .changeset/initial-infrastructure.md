---
"@ensemble-edge/edgit": minor
---

Add comprehensive development infrastructure and testing framework

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
