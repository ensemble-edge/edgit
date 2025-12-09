import { Command } from './base.js';
/**
 * Push command - thin wrapper around `git push`
 *
 * This command embodies the "thin git wrapper" philosophy:
 * - Edgit's job ends at `git push`
 * - Everything after (KV sync, Worker rebuild) is GitHub Actions
 * - No Cloudflare communication, no KV knowledge
 *
 * Usage:
 *   edgit push                    # Push commits only
 *   edgit push --tags             # Push commits + all tags
 *   edgit push --tags --force     # Push with force (for moved env tags)
 *   edgit push --remote upstream  # Push to specific remote
 */
export declare class PushCommand extends Command {
    execute(args: string[]): Promise<void>;
    /**
     * Execute the push operation
     */
    private push;
    getHelp(): string;
}
//# sourceMappingURL=push.d.ts.map