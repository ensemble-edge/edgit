# Phase 1: Testing Infrastructure & Core Tests

**Status**: 🚧 In Progress
**Estimated Time**: 8 hours
**Started**: November 1, 2024

## Goals

Establish a comprehensive testing infrastructure and write critical integration tests to ensure code quality and enable safe refactoring in future phases.

## Objectives

1. **Set up test framework** (Vitest)
2. **Create test utilities** for Git operations
3. **Write 15 core integration tests** covering critical paths
4. **Achieve baseline coverage** (40-50% as starting point)

---

## Part 1: Test Infrastructure Setup (Hours 1-4)

### Hour 1: Install and Configure Vitest

**Tasks:**
- [ ] Install Vitest and coverage tools
- [ ] Create `vitest.config.ts`
- [ ] Update `package.json` scripts
- [ ] Verify basic test runs

**Commands:**
```bash
npm install -D vitest @vitest/coverage-v8
```

**Files to Create:**
- `vitest.config.ts` - Test configuration
- Update `package.json` - Add test scripts

**Expected Outcome:**
- `npm test` runs (even if no tests yet)
- Coverage configuration ready

---

### Hour 2: Test Directory Structure

**Tasks:**
- [ ] Create test directory structure
- [ ] Set up test fixtures
- [ ] Create sample component files for testing

**Directory Structure:**
```
tests/
├── unit/                    # Unit tests
│   └── utils/
│       └── component-detector.test.ts
├── integration/             # Integration tests
│   ├── init.test.ts
│   ├── tag.test.ts
│   ├── deploy.test.ts
│   └── commit.test.ts
├── fixtures/                # Test data
│   └── sample-components/
│       ├── prompts/
│       │   └── test.prompt.md
│       ├── agents/
│       │   └── test.agent.ts
│       └── configs/
│           └── test.config.json
└── helpers/                 # Test utilities
    ├── git-test-repo.ts
    ├── test-utils.ts
    └── assertions.ts
```

**Expected Outcome:**
- Clean test organization
- Sample fixtures ready for use

---

### Hour 3: TestGitRepo Helper Class

**Tasks:**
- [ ] Create `TestGitRepo` class
- [ ] Implement temp repo creation/cleanup
- [ ] Add Git operation helpers
- [ ] Add edgit command runner

**Key Methods:**
```typescript
class TestGitRepo {
  static async create(): Promise<TestGitRepo>
  async init(): Promise<void>
  async writeFile(path: string, content: string): Promise<void>
  async commit(message: string): Promise<void>
  async createTag(name: string): Promise<void>
  async listTags(): Promise<string[]>
  async runEdgit(args: string[]): Promise<CommandResult>
  async cleanup(): Promise<void>
}
```

**Expected Outcome:**
- Reusable test utility for Git operations
- Isolated temp repos for each test

---

### Hour 4: Test Utilities and Assertions

**Tasks:**
- [ ] Create mock Git wrapper (optional)
- [ ] Create custom assertions
- [ ] Create test fixture loaders
- [ ] Write example test to verify setup

**Files:**
- `tests/helpers/test-utils.ts` - General utilities
- `tests/helpers/assertions.ts` - Custom matchers
- `tests/helpers/fixtures.ts` - Load sample data

**Example Test:**
```typescript
// tests/integration/init.test.ts
describe('edgit init', () => {
  it('should initialize edgit in git repo', async () => {
    const repo = await TestGitRepo.create()
    await repo.init()

    const result = await repo.runEdgit(['init'])

    expect(result.exitCode).toBe(0)
    expect(await repo.fileExists('.edgit/components.json')).toBe(true)

    await repo.cleanup()
  })
})
```

**Expected Outcome:**
- Test infrastructure working end-to-end
- First test passing

---

## Part 2: Core Integration Tests (Hours 5-8)

### Critical Test Coverage Areas

#### Test Suite 1: Initialization & Setup
1. **`edgit init`** - Creates `.edgit/` directory and registry
2. **`edgit init --force`** - Overwrites existing configuration

