import { GitWrapper } from './git.js';
/**
 * Git Tag Manager for Edgit component versioning and deployment
 * Handles namespaced component tags with separation between version and deployment tags
 */
export declare class GitTagManager {
    private git;
    constructor(git: GitWrapper);
    /**
     * Create a namespaced component tag
     * @param component Component name
     * @param tagName Tag name (e.g., 'v1.0.0', 'prod', 'staging')
     * @param sha Optional SHA to tag (defaults to HEAD)
     * @param message Optional tag message
     */
    tagComponent(component: string, tagName: string, sha?: string, message?: string): Promise<string>;
    /**
     * List all tags for a specific component
     * @param component Component name
     * @returns Array of tag names (without namespace prefix)
     */
    listComponentTags(component: string): Promise<string[]>;
    /**
     * Get the SHA that a tag points to
     * @param component Component name
     * @param tagName Tag name
     * @returns SHA hash
     */
    getTagSHA(component: string, tagName: string): Promise<string>;
    /**
     * Check if a tag exists for a component
     * @param component Component name
     * @param tagName Tag name
     * @returns True if tag exists
     */
    tagExists(component: string, tagName: string): Promise<boolean>;
    /**
     * Move a deployment tag to a new target (with force)
     * Used for deployment tags like 'prod', 'staging' that can move
     * @param component Component name
     * @param env Environment name (prod, staging, etc.)
     * @param targetRef Target SHA, tag, or ref
     * @param message Optional tag message
     */
    moveDeploymentTag(component: string, env: string, targetRef: string, message?: string): Promise<string>;
    /**
     * Create an immutable version tag
     * Version tags cannot be overwritten (no force flag)
     * @param component Component name
     * @param version Version string (e.g., 'v1.0.0')
     * @param sha Optional SHA to tag (defaults to HEAD)
     * @param message Optional tag message
     */
    createVersionTag(component: string, version: string, sha?: string, message?: string): Promise<string>;
    /**
     * Resolve a reference to a SHA
     * Handles SHAs, component tags, version tags, deployment tags
     * @param component Component name
     * @param ref Reference string (SHA, tag name, etc.)
     * @returns SHA hash
     */
    resolveRef(component: string, ref: string): Promise<string>;
    /**
     * Get detailed tag information
     * @param component Component name
     * @param tagName Tag name
     * @returns Tag details with SHA, date, message, author
     */
    getTagInfo(component: string, tagName: string): Promise<{
        tag: string;
        sha: string;
        date: string;
        message: string;
        author: string;
    }>;
    /**
     * Get all version tags for a component (sorted by semantic version)
     * @param component Component name
     * @returns Array of version tag names sorted by version
     */
    getVersionTags(component: string): Promise<string[]>;
    /**
     * Get all deployment tags for a component
     * @param component Component name
     * @returns Array of deployment tag names
     */
    getDeploymentTags(component: string): Promise<string[]>;
    /**
     * Push component tags to remote
     * @param component Component name
     * @param tagNames Optional specific tags to push (defaults to all)
     * @param force Whether to force push (for deployment tags)
     */
    pushTags(component: string, tagNames?: string[], force?: boolean): Promise<void>;
    /**
     * Delete a component tag
     * @param component Component name
     * @param tagName Tag name to delete
     * @param deleteRemote Whether to also delete from remote
     */
    deleteTag(component: string, tagName: string, deleteRemote?: boolean): Promise<void>;
    /**
     * Get file content at a specific tag
     * @param component Component name
     * @param tagName Tag name
     * @param filePath File path within the repository
     * @returns File content as string
     */
    getFileAtTag(component: string, tagName: string, filePath: string): Promise<string>;
}
/**
 * Convenience function to create GitTagManager instance
 */
export declare function createGitTagManager(git: GitWrapper): GitTagManager;
//# sourceMappingURL=git-tags.d.ts.map