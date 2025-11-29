import { Command } from './base.js'
import { GitWrapper } from '../utils/git.js'
import type { GitTagManager, EntityType } from '../utils/git-tags.js'
import { createGitTagManager } from '../utils/git-tags.js'
import type { ComponentRegistry, ComponentType, Component } from '../models/components.js'
import { ComponentUtils } from '../models/components.js'
import { EdgitError } from '../errors/index.js'
import * as fs from 'fs/promises'
import * as path from 'path'

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

/** Output format options */
type OutputFormat = 'table' | 'json'

/**
 * Tag command for creating and managing component version and deployment tags
 * Replaces stored versioning with Git's native tag system
 */
export class TagCommand extends Command {
  private tagManager: GitTagManager

  constructor() {
    super()
    this.tagManager = createGitTagManager(this.git)
  }

  /**
   * Extract --format option from args
   */
  private extractFormat(args: string[]): { format: OutputFormat; cleanArgs: string[] } {
    const formatIndex = args.indexOf('--format')
    if (formatIndex !== -1 && args[formatIndex + 1]) {
      const format = args[formatIndex + 1] as OutputFormat
      const cleanArgs = [...args.slice(0, formatIndex), ...args.slice(formatIndex + 2)]
      return { format: format === 'json' ? 'json' : 'table', cleanArgs }
    }
    return { format: 'table', cleanArgs: args }
  }

  async execute(args: string[]): Promise<void> {
    if (args.length === 0) {
      await this.showHelp()
      return
    }

    const subcommand = args[0]

    switch (subcommand) {
      case 'create':
        await this.createTag(args.slice(1))
        break
      case 'list':
        await this.listTags(args.slice(1))
        break
      case 'show':
        await this.showTag(args.slice(1))
        break
      case 'delete':
        await this.deleteTag(args.slice(1))
        break
      case 'push':
        await this.pushTags(args.slice(1))
        break
      default:
        // Default behavior: create tag
        await this.createTag(args)
    }
  }

  /**
   * Create a version or deployment tag
   * Usage: edgit tag create <component> <tagname> [sha]
   *        edgit tag <component> <tagname> [sha]
   */
  async createTag(args: string[]): Promise<void> {
    if (args.length < 2) {
      throw new EdgitError(
        'VALIDATION_ERROR',
        'Usage: edgit tag create <component> <tagname> [sha]'
      )
    }

    const componentName = args[0]
    const tagName = args[1]
    const sha = args[2]

    if (!componentName || !tagName) {
      throw new EdgitError('VALIDATION_ERROR', 'Component name and tag name are required')
    }

    // Load registry to verify component exists
    const registry = await this.loadRegistry()
    const component = ComponentUtils.findComponentByName(registry, componentName)

    if (!component) {
      const available = ComponentUtils.listComponentNames(registry).join(', ')
      throw new EdgitError(
        'COMPONENT_NOT_FOUND',
        `Component '${componentName}' not found. Available: ${available}`
      )
    }

    // Get the entity type from the component's actual type
    const entityType = componentTypeToEntityType(component.type)

    try {
      // Check if it's a version tag or deployment tag
      if (this.isVersionTag(tagName)) {
        await this.createVersionTag(componentName, tagName, entityType, sha)
      } else if (this.isDeploymentTag(tagName)) {
        await this.createDeploymentTag(componentName, tagName, entityType, sha)
      } else {
        await this.createCustomTag(componentName, tagName, entityType, sha)
      }
    } catch (error) {
      throw EdgitError.from(error, 'TAG_EXISTS')
    }
  }

  /**
   * Create an immutable version tag (v1.0.0)
   */
  async createVersionTag(
    componentName: string,
    version: string,
    entityType: EntityType,
    sha?: string
  ): Promise<void> {
    const gitTag = await this.tagManager.createVersionTag(
      componentName,
      version,
      entityType,
      sha,
      `Release ${componentName} ${version}`
    )

    console.log(`✅ Created version tag: ${componentName}@${version}`)
    console.log(`   Git tag: ${gitTag}`)

    if (sha) {
      console.log(`   SHA: ${sha}`)
    }

    console.log(`\n💡 Push with: git push origin ${gitTag}`)
  }

  /**
   * Create or move a deployment tag (prod, staging, etc.)
   */
  async createDeploymentTag(
    componentName: string,
    env: string,
    entityType: EntityType,
    targetRef?: string
  ): Promise<void> {
    const target = targetRef || 'HEAD'

    const gitTag = await this.tagManager.moveDeploymentTag(
      componentName,
      env,
      target,
      entityType,
      `Deploy ${componentName} to ${env}`
    )

    console.log(`✅ ${targetRef ? 'Moved' : 'Created'} deployment tag: ${componentName}@${env}`)
    console.log(`   Git tag: ${gitTag}`)
    console.log(`   Points to: ${target}`)

    console.log(`\n💡 Push with: git push origin ${gitTag} --force`)
  }

