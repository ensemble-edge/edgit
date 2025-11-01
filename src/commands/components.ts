import * as fs from 'fs/promises'
import * as path from 'path'
import { Command } from './base.js'
import { GitWrapper } from '../utils/git.js'
import type { GitTagManager } from '../utils/git-tags.js'
import { createGitTagManager } from '../utils/git-tags.js'
import type { ComponentRegistry } from '../models/components.js'
import { ComponentUtils, ComponentSpec, ComponentSpecParser } from '../models/components.js'
import { createRegistryLoader } from '../utils/registry.js'

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

      const { flags, positional } = this.parseArgs(args)
      const [subcommand, ...subArgs] = positional

      // Load components registry
      const registry = await this.loadComponentsRegistry()

      if (!subcommand || subcommand === 'list' || subcommand === 'ls') {
        await this.listComponents(registry, flags)
      } else if (subcommand === 'show') {
        if (!subArgs[0]) {
          throw new Error('Component name is required for show command')
        }
        await this.showComponent(registry, subArgs[0], flags)
      } else if (subcommand === 'checkout') {
        if (!subArgs[0]) {
          throw new Error('Component specification is required for checkout command')
        }
        await this.checkoutComponent(registry, subArgs[0], flags)
      } else if (subcommand === 'add') {
        if (!subArgs[0] || !subArgs[1]) {
          throw new Error('Component name and path are required for add command')
        }
        await this.addComponent(registry, subArgs[0], subArgs[1], subArgs[2], flags)
      } else if (subcommand === 'remove' || subcommand === 'rm') {
        if (!subArgs[0]) {
          throw new Error('Component name is required for remove command')
        }
        await this.removeComponent(registry, subArgs[0], flags)
      } else {
        // Treat as component name for show
        await this.showComponent(registry, subcommand, flags)
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
    flags: Record<string, boolean>
  ): Promise<void> {
    const componentEntries = ComponentUtils.getAllComponents(registry)

    if (componentEntries.length === 0) {
      this.showInfo(
        'No components found. Add components with "edgit components add <name> <path> <type>".'
      )
      return
    }

    console.log(`\n🧩 Components (${componentEntries.length} total):\n`)

    if (flags.verbose || flags.v) {
      // Verbose listing with Git tag details
      for (const { name, component } of componentEntries) {
        await this.showComponentSummary(name, component, true)
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
        {} as Record<string, Array<{ name: string; component: any }>>
      )

      for (const [type, components] of Object.entries(byType)) {
        console.log(`📁 ${type}:`)
        for (const { name, component } of components) {
          await this.showComponentSummary(name, component, false)
        }
        console.log('')
      }
    }
  }

  /**
   * Show detailed information about a specific component
   */
  private async showComponent(
    registry: ComponentRegistry,
    componentName: string,
    flags: Record<string, boolean>
  ): Promise<void> {
    const component = ComponentUtils.findComponentByName(registry, componentName)

    if (!component) {
      throw new Error(`Component '${componentName}' not found`)
    }

    console.log(`\n📦 ${componentName}\n`)
    console.log(`Path: ${component.path}`)
    console.log(`Type: ${component.type}`)

    try {
      // Get all tags for this component
      const allTags = await this.tagManager.listComponentTags(componentName)
      const versionTags = await this.tagManager.getVersionTags(componentName)
      const deploymentTags = await this.tagManager.getDeploymentTags(componentName)

      // Show version tags
      if (versionTags.length > 0) {
        console.log('\n🏷️  Version Tags:')
        for (const version of versionTags) {
          try {
            const tagInfo = await this.tagManager.getTagInfo(componentName, version)
            console.log(
              `   ${version} - ${tagInfo.sha.substring(0, 8)} - ${tagInfo.date} - ${tagInfo.message}`
            )
          } catch {
            console.log(`   ${version} - (error getting info)`)
          }
        }
      }

      // Show deployment tags
      if (deploymentTags.length > 0) {
        console.log('\n🚀 Deployment Tags:')
        for (const env of deploymentTags) {
          try {
            const tagInfo = await this.tagManager.getTagInfo(componentName, env)

            // Find which version this points to
            let pointsToVersion = 'custom'
            for (const version of versionTags) {
              try {
                const versionSHA = await this.tagManager.getTagSHA(componentName, version)
                if (versionSHA === tagInfo.sha) {
                  pointsToVersion = version
                  break
                }
              } catch {
                // Continue searching
              }
            }

            console.log(
              `   ${env} → ${pointsToVersion} (${tagInfo.sha.substring(0, 8)}) - ${tagInfo.date}`
            )
          } catch {
            console.log(`   ${env} - (error getting info)`)
          }
        }
      }

      // Show custom tags
      const customTags = allTags.filter(
        (tag) => !versionTags.includes(tag) && !deploymentTags.includes(tag)
      )

      if (customTags.length > 0) {
        console.log('\n🏷️  Custom Tags:')
        for (const tag of customTags) {
          try {
            const tagInfo = await this.tagManager.getTagInfo(componentName, tag)
            console.log(
              `   ${tag} - ${tagInfo.sha.substring(0, 8)} - ${tagInfo.date} - ${tagInfo.message}`
            )
          } catch {
            console.log(`   ${tag} - (error getting info)`)
          }
        }
      }

      if (allTags.length === 0) {
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
    console.log(`   edgit tag ${componentName} prod            # Create deployment tag`)
    console.log(`   edgit checkout ${componentName}@v1.0.0     # Checkout specific version`)
    console.log(`   edgit deploy ${componentName} v1.0.0 --to prod # Deploy version`)
  }

  /**
   * Checkout a component at a specific version/tag/SHA
   */
  private async checkoutComponent(
    registry: ComponentRegistry,
    componentSpec: string,
    flags: Record<string, boolean>
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
        content = await this.tagManager.getFileAtTag(spec.name, spec.ref, component.path)
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
    flags?: Record<string, boolean>
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
    const validTypes = ['prompt', 'agent', 'sql', 'config']
    if (!validTypes.includes(componentType)) {
      throw new Error(`Invalid component type. Must be one of: ${validTypes.join(', ')}`)
    }

    // Create component
    const component = ComponentUtils.createComponent(filePath, componentType as any)

    // Add to registry
    ComponentUtils.addComponent(registry, name, component)
    await this.saveComponentsRegistry(registry)

    console.log(`✅ Added component '${name}'`)
    console.log(`   Path: ${filePath}`)
    console.log(`   Type: ${componentType}`)
    console.log('\n💡 Next steps:')
    console.log(`   edgit tag ${name} v1.0.0     # Create first version tag`)
    console.log(`   edgit tag ${name} prod       # Create deployment tag`)
  }

  /**
   * Remove a component from the registry
   */
  private async removeComponent(
    registry: ComponentRegistry,
    componentName: string,
    flags: Record<string, boolean>
  ): Promise<void> {
    if (!ComponentUtils.componentExists(registry, componentName)) {
      throw new Error(`Component '${componentName}' not found`)
    }

    // Warn about Git tags
    try {
      const tags = await this.tagManager.listComponentTags(componentName)
      if (tags.length > 0 && !flags.force) {
        console.log(`⚠️  Component '${componentName}' has ${tags.length} Git tags:`)
        console.log(`   ${tags.join(', ')}`)
        console.log('\n   Use --force to remove anyway (Git tags will remain)')
        console.log('   Or manually delete tags first with: edgit tag delete <component>@<tag>')
        return
      }
    } catch {
      // Continue if we can't get tag info
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
    component: any,
    verbose: boolean
  ): Promise<void> {
    try {
      const versionTags = await this.tagManager.getVersionTags(name)
      const deploymentTags = await this.tagManager.getDeploymentTags(name)

      let latestVersion = 'none'
      if (versionTags.length > 0) {
        latestVersion = versionTags[versionTags.length - 1] || 'none'
      }

      if (verbose) {
        console.log(`📦 ${name}`)
        console.log(`   Type: ${component.type}`)
        console.log(`   Path: ${component.path}`)
        console.log(`   Latest: ${latestVersion}`)
        console.log(`   Versions: ${versionTags.length}`)

        if (deploymentTags.length > 0) {
          console.log(`   Deployments: ${deploymentTags.join(', ')}`)
        }
      } else {
        const deployInfo = deploymentTags.length > 0 ? ` [${deploymentTags.join(',')}]` : ''
        console.log(`   📦 ${name}: ${latestVersion} (${versionTags.length} versions)${deployInfo}`)
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
  edgit components list [--verbose]         List all components
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
  component-name@prod               Show deployment tag
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

EXAMPLES:
  edgit components                          # List all components
  edgit components show extraction-prompt   # Show component details
  edgit components checkout extraction-prompt@v1.0.0 # Show specific version
  edgit components add my-prompt prompts/test.md prompt # Add new component
  edgit components remove old-component     # Remove component

INTEGRATION:
  This command works with Git tags created by:
  - edgit tag <component> <version>         # Create version tags
  - edgit deploy <component> <version> --to <env> # Create deployment tags

NOTE:
  Components are stored in .edgit/components.json as a minimal manifest.
  All versioning information comes from Git tags, not the registry file.
`
  }
}
