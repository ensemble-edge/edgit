import type { GitWrapper } from './git.js'
import type { Result } from '../types/result.js'

/**
 * Tag prefix - determines what happens on push
 * - components: Syncs to KV (hot-swappable)
 * - logic: Triggers Worker rebuild
 */
export type TagPrefix = 'components' | 'logic'

/**
 * Entity types that can be versioned
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
 * - route → routes/
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
  | 'route'

/**
 * Slot type - determines mutability
 * - version: Immutable, semver format (v1.0.0)
 * - environment: Mutable, can be moved (main, staging, production)
 */
export type SlotType = 'version' | 'environment'

/**
 * Parsed tag information
 */
export interface ParsedTag {
  prefix: TagPrefix
  type: string // prompts, agents, schemas, etc.
  name: string // extraction, classifier, etc.
  slot: string // v1.0.0, production, main, etc.
  slotType: SlotType
  fullTag: string // The complete git tag path
}

/**
 * Tag information with git metadata
 */
export interface TagInfo {
  tag: string
  sha: string
  date: string
  message: string
  author: string
}

/**
 * Extended tag info including parsed components
 */
export interface ExtendedTagInfo extends TagInfo, ParsedTag {}

/**
 * Git Tag Manager for Edgit component versioning
 *
 * Implements the 4-level tag hierarchy:
 *   {prefix}/{type}/{name}/{slot}
 *
 * Where:
 * - prefix: 'components' or 'logic'
 * - type: prompts, agents, schemas, ensembles, etc.
 * - name: component name (e.g., extraction, classifier)
 * - slot: version (v1.0.0) or environment (main, staging, production)
 *
 * Philosophy: Edgit is a thin git wrapper. It creates and manages git tags.
 * It doesn't deploy, doesn't sync to KV, doesn't communicate with Cloudflare.
 * GitHub Actions handles everything after `git push`.
 */
export class GitTagManager {
  private git: GitWrapper

  constructor(git: GitWrapper) {
    this.git = git
  }

  // ============================================================================
  // Tag Format Utilities
  // ============================================================================

  /**
   * Get namespace (pluralized type name) for entity type
   */
  getNamespace(entityType: EntityType): string {
    switch (entityType) {
      case 'agent':
        return 'agents'
      case 'query':
        return 'queries'
      default:
        return `${entityType}s`
    }
  }

  /**
   * Check if a slot is a version (semver format)
   */
  isVersionSlot(slot: string): boolean {
    return /^v\d+\.\d+\.\d+(-[\w.]+)?$/.test(slot)
  }

  /**
   * Check if a slot is an environment (not a version)
   */
  isEnvironmentSlot(slot: string): boolean {
    return !this.isVersionSlot(slot)
  }

  /**
   * Get slot type from slot string
   */
  getSlotType(slot: string): SlotType {
    return this.isVersionSlot(slot) ? 'version' : 'environment'
  }

  /**
   * Build a 4-level tag path
   * Format: {prefix}/{type}/{name}/{slot}
   */
  buildTagPath(prefix: TagPrefix, entityType: EntityType, name: string, slot: string): string {
    const namespace = this.getNamespace(entityType)
    return `${prefix}/${namespace}/${name}/${slot}`
  }

  /**
   * Parse a 4-level tag path
   * Returns null if format is invalid
   */
  parseTagPath(tag: string): ParsedTag | null {
    const parts = tag.split('/')
    if (parts.length !== 4) return null

    const [prefix, type, name, slot] = parts

    if (prefix !== 'components' && prefix !== 'logic') return null
    if (!type || !name || !slot) return null

    return {
      prefix: prefix as TagPrefix,
      type,
      name,
      slot,
      slotType: this.getSlotType(slot),
      fullTag: tag,
    }
  }

  // ============================================================================
  // Core Tag Operations
  // ============================================================================

  /**
   * Create an immutable version tag
   * Version tags cannot be overwritten
   */
  async createVersionTag(
    prefix: TagPrefix,
    entityType: EntityType,
    name: string,
    version: string,
    sha?: string,
    message?: string
  ): Promise<string> {
    if (!this.isVersionSlot(version)) {
      throw new Error(`Invalid semver version: ${version}. Use format: v1.0.0`)
    }

    const gitTag = this.buildTagPath(prefix, entityType, name, version)

    const exists = await this.tagExistsByPath(gitTag)
    if (exists) {
      throw new Error(`Tag already exists: ${gitTag}. Version tags are immutable.`)
    }

    const target = sha || 'HEAD'
    const tagMessage = message || `Release ${entityType} ${name} ${version}`

    const result = await this.git.exec(['tag', '-a', gitTag, target, '-m', tagMessage])

    if (result.exitCode !== 0) {
      throw new Error(`Failed to create tag ${gitTag}: ${result.stderr}`)
    }

    return gitTag
  }

