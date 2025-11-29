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

  describe('createTag', () => {
    it('should return ok result for successful tag creation', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        stdout: '',
        stderr: '',
        exitCode: 0,
      })

      const result = await tagManager.createTag('my-prompt', 'v1.0.0', 'prompt')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe('prompts/my-prompt/v1.0.0')
      }
    })

    it('should return error result for tag that already exists', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        stdout: '',
        stderr: 'fatal: tag already exists',
        exitCode: 1,
      })

      const result = await tagManager.createTag('my-prompt', 'v1.0.0', 'prompt')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.kind).toBe('tag_exists')
      }
    })
  })

  describe('createVersionTag', () => {
    it('should return error for existing version tag', async () => {
      // First call checks if tag exists (returns 0 meaning it exists)
      vi.mocked(mockGit.exec).mockResolvedValueOnce({
        stdout: 'abc123',
        stderr: '',
        exitCode: 0,
      })

      const result = await tagManager.createVersionTag('my-prompt', 'v1.0.0', 'prompt')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.kind).toBe('tag_exists')
        expect(result.error.tag).toBe('v1.0.0')
      }
    })
  })

  describe('getTagSHA', () => {
    it('should return ok result with SHA for existing tag', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        stdout: 'abc1234567890def',
        stderr: '',
        exitCode: 0,
      })

      const result = await tagManager.getTagSHA('my-prompt', 'v1.0.0', 'prompt')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe('abc1234567890def')
      }
    })

    it('should return error for non-existent tag', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        stdout: '',
        stderr: 'fatal: ambiguous argument',
        exitCode: 128,
      })

      const result = await tagManager.getTagSHA('my-prompt', 'v99.0.0', 'prompt')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.kind).toBe('tag_not_found')
        expect(result.error.tag).toBe('v99.0.0')
      }
    })
  })

  describe('getTagInfo', () => {
    it('should return ok result with tag info', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        stdout: 'abc123|2024-01-15|Release v1.0.0|Test Author',
        stderr: '',
        exitCode: 0,
      })

      const result = await tagManager.getTagInfo('my-prompt', 'v1.0.0', 'prompt')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.tag).toBe('v1.0.0')
        expect(result.value.sha).toBe('abc123')
        expect(result.value.author).toBe('Test Author')
      }
    })

    it('should return error for non-existent tag', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        stdout: '',
        stderr: '',
        exitCode: 0,
      })

      const result = await tagManager.getTagInfo('my-prompt', 'v99.0.0', 'prompt')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.kind).toBe('tag_not_found')
      }
    })
  })

  describe('resolveRef', () => {
    it('should return ok result for valid ref', async () => {
      // SHA resolution
      vi.mocked(mockGit.exec).mockResolvedValue({
        stdout: 'abc1234567890def1234567890abcdef12345678',
        stderr: '',
        exitCode: 0,
      })

      const result = await tagManager.resolveRef('my-prompt', 'abc123', 'prompt')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toMatch(/^[a-f0-9]{40}$/)
      }
    })

    it('should return error for invalid ref', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        stdout: '',
        stderr: 'fatal: bad revision',
        exitCode: 128,
      })

      const result = await tagManager.resolveRef('my-prompt', 'invalid-ref', 'prompt')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.kind).toBe('invalid_ref')
        expect(result.error.ref).toBe('invalid-ref')
      }
    })
  })

  describe('getFileAtTag', () => {
    it('should return ok result with file content', async () => {
      // First call for SHA resolution
      vi.mocked(mockGit.exec).mockResolvedValueOnce({
        stdout: 'abc123',
        stderr: '',
        exitCode: 0,
      })
      // Second call for file content
      vi.mocked(mockGit.exec).mockResolvedValueOnce({
        stdout: 'File content here',
        stderr: '',
        exitCode: 0,
      })

      const result = await tagManager.getFileAtTag(
        'my-prompt',
        'v1.0.0',
        'prompts/test.md',
        'prompt'
      )

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe('File content here')
      }
    })

    it('should return error for non-existent file', async () => {
      // SHA resolution succeeds
      vi.mocked(mockGit.exec).mockResolvedValueOnce({
        stdout: 'abc123',
        stderr: '',
        exitCode: 0,
      })
      // File content fails
      vi.mocked(mockGit.exec).mockResolvedValueOnce({
        stdout: '',
        stderr: 'fatal: path not found',
        exitCode: 128,
      })

      const result = await tagManager.getFileAtTag(
        'my-prompt',
        'v1.0.0',
        'nonexistent.md',
        'prompt'
      )

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.kind).toBe('file_not_found')
        expect(result.error.path).toBe('nonexistent.md')
      }
    })
  })

  describe('deleteTag', () => {
    it('should return ok result for successful deletion', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        stdout: '',
        stderr: '',
        exitCode: 0,
      })

      const result = await tagManager.deleteTag('my-prompt', 'v1.0.0', 'prompt')

      expect(result.ok).toBe(true)
    })

    it('should return error for non-existent tag', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        stdout: '',
        stderr: 'error: tag not found',
        exitCode: 1,
      })

      const result = await tagManager.deleteTag('my-prompt', 'v99.0.0', 'prompt')

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
    it('listTags should work', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        stdout: 'prompts/my-prompt/v1.0.0\nprompts/my-prompt/v1.1.0',
        stderr: '',
        exitCode: 0,
      })

      const tags = await tagManager.listTags('my-prompt', 'prompt')

      expect(tags).toEqual(['v1.0.0', 'v1.1.0'])
    })

    it('tagExists should work', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        stdout: 'abc123',
        stderr: '',
        exitCode: 0,
      })

      const exists = await tagManager.tagExists('my-prompt', 'v1.0.0', 'prompt')

      expect(exists).toBe(true)
    })
  })
})
