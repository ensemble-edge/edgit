import { Command } from './base.js';
import { type Component } from '../models/components.js';
export interface ResyncOptions {
    force?: boolean;
    dryRun?: boolean;
    verbose?: boolean;
    rebuildHistory?: boolean;
    fixHeaders?: boolean;
}
export interface ResyncResult {
    componentsScanned: number;
    componentsFixed: number;
    versionsRecovered: number;
    headersFixed: number;
    errors: string[];
    changes: {
        added: Component[];
        updated: Component[];
        removed: string[];
        headerUpdates: string[];
    };
}
/**
 * Resync command for recovery and synchronization of component state
 */
export declare class ResyncCommand extends Command {
    execute(args: string[]): Promise<void>;
    getHelp(): string;
    private extractResyncOptions;
    private performResync;
    private loadOrCreateRegistry;
    private discoverAllComponents;
    /**
     * Find files that have component headers (for hybrid versioning)
     */
    private findFilesWithHeaders;
    /**
     * Check if a file has a component header
     */
    private fileHasComponentHeader;
    private processComponentFile;
    private createComponentFromGitHistory;
    private validateAndUpdateComponent;
    private buildVersionHistoryFromGit;
    /**
     * Validate version history entries against git and fix invalid ones
     */
    private validateVersionHistory;
    /**
     * Try to find the correct commit for a version by looking at git history
     */
    private findCommitForVersion;
    /**
     * Find the commit where a file was first created
     */
    private findFileCreationCommit;
    private getCurrentCommit;
    private removeDeletedComponents;
    private rebuildVersionHistory;
    private fixFileHeaders;
    /**
     * Bump a semantic version
     */
    private bumpVersion;
    /**
     * Compare two semantic versions
     * @returns > 0 if v1 > v2, < 0 if v1 < v2, 0 if equal
     */
    private compareVersions;
    private saveRegistry;
    private outputResult;
}
//# sourceMappingURL=resync.d.ts.map