import * as fs from 'fs/promises'
import * as path from 'path'
import { Command } from './base.js'
import { GitWrapper } from '../utils/git.js'
import type { GitTagManager, EntityType, TagPrefix } from '../utils/git-tags.js'
import { createGitTagManager } from '../utils/git-tags.js'
import type { ComponentRegistry, ComponentType, Component } from '../models/components.js'
import { ComponentUtils, ComponentSpec, ComponentSpecParser } from '../models/components.js'
import { createRegistryLoader } from '../utils/registry.js'
import { ComponentDetector } from '../utils/component-detector.js'

/**
 * Extended component with optional untracked marker for display purposes
 */
interface ComponentEntry {
  name: string
  component: Component & { untracked?: boolean }
}

/**
 * Convert ComponentType to EntityType for git tagging
 * Maps Edgit's component types to the git-tags EntityType
 */
function componentTypeToEntityType(componentType: ComponentType): EntityType {
  // agent-definition maps to agent
  if (componentType === 'agent-definition') {
    return 'agent'
  }
  // All other types map directly
  return componentType as EntityType
}

/**
 * Infer TagPrefix from file path
 * Determines if a component should be tagged under 'components' or 'logic'
 *
 * Rules:
 * - 'logic' prefix: Files in logic/, src/logic/, or containing 'worker', 'handler', 'router'
 * - 'components' prefix: Everything else (prompts, configs, etc.)
 */
function inferPrefixFromPath(filePath: string): TagPrefix {
  const normalizedPath = filePath.toLowerCase()

  // Logic prefix indicators
  if (
    normalizedPath.includes('logic/') ||
    normalizedPath.includes('src/logic/') ||
    normalizedPath.includes('worker') ||
    normalizedPath.includes('handler') ||
    normalizedPath.includes('router')
  ) {
    return 'logic'
  }

  // Default to components for prompts, configs, etc.
  return 'components'
}

/**
 * ComponentsCommand for Git tag-based component management
 * Lists, shows, and manages components using Git tags for versioning
 */
export class ComponentsCommand extends Command {
  private static readonly EDGIT_DIR = '.edgit'
  private static readonly COMPONENTS_FILE = 'components.json'
  private tagManager: GitTagManager

  constructor() {
    super()
    this.tagManager = createGitTagManager(this.git)
  }

