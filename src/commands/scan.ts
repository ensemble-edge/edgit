import { Command } from './base.js'
import { ComponentDetector } from '../utils/component-detector.js'
import { fileHeaderManager } from '../utils/file-headers.js'
import { ComponentUtils, type ComponentRegistry, type Component } from '../models/components.js'
import { GitWrapper } from '../utils/git.js'
import * as fs from 'fs/promises'
import * as path from 'path'

export interface ScanOptions {
  pattern?: string | undefined
  type?: string | undefined
  withHeaders?: boolean | undefined
  trackedOnly?: boolean | undefined
  changed?: boolean | undefined
  since?: string | undefined
  output?: 'table' | 'json' | 'simple'
}

export interface ScanResult {
  file: string
  type: string
  confidence: 'high' | 'medium' | 'low'
  registered: boolean
  hasHeader: boolean
  headerVersion?: string | undefined
  suggested?: string | undefined
}

/**
 * Scan command for discovering potential components in the repository
 */
export class ScanCommand extends Command {
  async execute(args: string[]): Promise<void> {
    await this.validateGitRepo()
    await this.validateGitInstalled()

    const parsed = this.parseArgs(args)
    const options = this.extractScanOptions(parsed)

    console.log('🔍 Scanning repository for components...\n')

    const detector = new ComponentDetector(this.git)
    const files = await this.getFilesToScan(options)
    const results: ScanResult[] = []

    for (const file of files) {
      const result = await this.analyzeFile(file, detector, options)
      if (result) {
        results.push(result)
      }
    }

    // Sort by confidence and type
    results.sort((a, b) => {
      const confidenceOrder = { high: 3, medium: 2, low: 1 }
      if (confidenceOrder[a.confidence] !== confidenceOrder[b.confidence]) {
        return confidenceOrder[b.confidence] - confidenceOrder[a.confidence]
      }
      return a.type.localeCompare(b.type)
    })

    await this.outputResults(results, options)

    if (results.length === 0) {
      console.log('No potential components found.')
      console.log('\nTip: Use `edgit patterns` to see detection patterns or add custom patterns.')
    }
  }

  private extractScanOptions(parsed: {
    flags: Record<string, boolean>
    options: Record<string, string>
    positional: string[]
  }): ScanOptions {
    return {
      pattern: parsed.options.pattern,
      type: parsed.options.type,
      withHeaders: parsed.flags['with-headers'],
      trackedOnly: parsed.flags['tracked-only'],
      changed: parsed.flags['changed'],
      since: parsed.options.since,
      output: (parsed.options.output as 'table' | 'json' | 'simple') || 'table',
    }
  }

  private async getFilesToScan(options: ScanOptions): Promise<string[]> {
    if (options.changed) {
      // Only scan files changed since the last commit (or since a specific ref)
      return await this.findChangedFiles(options.since)
    }

    if (options.pattern) {
      // Use custom pattern to find files
      return await this.findFilesByPattern(options.pattern)
    }

    if (options.trackedOnly) {
      // Only scan git-tracked files
      return await this.findTrackedFiles()
    }

    // Default: scan all files in workspace (tracked + untracked)
    const trackedFiles = await this.findTrackedFiles()
    const untrackedFiles = await this.findUntrackedFiles()

    // Combine and deduplicate
    const allFiles = [...new Set([...trackedFiles, ...untrackedFiles])]
    return allFiles
  }

  private async findFilesByPattern(pattern: string): Promise<string[]> {
    // Simple glob-like pattern matching
    const files = await this.findTrackedFiles()
    return files.filter((file) => {
      // Convert glob pattern to regex
      const regex = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.')
      return new RegExp(regex).test(file)
    })
  }

  private async findTrackedFiles(): Promise<string[]> {
    try {
      const result = await this.git.exec(['ls-files'])
      return result.stdout.split('\n').filter((f: string) => f.trim())
    } catch (error) {
      console.error('Error listing tracked files:', error)
      return []
    }
  }

  private async findUntrackedFiles(): Promise<string[]> {
    try {
      const result = await this.git.exec(['ls-files', '--others', '--exclude-standard'])
      return result.stdout.split('\n').filter((f: string) => f.trim())
    } catch (error) {
      console.error('Error listing untracked files:', error)
      return []
    }
  }

