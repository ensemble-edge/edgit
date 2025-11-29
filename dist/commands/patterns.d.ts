import { Command } from './base.js';
import { type ComponentType } from '../models/components.js';
export interface PatternsOptions {
    type?: ComponentType;
    pattern?: string;
    description?: string;
    force?: boolean;
    test?: string;
    format?: 'table' | 'json';
}
/**
 * Patterns command for managing component detection patterns
 */
export declare class PatternsCommand extends Command {
    private prompt;
    constructor(...args: ConstructorParameters<typeof Command>);
    execute(args: string[]): Promise<void>;
    getHelp(): string;
    private extractPatternsOptions;
    private listPatterns;
    private addPattern;
    private removePattern;
    private testPattern;
    private groupPatternsByType;
    private loadCustomPatterns;
    private saveCustomPattern;
    private saveCustomPatterns;
    private testPatternAgainstFile;
    private promptForType;
    private promptForDescription;
    private confirmAction;
}
//# sourceMappingURL=patterns.d.ts.map