  /**
   * Create or move an environment tag
   * Environment tags are mutable and can be moved with force
   */
  async setEnvironmentTag(
    prefix: TagPrefix,
    entityType: EntityType,
    name: string,
    env: string,
    targetRef: string = 'HEAD',
    message?: string
  ): Promise<string> {
    if (this.isVersionSlot(env)) {
      throw new Error(`"${env}" looks like a version. Use 'createVersionTag' for version tags.`)
    }

    const gitTag = this.buildTagPath(prefix, entityType, name, env)
    const targetSHA = await this.resolveRefToSHA(targetRef)
    const tagMessage = message || `Set ${entityType} ${name} to ${env}`

    // Delete existing local tag if present
    await this.git.exec(['tag', '-d', gitTag]).catch(() => {})

    const result = await this.git.exec(['tag', '-a', gitTag, targetSHA, '-m', tagMessage])

    if (result.exitCode !== 0) {
      throw new Error(`Failed to set environment tag ${gitTag}: ${result.stderr}`)
    }

    return gitTag
  }

  /**
   * Delete a tag (local only)
   */
  async deleteTag(
    prefix: TagPrefix,
    entityType: EntityType,
    name: string,
    slot: string
  ): Promise<void> {
    const gitTag = this.buildTagPath(prefix, entityType, name, slot)

    const result = await this.git.exec(['tag', '-d', gitTag])
    if (result.exitCode !== 0) {
      throw new Error(`Failed to delete tag ${gitTag}: ${result.stderr}`)
    }
  }

  /**
   * List all tags matching the 4-level pattern
   */
  async listTags(
    prefix?: TagPrefix,
    entityType?: EntityType,
    name?: string
  ): Promise<ExtendedTagInfo[]> {
    let pattern: string
    if (prefix && entityType && name) {
      const namespace = this.getNamespace(entityType)
      pattern = `${prefix}/${namespace}/${name}/*`
    } else if (prefix && entityType) {
      const namespace = this.getNamespace(entityType)
      pattern = `${prefix}/${namespace}/*/*`
    } else if (prefix) {
      pattern = `${prefix}/*/*/*`
    } else {
      pattern = '{components,logic}/*/*/*'
    }

    const result = await this.git.exec([
      'for-each-ref',
      '--format=%(refname:short)|%(if)%(*objectname)%(then)%(*objectname)%(else)%(objectname)%(end)|%(creatordate:iso)|%(contents:subject)|%(authorname)',
      `refs/tags/${pattern}`,
    ])

    if (result.exitCode !== 0 || !result.stdout.trim()) {
      return []
    }

    return result.stdout
      .trim()
      .split('\n')
      .map((line) => {
        const [fullTag, sha, date, message, author] = line.split('|')
        const parsed = this.parseTagPath(fullTag || '')
        if (!parsed) return null

        return {
          ...parsed,
          tag: parsed.slot,
          sha: sha || '',
          date: date || '',
          message: message || '',
          author: author || '',
        }
      })
      .filter((info): info is ExtendedTagInfo => info !== null)
  }

  /**
   * Get tag info by full path
   */
  async getTagInfo(gitTag: string): Promise<TagInfo> {
    const result = await this.git.exec([
      'for-each-ref',
      '--format=%(if)%(*objectname)%(then)%(*objectname)%(else)%(objectname)%(end)|%(creatordate:iso)|%(contents:subject)|%(authorname)',
      `refs/tags/${gitTag}`,
    ])

    if (result.exitCode !== 0 || !result.stdout.trim()) {
      throw new Error(`Tag not found: ${gitTag}`)
    }

    const parts = result.stdout.trim().split('|')
    const [sha, date, message, author] = parts
    const tagName = gitTag.split('/').pop() || gitTag

    return {
      tag: tagName,
      sha: sha || '',
      date: date || '',
      message: message || '',
      author: author || '',
    }
  }

  /**
   * Check if a tag exists by full path
   */
  async tagExistsByPath(gitTag: string): Promise<boolean> {
    const result = await this.git.exec(['tag', '-l', gitTag])
    return result.stdout.trim() === gitTag
  }