  /**
   * Create a custom tag
   */
  async createCustomTag(
    componentName: string,
    tagName: string,
    entityType: EntityType,
    sha?: string
  ): Promise<void> {
    const gitTag = await this.tagManager.tag(
      componentName,
      tagName,
      entityType,
      sha,
      `Tag ${componentName} as ${tagName}`
    )

    console.log(`✅ Created custom tag: ${componentName}@${tagName}`)
    console.log(`   Git tag: ${gitTag}`)

    if (sha) {
      console.log(`   SHA: ${sha}`)
    }

    console.log(`\n💡 Push with: git push origin ${gitTag}`)
  }

  /**
   * List tags for a component or all components
   * Usage: edgit tag list [component] [--format json]
   */
  async listTags(args: string[]): Promise<void> {
    const { format, cleanArgs } = this.extractFormat(args)
    const registry = await this.loadRegistry()

    if (cleanArgs.length === 0) {
      // List all components and their tags
      await this.listAllComponentTags(registry, format)
    } else {
      // List tags for specific component
      const componentName = cleanArgs[0]
      if (!componentName) {
        throw new EdgitError('VALIDATION_ERROR', 'Component name is required')
      }
      await this.listComponentTags(componentName, registry, true, format)
    }
  }

  /**
   * Show detailed information about a specific tag
   * Usage: edgit tag show <component>@<tag> [--format json]
   */
  async showTag(args: string[]): Promise<void> {
    const { format, cleanArgs } = this.extractFormat(args)

    if (cleanArgs.length === 0) {
      throw new EdgitError('VALIDATION_ERROR', 'Usage: edgit tag show <component>@<tag>')
    }

    const spec = cleanArgs[0]
    if (!spec) {
      throw new EdgitError('VALIDATION_ERROR', 'Usage: edgit tag show <component>@<tag>')
    }

    const parts = spec.split('@')

    if (parts.length !== 2) {
      throw new EdgitError('VALIDATION_ERROR', 'Usage: edgit tag show <component>@<tag>')
    }

    const componentName = parts[0]
    const tagName = parts[1]

    if (!componentName || !tagName) {
      throw new EdgitError('VALIDATION_ERROR', 'Usage: edgit tag show <component>@<tag>')
    }

    // Verify component exists
    const registry = await this.loadRegistry()
    const component = ComponentUtils.findComponentByName(registry, componentName)

    if (!component) {
      throw new EdgitError('COMPONENT_NOT_FOUND', `Component '${componentName}' not found`)
    }

    // Get the entity type from the component's actual type for type-specific namespaces
    const entityType = componentTypeToEntityType(component.type)

    try {
      const tagInfo = await this.tagManager.getTagInfo(componentName, tagName, entityType)

      if (format === 'json') {
        const output = {
          component: componentName,
          tag: tagName,
          sha: tagInfo.sha,
          date: tagInfo.date,
          author: tagInfo.author,
          message: tagInfo.message,
          path: component.path,
          type: component.type,
          isVersion: this.isVersionTag(tagName),
          isDeployment: this.isDeploymentTag(tagName),
        }
        console.log(JSON.stringify(output, null, 2))
        return
      }

      // Table output (default)
      console.log(`📦 ${componentName}@${tagName}`)
      console.log(`   SHA: ${tagInfo.sha}`)
      console.log(`   Date: ${tagInfo.date}`)
      console.log(`   Author: ${tagInfo.author}`)
      console.log(`   Message: ${tagInfo.message}`)

      // Show file path
      console.log(`   File: ${component.path}`)
      console.log(`   Type: ${component.type}`)
    } catch (error) {
      throw new EdgitError('TAG_NOT_FOUND', `Tag not found: ${componentName}@${tagName}`)
    }
  }

