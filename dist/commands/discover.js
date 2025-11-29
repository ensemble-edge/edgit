import { Command } from './base.js';
import { ScanCommand } from './scan.js';
import { DetectCommand } from './detect.js';
import { EdgitError } from '../errors/index.js';
/**
 * Discover command group for component discovery and analysis
 */
export class DiscoverCommand extends Command {
    async execute(args) {
        const parsed = this.parseArgs(args);
        const [subcommand, ...subArgs] = parsed.positional;
        if (!subcommand || subcommand === 'help') {
            console.log(this.getHelp());
            return;
        }
        // Find where the subcommand starts in the original args and pass everything after it
        const subcommandIndex = args.indexOf(subcommand);
        const allSubArgs = subcommandIndex >= 0 ? args.slice(subcommandIndex + 1) : subArgs;
        switch (subcommand) {
            case 'scan':
                const scanCommand = new ScanCommand();
                await scanCommand.execute(allSubArgs);
                break;
            case 'detect':
                const detectCommand = new DetectCommand();
                await detectCommand.execute(allSubArgs);
                break;
            case 'patterns':
                await this.handlePatterns(allSubArgs);
                break;
            default:
                throw new EdgitError('VALIDATION_ERROR', `Unknown discover subcommand: ${subcommand}. Run "edgit discover --help" to see available subcommands.`);
        }
    }
    getHelp() {
        return `
Usage: edgit discover <subcommand> [options]

Component discovery and analysis tools.

SUBCOMMANDS:
  scan [options]         Scan repository for potential components
  detect <file>          Analyze a specific file for component detection
  patterns [options]     Manage detection patterns

OPTIONS:
  --help, -h             Show this help message

EXAMPLES:
  edgit discover scan --type prompt           # Find potential prompt components
  edgit discover detect prompts/system.md    # Analyze specific file
  edgit discover patterns list               # Show detection patterns
  edgit discover patterns add prompt "*.prompt"  # Add custom pattern

For detailed help on subcommands:
  edgit discover scan --help
  edgit discover detect --help
  edgit discover patterns --help
    `.trim();
    }
    async handlePatterns(args) {
        const { PatternsCommand } = await import('./patterns.js');
        const patternsCmd = new PatternsCommand(this.git);
        await patternsCmd.execute(args);
    }
}
/**
 * Convenience function to create and execute DiscoverCommand
 */
export async function manageDiscovery(args = []) {
    const command = new DiscoverCommand();
    await command.execute(args);
}
//# sourceMappingURL=discover.js.map