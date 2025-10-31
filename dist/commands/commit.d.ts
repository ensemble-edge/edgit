import { Command } from './base.js';
/**
 * CommitCommand for Git tag-based system
 * Keeps AI commit features but removes version bumping logic
 */
export declare class CommitCommand extends Command {
    private static readonly EDGIT_DIR;
    private static readonly COMPONENTS_FILE;
    constructor();
    execute(args: string[]): Promise<void>;
    /**
     * Detect changed components in staging area
     */
    private detectChangedComponents;
    /**
     * Check if a file exists in the working directory
     */
    private fileExists;
    /**
     * Enhance git args with AI-generated commit message if needed
     */
    private enhanceWithAICommitMessage;
    /**
     * Show summary of changed components (without versioning info)
     */
    private showComponentsSummary;
    /**
     * Check if edgit is initialized
     */
    private isEdgitInitialized;
    /**
     * Load components registry
     */
    private loadComponentsRegistry;
    /**
     * Get components file path
     */
    private getComponentsFilePath;
    getHelp(): string;
}
/**
 * Convenience function to create and execute CommitCommand
 */
export declare function commitWithVersioning(args?: string[], context?: any): Promise<void>;
//# sourceMappingURL=commit.d.ts.map