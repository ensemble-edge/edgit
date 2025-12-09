import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GitTagManager } from '../../../src/utils/git-tags.js'
import type { GitWrapper } from '../../../src/utils/git.js'

describe('GitTagManager', () => {
  let mockGit: GitWrapper
  let tagManager: GitTagManager

  beforeEach(() => {
    mockGit = {
      exec: vi.fn(),
    } as unknown as GitWrapper
    tagManager = new GitTagManager(mockGit)
  })

  describe('getNamespace', () => {
    it('should pluralize entity types correctly', () => {
      expect(tagManager.getNamespace('prompt')).toBe('prompts')
      expect(tagManager.getNamespace('agent')).toBe('agents')
      expect(tagManager.getNamespace('schema')).toBe('schemas')
      expect(tagManager.getNamespace('query')).toBe('queries')
      expect(tagManager.getNamespace('config')).toBe('configs')
    })
  })

  describe('isVersionSlot', () => {
    it('should recognize valid version formats', () => {
      expect(tagManager.isVersionSlot('v1.0.0')).toBe(true)
      expect(tagManager.isVersionSlot('v10.20.30')).toBe(true)
      expect(tagManager.isVersionSlot('v1.0.0-beta')).toBe(true)
      expect(tagManager.isVersionSlot('v1.0.0-alpha.1')).toBe(true)
    })

    it('should reject invalid version formats', () => {
      expect(tagManager.isVersionSlot('1.0.0')).toBe(false)
      expect(tagManager.isVersionSlot('staging')).toBe(false)
      expect(tagManager.isVersionSlot('production')).toBe(false)
      expect(tagManager.isVersionSlot('main')).toBe(false)
    })
  })

  describe('buildTagPath', () => {
    it('should build 4-level tag paths', () => {
      expect(tagManager.buildTagPath('components', 'prompt', 'extraction', 'v1.0.0')).toBe(
        'components/prompts/extraction/v1.0.0'
      )
      expect(tagManager.buildTagPath('logic', 'agent', 'classifier', 'staging')).toBe(
        'logic/agents/classifier/staging'
      )
    })
  })

  describe('parseTagPath', () => {
    it('should parse valid 4-level tags', () => {
      const parsed = tagManager.parseTagPath('components/prompts/extraction/v1.0.0')
      expect(parsed).toEqual({
        prefix: 'components',
        type: 'prompts',
        name: 'extraction',
        slot: 'v1.0.0',
        slotType: 'version',
        fullTag: 'components/prompts/extraction/v1.0.0',
      })
    })

    it('should return null for invalid tags', () => {
      expect(tagManager.parseTagPath('invalid')).toBeNull()
      expect(tagManager.parseTagPath('only/three/parts')).toBeNull()
      expect(tagManager.parseTagPath('invalid/prefix/name/slot')).toBeNull()
    })
  })

  describe('createVersionTag', () => {
    it('should create version tag when it does not exist', async () => {
      vi.mocked(mockGit.exec)
        .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // tagExistsByPath check
        .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // tag creation

      const result = await tagManager.createVersionTag('components', 'prompt', 'extraction', 'v1.0.0')

      expect(result).toBe('components/prompts/extraction/v1.0.0')
      expect(mockGit.exec).toHaveBeenCalledWith(
        expect.arrayContaining(['tag', '-a', 'components/prompts/extraction/v1.0.0'])
      )
    })

    it('should reject existing version tags', async () => {
      vi.mocked(mockGit.exec).mockResolvedValueOnce({
        exitCode: 0,
        stdout: 'components/prompts/extraction/v1.0.0',
        stderr: '',
      })

      await expect(
        tagManager.createVersionTag('components', 'prompt', 'extraction', 'v1.0.0')
      ).rejects.toThrow('already exists')
    })

    it('should reject invalid version format', async () => {
      await expect(
        tagManager.createVersionTag('components', 'prompt', 'extraction', 'invalid')
      ).rejects.toThrow('Invalid semver version')
    })

    it('should use release message format', async () => {
      vi.mocked(mockGit.exec)
        .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' })
        .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' })

      await tagManager.createVersionTag('components', 'prompt', 'extraction', 'v1.0.0')

      expect(mockGit.exec).toHaveBeenLastCalledWith(
        expect.arrayContaining(['-m', 'Release prompt extraction v1.0.0'])
      )
    })
  })

  describe('setEnvironmentTag', () => {
    it('should create environment tag', async () => {
      vi.mocked(mockGit.exec)
        .mockResolvedValueOnce({ exitCode: 0, stdout: 'abc123', stderr: '' }) // resolveRefToSHA
        .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // delete existing
        .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // create tag

      const result = await tagManager.setEnvironmentTag('components', 'prompt', 'extraction', 'staging')

      expect(result).toBe('components/prompts/extraction/staging')
    })

    it('should reject version-like environment names', async () => {
      await expect(
        tagManager.setEnvironmentTag('components', 'prompt', 'extraction', 'v1.0.0')
      ).rejects.toThrow('looks like a version')
    })
  })

  describe('tagExists', () => {
    it('should return true when tag exists', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout: 'components/prompts/extraction/v1.0.0',
        stderr: '',
      })

      const exists = await tagManager.tagExists('components', 'prompt', 'extraction', 'v1.0.0')
      expect(exists).toBe(true)
    })

    it('should return false when tag does not exist', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: '',
      })

      const exists = await tagManager.tagExists('components', 'prompt', 'extraction', 'v1.0.0')
      expect(exists).toBe(false)
    })
  })

  describe('getTagSHA', () => {
    it('should return SHA for existing tag', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout: 'abc123def456',
        stderr: '',
      })

      const sha = await tagManager.getTagSHA('components', 'prompt', 'extraction', 'v1.0.0')
      expect(sha).toBe('abc123def456')
    })

    it('should throw for non-existent tag', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 1,
        stdout: '',
        stderr: 'not found',
      })

      await expect(
        tagManager.getTagSHA('components', 'prompt', 'extraction', 'v99.0.0')
      ).rejects.toThrow('Tag not found')
    })
  })

  describe('deleteTag', () => {
    it('should delete existing tag', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: '',
      })

      await expect(
        tagManager.deleteTag('components', 'prompt', 'extraction', 'v1.0.0')
      ).resolves.toBeUndefined()
    })

    it('should throw for non-existent tag', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 1,
        stdout: '',
        stderr: 'tag not found',
      })

      await expect(
        tagManager.deleteTag('components', 'prompt', 'extraction', 'v99.0.0')
      ).rejects.toThrow('Failed to delete tag')
    })
  })

  describe('resolveRefToSHA', () => {
    it('should resolve valid ref', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout: 'abc123def456',
        stderr: '',
      })

      const sha = await tagManager.resolveRefToSHA('HEAD')
      expect(sha).toBe('abc123def456')
    })

    it('should throw for invalid ref', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 1,
        stdout: '',
        stderr: 'bad revision',
      })

      await expect(tagManager.resolveRefToSHA('invalid')).rejects.toThrow('Invalid ref')
    })
  })

  describe('getVersionTags', () => {
    it('should return sorted version tags', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout: [
          'components/prompts/extraction/v2.0.0|abc|2024-01-02|Release|Author',
          'components/prompts/extraction/v1.0.0|def|2024-01-01|Release|Author',
          'components/prompts/extraction/staging|ghi|2024-01-03|Deploy|Author',
        ].join('\n'),
        stderr: '',
      })

      const tags = await tagManager.getVersionTags('components', 'prompt', 'extraction')

      expect(tags.map((t) => t.slot)).toEqual(['v1.0.0', 'v2.0.0'])
    })
  })

  describe('getEnvironmentTags', () => {
    it('should return only environment tags', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout: [
          'components/prompts/extraction/v1.0.0|abc|2024-01-01|Release|Author',
          'components/prompts/extraction/staging|def|2024-01-02|Deploy|Author',
          'components/prompts/extraction/production|ghi|2024-01-03|Deploy|Author',
        ].join('\n'),
        stderr: '',
      })

      const tags = await tagManager.getEnvironmentTags('components', 'prompt', 'extraction')

      expect(tags.map((t) => t.slot)).toEqual(['staging', 'production'])
    })
  })
})
