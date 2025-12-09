import { Command } from './base.js'
import type { GitTagManager, EntityType, TagPrefix } from '../utils/git-tags.js'
import { createGitTagManager } from '../utils/git-tags.js'
import type { ComponentRegistry, ComponentType } from '../models/components.js'
import { ComponentUtils } from '../models/components.js'
import { EdgitError } from '../errors/index.js'
import * as fs from 'fs/promises'
import * as path from 'path'

/**
 * Convert ComponentType to EntityType for git tagging
 */
function componentTypeToEntityType(componentType: ComponentType): EntityType {
  if (componentType === 'agent-definition') {
    return 'agent'
  }
  return componentType as EntityType
}

/**
 * Infer prefix from file path
 */
function inferPrefixFromPath(filePath: string): TagPrefix {
  const normalized = filePath.replace(/\\/g, '/')
  if (
    normalized.startsWith('src/logic/') ||
    normalized.includes('/src/logic/') ||
    normalized.startsWith('logic/')
  ) {
    return 'logic'
  }
  return 'components'
}

type OutputFormat = 'table' | 'json'

/**
 * Tag command for managing component version and environment tags
 */
export class TagCommand extends Command {
  private tagManager: GitTagManager

  constructor() {
    super()
    this.tagManager = createGitTagManager(this.git)
  }

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
      this.showHelp()
      return
    }

    const subcommand = args[0]

    switch (subcommand) {
      case 'create':
        await this.createTag(args.slice(1))
        break
      case 'set':
        await this.setTag(args.slice(1))
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
      case 'bump':
        await this.bumpTag(args.slice(1))
        break
      case 'push':
        console.warn('⚠️  Deprecated: Use "edgit push --tags" instead')
        break
      default:
        await this.createTag(args)
    }
  }

  /**
   * Create a version tag (immutable)
   */
  async createTag(args: string[]): Promise<void> {
    if (args.length < 2) {
      throw new EdgitError(
        'VALIDATION_ERROR',
        'Usage: edgit tag create <component> <version> [ref]'
      )
    }

    const componentName = args[0]!
    const tagName = args[1]!
    const sha = args[2]

    const registry = await this.loadRegistry()
    const component = ComponentUtils.findComponentByName(registry, componentName)

    if (!component) {
      const available = ComponentUtils.listComponentNames(registry).join(', ')
      throw new EdgitError(
        'COMPONENT_NOT_FOUND',
        `Component '${componentName}' not found.\nAvailable: ${available || '(none)'}`
      )
    }

    const entityType = componentTypeToEntityType(component.type)
    const prefix = inferPrefixFromPath(component.path)

    if (!this.tagManager.isVersionSlot(tagName)) {
      console.log('💡 Tip: Use "edgit tag set" for environment tags')
      throw new EdgitError(
        'VALIDATION_ERROR',
        `"${tagName}" is not a valid version. Use format: v1.0.0`
      )
    }

    try {
      const gitTag = await this.tagManager.createVersionTag(
        prefix,
        entityType,
        componentName,
        tagName,
        sha,
        `Release ${componentName} ${tagName}`
      )

      console.log(`✅ Created version tag: ${componentName}@${tagName}`)
      console.log(`   Git tag: ${gitTag}`)
      if (sha) console.log(`   SHA: ${sha}`)
      console.log('\n💡 Push with: edgit push --tags')
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        throw new EdgitError(
          'TAG_EXISTS',
          `Version tag ${tagName} already exists. Version tags are immutable.`
        )
      }
      throw EdgitError.from(error, 'GIT_ERROR')
    }
  }

  /**
   * Set an environment tag (mutable)
   */
  async setTag(args: string[]): Promise<void> {
    if (args.length < 2) {
      throw new EdgitError(
        'VALIDATION_ERROR',
        'Usage: edgit tag set <component> <environment> [ref]\n' +
          'Example: edgit tag set extraction staging HEAD'
      )
    }

    const componentName = args[0]!
    const env = args[1]!
    const ref = args[2] || 'HEAD'

    if (this.tagManager.isVersionSlot(env)) {
      throw new EdgitError(
        'VALIDATION_ERROR',
        `"${env}" looks like a version. Use 'edgit tag create' instead.`
      )
    }

    const registry = await this.loadRegistry()
    const component = ComponentUtils.findComponentByName(registry, componentName)

    if (!component) {
      const available = ComponentUtils.listComponentNames(registry).join(', ')
      throw new EdgitError(
        'COMPONENT_NOT_FOUND',
        `Component '${componentName}' not found.\nAvailable: ${available || '(none)'}`
      )
    }

    const entityType = componentTypeToEntityType(component.type)
    const prefix = inferPrefixFromPath(component.path)

    try {
      // If ref is a version slot, resolve it to full tag path
      let targetRef = ref
      if (this.tagManager.isVersionSlot(ref)) {
        targetRef = this.tagManager.buildTagPath(prefix, entityType, componentName, ref)
      }

      const gitTag = await this.tagManager.setEnvironmentTag(
        prefix,
        entityType,
        componentName,
        env,
        targetRef,
        `Set ${componentName} to ${env}`
      )

      const sha = await this.tagManager.resolveRefToSHA(targetRef)

      console.log(`✅ Set tag: ${componentName}@${env}`)
      console.log(`   Git tag: ${gitTag}`)
      console.log(`   Points to: ${sha.slice(0, 7)}`)
      console.log('')
      console.log('Push to deploy:')
      console.log('  edgit push --tags --force')
    } catch (error) {
      throw EdgitError.from(error, 'GIT_ERROR')
    }
  }

  /**
   * List tags for a component or all components
   */
  async listTags(args: string[]): Promise<void> {
    const { format, cleanArgs } = this.extractFormat(args)
    const registry = await this.loadRegistry()

    if (cleanArgs.length === 0) {
      await this.listAllComponentTags(registry, format)
    } else {
      const componentName = cleanArgs[0]!
      await this.listComponentTags(componentName, registry, true, format)
    }
  }

  /**
   * Show detailed information about a specific tag
   */
  async showTag(args: string[]): Promise<void> {
    const { format, cleanArgs } = this.extractFormat(args)

    if (cleanArgs.length === 0) {
      throw new EdgitError('VALIDATION_ERROR', 'Usage: edgit tag show <component>@<tag>')
    }

    let componentName: string
    let tagName: string

    const spec = cleanArgs[0]!
    if (spec.includes('@')) {
      const parts = spec.split('@')
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        throw new EdgitError('VALIDATION_ERROR', 'Usage: edgit tag show <component>@<tag>')
      }
      componentName = parts[0]
      tagName = parts[1]
    } else if (cleanArgs.length >= 2 && cleanArgs[1]) {
      componentName = spec
      tagName = cleanArgs[1]
    } else {
      throw new EdgitError('VALIDATION_ERROR', 'Usage: edgit tag show <component>@<tag>')
    }

    const registry = await this.loadRegistry()
    const component = ComponentUtils.findComponentByName(registry, componentName)

    if (!component) {
      throw new EdgitError('COMPONENT_NOT_FOUND', `Component '${componentName}' not found`)
    }

    const entityType = componentTypeToEntityType(component.type)
    const prefix = inferPrefixFromPath(component.path)
    const gitTag = this.tagManager.buildTagPath(prefix, entityType, componentName, tagName)

    try {
      const tagInfo = await this.tagManager.getTagInfo(gitTag)

      if (format === 'json') {
        console.log(
          JSON.stringify(
            {
              component: componentName,
              tag: tagName,
              sha: tagInfo.sha,
              date: tagInfo.date,
              author: tagInfo.author,
              message: tagInfo.message,
              path: component.path,
              type: component.type,
              prefix,
              gitTag,
            },
            null,
            2
          )
        )
        return
      }

      console.log(`📦 ${componentName}@${tagName}`)
      console.log(`   SHA: ${tagInfo.sha}`)
      console.log(`   Date: ${tagInfo.date}`)
      console.log(`   Author: ${tagInfo.author}`)
      console.log(`   Message: ${tagInfo.message}`)
      console.log(`   File: ${component.path}`)
      console.log(`   Git tag: ${gitTag}`)
    } catch {
      throw new EdgitError('TAG_NOT_FOUND', `Tag not found: ${componentName}@${tagName}`)
    }
  }

  /**
   * Delete a tag
   */
  async deleteTag(args: string[]): Promise<void> {
    if (args.length === 0) {
      throw new EdgitError('VALIDATION_ERROR', 'Usage: edgit tag delete <component>@<tag>')
    }

    const cleanArgs = args.filter((arg) => arg !== '--remote')

    let componentName: string
    let tagName: string

    const spec = cleanArgs[0]!
    if (spec.includes('@')) {
      const parts = spec.split('@')
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        throw new EdgitError('VALIDATION_ERROR', 'Usage: edgit tag delete <component>@<tag>')
      }
      componentName = parts[0]
      tagName = parts[1]
    } else if (cleanArgs.length >= 2 && cleanArgs[1]) {
      componentName = spec
      tagName = cleanArgs[1]
    } else {
      throw new EdgitError('VALIDATION_ERROR', 'Usage: edgit tag delete <component>@<tag>')
    }

    const registry = await this.loadRegistry()
    const component = ComponentUtils.findComponentByName(registry, componentName)

    if (!component) {
      throw new EdgitError('COMPONENT_NOT_FOUND', `Component '${componentName}' not found`)
    }

    const entityType = componentTypeToEntityType(component.type)
    const prefix = inferPrefixFromPath(component.path)

    try {
      await this.tagManager.deleteTag(prefix, entityType, componentName, tagName)
      console.log(`✅ Deleted tag: ${componentName}@${tagName}`)
    } catch (error) {
      throw EdgitError.from(error, 'TAG_NOT_FOUND')
    }
  }

  private async listAllComponentTags(
    registry: ComponentRegistry,
    format: OutputFormat
  ): Promise<void> {
    const componentNames = ComponentUtils.listComponentNames(registry)

    if (format === 'json') {
      const components: Array<{
        name: string
        type: string
        path: string
        prefix: TagPrefix
        versions: string[]
        environments: string[]
      }> = []

      for (const componentName of componentNames) {
        const data = await this.getComponentTagData(componentName, registry)
        if (data) components.push(data)
      }

      console.log(JSON.stringify({ components, total: components.length }, null, 2))
      return
    }

    if (componentNames.length === 0) {
      console.log('No components registered')
      console.log('\nTo register a component:')
      console.log('  edgit register <file>')
      return
    }

    console.log('📦 Component Tags:\n')

    for (const componentName of componentNames) {
      await this.listComponentTags(componentName, registry, false, format)
      console.log()
    }
  }

  private async getComponentTagData(
    componentName: string,
    registry: ComponentRegistry
  ): Promise<{
    name: string
    type: string
    path: string
    prefix: TagPrefix
    versions: string[]
    environments: string[]
  } | null> {
    const component = ComponentUtils.findComponentByName(registry, componentName)
    if (!component) return null

    const entityType = componentTypeToEntityType(component.type)
    const prefix = inferPrefixFromPath(component.path)

    try {
      const allTags = await this.tagManager.listTags(prefix, entityType, componentName)
      const versions = allTags.filter((t) => t.slotType === 'version').map((t) => t.slot)
      const environments = allTags.filter((t) => t.slotType === 'environment').map((t) => t.slot)

      return {
        name: componentName,
        type: component.type,
        path: component.path,
        prefix,
        versions,
        environments,
      }
    } catch {
      return {
        name: componentName,
        type: component.type,
        path: component.path,
        prefix,
        versions: [],
        environments: [],
      }
    }
  }

  private async listComponentTags(
    componentName: string,
    registry: ComponentRegistry,
    standalone: boolean,
    format: OutputFormat
  ): Promise<void> {
    const component = ComponentUtils.findComponentByName(registry, componentName)

    if (!component) {
      if (standalone) {
        throw new EdgitError('COMPONENT_NOT_FOUND', `Component '${componentName}' not found`)
      }
      console.log(`   ⚠️ Component '${componentName}' not found`)
      return
    }

    const entityType = componentTypeToEntityType(component.type)
    const prefix = inferPrefixFromPath(component.path)

    try {
      const allTags = await this.tagManager.listTags(prefix, entityType, componentName)
      const versionTags = allTags.filter((t) => t.slotType === 'version')
      const envTags = allTags.filter((t) => t.slotType === 'environment')

      if (format === 'json') {
        console.log(
          JSON.stringify(
            {
              name: componentName,
              type: component.type,
              path: component.path,
              prefix,
              versions: versionTags.map((t) => t.slot),
              environments: envTags.map((t) => t.slot),
              totalTags: allTags.length,
            },
            null,
            2
          )
        )
        return
      }

      console.log(`📦 ${componentName} (${component.type}) [${prefix}]`)
      console.log(`   Path: ${component.path}`)

      if (versionTags.length > 0) {
        console.log(`   Versions: ${versionTags.map((t) => t.slot).join(', ')}`)
      }

      if (envTags.length > 0) {
        console.log(`   Environments: ${envTags.map((t) => t.slot).join(', ')}`)
      }

      if (allTags.length === 0) {
        console.log('   No tags')
      }
    } catch (error) {
      if (standalone) {
        throw EdgitError.from(error, 'GIT_ERROR')
      }
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.log(`   ⚠️ Failed to list tags: ${errorMessage}`)
    }
  }

  /**
   * Bump version tag for a component
   * Finds latest version and increments based on bump type
   */
  private async bumpTag(args: string[]): Promise<void> {
    if (args.length < 2) {
      throw new EdgitError(
        'VALIDATION_ERROR',
        'Usage: edgit tag bump <component> <major|minor|patch|prerelease> [--ref <ref>]'
      )
    }

    const componentName = args[0]!
    const bumpType = args[1]!

    // Extract --ref option
    const refIndex = args.indexOf('--ref')
    const ref = refIndex !== -1 && args[refIndex + 1] ? args[refIndex + 1]! : 'HEAD'

    // Validate bump type
    const validBumpTypes = ['major', 'minor', 'patch', 'prerelease'] as const
    if (!validBumpTypes.includes(bumpType as (typeof validBumpTypes)[number])) {
      throw new EdgitError(
        'VALIDATION_ERROR',
        `Invalid bump type: ${bumpType}\nUse: ${validBumpTypes.join(', ')}`
      )
    }

    const registry = await this.loadRegistry()
    const component = ComponentUtils.findComponentByName(registry, componentName)

    if (!component) {
      const available = ComponentUtils.listComponentNames(registry).join(', ')
      throw new EdgitError(
        'COMPONENT_NOT_FOUND',
        `Component '${componentName}' not found.\nAvailable: ${available || '(none)'}`
      )
    }

    const entityType = componentTypeToEntityType(component.type)
    const prefix = inferPrefixFromPath(component.path)

    // Get all version tags for this component
    const allTags = await this.tagManager.listTags(prefix, entityType, componentName)
    const versionTags = allTags
      .filter((t) => t.slotType === 'version')
      .map((t) => t.slot)
      .sort((a, b) => this.compareSemver(a, b))

    if (versionTags.length === 0) {
      throw new EdgitError(
        'TAG_NOT_FOUND',
        `No versions found for ${componentName}.\nUse 'edgit tag create ${componentName} v1.0.0' for first version.`
      )
    }

    const latestVersion = versionTags[versionTags.length - 1]!
    const newVersion = this.bumpVersion(latestVersion, bumpType as (typeof validBumpTypes)[number])

    try {
      const gitTag = await this.tagManager.createVersionTag(
        prefix,
        entityType,
        componentName,
        newVersion,
        ref,
        `Bump ${componentName} ${bumpType}: ${latestVersion} → ${newVersion}`
      )

      const sha = await this.tagManager.resolveRefToSHA(ref)

      console.log(`Latest version: ${latestVersion}`)
      console.log(`Bumping: ${bumpType}`)
      console.log('')
      console.log(`✅ Created tag: ${componentName}@${newVersion}`)
      console.log(`   Git tag: ${gitTag}`)
      console.log(`   Points to: ${sha.slice(0, 7)}`)
      console.log('')
      console.log('Push to deploy:')
      console.log('  edgit push --tags')
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        throw new EdgitError(
          'TAG_EXISTS',
          `Version tag ${newVersion} already exists. Version tags are immutable.`
        )
      }
      throw EdgitError.from(error, 'GIT_ERROR')
    }
  }

  /**
   * Bump a semver version string
   */
  private bumpVersion(
    version: string,
    bumpType: 'major' | 'minor' | 'patch' | 'prerelease'
  ): string {
    // Remove 'v' prefix for parsing
    const v = version.startsWith('v') ? version.slice(1) : version
    const parts = v.split('-')
    const mainPart = parts[0]!
    const prerelease = parts[1]

    const [majorStr, minorStr, patchStr] = mainPart.split('.')
    const major = parseInt(majorStr || '0', 10)
    const minor = parseInt(minorStr || '0', 10)
    const patch = parseInt(patchStr || '0', 10)

    switch (bumpType) {
      case 'major':
        return `v${major + 1}.0.0`
      case 'minor':
        return `v${major}.${minor + 1}.0`
      case 'patch':
        // If currently prerelease, just drop the prerelease
        if (prerelease) {
          return `v${major}.${minor}.${patch}`
        }
        return `v${major}.${minor}.${patch + 1}`
      case 'prerelease':
        if (prerelease) {
          // Increment prerelease: v1.2.3-beta.0 → v1.2.3-beta.1
          const preParts = prerelease.split('.')
          const preNum = parseInt(preParts[preParts.length - 1] || '0', 10)
          if (!isNaN(preNum)) {
            preParts[preParts.length - 1] = String(preNum + 1)
            return `v${major}.${minor}.${patch}-${preParts.join('.')}`
          }
          return `v${major}.${minor}.${patch}-${prerelease}.1`
        }
        // New prerelease: v1.2.3 → v1.2.4-0
        return `v${major}.${minor}.${patch + 1}-0`
    }
  }

  /**
   * Compare two semver versions
   * Returns negative if a < b, positive if a > b, 0 if equal
   */
  private compareSemver(a: string, b: string): number {
    const parseVer = (v: string) => {
      const clean = v.startsWith('v') ? v.slice(1) : v
      const [main, pre] = clean.split('-')
      const [majorStr, minorStr, patchStr] = (main || '0.0.0').split('.')
      return {
        major: parseInt(majorStr || '0', 10),
        minor: parseInt(minorStr || '0', 10),
        patch: parseInt(patchStr || '0', 10),
        pre: pre || '',
      }
    }

    const av = parseVer(a)
    const bv = parseVer(b)

    if (av.major !== bv.major) return av.major - bv.major
    if (av.minor !== bv.minor) return av.minor - bv.minor
    if (av.patch !== bv.patch) return av.patch - bv.patch

    // Prerelease sorts before release (v1.0.0-beta < v1.0.0)
    if (av.pre && !bv.pre) return -1
    if (!av.pre && bv.pre) return 1
    return av.pre.localeCompare(bv.pre)
  }

  private async loadRegistry(): Promise<ComponentRegistry> {
    const registryPath = path.join(process.cwd(), '.edgit', 'components.json')
    try {
      const content = await fs.readFile(registryPath, 'utf-8')
      return JSON.parse(content) as ComponentRegistry
    } catch {
      return ComponentUtils.createEmptyRegistry()
    }
  }

  getHelp(): string {
    return `
edgit tag - Manage component version and environment tags

USAGE:
  edgit tag create <component> <version> [ref]    Create immutable version tag
  edgit tag bump <component> <level> [--ref ref]  Bump version (major|minor|patch|prerelease)
  edgit tag set <component> <env> [ref]           Create/move environment tag
  edgit tag list [component] [--format json]      List tags for component(s)
  edgit tag show <component>@<tag>                Show detailed tag information
  edgit tag delete <component>@<tag>              Delete a tag

TAG FORMAT (4-level hierarchy):
  {prefix}/{type}/{name}/{slot}

  prefix:  components (hot-swappable) or logic (requires rebuild)
  type:    prompts, agents, schemas, etc.
  name:    component name
  slot:    version (v1.0.0) or environment (staging, production)

BUMP TYPES:
  major      v1.2.3 → v2.0.0
  minor      v1.2.3 → v1.3.0
  patch      v1.2.3 → v1.2.4
  prerelease v1.2.3 → v1.2.4-0, v1.2.4-0 → v1.2.4-1

EXAMPLES:
  edgit tag create extraction v1.0.0
  edgit tag bump extraction patch
  edgit tag set extraction staging v1.0.0
  edgit tag list
  edgit tag show extraction@v1.0.0
  edgit tag delete extraction@v0.9.0

DEPLOYMENT WORKFLOW:
  1. Create version:     edgit tag create extraction v1.0.0
  2. Push:               edgit push --tags
  3. Deploy to staging:  edgit tag set extraction staging v1.0.0
  4. Push:               edgit push --tags --force
`
  }

  private showHelp(): void {
    console.log(this.getHelp())
  }
}
