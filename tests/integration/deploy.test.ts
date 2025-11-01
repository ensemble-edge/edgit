import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TestGitRepo } from '../helpers/git-test-repo.js'

describe('edgit deploy', () => {
  let repo: TestGitRepo

  beforeEach(async () => {
    repo = await TestGitRepo.create()
    await repo.init()
    await repo.runEdgit(['init'])

    // Create a component and version
    await repo.writeFile('prompts/test.prompt.md', 'Test prompt')
    await repo.commit('Add prompt')
    await repo.runEdgit(['tag', 'create', 'test-prompt', 'v1.0.0'])
  })

  afterEach(async () => {
    await repo.cleanup()
  })

  it('should create deployment tag', async () => {
    const result = await repo.runEdgit([
      'deploy',
      'set',
      'test-prompt',
      'v1.0.0',
      '--to',
      'prod',
    ])

    expect(result.exitCode).toBe(0)

    const tags = await repo.listTags()
    expect(tags).toContain('components/test-prompt/prod')
  })

  it('should move deployment tag to new version', async () => {
    // Deploy v1.0.0 to prod
    await repo.runEdgit(['deploy', 'set', 'test-prompt', 'v1.0.0', '--to', 'prod'])

    // Create v2.0.0
    await repo.writeFile('prompts/test.prompt.md', 'Updated prompt')
    await repo.commit('Update prompt')
    await repo.runEdgit(['tag', 'create', 'test-prompt', 'v2.0.0'])

    // Move prod to v2.0.0
    const result = await repo.runEdgit([
      'deploy',
      'set',
      'test-prompt',
      'v2.0.0',
      '--to',
      'prod',
    ])

    expect(result.exitCode).toBe(0)

    // Verify prod now points to v2.0.0
    const prodSha = await repo.getTagSha('components/test-prompt/prod')
    const v2Sha = await repo.getTagSha('components/test-prompt/v2.0.0')
    expect(prodSha).toBe(v2Sha)
  })

  it('should show deployment status', async () => {
    await repo.runEdgit(['deploy', 'set', 'test-prompt', 'v1.0.0', '--to', 'prod'])
    await repo.runEdgit(['deploy', 'set', 'test-prompt', 'v1.0.0', '--to', 'staging'])

    const result = await repo.runEdgit(['deploy', 'status', 'test-prompt'])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('prod')
    expect(result.stdout).toContain('staging')
  })
})
