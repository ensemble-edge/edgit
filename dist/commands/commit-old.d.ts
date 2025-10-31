import { Command } from './base.js';
/**
 * CommitCommand intercepts git commit to auto-version changed components
 */
export declare class CommitCommand extends Command {
    private static readonly EDGIT_DIR;
    private static readonly COMPONENTS_FILE;
    constructor();
    execute(args: string[]): Promise<void>;
    private isEdgitInitialized;
    private loadComponentsRegistry;
    private saveComponentsRegistry;
    private getComponentsFilePath;
    private parseBumpStrategy;
    private detectChangedComponents;
    /**
     * Detect staged components that have file headers (hybrid versioning)
     */
    private detectStagedHeaderComponents;
    /**
     * Infer component type from file path (fallback)
     */
    private inferTypeFromPath;
    private versionComponents;
    /**
     * Sync component file header with registry version (hybrid versioning)
     */
    private syncFileHeader;
    /**
     * Get the higher of two bump strategies (major > minor > patch)
     */
    private getHigherBumpStrategy;
    private showVersioningSummary;
    /**
     * Update CHANGELOG.md with component version changes
     */
    private updateChangelog;
    /**
     * Generate AI-powered changelog entries for components
     */
    private generateChangelogEntries;
    private filterGitArgs;
    /**
     * Enhance git args with AI-generated commit message if needed
     */
    private enhanceWithAICommitMessage;
    getHelp(): string;
}
/**
 * Convenience function to create and execute CommitCommand
 */
export declare function commitWithVersioning(args?: string[], context?: any): Promise<void>;
//# sourceMappingURL=commit-old.d.ts.map