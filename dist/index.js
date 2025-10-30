#!/usr/bin/env node
import { GitWrapper } from './utils/git.js';
import { setupEdgit } from './commands/init.js';
import { manageComponents } from './commands/components.js';
import { commitWithVersioning } from './commands/commit.js';
import { DiscoverCommand } from './commands/discover.js';
import { DetectCommand } from './commands/detect.js';
import { ResyncCommand } from './commands/resync.js';
import { PatternsCommand } from './commands/patterns.js';
import { RegisterCommand } from './commands/register.js';
import process from 'process';
import path from 'path';
import fs from 'fs/promises';
/**
 * Parse command line arguments with support for global options
 */
function parseArgs(argv) {
    const args = argv.slice(2);
    const options = {};
    const commandArgs = [];
    let command = '';
    let subcommand;
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if ((arg === '--workspace' || arg === '-w') && args[i + 1]) {
            options.workspace = args[++i];
        }
        else if (arg === '--help' || arg === '-h') {
            options.help = true;
        }
        else if (arg === '--version' || arg === '-v') {
            options.version = true;
        }
        else if (!command && arg) {
            command = arg;
        }
        else if (!subcommand && command && arg && isSubcommand(command, arg)) {
            subcommand = arg;
        }
        else if (arg) {
            commandArgs.push(arg);
        }
    }
    const workspace = options.workspace || process.cwd();
    return {
        command: command || '',
        subcommand,
        args: commandArgs,
        options,
        workspace
    };
}
/**
 * Check if an argument is a valid subcommand for the given command
 */
function isSubcommand(command, arg) {
    const subcommands = {
        components: ['list', 'ls', 'show', 'history', 'checkout', 'tag', 'sync', 'remove', 'rename'],
        discover: ['scan', 'detect', 'patterns'],
        patterns: ['list', 'add', 'remove', 'show']
    };
    return subcommands[command]?.includes(arg) || false;
}
/**
 * Validate workspace directory
 */
async function validateWorkspace(workspaceDir) {
    try {
        const stat = await fs.stat(workspaceDir);
        if (!stat.isDirectory()) {
            throw new Error(`${workspaceDir} is not a directory`);
        }
        const absolutePath = path.resolve(workspaceDir);
        // Check if it's a git repository
        try {
            await fs.access(path.join(absolutePath, '.git'));
        }
        catch {
            throw new Error(`${absolutePath} is not a git repository. Please run "git init" first, then "edgit setup".`);
        }
        return absolutePath;
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            throw new Error(`ENOENT: no such file or directory, stat '${workspaceDir}'`);
        }
        throw error;
    }
}
/**
 * Show main help information
 */
function showHelp() {
    console.log(`
🧩 Edgit - Component-aware Git for AI Orchestration

USAGE:
  edgit <command> [args...] [workspace-dir]
  edgit --workspace <dir> <command> [args...]

GLOBAL OPTIONS:
  --workspace <dir>, -w <dir>  Set workspace directory
  --version, -v                Show version information
  --help, -h                   Show this help message

CORE COMMANDS:
  init                 Initialize edgit in current git repository
  commit [args...]     Commit with automatic component versioning
  status [args...]     Show git status with component information
  resync [options]     Recover from corrupted state, rebuild from Git

COMPONENT MANAGEMENT:
  components list      List all tracked components
  components show <name>       Show component details  
  components history <name>    Show version history
  components checkout <comp@ver>   Restore component version
  components tag <name> <tag>      Tag component versions

DISCOVERY & ANALYSIS:
  discover scan [options]      Find potential components
  discover detect <file>       Analyze specific file
  discover patterns [options]  Manage detection patterns

SHORTCUTS:
  checkout <comp@ver>  Shortcut to components checkout
  
  --version, -v        Show version information
  --help, -h           Show this help message

EXAMPLES:
  edgit discover scan --type prompt           # Find potential prompt components
  edgit discover detect prompts/system.md    # Analyze specific file
  edgit components history extraction-prompt # Show version history
  edgit components tag prompt prod           # Tag version for deployment
  edgit resync --rebuild-history             # Recover from corruption

LEGACY COMMANDS (redirected):
  scan    → discover scan
  detect  → discover detect
  history → components history

GIT PASSTHROUGH:
  All other commands are passed through to git unchanged.
  Examples: edgit branch, edgit log, edgit push, etc.

COMPONENT DETECTION:
  Prompts:  prompts/**/*.md, **/*.prompt.md
  Agents:   agents/**/*.{js,ts}, **/*.agent.{js,ts}
  SQL:      queries/**/*.sql, **/*.query.sql  
  Configs:  configs/**/*.{yaml,yml}, **/*.config.{yaml,yml}

EXAMPLES:
  edgit setup                    # Initialize component tracking
  edgit commit -m "Update prompt" # Auto-version changed components
  edgit components               # List all components with versions
  edgit checkout prompt@1.0.0    # Restore specific component version
  edgit status                   # Git status + component changes
  
For more information, visit: https://github.com/ensemble-edge/edgit
  `);
}
/**
 * Show version information
 */
