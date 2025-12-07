#!/usr/bin/env node
/**
 * Edgit - Git-native component versioning
 * Copyright (c) 2024-2025 Higher Order Capital
 * Licensed under the MIT License
 *
 * Ensemble® is a registered trademark of Higinio O. Maycotte.
 */
// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();
import { GitWrapper } from './utils/git.js';
import { setupEdgit } from './commands/init.js';
import { ComponentsCommand } from './commands/components.js';
import { TagCommand } from './commands/tag.js';
import { DeployCommand } from './commands/deploy.js';
import { commitWithVersioning } from './commands/commit.js';
import { DiscoverCommand } from './commands/discover.js';
import { DetectCommand } from './commands/detect.js';
import { ResyncCommand } from './commands/resync.js';
import { PatternsCommand } from './commands/patterns.js';
import { RegisterCommand } from './commands/register.js';
import { InfoCommand } from './commands/info.js';
import { EdgitError, isEdgitError } from './errors/index.js';
import process from 'process';
import path from 'path';
import fs from 'fs/promises';
import { banners, log, colors } from './utils/ui.js';
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
        workspace,
    };
}
/**
 * Check if an argument is a valid subcommand for the given command
 */
function isSubcommand(command, arg) {
    const subcommands = {
        components: ['list', 'ls', 'show', 'checkout', 'add', 'remove', 'rm'],
        tag: ['create', 'list', 'show', 'delete', 'push'],
        deploy: ['set', 'promote', 'status', 'list', 'rollback'],
        discover: ['scan', 'detect', 'patterns'],
        patterns: ['list', 'add', 'remove', 'show'],
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
            throw new EdgitError('WORKSPACE_ERROR', `${workspaceDir} is not a directory`);
        }
        const absolutePath = path.resolve(workspaceDir);
        // Check if it's a git repository
        try {
            await fs.access(path.join(absolutePath, '.git'));
        }
        catch {
            throw new EdgitError('GIT_NOT_INITIALIZED', `${absolutePath} is not a git repository. Please run "git init" first, then "edgit setup".`);
        }
        return absolutePath;
    }
    catch (error) {
        if (isEdgitError(error)) {
            throw error;
        }
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            throw new EdgitError('FILE_NOT_FOUND', `No such file or directory: '${workspaceDir}'`);
        }
        throw EdgitError.from(error, 'WORKSPACE_ERROR');
    }
}
/**
 * Show main help information
 */