  private async findChangedFiles(since?: string): Promise<string[]> {
    try {
      // Determine the base reference
      const baseRef = since || 'HEAD~1'

      // Get files changed between baseRef and HEAD
      const result = await this.git.exec([
        'diff',
        '--name-only',
        '--diff-filter=ACMRT', // Added, Copied, Modified, Renamed, Type changed
        baseRef,
        'HEAD',
      ])

      const changedFiles = result.stdout.split('\n').filter((f: string) => f.trim())

      // Also include any uncommitted changes (staged and unstaged)
      const stagedResult = await this.git.exec(['diff', '--name-only', '--cached'])
      const stagedFiles = stagedResult.stdout.split('\n').filter((f: string) => f.trim())

      const unstagedResult = await this.git.exec(['diff', '--name-only'])
      const unstagedFiles = unstagedResult.stdout.split('\n').filter((f: string) => f.trim())

      // Combine all changed files (deduplicated)
      const allChanged = [...new Set([...changedFiles, ...stagedFiles, ...unstagedFiles])]

      return allChanged
    } catch (error) {
      // If there's no previous commit, fall back to all tracked files
      console.warn(
        'Could not determine changed files (possibly first commit), scanning all tracked files'
      )
      return await this.findTrackedFiles()
    }
  }

  private async analyzeFile(
    file: string,
    detector: ComponentDetector,
    options: ScanOptions
  ): Promise<ScanResult | null> {
    try {
      const detected = detector.detectComponent(file)

      // Skip if no type detected
      if (!detected) {
        return null
      }

      // Skip if type filter specified and doesn't match
      if (options.type && detected.type !== options.type) {
        return null
      }

      // Check if file has header metadata
      const headerMetadata = await fileHeaderManager.readMetadata(file)
      const hasHeader = !!headerMetadata

      // Skip if only showing files with headers
      if (options.withHeaders && !hasHeader) {
        return null
      }

      // Check if already registered - load existing registry
      const isRegistered = await this.isFileRegistered(file)

      const confidence = this.calculateConfidence(file, detected.type)
      const suggested = this.suggestComponentName(file)

      return {
        file,
        type: detected.type,
        confidence,
        registered: isRegistered,
        hasHeader,
        headerVersion: headerMetadata?.version,
        suggested,
      }
    } catch (error) {
      console.error(`Error analyzing ${file}:`, error)
      return null
    }
  }

  private async isFileRegistered(file: string): Promise<boolean> {
    try {
      const content = await fs.readFile('.edgit/components.json', 'utf8')
      const registry: ComponentRegistry = JSON.parse(content)

      // Check if file is registered as any component
      for (const [name, component] of Object.entries(registry.components)) {
        if (component.path === file) {
          return true
        }
      }

      return false
    } catch {
      // Registry doesn't exist or is malformed
      return false
    }
  }

  getHelp(): string {
    return `
Usage: edgit scan [options]

Scan the repository for potential components that can be managed by Edgit.
By default, scans all files in the workspace (tracked and untracked).

Options:
  -p, --pattern <glob>    Scan files matching specific pattern
  -t, --type <type>       Filter by component type (prompt|agent|sql|config|ensemble)
  --with-headers          Only show files with version headers
  --tracked-only          Only scan git-tracked files (exclude untracked)
  --changed               Only scan files changed since last commit (useful for CI/CD)
  --since <ref>           Git ref to compare against (default: HEAD~1). Use with --changed
  -o, --output <format>   Output format: table (default), json, simple

Examples:
  edgit scan                        # Scan all files (default)
  edgit scan --type prompt          # Only scan for prompts
  edgit scan --pattern "*.md"       # Scan only Markdown files
  edgit scan --tracked-only         # Only scan git-tracked files
  edgit scan --changed              # Only scan files changed since last commit
  edgit scan --changed --since main # Only scan files changed since main branch
  edgit scan --output json          # JSON output for scripting
    `.trim()
  }