  /**
   * Check if a tag exists
   */
  async tagExists(
    prefix: TagPrefix,
    entityType: EntityType,
    name: string,
    slot: string
  ): Promise<boolean> {
    const gitTag = this.buildTagPath(prefix, entityType, name, slot)
    return this.tagExistsByPath(gitTag)
  }

  /**
   * Resolve any ref (SHA, tag, branch) to a SHA
   */
  async resolveRefToSHA(ref: string): Promise<string> {
    const result = await this.git.exec(['rev-parse', '--verify', ref])
    if (result.exitCode !== 0) {
      throw new Error(`Invalid ref: ${ref}. Not a valid commit, branch, or tag.`)
    }
    return result.stdout.trim()
  }

  /**
   * Get SHA that a tag points to
   */
  async getTagSHA(
    prefix: TagPrefix,
    entityType: EntityType,
    name: string,
    slot: string
  ): Promise<string> {
    const gitTag = this.buildTagPath(prefix, entityType, name, slot)
    const result = await this.git.exec(['rev-list', '-n', '1', gitTag])
    if (result.exitCode !== 0) {
      throw new Error(`Tag not found: ${gitTag}`)
    }
    return result.stdout.trim()
  }

  /**
   * Get file content at a specific tag
   */
  async getFileAtTag(
    prefix: TagPrefix,
    entityType: EntityType,
    name: string,
    slot: string,
    filePath: string
  ): Promise<string> {
    const sha = await this.getTagSHA(prefix, entityType, name, slot)
    const result = await this.git.exec(['show', `${sha}:${filePath}`])

    if (result.exitCode !== 0) {
      throw new Error(`File not found: ${filePath} at ${name}@${slot}`)
    }

    return result.stdout
  }

  /**
   * Get all version tags for a component (sorted by semver)
   */
  async getVersionTags(
    prefix: TagPrefix,
    entityType: EntityType,
    name: string
  ): Promise<ExtendedTagInfo[]> {
    const tags = await this.listTags(prefix, entityType, name)
    return tags
      .filter((t) => t.slotType === 'version')
      .sort((a, b) => {
        const aVersion = a.slot
          .replace(/^v/, '')
          .split('.')
          .map((n) => parseInt(n, 10))
        const bVersion = b.slot
          .replace(/^v/, '')
          .split('.')
          .map((n) => parseInt(n, 10))

        for (let i = 0; i < Math.min(aVersion.length, bVersion.length); i++) {
          const aNum = aVersion[i] ?? 0
          const bNum = bVersion[i] ?? 0
          if (aNum !== bNum) {
            return aNum - bNum
          }
        }
        return aVersion.length - bVersion.length
      })
  }

  /**
   * Get all environment tags for a component
   */
  async getEnvironmentTags(
    prefix: TagPrefix,
    entityType: EntityType,
    name: string
  ): Promise<ExtendedTagInfo[]> {
    const tags = await this.listTags(prefix, entityType, name)
    return tags.filter((t) => t.slotType === 'environment')
  }
}

// ============================================================================
// Result-based API (non-throwing alternatives)
// ============================================================================

export type GitTagError =
  | { kind: 'tag_exists'; tag: string; message: string }
  | { kind: 'tag_not_found'; tag: string; message: string }
  | { kind: 'git_error'; message: string; stderr?: string }
  | { kind: 'invalid_ref'; ref: string; message: string }
  | { kind: 'invalid_version'; version: string; message: string }
  | { kind: 'file_not_found'; path: string; tag: string; message: string }

export class GitTagManagerResult {
  private manager: GitTagManager

  constructor(git: GitWrapper) {
    this.manager = new GitTagManager(git)
  }

