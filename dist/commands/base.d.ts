import { GitWrapper } from '../utils/git.js';
import type { ComponentDetector } from '../utils/component-detector.js';
/**
 * Base command handler for Edgit
 * Provides common functionality and defines the interface for all commands
 */
export declare abstract class Command {
    protected git: GitWrapper;
    protected detector: ComponentDetector | undefined;
    protected context?: CommandContext;
    static readonly INTERCEPTED_COMMANDS: string[];
    static readonly ENHANCED_COMMANDS: string[];
    constructor(git?: GitWrapper, detector?: ComponentDetector);
    /**
     * Set command context (including workspace directory)
     */
    setContext(context: CommandContext): void;
    /**
     * Resolve file path relative to workspace directory
     */
    protected resolveWorkspacePath(filePath: string): string;
    /**
     * Get effective working directory (workspace or process cwd)
     */
    protected getWorkingDirectory(): string;
    /**
     * Check if a command should be intercepted by edgit
     */
    static shouldIntercept(cmd: string): boolean;
    /**
     * Check if a command should be enhanced with component information
     */
    static shouldEnhance(cmd: string): boolean;
    /**
     * Execute the command - to be implemented by subclasses
     */
    abstract execute(args: string[]): Promise<void>;
    /**
     * Validate that we're in a git repository
     */
    protected validateGitRepo(): Promise<void>;
    /**
     * Validate that git is installed
     */
    protected validateGitInstalled(): Promise<void>;
    /**
     * Show helpful error message with suggestions
     */
    protected showError(message: string, suggestions?: string[]): void;
    /**
     * Show success message
     */
    protected showSuccess(message: string): void;
    /**
     * Show info message
     */
    protected showInfo(message: string): void;
    /**
     * Show warning message
     */
    protected showWarning(message: string): void;
    /**
     * Parse common command line arguments
     */
    protected parseArgs(args: string[]): {
        flags: Record<string, boolean>;
        options: Record<string, string>;
        positional: string[];
    };
    /**
     * Get help text for the command
     */
    abstract getHelp(): string;
    /**
     * Check if help should be shown
     */
    protected shouldShowHelp(args: string[]): boolean;
}
/**
 * Registry for command implementations
 */
export declare class CommandRegistry {
    private static commands;
    /**
     * Register a command implementation
     */
    static register(name: string, commandClass: new () => Command): void;
    /**
     * Get command implementation
     */
    static get(name: string): (new () => Command) | undefined;
    /**
     * Get all registered command names
     */
    static getAll(): string[];
    /**
     * Check if command is registered
     */
    static has(name: string): boolean;
}
/**
 * Command execution context
 */
export interface CommandContext {
    /** Current working directory */
    cwd: string;
    /** Workspace directory for git operations */
    workspaceDir: string | undefined;
    /** Git repository root */
    repoRoot?: string;
    /** Environment variables */
    env: Record<string, string | undefined>;
    /** Whether running in CI/automated environment */
    isCI: boolean;
    /** Debug mode enabled */
    debug: boolean;
}
/**
 * Create command execution context
 */
export declare function createCommandContext(workspaceDir?: string): Promise<CommandContext>;
//# sourceMappingURL=base.d.ts.map