  async execute(args: string[]): Promise<void> {
    try {
      if (this.shouldShowHelp(args)) {
        console.log(this.getHelp())
        return
      }

      await this.validateGitInstalled()
      await this.validateGitRepo()

      const { flags, options, positional } = this.parseArgs(args)
      const [subcommand, ...subArgs] = positional

      // Merge flags and options for consistent handling
      const allFlags: Record<string, boolean | string | number> = { ...flags, ...options }

      // Convert numeric options
      if (allFlags.limit && typeof allFlags.limit === 'string') {
        allFlags.limit = parseInt(allFlags.limit, 10)
      }

      // Load components registry
      const registry = await this.loadComponentsRegistry()

      if (!subcommand || subcommand === 'list' || subcommand === 'ls') {
        await this.listComponents(registry, allFlags)
      } else if (subcommand === 'show') {
        if (!subArgs[0]) {
          throw new Error('Component name is required for show command')
        }
        await this.showComponent(registry, subArgs[0], allFlags)
      } else if (subcommand === 'checkout') {
        if (!subArgs[0]) {
          throw new Error('Component specification is required for checkout command')
        }
        await this.checkoutComponent(registry, subArgs[0], allFlags)
      } else if (subcommand === 'add') {
        if (!subArgs[0] || !subArgs[1]) {
          throw new Error('Component name and path are required for add command')
        }
        await this.addComponent(registry, subArgs[0], subArgs[1], subArgs[2], allFlags)
      } else if (subcommand === 'remove' || subcommand === 'rm') {
        if (!subArgs[0]) {
          throw new Error('Component name is required for remove command')
        }
        await this.removeComponent(registry, subArgs[0], allFlags)
      } else {
        // Treat as component name for show
        await this.showComponent(registry, subcommand, allFlags)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      this.showError(`Component operation failed: ${message}`, [
        'Ensure edgit is initialized with "edgit init"',
        'Check that the component name is correct',
        'Use "edgit components" to list all components',
      ])
      throw error
    }
  }

  /**
   * List all components with Git tag information
   */
  private async listComponents(
    registry: ComponentRegistry,
    flags: Record<string, boolean | string | number>
  ): Promise<void> {
    // Apply filters
    const typeFilter = flags.type as string | undefined
    const tagsOnly = flags['tags-only'] as boolean | undefined
    const tracked = flags.tracked as boolean | undefined
    const untracked = flags.untracked as boolean | undefined

    let componentEntries: ComponentEntry[]

    // Handle tracked/untracked filtering
    if (untracked) {
      // Show only untracked components (files exist but not in registry)
      const untrackedComponents = await this.findUntrackedComponents(registry)
      componentEntries = untrackedComponents
    } else if (tracked) {
      // Show only tracked components (in registry)
      componentEntries = ComponentUtils.getAllComponents(registry)
    } else {
      // Show all components (both tracked and untracked)
      const trackedComponents = ComponentUtils.getAllComponents(registry)
      const untrackedComponents = await this.findUntrackedComponents(registry)
      componentEntries = [...trackedComponents, ...untrackedComponents]
    }

    if (componentEntries.length === 0) {
      if (untracked) {
        this.showInfo('No untracked components found.')
      } else if (tracked) {
        this.showInfo(
          'No tracked components found. Add components with "edgit components add <name> <path> <type>".'
        )
      } else {
        this.showInfo(
          'No components found. Add components with "edgit components add <name> <path> <type>".'
        )
      }
      return
    }

    // Filter by type
    if (typeFilter) {
      componentEntries = componentEntries.filter(({ component }) => component.type === typeFilter)
    }

    // Filter by tag status
    if (tagsOnly) {
      const entriesWithTags = []
      for (const entry of componentEntries) {
        const entityType = componentTypeToEntityType(entry.component.type)
        const prefix = inferPrefixFromPath(entry.component.path)
        const tags = await this.tagManager.listTags(prefix, entityType, entry.name)
        if (tags.length > 0) {
          entriesWithTags.push(entry)
        }
      }
      componentEntries = entriesWithTags
    }

    if (componentEntries.length === 0) {
      console.log('\n⚠️  No components match the specified filters')
      return
    }

    // Determine output format
    const format = (flags.format as string) || 'table'
    const limit = (flags.limit as number) || undefined

    if (format === 'json') {
      await this.listComponentsJSON(componentEntries, limit)
    } else if (format === 'yaml') {
      await this.listComponentsYAML(componentEntries, limit)
    } else if (format === 'tree') {
      await this.listComponentsTree(componentEntries, limit)
    } else {
      await this.listComponentsTable(componentEntries, flags, limit)
    }
  }

  /**
   * Find untracked components (files that exist but aren't in registry)
   * Leverages existing ComponentDetector and file discovery infrastructure
   */
  private async findUntrackedComponents(registry: ComponentRegistry): Promise<ComponentEntry[]> {
    const untrackedComponents: ComponentEntry[] = []

    // Use ComponentDetector to identify component files
    const detector = new ComponentDetector(this.git)

    // Get all tracked component paths for comparison
    const trackedPaths = new Set<string>()
    for (const [name, component] of Object.entries(registry.components)) {
      trackedPaths.add(path.normalize(component.path))
    }

    // Get all files (tracked + untracked) from git
    const allFiles = await this.findAllFiles()

    // Scan each file with ComponentDetector
    for (const filePath of allFiles) {
      const normalizedPath = path.normalize(filePath)

      // Skip if already tracked in registry
      if (trackedPaths.has(normalizedPath)) {
        continue
      }

      // Skip files in .edgit directory
      if (normalizedPath.includes('.edgit')) {
        continue
      }

      // Use detector to identify component type
      const detected = detector.detectComponent(filePath)
      if (!detected) {
        continue
      }

      // Check if this component name is already tracked (different path)
      if (registry.components[detected.name]) {
        continue
      }

      untrackedComponents.push({
        name: detected.name,
        component: {
          path: filePath,
          type: detected.type,
          untracked: true, // Mark as untracked
        },
      })
    }

    return untrackedComponents
  }

  /**
   * Find all files in the repository (tracked + untracked)
   */
  private async findAllFiles(): Promise<string[]> {
    try {
      // Get tracked files
      const trackedResult = await this.git.exec(['ls-files'])
      const trackedFiles = trackedResult.stdout.split('\n').filter((f: string) => f.trim())

      // Get untracked files (excluding ignored files)
      const untrackedResult = await this.git.exec(['ls-files', '--others', '--exclude-standard'])
      const untrackedFiles = untrackedResult.stdout.split('\n').filter((f: string) => f.trim())

      // Combine and deduplicate
      const allFiles = [...new Set([...trackedFiles, ...untrackedFiles])]
      return allFiles
    } catch (error) {
      console.error('Error listing files:', error)
      return []
    }
  }

  /**
   * List components in table format (default)
   */
  private async listComponentsTable(
    componentEntries: ComponentEntry[],
    flags: Record<string, boolean | string | number>,
    limit?: number
  ): Promise<void> {
    console.log(`\n🧩 Components (${componentEntries.length} total):\n`)

    if (flags.verbose || flags.v) {
      // Verbose listing with Git tag details
      for (const { name, component } of componentEntries) {
        await this.showComponentSummary(name, component, true, limit)
        console.log('')
      }
    } else {
      // Compact listing grouped by type
      const byType = componentEntries.reduce(
        (acc, { name, component }) => {
          if (!acc[component.type]) acc[component.type] = []
          acc[component.type]!.push({ name, component })
          return acc
        },
        {} as Record<string, ComponentEntry[]>
      )

      for (const [type, components] of Object.entries(byType)) {
        console.log(`📁 ${type}:`)
        for (const { name, component } of components) {
          await this.showComponentSummary(name, component, false, limit)
        }
        console.log('')
      }
    }
  }

  /**
   * List components in JSON format
   */
  /**
   * JSON output structure for components
   */
  private async listComponentsJSON(
    componentEntries: ComponentEntry[],
    limit?: number
  ): Promise<void> {
    const output: Array<{
      name: string
      type: ComponentType
      path: string
      versions: string[]
      environmentTags: string[]
      versionCount: number
    }> = []

    for (const { name, component } of componentEntries) {
      const entityType = componentTypeToEntityType(component.type)
      const prefix = inferPrefixFromPath(component.path)
      const versionTagsInfo = await this.tagManager.getVersionTags(prefix, entityType, name)
      const environmentTagsInfo = await this.tagManager.getEnvironmentTags(prefix, entityType, name)

      // Apply limit and extract slot names
      const limitedVersions = limit ? versionTagsInfo.slice(-limit) : versionTagsInfo
      const versions = limitedVersions.map((tag) => tag.slot)
      const environmentTags = environmentTagsInfo.map((tag) => tag.slot)

      output.push({
        name,
        type: component.type,
        path: component.path,
        versions,
        environmentTags,
        versionCount: versionTagsInfo.length,
      })
    }

    console.log(JSON.stringify(output, null, 2))
  }

  /**
   * List components in YAML format
   */
  private async listComponentsYAML(
    componentEntries: ComponentEntry[],
    limit?: number
  ): Promise<void> {
    console.log('components:')

    for (const { name, component } of componentEntries) {
      const entityType = componentTypeToEntityType(component.type)
      const prefix = inferPrefixFromPath(component.path)
      const versionTagsInfo = await this.tagManager.getVersionTags(prefix, entityType, name)
      const environmentTagsInfo = await this.tagManager.getEnvironmentTags(prefix, entityType, name)

      // Apply limit and extract slot names
      const limitedVersions = limit ? versionTagsInfo.slice(-limit) : versionTagsInfo
      const versions = limitedVersions.map((tag) => tag.slot)
      const environmentTags = environmentTagsInfo.map((tag) => tag.slot)

      console.log(`  - name: ${name}`)
      console.log(`    type: ${component.type}`)
      console.log(`    path: ${component.path}`)
      console.log('    versions:')
      for (const version of versions) {
        console.log(`      - ${version}`)
      }
      if (environmentTags.length > 0) {
        console.log('    environmentTags:')
        for (const tag of environmentTags) {
          console.log(`      - ${tag}`)
        }
      }
    }
  }

  /**
   * List components in tree format
   */
  private async listComponentsTree(
    componentEntries: ComponentEntry[],
    limit?: number
  ): Promise<void> {
    console.log('\nRepository Components:\n')

    // Group by type
    const byType = componentEntries.reduce(
      (acc, { name, component }) => {
        if (!acc[component.type]) acc[component.type] = []
        acc[component.type]!.push({ name, component })
        return acc
      },
      {} as Record<string, ComponentEntry[]>
    )

    const types = Object.keys(byType)
    for (let typeIdx = 0; typeIdx < types.length; typeIdx++) {
      const type = types[typeIdx]!
      const components = byType[type]!
      const isLastType = typeIdx === types.length - 1

      console.log(`${isLastType ? '└─' : '├─'} ${type} (${components.length} components)`)

      for (let compIdx = 0; compIdx < components.length; compIdx++) {
        const { name, component } = components[compIdx]!
        const isLastComp = compIdx === components.length - 1

        const entityType = componentTypeToEntityType(component.type)
        const prefix = inferPrefixFromPath(component.path)
        const versionTagsInfo = await this.tagManager.getVersionTags(prefix, entityType, name)
        const environmentTagsInfo = await this.tagManager.getEnvironmentTags(
          prefix,
          entityType,
          name
        )

        // Apply limit
        const limitedVersions = limit ? versionTagsInfo.slice(-limit) : versionTagsInfo

        const prefix_str = isLastType ? '   ' : '│  '
        console.log(`${prefix_str}${isLastComp ? '└─' : '├─'} ${name}`)

        // Show versions
        for (let verIdx = 0; verIdx < limitedVersions.length; verIdx++) {
          const versionInfo = limitedVersions[verIdx]!
          const isLastVer =
            verIdx === limitedVersions.length - 1 && environmentTagsInfo.length === 0

          try {
            const gitTag = this.tagManager.buildTagPath(prefix, entityType, name, versionInfo.slot)
            const tagInfo = await this.tagManager.getTagInfo(gitTag)

            // Handle invalid dates gracefully
            let date = 'unknown'
            if (tagInfo.date) {
              try {
                const dateObj = new Date(tagInfo.date)
                if (!isNaN(dateObj.getTime())) {
                  date = dateObj.toISOString().split('T')[0]!
                }
              } catch {
                // Keep 'unknown' if date parsing fails
              }
            }
            const sha = tagInfo.sha.substring(0, 8)

            // Check if any environment tag points here
            const deployedAs: string[] = []
            for (const envTagInfo of environmentTagsInfo) {
              try {
                const envSHA = await this.tagManager.getTagSHA(
                  prefix,
                  entityType,
                  name,
                  envTagInfo.slot
                )
                if (process.env.DEBUG) {
                  console.error(
                    `  [DEBUG] Comparing: version ${versionInfo.slot} SHA=${tagInfo.sha} vs ${envTagInfo.slot} SHA=${envSHA}`
                  )
                }
                if (envSHA === tagInfo.sha) {
                  deployedAs.push(envTagInfo.slot)
                }
              } catch (error) {
                if (process.env.DEBUG) {
                  console.error(`  [DEBUG] Error getting SHA for ${envTagInfo.slot}:`, error)
                }
              }
            }

            const deployBadge = deployedAs.length > 0 ? ` ← ${deployedAs.join(', ')}` : ''
            const innerPrefix = isLastComp ? '      ' : '│     '
            console.log(
              `${prefix_str}${innerPrefix}${isLastVer ? '└─' : '├─'} ${versionInfo.slot} (${sha}, ${date})${deployBadge}`
            )
          } catch (error) {
            // If getTagInfo fails, show version without metadata
            const innerPrefix = isLastComp ? '      ' : '│     '
            console.log(`${prefix_str}${innerPrefix}${isLastVer ? '└─' : '├─'} ${versionInfo.slot}`)
            // Debug: Log error to help diagnose issues
            if (process.env.DEBUG) {
              console.error(`  [DEBUG] Error getting tag info for ${versionInfo.slot}:`, error)
            }
          }
        }
      }
      console.log('')
    }
  }

  /**
   * Show detailed information about a specific component
   */
  private async showComponent(
    registry: ComponentRegistry,
    componentName: string,
    flags: Record<string, boolean | string | number>
  ): Promise<void> {
    const component = ComponentUtils.findComponentByName(registry, componentName)

    if (!component) {
      throw new Error(`Component '${componentName}' not found`)
    }

    console.log(`\n📦 ${componentName}\n`)
    console.log(`Path: ${component.path}`)
    console.log(`Type: ${component.type}`)

    const entityType = componentTypeToEntityType(component.type)
    const prefix = inferPrefixFromPath(component.path)

    try {
      // Get all tags for this component
      const allTagsInfo = await this.tagManager.listTags(prefix, entityType, componentName)
      const versionTagsInfo = await this.tagManager.getVersionTags(
        prefix,
        entityType,
        componentName
      )
      const environmentTagsInfo = await this.tagManager.getEnvironmentTags(
        prefix,
        entityType,
        componentName
      )

      // Show version tags
      if (versionTagsInfo.length > 0) {
        console.log('\n🏷️  Version Tags:')
        for (const versionInfo of versionTagsInfo) {
          try {
            const gitTag = this.tagManager.buildTagPath(
              prefix,
              entityType,
              componentName,
              versionInfo.slot
            )
            const tagInfo = await this.tagManager.getTagInfo(gitTag)
            console.log(
              `   ${versionInfo.slot} - ${tagInfo.sha.substring(0, 8)} - ${tagInfo.date} - ${tagInfo.message}`
            )
          } catch {
            console.log(`   ${versionInfo.slot} - (error getting info)`)
          }
        }
      }

      // Show environment tags
      if (environmentTagsInfo.length > 0) {
        console.log('\n🚀 Environment Tags:')
        for (const envInfo of environmentTagsInfo) {
          try {
            const gitTag = this.tagManager.buildTagPath(
              prefix,
              entityType,
              componentName,
              envInfo.slot
            )
            const tagInfo = await this.tagManager.getTagInfo(gitTag)

            // Find which version this points to
            let pointsToVersion = 'custom'
            for (const versionInfo of versionTagsInfo) {
              try {
                const versionSHA = await this.tagManager.getTagSHA(
                  prefix,
                  entityType,
                  componentName,
                  versionInfo.slot
                )
                if (versionSHA === tagInfo.sha) {
                  pointsToVersion = versionInfo.slot
                  break
                }
              } catch {
                // Continue searching
              }
            }

            console.log(
              `   ${envInfo.slot} → ${pointsToVersion} (${tagInfo.sha.substring(0, 8)}) - ${tagInfo.date}`
            )
          } catch {
            console.log(`   ${envInfo.slot} - (error getting info)`)
          }
        }
      }

      // Show custom tags (tags that are neither version nor environment)
      const customTagsInfo = allTagsInfo.filter(
        (tagInfo) =>
          !versionTagsInfo.some((v) => v.slot === tagInfo.slot) &&
          !environmentTagsInfo.some((e) => e.slot === tagInfo.slot)
      )

      if (customTagsInfo.length > 0) {
        console.log('\n🏷️  Custom Tags:')
        for (const customInfo of customTagsInfo) {
          try {
            const gitTag = this.tagManager.buildTagPath(
              prefix,
              entityType,
              componentName,
              customInfo.slot
            )
            const tagInfo = await this.tagManager.getTagInfo(gitTag)
            console.log(
              `   ${customInfo.slot} - ${tagInfo.sha.substring(0, 8)} - ${tagInfo.date} - ${tagInfo.message}`
            )
          } catch {
            console.log(`   ${customInfo.slot} - (error getting info)`)
          }
        }
      }

      if (allTagsInfo.length === 0) {
        console.log('\n⚠️  No tags found for this component')
        console.log(`   Create tags with: edgit tag ${componentName} <tagname>`)
      }

      // Show file content if requested
      if (flags.content || flags.c) {
        console.log('\n📄 Current Content:')
        try {
          const repoRoot = await this.git.getRepoRoot()
          if (repoRoot) {
            const filePath = path.join(repoRoot, component.path)
            const content = await fs.readFile(filePath, 'utf-8')
            console.log(content)
          }
        } catch (error) {
          console.log(`   Error reading file: ${error instanceof Error ? error.message : error}`)
        }
      }
    } catch (error) {
      console.log(
        `\n⚠️  Error getting Git tag information: ${error instanceof Error ? error.message : error}`
      )
    }

    console.log('\n💡 Commands:')
    console.log(`   edgit tag ${componentName} v1.0.0          # Create version tag`)
    console.log(`   edgit tag ${componentName} prod            # Create environment tag`)
    console.log(`   edgit checkout ${componentName}@v1.0.0     # Checkout specific version`)
    console.log(
      `   edgit tag set ${componentName} prod v1.0.0 && edgit push --tags --force # Deploy version`
    )
  }

  /**
   * Checkout a component at a specific version/tag/SHA
   */
  private async checkoutComponent(
    registry: ComponentRegistry,
    componentSpec: string,
    flags: Record<string, boolean | string | number>
  ): Promise<void> {
    const spec = ComponentSpecParser.parse(componentSpec)
    const component = ComponentUtils.findComponentByName(registry, spec.name)

    if (!component) {
      throw new Error(`Component '${spec.name}' not found`)
    }

    try {
      let content: string

      if (spec.ref) {
        // Checkout specific version/tag/SHA
        const entityType = componentTypeToEntityType(component.type)
        const prefix = inferPrefixFromPath(component.path)
        content = await this.tagManager.getFileAtTag(
          prefix,
          entityType,
          spec.name,
          spec.ref,
          component.path
        )
        console.log(`📦 ${spec.name}@${spec.ref}:`)
      } else {
        // Checkout current version (HEAD)
        const repoRoot = await this.git.getRepoRoot()
        if (!repoRoot) {
          throw new Error('Not in a git repository')
        }
        const filePath = path.join(repoRoot, component.path)
        content = await fs.readFile(filePath, 'utf-8')
        console.log(`📦 ${spec.name} (current):`)
      }

      console.log('')
      console.log(content)
    } catch (error) {
      throw new Error(
        `Failed to checkout ${componentSpec}: ${error instanceof Error ? error.message : error}`
      )
    }
  }

  /**
   * Add a new component to the registry
   */
  private async addComponent(
    registry: ComponentRegistry,
    name: string,
    filePath: string,
    type?: string,
    flags?: Record<string, boolean | string | number>
  ): Promise<void> {
    // Validate component doesn't already exist
    if (ComponentUtils.componentExists(registry, name)) {
      throw new Error(`Component '${name}' already exists`)
    }

    // Validate file exists
    const repoRoot = await this.git.getRepoRoot()
    if (!repoRoot) {
      throw new Error('Not in a git repository')
    }

    const fullPath = path.resolve(repoRoot, filePath)
    try {
      await fs.access(fullPath)
    } catch {
      throw new Error(`File not found: ${filePath}`)
    }

    // Determine type if not provided
    let componentType = type
    if (!componentType) {
      // Simple type detection based on file extension
      const ext = path.extname(filePath).toLowerCase()
      if (ext === '.md' || ext === '.txt') {
        componentType = 'prompt'
      } else if (ext === '.js' || ext === '.ts') {
        componentType = 'agent'
      } else if (ext === '.sql') {
        componentType = 'sql'
      } else if (ext === '.json' || ext === '.yaml' || ext === '.yml') {
        componentType = 'config'
      } else {
        throw new Error(
          'Could not determine component type. Please specify: prompt, agent, sql, or config'
        )
      }
    }

    // Validate type
    const validTypes: ComponentType[] = ['prompt', 'script', 'query', 'config']
    if (!validTypes.includes(componentType as ComponentType)) {
      throw new Error(`Invalid component type. Must be one of: ${validTypes.join(', ')}`)
    }

    // Create component
    const component = ComponentUtils.createComponent(filePath, componentType as ComponentType)

    // Add to registry
    ComponentUtils.addComponent(registry, name, component)
    await this.saveComponentsRegistry(registry)

    console.log(`✅ Added component '${name}'`)
    console.log(`   Path: ${filePath}`)
    console.log(`   Type: ${componentType}`)
    console.log('\n💡 Next steps:')
    console.log(`   edgit tag ${name} v1.0.0     # Create first version tag`)
    console.log(`   edgit tag ${name} prod       # Create environment tag`)
  }

  /**
   * Remove a component from the registry
   */
  private async removeComponent(
    registry: ComponentRegistry,
    componentName: string,
    flags: Record<string, boolean | string | number>
  ): Promise<void> {
    if (!ComponentUtils.componentExists(registry, componentName)) {
      throw new Error(`Component '${componentName}' not found`)
    }

    // Warn about Git tags
    const component = ComponentUtils.findComponentByName(registry, componentName)
    if (component) {
      try {
        const entityType = componentTypeToEntityType(component.type)
        const prefix = inferPrefixFromPath(component.path)
        const tagsInfo = await this.tagManager.listTags(prefix, entityType, componentName)
        if (tagsInfo.length > 0 && !flags.force) {
          const tagSlots = tagsInfo.map((t) => t.slot)
          console.log(`⚠️  Component '${componentName}' has ${tagsInfo.length} Git tags:`)
          console.log(`   ${tagSlots.join(', ')}`)
          console.log('\n   Use --force to remove anyway (Git tags will remain)')
          console.log('   Or manually delete tags first with: edgit tag delete <component>@<tag>')
          return
        }
      } catch {
        // Continue if we can't get tag info
      }
    }

    ComponentUtils.removeComponent(registry, componentName)
    await this.saveComponentsRegistry(registry)

    console.log(`✅ Removed component '${componentName}' from registry`)
    console.log('   Note: Git tags for this component still exist')
    console.log(`   Use: edgit tag list ${componentName} to see them`)
  }

  /**
   * Show a summary of a component (used in listings)
   */
  private async showComponentSummary(
    name: string,
    component: Component & { untracked?: boolean },
    verbose: boolean,
    limit?: number
  ): Promise<void> {
    try {
      const entityType = componentTypeToEntityType(component.type)
      const prefix = inferPrefixFromPath(component.path)
      const allVersionTagsInfo = await this.tagManager.getVersionTags(prefix, entityType, name)
      const environmentTagsInfo = await this.tagManager.getEnvironmentTags(prefix, entityType, name)

      // Apply limit if specified
      const limitedVersionTagsInfo =
        limit && limit > 0 ? allVersionTagsInfo.slice(-limit) : allVersionTagsInfo

      let latestVersion = 'none'
      if (allVersionTagsInfo.length > 0) {
        latestVersion = allVersionTagsInfo[allVersionTagsInfo.length - 1]?.slot || 'none'
      }

      if (verbose) {
        console.log(`📦 ${name}`)
        console.log(`   Type: ${component.type}`)
        console.log(`   Path: ${component.path}`)
        console.log(`   Latest: ${latestVersion}`)
        console.log(
          `   Versions: ${allVersionTagsInfo.length}${limit ? ` (showing ${limitedVersionTagsInfo.length})` : ''}`
        )

        if (environmentTagsInfo.length > 0) {
          const envSlots = environmentTagsInfo.map((t) => t.slot)
          console.log(`   Environments: ${envSlots.join(', ')}`)
        }
      } else {
        const envSlots = environmentTagsInfo.map((t) => t.slot)
        const deployInfo = envSlots.length > 0 ? ` [${envSlots.join(',')}]` : ''
        const limitInfo = limit && allVersionTagsInfo.length > limit ? ` (showing ${limit})` : ''
        console.log(
          `   📦 ${name}: ${latestVersion} (${allVersionTagsInfo.length} versions${limitInfo})${deployInfo}`
        )
      }
    } catch (error) {
      // Fallback if Git tag operations fail
      if (verbose) {
        console.log(`📦 ${name}`)
        console.log(`   Type: ${component.type}`)
        console.log(`   Path: ${component.path}`)
        console.log('   Tags: error getting info')
      } else {
        console.log(`   📦 ${name}: (error getting tag info)`)
      }
    }
  }

  // Utility methods

  private async loadComponentsRegistry(): Promise<ComponentRegistry> {
    const repoRoot = await this.git.getRepoRoot()
    if (!repoRoot) {
      throw new Error('Not in a git repository')
    }

    const loader = createRegistryLoader(repoRoot)
    const result = await loader.load()

    if (!result.ok) {
      if (result.error.kind === 'not_initialized') {
        throw new Error('Edgit not initialized. Run "edgit init" first.')
      }
      throw new Error(result.error.message)
    }

    return result.value
  }

  private async saveComponentsRegistry(registry: ComponentRegistry): Promise<void> {
    const repoRoot = await this.git.getRepoRoot()
    if (!repoRoot) {
      throw new Error('Not in a git repository')
    }

    const loader = createRegistryLoader(repoRoot)
    const updatedRegistry = ComponentUtils.updateRegistry(registry)
    const result = await loader.save(updatedRegistry)

    if (!result.ok) {
      throw new Error(result.error.message)
    }
  }

  getHelp(): string {
    return `
edgit components - Manage components using Git tags

USAGE:
  edgit components [subcommand] [options]
  edgit components list [options]           List all components
  edgit components show <component> [--content] Show component details
  edgit components checkout <component>[@ref] Checkout component content
  edgit components add <name> <path> [type] Add new component
  edgit components remove <name> [--force]  Remove component

SUBCOMMANDS:
  list, ls          List all components with Git tag information
  show <component>  Show detailed component information with all tags
  checkout <spec>   Show content of component at specific version/tag
  add <name> <path> [type] Add a new component to the registry
  remove <name>     Remove component from registry (Git tags remain)

COMPONENT SPECIFICATIONS:
  component-name                    Show current version
  component-name@v1.0.0            Show specific version tag
  component-name@prod               Show environment tag
  component-name@abc123             Show specific SHA

COMPONENT TYPES:
  prompt            Prompt templates (.md, .txt)
  agent             Code/scripts (.js, .ts)
  sql               SQL queries (.sql)
  config            Configuration (.json, .yaml, .yml)

OPTIONS:
  --verbose, -v     Show detailed information
  --content, -c     Show file content (with show command)
  --force           Force operation (bypass warnings)
  --type <type>     Filter by component type (list command)
  --tracked         Show only tracked components (list command)
  --untracked       Show only untracked components (list command)
  --tags-only       Show only components with version tags (list command)
  --limit <n>       Max versions to show per component (list command, default: all)
  --format <fmt>    Output format: table (default), json, yaml, tree (list command)

EXAMPLES:
  edgit components                          # List all components (table format)
  edgit components list --format json       # List in JSON format
  edgit components list --format tree       # List in tree format with hierarchy
  edgit components list --type prompt       # List only prompt components
  edgit components list --tags-only         # List only versioned components
  edgit components list --limit 5           # Show max 5 versions per component
  edgit components list --tracked           # Show only tracked components
  edgit components show extraction-prompt   # Show component details
  edgit components checkout extraction-prompt@v1.0.0 # Show specific version
  edgit components add my-prompt prompts/test.md prompt # Add new component
  edgit components remove old-component     # Remove component

INTEGRATION:
  This command works with Git tags created by:
  - edgit tag <component> <version>         # Create version tags
  - edgit tag set <component> <env> <version>  # Set environment tag
  - edgit push --tags --force                 # Push to remote

NOTE:
  Components are stored in .edgit/components.json as a minimal manifest.
  All versioning information comes from Git tags, not the registry file.

  Tag Prefix Logic:
  - 'components' prefix: Prompts, configs, etc. (syncs to KV on push)
  - 'logic' prefix: Workers, handlers, routers (triggers rebuild on push)

  The prefix is automatically inferred from the component's file path.
`
  }
}