function showHelp() {
    banners.edgit();
    console.log('');
    console.log(colors.dim('Git Tag-Based Component Versioning for AI Orchestration'));
    console.log(`
${colors.bold('USAGE:')}
  edgit <command> [args...] [workspace-dir]
  edgit --workspace <dir> <command> [args...]

${colors.bold('GLOBAL OPTIONS:')}
  --workspace <dir>, -w <dir>  Set workspace directory
  --version, -v                Show version information
  --help, -h                   Show this help message

${colors.bold('CORE COMMANDS:')}
  init                 Initialize edgit in current git repository
  commit [args...]     Commit with AI-powered commit messages
  status [args...]     Show git status with component information

${colors.bold('COMPONENT MANAGEMENT:')}
  components list      List all tracked components with Git tag info
  components show <name>       Show component details and version tags
  components checkout <comp@ref> Show component content at version/tag/SHA
  components add <name> <path> <type> Add new component to registry
  components remove <name>     Remove component from registry

${colors.bold('GIT TAG-BASED VERSIONING:')}
  tag create <comp> <version>  Create immutable version tag (v1.0.0)
  tag create <comp> <env>      Create/move deployment tag (prod, staging)
  tag list [component]         List tags for component(s)
  tag show <comp>@<tag>        Show detailed tag information
  tag delete <comp>@<tag>      Delete a tag
  tag push [component]         Push tags to remote

${colors.bold('DEPLOYMENT MANAGEMENT:')}
  deploy set <comp> <ver> --to <env>     Deploy version to environment
  deploy promote <comp> --from <src> --to <dst> Promote between environments
  deploy status [component]              Show deployment status
  deploy list [environment]              List deployments
  deploy rollback <comp> --env <env>     Rollback deployment

${colors.bold('DISCOVERY & ANALYSIS:')}
  discover scan [options]      Find potential components
  discover detect <file>       Analyze specific file
  discover patterns [options]  Manage detection patterns

${colors.bold('SHORTCUTS:')}
  checkout <comp@ref>  Shortcut to components checkout
  
${colors.bold('EXAMPLES:')}
  ${colors.dim('# Component management')}
  ${colors.accent('edgit components add my-prompt prompts/test.md prompt')}
  ${colors.accent('edgit components show extraction-prompt')}
  ${colors.accent('edgit checkout extraction-prompt@v1.0.0')}

  ${colors.dim('# Git tag versioning')}
  ${colors.accent('edgit tag create extraction-prompt v1.0.0')}    ${colors.dim('# Create version')}
  ${colors.accent('edgit tag create extraction-prompt prod')}      ${colors.dim('# Create deployment tag')}
  ${colors.accent('edgit tag list extraction-prompt')}             ${colors.dim('# List all tags')}

  ${colors.dim('# Deployment workflows')}
  ${colors.accent('edgit deploy set extraction-prompt v1.0.0 --to staging')}
  ${colors.accent('edgit deploy promote extraction-prompt --from staging --to prod')}
  ${colors.accent('edgit deploy status')}                          ${colors.dim('# Show all deployments')}

  ${colors.dim('# Discovery')}
  ${colors.accent('edgit discover scan --type prompt')}            ${colors.dim('# Find potential prompts')}
  ${colors.accent('edgit commit')}                                 ${colors.dim('# AI-generated commit message')}

${colors.bold('KEY CONCEPTS:')}
  • Components are minimal manifests (path + type) in .edgit/components.json
  • All versioning is handled by Git tags: components/<name>/<version>
  • Version tags (v1.0.0) are immutable, deployment tags (prod) can move
  • No merge conflicts - Git tags are the source of truth
  • AI-powered commit messages analyze component changes

${colors.bold('GIT PASSTHROUGH:')}
  All other commands are passed through to git unchanged.
  Examples: edgit branch, edgit log, edgit push, etc.
`);
    console.log(colors.dim('Docs:'), colors.underline('https://docs.ensemble.ai/edgit'));
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
        // Fallback version if package.json can't be read
        console.log('edgit v0.2.1');
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
        // Only show main help if no command specified, or if help requested for main command
        if (!parsed.command || (parsed.options.help && !parsed.command)) {
            showHelp();
            return;
        } // Set working directory if specified
        let workspaceDir = parsed.workspace;
        if (parsed.command !== 'init' && parsed.command !== 'setup') {
            workspaceDir = await validateWorkspace(workspaceDir || process.cwd());
            process.chdir(workspaceDir);
            // Show workspace info if different from original cwd
            if (parsed.options.workspace) {
                log.dim(`Working in: ${workspaceDir}`);
                console.log('');
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
                const componentsCmd = new ComponentsCommand();
                const componentArgs = [subcommand, ...args].filter(Boolean);
                if (parsed.options.help) {
                    componentArgs.push('--help');
                }
                await componentsCmd.execute(componentArgs);
                break;
            case 'tag':
                const tagCmd = new TagCommand();
                const tagArgs = [subcommand, ...args].filter(Boolean);
                if (parsed.options.help) {
                    tagArgs.push('--help');
                }
                await tagCmd.execute(tagArgs);
                break;
            case 'deploy':
                const deployCmd = new DeployCommand();
                const deployArgs = [subcommand, ...args].filter(Boolean);
                if (parsed.options.help) {
                    deployArgs.push('--help');
                }
                await deployCmd.execute(deployArgs);
                break;
            case 'discover':
                const discoverCmd = new DiscoverCommand();
                const discoverArgs = [subcommand, ...args].filter(Boolean);
                if (parsed.options.help) {
                    discoverArgs.push('--help');
                }
                await discoverCmd.execute(discoverArgs);
                break;
            case 'detect':
                const detectCmd = new DetectCommand();
                const detectArgs = [...args];
                if (parsed.options.help) {
                    detectArgs.push('--help');
                }
                await detectCmd.execute(detectArgs);
                break;
            case 'scan':
                log.info('"edgit scan" moved to "edgit discover scan"');
                const scanCmd = new DiscoverCommand();
                await scanCmd.execute(['scan', ...args]);
                break;
            case 'register':
                const registerCmd = new RegisterCommand();
                const registerArgs = [...args];
                if (parsed.options.help) {
                    registerArgs.push('--help');
                }
                await registerCmd.execute(registerArgs);
                break;
            case 'resync':
                const resyncCmd = new ResyncCommand();
                const resyncArgs = [...args];
                if (parsed.options.help) {
                    resyncArgs.push('--help');
                }
                await resyncCmd.execute(resyncArgs);
                break;
            case 'patterns':
                const patternsCmd = new PatternsCommand();
                const patternsArgs = [subcommand, ...args].filter(Boolean);
                if (parsed.options.help) {
                    patternsArgs.push('--help');
                }
                await patternsCmd.execute(patternsArgs);
                break;
            case 'history':
                log.info('"edgit history" moved to "edgit components show"');
                const historyComponentsCmd = new ComponentsCommand();
                await historyComponentsCmd.execute(['show', ...args]);
                break;
            case 'checkout':
                // Direct component checkout shortcut
                const checkoutComponentsCmd = new ComponentsCommand();
                await checkoutComponentsCmd.execute(['checkout', ...args]);
                break;
            case 'info':
                // Edgit project info (authoritative source for ensemble CLI)
                const infoCmd = new InfoCommand();
                const infoArgs = [...args];
                if (parsed.options.help) {
                    infoArgs.push('--help');
                }
                await infoCmd.execute(infoArgs);
                break;
            case 'status':
                // Git status passthrough (keeps git status behavior)
                const gitStatus = new GitWrapper();
                await gitStatus.passthrough(['status', ...args]);
                break;
            default:
                // Git passthrough for all unknown commands
                const gitPassthrough = new GitWrapper();
                await gitPassthrough.passthrough([command, ...args]);
                break;
        }
    }
    catch (error) {
        // Convert to EdgitError if needed and display
        const edgitErr = isEdgitError(error) ? error : EdgitError.from(error);
        console.error(edgitErr.toCliMessage());
        process.exit(1);
    }
}
/**
 * Core CLI logic without error handling (for programmatic use)
 * Throws EdgitError on failures instead of calling process.exit
 */
