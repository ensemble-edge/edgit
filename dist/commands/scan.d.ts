import { Command } from './base.js';
export interface ScanOptions {
    pattern?: string | undefined;
    type?: string | undefined;
    withHeaders?: boolean | undefined;
    trackedOnly?: boolean | undefined;
    output?: 'table' | 'json' | 'simple';
}
export interface ScanResult {
    file: string;
    type: string;
    confidence: 'high' | 'medium' | 'low';
    registered: boolean;
    hasHeader: boolean;
    headerVersion?: string | undefined;
    suggested?: string | undefined;
}
/**
 * Scan command for discovering potential components in the repository
 */
export declare class ScanCommand extends Command {
    execute(args: string[]): Promise<void>;
    private extractScanOptions;
    private getFilesToScan;
    private findFilesByPattern;
    private findTrackedFiles;
    private findUntrackedFiles;
    private analyzeFile;
    private isFileRegistered;
    getHelp(): string;
    private calculateConfidence;
    private suggestComponentName;
    private outputResults;
}
//# sourceMappingURL=scan.d.ts.map