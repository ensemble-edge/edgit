import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TestGitRepo } from '../helpers/git-test-repo.js'

/**
 * Helper to parse JSON output that may contain dotenv prefix lines
 */
function parseJSONOutput(stdout: string): any {
  // Split by lines and find where JSON starts
  // Look for a line that is ONLY [ or { (or with whitespace), not part of other text
  const lines = stdout.split('\n')
  let jsonStartIndex = -1

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]!.trim()
    // Check if line is exactly [ or { (start of JSON array/object)
    if (trimmed === '[' || trimmed === '{') {
      jsonStartIndex = i
      break
    }
  }

  if (jsonStartIndex === -1) {
    throw new Error(`No JSON found in output: ${stdout.substring(0, 200)}`)
  }

  // Join from JSON start to end
  const jsonContent = lines.slice(jsonStartIndex).join('\n').trim()

  try {
    return JSON.parse(jsonContent)
  } catch (e) {
    throw new Error(`Failed to parse JSON at line ${jsonStartIndex}: ${jsonContent.substring(0, 100)}... Error: ${e}`)
  }
}

describe('edgit components list - enhanced features', () => {
  let repo: TestGitRepo

  beforeEach(async () => {
    repo = await TestGitRepo.create()
    await repo.init()
  })

  afterEach(async () => {
    await repo.cleanup()
  })

  describe('output formats', () => {
    beforeEach(async () => {
      // Create test components
      await repo.writeFile('prompts/extraction.prompt.md', 'Extract data from documents')
      // Use scripts/ directory for script detection (agents/ would be agent-definition)
      await repo.writeFile('scripts/processor.ts', '// Process data\nexport {}')
      await repo.commit('Add test components')
      await repo.runEdgit(['init'])

      // Add version tags
      await repo.runEdgit(['tag', 'create', 'extraction-prompt', 'v1.0.0'])
      await repo.runEdgit(['tag', 'create', 'extraction-prompt', 'v1.1.0'])
      await repo.runEdgit(['tag', 'create', 'processor-script', 'v2.0.0'])
    })

    it('should list components in default table format', async () => {
      const result = await repo.runEdgit(['components', 'list'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('extraction-prompt')
      expect(result.stdout).toContain('processor-script')
      expect(result.stdout).toContain('v1.1.0') // latest version
      expect(result.stdout).toContain('v2.0.0')
    })

    it('should list components in JSON format', async () => {
      const result = await repo.runEdgit(['components', 'list', '--format', 'json'])

      expect(result.exitCode).toBe(0)

      // Parse JSON output
      const output = parseJSONOutput(result.stdout)
      expect(Array.isArray(output)).toBe(true)
      expect(output.length).toBe(2)

      // Check extraction-prompt component
      const extractionPrompt = output.find((c: any) => c.name === 'extraction-prompt')
      expect(extractionPrompt).toBeDefined()
      expect(extractionPrompt.type).toBe('prompt')
      expect(extractionPrompt.path).toBe('prompts/extraction.prompt.md')
      expect(extractionPrompt.versions).toEqual(['v1.0.0', 'v1.1.0'])
      expect(extractionPrompt.versionCount).toBe(2)

      // Check processor-script component (detected as 'script' type from scripts/ dir)
      const processorScript = output.find((c: any) => c.name === 'processor-script')
      expect(processorScript).toBeDefined()
      expect(processorScript.type).toBe('script')
      expect(processorScript.path).toBe('scripts/processor.ts')
      expect(processorScript.versions).toEqual(['v2.0.0'])
      expect(processorScript.versionCount).toBe(1)
    })

    it('should list components in YAML format', async () => {
      const result = await repo.runEdgit(['components', 'list', '--format', 'yaml'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('components:')
      expect(result.stdout).toContain('- name: extraction-prompt')
      expect(result.stdout).toContain('type: prompt')
      expect(result.stdout).toContain('path: prompts/extraction.prompt.md')
      expect(result.stdout).toContain('versions:')
      expect(result.stdout).toContain('- v1.0.0')
      expect(result.stdout).toContain('- v1.1.0')
      expect(result.stdout).toContain('- name: processor-script')
    })

    it('should list components in tree format', async () => {
      const result = await repo.runEdgit(['components', 'list', '--format', 'tree'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Repository Components')
      expect(result.stdout).toContain('prompt')
      expect(result.stdout).toContain('script')
      expect(result.stdout).toContain('extraction-prompt')
      expect(result.stdout).toContain('processor-script')
      expect(result.stdout).toContain('v1.0.0')
      expect(result.stdout).toContain('v1.1.0')
      expect(result.stdout).toContain('v2.0.0')
      // Check for tree structure characters
      expect(result.stdout).toMatch(/[├└]/)
    })
  })

  describe('filtering options', () => {
    beforeEach(async () => {
      // Create multiple component types
      await repo.writeFile('prompts/test1.prompt.md', 'Prompt 1')
      await repo.writeFile('prompts/test2.prompt.md', 'Prompt 2')
      // Use scripts/ directory for script detection (agents/ would be agent-definition)
      await repo.writeFile('scripts/agent1.ts', '// Script 1\nexport {}')
      await repo.writeFile('queries/query1.sql', 'SELECT * FROM users;')
      await repo.commit('Add components')
      await repo.runEdgit(['init'])

      // Add tags to some components
      await repo.runEdgit(['tag', 'create', 'test1-prompt', 'v1.0.0'])
      await repo.runEdgit(['tag', 'create', 'agent1-script', 'v2.0.0'])
      // test2-prompt and query1 remain untagged
    })

    it('should filter by component type - prompt', async () => {
      const result = await repo.runEdgit(['components', 'list', '--type', 'prompt'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('test1-prompt')
      expect(result.stdout).toContain('test2-prompt')
      expect(result.stdout).not.toContain('agent1-script')
      expect(result.stdout).not.toContain('query1')
    })

    it('should filter by component type - script', async () => {
      const result = await repo.runEdgit(['components', 'list', '--type', 'script'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('agent1-script')
      expect(result.stdout).not.toContain('test1-prompt')
      expect(result.stdout).not.toContain('query1')
    })

    it('should filter by component type - query', async () => {
      const result = await repo.runEdgit(['components', 'list', '--type', 'query'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('query1')
      expect(result.stdout).not.toContain('test1-prompt')
      expect(result.stdout).not.toContain('agent1-script')
    })

    it('should show only components with tags using --tags-only', async () => {
      const result = await repo.runEdgit(['components', 'list', '--tags-only'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('test1-prompt')
      expect(result.stdout).toContain('agent1-script')
      expect(result.stdout).not.toContain('test2-prompt')
      expect(result.stdout).not.toContain('query1')
    })

    it('should combine filters: type and tags-only', async () => {
      const result = await repo.runEdgit(['components', 'list', '--type', 'prompt', '--tags-only'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('test1-prompt')
      expect(result.stdout).not.toContain('test2-prompt') // no tags
      expect(result.stdout).not.toContain('agent1-script') // wrong type
      expect(result.stdout).not.toContain('query1') // wrong type
    })
  })

  describe('version limiting', () => {
    beforeEach(async () => {
      // Create component with many versions
      await repo.writeFile('prompts/versioned.prompt.md', 'Version test')
      await repo.commit('Add versioned component')
      await repo.runEdgit(['init'])

      // Create multiple versions
      for (let i = 1; i <= 10; i++) {
        await repo.writeFile('prompts/versioned.prompt.md', `Version ${i}`)
        await repo.commit(`Update to version ${i}`)
        await repo.runEdgit(['tag', 'create', 'versioned-prompt', `v${i}.0.0`])
      }
    })

    it('should show all versions by default', async () => {
      const result = await repo.runEdgit(['components', 'list', '--format', 'json'])

      expect(result.exitCode).toBe(0)
      const output = parseJSONOutput(result.stdout)
      const component = output.find((c: any) => c.name === 'versioned-prompt')

      expect(component.versionCount).toBe(10)
      expect(component.versions).toHaveLength(10)
      expect(component.versions[0]).toBe('v1.0.0')
      expect(component.versions[9]).toBe('v10.0.0')
    })

    it('should limit versions to 5', async () => {
      const result = await repo.runEdgit(['components', 'list', '--format', 'json', '--limit', '5'])

      expect(result.exitCode).toBe(0)
      const output = parseJSONOutput(result.stdout)
      const component = output.find((c: any) => c.name === 'versioned-prompt')

      expect(component.versionCount).toBe(10) // Total count still shown
      expect(component.versions).toHaveLength(5) // Only 5 returned
      // Should show the latest 5
      expect(component.versions[0]).toBe('v6.0.0')
      expect(component.versions[4]).toBe('v10.0.0')
    })

    it('should limit versions to 3', async () => {
      const result = await repo.runEdgit(['components', 'list', '--format', 'json', '--limit', '3'])

      expect(result.exitCode).toBe(0)
      const output = parseJSONOutput(result.stdout)
      const component = output.find((c: any) => c.name === 'versioned-prompt')

      expect(component.versions).toHaveLength(3)
      expect(component.versions[0]).toBe('v8.0.0')
      expect(component.versions[2]).toBe('v10.0.0')
    })

    it('should show limit info in table format', async () => {
      const result = await repo.runEdgit(['components', 'list', '--limit', '5'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('versioned-prompt')
      expect(result.stdout).toContain('10 versions')
      expect(result.stdout).toContain('showing 5')
    })
  })

  describe('deployment tags', () => {
    beforeEach(async () => {
      await repo.writeFile('prompts/deployed.prompt.md', 'Deployed component')
      await repo.commit('Add component')
      await repo.runEdgit(['init'])

      // Create versions and deployment tags using NEW command format
      await repo.runEdgit(['tag', 'create', 'deployed-prompt', 'v1.0.0'])
      await repo.runEdgit(['tag', 'create', 'deployed-prompt', 'v2.0.0'])
      // NEW: edgit tag set <component> <env> <version>
      await repo.runEdgit(['tag', 'set', 'deployed-prompt', 'prod', 'v1.0.0'])
      await repo.runEdgit(['tag', 'set', 'deployed-prompt', 'staging', 'v2.0.0'])
    })

    it('should show deployment tags in JSON format', async () => {
      const result = await repo.runEdgit(['components', 'list', '--format', 'json'])

      expect(result.exitCode).toBe(0)
      const output = parseJSONOutput(result.stdout)
      const component = output.find((c: any) => c.name === 'deployed-prompt')

      expect(component.environmentTags).toBeDefined()
      expect(component.environmentTags).toContain('prod')
      expect(component.environmentTags).toContain('staging')
    })

    it('should show deployment tags in table format', async () => {
      const result = await repo.runEdgit(['components', 'list'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('deployed-prompt')
      expect(result.stdout).toMatch(/\[.*prod.*staging.*\]|\[.*staging.*prod.*\]/)
    })

    it('should show deployment indicators in tree format', async () => {
      const result = await repo.runEdgit(['components', 'list', '--format', 'tree'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('deployed-prompt')
      expect(result.stdout).toContain('v1.0.0')
      expect(result.stdout).toContain('v2.0.0')
      // Check for deployment indicators with versions
      expect(result.stdout).toMatch(/v1\.0\.0.*←.*prod/)
      expect(result.stdout).toMatch(/v2\.0\.0.*←.*staging/)
    })
  })

  describe('tracked vs untracked (Git status)', () => {
    it('should show tracked components', async () => {
      await repo.writeFile('prompts/tracked.prompt.md', 'Tracked')
      await repo.commit('Add tracked')
      await repo.runEdgit(['init'])

      const result = await repo.runEdgit(['components', 'list', '--tracked'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('tracked-prompt')
    })

    it('should show untracked components', async () => {
      // Initialize first with no components
      await repo.runEdgit(['init', '--no-scan'])

      // Create a component file after init (so it's untracked)
      await repo.writeFile('prompts/untracked.prompt.md', 'Untracked')

      const result = await repo.runEdgit(['components', 'list', '--untracked'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('untracked-prompt')
    })

    it('should not show untracked when filtering for tracked', async () => {
      // Create and track one component
      await repo.writeFile('prompts/tracked.prompt.md', 'Tracked')
      await repo.commit('Add tracked')
      await repo.runEdgit(['init']) // This will track tracked-prompt

      // Create another component AFTER init (so it's untracked)
      await repo.writeFile('prompts/untracked.prompt.md', 'Untracked')

      const result = await repo.runEdgit(['components', 'list', '--tracked'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('tracked-prompt')
      expect(result.stdout).not.toContain('untracked-prompt')
    })
  })

  describe('combined features', () => {
    beforeEach(async () => {
      // Create diverse set of components
      await repo.writeFile('prompts/p1.prompt.md', 'Prompt 1')
      await repo.writeFile('prompts/p2.prompt.md', 'Prompt 2')
      await repo.writeFile('agents/a1.agent.ts', '// Agent\nexport {}')
      await repo.commit('Add components')
      await repo.runEdgit(['init'])

      // Add many versions to p1
      for (let i = 1; i <= 8; i++) {
        await repo.writeFile('prompts/p1.prompt.md', `Prompt v${i}`)
        await repo.commit(`Update p1`)
        await repo.runEdgit(['tag', 'create', 'p1-prompt', `v${i}.0.0`])
      }

      // Add one version to p2
      await repo.runEdgit(['tag', 'create', 'p2-prompt', 'v1.0.0'])
    })

    it('should combine type filter, tags-only, limit, and JSON format', async () => {
      const result = await repo.runEdgit([
        'components',
        'list',
        '--type',
        'prompt',
        '--tags-only',
        '--limit',
        '3',
        '--format',
        'json',
      ])

      expect(result.exitCode).toBe(0)
      const output = parseJSONOutput(result.stdout)

      // Should only have prompt types
      expect(output.every((c: any) => c.type === 'prompt')).toBe(true)

      // Should have p1 and p2 (both have tags)
      expect(output).toHaveLength(2)

      // p1 should have limited versions
      const p1 = output.find((c: any) => c.name === 'p1-prompt')
      expect(p1.versionCount).toBe(8)
      expect(p1.versions).toHaveLength(3)
      expect(p1.versions[2]).toBe('v8.0.0') // Latest

      // p2 should have all versions (only 1)
      const p2 = output.find((c: any) => c.name === 'p2-prompt')
      expect(p2.versionCount).toBe(1)
      expect(p2.versions).toHaveLength(1)
    })

    it('should work with tree format and filters', async () => {
      const result = await repo.runEdgit([
        'components',
        'list',
        '--type',
        'prompt',
        '--limit',
        '5',
        '--format',
        'tree',
      ])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Repository Components')
      expect(result.stdout).toContain('prompt')
      expect(result.stdout).toContain('p1-prompt')
      expect(result.stdout).toContain('p2-prompt')
      expect(result.stdout).not.toContain('agent')
      expect(result.stdout).not.toContain('a1-agent')
    })
  })

  describe('error handling', () => {
    it('should handle invalid format gracefully', async () => {
      await repo.writeFile('prompts/test.prompt.md', 'Test')
      await repo.commit('Add prompt')
      await repo.runEdgit(['init'])

      const result = await repo.runEdgit(['components', 'list', '--format', 'invalid'])

      expect(result.exitCode).toBe(0)
      // Should fall back to default table format
      expect(result.stdout).toContain('test-prompt')
    })

    it('should handle invalid type filter gracefully', async () => {
      await repo.writeFile('prompts/test.prompt.md', 'Test')
      await repo.commit('Add prompt')
      await repo.runEdgit(['init'])

      const result = await repo.runEdgit(['components', 'list', '--type', 'invalid'])

      expect(result.exitCode).toBe(0)
      // Should show no results (no components match invalid type)
      expect(result.stdout).not.toContain('test-prompt')
    })

    it('should handle zero limit', async () => {
      await repo.writeFile('prompts/test.prompt.md', 'Test')
      await repo.commit('Add prompt')
      await repo.runEdgit(['init'])
      await repo.runEdgit(['tag', 'create', 'test-prompt', 'v1.0.0'])

      const result = await repo.runEdgit(['components', 'list', '--limit', '0'])

      expect(result.exitCode).toBe(0)
      // Should show all versions (0 or negative means no limit)
    })
  })
})
