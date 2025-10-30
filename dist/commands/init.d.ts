import { Command } from './base.js';
/**
 * InitCommand handles 'edgit init' and 'edgit setup'
 * Initializes edgit in an existing git repository
 */
export declare class InitCommand extends Command {
    private static readonly EDGIT_DIR;
    private static readonly COMPONENTS_FILE;
    private static readonly GITIGNORE_ENTRY;
    constructor();
    execute(args: string[]): Promise<void>;
    private isAlreadyInitialized;
    private createEdgitDirectory;
    private scanExistingComponents;
    /**
     * Get repository URL for naming context
     */
    private getRepoUrl;
    /**
     * Add file headers to components
     */
    private addFileHeaders;
    private createComponentsRegistry;
    private updateGitignore;
    private showResults;
    getHelp(): string;
}
/**
 * Convenience function to create and execute InitCommand
 */
export declare function setupEdgit(args?: string[]): Promise<void>;
//# sourceMappingURL=init.d.ts.map