import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TestGitRepo } from '../helpers/git-test-repo.js'

describe('edgit tag', () => {
  let repo: TestGitRepo

  beforeEach(async () => {
    repo = await TestGitRepo.create()
    await repo.init()
    await repo.runEdgit(['init'])

    // Create a sample component
    await repo.writeFile('prompts/test.prompt.md', 'Test prompt content')
    await repo.commit('Add test prompt')
  })

  afterEach(async () => {
    await repo.cleanup()
  })

  it('should create version tag for component', async () => {
    const result = await repo.runEdgit(['tag', 'create', 'test-prompt', 'v1.0.0'])

    expect(result.exitCode).toBe(0)

    const tags = await repo.listTags()
    expect(tags).toContain('components/test-prompt/v1.0.0')
  })

  it('should fail if version tag already exists', async () => {
    // Create the tag first time
    await repo.runEdgit(['tag', 'create', 'test-prompt', 'v1.0.0'])

    // Try to create same tag again
    const result = await repo.runEdgit(['tag', 'create', 'test-prompt', 'v1.0.0'])

    expect(result.exitCode).not.toBe(0)
    expect(result.stderr.toLowerCase()).toMatch(/already|exists|duplicate/)
  })

  it('should create multiple version tags for same component', async () => {
    await repo.runEdgit(['tag', 'create', 'test-prompt', 'v1.0.0'])

    // Make a change
    await repo.writeFile('prompts/test.prompt.md', 'Updated test prompt')
    await repo.commit('Update prompt')

    // Create v2.0.0
    const result = await repo.runEdgit(['tag', 'create', 'test-prompt', 'v2.0.0'])

    expect(result.exitCode).toBe(0)

    const tags = await repo.listTags()
    expect(tags).toContain('components/test-prompt/v1.0.0')
    expect(tags).toContain('components/test-prompt/v2.0.0')
  })

  it('should list tags for a component', async () => {
    await repo.runEdgit(['tag', 'create', 'test-prompt', 'v1.0.0'])
    await repo.writeFile('prompts/test.prompt.md', 'Updated')
    await repo.commit('Update')
    await repo.runEdgit(['tag', 'create', 'test-prompt', 'v1.1.0'])

    const result = await repo.runEdgit(['tag', 'list', 'test-prompt'])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('v1.0.0')
    expect(result.stdout).toContain('v1.1.0')
  })
})