  private calculateConfidence(file: string, type: string): 'high' | 'medium' | 'low' {
    const ext = path.extname(file).toLowerCase()
    const basename = path.basename(file, ext).toLowerCase()

    // High confidence indicators
    const highConfidencePatterns = {
      prompt: [/prompt/, /instruction/, /system/, /template/],
      agent: [/agent/, /assistant/, /bot/, /workflow/],
      sql: [/query/, /schema/, /migration/, /view/, /procedure/],
      config: [/config/, /settings/, /env/, /props/],
    }

    // Medium confidence indicators
    const mediumConfidencePatterns = {
      prompt: [/\.md$/, /readme/, /doc/],
      agent: [/\.py$/, /\.js$/, /\.ts$/],
      sql: [/\.sql$/],
      config: [/\.json$/, /\.yaml$/, /\.yml$/],
    }

    // Check high confidence patterns
    if (highConfidencePatterns[type as keyof typeof highConfidencePatterns]) {
      for (const pattern of highConfidencePatterns[type as keyof typeof highConfidencePatterns]) {
        if (pattern.test(basename) || pattern.test(file)) {
          return 'high'
        }
      }
    }

    // Check medium confidence patterns
    if (mediumConfidencePatterns[type as keyof typeof mediumConfidencePatterns]) {
      for (const pattern of mediumConfidencePatterns[
        type as keyof typeof mediumConfidencePatterns
      ]) {
        if (pattern.test(file)) {
          return 'medium'
        }
      }
    }

    return 'low'
  }

  private suggestComponentName(file: string): string {
    const basename = path.basename(file, path.extname(file))

    // Clean up common patterns
    return (
      basename
        .replace(/^(prompt|agent|config|query)[-_]?/i, '')
        .replace(/[-_](prompt|agent|config|query)$/i, '')
        .replace(/[^a-zA-Z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase() || 'component'
    )
  }

  private async outputResults(results: ScanResult[], options: ScanOptions): Promise<void> {
    if (options.output === 'json') {
      console.log(JSON.stringify(results, null, 2))
      return
    }

    if (options.output === 'simple') {
      for (const result of results) {
        const status = result.registered ? '✓' : ' '
        const header = result.hasHeader ? '📄' : ' '
        console.log(`${status}${header} ${result.file} (${result.type}, ${result.confidence})`)
      }
      return
    }

    // Table output (default)
    if (results.length === 0) {
      return
    }

    console.log('Found potential components:\n')

    const maxFileLength = Math.max(4, ...results.map((r) => r.file.length))
    const maxTypeLength = Math.max(4, ...results.map((r) => r.type.length))

    // Header
    console.log(
      '  ' +
        'File'.padEnd(maxFileLength) +
        '  ' +
        'Type'.padEnd(maxTypeLength) +
        '  ' +
        'Confidence'.padEnd(10) +
        '  ' +
        'Status'.padEnd(12) +
        '  ' +
        'Suggested Name'
    )

    console.log(
      '  ' +
        '-'.repeat(maxFileLength) +
        '  ' +
        '-'.repeat(maxTypeLength) +
        '  ' +
        '-'.repeat(10) +
        '  ' +
        '-'.repeat(12) +
        '  ' +
        '-'.repeat(14)
    )

    // Results
    for (const result of results) {
      const statusIcon = result.registered ? '✓ ' : result.hasHeader ? '📄 ' : '  '
      const statusText = result.registered
        ? 'Registered'
        : result.hasHeader
          ? 'Has Header'
          : 'Untracked'
      const confidenceIcon =
        result.confidence === 'high' ? '🔥' : result.confidence === 'medium' ? '⚡' : '💡'

      console.log(
        statusIcon +
          result.file.padEnd(maxFileLength) +
          '  ' +
          result.type.padEnd(maxTypeLength) +
          '  ' +
          (confidenceIcon + ' ' + result.confidence).padEnd(10) +
          '  ' +
          statusText.padEnd(12) +
          '  ' +
          (result.suggested || '')
      )
    }

    console.log('\nLegend:')
    console.log('  ✓  = Already registered')
    console.log('  📄 = Has version header')
    console.log('  🔥 = High confidence')
    console.log('  ⚡ = Medium confidence')
    console.log('  💡 = Low confidence')

    console.log('\nNext steps:')
    console.log('  edgit register <file>     Register a component')
    console.log('  edgit detect <file>       Get detailed analysis')
    console.log('  edgit patterns --add      Add custom patterns')
  }
}
