import type { GitWrapper } from './git.js';
import type { Result } from '../types/result.js';
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
export type EntityType = 'agent' | 'prompt' | 'schema' | 'template' | 'query' | 'config' | 'script' | 'ensemble' | 'tool' | 'agent-definition' | 'component';
/**
 * Git Tag Manager for Edgit component and agent versioning and deployment
 * Handles namespaced tags with separation between version and deployment tags
 * Uses type-specific namespaces (prompts/, schemas/, templates/, etc.)
 */
export declare class GitTagManager {
    private git;
    constructor(git: GitWrapper);
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
     * @deprecated Use tag() with specific entityType (prompt, schema, template, etc.) instead
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
 * Git tag error types for Result-based API
 */
export type GitTagError = {
    kind: 'tag_exists';
    tag: string;
    message: string;
} | {
    kind: 'tag_not_found';
    tag: string;
    message: string;
} | {
    kind: 'git_error';
    message: string;
    stderr?: string;
} | {
    kind: 'invalid_ref';
    ref: string;
    message: string;
} | {
    kind: 'file_not_found';
    path: string;
    tag: string;
    message: string;
};
/**
 * Tag information returned by Result-based methods
 */
export interface TagInfo {
    tag: string;
    sha: string;
    date: string;
    message: string;
    author: string;
}
/**
 * Result-based GitTagManager methods
 * These provide explicit error handling without throwing exceptions
 */
export declare class GitTagManagerResult {
    private manager;
    constructor(git: GitWrapper);
    /**
     * Create a tag with Result-based error handling
     */
    createTag(name: string, tagName: string, entityType?: EntityType, sha?: string, message?: string): Promise<Result<string, GitTagError>>;
    /**
     * Create an immutable version tag with Result-based error handling
     */
    createVersionTag(name: string, version: string, entityType?: EntityType, sha?: string, message?: string): Promise<Result<string, GitTagError>>;
    /**
     * Get tag SHA with Result-based error handling
     */
    getTagSHA(name: string, tagName: string, entityType?: EntityType): Promise<Result<string, GitTagError>>;
    /**
     * Get tag info with Result-based error handling
     */
    getTagInfo(name: string, tagName: string, entityType?: EntityType): Promise<Result<TagInfo, GitTagError>>;
    /**
     * Resolve a reference with Result-based error handling
     */
    resolveRef(name: string, ref: string, entityType?: EntityType): Promise<Result<string, GitTagError>>;
    /**
     * Get file content at tag with Result-based error handling
     */
    getFileAtTag(name: string, tagName: string, filePath: string, entityType?: EntityType): Promise<Result<string, GitTagError>>;
    /**
     * Move deployment tag with Result-based error handling
     */
    moveDeploymentTag(name: string, env: string, targetRef: string, entityType?: EntityType, message?: string): Promise<Result<string, GitTagError>>;
    /**
     * Delete a tag with Result-based error handling
     */
    deleteTag(name: string, tagName: string, entityType?: EntityType, deleteRemote?: boolean): Promise<Result<void, GitTagError>>;
    /**
     * Access the underlying manager for non-Result methods
     */
    get underlying(): GitTagManager;
    listTags: (name: string, entityType?: EntityType) => Promise<string[]>;
    tagExists: (name: string, tagName: string, entityType?: EntityType) => Promise<boolean>;
    getVersionTags: (name: string, entityType?: EntityType) => Promise<string[]>;
    getDeploymentTags: (name: string, entityType?: EntityType) => Promise<string[]>;
    pushTags: (name: string, entityType?: EntityType, tagNames?: string[], force?: boolean) => Promise<void>;
}
/**
 * Convenience function to create GitTagManager instance
 */
export declare function createGitTagManager(git: GitWrapper): GitTagManager;
/**
 * Create a Result-based GitTagManager for explicit error handling
 */
export declare function createGitTagManagerWithResult(git: GitWrapper): GitTagManagerResult;
//# sourceMappingURL=git-tags.d.ts.map