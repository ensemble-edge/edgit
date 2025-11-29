import { describe, it, expect } from 'vitest'
import {
  versionSchema,
  componentNameSchema,
  componentTypeSchema,
  deploymentEnvSchema,
  gitShaSchema,
  validateInput,
  parseComponentSpec,
  isValidVersion,
  isValidComponentName,
  isValidDeploymentEnv,
  tagSpecSchema,
} from '../../../src/validation/schemas.js'

describe('Validation Schemas', () => {
  describe('versionSchema', () => {
    it('should accept valid semantic versions', () => {
      expect(versionSchema.safeParse('1.0.0').success).toBe(true)
      expect(versionSchema.safeParse('v1.0.0').success).toBe(true)
      expect(versionSchema.safeParse('v2.1.3').success).toBe(true)
      expect(versionSchema.safeParse('10.20.30').success).toBe(true)
    })

    it('should accept versions with prerelease suffixes', () => {
      expect(versionSchema.safeParse('v1.0.0-beta').success).toBe(true)
      expect(versionSchema.safeParse('v2.0.0-alpha.1').success).toBe(true)
      expect(versionSchema.safeParse('1.0.0-rc1').success).toBe(true)
    })

    it('should reject invalid versions', () => {
      expect(versionSchema.safeParse('1.0').success).toBe(false)
      expect(versionSchema.safeParse('v1').success).toBe(false)
      expect(versionSchema.safeParse('latest').success).toBe(false)
      expect(versionSchema.safeParse('').success).toBe(false)
    })
  })

  describe('componentNameSchema', () => {
    it('should accept valid component names', () => {
      expect(componentNameSchema.safeParse('my-prompt').success).toBe(true)
      expect(componentNameSchema.safeParse('user_config').success).toBe(true)
      expect(componentNameSchema.safeParse('extraction-agent').success).toBe(true)
      expect(componentNameSchema.safeParse('a').success).toBe(true)
      expect(componentNameSchema.safeParse('a1').success).toBe(true)
    })

    it('should reject invalid component names', () => {
      expect(componentNameSchema.safeParse('').success).toBe(false)
      expect(componentNameSchema.safeParse('My-Prompt').success).toBe(false) // uppercase
      expect(componentNameSchema.safeParse('-start').success).toBe(false) // starts with dash
      expect(componentNameSchema.safeParse('end-').success).toBe(false) // ends with dash
      expect(componentNameSchema.safeParse('has spaces').success).toBe(false)
    })

    it('should reject names that are too long', () => {
      const longName = 'a'.repeat(129)
      expect(componentNameSchema.safeParse(longName).success).toBe(false)
    })
  })

  describe('componentTypeSchema', () => {
    it('should accept valid component types', () => {
      const validTypes = [
        'prompt',
        'template',
        'query',
        'config',
        'script',
        'schema',
        'agent-definition',
        'ensemble',
        'tool',
      ]

      for (const type of validTypes) {
        expect(componentTypeSchema.safeParse(type).success).toBe(true)
      }
    })

    it('should reject invalid component types', () => {
      expect(componentTypeSchema.safeParse('invalid').success).toBe(false)
      expect(componentTypeSchema.safeParse('PROMPT').success).toBe(false)
      expect(componentTypeSchema.safeParse('').success).toBe(false)
    })
  })

  describe('deploymentEnvSchema', () => {
    it('should accept valid deployment environments', () => {
      const validEnvs = ['prod', 'staging', 'canary', 'latest', 'dev', 'test']

      for (const env of validEnvs) {
        expect(deploymentEnvSchema.safeParse(env).success).toBe(true)
      }
    })

    it('should reject invalid deployment environments', () => {
      expect(deploymentEnvSchema.safeParse('production').success).toBe(false)
      expect(deploymentEnvSchema.safeParse('PROD').success).toBe(false)
      expect(deploymentEnvSchema.safeParse('').success).toBe(false)
    })
  })

  describe('gitShaSchema', () => {
    it('should accept valid git SHAs', () => {
      expect(gitShaSchema.safeParse('abc123').success).toBe(true)
      expect(gitShaSchema.safeParse('abcdef1234567890').success).toBe(true)
      expect(gitShaSchema.safeParse('a'.repeat(40)).success).toBe(true)
    })

    it('should reject invalid git SHAs', () => {
      expect(gitShaSchema.safeParse('abc12').success).toBe(false) // too short
      expect(gitShaSchema.safeParse('a'.repeat(41)).success).toBe(false) // too long
      expect(gitShaSchema.safeParse('ghijkl').success).toBe(false) // invalid chars
    })
  })

  describe('tagSpecSchema', () => {
    it('should parse valid tag specifications', () => {
      const result = tagSpecSchema.safeParse('my-prompt@v1.0.0')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.component).toBe('my-prompt')
        expect(result.data.tag).toBe('v1.0.0')
      }
    })

    it('should reject invalid tag specifications', () => {
      expect(tagSpecSchema.safeParse('my-prompt').success).toBe(false) // no @
      expect(tagSpecSchema.safeParse('@v1.0.0').success).toBe(false) // no component
    })
  })
})

describe('Validation Utilities', () => {
  describe('validateInput', () => {
    it('should return ok result for valid input', () => {
      const result = validateInput(versionSchema, 'v1.0.0')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data).toBe('v1.0.0')
      }
    })

    it('should return error result for invalid input', () => {
      const result = validateInput(versionSchema, 'invalid')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toContain('Invalid version')
      }
    })

    it('should include context in error message', () => {
      const result = validateInput(versionSchema, 'invalid', 'Tag creation')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toContain('Tag creation')
      }
    })
  })

  describe('parseComponentSpec', () => {
    it('should parse component name only', () => {
      const result = parseComponentSpec('my-prompt')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.component).toBe('my-prompt')
        expect(result.ref).toBeUndefined()
      }
    })

    it('should parse component@ref format', () => {
      const result = parseComponentSpec('my-prompt@v1.0.0')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.component).toBe('my-prompt')
        expect(result.ref).toBe('v1.0.0')
      }
    })

    it('should parse component@deployment format', () => {
      const result = parseComponentSpec('my-prompt@prod')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.component).toBe('my-prompt')
        expect(result.ref).toBe('prod')
      }
    })

    it('should reject invalid component names', () => {
      const result = parseComponentSpec('Invalid-Name')
      expect(result.ok).toBe(false)
    })
  })

  describe('isValidVersion', () => {
    it('should return true for valid versions', () => {
      expect(isValidVersion('v1.0.0')).toBe(true)
      expect(isValidVersion('1.2.3')).toBe(true)
    })

    it('should return false for invalid versions', () => {
      expect(isValidVersion('latest')).toBe(false)
      expect(isValidVersion('')).toBe(false)
    })
  })

  describe('isValidComponentName', () => {
    it('should return true for valid names', () => {
      expect(isValidComponentName('my-prompt')).toBe(true)
      expect(isValidComponentName('config1')).toBe(true)
    })

    it('should return false for invalid names', () => {
      expect(isValidComponentName('Invalid')).toBe(false)
      expect(isValidComponentName('')).toBe(false)
    })
  })

  describe('isValidDeploymentEnv', () => {
    it('should return true for valid environments', () => {
      expect(isValidDeploymentEnv('prod')).toBe(true)
      expect(isValidDeploymentEnv('staging')).toBe(true)
    })

    it('should return false for invalid environments', () => {
      expect(isValidDeploymentEnv('production')).toBe(false)
      expect(isValidDeploymentEnv('')).toBe(false)
    })
  })
})