async function runCore() {
    const parsed = parseArgs(process.argv);
    // Handle global options first
    if (parsed.options.version) {
        await showVersion();
        return;
    }
    // Only show main help if no command specified, or if help requested for main command
    if (!parsed.command || (parsed.options.help && !parsed.command)) {
        showHelp();
        return;
    }
    // Set working directory if specified
    let workspaceDir = parsed.workspace;
    if (parsed.command !== 'init' && parsed.command !== 'setup') {
        workspaceDir = await validateWorkspace(workspaceDir || process.cwd());
        process.chdir(workspaceDir);
        // Show workspace info if different from original cwd
        if (parsed.options.workspace) {
            log.dim(`Working in: ${workspaceDir}`);
            console.log('');
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
            const componentsCmd = new ComponentsCommand();
            const componentArgs = [subcommand, ...args].filter(Boolean);
            if (parsed.options.help) {
                componentArgs.push('--help');
            }
            await componentsCmd.execute(componentArgs);
            break;
        case 'tag':
            const tagCmd = new TagCommand();
            const tagArgs = [subcommand, ...args].filter(Boolean);
            if (parsed.options.help) {
                tagArgs.push('--help');
            }
            await tagCmd.execute(tagArgs);
            break;
        case 'deploy':
            const deployCmd = new DeployCommand();
            const deployArgs = [subcommand, ...args].filter(Boolean);
            if (parsed.options.help) {
                deployArgs.push('--help');
            }
            await deployCmd.execute(deployArgs);
            break;
        case 'discover':
            const discoverCmd = new DiscoverCommand();
            const discoverArgs = [subcommand, ...args].filter(Boolean);
            if (parsed.options.help) {
                discoverArgs.push('--help');
            }
            await discoverCmd.execute(discoverArgs);
            break;
        case 'detect':
            const detectCmd = new DetectCommand();
            const detectArgs = [...args];
            if (parsed.options.help) {
                detectArgs.push('--help');
            }
            await detectCmd.execute(detectArgs);
            break;
        case 'scan':
            log.info('"edgit scan" moved to "edgit discover scan"');
            const scanCmd = new DiscoverCommand();
            await scanCmd.execute(['scan', ...args]);
            break;
        case 'register':
            const registerCmd = new RegisterCommand();
            const registerArgs = [...args];
            if (parsed.options.help) {
                registerArgs.push('--help');
            }
            await registerCmd.execute(registerArgs);
            break;
        case 'resync':
            const resyncCmd = new ResyncCommand();
            const resyncArgs = [...args];
            if (parsed.options.help) {
                resyncArgs.push('--help');
            }
            await resyncCmd.execute(resyncArgs);
            break;
        case 'patterns':
            const patternsCmd = new PatternsCommand();
            const patternsArgs = [subcommand, ...args].filter(Boolean);
            if (parsed.options.help) {
                patternsArgs.push('--help');
            }
            await patternsCmd.execute(patternsArgs);
            break;
        case 'history':
            log.info('"edgit history" moved to "edgit components show"');
            const historyComponentsCmd = new ComponentsCommand();
            await historyComponentsCmd.execute(['show', ...args]);
            break;
        case 'checkout':
            // Direct component checkout shortcut
            const checkoutComponentsCmd = new ComponentsCommand();
            await checkoutComponentsCmd.execute(['checkout', ...args]);
            break;
        case 'status':
            // Git status with component information
            const gitStatus = new GitWrapper();
            await gitStatus.passthrough(['status', ...args]);
            console.log('');
            console.log(colors.primaryBold('🧩 Component Status:'));
            log.warn('Component status tracking is not yet implemented.');
            break;
        default:
            // Git passthrough for all unknown commands
            const gitPassthrough = new GitWrapper();
            await gitPassthrough.passthrough([command, ...args]);
            break;
    }
}
/**
 * Export main for programmatic CLI access
 * This allows the ensemble CLI to call edgit directly without subprocess spawning
 */
export { main };
/**
 * Run CLI with custom argv (for programmatic invocation)
 * Unlike main(), this throws errors instead of calling process.exit()
 * @param argv - Full argv array (typically starts with node path, script path, then args)
 */
export async function runCLI(argv) {
    // Temporarily override process.argv
    const originalArgv = process.argv;
    process.argv = argv;
    try {
        await runCore();
    }
    finally {
        process.argv = originalArgv;
    }
}
// Execute if running directly (handle both direct execution and npm bin symlinks)
const currentFileUrl = import.meta.url;
const currentFilePath = new URL(currentFileUrl).pathname;
const calledScript = process.argv[1];
// Check if this script is being executed directly or via npm bin
const isDirectExecution = calledScript &&
    (currentFilePath === calledScript || // Direct execution
        currentFileUrl === `file://${calledScript}` || // Direct with file:// protocol
        calledScript.includes('edgit')); // npm bin symlink
if (isDirectExecution) {
    main().catch((error) => {
        // This catch handles errors that escape main()'s try/catch (shouldn't happen)
        const edgitErr = isEdgitError(error) ? error : EdgitError.from(error);
        console.error(edgitErr.toCliMessage());
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map