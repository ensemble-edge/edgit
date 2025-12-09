import { Command } from './base.js';
/**
 * Tag command for managing component version and environment tags
 */
export declare class TagCommand extends Command {
    private tagManager;
    constructor();
    private extractFormat;
    execute(args: string[]): Promise<void>;
    /**
     * Create a version tag (immutable)
     */
    createTag(args: string[]): Promise<void>;
    /**
     * Set an environment tag (mutable)
     */
    setTag(args: string[]): Promise<void>;
    /**
     * List tags for a component or all components
     */
    listTags(args: string[]): Promise<void>;
    /**
     * Show detailed information about a specific tag
     */
    showTag(args: string[]): Promise<void>;
    /**
     * Delete a tag
     */
    deleteTag(args: string[]): Promise<void>;
    private listAllComponentTags;
    private getComponentTagData;
    private listComponentTags;
    /**
     * Bump version tag for a component
     * Finds latest version and increments based on bump type
     */
    private bumpTag;
    /**
     * Bump a semver version string
     */
    private bumpVersion;
    /**
     * Compare two semver versions
     * Returns negative if a < b, positive if a > b, 0 if equal
     */
    private compareSemver;
    private loadRegistry;
    getHelp(): string;
    private showHelp;
}
//# sourceMappingURL=tag.d.ts.map