async function showVersion() {
    try {
        const packageJsonPath = path.join(path.dirname(new URL(import.meta.url).pathname), '../package.json');
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        console.log(`edgit v${packageJson.version}`);
    }
    catch {
        console.log('edgit v0.0.2');
    }
}
/**
 * Main CLI entry point with comprehensive command routing
 */
async function main() {
    try {
        const parsed = parseArgs(process.argv);
        // Handle global options first
        if (parsed.options.version) {
            await showVersion();
            return;
        }
        if (parsed.options.help || !parsed.command) {
            showHelp();
            return;
        }
        // Set working directory if specified
        let workspaceDir = parsed.workspace;
        if (parsed.command !== 'init' && parsed.command !== 'setup') {
            try {
                workspaceDir = await validateWorkspace(workspaceDir || process.cwd());
                process.chdir(workspaceDir);
                // Show workspace info if different from original cwd
                if (parsed.options.workspace) {
                    console.log(`📁 Working in: ${workspaceDir}\n`);
                }
            }
            catch (error) {
                if (parsed.command !== 'help' && parsed.command !== 'version') {
                    console.error(`❌ Failed to validate workspace directory: ${error.message}`);
                    process.exit(1);
                }
            }
        }
        // Route commands to appropriate handlers
        const command = parsed.command;
        const subcommand = parsed.subcommand;
        const args = parsed.args;
        switch (command) {
            case 'init':
            case 'setup':
                await setupEdgit(args);
                break;
            case 'commit':
                await commitWithVersioning(args);
                break;
            case 'components':
            case 'component':
                await manageComponents([subcommand, ...args].filter(Boolean));
                break;
            case 'discover':
                const discoverCmd = new DiscoverCommand();
                await discoverCmd.execute([subcommand, ...args].filter(Boolean));
                break;
            case 'detect':
                const detectCmd = new DetectCommand();
                await detectCmd.execute(args);
                break;
            case 'scan':
                console.log('ℹ️  "edgit scan" moved to "edgit discover scan"');
                const scanCmd = new DiscoverCommand();
                await scanCmd.execute(['scan', ...args]);
                break;
            case 'register':
                const registerCmd = new RegisterCommand();
                await registerCmd.execute(args);
                break;
            case 'resync':
                const resyncCmd = new ResyncCommand();
                await resyncCmd.execute(args);
                break;
            case 'patterns':
                const patternsCmd = new PatternsCommand();
                await patternsCmd.execute([subcommand, ...args].filter(Boolean));
                break;
            case 'history':
                console.log('ℹ️  "edgit history" moved to "edgit components history"');
                await manageComponents(['history', ...args]);
                break;
            case 'checkout':
                // Direct component checkout shortcut
                await manageComponents(['checkout', ...args]);
                break;
            case 'status':
                // Git status with component information
                const gitStatus = new GitWrapper();
                await gitStatus.passthrough(['status', ...args]);
                console.log('\n🧩 Component Status:');
                console.log('🚧 Component status tracking is not yet implemented.');
                break;
            default:
                // Git passthrough for all unknown commands
                const gitPassthrough = new GitWrapper();
                await gitPassthrough.passthrough([command, ...args]);
                break;
        }
    }
    catch (error) {
        console.error(`❌ ${error.message}`);
        process.exit(1);
    }
}
// Execute if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch((error) => {
        console.error('❌', error.message || error);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map