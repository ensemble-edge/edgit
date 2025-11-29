import type { GitWrapper } from './git.js'
import type { Result } from '../types/result.js'

/**
 * Entity types that can be versioned
 * Aligned with Conductor's ComponentType for seamless integration
 *
 * Each type gets its own namespace (pluralized):
 * - agent → agents/
 * - prompt → prompts/
 * - schema → schemas/
 * - template → templates/
 * - query → queries/
 * - config → configs/
 * - script → scripts/
 * - ensemble → ensembles/
 * - tool → tools/
 *
 * Legacy 'component' type is still supported for backwards compatibility
 * and maps to 'components/' namespace.
 */
export type EntityType =
  | 'agent'
  | 'prompt'
  | 'schema'
  | 'template'
  | 'query'
  | 'config'
  | 'script'
  | 'ensemble'
  | 'tool'
  | 'agent-definition' // Alias for agent
  | 'component' // Legacy - maps to 'components/' for backwards compatibility

/**
 * Git Tag Manager for Edgit component and agent versioning and deployment
 * Handles namespaced tags with separation between version and deployment tags
 * Uses type-specific namespaces (prompts/, schemas/, templates/, etc.)
 */
export class GitTagManager {
  private git: GitWrapper

  constructor(git: GitWrapper) {
    this.git = git
  }

  /**
   * Get namespace prefix for entity type
   * Pluralizes the type name to create the namespace
   *
   * Examples:
   * - 'agent' → 'agents'
   * - 'prompt' → 'prompts'
   * - 'schema' → 'schemas'
   * - 'query' → 'queries' (special case)
   * - 'component' → 'components' (legacy)
   */
  private getNamespace(entityType: EntityType): string {
    // Handle special cases
    switch (entityType) {
      case 'agent':
      case 'agent-definition':
        return 'agents'
      case 'query':
        return 'queries' // Special pluralization
      case 'component':
        return 'components' // Legacy support
      default:
        // Standard pluralization: add 's'
        return `${entityType}s`
    }
  }

  /**
   * Create a namespaced tag for component or agent
   * @param name Entity name (component or agent name)
   * @param tagName Tag name (e.g., 'v1.0.0', 'prod', 'staging')
   * @param entityType Entity type ('component' or 'agent')
   * @param sha Optional SHA to tag (defaults to HEAD)
   * @param message Optional tag message
   */
  async tag(
    name: string,
    tagName: string,
    entityType: EntityType = 'component',
    sha?: string,
    message?: string
  ): Promise<string> {
    const namespace = this.getNamespace(entityType)
    const gitTag = `${namespace}/${name}/${tagName}`
    const target = sha || 'HEAD'
    const tagMessage = message || `Tag ${entityType} ${name} as ${tagName}`

    const result = await this.git.exec(['tag', '-a', gitTag, target, '-m', tagMessage])

    if (result.exitCode !== 0) {
      throw new Error(`Failed to create tag ${gitTag}: ${result.stderr}`)
    }

    return gitTag
  }

  /**
   * Create a namespaced component tag (backward compatible)
   * @deprecated Use tag() with specific entityType (prompt, schema, template, etc.) instead
   */
  async tagComponent(
    component: string,
    tagName: string,
    sha?: string,
    message?: string
  ): Promise<string> {
    // Legacy: uses generic 'components/' namespace
    // For type-specific namespaces, use tag() with the actual type
    return this.tag(component, tagName, 'component', sha, message)
  }

  /**
   * Create a namespaced agent tag
   * @param agent Agent name
   * @param tagName Tag name (e.g., 'v1.0.0', 'prod', 'staging')
   * @param sha Optional SHA to tag (defaults to HEAD)
   * @param message Optional tag message
   */
  async tagAgent(agent: string, tagName: string, sha?: string, message?: string): Promise<string> {
    return this.tag(agent, tagName, 'agent', sha, message)
  }

  /**
   * List all tags for a specific entity
   * @param name Entity name
   * @param entityType Entity type ('component' or 'agent')
   * @returns Array of tag names (without namespace prefix)
   */
  async listTags(name: string, entityType: EntityType = 'component'): Promise<string[]> {
    const namespace = this.getNamespace(entityType)
    const result = await this.git.exec(['tag', '-l', `${namespace}/${name}/*`])

    if (result.exitCode !== 0) {
      return []
    }

    return result.stdout
      .split('\n')
      .filter((line) => line.trim())
      .map((tag) => tag.replace(`${namespace}/${name}/`, ''))
  }

