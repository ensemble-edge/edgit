import { Command } from './base.js';
export interface DiscoverOptions {
}
/**
 * Discover command group for component discovery and analysis
 */
export declare class DiscoverCommand extends Command {
    execute(args: string[]): Promise<void>;
    getHelp(): string;
    private handlePatterns;
}
/**
 * Convenience function to create and execute DiscoverCommand
 */
export declare function manageDiscovery(args?: string[]): Promise<void>;
//# sourceMappingURL=discover.d.ts.map