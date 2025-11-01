import { Command } from './base.js'
import { ComponentDetector, type DetectionPattern } from '../utils/component-detector.js'
import { ComponentUtils, type ComponentRegistry, type ComponentType } from '../models/components.js'
import * as fs from 'fs/promises'
import * as path from 'path'

export interface PatternsOptions {
  type?: ComponentType
  pattern?: string
  description?: string
  force?: boolean
  test?: string
}

/**
 * Patterns command for managing component detection patterns
 */
export class PatternsCommand extends Command {
  async execute(args: string[]): Promise<void> {
    await this.validateGitRepo()

    const parsed = this.parseArgs(args)
    const options = this.extractPatternsOptions(parsed)
    const [subcommand, ...subArgs] = parsed.positional

    switch (subcommand) {
      case 'list':
        await this.listPatterns(options)
        break

      case 'add':
        await this.addPattern(subArgs, options)
        break

      case 'remove':
        await this.removePattern(subArgs, options)
        break

      case 'test':
        await this.testPattern(subArgs, options)
        break

      default:
        if (subcommand && !subcommand.startsWith('-')) {
          this.showError(`Unknown patterns subcommand: ${subcommand}`)
        }
        console.log(this.getHelp())
    }
  }

  getHelp(): string {
    return `
Usage: edgit discover patterns <subcommand> [options]

Manage component detection patterns for automatic discovery.

Subcommands:
  list                    Show all detection patterns
  add <pattern>           Add a new detection pattern
  remove <id>             Remove a pattern by ID
  test <file>             Test patterns against a file

Options:
  --type <type>           Component type for new patterns (prompt|agent|sql|config)
  --description <desc>    Description for new patterns
  --force                 Force operations without confirmation
  --test <file>           Test file for pattern validation

Examples:
  edgit discover patterns list                           # Show all patterns
  edgit discover patterns list --type prompt            # Show prompt patterns only
  edgit discover patterns add "*.prompt.md"             # Add pattern with interactive setup
  edgit discover patterns add "scripts/*.py" --type agent --description "Python agent scripts"
  edgit discover patterns remove custom-1               # Remove custom pattern
  edgit discover patterns test prompts/system.md        # Test file against all patterns
    `.trim()
  }

  private extractPatternsOptions(parsed: any): PatternsOptions {
    return {
      type: parsed.options.type as ComponentType,
      pattern: parsed.options.pattern,
      description: parsed.options.description,
      force: parsed.flags.force,
      test: parsed.options.test,
    }
  }

  private async listPatterns(options: PatternsOptions): Promise<void> {
    const detector = new ComponentDetector(this.git)
    const patterns = detector.getPatterns()

    console.log('🔍 Component Detection Patterns\n')

    const filteredPatterns = options.type
      ? patterns.filter((p: any) => p.type === options.type)
      : patterns

    if (filteredPatterns.length === 0) {
      if (options.type) {
        console.log(`No patterns found for type: ${options.type}`)
      } else {
        console.log('No patterns configured.')
      }
      return
    }

    const groupedPatterns = this.groupPatternsByType(filteredPatterns)

    Object.entries(groupedPatterns).forEach(([type, typePatterns]) => {
      console.log(`📁 ${type.toUpperCase()} Components:`)

      typePatterns.forEach((pattern, index) => {
        const id = pattern.id || `${type}-${index}`
        console.log(`   ${id}: ${pattern.pattern}`)

        if (pattern.description) {
          console.log(`       ${pattern.description}`)
        }

        if (pattern.confidence !== undefined) {
          console.log(`       Confidence: ${pattern.confidence}`)
        }

        console.log()
      })
    })

    console.log(`Total patterns: ${filteredPatterns.length}`)
  }

  private async addPattern(args: string[], options: PatternsOptions): Promise<void> {
    const patternGlob = args[0]

    if (!patternGlob) {
      this.showError('Pattern is required for add command.')
      console.log('Usage: edgit discover patterns add <pattern> [options]')
      return
    }

    let type = options.type
    let description = options.description

    // Interactive prompts if not provided
    if (!type) {
      console.log('Available component types:')
      console.log('  1. prompt   - AI prompts and instructions')
      console.log('  2. agent    - Agent scripts and workflows')
      console.log('  3. sql      - SQL queries and schemas')
      console.log('  4. config   - Configuration files')

      type = await this.promptForType()
    }

    if (!description) {
      description = await this.promptForDescription(patternGlob, type)
    }

    const newPattern: DetectionPattern = {
      id: `custom-${Date.now()}`,
      type,
      pattern: patternGlob,
      description,
      confidence: 0.8, // Custom patterns get high confidence
      isCustom: true,
    }

    await this.saveCustomPattern(newPattern)

    this.showSuccess(`Added new ${type} pattern: ${patternGlob}`)
    console.log(`   ID: ${newPattern.id}`)
    console.log(`   Description: ${description}`)

    // Test the pattern
    if (options.test) {
      console.log('\n🧪 Testing new pattern...')
      await this.testPatternAgainstFile(newPattern, options.test)
    }
  }

