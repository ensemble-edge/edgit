import { Command } from './base.js';
/**
 * Simplified resync command stub for Git tag-based versioning
 * The complex resync functionality is deprecated in favor of Git tags
 */
export declare class ResyncCommand extends Command {
    execute(args: string[]): Promise<void>;
    getHelp(): string;
}
//# sourceMappingURL=resync.d.ts.map