import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GitTagManagerResult, createGitTagManagerWithResult } from '../../../src/utils/git-tags.js'
import { GitWrapper } from '../../../src/utils/git.js'

describe('GitTagManagerResult', () => {
  let mockGit: GitWrapper
  let tagManager: GitTagManagerResult

  beforeEach(() => {
    mockGit = {
      exec: vi.fn(),
    } as unknown as GitWrapper
    tagManager = createGitTagManagerWithResult(mockGit)
  })

  describe('createVersionTag', () => {
    it('should return ok result for successful tag creation', async () => {
      vi.mocked(mockGit.exec)
        .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // exists check
        .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // create

      const result = await tagManager.createVersionTag('components', 'prompt', 'extraction', 'v1.0.0')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe('components/prompts/extraction/v1.0.0')
      }
    })

    it('should return error for existing version tag', async () => {
      vi.mocked(mockGit.exec).mockResolvedValueOnce({
        exitCode: 0,
        stdout: 'components/prompts/extraction/v1.0.0',
        stderr: '',
      })

      const result = await tagManager.createVersionTag('components', 'prompt', 'extraction', 'v1.0.0')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.kind).toBe('tag_exists')
      }
    })

    it('should return error for invalid version', async () => {
      const result = await tagManager.createVersionTag('components', 'prompt', 'extraction', 'invalid')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.kind).toBe('invalid_version')
      }
    })
  })

  describe('setEnvironmentTag', () => {
    it('should return ok result for successful tag creation', async () => {
      vi.mocked(mockGit.exec)
        .mockResolvedValueOnce({ exitCode: 0, stdout: 'abc123', stderr: '' }) // resolve ref
        .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // delete existing
        .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // create

      const result = await tagManager.setEnvironmentTag('components', 'prompt', 'extraction', 'staging')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe('components/prompts/extraction/staging')
      }
    })

    it('should return error for version-like environment', async () => {
      const result = await tagManager.setEnvironmentTag('components', 'prompt', 'extraction', 'v1.0.0')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.kind).toBe('invalid_version')
      }
    })
  })

  describe('getTagSHA', () => {
    it('should return ok result with SHA', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout: 'abc123def456',
        stderr: '',
      })

      const result = await tagManager.getTagSHA('components', 'prompt', 'extraction', 'v1.0.0')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe('abc123def456')
      }
    })

    it('should return error for non-existent tag', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 1,
        stdout: '',
        stderr: 'not found',
      })

      const result = await tagManager.getTagSHA('components', 'prompt', 'extraction', 'v99.0.0')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.kind).toBe('tag_not_found')
      }
    })
  })

  describe('getTagInfo', () => {
    it('should return ok result with tag info', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout: 'abc123|2024-01-15|Release v1.0.0|Test Author',
        stderr: '',
      })

      const result = await tagManager.getTagInfo('components/prompts/extraction/v1.0.0')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.sha).toBe('abc123')
        expect(result.value.author).toBe('Test Author')
      }
    })

    it('should return error for non-existent tag', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: '',
      })

      const result = await tagManager.getTagInfo('components/prompts/extraction/v99.0.0')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.kind).toBe('tag_not_found')
      }
    })
  })

  describe('resolveRefToSHA', () => {
    it('should return ok result for valid ref', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout: 'abc123def456',
        stderr: '',
      })

      const result = await tagManager.resolveRefToSHA('HEAD')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe('abc123def456')
      }
    })

    it('should return error for invalid ref', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 1,
        stdout: '',
        stderr: 'bad revision',
      })

      const result = await tagManager.resolveRefToSHA('invalid')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.kind).toBe('invalid_ref')
      }
    })
  })

  describe('getFileAtTag', () => {
    it('should return ok result with file content', async () => {
      vi.mocked(mockGit.exec)
        .mockResolvedValueOnce({ exitCode: 0, stdout: 'abc123', stderr: '' }) // getTagSHA
        .mockResolvedValueOnce({ exitCode: 0, stdout: 'File content here', stderr: '' }) // show file

      const result = await tagManager.getFileAtTag(
        'components',
        'prompt',
        'extraction',
        'v1.0.0',
        'prompts/test.md'
      )

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe('File content here')
      }
    })

    it('should return error for non-existent file', async () => {
      vi.mocked(mockGit.exec)
        .mockResolvedValueOnce({ exitCode: 0, stdout: 'abc123', stderr: '' })
        .mockResolvedValueOnce({ exitCode: 1, stdout: '', stderr: 'path not found' })

      const result = await tagManager.getFileAtTag(
        'components',
        'prompt',
        'extraction',
        'v1.0.0',
        'nonexistent.md'
      )

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.kind).toBe('file_not_found')
      }
    })
  })

  describe('deleteTag', () => {
    it('should return ok result for successful deletion', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: '',
      })

      const result = await tagManager.deleteTag('components', 'prompt', 'extraction', 'v1.0.0')

      expect(result.ok).toBe(true)
    })

    it('should return error for non-existent tag', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 1,
        stdout: '',
        stderr: 'tag not found',
      })

      const result = await tagManager.deleteTag('components', 'prompt', 'extraction', 'v99.0.0')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.kind).toBe('tag_not_found')
      }
    })
  })

  describe('underlying getter', () => {
    it('should return the underlying GitTagManager', () => {
      const underlying = tagManager.underlying

      expect(underlying).toBeDefined()
      expect(underlying.constructor.name).toBe('GitTagManager')
    })
  })

  describe('passthrough methods', () => {
    it('tagExists should work', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout: 'components/prompts/extraction/v1.0.0',
        stderr: '',
      })

      const exists = await tagManager.tagExists('components', 'prompt', 'extraction', 'v1.0.0')

      expect(exists).toBe(true)
    })

    it('isVersionSlot should work', () => {
      expect(tagManager.isVersionSlot('v1.0.0')).toBe(true)
      expect(tagManager.isVersionSlot('staging')).toBe(false)
    })

    it('buildTagPath should work', () => {
      expect(tagManager.buildTagPath('components', 'prompt', 'extraction', 'v1.0.0')).toBe(
        'components/prompts/extraction/v1.0.0'
      )
    })
  })
})
