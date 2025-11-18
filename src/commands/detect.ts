import { Command } from './base.js'
import { ComponentDetector } from '../utils/component-detector.js'
import { fileHeaderManager } from '../utils/file-headers.js'
import { ComponentUtils, type ComponentRegistry, type ComponentType } from '../models/components.js'
import * as fs from 'fs/promises'
import * as path from 'path'

export interface DetectOptions {
  output?: 'detailed' | 'json' | 'simple'
  preview?: boolean | undefined
}

export interface DetectResult {
  file: string
  type: ComponentType | null
  confidence: 'high' | 'medium' | 'low' | 'none'
  registered: boolean
  hasHeader: boolean
  headerMetadata?:
    | {
        version?: string
        component?: string
      }
    | undefined
  suggestedName: string
  suggestedVersion: string
  patterns: {
    matched: string[]
    reason: string
  }
  recommendations: string[]
  preview?: {
    registryEntry: any
    headerContent: string
  }
}

/**
 * Detect command for detailed analysis of specific files
 */
export class DetectCommand extends Command {
  async execute(args: string[]): Promise<void> {
    await this.validateGitRepo()
    await this.validateGitInstalled()

    const parsed = this.parseArgs(args)
    const options = this.extractDetectOptions(parsed)

    if (parsed.positional.length === 0) {
      this.showError('Please specify a file to analyze.')
      console.log('\nUsage: edgit detect <file> [options]')
      return
    }

    const filePath = parsed.positional[0]

    if (!filePath) {
      this.showError('File path is required.')
      return
    }

    // Check if file exists
    try {
      await fs.access(filePath)
    } catch {
      this.showError(`File not found: ${filePath}`)
      return
    }

    const detector = new ComponentDetector(this.git)
    const result = await this.analyzeFile(filePath, detector, options)

    await this.outputResult(result, options)
  }

  getHelp(): string {
    return `
Usage: edgit detect <file> [options]

Perform detailed analysis of a specific file to determine if it's a component.

Arguments:
  <file>                  Path to the file to analyze

Options:
  --preview               Show what would be registered/added
  -o, --output <format>   Output format: detailed (default), json, simple

Examples:
  edgit detect prompts/system.md       # Analyze a specific file
  edgit detect config.yaml --preview   # Show registration preview
  edgit detect agent.py --output json  # JSON output for scripting
    `.trim()
  }

  private extractDetectOptions(parsed: {
    flags: Record<string, boolean>
    options: Record<string, string>
    positional: string[]
  }): DetectOptions {
    return {
      output: (parsed.options.output as 'detailed' | 'json' | 'simple') || 'detailed',
      preview: parsed.flags.preview,
    }
  }

  private async analyzeFile(
    filePath: string,
    detector: ComponentDetector,
    options: DetectOptions
  ): Promise<DetectResult> {
    const detected = detector.detectComponent(filePath)
    const headerMetadata = await fileHeaderManager.readMetadata(filePath)
    const isRegistered = await this.isFileRegistered(filePath)

    let confidence: 'high' | 'medium' | 'low' | 'none' = 'none'
    let patterns: { matched: string[]; reason: string } = {
      matched: [],
      reason: 'No patterns matched',
    }

    if (detected) {
      confidence = this.calculateConfidence(filePath, detected.type)
      patterns = this.getMatchedPatterns(filePath, detector)
    }

    const suggestedName = detected?.name || this.suggestComponentName(filePath)
    const suggestedVersion = this.suggestInitialVersion(filePath, headerMetadata)
    const recommendations = this.generateRecommendations(
      filePath,
      detected,
      headerMetadata,
      isRegistered
    )

    const result: DetectResult = {
      file: filePath,
      type: detected?.type || null,
      confidence,
      registered: isRegistered,
      hasHeader: !!headerMetadata,
      headerMetadata: headerMetadata
        ? {
            version: headerMetadata.version,
            component: headerMetadata.component,
          }
        : undefined,
      suggestedName,
      suggestedVersion,
      patterns,
      recommendations,
    }

    if (options.preview && detected) {
      result.preview = await this.generatePreview(
        filePath,
        detected,
        suggestedName,
        suggestedVersion
      )
    }

    return result
  }

  private async isFileRegistered(file: string): Promise<boolean> {
    try {
      const content = await fs.readFile('.edgit/components.json', 'utf8')
      const registry: ComponentRegistry = JSON.parse(content)

      for (const [name, component] of Object.entries(registry.components)) {
        if (component.path === file) {
          return true
        }
      }

      return false
    } catch {
      return false
    }
  }