  /**
   * List all tags for a specific component (backward compatible)
   * @deprecated Use listTags() with entityType parameter instead
   */
  async listComponentTags(component: string): Promise<string[]> {
    return this.listTags(component, 'component')
  }

  /**
   * List all tags for a specific agent
   * @param agent Agent name
   * @returns Array of tag names (without namespace prefix)
   */
  async listAgentTags(agent: string): Promise<string[]> {
    return this.listTags(agent, 'agent')
  }

  /**
   * Get the SHA that a tag points to
   * @param name Entity name
   * @param tagName Tag name
   * @param entityType Entity type ('component' or 'agent')
   * @returns SHA hash
   */
  async getTagSHA(
    name: string,
    tagName: string,
    entityType: EntityType = 'component'
  ): Promise<string> {
    const namespace = this.getNamespace(entityType)
    const gitTag = `${namespace}/${name}/${tagName}`
    const result = await this.git.exec(['rev-list', '-n', '1', gitTag])

    if (result.exitCode !== 0) {
      throw new Error(`Tag not found: ${gitTag}`)
    }

    return result.stdout.trim()
  }

  /**
   * Check if a tag exists
   * @param name Entity name
   * @param tagName Tag name
   * @param entityType Entity type ('component' or 'agent')
   * @returns True if tag exists
   */
  async tagExists(
    name: string,
    tagName: string,
    entityType: EntityType = 'component'
  ): Promise<boolean> {
    try {
      await this.getTagSHA(name, tagName, entityType)
      return true
    } catch {
      return false
    }
  }

  /**
   * Move a deployment tag to a new target (with force)
   * Used for deployment tags like 'prod', 'staging' that can move
   * @param name Entity name
   * @param env Environment name (prod, staging, etc.)
   * @param targetRef Target SHA, tag, or ref
   * @param entityType Entity type ('component' or 'agent')
   * @param message Optional tag message
   */
  async moveDeploymentTag(
    name: string,
    env: string,
    targetRef: string,
    entityType: EntityType = 'component',
    message?: string
  ): Promise<string> {
    // Resolve target to SHA
    const targetSHA = await this.resolveRef(name, targetRef, entityType)
    const namespace = this.getNamespace(entityType)
    const gitTag = `${namespace}/${name}/${env}`
    const tagMessage = message || `Deploy ${entityType} ${name} to ${env}`

    // Force update deployment tag
    const result = await this.git.exec(['tag', '-f', '-a', gitTag, targetSHA, '-m', tagMessage])

    if (result.exitCode !== 0) {
      throw new Error(`Failed to move deployment tag ${gitTag}: ${result.stderr}`)
    }

    return gitTag
  }

  /**
   * Create an immutable version tag
   * Version tags cannot be overwritten (no force flag)
   * @param name Entity name
   * @param version Version string (e.g., 'v1.0.0')
   * @param entityType Entity type ('component' or 'agent')
   * @param sha Optional SHA to tag (defaults to HEAD)
   * @param message Optional tag message
   */
  async createVersionTag(
    name: string,
    version: string,
    entityType: EntityType = 'component',
    sha?: string,
    message?: string
  ): Promise<string> {
    // Check if version tag already exists
    const exists = await this.tagExists(name, version, entityType)
    if (exists) {
      throw new Error(`Version tag ${version} already exists for ${entityType} ${name}`)
    }

    const tagMessage = message || `Release ${entityType} ${name} ${version}`
    return await this.tag(name, version, entityType, sha, tagMessage)
  }

  /**
   * Resolve a reference to a SHA
   * Handles SHAs, tags, version tags, deployment tags
   * @param name Entity name
   * @param ref Reference string (SHA, tag name, etc.)
   * @param entityType Entity type ('component' or 'agent')
   * @returns SHA hash
   */
  async resolveRef(
    name: string,
    ref: string,
    entityType: EntityType = 'component'
  ): Promise<string> {
    // If it looks like a SHA, try to resolve it directly
    if (ref.match(/^[0-9a-f]{6,40}$/i)) {
      const result = await this.git.exec(['rev-parse', ref])
      if (result.exitCode === 0) {
        return result.stdout.trim()
      }
    }

    // Try as an entity tag
    try {
      return await this.getTagSHA(name, ref, entityType)
    } catch {
      // Fall back to git's rev-parse
      const result = await this.git.exec(['rev-parse', ref])
      if (result.exitCode === 0) {
        return result.stdout.trim()
      }
    }

    throw new Error(`Could not resolve reference: ${ref}`)
  }

