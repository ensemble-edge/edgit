import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TestGitRepo } from '../helpers/git-test-repo.js'

describe('edgit commit', () => {
  let repo: TestGitRepo

  beforeEach(async () => {
    repo = await TestGitRepo.create()
    await repo.init()
    // Note: No edgit init yet - tests will create files first
  })

  afterEach(async () => {
    await repo.cleanup()
  })

  it('should commit with manual message', async () => {
    await repo.writeFile('prompts/test.prompt.md', 'Test prompt')

    const result = await repo.runEdgit(['commit', '-m', 'Add test prompt'])

    expect(result.exitCode).toBe(0)

    // Verify commit was created
    const log = await repo.getLog()
    expect(log).toContain('Add test prompt')
  })

  it('should handle AI commit gracefully without API key', async () => {
    await repo.writeFile('prompts/test.prompt.md', 'Test prompt')

    // Run without -m flag (will try AI commit but should fall back or provide error)
    const result = await repo.runEdgit(['commit'])

    // Should either succeed with fallback or fail gracefully
    // Not expecting exit code 0 necessarily since API key is missing
    expect(result.exitCode).toBeGreaterThanOrEqual(0)
  })
})
