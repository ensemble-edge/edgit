import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TestGitRepo } from '../helpers/git-test-repo.js'

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
  })

  it('should create empty components registry', async () => {
    await repo.runEdgit(['init'])

    const registry = await repo.readJSON<any>('.edgit/components.json')
    expect(registry.components).toBeDefined()
    expect(typeof registry.components).toBe('object')
  })
})