  /**
   * Get detailed tag information
   * @param name Entity name
   * @param tagName Tag name
   * @param entityType Entity type ('component' or 'agent')
   * @returns Tag details with SHA, date, message, author
   */
  async getTagInfo(
    name: string,
    tagName: string,
    entityType: EntityType = 'component'
  ): Promise<{
    tag: string
    sha: string
    date: string
    message: string
    author: string
  }> {
    const namespace = this.getNamespace(entityType)
    const gitTag = `${namespace}/${name}/${tagName}`

    // Get tag object info
    // Use %(if)%(*objectname)%(then)%(*objectname)%(else)%(objectname)%(end) to handle both
    // annotated tags (dereferenced) and lightweight tags
    const result = await this.git.exec([
      'for-each-ref',
      '--format=%(if)%(*objectname)%(then)%(*objectname)%(else)%(objectname)%(end)|%(authordate:iso)|%(contents:subject)|%(authorname)',
      `refs/tags/${gitTag}`,
    ])

    if (result.exitCode !== 0 || !result.stdout.trim()) {
      throw new Error(`Tag not found: ${gitTag}`)
    }

    const parts = result.stdout.trim().split('|')
    if (parts.length < 4) {
      throw new Error(`Invalid tag format for: ${gitTag}`)
    }

    const [commitSHA, date, message, author] = parts

    return {
      tag: tagName,
      sha: commitSHA || '',
      date: date || '',
      message: message || '',
      author: author || '',
    }
  }

  /**
   * Get all version tags (sorted by semantic version)
   * @param name Entity name
   * @param entityType Entity type ('component' or 'agent')
   * @returns Array of version tag names sorted by version
   */
  async getVersionTags(name: string, entityType: EntityType = 'component'): Promise<string[]> {
    const tags = await this.listTags(name, entityType)
    const versionTags = tags.filter((tag) => tag.match(/^v?\d+\.\d+\.\d+/))

    // Sort version tags semantically
    return versionTags.sort((a, b) => {
      const aVersion = a
        .replace(/^v/, '')
        .split('.')
        .map((n) => parseInt(n, 10))
      const bVersion = b
        .replace(/^v/, '')
        .split('.')
        .map((n) => parseInt(n, 10))

      for (let i = 0; i < Math.min(aVersion.length, bVersion.length); i++) {
        const aNum = aVersion[i] || 0
        const bNum = bVersion[i] || 0
        if (aNum !== bNum) {
          return aNum - bNum
        }
      }
      return aVersion.length - bVersion.length
    })
  }

  /**
   * Get all deployment tags
   * @param name Entity name
   * @param entityType Entity type ('component' or 'agent')
   * @returns Array of deployment tag names
   */
  async getDeploymentTags(name: string, entityType: EntityType = 'component'): Promise<string[]> {
    const tags = await this.listTags(name, entityType)
    const deploymentTags = ['prod', 'staging', 'canary', 'latest', 'dev']

    return tags.filter((tag) => deploymentTags.includes(tag))
  }

  /**
   * Push tags to remote
   * @param name Entity name
   * @param entityType Entity type ('component' or 'agent')
   * @param tagNames Optional specific tags to push (defaults to all)
   * @param force Whether to force push (for deployment tags)
   */
  async pushTags(
    name: string,
    entityType: EntityType = 'component',
    tagNames?: string[],
    force: boolean = false
  ): Promise<void> {
    const tags = tagNames || (await this.listTags(name, entityType))
    const namespace = this.getNamespace(entityType)

    for (const tagName of tags) {
      const gitTag = `${namespace}/${name}/${tagName}`
      const args = ['push', 'origin', `refs/tags/${gitTag}`]
      if (force) {
        args.push('--force')
      }

      const result = await this.git.exec(args)
      if (result.exitCode !== 0) {
        console.warn(`Warning: Failed to push tag ${gitTag}: ${result.stderr}`)
      }
    }
  }

