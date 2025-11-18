import { describe, it, expect, beforeEach } from 'vitest'
import { ComponentDetector, DetectionPattern } from '../../../src/utils/component-detector.js'
import type { ComponentType } from '../../../src/models/components.js'

describe('ComponentDetector', () => {
  let detector: ComponentDetector

  beforeEach(() => {
    detector = new ComponentDetector()
  })

  describe('detectComponent', () => {
    describe('prompt detection', () => {
      it('should detect files in prompts/ directory', () => {
        const result = detector.detectComponent('prompts/helper.md')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('prompt')
        expect(result?.name).toBe('helper-prompt')
      })

      it('should detect files with .prompt extension', () => {
        const result = detector.detectComponent('system/chat.prompt.md')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('prompt')
      })

      it('should detect files in templates/ directory', () => {
        const result = detector.detectComponent('templates/email.html')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('template')
      })

      it('should detect files in instructions/ directory', () => {
        const result = detector.detectComponent('instructions/setup.md')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('prompt')
      })

      it('should detect files starting with prompt', () => {
        const result = detector.detectComponent('prompt-helper.md')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('prompt')
      })

      it('should detect files containing prompt', () => {
        const result = detector.detectComponent('system-prompt-v2.md')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('prompt')
      })
    })

    describe('script detection', () => {
      it('should detect JavaScript files in scripts/', () => {
        const result = detector.detectComponent('scripts/worker.js')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('script')
      })

      it('should detect TypeScript files in scripts/', () => {
        const result = detector.detectComponent('scripts/processor.ts')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('script')
      })

      it('should detect Python files in scripts/', () => {
        const result = detector.detectComponent('scripts/analyzer.py')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('script')
      })

      it('should detect shell scripts', () => {
        const result = detector.detectComponent('scripts/deploy.sh')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('script')
      })

      it('should detect bash scripts', () => {
        const result = detector.detectComponent('scripts/build.bash')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('script')
      })

      it('should detect files with .script extension', () => {
        const result = detector.detectComponent('workers/handler.script.js')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('script')
      })

      it('should detect files starting with script', () => {
        const result = detector.detectComponent('script-handler.js')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('script')
      })
    })

    describe('agent-definition detection', () => {
      it('should detect files in agents/ directory', () => {
        const result = detector.detectComponent('agents/processor/agent.yaml')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('agent-definition')
      })

      it('should detect agent.yaml files', () => {
        const result = detector.detectComponent('agents/scraper/agent.yaml')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('agent-definition')
      })

      it('should detect agent.yml files', () => {
        const result = detector.detectComponent('agents/analyzer/agent.yml')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('agent-definition')
      })
    })

    describe('query detection', () => {
      it('should detect files in queries/ directory', () => {
        const result = detector.detectComponent('queries/users.sql')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('query')
        expect(result?.name).toBe('users-query')
      })

      it('should detect files in sql/ directory', () => {
        const result = detector.detectComponent('sql/migrations/001.sql')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('query')
      })

      it('should detect files in database/ directory', () => {
        const result = detector.detectComponent('database/schema.sql')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('query')
      })

      it('should detect .sql extension files', () => {
        const result = detector.detectComponent('data/fetch-users.sql')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('query')
      })

      it('should detect files with .query extension', () => {
        const result = detector.detectComponent('analytics/report.query.sql')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('query')
      })

      it('should detect files starting with query', () => {
        const result = detector.detectComponent('query-builder.sql')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('query')
      })

      it('should detect files starting with schema', () => {
        const result = detector.detectComponent('schema-v2.sql')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('query')
      })
    })

    describe('config detection', () => {
      it('should detect files in configs/ directory', () => {
        const result = detector.detectComponent('configs/app.yaml')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('config')
        expect(result?.name).toBe('app-config')
      })

      it('should detect files in config/ directory', () => {
        const result = detector.detectComponent('config/database.json')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('config')
      })

      it('should detect files in settings/ directory', () => {
        const result = detector.detectComponent('settings/environment.yml')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('config')
      })

      it('should detect .yaml files', () => {
        const result = detector.detectComponent('docker-compose.yaml')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('config')
      })

      it('should detect .yml files', () => {
        const result = detector.detectComponent('ci/workflow.yml')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('config')
      })

      it('should detect .json files', () => {
        const result = detector.detectComponent('package.json')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('config')
      })

      it('should detect .toml files', () => {
        const result = detector.detectComponent('Cargo.toml')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('config')
      })

      it('should detect .ini files', () => {
        const result = detector.detectComponent('setup.ini')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('config')
      })

      it('should detect files with .config extension', () => {
        const result = detector.detectComponent('webpack.config.js')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('config')
      })

      it('should detect files starting with config', () => {
        const result = detector.detectComponent('config-loader.js')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('config')
      })
    })

    describe('path handling', () => {
      it('should handle nested directory paths', () => {
        const result = detector.detectComponent('prompts/system/v2/helper.md')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('prompt')
      })

      it('should handle Windows-style backslashes', () => {
        const result = detector.detectComponent('prompts\\helper.md')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('prompt')
      })

      it('should handle mixed path separators', () => {
        const result = detector.detectComponent('prompts/system\\helper.md')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('prompt')
      })

      it('should not match relative paths with ./ prefix', () => {
        // Minimatch doesn't match ./ prefixed paths by default
        const result = detector.detectComponent('./prompts/helper.md')
        expect(result).toBeNull()
      })

      it('should not match absolute paths', () => {
        // Component patterns are relative, not absolute
        const result = detector.detectComponent('/workspace/prompts/helper.md')
        expect(result).toBeNull()
      })
    })

    describe('non-matching files', () => {
      it('should return null for unrecognized files', () => {
        const result = detector.detectComponent('src/index.ts')
        expect(result).toBeNull()
      })

      it('should return null for README files', () => {
        const result = detector.detectComponent('README.md')
        expect(result).toBeNull()
      })

      it('should return null for test files', () => {
        const result = detector.detectComponent('tests/unit.test.ts')
        expect(result).toBeNull()
      })

      it('should return null for hidden files', () => {
        const result = detector.detectComponent('.gitignore')
        expect(result).toBeNull()
      })

      it('should return null for license files', () => {
        const result = detector.detectComponent('LICENSE')
        expect(result).toBeNull()
      })
    })

    describe('edge cases', () => {
      it('should handle files with multiple dots', () => {
        const result = detector.detectComponent('prompts/v2.0.1.helper.md')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('prompt')
      })

      it('should handle files with no extension', () => {
        const result = detector.detectComponent('prompts/helper')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('prompt')
      })

      it('should handle very long paths', () => {
        const longPath = 'prompts/very/deeply/nested/path/structure/helper.md'
        const result = detector.detectComponent(longPath)
        expect(result).toBeTruthy()
        expect(result?.type).toBe('prompt')
      })

      it('should handle files with hyphens in name', () => {
        const result = detector.detectComponent('prompts/helper-v2-final.md')
        expect(result).toBeTruthy()
        expect(result?.type).toBe('prompt')
        expect(result?.name).toBe('helper-v2-final-prompt')
      })
    })

    describe('component name generation', () => {
      it('should generate kebab-case names with type suffix', () => {
        const result = detector.detectComponent('prompts/ChatHelper.md')
        expect(result?.name).toMatch(/-prompt$/)
      })

      it('should handle single-word filenames', () => {
        const result = detector.detectComponent('prompts/system.md')
        expect(result?.name).toBe('system-prompt')
      })

      it('should extract basename from nested paths', () => {
        const result = detector.detectComponent('prompts/system/v2/helper.md')
        expect(result?.name).toBe('helper-prompt')
      })

      it('should handle files with extensions', () => {
        const result = detector.detectComponent('workers/processor.agent.js')
        expect(result?.name).toBe('processor-script')
      })
    })
  })

  describe('isComponent', () => {
    it('should return true for component files', () => {
      expect(detector.isComponent('prompts/helper.md')).toBe(true)
      expect(detector.isComponent('scripts/worker.js')).toBe(true)
      expect(detector.isComponent('queries/users.sql')).toBe(true)
      expect(detector.isComponent('configs/app.yaml')).toBe(true)
    })

    it('should return false for non-component files', () => {
      expect(detector.isComponent('src/index.ts')).toBe(false)
      expect(detector.isComponent('README.md')).toBe(false)
      expect(detector.isComponent('LICENSE')).toBe(false)
      expect(detector.isComponent('.gitignore')).toBe(false)
    })

    it('should return true for package.json (config file)', () => {
      // package.json is detected as a config component
      expect(detector.isComponent('package.json')).toBe(true)
    })

    it('should handle edge cases', () => {
      expect(detector.isComponent('')).toBe(false)
    })
  })

  describe('updatePatterns', () => {
    it('should allow updating patterns for a component type', () => {
      detector.updatePatterns({
        prompt: ['custom/**/*.txt'],
      })

      const result = detector.detectComponent('custom/helper.txt')
      expect(result).toBeTruthy()
      expect(result?.type).toBe('prompt')
    })

    it('should replace patterns for updated types', () => {
      detector.updatePatterns({
        prompt: ['custom/**/*.txt'],
      })

      // Original prompt pattern is replaced
      expect(detector.detectComponent('prompts/helper.md')).toBeNull()
      // New pattern should work
      expect(detector.detectComponent('custom/helper.txt')).toBeTruthy()
    })

    it('should allow updating multiple types', () => {
      detector.updatePatterns({
        prompt: ['custom-prompts/**/*'],
        script: ['custom-scripts/**/*'],
      })

      expect(detector.detectComponent('custom-prompts/helper.md')?.type).toBe('prompt')
      expect(detector.detectComponent('custom-scripts/worker.js')?.type).toBe('script')
    })

    it('should preserve patterns not being updated', () => {
      detector.updatePatterns({
        prompt: ['custom/**/*'],
      })

      // Query patterns should still work
      const result = detector.detectComponent('queries/users.sql')
      expect(result?.type).toBe('query')
    })
  })

  describe('validatePatterns', () => {
    it('should validate correct patterns', () => {
      const result = detector.validatePatterns()
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect invalid pattern structure', () => {
      // Manually corrupt the patterns to test validation
      ;(detector.patterns as any).prompt = 'not-an-array'

      const result = detector.validatePatterns()
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Patterns for prompt must be an array')
    })

    it('should detect non-string patterns', () => {
      detector.patterns.prompt = [123 as any, 'valid-pattern']

      const result = detector.validatePatterns()
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('must be a string'))).toBe(true)
    })

    it('should detect empty patterns', () => {
      detector.patterns.prompt = ['', '  ', 'valid-pattern']

      const result = detector.validatePatterns()
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('Empty pattern'))).toBe(true)
    })

    it('should allow valid custom patterns', () => {
      detector.updatePatterns({
        prompt: ['custom/**/*.md', 'another/**/*.txt'],
      })

      const result = detector.validatePatterns()
      expect(result.valid).toBe(true)
    })
  })

  describe('getPatterns', () => {
    it('should return all patterns as DetectionPattern objects', () => {
      const patterns = detector.getPatterns()

      expect(patterns).toBeInstanceOf(Array)
      expect(patterns.length).toBeGreaterThan(0)
    })

    it('should include pattern metadata', () => {
      const patterns = detector.getPatterns()
      const firstPattern = patterns[0]

      expect(firstPattern).toHaveProperty('id')
      expect(firstPattern).toHaveProperty('type')
      expect(firstPattern).toHaveProperty('pattern')
      expect(firstPattern).toHaveProperty('confidence')
      expect(firstPattern).toHaveProperty('description')
      expect(firstPattern).toHaveProperty('isCustom')
    })

    it('should generate unique IDs for patterns', () => {
      const patterns = detector.getPatterns()
      const ids = patterns.map((p) => p.id)
      const uniqueIds = new Set(ids)

      expect(uniqueIds.size).toBe(ids.length)
    })

    it('should mark default patterns correctly', () => {
      const patterns = detector.getPatterns()

      patterns.forEach((pattern) => {
        expect(pattern.isCustom).toBe(false)
      })
    })

    it('should include all component types', () => {
      const patterns = detector.getPatterns()
      const types = new Set(patterns.map((p) => p.type))

      expect(types.has('prompt')).toBe(true)
      expect(types.has('script')).toBe(true)
      expect(types.has('query')).toBe(true)
      expect(types.has('config')).toBe(true)
      expect(types.has('agent-definition')).toBe(true)
    })

    it('should have consistent confidence values', () => {
      const patterns = detector.getPatterns()

      patterns.forEach((pattern) => {
        expect(pattern.confidence).toBe(0.8)
      })
    })
  })

  describe('matchesPattern', () => {
    let pattern: DetectionPattern

    beforeEach(() => {
      pattern = {
        type: 'prompt' as ComponentType,
        pattern: 'prompts/**/*.md',
        confidence: 0.8,
        isCustom: false,
      }
    })

    it('should match files that match the pattern', () => {
      expect(detector.matchesPattern('prompts/helper.md', pattern)).toBe(true)
      expect(detector.matchesPattern('prompts/system/v2.md', pattern)).toBe(true)
    })

    it('should not match files that do not match', () => {
      expect(detector.matchesPattern('agents/worker.js', pattern)).toBe(false)
      expect(detector.matchesPattern('prompts/helper.txt', pattern)).toBe(false)
    })

    it('should handle wildcard patterns', () => {
      const wildcardPattern: DetectionPattern = {
        type: 'prompt' as ComponentType,
        pattern: '**/*.md',
      }

      expect(detector.matchesPattern('anywhere/file.md', wildcardPattern)).toBe(true)
      expect(detector.matchesPattern('deeply/nested/path/file.md', wildcardPattern)).toBe(true)
    })

    it('should handle Windows-style paths', () => {
      expect(detector.matchesPattern('prompts\\helper.md', pattern)).toBe(true)
    })

    it('should handle exact file matches', () => {
      const exactPattern: DetectionPattern = {
        type: 'config' as ComponentType,
        pattern: 'package.json',
      }

      expect(detector.matchesPattern('package.json', exactPattern)).toBe(true)
      expect(detector.matchesPattern('src/package.json', exactPattern)).toBe(false)
    })

    it('should handle directory prefix patterns', () => {
      const dirPattern: DetectionPattern = {
        type: 'prompt' as ComponentType,
        pattern: 'prompts/**/*',
      }

      expect(detector.matchesPattern('prompts/any-file.txt', dirPattern)).toBe(true)
      expect(detector.matchesPattern('prompts/nested/any-file.js', dirPattern)).toBe(true)
      expect(detector.matchesPattern('other/file.txt', dirPattern)).toBe(false)
    })
  })

  describe('pattern priority', () => {
    it('should match first matching pattern', () => {
      // A file might match multiple patterns, should return first match
      const result = detector.detectComponent('prompts/config.json')

      // Should match prompt patterns first (prompts/**/*) before config patterns (*.json)
      expect(result?.type).toBe('prompt')
    })

    it('should handle overlapping patterns consistently', () => {
      const result1 = detector.detectComponent('prompts/agent-helper.md')
      const result2 = detector.detectComponent('prompts/agent-helper.md')

      // Should be consistent
      expect(result1?.type).toBe(result2?.type)
      expect(result1?.name).toBe(result2?.name)
    })
  })

  describe('comprehensive integration', () => {
    it('should detect all component types from realistic file structure', () => {
      const files = [
        'prompts/system-prompt.md',
        'scripts/data-processor.ts',
        'queries/fetch-users.sql',
        'configs/database.yaml',
        'agents/scraper/agent.yaml',
      ]

      const results = files.map((f) => detector.detectComponent(f))

      expect(results[0]?.type).toBe('prompt')
      expect(results[1]?.type).toBe('script')
      expect(results[2]?.type).toBe('query')
      expect(results[3]?.type).toBe('config')
      expect(results[4]?.type).toBe('agent-definition')

      results.forEach((result) => {
        expect(result).toBeTruthy()
        expect(result?.name).toBeTruthy()
      })
    })

    it('should filter out non-components from mixed file list', () => {
      const files = [
        'prompts/helper.md', // component
        'src/index.ts', // not component
        'scripts/worker.js', // component
        'README.md', // not component
        'package.json', // component (config)
      ]

      const components = files
        .map((f) => detector.detectComponent(f))
        .filter((c) => c !== null)

      expect(components).toHaveLength(3)
    })
  })
})
