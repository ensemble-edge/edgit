import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TestGitRepo } from '../helpers/git-test-repo.js'

describe('edgit components', () => {
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
    await repo.writeFile('prompts/helper.prompt.md', 'You are a helpful assistant')
    await repo.commit('Add prompt')

    const result = await repo.runEdgit(['components', 'list'])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('helper-prompt')
  })

  it('should detect agent components', async () => {
    await repo.writeFile('agents/processor.agent.ts', '// Agent code\nexport {}')
    await repo.commit('Add agent')

    const result = await repo.runEdgit(['components', 'list'])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('processor-agent')
  })

  it('should detect SQL components', async () => {
    await repo.writeFile('queries/users.sql', 'SELECT * FROM users;')
    await repo.commit('Add query')

    const result = await repo.runEdgit(['components', 'list'])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('users')
  })

  it('should detect config components', async () => {
    await repo.writeFile('configs/app.config.json', '{"setting": "value"}')
    await repo.commit('Add config')

    const result = await repo.runEdgit(['components', 'list'])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('app-config')
  })

  it('should show component details', async () => {
    await repo.writeFile('prompts/test.prompt.md', 'Test')
    await repo.commit('Add prompt')
    await repo.runEdgit(['tag', 'create', 'test-prompt', 'v1.0.0'])

    const result = await repo.runEdgit(['components', 'show', 'test-prompt'])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('test-prompt')
    expect(result.stdout).toContain('v1.0.0')
  })
})
