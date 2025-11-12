import type { GitWrapper } from './git.js';
/**
 * Entity types that can be versioned
 */
export type EntityType = 'component' | 'agent';
/**
 * Git Tag Manager for Edgit component and agent versioning and deployment
 * Handles namespaced tags with separation between version and deployment tags
 * Supports both components/ and agents/ namespaces
 */
export declare class GitTagManager {
    private git;
    constructor(git: GitWrapper);
    /**
     * Get namespace prefix for entity type
     */
    private getNamespace;
    /**
     * Create a namespaced tag for component or agent
     * @param name Entity name (component or agent name)
     * @param tagName Tag name (e.g., 'v1.0.0', 'prod', 'staging')
     * @param entityType Entity type ('component' or 'agent')
     * @param sha Optional SHA to tag (defaults to HEAD)
     * @param message Optional tag message
     */
    tag(name: string, tagName: string, entityType?: EntityType, sha?: string, message?: string): Promise<string>;
    /**
     * Create a namespaced component tag (backward compatible)
     * @deprecated Use tag() with entityType parameter instead
     */
    tagComponent(component: string, tagName: string, sha?: string, message?: string): Promise<string>;
    /**
     * Create a namespaced agent tag
     * @param agent Agent name
     * @param tagName Tag name (e.g., 'v1.0.0', 'prod', 'staging')
     * @param sha Optional SHA to tag (defaults to HEAD)
     * @param message Optional tag message
     */
    tagAgent(agent: string, tagName: string, sha?: string, message?: string): Promise<string>;
    /**
     * List all tags for a specific entity
     * @param name Entity name
     * @param entityType Entity type ('component' or 'agent')
     * @returns Array of tag names (without namespace prefix)
     */
    listTags(name: string, entityType?: EntityType): Promise<string[]>;
    /**
     * List all tags for a specific component (backward compatible)
     * @deprecated Use listTags() with entityType parameter instead
     */
    listComponentTags(component: string): Promise<string[]>;
    /**
     * List all tags for a specific agent
     * @param agent Agent name
     * @returns Array of tag names (without namespace prefix)
     */
    listAgentTags(agent: string): Promise<string[]>;
    /**
     * Get the SHA that a tag points to
     * @param name Entity name
     * @param tagName Tag name
     * @param entityType Entity type ('component' or 'agent')
     * @returns SHA hash
     */
    getTagSHA(name: string, tagName: string, entityType?: EntityType): Promise<string>;
    /**
     * Check if a tag exists
     * @param name Entity name
     * @param tagName Tag name
     * @param entityType Entity type ('component' or 'agent')
     * @returns True if tag exists
     */
    tagExists(name: string, tagName: string, entityType?: EntityType): Promise<boolean>;
    /**
     * Move a deployment tag to a new target (with force)
     * Used for deployment tags like 'prod', 'staging' that can move
     * @param name Entity name
     * @param env Environment name (prod, staging, etc.)
     * @param targetRef Target SHA, tag, or ref
     * @param entityType Entity type ('component' or 'agent')
     * @param message Optional tag message
     */
    moveDeploymentTag(name: string, env: string, targetRef: string, entityType?: EntityType, message?: string): Promise<string>;
    /**
     * Create an immutable version tag
     * Version tags cannot be overwritten (no force flag)
     * @param name Entity name
     * @param version Version string (e.g., 'v1.0.0')
     * @param entityType Entity type ('component' or 'agent')
     * @param sha Optional SHA to tag (defaults to HEAD)
     * @param message Optional tag message
     */
    createVersionTag(name: string, version: string, entityType?: EntityType, sha?: string, message?: string): Promise<string>;
    /**
     * Resolve a reference to a SHA
     * Handles SHAs, tags, version tags, deployment tags
     * @param name Entity name
     * @param ref Reference string (SHA, tag name, etc.)
     * @param entityType Entity type ('component' or 'agent')
     * @returns SHA hash
     */
    resolveRef(name: string, ref: string, entityType?: EntityType): Promise<string>;
    /**
     * Get detailed tag information
     * @param name Entity name
     * @param tagName Tag name
     * @param entityType Entity type ('component' or 'agent')
     * @returns Tag details with SHA, date, message, author
     */
    getTagInfo(name: string, tagName: string, entityType?: EntityType): Promise<{
        tag: string;
        sha: string;
        date: string;
        message: string;
        author: string;
    }>;
    /**
     * Get all version tags (sorted by semantic version)
     * @param name Entity name
     * @param entityType Entity type ('component' or 'agent')
     * @returns Array of version tag names sorted by version
     */
    getVersionTags(name: string, entityType?: EntityType): Promise<string[]>;
    /**
     * Get all deployment tags
     * @param name Entity name
     * @param entityType Entity type ('component' or 'agent')
     * @returns Array of deployment tag names
     */
    getDeploymentTags(name: string, entityType?: EntityType): Promise<string[]>;
    /**
     * Push tags to remote
     * @param name Entity name
     * @param entityType Entity type ('component' or 'agent')
     * @param tagNames Optional specific tags to push (defaults to all)
     * @param force Whether to force push (for deployment tags)
     */
    pushTags(name: string, entityType?: EntityType, tagNames?: string[], force?: boolean): Promise<void>;
    /**
     * Delete a tag
     * @param name Entity name
     * @param tagName Tag name to delete
     * @param entityType Entity type ('component' or 'agent')
     * @param deleteRemote Whether to also delete from remote
     */
    deleteTag(name: string, tagName: string, entityType?: EntityType, deleteRemote?: boolean): Promise<void>;
    /**
     * Get file content at a specific tag
     * @param name Entity name
     * @param tagName Tag name
     * @param filePath File path within the repository
     * @param entityType Entity type ('component' or 'agent')
     * @returns File content as string
     */
    getFileAtTag(name: string, tagName: string, filePath: string, entityType?: EntityType): Promise<string>;
}
/**
 * Convenience function to create GitTagManager instance
 */
export declare function createGitTagManager(git: GitWrapper): GitTagManager;
//# sourceMappingURL=git-tags.d.ts.map