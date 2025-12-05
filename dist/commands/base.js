import { GitWrapper } from '../utils/git.js';
import * as path from 'path';
import { log, colors } from '@ensemble-edge/ensemble/ui';
/**
 * Base command handler for Edgit
 * Provides common functionality and defines the interface for all commands
 *
 * Commands receive a GitWrapper instance via constructor injection.
 * If not provided, a new instance bound to process.cwd() is created.
 */
export class Command {
    git;
    detector;
    context;
    // Commands that edgit intercepts (rather than passing through to git)
    static INTERCEPTED_COMMANDS = [
        'init',
        'setup',
        'commit',
        'components',
        'component',
        'checkout',
        'discover',
        'resync',
        'register',
        // Legacy commands for backward compatibility
        'scan',
        'detect',
        'history',
    ];
    // Commands that should show component-aware information
    static ENHANCED_COMMANDS = ['status', 'log', 'diff'];
    /**
     * Create a command with optional dependency injection
     * @param git - GitWrapper instance (defaults to new instance for process.cwd())
     * @param detector - Optional component detector
     */
    constructor(git, detector) {
        this.git = git || new GitWrapper();
        this.detector = detector;
    }
    /**
     * Set command context
     * Note: The git workspace is immutable - use constructor injection for workspace control
     */
    setContext(context) {
        this.context = context;
    }
    /**
     * Resolve file path relative to workspace directory
     */
    resolveWorkspacePath(filePath) {
        if (this.context?.workspaceDir) {
            if (path.isAbsolute(filePath)) {
                return filePath;
            }
            return path.resolve(this.context.workspaceDir, filePath);
        }
        return filePath;
    }
    /**
     * Get effective working directory (workspace or process cwd)
     */
    getWorkingDirectory() {
        return this.context?.workspaceDir || process.cwd();
    }
    /**
     * Check if a command should be intercepted by edgit
     */
    static shouldIntercept(cmd) {
        return this.INTERCEPTED_COMMANDS.includes(cmd);
    }
    /**
     * Check if a command should be enhanced with component information
     */
    static shouldEnhance(cmd) {
        return this.ENHANCED_COMMANDS.includes(cmd);
    }
    /**
     * Validate that we're in a git repository
     */
    async validateGitRepo() {
        const isRepo = await this.git.isGitRepo();
        if (!isRepo) {
            throw new Error('Not a git repository. Please run "git init" first, then "edgit setup".');
        }
    }
    /**
     * Validate that git is installed
     */
    async validateGitInstalled() {
        const gitCheck = await this.git.checkGitInstalled();
        if (!gitCheck.installed) {
            const error = gitCheck.error || 'Git not found';
            throw new Error('Git is not installed or not available in PATH.\n' +
                `Error: ${error}\n` +
                'Please install Git from https://git-scm.com/downloads');
        }
    }
    /**
     * Show helpful error message with suggestions
     */
    showError(message, suggestions) {
        log.error(message);
        if (suggestions && suggestions.length > 0) {
            console.error('');
            console.error(colors.accent('💡 Suggestions:'));
            suggestions.forEach((suggestion) => {
                console.error(`   ${colors.dim('•')} ${suggestion}`);
            });
        }
    }
    /**
     * Show success message
     */
    showSuccess(message) {
        log.success(message);
    }
    /**
     * Show info message
     */
    showInfo(message) {
        log.info(message);
    }
    /**
     * Show warning message
     */
    showWarning(message) {
        log.warn(message);
    }
    /**
     * Parse common command line arguments
     */
    parseArgs(args) {
        const flags = {};
        const options = {};
        const positional = [];
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg?.startsWith('--')) {
                // Long option
                const key = arg.slice(2);
                const nextArg = args[i + 1];
                if (nextArg && !nextArg.startsWith('-')) {
                    // Option with value
                    options[key] = nextArg;
                    i++; // Skip next arg
                }
                else {
                    // Boolean flag
                    flags[key] = true;
                }
            }
            else if (arg?.startsWith('-') && arg.length > 1) {
                // Short option(s)
                const shortOpts = arg.slice(1);
                for (const char of shortOpts) {
                    flags[char] = true;
                }
            }
            else if (arg) {
                // Positional argument
                positional.push(arg);
            }
        }
        return { flags, options, positional };
    }
    /**
     * Check if help should be shown
     */
    shouldShowHelp(args) {
        return args.includes('--help') || args.includes('-h');
    }
}
/**
 * Registry for command implementations
 */
export class CommandRegistry {
    static commands = new Map();
    /**
     * Register a command implementation
     */
    static register(name, commandClass) {
        this.commands.set(name, commandClass);
    }
    /**
     * Get command implementation
     */
    static get(name) {
        return this.commands.get(name);
    }
    /**
     * Get all registered command names
     */
    static getAll() {
        return Array.from(this.commands.keys());
    }
    /**
     * Check if command is registered
     */
    static has(name) {
        return this.commands.has(name);
    }
}
/**
 * Create command execution context
 * @param workspaceDir - Optional workspace directory (defaults to process.cwd())
 */
export async function createCommandContext(workspaceDir) {
    const effectiveWorkspace = workspaceDir || process.cwd();
    const git = new GitWrapper(effectiveWorkspace);
    const cwd = process.cwd();
    // Get repo root in the context of the workspace directory
    const repoRoot = await git.getRepoRoot();
    const context = {
        cwd,
        workspaceDir: effectiveWorkspace,
        env: process.env,
        isCI: Boolean(process.env.CI),
        debug: Boolean(process.env.EDGIT_DEBUG),
    };
    if (repoRoot) {
        context.repoRoot = repoRoot;
    }
    return context;
}
//# sourceMappingURL=base.js.map