  /**
   * Delete a tag
   * Usage: edgit tag delete <component>@<tag> [--remote]
   */
  async deleteTag(args: string[]): Promise<void> {
    if (args.length === 0) {
      throw new EdgitError(
        'VALIDATION_ERROR',
        'Usage: edgit tag delete <component>@<tag> [--remote]'
      )
    }

    const spec = args[0]
    if (!spec) {
      throw new EdgitError(
        'VALIDATION_ERROR',
        'Usage: edgit tag delete <component>@<tag> [--remote]'
      )
    }

    const deleteRemote = args.includes('--remote')
    const parts = spec.split('@')

    if (parts.length !== 2) {
      throw new EdgitError(
        'VALIDATION_ERROR',
        'Usage: edgit tag delete <component>@<tag> [--remote]'
      )
    }

    const componentName = parts[0]
    const tagName = parts[1]

    if (!componentName || !tagName) {
      throw new EdgitError(
        'VALIDATION_ERROR',
        'Usage: edgit tag delete <component>@<tag> [--remote]'
      )
    }

    // Verify component exists
    const registry = await this.loadRegistry()
    const component = ComponentUtils.findComponentByName(registry, componentName)

    if (!component) {
      throw new EdgitError('COMPONENT_NOT_FOUND', `Component '${componentName}' not found`)
    }

    const entityType = componentTypeToEntityType(component.type)

    try {
      await this.tagManager.deleteTag(componentName, tagName, entityType, deleteRemote)
      console.log(`✅ Deleted tag: ${componentName}@${tagName}`)

      if (deleteRemote) {
        console.log('   Also deleted from remote')
      }
    } catch (error) {
      throw EdgitError.from(error, 'TAG_NOT_FOUND')
    }
  }

  /**
   * Push tags to remote
   * Usage: edgit tag push [component] [--force]
   */
  async pushTags(args: string[]): Promise<void> {
    const force = args.includes('--force')
    const componentName = args.find((arg) => arg !== '--force')

    const registry = await this.loadRegistry()

    if (componentName) {
      // Push tags for specific component
      const component = ComponentUtils.findComponentByName(registry, componentName)

      if (!component) {
        throw new EdgitError('COMPONENT_NOT_FOUND', `Component '${componentName}' not found`)
      }

      const entityType = componentTypeToEntityType(component.type)

      try {
        await this.tagManager.pushTags(componentName, entityType, undefined, force)
        console.log(`✅ Pushed tags for ${componentName}`)
      } catch (error) {
        throw EdgitError.from(error, 'GIT_ERROR')
      }
    } else {
      // Push all component tags
      const allComponents = ComponentUtils.getAllComponents(registry)

      for (const { name, component } of allComponents) {
        const entityType = componentTypeToEntityType(component.type)
        try {
          await this.tagManager.pushTags(name, entityType, undefined, force)
          console.log(`✅ Pushed tags for ${name}`)
        } catch (error) {
          console.warn(
            `⚠️  Warning: Failed to push tags for ${name}: ${error instanceof Error ? error.message : error}`
          )
        }
      }
    }
  }

  // Helper methods

  /**
   * Check if tag name is a version tag (v1.0.0, 1.0.0)
   */
  private isVersionTag(tagName: string): boolean {
    return /^v?\d+\.\d+\.\d+/.test(tagName)
  }

  /**
   * Check if tag name is a deployment tag
   */
  private isDeploymentTag(tagName: string): boolean {
    const deploymentTags = ['prod', 'staging', 'canary', 'latest', 'dev', 'test']
    return deploymentTags.includes(tagName)
  }

  /**
   * List tags for all components
   */
  private async listAllComponentTags(
    registry: ComponentRegistry,
    format: OutputFormat = 'table'
  ): Promise<void> {
    const componentNames = ComponentUtils.listComponentNames(registry)

    if (format === 'json') {
      const components: Array<{
        name: string
        type: string
        path: string
        versions: string[]
        deployments: string[]
        custom: string[]
      }> = []

      for (const componentName of componentNames) {
        const data = await this.getComponentTagData(componentName, registry)
        if (data) {
          components.push(data)
        }
      }

      console.log(JSON.stringify({ components, total: components.length }, null, 2))
      return
    }

    // Table output (default)
    if (componentNames.length === 0) {
      console.log('No components registered')
      return
    }

    console.log('📦 Component Tags:\n')

    for (const componentName of componentNames) {
      await this.listComponentTags(componentName, registry, false, format)
      console.log() // Empty line between components
    }
  }

  /**
   * Get tag data for a component (used for JSON output)
   */
  private async getComponentTagData(
    componentName: string,
    registry: ComponentRegistry
  ): Promise<{
    name: string
    type: string
    path: string
    versions: string[]
    deployments: string[]
    custom: string[]
  } | null> {
    const component = ComponentUtils.findComponentByName(registry, componentName)
    if (!component) return null

    const entityType = componentTypeToEntityType(component.type)

    try {
      const allTags = await this.tagManager.listTags(componentName, entityType)
      const versionTags = await this.tagManager.getVersionTags(componentName, entityType)
      const deploymentTags = await this.tagManager.getDeploymentTags(componentName, entityType)
      const customTags = allTags.filter(
        (tag) => !this.isVersionTag(tag) && !this.isDeploymentTag(tag)
      )

      return {
        name: componentName,
        type: component.type,
        path: component.path,
        versions: versionTags,
        deployments: deploymentTags,
        custom: customTags,
      }
    } catch {
      return {
        name: componentName,
        type: component.type,
        path: component.path,
        versions: [],
        deployments: [],
        custom: [],
      }
    }
  }