#### Test Suite 2: Component Detection
3. **Component detection** - Detects all component types (prompt, agent, sql, config)
4. **Component collision** - Detects and reports naming collisions

#### Test Suite 3: Tag Operations (Version Tags)
5. **Version tag creation** - Creates immutable version tag
6. **Version tag duplication** - Prevents overwriting existing version
7. **Invalid version format** - Rejects non-semver versions
8. **Multiple version tags** - Creates multiple versions for same component

#### Test Suite 4: Tag Operations (Deployment Tags)
9. **Deployment tag creation** - Creates moveable deployment tag
10. **Deployment tag moving** - Moves deployment tag to new version
11. **Deployment to non-existent version** - Fails gracefully

#### Test Suite 5: Component Management
12. **Component listing** - Lists all components with details
13. **Component show** - Shows specific component history

#### Test Suite 6: Commit Operations
14. **Manual commit** - Commits with custom message
15. **AI commit fallback** - Falls back gracefully when no API key

---

## Detailed Test Specifications

### Test 1: edgit init
```typescript
describe('edgit init', () => {
  let repo: TestGitRepo

  beforeEach(async () => {
    repo = await TestGitRepo.create()
    await repo.init()
  })

  afterEach(async () => {
    await repo.cleanup()
  })

  it('should create .edgit directory structure', async () => {
    const result = await repo.runEdgit(['init'])

    expect(result.exitCode).toBe(0)
    expect(await repo.fileExists('.edgit/components.json')).toBe(true)
    expect(await repo.fileExists('.edgit/config.json')).toBe(true)
  })

  it('should create empty registry', async () => {
    await repo.runEdgit(['init'])

    const registry = await repo.readJSON('.edgit/components.json')
    expect(registry.components).toEqual({})
  })
})
```

### Test 2: Component Detection
```typescript
describe('Component detection', () => {
  let repo: TestGitRepo

  beforeEach(async () => {
    repo = await TestGitRepo.create()
    await repo.init()
    await repo.runEdgit(['init'])
  })

  afterEach(async () => {
    await repo.cleanup()
  })

  it('should detect prompt components', async () => {
    await repo.writeFile('prompts/helper.prompt.md', 'Test prompt')
    await repo.commit('Add prompt')

    const result = await repo.runEdgit(['components', 'list'])

    expect(result.stdout).toContain('helper-prompt')
    expect(result.stdout).toContain('prompt')
  })

  it('should detect agent components', async () => {
    await repo.writeFile('agents/processor.agent.ts', '// Agent code')
    await repo.commit('Add agent')

    const result = await repo.runEdgit(['components', 'list'])

    expect(result.stdout).toContain('processor-agent')
    expect(result.stdout).toContain('agent')
  })
})
```

### Test 3: Version Tag Creation
```typescript
describe('edgit tag create', () => {
  let repo: TestGitRepo

  beforeEach(async () => {
    repo = await TestGitRepo.create()
    await repo.init()
    await repo.runEdgit(['init'])
    await repo.writeFile('prompts/test.md', 'Test')
    await repo.commit('Add component')
  })

  afterEach(async () => {
    await repo.cleanup()
  })

  it('should create version tag', async () => {
    const result = await repo.runEdgit(['tag', 'create', 'test-prompt', 'v1.0.0'])

    expect(result.exitCode).toBe(0)

    const tags = await repo.listTags()
    expect(tags).toContain('components/test-prompt/v1.0.0')
  })

  it('should fail on duplicate version tag', async () => {
    await repo.runEdgit(['tag', 'create', 'test-prompt', 'v1.0.0'])

    const result = await repo.runEdgit(['tag', 'create', 'test-prompt', 'v1.0.0'])

    expect(result.exitCode).not.toBe(0)
    expect(result.stderr).toContain('already exists')
  })

  it('should reject invalid version format', async () => {
    const result = await repo.runEdgit(['tag', 'create', 'test-prompt', 'invalid'])

    expect(result.exitCode).not.toBe(0)
    expect(result.stderr).toContain('version')
  })
})
```

