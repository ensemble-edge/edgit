import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { InteractivePrompt, createPrompt } from '../../../src/utils/prompt.js'

describe('InteractivePrompt', () => {
  const originalEnv = process.env.CI

  beforeEach(() => {
    // Reset CI env for each test
    delete process.env.CI
  })

  afterEach(() => {
    // Restore original CI value
    if (originalEnv !== undefined) {
      process.env.CI = originalEnv
    } else {
      delete process.env.CI
    }
  })

  describe('constructor', () => {
    it('should be interactive by default when not in CI', () => {
      delete process.env.CI
      const prompt = new InteractivePrompt()
      expect(prompt.isInteractive()).toBe(true)
    })

    it('should not be interactive when CI env is set', () => {
      process.env.CI = 'true'
      const prompt = new InteractivePrompt()
      expect(prompt.isInteractive()).toBe(false)
    })

    it('should respect explicit interactive=false', () => {
      delete process.env.CI
      const prompt = new InteractivePrompt(false)
      expect(prompt.isInteractive()).toBe(false)
    })
  })

  describe('non-interactive mode', () => {
    let prompt: InteractivePrompt

    beforeEach(() => {
      prompt = new InteractivePrompt(false)
    })

    it('confirm should return default value', async () => {
      // Default is false
      expect(await prompt.confirm('Test?')).toBe(false)
      // Can set default to true
      expect(await prompt.confirm('Test?', true)).toBe(true)
    })

    it('input should return default value', async () => {
      expect(await prompt.input('Name:')).toBe('')
      expect(await prompt.input('Name:', { default: 'test' })).toBe('test')
    })

    it('select should return first choice when no default', async () => {
      const choices = ['apple', 'banana', 'cherry']
      expect(await prompt.select('Pick:', choices)).toBe('apple')
    })

    it('select should return default choice when specified', async () => {
      const choices = ['apple', 'banana', 'cherry']
      expect(await prompt.select('Pick:', choices, { defaultIndex: 2 })).toBe('banana')
    })

    it('select should throw when choices array is empty', async () => {
      await expect(prompt.select('Pick:', [])).rejects.toThrow('No choices available')
    })
  })

  describe('createPrompt', () => {
    it('should create interactive prompt by default', () => {
      delete process.env.CI
      const prompt = createPrompt()
      expect(prompt.isInteractive()).toBe(true)
    })

    it('should create non-interactive prompt when specified', () => {
      const prompt = createPrompt(false)
      expect(prompt.isInteractive()).toBe(false)
    })
  })
})
