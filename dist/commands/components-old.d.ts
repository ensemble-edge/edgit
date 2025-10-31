import { Command } from './base.js';
/**
 * ComponentsCommand handles listing and managing components
 */
export declare class ComponentsCommand extends Command {
    private static readonly EDGIT_DIR;
    private static readonly COMPONENTS_FILE;
    constructor();
    execute(args: string[]): Promise<void>;
    private loadComponentsRegistry;
    private saveComponentsRegistry;
    private listComponents;
    private showComponent;
    private checkoutComponent;
    private tagComponent;
    private showComponentHistory;
    private getTypeIcon;
    getHelp(): string;
    /**
     * Sync components - Update file headers to match registry versions
     */
    private syncComponents;
    /**
     * Remove component from registry
     */
    private removeComponent;
    /**
     * Rename component in registry
     */
    private renameComponent;
    /**
     * Find component by name or display name
     */
    private findComponent;
    /**
     * Show worker names for Cloudflare deployment
     */
    private showWorkerNames;
}
/**
 * Convenience function to create and execute ComponentsCommand
 */
export declare function manageComponents(args?: string[]): Promise<void>;
//# sourceMappingURL=components-old.d.ts.map