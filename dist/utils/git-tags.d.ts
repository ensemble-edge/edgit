import type { GitWrapper } from './git.js';
import type { Result } from '../types/result.js';
/**
 * Tag prefix - determines what happens on push
 * - components: Syncs to KV (hot-swappable)
 * - logic: Triggers Worker rebuild
 */
export type TagPrefix = 'components' | 'logic';
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
export type EntityType = 'agent' | 'prompt' | 'schema' | 'template' | 'query' | 'config' | 'script' | 'ensemble' | 'tool' | 'route';
/**
 * Slot type - determines mutability
 * - version: Immutable, semver format (v1.0.0)
 * - environment: Mutable, can be moved (main, staging, production)
 */
export type SlotType = 'version' | 'environment';
/**
 * Parsed tag information
 */
export interface ParsedTag {
    prefix: TagPrefix;
    type: string;
    name: string;
    slot: string;
    slotType: SlotType;
    fullTag: string;
}
/**
 * Tag information with git metadata
 */
export interface TagInfo {
    tag: string;
    sha: string;
    date: string;
    message: string;
    author: string;
}
/**
 * Extended tag info including parsed components
 */
export interface ExtendedTagInfo extends TagInfo, ParsedTag {
}
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
export declare class GitTagManager {
    private git;
    constructor(git: GitWrapper);
    /**
     * Get namespace (pluralized type name) for entity type
     */
    getNamespace(entityType: EntityType): string;
    /**
     * Check if a slot is a version (semver format)
     */
    isVersionSlot(slot: string): boolean;
    /**
     * Check if a slot is an environment (not a version)
     */
    isEnvironmentSlot(slot: string): boolean;
    /**
     * Get slot type from slot string
     */
    getSlotType(slot: string): SlotType;
    /**
     * Build a 4-level tag path
     * Format: {prefix}/{type}/{name}/{slot}
     */
    buildTagPath(prefix: TagPrefix, entityType: EntityType, name: string, slot: string): string;
    /**
     * Parse a 4-level tag path
     * Returns null if format is invalid
     */
    parseTagPath(tag: string): ParsedTag | null;
    /**
     * Create an immutable version tag
     * Version tags cannot be overwritten
     */
    createVersionTag(prefix: TagPrefix, entityType: EntityType, name: string, version: string, sha?: string, message?: string): Promise<string>;
    /**
     * Create or move an environment tag
     * Environment tags are mutable and can be moved with force
     */
    setEnvironmentTag(prefix: TagPrefix, entityType: EntityType, name: string, env: string, targetRef?: string, message?: string): Promise<string>;
    /**
     * Delete a tag (local only)
     */
    deleteTag(prefix: TagPrefix, entityType: EntityType, name: string, slot: string): Promise<void>;
    /**
     * List all tags matching the 4-level pattern
     */
    listTags(prefix?: TagPrefix, entityType?: EntityType, name?: string): Promise<ExtendedTagInfo[]>;
    /**
     * Get tag info by full path
     */
    getTagInfo(gitTag: string): Promise<TagInfo>;
    /**
     * Check if a tag exists by full path
     */
    tagExistsByPath(gitTag: string): Promise<boolean>;
    /**
     * Check if a tag exists
     */
    tagExists(prefix: TagPrefix, entityType: EntityType, name: string, slot: string): Promise<boolean>;
    /**
     * Resolve any ref (SHA, tag, branch) to a SHA
     */
    resolveRefToSHA(ref: string): Promise<string>;
    /**
     * Get SHA that a tag points to
     */
    getTagSHA(prefix: TagPrefix, entityType: EntityType, name: string, slot: string): Promise<string>;
    /**
     * Get file content at a specific tag
     */
    getFileAtTag(prefix: TagPrefix, entityType: EntityType, name: string, slot: string, filePath: string): Promise<string>;
    /**
     * Get all version tags for a component (sorted by semver)
     */
    getVersionTags(prefix: TagPrefix, entityType: EntityType, name: string): Promise<ExtendedTagInfo[]>;
    /**
     * Get all environment tags for a component
     */
    getEnvironmentTags(prefix: TagPrefix, entityType: EntityType, name: string): Promise<ExtendedTagInfo[]>;
}
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
    kind: 'invalid_version';
    version: string;
    message: string;
} | {
    kind: 'file_not_found';
    path: string;
    tag: string;
    message: string;
};
export declare class GitTagManagerResult {
    private manager;
    constructor(git: GitWrapper);
    createVersionTag(prefix: TagPrefix, entityType: EntityType, name: string, version: string, sha?: string, message?: string): Promise<Result<string, GitTagError>>;
    setEnvironmentTag(prefix: TagPrefix, entityType: EntityType, name: string, env: string, targetRef?: string, message?: string): Promise<Result<string, GitTagError>>;
    deleteTag(prefix: TagPrefix, entityType: EntityType, name: string, slot: string): Promise<Result<void, GitTagError>>;
    getTagSHA(prefix: TagPrefix, entityType: EntityType, name: string, slot: string): Promise<Result<string, GitTagError>>;
    getTagInfo(gitTag: string): Promise<Result<TagInfo, GitTagError>>;
    resolveRefToSHA(ref: string): Promise<Result<string, GitTagError>>;
    getFileAtTag(prefix: TagPrefix, entityType: EntityType, name: string, slot: string, filePath: string): Promise<Result<string, GitTagError>>;
    get underlying(): GitTagManager;
    listTags: (prefix?: TagPrefix, entityType?: EntityType, name?: string) => Promise<ExtendedTagInfo[]>;
    tagExists: (prefix: TagPrefix, entityType: EntityType, name: string, slot: string) => Promise<boolean>;
    getVersionTags: (prefix: TagPrefix, entityType: EntityType, name: string) => Promise<ExtendedTagInfo[]>;
    getEnvironmentTags: (prefix: TagPrefix, entityType: EntityType, name: string) => Promise<ExtendedTagInfo[]>;
    isVersionSlot: (slot: string) => boolean;
    isEnvironmentSlot: (slot: string) => boolean;
    getSlotType: (slot: string) => SlotType;
    buildTagPath: (prefix: TagPrefix, entityType: EntityType, name: string, slot: string) => string;
    parseTagPath: (tag: string) => ParsedTag | null;
    getNamespace: (entityType: EntityType) => string;
}
export declare function createGitTagManager(git: GitWrapper): GitTagManager;
export declare function createGitTagManagerWithResult(git: GitWrapper): GitTagManagerResult;
//# sourceMappingURL=git-tags.d.ts.map