  async createVersionTag(
    prefix: TagPrefix,
    entityType: EntityType,
    name: string,
    version: string,
    sha?: string,
    message?: string
  ): Promise<Result<string, GitTagError>> {
    try {
      const gitTag = await this.manager.createVersionTag(
        prefix,
        entityType,
        name,
        version,
        sha,
        message
      )
      return { ok: true, value: gitTag }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('already exists')) {
        return { ok: false, error: { kind: 'tag_exists', tag: version, message: errorMessage } }
      }
      if (errorMessage.includes('Invalid semver')) {
        return { ok: false, error: { kind: 'invalid_version', version, message: errorMessage } }
      }
      return { ok: false, error: { kind: 'git_error', message: errorMessage } }
    }
  }

  async setEnvironmentTag(
    prefix: TagPrefix,
    entityType: EntityType,
    name: string,
    env: string,
    targetRef: string = 'HEAD',
    message?: string
  ): Promise<Result<string, GitTagError>> {
    try {
      const gitTag = await this.manager.setEnvironmentTag(
        prefix,
        entityType,
        name,
        env,
        targetRef,
        message
      )
      return { ok: true, value: gitTag }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('looks like a version')) {
        return {
          ok: false,
          error: { kind: 'invalid_version', version: env, message: errorMessage },
        }
      }
      if (errorMessage.includes('Invalid ref')) {
        return { ok: false, error: { kind: 'invalid_ref', ref: targetRef, message: errorMessage } }
      }
      return { ok: false, error: { kind: 'git_error', message: errorMessage } }
    }
  }

  async deleteTag(
    prefix: TagPrefix,
    entityType: EntityType,
    name: string,
    slot: string
  ): Promise<Result<void, GitTagError>> {
    try {
      await this.manager.deleteTag(prefix, entityType, name, slot)
      return { ok: true, value: undefined }
    } catch (error) {
      return {
        ok: false,
        error: {
          kind: 'tag_not_found',
          tag: slot,
          message: error instanceof Error ? error.message : String(error),
        },
      }
    }
  }

  async getTagSHA(
    prefix: TagPrefix,
    entityType: EntityType,
    name: string,
    slot: string
  ): Promise<Result<string, GitTagError>> {
    try {
      const sha = await this.manager.getTagSHA(prefix, entityType, name, slot)
      return { ok: true, value: sha }
    } catch (error) {
      return {
        ok: false,
        error: {
          kind: 'tag_not_found',
          tag: slot,
          message: error instanceof Error ? error.message : String(error),
        },
      }
    }
  }

  async getTagInfo(gitTag: string): Promise<Result<TagInfo, GitTagError>> {
    try {
      const info = await this.manager.getTagInfo(gitTag)
      return { ok: true, value: info }
    } catch (error) {
      return {
        ok: false,
        error: {
          kind: 'tag_not_found',
          tag: gitTag,
          message: error instanceof Error ? error.message : String(error),
        },
      }
    }
  }

  async resolveRefToSHA(ref: string): Promise<Result<string, GitTagError>> {
    try {
      const sha = await this.manager.resolveRefToSHA(ref)
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

  async getFileAtTag(
    prefix: TagPrefix,
    entityType: EntityType,
    name: string,
    slot: string,
    filePath: string
  ): Promise<Result<string, GitTagError>> {
    try {
      const content = await this.manager.getFileAtTag(prefix, entityType, name, slot, filePath)
      return { ok: true, value: content }
    } catch (error) {
      return {
        ok: false,
        error: {
          kind: 'file_not_found',
          path: filePath,
          tag: slot,
          message: error instanceof Error ? error.message : String(error),
        },
      }
    }
  }

  get underlying(): GitTagManager {
    return this.manager
  }

  // Passthrough methods
  listTags = (prefix?: TagPrefix, entityType?: EntityType, name?: string) =>
    this.manager.listTags(prefix, entityType, name)
  tagExists = (prefix: TagPrefix, entityType: EntityType, name: string, slot: string) =>
    this.manager.tagExists(prefix, entityType, name, slot)
  getVersionTags = (prefix: TagPrefix, entityType: EntityType, name: string) =>
    this.manager.getVersionTags(prefix, entityType, name)
  getEnvironmentTags = (prefix: TagPrefix, entityType: EntityType, name: string) =>
    this.manager.getEnvironmentTags(prefix, entityType, name)
  isVersionSlot = (slot: string) => this.manager.isVersionSlot(slot)
  isEnvironmentSlot = (slot: string) => this.manager.isEnvironmentSlot(slot)
  getSlotType = (slot: string) => this.manager.getSlotType(slot)
  buildTagPath = (prefix: TagPrefix, entityType: EntityType, name: string, slot: string) =>
    this.manager.buildTagPath(prefix, entityType, name, slot)
  parseTagPath = (tag: string) => this.manager.parseTagPath(tag)
  getNamespace = (entityType: EntityType) => this.manager.getNamespace(entityType)
}

export function createGitTagManager(git: GitWrapper): GitTagManager {
  return new GitTagManager(git)
}

export function createGitTagManagerWithResult(git: GitWrapper): GitTagManagerResult {
  return new GitTagManagerResult(git)
}
