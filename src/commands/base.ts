import { GitWrapper } from '../utils/git.js'
import type { ComponentDetector } from '../utils/component-detector.js'
import * as path from 'path'

/**
 * Base command handler for Edgit
 * Provides common functionality and defines the interface for all commands
 *
 * Commands receive a GitWrapper instance via constructor injection.
 * If not provided, a new instance bound to process.cwd() is created.
 */
export abstract class Command {
  protected git: GitWrapper
  protected detector: ComponentDetector | undefined
  protected context?: CommandContext

  // Commands that edgit intercepts (rather than passing through to git)
  public static readonly INTERCEPTED_COMMANDS = [
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
  ]

  // Commands that should show component-aware information
  public static readonly ENHANCED_COMMANDS = ['status', 'log', 'diff']

  /**
   * Create a command with optional dependency injection
   * @param git - GitWrapper instance (defaults to new instance for process.cwd())
   * @param detector - Optional component detector
   */
  constructor(git?: GitWrapper, detector?: ComponentDetector) {
    this.git = git || new GitWrapper()
    this.detector = detector
  }

  /**
   * Set command context
   * Note: The git workspace is immutable - use constructor injection for workspace control
   */
  public setContext(context: CommandContext): void {
    this.context = context
  }

  /**
   * Resolve file path relative to workspace directory
   */
  protected resolveWorkspacePath(filePath: string): string {
    if (this.context?.workspaceDir) {
      if (path.isAbsolute(filePath)) {
        return filePath
      }
      return path.resolve(this.context.workspaceDir, filePath)
    }
    return filePath
  }

  /**
   * Get effective working directory (workspace or process cwd)
   */
  protected getWorkingDirectory(): string {
    return this.context?.workspaceDir || process.cwd()
  }

  /**
   * Check if a command should be intercepted by edgit
   */
  public static shouldIntercept(cmd: string): boolean {
    return this.INTERCEPTED_COMMANDS.includes(cmd)
  }

  /**
   * Check if a command should be enhanced with component information
   */
  public static shouldEnhance(cmd: string): boolean {
    return this.ENHANCED_COMMANDS.includes(cmd)
  }

  /**
   * Execute the command - to be implemented by subclasses
   */
  public abstract execute(args: string[]): Promise<void>

  /**
   * Validate that we're in a git repository
   */
  protected async validateGitRepo(): Promise<void> {
    const isRepo = await this.git.isGitRepo()
    if (!isRepo) {
      throw new Error('Not a git repository. Please run "git init" first, then "edgit setup".')
    }
  }

  /**
   * Validate that git is installed
   */
  protected async validateGitInstalled(): Promise<void> {
    const gitCheck = await this.git.checkGitInstalled()
    if (!gitCheck.installed) {
      const error = gitCheck.error || 'Git not found'
      throw new Error(
        'Git is not installed or not available in PATH.\n' +
          `Error: ${error}\n` +
          'Please install Git from https://git-scm.com/downloads'
      )
    }
  }

  /**
   * Show helpful error message with suggestions
   */
  protected showError(message: string, suggestions?: string[]): void {
    console.error(`❌ ${message}`)

    if (suggestions && suggestions.length > 0) {
      console.error('\n💡 Suggestions:')
      suggestions.forEach((suggestion) => {
        console.error(`   • ${suggestion}`)
      })
    }
  }

  /**
   * Show success message
   */
  protected showSuccess(message: string): void {
    console.log(`✅ ${message}`)
  }

  /**
   * Show info message
   */
  protected showInfo(message: string): void {
    console.log(`ℹ️  ${message}`)
  }

  /**
   * Show warning message
   */
  protected showWarning(message: string): void {
    console.log(`⚠️  ${message}`)
  }

  /**
   * Parse common command line arguments
   */
  protected parseArgs(args: string[]): {
    flags: Record<string, boolean>
    options: Record<string, string>
    positional: string[]
  } {
    const flags: Record<string, boolean> = {}
    const options: Record<string, string> = {}
    const positional: string[] = []

    for (let i = 0; i < args.length; i++) {
      const arg = args[i]

      if (arg?.startsWith('--')) {
        // Long option
        const key = arg.slice(2)
        const nextArg = args[i + 1]

        if (nextArg && !nextArg.startsWith('-')) {
          // Option with value
          options[key] = nextArg
          i++ // Skip next arg
        } else {
          // Boolean flag
          flags[key] = true
        }
      } else if (arg?.startsWith('-') && arg.length > 1) {
        // Short option(s)
        const shortOpts = arg.slice(1)
        for (const char of shortOpts) {
          flags[char] = true
        }
      } else if (arg) {
        // Positional argument
        positional.push(arg)
      }
    }

    return { flags, options, positional }
  }

  /**
   * Get help text for the command
   */
  public abstract getHelp(): string

  /**
   * Check if help should be shown
   */
  protected shouldShowHelp(args: string[]): boolean {
    return args.includes('--help') || args.includes('-h')
  }
}

/**
 * Registry for command implementations
 */
export class CommandRegistry {
  private static commands = new Map<string, new () => Command>()

  /**
   * Register a command implementation
   */
  public static register(name: string, commandClass: new () => Command): void {
    this.commands.set(name, commandClass)
  }

  /**
   * Get command implementation
   */
  public static get(name: string): (new () => Command) | undefined {
    return this.commands.get(name)
  }

  /**
   * Get all registered command names
   */
  public static getAll(): string[] {
    return Array.from(this.commands.keys())
  }

  /**
   * Check if command is registered
   */
  public static has(name: string): boolean {
    return this.commands.has(name)
  }
}

/**
 * Command execution context
 */
export interface CommandContext {
  /** Current working directory */
  cwd: string

  /** Workspace directory for git operations */
  workspaceDir: string | undefined

  /** Git repository root */
  repoRoot?: string

  /** Environment variables */
  env: Record<string, string | undefined>

  /** Whether running in CI/automated environment */
  isCI: boolean

  /** Debug mode enabled */
  debug: boolean
}

/**
 * Create command execution context
 * @param workspaceDir - Optional workspace directory (defaults to process.cwd())
 */
export async function createCommandContext(workspaceDir?: string): Promise<CommandContext> {
  const effectiveWorkspace = workspaceDir || process.cwd()
  const git = new GitWrapper(effectiveWorkspace)
  const cwd = process.cwd()

  // Get repo root in the context of the workspace directory
  const repoRoot = await git.getRepoRoot()

  const context: CommandContext = {
    cwd,
    workspaceDir: effectiveWorkspace,
    env: process.env,
    isCI: Boolean(process.env.CI),
    debug: Boolean(process.env.EDGIT_DEBUG),
  }

  if (repoRoot) {
    context.repoRoot = repoRoot
  }

  return context
}
