import { Command } from './base.js';
/**
 * Tag command for creating and managing component version and deployment tags
 * Replaces stored versioning with Git's native tag system
 */
export declare class TagCommand extends Command {
    private tagManager;
    constructor();
    execute(args: string[]): Promise<void>;
    /**
     * Create a version or deployment tag
     * Usage: edgit tag create <component> <tagname> [sha]
     *        edgit tag <component> <tagname> [sha]
     */
    createTag(args: string[]): Promise<void>;
    /**
     * Create an immutable version tag (v1.0.0)
     */
    createVersionTag(componentName: string, version: string, sha?: string): Promise<void>;
    /**
     * Create or move a deployment tag (prod, staging, etc.)
     */
    createDeploymentTag(componentName: string, env: string, targetRef?: string): Promise<void>;
    /**
     * Create a custom tag
     */
    createCustomTag(componentName: string, tagName: string, sha?: string): Promise<void>;
    /**
     * List tags for a component or all components
     * Usage: edgit tag list [component]
     */
    listTags(args: string[]): Promise<void>;
    /**
     * Show detailed information about a specific tag
     * Usage: edgit tag show <component>@<tag>
     */
    showTag(args: string[]): Promise<void>;
    /**
     * Delete a tag
     * Usage: edgit tag delete <component>@<tag> [--remote]
     */
    deleteTag(args: string[]): Promise<void>;
    /**
     * Push tags to remote
     * Usage: edgit tag push [component] [--force]
     */
    pushTags(args: string[]): Promise<void>;
    /**
     * Check if tag name is a version tag (v1.0.0, 1.0.0)
     */
    private isVersionTag;
    /**
     * Check if tag name is a deployment tag
     */
    private isDeploymentTag;
    /**
     * List tags for all components
     */
    private listAllComponentTags;
    /**
     * List tags for a specific component
     */
    private listComponentTags;
    /**
     * Load component registry
     */
    private loadRegistry;
    /**
     * Show help for tag command
     */
    getHelp(): string;
    /**
     * Show help for tag command
     */
    private showHelp;
}
//# sourceMappingURL=tag.d.ts.map