  /**
   * Delete a tag
   * @param name Entity name
   * @param tagName Tag name to delete
   * @param entityType Entity type ('component' or 'agent')
   * @param deleteRemote Whether to also delete from remote
   */
  async deleteTag(
    name: string,
    tagName: string,
    entityType: EntityType = 'component',
    deleteRemote: boolean = false
  ): Promise<void> {
    const namespace = this.getNamespace(entityType)
    const gitTag = `${namespace}/${name}/${tagName}`

    // Delete local tag
    const result = await this.git.exec(['tag', '-d', gitTag])
    if (result.exitCode !== 0) {
      throw new Error(`Failed to delete tag ${gitTag}: ${result.stderr}`)
    }

    // Delete remote tag if requested
    if (deleteRemote) {
      const pushResult = await this.git.exec(['push', 'origin', `:refs/tags/${gitTag}`])
      if (pushResult.exitCode !== 0) {
        console.warn(`Warning: Failed to delete remote tag ${gitTag}: ${pushResult.stderr}`)
      }
    }
  }

  /**
   * Get file content at a specific tag
   * @param name Entity name
   * @param tagName Tag name
   * @param filePath File path within the repository
   * @param entityType Entity type ('component' or 'agent')
   * @returns File content as string
   */
  async getFileAtTag(
    name: string,
    tagName: string,
    filePath: string,
    entityType: EntityType = 'component'
  ): Promise<string> {
    const sha = await this.getTagSHA(name, tagName, entityType)
    const result = await this.git.exec(['show', `${sha}:${filePath}`])

    if (result.exitCode !== 0) {
      throw new Error(`File not found at tag: ${filePath} at ${entityType} ${name}@${tagName}`)
    }

    return result.stdout
  }
}

// ============================================================================
// Result-based API Methods (non-throwing alternatives)
// ============================================================================

/**
 * Git tag error types for Result-based API
 */
export type GitTagError =
  | { kind: 'tag_exists'; tag: string; message: string }
  | { kind: 'tag_not_found'; tag: string; message: string }
  | { kind: 'git_error'; message: string; stderr?: string }
  | { kind: 'invalid_ref'; ref: string; message: string }
  | { kind: 'file_not_found'; path: string; tag: string; message: string }

/**
 * Tag information returned by Result-based methods
 */
export interface TagInfo {
  tag: string
  sha: string
  date: string
  message: string
  author: string
}

/**
 * Result-based GitTagManager methods
 * These provide explicit error handling without throwing exceptions
 */
export class GitTagManagerResult {
  private manager: GitTagManager

  constructor(git: GitWrapper) {
    this.manager = new GitTagManager(git)
  }