### Test 4: Deployment Operations
```typescript
describe('edgit deploy', () => {
  let repo: TestGitRepo

  beforeEach(async () => {
    repo = await TestGitRepo.create()
    await repo.init()
    await repo.runEdgit(['init'])
    await repo.writeFile('prompts/test.md', 'Test')
    await repo.commit('Add component')
    await repo.runEdgit(['tag', 'create', 'test-prompt', 'v1.0.0'])
  })

  afterEach(async () => {
    await repo.cleanup()
  })

  it('should create deployment tag', async () => {
    const result = await repo.runEdgit([
      'deploy', 'set', 'test-prompt', 'v1.0.0', '--to', 'prod'
    ])

    expect(result.exitCode).toBe(0)

    const tags = await repo.listTags()
    expect(tags).toContain('components/test-prompt/prod')
  })

  it('should move deployment tag', async () => {
    await repo.runEdgit(['deploy', 'set', 'test-prompt', 'v1.0.0', '--to', 'prod'])

    // Create v2.0.0
    await repo.writeFile('prompts/test.md', 'Updated')
    await repo.commit('Update')
    await repo.runEdgit(['tag', 'create', 'test-prompt', 'v2.0.0'])

    // Move prod to v2.0.0
    const result = await repo.runEdgit([
      'deploy', 'set', 'test-prompt', 'v2.0.0', '--to', 'prod'
    ])

    expect(result.exitCode).toBe(0)

    // Verify prod now points to v2.0.0
    const prodSha = await repo.getTagSha('components/test-prompt/prod')
    const v2Sha = await repo.getTagSha('components/test-prompt/v2.0.0')
    expect(prodSha).toBe(v2Sha)
  })
})
```

---

## Test Coverage Goals

### Initial Targets (Phase 1)
- **Critical paths**: 50-60% (tag operations, deployment)
- **Utilities**: 40-50% (detectors, git wrapper)
- **Overall**: 40-50%

### Future Targets (Phase 2+)
- **Critical paths**: 80%+
- **Utilities**: 70%+
- **Overall**: 60%+

---

## Success Criteria

### Infrastructure
- [x] Vitest installed and configured
- [ ] Test directory structure created
- [ ] TestGitRepo helper working
- [ ] At least one test passing

### Test Coverage
- [ ] 15 integration tests written
- [ ] All tests passing
- [ ] 40%+ code coverage
- [ ] No flaky tests

### Documentation
- [ ] Test patterns documented
- [ ] Helper utilities documented
- [ ] Coverage report generated

---

## Files to Create

### Configuration
- `vitest.config.ts`

### Test Infrastructure
- `tests/helpers/git-test-repo.ts`
- `tests/helpers/test-utils.ts`
- `tests/helpers/assertions.ts`
- `tests/helpers/fixtures.ts`

### Test Fixtures
- `tests/fixtures/sample-components/prompts/test.prompt.md`
- `tests/fixtures/sample-components/agents/test.agent.ts`
- `tests/fixtures/sample-components/configs/test.config.json`
- `tests/fixtures/sample-components/sql/test.sql`

### Integration Tests
- `tests/integration/init.test.ts` (2 tests)
- `tests/integration/component-detection.test.ts` (2 tests)
- `tests/integration/tag.test.ts` (4 tests)
- `tests/integration/deploy.test.ts` (3 tests)
- `tests/integration/components.test.ts` (2 tests)
- `tests/integration/commit.test.ts` (2 tests)

**Total: 15 tests across 6 test files**

---

## Commands to Run

```bash
# Install dependencies
npm install -D vitest @vitest/coverage-v8

# Run tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Run specific test file
npm test tests/integration/tag.test.ts
```

---

## Next Steps After Phase 1

Once testing infrastructure is complete:
1. **Phase 2**: Error handling refactor (custom error types)
2. **Phase 3**: JSDoc documentation
3. **Phase 4**: Architecture refactoring (ComponentRegistryManager, DI)

---

## Notes

- Keep tests focused and fast (< 5 seconds each)
- Use temp directories, clean up after each test
- Mock external dependencies (OpenAI API)
- Real Git operations (in isolated temp repos)
- Document any test gotchas or quirks

---

**Updated**: November 1, 2024
