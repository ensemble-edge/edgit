---
"@ensemble-edge/edgit": patch
---

Add comprehensive unit tests for utility modules

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
