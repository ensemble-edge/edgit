# Testing Infrastructure

This document outlines the testing strategy and infrastructure for Edgit.

## Current State

✅ **Status**: Test infrastructure operational

The project has a comprehensive testing infrastructure with:
- **Test Framework**: Vitest configured with coverage reporting
- **Integration Tests**: 16 tests covering critical CLI commands (init, commit, tag, deploy, components)
- **Unit Tests**: Comprehensive tests for utilities (component-detector, git-tags)
- **Test Helpers**: TestGitRepo helper for isolated Git repository testing
- **Coverage**: v8 provider with 40% baseline thresholds

### Test Statistics

- **Total Tests**: 100+ test cases
- **Integration Tests**: 16 tests in 5 suites
- **Unit Tests**: 90+ tests for utilities
- **Test Helper**: TestGitRepo creates isolated temporary Git repos
- **Timeout**: 10 seconds for Git operations

### Running Tests

```bash
npm test                  # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Generate coverage report
npm run test:unit         # Run only unit tests
npm run test:integration  # Run only integration tests
```

## Testing Stack

### Test Framework: Vitest

We use **Vitest** for the following reasons:
- Native ESM support (matches our module system)
- Fast execution with smart parallelization
- Compatible API with Jest (easy migration)
- Built-in TypeScript support
- Excellent watch mode
- Coverage reporting via v8

### Current Configuration

`vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        'tests/',
        '*.config.ts',
      ],
      thresholds: {
        lines: 40,
        functions: 40,
        branches: 40,
        statements: 40,
      },
    },
    testTimeout: 10000, // 10 seconds for Git operations
  },
})
```

## Test Structure

```
tests/
├── unit/                           # Unit tests for pure functions
│   └── utils/
│       ├── component-detector.test.ts  ✅ 90+ tests
│       └── git-tags.test.ts            ✅ 80+ tests
├── integration/                    # Integration tests for commands
│   ├── init.test.ts               ✅ 2 tests - edgit init command
│   ├── commit.test.ts             ✅ 5 tests - edgit commit command
│   ├── components.test.ts         ✅ 3 tests - component detection
│   ├── tag.test.ts                ✅ 4 tests - tag creation
│   └── deploy.test.ts             ✅ 2 tests - deployment workflows
└── helpers/                        # Test utilities
    └── git-test-repo.ts           ✅ TestGitRepo helper class

Future directories:
├── e2e/                           # End-to-end workflow tests (planned)
└── fixtures/                       # Test data and sample repos (planned)
```

### Test Helper: TestGitRepo

The TestGitRepo class creates isolated temporary Git repositories for testing:

```typescript
import { TestGitRepo } from '../helpers/git-test-repo.js'

// Create isolated test repo
const repo = await TestGitRepo.create()
await repo.init()

// Work with the repo
await repo.writeFile('prompts/test.md', 'content')
await repo.commit('Add prompt')
const result = await repo.runEdgit(['init'])

// Cleanup
await repo.cleanup()
```

## Test Patterns

### Unit Tests

Test pure functions and utilities in isolation:

```typescript
// tests/unit/utils/component-detector.test.ts
import { describe, it, expect } from 'vitest'
import { detectComponentType } from '../../../src/utils/component-detector.js'

describe('ComponentDetector', () => {
  describe('detectComponentType', () => {
    it('should detect prompt files by .prompt.md extension', () => {
      const type = detectComponentType('path/to/helper.prompt.md')
      expect(type).toBe('prompt')
    })

    it('should detect agent files in agents directory', () => {
      const type = detectComponentType('agents/processor.ts')
      expect(type).toBe('agent')
    })

    it('should detect SQL files by .sql extension', () => {
      const type = detectComponentType('queries/users.sql')
      expect(type).toBe('sql')
    })

    it('should return null for non-component files', () => {
      const type = detectComponentType('README.md')
      expect(type).toBeNull()
    })
  })
})
```

### Integration Tests

Test commands with real Git operations in temporary repositories:

```typescript
// tests/integration/tag.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TestGitRepo } from '../helpers/git-test-repo.js'

describe('edgit tag', () => {
  let testRepo: TestGitRepo

  beforeEach(async () => {
    testRepo = await TestGitRepo.create()
    await testRepo.init()
    await testRepo.writeFile('prompts/test.md', 'Test prompt content')
    await testRepo.commit('Initial commit')
  })

  afterEach(async () => {
    await testRepo.cleanup()
  })

  describe('create', () => {
    it('should create version tag for component', async () => {
      const result = await testRepo.runEdgit(['tag', 'create', 'test-prompt', 'v1.0.0'])

      expect(result.exitCode).toBe(0)
      const tags = await testRepo.listTags()
      expect(tags).toContain('components/test-prompt/v1.0.0')
    })

    it('should fail if version tag already exists', async () => {
      await testRepo.runEdgit(['tag', 'create', 'test-prompt', 'v1.0.0'])

      const result = await testRepo.runEdgit(['tag', 'create', 'test-prompt', 'v1.0.0'])

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('already exists')
    })
  })
})
```

## Test Commands

Available in `package.json`:

```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode for development
npm run test:coverage       # Generate coverage report
npm run test:unit           # Run only unit tests
npm run test:integration    # Run only integration tests
```

## Coverage Requirements

### Thresholds

- **Critical paths** (tag creation, deployment): **80%+**
- **Utilities** (detectors, parsers): **70%+**
- **Commands**: **60%+**
- **Overall project**: **60%+**

## Completed

- ✅ Install Vitest and configure
- ✅ Create test helpers (TestGitRepo)
- ✅ Write 16 integration tests for critical paths
- ✅ Add comprehensive unit tests for utilities

## Future Improvements

1. **Increase coverage** to 60%+ baseline
2. **Add E2E tests** for complete workflows
3. **Set up CI** to run tests on every PR
4. **Add unit tests** for remaining utilities (component-name-generator, changelog)
5. **Add integration tests** for error scenarios and edge cases

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