  private calculateConfidence(file: string, type: ComponentType): 'high' | 'medium' | 'low' {
    const ext = path.extname(file).toLowerCase()
    const basename = path.basename(file, ext).toLowerCase()
    const dirname = path.dirname(file).toLowerCase()

    // High confidence indicators
    const highConfidencePatterns: Record<ComponentType, RegExp[]> = {
      template: [/\.hbs$/, /\.handlebars$/, /\.mjml$/, /\.liquid$/, /templates\//],
      prompt: [/prompt/, /instruction/, /system/],
      script: [/script/, /assistant/, /bot/, /workflow/],
      query: [/query/, /migration/, /view/, /procedure/],
      config: [/config/, /settings/, /env/, /props/],
      schema: [/\.schema\.json$/, /\.schema\.ya?ml$/, /schemas\//],
      'agent-definition': [/agent\.ya?ml/, /agents\/.*\/agent\.ya?ml/],
    }

    // Medium confidence indicators
    const mediumConfidencePatterns: Record<ComponentType, RegExp[]> = {
      template: [/\.mustache$/, /\.ejs$/, /\.template\./, /template/],
      prompt: [/\.md$/, /readme/, /doc/, /prompts/],
      script: [/\.py$/, /\.js$/, /\.ts$/, /scripts/],
      query: [/\.sql$/, /queries/, /database/],
      config: [/\.json$/, /\.yaml$/, /\.yml$/, /configs?/],
      schema: [/\.json$/, /validation/, /types/, /schema/],
      'agent-definition': [/agents\//, /\.agent\.ya?ml/],
    }

    // Check high confidence patterns
    const highPatterns = highConfidencePatterns[type]
    if (highPatterns) {
      for (const pattern of highPatterns) {
        if (pattern.test(basename) || pattern.test(dirname)) {
          return 'high'
        }
      }
    }

    // Check medium confidence patterns
    const mediumPatterns = mediumConfidencePatterns[type]
    if (mediumPatterns) {
      for (const pattern of mediumPatterns) {
        if (pattern.test(file) || pattern.test(dirname)) {
          return 'medium'
        }
      }
    }

    return 'low'
  }

  private getMatchedPatterns(
    file: string,
    detector: ComponentDetector
  ): { matched: string[]; reason: string } {
    const normalizedPath = file.replace(/\\/g, '/')
    const matched: string[] = []

    for (const [type, patterns] of Object.entries(detector.patterns)) {
      for (const pattern of patterns) {
        if (this.testPattern(normalizedPath, pattern)) {
          matched.push(`${type}: ${pattern}`)
        }
      }
    }

    if (matched.length === 0) {
      return { matched: [], reason: 'No component patterns matched this file' }
    }

    return {
      matched,
      reason: `Matched ${matched.length} pattern(s)`,
    }
  }

  private testPattern(file: string, pattern: string): boolean {
    // Simple minimatch-like pattern testing
    const regex = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.')
    return new RegExp(`^${regex}$`).test(file)
  }

  private suggestComponentName(filePath: string): string {
    const basename = path.basename(filePath, path.extname(filePath))

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

  private suggestInitialVersion(filePath: string, headerMetadata?: any): string {
    if (headerMetadata?.version) {
      return headerMetadata.version
    }

    // Check if file is under version control and has history
    return '1.0.0' // Default initial version
  }

  private generateRecommendations(
    filePath: string,
    detected: { type: ComponentType; name: string } | null,
    headerMetadata: any,
    isRegistered: boolean
  ): string[] {
    const recommendations: string[] = []

    if (!detected) {
      recommendations.push('This file does not match any component patterns')
      recommendations.push('Consider adding custom patterns if this should be a component')
      recommendations.push('Use `edgit patterns --add` to add custom detection patterns')
      return recommendations
    }

    if (isRegistered) {
      recommendations.push('✓ Already registered as a component')
      if (!headerMetadata) {
        recommendations.push('Consider adding version header for self-describing component')
        recommendations.push(`Run: edgit register ${filePath} --update-header`)
      }
    } else {
      recommendations.push(`Register as ${detected.type} component:`)
      recommendations.push(`  edgit register ${filePath}`)

      if (!headerMetadata) {
        recommendations.push('Add version header for hybrid versioning:')
        recommendations.push(`  edgit register ${filePath} --with-header`)
      }
    }

    // File-specific recommendations
    const ext = path.extname(filePath).toLowerCase()

    if (detected.type === 'prompt' && ext === '.md') {
      recommendations.push('💡 Tip: Consider organizing prompts in prompts/ directory')
    } else if (detected.type === 'script' && (ext === '.py' || ext === '.js' || ext === '.ts')) {
      recommendations.push('💡 Tip: Document script interfaces in comments for better versioning')
    } else if (detected.type === 'query' && ext === '.sql') {
      recommendations.push('💡 Tip: Include schema dependencies in comments')
    } else if (detected.type === 'agent-definition' && (ext === '.yaml' || ext === '.yml')) {
      recommendations.push('💡 Tip: Version agent definitions independently from their components')
    } else if (detected.type === 'config') {
      recommendations.push('💡 Tip: Consider environment-specific configurations')
    }

    return recommendations
  }

  private async generatePreview(
    filePath: string,
    detected: { type: ComponentType; name: string },
    suggestedName: string,
    suggestedVersion: string
  ): Promise<{ registryEntry: any; headerContent: string }> {
    // Generate registry entry preview
    const registryEntry = {
      name: suggestedName,
      type: detected.type,
      path: filePath,
      version: suggestedVersion,
      versionHistory: [
        {
          version: suggestedVersion,
          commit: 'initial',
          timestamp: new Date().toISOString(),
          message: 'Initial component registration',
        },
      ],
    }

    // Generate header content preview
    const headerContent = await this.generateHeaderPreview(
      filePath,
      suggestedName,
      suggestedVersion
    )

    return {
      registryEntry,
      headerContent,
    }
  }

  private async generateHeaderPreview(
    filePath: string,
    name: string,
    version: string
  ): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf8')
      const ext = path.extname(filePath).toLowerCase()

      // Use file header manager to generate the preview
      const tempFile = `${filePath}.preview`
      await fs.writeFile(tempFile, content)

      await fileHeaderManager.writeMetadata(tempFile, {
        version,
        component: name,
      })

      const previewContent = await fs.readFile(tempFile, 'utf8')
      await fs.unlink(tempFile) // Cleanup

      // Return just the header part
      const lines = previewContent.split('\n')
      const originalLines = content.split('\n')
      const headerLines = lines.slice(0, lines.length - originalLines.length + 1)

      return headerLines.join('\n')
    } catch (error) {
      return `# Error generating preview: ${error}`
    }
  }

  private async outputResult(result: DetectResult, options: DetectOptions): Promise<void> {
    if (options.output === 'json') {
      console.log(JSON.stringify(result, null, 2))
      return
    }

    if (options.output === 'simple') {
      const status = result.registered ? '✓' : result.type ? '○' : '✗'
      const type = result.type || 'unknown'
      console.log(`${status} ${result.file} (${type}, ${result.confidence})`)
      return
    }

    // Detailed output (default)
    console.log(`🔍 Component Analysis: ${result.file}\n`)

    // Detection results
    console.log('Detection Results:')
    if (result.type) {
      const confidenceIcon =
        result.confidence === 'high' ? '🔥' : result.confidence === 'medium' ? '⚡' : '💡'
      console.log(`  Type: ${result.type}`)
      console.log(`  Confidence: ${confidenceIcon} ${result.confidence}`)
      console.log(`  Suggested name: ${result.suggestedName}`)
    } else {
      console.log('  ✗ Not detected as a component')
    }

    // Current status
    console.log('\nCurrent Status:')
    console.log(`  Registered: ${result.registered ? '✓ Yes' : '✗ No'}`)
    console.log(`  Has header: ${result.hasHeader ? '✓ Yes' : '✗ No'}`)

    if (result.headerMetadata) {
      console.log('  Header metadata:')
      console.log(`    Version: ${result.headerMetadata.version || 'not set'}`)
      console.log(`    Component: ${result.headerMetadata.component || 'not set'}`)
    }

    // Pattern matching
    console.log('\nPattern Matching:')
    console.log(`  ${result.patterns.reason}`)
    if (result.patterns.matched.length > 0) {
      console.log('  Matched patterns:')
      for (const pattern of result.patterns.matched) {
        console.log(`    • ${pattern}`)
      }
    }

    // Recommendations
    if (result.recommendations.length > 0) {
      console.log('\nRecommendations:')
      for (const rec of result.recommendations) {
        console.log(`  ${rec}`)
      }
    }

    // Preview
    if (result.preview) {
      console.log('\n📋 Registration Preview:')
      console.log('\nRegistry entry:')
      console.log(JSON.stringify(result.preview.registryEntry, null, 2))

      console.log('\nHeader content:')
      console.log('```')
      console.log(result.preview.headerContent)
      console.log('```')

      console.log('\n💡 Run `edgit register ${result.file}` to apply these changes')
    }
  }
}
