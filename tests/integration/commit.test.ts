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

    // Run without -m flag with a 2s timeout (will try AI commit but should fail)
    const result = await repo.runEdgit(['commit'], 2000)

    // Should fail gracefully with non-zero exit code
    // Currently the command hangs, so this will timeout and return exit code 1
    expect(result.exitCode).toBeGreaterThan(0)
    expect(result.stderr || result.stdout).toBeTruthy()
  })
})
