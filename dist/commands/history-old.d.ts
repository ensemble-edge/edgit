import { Command } from './base.js';
export interface HistoryOptions {
    limit?: number;
    component?: string;
    since?: string;
    format?: 'table' | 'json' | 'compact';
    withTags?: boolean;
    gitLog?: boolean;
}
export interface ComponentHistory {
    component: string;
    type: string;
    versions: {
        version: string;
        commit: string;
        timestamp: string;
        message?: string | undefined;
        tags: string[];
        isCurrent: boolean;
        changes?: {
            added: number;
            removed: number;
            files: string[];
        } | undefined;
    }[];
}
/**
 * History command for component version history with Git integration
 */
export declare class HistoryCommand extends Command {
    execute(args: string[]): Promise<void>;
    getHelp(): string;
    private extractHistoryOptions;
    private loadComponentsRegistry;
    private showSingleComponentHistory;
    private showAllComponentsHistory;
    private buildComponentHistory;
    private getTagsForVersion;
    private parseGitDate;
    private getCommitMessage;
    private getCommitChanges;
    private outputHistory;
}
//# sourceMappingURL=history-old.d.ts.map