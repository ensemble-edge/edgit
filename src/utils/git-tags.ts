import type { GitWrapper } from './git.js'

/**
 * Git Tag Manager for Edgit component versioning and deployment
 * Handles namespaced component tags with separation between version and deployment tags
 */
export class GitTagManager {
  private git: GitWrapper

  constructor(git: GitWrapper) {
    this.git = git
  }

  /**
   * Create a namespaced component tag
   * @param component Component name
   * @param tagName Tag name (e.g., 'v1.0.0', 'prod', 'staging')
   * @param sha Optional SHA to tag (defaults to HEAD)
   * @param message Optional tag message
   */
  async tagComponent(
    component: string,
    tagName: string,
    sha?: string,
    message?: string
  ): Promise<string> {
    const gitTag = `components/${component}/${tagName}`
    const target = sha || 'HEAD'
    const tagMessage = message || `Tag ${component} as ${tagName}`

    const result = await this.git.exec(['tag', '-a', gitTag, target, '-m', tagMessage])

    if (result.exitCode !== 0) {
      throw new Error(`Failed to create tag ${gitTag}: ${result.stderr}`)
    }

    return gitTag
  }

  /**
   * List all tags for a specific component
   * @param component Component name
   * @returns Array of tag names (without namespace prefix)
   */
  async listComponentTags(component: string): Promise<string[]> {
    const result = await this.git.exec(['tag', '-l', `components/${component}/*`])

    if (result.exitCode !== 0) {
      return []
    }

    return result.stdout
      .split('\n')
      .filter((line) => line.trim())
      .map((tag) => tag.replace(`components/${component}/`, ''))
  }

  /**
   * Get the SHA that a tag points to
   * @param component Component name
   * @param tagName Tag name
   * @returns SHA hash
   */
  async getTagSHA(component: string, tagName: string): Promise<string> {
    const gitTag = `components/${component}/${tagName}`
    const result = await this.git.exec(['rev-list', '-n', '1', gitTag])

    if (result.exitCode !== 0) {
      throw new Error(`Tag not found: ${gitTag}`)
    }

    return result.stdout.trim()
  }

  /**
   * Check if a tag exists for a component
   * @param component Component name
   * @param tagName Tag name
   * @returns True if tag exists
   */
  async tagExists(component: string, tagName: string): Promise<boolean> {
    try {
      await this.getTagSHA(component, tagName)
      return true
    } catch {
      return false
    }
  }

  /**
   * Move a deployment tag to a new target (with force)
   * Used for deployment tags like 'prod', 'staging' that can move
   * @param component Component name
   * @param env Environment name (prod, staging, etc.)
   * @param targetRef Target SHA, tag, or ref
   * @param message Optional tag message
   */
  async moveDeploymentTag(
    component: string,
    env: string,
    targetRef: string,
    message?: string
  ): Promise<string> {
    // Resolve target to SHA
    const targetSHA = await this.resolveRef(component, targetRef)
    const gitTag = `components/${component}/${env}`
    const tagMessage = message || `Deploy ${component} to ${env}`

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
   * @param component Component name
   * @param version Version string (e.g., 'v1.0.0')
   * @param sha Optional SHA to tag (defaults to HEAD)
   * @param message Optional tag message
   */
  async createVersionTag(
    component: string,
    version: string,
    sha?: string,
    message?: string
  ): Promise<string> {
    // Check if version tag already exists
    const exists = await this.tagExists(component, version)
    if (exists) {
      throw new Error(`Version tag ${version} already exists for ${component}`)
    }

    const tagMessage = message || `Release ${component} ${version}`
    return await this.tagComponent(component, version, sha, tagMessage)
  }

  /**
   * Resolve a reference to a SHA
   * Handles SHAs, component tags, version tags, deployment tags
   * @param component Component name
   * @param ref Reference string (SHA, tag name, etc.)
   * @returns SHA hash
   */
  async resolveRef(component: string, ref: string): Promise<string> {
    // If it looks like a SHA, try to resolve it directly
    if (ref.match(/^[0-9a-f]{6,40}$/i)) {
      const result = await this.git.exec(['rev-parse', ref])
      if (result.exitCode === 0) {
        return result.stdout.trim()
      }
    }

    // Try as a component tag
    try {
      return await this.getTagSHA(component, ref)
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
   * @param component Component name
   * @param tagName Tag name
   * @returns Tag details with SHA, date, message, author
   */
  async getTagInfo(
    component: string,
    tagName: string
  ): Promise<{
    tag: string
    sha: string
    date: string
    message: string
    author: string
  }> {
    const gitTag = `components/${component}/${tagName}`

    // Get tag object info
    const result = await this.git.exec([
      'for-each-ref',
      '--format=%(objectname)|%(authordate:iso)|%(contents:subject)|%(authorname)',
      `refs/tags/${gitTag}`,
    ])

    if (result.exitCode !== 0 || !result.stdout.trim()) {
      throw new Error(`Tag not found: ${gitTag}`)
    }

    const parts = result.stdout.trim().split('|')
    if (parts.length < 4) {
      throw new Error(`Invalid tag format for: ${gitTag}`)
    }

    const [sha, date, message, author] = parts

    return {
      tag: tagName,
      sha: sha || '',
      date: date || '',
      message: message || '',
      author: author || '',
    }
  }

  /**
   * Get all version tags for a component (sorted by semantic version)
   * @param component Component name
   * @returns Array of version tag names sorted by version
   */
  async getVersionTags(component: string): Promise<string[]> {
    const tags = await this.listComponentTags(component)
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
   * Get all deployment tags for a component
   * @param component Component name
   * @returns Array of deployment tag names
   */
  async getDeploymentTags(component: string): Promise<string[]> {
    const tags = await this.listComponentTags(component)
    const deploymentTags = ['prod', 'staging', 'canary', 'latest', 'dev']

    return tags.filter((tag) => deploymentTags.includes(tag))
  }

  /**
   * Push component tags to remote
   * @param component Component name
   * @param tagNames Optional specific tags to push (defaults to all)
   * @param force Whether to force push (for deployment tags)
   */
  async pushTags(component: string, tagNames?: string[], force: boolean = false): Promise<void> {
    const tags = tagNames || (await this.listComponentTags(component))
    const forceFlag = force ? '--force' : ''

    for (const tagName of tags) {
      const gitTag = `components/${component}/${tagName}`
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
   * Delete a component tag
   * @param component Component name
   * @param tagName Tag name to delete
   * @param deleteRemote Whether to also delete from remote
   */
  async deleteTag(
    component: string,
    tagName: string,
    deleteRemote: boolean = false
  ): Promise<void> {
    const gitTag = `components/${component}/${tagName}`

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
   * @param component Component name
   * @param tagName Tag name
   * @param filePath File path within the repository
   * @returns File content as string
   */
  async getFileAtTag(component: string, tagName: string, filePath: string): Promise<string> {
    const sha = await this.getTagSHA(component, tagName)
    const result = await this.git.exec(['show', `${sha}:${filePath}`])

    if (result.exitCode !== 0) {
      throw new Error(`File not found at tag: ${filePath} at ${component}@${tagName}`)
    }

    return result.stdout
  }
}

/**
 * Convenience function to create GitTagManager instance
 */
export function createGitTagManager(git: GitWrapper): GitTagManager {
  return new GitTagManager(git)
}
