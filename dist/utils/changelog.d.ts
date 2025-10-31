/**
 * CHANGELOG.md management utility following Keep a Changelog standard
 * Automatically updates changelog with component version changes
 */
export interface ChangelogEntry {
    version: string;
    date: string;
    changes: {
        added: string[];
        changed: string[];
        deprecated: string[];
        removed: string[];
        fixed: string[];
        security: string[];
    };
}
export interface ComponentVersionChange {
    name: string;
    type: string;
    oldVersion: string;
    newVersion: string;
    action: 'created' | 'updated' | 'renamed' | 'deleted';
    message?: string;
}
/**
 * Manages CHANGELOG.md following Keep a Changelog format
 */
export declare class ChangelogManager {
    private filePath;
    constructor(repoRoot: string);
    /**
     * Update changelog with component version changes
     */
    updateChangelog(versionChanges: ComponentVersionChange[], commitMessage?: string, aiGeneratedEntries?: Map<string, string>): Promise<void>;
    /**
     * Read existing changelog or create template
     */
    private readExistingChangelog;
    /**
     * Create a new changelog entry from component changes
     */
    private createChangelogEntry;
    /**
     * Create description for a component change
     */
    private createChangeDescription;
    private getActionDescription;
    /**
     * Determine if commit is a fix based on message
     */
    private isFixCommit;
    /**
     * Determine release version from component changes
     */
    private determineReleaseVersion;
    /**
     * Insert new entry at the top of existing changelog
     */
    private insertNewEntry;
    /**
     * Format changelog entry as Markdown
     */
    private formatChangelogEntry;
    /**
     * Create standard changelog template
     */
    private createChangelogTemplate;
    /**
     * Check if changelog exists
     */
    exists(): Promise<boolean>;
    /**
     * Get changelog file path
     */
    getFilePath(): string;
}
/**
 * Create changelog manager for current repository
 */
export declare function createChangelogManager(repoRoot: string): Promise<ChangelogManager>;
//# sourceMappingURL=changelog.d.ts.map