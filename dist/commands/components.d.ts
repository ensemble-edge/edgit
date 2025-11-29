import { Command } from './base.js';
/**
 * ComponentsCommand for Git tag-based component management
 * Lists, shows, and manages components using Git tags for versioning
 */
export declare class ComponentsCommand extends Command {
    private static readonly EDGIT_DIR;
    private static readonly COMPONENTS_FILE;
    private tagManager;
    constructor();
    execute(args: string[]): Promise<void>;
    /**
     * List all components with Git tag information
     */
    private listComponents;
    /**
     * Find untracked components (files that exist but aren't in registry)
     * Leverages existing ComponentDetector and file discovery infrastructure
     */
    private findUntrackedComponents;
    /**
     * Find all files in the repository (tracked + untracked)
     */
    private findAllFiles;
    /**
     * List components in table format (default)
     */
    private listComponentsTable;
    /**
     * List components in JSON format
     */
    /**
     * JSON output structure for components
     */
    private listComponentsJSON;
    /**
     * List components in YAML format
     */
    private listComponentsYAML;
    /**
     * List components in tree format
     */
    private listComponentsTree;
    /**
     * Show detailed information about a specific component
     */
    private showComponent;
    /**
     * Checkout a component at a specific version/tag/SHA
     */
    private checkoutComponent;
    /**
     * Add a new component to the registry
     */
    private addComponent;
    /**
     * Remove a component from the registry
     */
    private removeComponent;
    /**
     * Show a summary of a component (used in listings)
     */
    private showComponentSummary;
    private loadComponentsRegistry;
    private saveComponentsRegistry;
    getHelp(): string;
}
//# sourceMappingURL=components.d.ts.map