  /**
   * Create a tag with Result-based error handling
   */
  async createTag(
    name: string,
    tagName: string,
    entityType: EntityType = 'component',
    sha?: string,
    message?: string
  ): Promise<Result<string, GitTagError>> {
    try {
      const gitTag = await this.manager.tag(name, tagName, entityType, sha, message)
      return { ok: true, value: gitTag }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('already exists')) {
        return {
          ok: false,
          error: {
            kind: 'tag_exists',
            tag: tagName,
            message: errorMessage,
          },
        }
      }
      return {
        ok: false,
        error: {
          kind: 'git_error',
          message: errorMessage,
        },
      }
    }
  }

  /**
   * Create an immutable version tag with Result-based error handling
   */
  async createVersionTag(
    name: string,
    version: string,
    entityType: EntityType = 'component',
    sha?: string,
    message?: string
  ): Promise<Result<string, GitTagError>> {
    try {
      const gitTag = await this.manager.createVersionTag(name, version, entityType, sha, message)
      return { ok: true, value: gitTag }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('already exists')) {
        return {
          ok: false,
          error: {
            kind: 'tag_exists',
            tag: version,
            message: errorMessage,
          },
        }
      }
      return {
        ok: false,
        error: {
          kind: 'git_error',
          message: errorMessage,
        },
      }
    }
  }

  /**
   * Get tag SHA with Result-based error handling
   */
  async getTagSHA(
    name: string,
    tagName: string,
    entityType: EntityType = 'component'
  ): Promise<Result<string, GitTagError>> {
    try {
      const sha = await this.manager.getTagSHA(name, tagName, entityType)
      return { ok: true, value: sha }
    } catch (error) {
      return {
        ok: false,
        error: {
          kind: 'tag_not_found',
          tag: tagName,
          message: error instanceof Error ? error.message : String(error),
        },
      }
    }
  }

  /**
   * Get tag info with Result-based error handling
   */
  async getTagInfo(
    name: string,
    tagName: string,
    entityType: EntityType = 'component'
  ): Promise<Result<TagInfo, GitTagError>> {
    try {
      const info = await this.manager.getTagInfo(name, tagName, entityType)
      return { ok: true, value: info }
    } catch (error) {
      return {
        ok: false,
        error: {
          kind: 'tag_not_found',
          tag: tagName,
          message: error instanceof Error ? error.message : String(error),
        },
      }
    }
  }

  /**
   * Resolve a reference with Result-based error handling
   */
  async resolveRef(
    name: string,
    ref: string,
    entityType: EntityType = 'component'
  ): Promise<Result<string, GitTagError>> {
    try {
      const sha = await this.manager.resolveRef(name, ref, entityType)
      return { ok: true, value: sha }
    } catch (error) {
      return {
        ok: false,
        error: {
          kind: 'invalid_ref',
          ref,
          message: error instanceof Error ? error.message : String(error),
        },
      }
    }
  }

  /**
   * Get file content at tag with Result-based error handling
   */
  async getFileAtTag(
    name: string,
    tagName: string,
    filePath: string,
    entityType: EntityType = 'component'
  ): Promise<Result<string, GitTagError>> {
    try {
      const content = await this.manager.getFileAtTag(name, tagName, filePath, entityType)
      return { ok: true, value: content }
    } catch (error) {
      return {
        ok: false,
        error: {
          kind: 'file_not_found',
          path: filePath,
          tag: tagName,
          message: error instanceof Error ? error.message : String(error),
        },
      }
    }
  }

  /**
   * Move deployment tag with Result-based error handling
   */
  async moveDeploymentTag(
    name: string,
    env: string,
    targetRef: string,
    entityType: EntityType = 'component',
    message?: string
  ): Promise<Result<string, GitTagError>> {
    try {
      const gitTag = await this.manager.moveDeploymentTag(name, env, targetRef, entityType, message)
      return { ok: true, value: gitTag }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('Could not resolve')) {
        return {
          ok: false,
          error: {
            kind: 'invalid_ref',
            ref: targetRef,
            message: errorMessage,
          },
        }
      }
      return {
        ok: false,
        error: {
          kind: 'git_error',
          message: errorMessage,
        },
      }
    }
  }

  /**
   * Delete a tag with Result-based error handling
   */
  async deleteTag(
    name: string,
    tagName: string,
    entityType: EntityType = 'component',
    deleteRemote: boolean = false
  ): Promise<Result<void, GitTagError>> {
    try {
      await this.manager.deleteTag(name, tagName, entityType, deleteRemote)
      return { ok: true, value: undefined }
    } catch (error) {
      return {
        ok: false,
        error: {
          kind: 'tag_not_found',
          tag: tagName,
          message: error instanceof Error ? error.message : String(error),
        },
      }
    }
  }

  /**
   * Access the underlying manager for non-Result methods
   */
  get underlying(): GitTagManager {
    return this.manager
  }

  // Passthrough methods that don't throw
  listTags = (name: string, entityType?: EntityType) => this.manager.listTags(name, entityType)
  tagExists = (name: string, tagName: string, entityType?: EntityType) =>
    this.manager.tagExists(name, tagName, entityType)
  getVersionTags = (name: string, entityType?: EntityType) =>
    this.manager.getVersionTags(name, entityType)
  getDeploymentTags = (name: string, entityType?: EntityType) =>
    this.manager.getDeploymentTags(name, entityType)
  pushTags = (name: string, entityType?: EntityType, tagNames?: string[], force?: boolean) =>
    this.manager.pushTags(name, entityType, tagNames, force)
}

/**
 * Convenience function to create GitTagManager instance
 */
export function createGitTagManager(git: GitWrapper): GitTagManager {
  return new GitTagManager(git)
}

/**
 * Create a Result-based GitTagManager for explicit error handling
 */
export function createGitTagManagerWithResult(git: GitWrapper): GitTagManagerResult {
  return new GitTagManagerResult(git)
}
