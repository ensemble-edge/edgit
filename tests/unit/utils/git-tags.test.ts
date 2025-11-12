import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GitTagManager } from '../../../src/utils/git-tags.js'
import type { GitWrapper } from '../../../src/utils/git.js'

/**
 * Unit tests for GitTagManager focusing on:
 * - Tag name generation (namespace formatting)
 * - Semantic version sorting logic
 * - Version tag pattern matching
 * - Deployment tag filtering
 */
describe('GitTagManager', () => {
  let mockGit: GitWrapper
  let tagManager: GitTagManager

  beforeEach(() => {
    // Create a mock GitWrapper with spy methods
    mockGit = {
      exec: vi.fn(),
      getStatus: vi.fn(),
      getChangedFiles: vi.fn(),
    } as any

    tagManager = new GitTagManager(mockGit)
  })

  describe('tagComponent - namespace formatting', () => {
    it('should format component tags with namespace prefix', async () => {
      // Mock successful tag creation
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: '',
      })

      const result = await tagManager.tagComponent('my-prompt', 'v1.0.0')

      expect(result).toBe('components/my-prompt/v1.0.0')
      expect(mockGit.exec).toHaveBeenCalledWith(
        expect.arrayContaining(['tag', '-a', 'components/my-prompt/v1.0.0'])
      )
    })

    it('should handle multi-word component names', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: '',
      })

      const result = await tagManager.tagComponent('chat-system-prompt', 'v2.1.0')

      expect(result).toBe('components/chat-system-prompt/v2.1.0')
    })

    it('should handle deployment environment tags', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: '',
      })

      const result = await tagManager.tagComponent('api-agent', 'prod')

      expect(result).toBe('components/api-agent/prod')
    })

    it('should handle various tag formats', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: '',
      })

      const testCases = [
        { component: 'prompt', tag: 'v1.0.0', expected: 'components/prompt/v1.0.0' },
        { component: 'agent', tag: 'staging', expected: 'components/agent/staging' },
        { component: 'sql-query', tag: 'latest', expected: 'components/sql-query/latest' },
        { component: 'config', tag: 'v0.1.0-beta', expected: 'components/config/v0.1.0-beta' },
      ]

      for (const { component, tag, expected } of testCases) {
        const result = await tagManager.tagComponent(component, tag)
        expect(result).toBe(expected)
      }
    })

    it('should include custom message in tag creation', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: '',
      })

      await tagManager.tagComponent('my-prompt', 'v1.0.0', undefined, 'Custom release message')

      expect(mockGit.exec).toHaveBeenCalledWith(
        expect.arrayContaining(['-m', 'Custom release message'])
      )
    })

    it('should use default message format', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: '',
      })

      await tagManager.tagComponent('my-prompt', 'v1.0.0')

      expect(mockGit.exec).toHaveBeenCalledWith(
        expect.arrayContaining(['-m', 'Tag component my-prompt as v1.0.0'])
      )
    })

    it('should tag specific SHA when provided', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: '',
      })

      await tagManager.tagComponent('my-prompt', 'v1.0.0', 'abc123')

      expect(mockGit.exec).toHaveBeenCalledWith(
        expect.arrayContaining(['tag', '-a', 'components/my-prompt/v1.0.0', 'abc123'])
      )
    })

    it('should default to HEAD when no SHA provided', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: '',
      })

      await tagManager.tagComponent('my-prompt', 'v1.0.0')

      expect(mockGit.exec).toHaveBeenCalledWith(
        expect.arrayContaining(['tag', '-a', 'components/my-prompt/v1.0.0', 'HEAD'])
      )
    })

    it('should throw error on tag creation failure', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 1,
        stdout: '',
        stderr: 'Tag already exists',
      })

      await expect(tagManager.tagComponent('my-prompt', 'v1.0.0')).rejects.toThrow(
        'Failed to create tag'
      )
    })
  })

  describe('listComponentTags - namespace parsing', () => {
    it('should strip namespace prefix from tag list', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout: 'components/my-prompt/v1.0.0\ncomponents/my-prompt/v1.1.0\ncomponents/my-prompt/prod',
        stderr: '',
      })

      const tags = await tagManager.listComponentTags('my-prompt')

      expect(tags).toEqual(['v1.0.0', 'v1.1.0', 'prod'])
    })

    it('should handle empty tag list', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: '',
      })

      const tags = await tagManager.listComponentTags('my-prompt')

      expect(tags).toEqual([])
    })

    it('should handle component names with hyphens', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout: 'components/chat-system-prompt/v1.0.0\ncomponents/chat-system-prompt/v2.0.0',
        stderr: '',
      })

      const tags = await tagManager.listComponentTags('chat-system-prompt')

      expect(tags).toEqual(['v1.0.0', 'v2.0.0'])
    })

    it('should filter whitespace and empty lines', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout: 'components/my-prompt/v1.0.0\n\n  \ncomponents/my-prompt/v1.1.0\n',
        stderr: '',
      })

      const tags = await tagManager.listComponentTags('my-prompt')

      expect(tags).toEqual(['v1.0.0', 'v1.1.0'])
    })

    it('should return empty array on git error', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 1,
        stdout: '',
        stderr: 'Error',
      })

      const tags = await tagManager.listComponentTags('my-prompt')

      expect(tags).toEqual([])
    })

    it('should query git with correct namespace pattern', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: '',
      })

      await tagManager.listComponentTags('my-component')

      expect(mockGit.exec).toHaveBeenCalledWith(['tag', '-l', 'components/my-component/*'])
    })
  })

  describe('getVersionTags - semantic version sorting', () => {
    it('should filter and sort semantic version tags', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout:
          'components/my-prompt/v2.0.0\ncomponents/my-prompt/v1.0.0\ncomponents/my-prompt/prod\ncomponents/my-prompt/v1.5.0',
        stderr: '',
      })

      const versions = await tagManager.getVersionTags('my-prompt')

      expect(versions).toEqual(['v1.0.0', 'v1.5.0', 'v2.0.0'])
    })

    it('should sort versions numerically, not alphabetically', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout:
          'components/my-prompt/v10.0.0\ncomponents/my-prompt/v2.0.0\ncomponents/my-prompt/v1.0.0',
        stderr: '',
      })

      const versions = await tagManager.getVersionTags('my-prompt')

      expect(versions).toEqual(['v1.0.0', 'v2.0.0', 'v10.0.0'])
    })

    it('should handle versions with and without v prefix', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout: 'components/my-prompt/v1.0.0\ncomponents/my-prompt/2.0.0\ncomponents/my-prompt/v1.5.0',
        stderr: '',
      })

      const versions = await tagManager.getVersionTags('my-prompt')

      expect(versions).toEqual(['v1.0.0', 'v1.5.0', '2.0.0'])
    })

    it('should compare major version first', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout:
          'components/my-prompt/v2.0.0\ncomponents/my-prompt/v1.9.9\ncomponents/my-prompt/v3.0.0',
        stderr: '',
      })

      const versions = await tagManager.getVersionTags('my-prompt')

      expect(versions).toEqual(['v1.9.9', 'v2.0.0', 'v3.0.0'])
    })

    it('should compare minor version when major is equal', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout:
          'components/my-prompt/v1.10.0\ncomponents/my-prompt/v1.2.0\ncomponents/my-prompt/v1.5.0',
        stderr: '',
      })

      const versions = await tagManager.getVersionTags('my-prompt')

      expect(versions).toEqual(['v1.2.0', 'v1.5.0', 'v1.10.0'])
    })

    it('should compare patch version when major and minor are equal', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout:
          'components/my-prompt/v1.0.10\ncomponents/my-prompt/v1.0.2\ncomponents/my-prompt/v1.0.5',
        stderr: '',
      })

      const versions = await tagManager.getVersionTags('my-prompt')

      expect(versions).toEqual(['v1.0.2', 'v1.0.5', 'v1.0.10'])
    })

    it('should filter out non-semantic version tags', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout:
          'components/my-prompt/v1.0.0\ncomponents/my-prompt/prod\ncomponents/my-prompt/staging\ncomponents/my-prompt/v2.0.0\ncomponents/my-prompt/latest',
        stderr: '',
      })

      const versions = await tagManager.getVersionTags('my-prompt')

      expect(versions).toEqual(['v1.0.0', 'v2.0.0'])
    })

    it('should handle versions with pre-release tags', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout:
          'components/my-prompt/v1.0.0-beta\ncomponents/my-prompt/v1.0.0\ncomponents/my-prompt/v1.0.0-alpha',
        stderr: '',
      })

      const versions = await tagManager.getVersionTags('my-prompt')

      // All should be included (they all match the semver pattern)
      expect(versions.length).toBe(3)
    })

    it('should handle empty version list', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout: 'components/my-prompt/prod\ncomponents/my-prompt/staging',
        stderr: '',
      })

      const versions = await tagManager.getVersionTags('my-prompt')

      expect(versions).toEqual([])
    })

    it('should handle complex version sorting', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout:
          'components/my-prompt/v10.2.1\ncomponents/my-prompt/v2.10.1\ncomponents/my-prompt/v2.2.10\ncomponents/my-prompt/v1.0.0',
        stderr: '',
      })

      const versions = await tagManager.getVersionTags('my-prompt')

      expect(versions).toEqual(['v1.0.0', 'v2.2.10', 'v2.10.1', 'v10.2.1'])
    })
  })

  describe('getDeploymentTags - environment filtering', () => {
    it('should filter standard deployment tags', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout:
          'components/my-prompt/v1.0.0\ncomponents/my-prompt/prod\ncomponents/my-prompt/staging\ncomponents/my-prompt/v2.0.0',
        stderr: '',
      })

      const deployTags = await tagManager.getDeploymentTags('my-prompt')

      expect(deployTags).toEqual(['prod', 'staging'])
    })

    it('should recognize all standard deployment environments', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout:
          'components/my-prompt/prod\ncomponents/my-prompt/staging\ncomponents/my-prompt/canary\ncomponents/my-prompt/latest\ncomponents/my-prompt/dev',
        stderr: '',
      })

      const deployTags = await tagManager.getDeploymentTags('my-prompt')

      expect(deployTags.sort()).toEqual(['canary', 'dev', 'latest', 'prod', 'staging'])
    })

    it('should exclude version tags', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout:
          'components/my-prompt/v1.0.0\ncomponents/my-prompt/prod\ncomponents/my-prompt/v2.0.0',
        stderr: '',
      })

      const deployTags = await tagManager.getDeploymentTags('my-prompt')

      expect(deployTags).not.toContain('v1.0.0')
      expect(deployTags).not.toContain('v2.0.0')
    })

    it('should exclude custom non-deployment tags', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout:
          'components/my-prompt/prod\ncomponents/my-prompt/custom-tag\ncomponents/my-prompt/my-feature',
        stderr: '',
      })

      const deployTags = await tagManager.getDeploymentTags('my-prompt')

      expect(deployTags).toEqual(['prod'])
    })

    it('should handle empty deployment list', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout: 'components/my-prompt/v1.0.0\ncomponents/my-prompt/v2.0.0',
        stderr: '',
      })

      const deployTags = await tagManager.getDeploymentTags('my-prompt')

      expect(deployTags).toEqual([])
    })

    it('should handle no tags at all', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: '',
      })

      const deployTags = await tagManager.getDeploymentTags('my-prompt')

      expect(deployTags).toEqual([])
    })
  })

  describe('tagExists', () => {
    it('should return true when tag exists', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout: 'abc123def456',
        stderr: '',
      })

      const exists = await tagManager.tagExists('my-prompt', 'v1.0.0')

      expect(exists).toBe(true)
    })

    it('should return false when tag does not exist', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 1,
        stdout: '',
        stderr: 'Tag not found',
      })

      const exists = await tagManager.tagExists('my-prompt', 'v1.0.0')

      expect(exists).toBe(false)
    })
  })

  describe('createVersionTag', () => {
    it('should prevent overwriting existing version tags', async () => {
      // First call checks if tag exists
      vi.mocked(mockGit.exec)
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: 'abc123',
          stderr: '',
        })
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: '',
          stderr: '',
        })

      await expect(tagManager.createVersionTag('my-prompt', 'v1.0.0')).rejects.toThrow(
        'Version tag v1.0.0 already exists'
      )
    })

    it('should create version tag when it does not exist', async () => {
      // First call checks if tag exists (returns false)
      // Second call creates the tag
      vi.mocked(mockGit.exec)
        .mockResolvedValueOnce({
          exitCode: 1,
          stdout: '',
          stderr: 'Not found',
        })
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: '',
          stderr: '',
        })

      const result = await tagManager.createVersionTag('my-prompt', 'v1.0.0')

      expect(result).toBe('components/my-prompt/v1.0.0')
    })

    it('should use release message format', async () => {
      vi.mocked(mockGit.exec)
        .mockResolvedValueOnce({
          exitCode: 1,
          stdout: '',
          stderr: '',
        })
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: '',
          stderr: '',
        })

      await tagManager.createVersionTag('my-prompt', 'v1.0.0')

      expect(mockGit.exec).toHaveBeenLastCalledWith(
        expect.arrayContaining(['-m', 'Release component my-prompt v1.0.0'])
      )
    })
  })

  describe('moveDeploymentTag', () => {
    it('should format deployment tag correctly', async () => {
      // First call resolves the target ref
      // Second call moves the tag
      vi.mocked(mockGit.exec)
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: 'abc123def456',
          stderr: '',
        })
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: '',
          stderr: '',
        })

      const result = await tagManager.moveDeploymentTag('my-prompt', 'prod', 'v1.0.0')

      expect(result).toBe('components/my-prompt/prod')
    })

    it('should use force flag for deployment tags', async () => {
      vi.mocked(mockGit.exec)
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: 'abc123',
          stderr: '',
        })
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: '',
          stderr: '',
        })

      await tagManager.moveDeploymentTag('my-prompt', 'prod', 'v1.0.0')

      expect(mockGit.exec).toHaveBeenLastCalledWith(expect.arrayContaining(['-f']))
    })

    it('should use deploy message format', async () => {
      vi.mocked(mockGit.exec)
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: 'abc123',
          stderr: '',
        })
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: '',
          stderr: '',
        })

      await tagManager.moveDeploymentTag('my-prompt', 'prod', 'v1.0.0')

      expect(mockGit.exec).toHaveBeenLastCalledWith(
        expect.arrayContaining(['-m', 'Deploy component my-prompt to prod'])
      )
    })
  })

  describe('resolveRef', () => {
    it('should resolve SHA-like strings directly', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout: 'abc123def456',
        stderr: '',
      })

      const sha = await tagManager.resolveRef('my-prompt', 'abc123')

      expect(sha).toBe('abc123def456')
    })

    it('should resolve short SHAs', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 0,
        stdout: 'abc123def456789',
        stderr: '',
      })

      const sha = await tagManager.resolveRef('my-prompt', 'abc123')

      expect(sha).toBe('abc123def456789')
    })

    it('should throw error for unresolvable refs', async () => {
      vi.mocked(mockGit.exec).mockResolvedValue({
        exitCode: 1,
        stdout: '',
        stderr: 'Not found',
      })

      await expect(tagManager.resolveRef('my-prompt', 'invalid')).rejects.toThrow(
        'Could not resolve reference'
      )
    })
  })
})