  /**
   * List tags for a specific component
   */
  private async listComponentTags(
    componentName: string,
    registry: ComponentRegistry,
    standalone: boolean = true,
    format: OutputFormat = 'table'
  ): Promise<void> {
    const component = ComponentUtils.findComponentByName(registry, componentName)

    if (!component) {
      if (standalone) {
        throw new EdgitError('COMPONENT_NOT_FOUND', `Component '${componentName}' not found`)
      }
      console.log(`   ⚠️ Component '${componentName}' not found`)
      return
    }

    // Get the entity type from the component's actual type for type-specific namespaces
    const entityType = componentTypeToEntityType(component.type)

    try {
      const allTags = await this.tagManager.listTags(componentName, entityType)
      const versionTags = await this.tagManager.getVersionTags(componentName, entityType)
      const deploymentTags = await this.tagManager.getDeploymentTags(componentName, entityType)
      const customTags = allTags.filter(
        (tag) => !this.isVersionTag(tag) && !this.isDeploymentTag(tag)
      )

      if (format === 'json') {
        const output = {
          name: componentName,
          type: component.type,
          path: component.path,
          versions: versionTags,
          deployments: deploymentTags,
          custom: customTags,
          totalTags: allTags.length,
        }
        console.log(JSON.stringify(output, null, 2))
        return
      }

      // Table output (default)
      console.log(`📦 ${componentName} (${component.type})`)
      console.log(`   Path: ${component.path}`)

      if (versionTags.length > 0) {
        console.log(`   Versions: ${versionTags.join(', ')}`)
      }

      if (deploymentTags.length > 0) {
        console.log(`   Deployments: ${deploymentTags.join(', ')}`)
      }

      if (customTags.length > 0) {
        console.log(`   Custom: ${customTags.join(', ')}`)
      }

      if (allTags.length === 0) {
        console.log('   No tags')
      }
    } catch (error) {
      if (standalone) {
        throw EdgitError.from(error, 'GIT_ERROR')
      }
      console.log(`   ⚠️ Failed to list tags: ${error instanceof Error ? error.message : error}`)
    }
  }

  /**
   * Load component registry
   */
  private async loadRegistry(): Promise<ComponentRegistry> {
    const registryPath = path.join(process.cwd(), '.edgit', 'components.json')

    try {
      const content = await fs.readFile(registryPath, 'utf-8')
      return JSON.parse(content)
    } catch {
      // Return empty registry if file doesn't exist
      return ComponentUtils.createEmptyRegistry()
    }
  }

  /**
   * Show help for tag command
   */
  getHelp(): string {
    return `
edgit tag - Manage component version and deployment tags

USAGE:
  edgit tag create <component> <tagname> [sha]  Create a new tag
  edgit tag <component> <tagname> [sha]         Create a new tag (shorthand)
  edgit tag list [component] [--format json]    List tags for component(s)
  edgit tag show <component>@<tag> [--format json]  Show detailed tag information
  edgit tag delete <component>@<tag> [--remote] Delete a tag
  edgit tag push [component] [--force]          Push tags to remote

OPTIONS:
  --format <format>    Output format: table (default), json

TAG TYPES:
  Version tags:    v1.0.0, v2.1.3 (immutable, cannot be moved)
  Deployment tags: prod, staging, canary, latest (moveable)
  Custom tags:     Any other name

EXAMPLES:
  edgit tag create extraction-prompt v1.0.0     # Create version tag
  edgit tag create extraction-prompt prod       # Create/move deployment tag
  edgit tag list                                # List all component tags
  edgit tag list extraction-prompt              # List tags for one component
  edgit tag list --format json                  # List tags in JSON format
  edgit tag show extraction-prompt@v1.0.0       # Show tag details
  edgit tag show extraction-prompt@v1.0.0 --format json  # Show tag details as JSON
  edgit tag delete extraction-prompt@v1.0.0     # Delete local tag
  edgit tag push extraction-prompt --force      # Push tags (force for deployments)

GIT TAG FORMAT:
  Tags use type-specific namespaces: <type>s/<component>/<tag>

  Examples by component type:
    prompts/extraction-prompt/v1.0.0     (prompt component)
    schemas/user-schema/v1.0.0           (schema component)
    agents/analyzer/v1.0.0               (agent-definition component)
    templates/email-template/prod        (template component)
    ensembles/redirect-flow/staging      (ensemble component)
    tools/fetch-tool/v1.0.0              (tool component)
    queries/user-lookup/latest           (query component)
    configs/app-config/v1.0.0            (config component)
    scripts/transform-script/v1.0.0      (script component)
`
  }

  /**
   * Show help for tag command
   */
  private async showHelp(): Promise<void> {
    console.log(this.getHelp())
  }
}