  private async removePattern(args: string[], options: PatternsOptions): Promise<void> {
    const patternId = args[0]

    if (!patternId) {
      this.showError('Pattern ID is required for remove command.')
      console.log('Usage: edgit discover patterns remove <id>')
      console.log('Use "edgit discover patterns list" to see pattern IDs.')
      return
    }

    const customPatterns = await this.loadCustomPatterns()
    const patternIndex = customPatterns.findIndex((p) => p.id === patternId)

    if (patternIndex === -1) {
      this.showError(`Pattern not found: ${patternId}`)
      console.log('Use "edgit discover patterns list" to see available patterns.')
      return
    }

    const pattern = customPatterns[patternIndex]

    if (!pattern) {
      this.showError(`Pattern not found: ${patternId}`)
      return
    }

    if (!options.force) {
      console.log(`About to remove pattern: ${pattern.pattern} (${pattern.type})`)
      const confirmed = await this.confirmAction('Remove this pattern?')
      if (!confirmed) {
        console.log('Cancelled.')
        return
      }
    }

    customPatterns.splice(patternIndex, 1)
    await this.saveCustomPatterns(customPatterns)

    this.showSuccess(`Removed pattern: ${patternId}`)
  }

  private async testPattern(args: string[], options: PatternsOptions): Promise<void> {
    const testFile = args[0] || options.test

    if (!testFile) {
      this.showError('Test file is required.')
      console.log('Usage: edgit discover patterns test <file>')
      return
    }

    // Check if file exists
    try {
      await fs.access(testFile)
    } catch {
      this.showError(`File not found: ${testFile}`)
      return
    }

    console.log(`🧪 Testing patterns against: ${testFile}\n`)

    const detector = new ComponentDetector(this.git)
    const patterns = detector.getPatterns()

    const matches: Array<{ pattern: DetectionPattern; confidence: number }> = []

    for (const pattern of patterns) {
      if (detector.matchesPattern(testFile, pattern)) {
        matches.push({ pattern, confidence: pattern.confidence || 0.5 })
      }
    }

    if (matches.length === 0) {
      console.log('❌ No patterns matched this file.')
      console.log('\n💡 Consider adding a custom pattern for this file type.')
      return
    }

    console.log(`✅ Found ${matches.length} matching pattern(s):\n`)

    // Sort by confidence descending
    matches.sort((a, b) => b.confidence - a.confidence)

    matches.forEach((match, index) => {
      const { pattern, confidence } = match
      console.log(`${index + 1}. ${pattern.type.toUpperCase()} - ${pattern.pattern}`)
      console.log(`   Confidence: ${(confidence * 100).toFixed(1)}%`)
      if (pattern.description) {
        console.log(`   Description: ${pattern.description}`)
      }
      if (pattern.isCustom) {
        console.log(`   Type: Custom pattern (ID: ${pattern.id})`)
      }
      console.log()
    })

    // Show what would be detected
    const detected = detector.detectComponent(testFile)
    if (detected) {
      console.log(`🎯 Would detect as: ${detected.name} (${detected.type})`)
    }
  }

  private groupPatternsByType(patterns: DetectionPattern[]): Record<string, DetectionPattern[]> {
    return patterns.reduce(
      (groups, pattern) => {
        if (!groups[pattern.type]) {
          groups[pattern.type] = []
        }
        groups[pattern.type]!.push(pattern)
        return groups
      },
      {} as Record<string, DetectionPattern[]>
    )
  }

  private async loadCustomPatterns(): Promise<DetectionPattern[]> {
    try {
      const configPath = '.edgit/patterns.json'
      const content = await fs.readFile(configPath, 'utf8')
      return JSON.parse(content)
    } catch {
      return []
    }
  }

  private async saveCustomPattern(pattern: DetectionPattern): Promise<void> {
    const patterns = await this.loadCustomPatterns()
    patterns.push(pattern)
    await this.saveCustomPatterns(patterns)
  }

  private async saveCustomPatterns(patterns: DetectionPattern[]): Promise<void> {
    await fs.mkdir('.edgit', { recursive: true })
    const content = JSON.stringify(patterns, null, 2)
    await fs.writeFile('.edgit/patterns.json', content, 'utf8')
  }

  private async testPatternAgainstFile(pattern: DetectionPattern, filePath: string): Promise<void> {
    const detector = new ComponentDetector(this.git)

    if (detector.matchesPattern(filePath, pattern)) {
      console.log(`✅ Pattern matches: ${filePath}`)
    } else {
      console.log(`❌ Pattern does not match: ${filePath}`)
    }
  }

  private async promptForType(): Promise<ComponentType> {
    // This would need readline in real implementation
    // For now, return a default
    return 'prompt'
  }

  private async promptForDescription(pattern: string, type: ComponentType): Promise<string> {
    // This would need readline in real implementation
    // For now, generate a default
    return `Custom ${type} pattern for ${pattern}`
  }

  private async confirmAction(message: string): Promise<boolean> {
    // This would need readline in real implementation
    // For now, return true (as if --force was used)
    return true
  }
}
