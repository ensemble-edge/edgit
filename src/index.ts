#!/usr/bin/env node

// Load environment variables first
import dotenv from 'dotenv'
dotenv.config()

import { GitWrapper } from './utils/git.js'
import { setupEdgit } from './commands/init.js'
import { ComponentsCommand } from './commands/components.js'
import { TagCommand } from './commands/tag.js'
import { DeployCommand } from './commands/deploy.js'
import { commitWithVersioning } from './commands/commit.js'
import { DiscoverCommand } from './commands/discover.js'
import { DetectCommand } from './commands/detect.js'
import { ResyncCommand } from './commands/resync.js'
import { ScanCommand } from './commands/scan.js'
import { PatternsCommand } from './commands/patterns.js'
import { HistoryCommand } from './commands/history.js'
import { RegisterCommand } from './commands/register.js'
import process from 'process'
import path from 'path'
import fs from 'fs/promises'

/**
 * Edgit CLI - Component-aware Git wrapper with comprehensive command system
 */

interface GlobalOptions {
  help?: boolean
  version?: boolean
  workspace?: string | undefined
}

interface ParsedArgs {
  command: string
  subcommand?: string | undefined
  args: string[]
  options: GlobalOptions
  workspace: string | undefined
}

/**
 * Parse command line arguments with support for global options
 */
function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2)
  const options: GlobalOptions = {}
  const commandArgs: string[] = []
  let command = ''
  let subcommand: string | undefined

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if ((arg === '--workspace' || arg === '-w') && args[i + 1]) {
      options.workspace = args[++i] as string
    } else if (arg === '--help' || arg === '-h') {
      options.help = true
    } else if (arg === '--version' || arg === '-v') {
      options.version = true
    } else if (!command && arg) {
      command = arg
    } else if (!subcommand && command && arg && isSubcommand(command, arg)) {
      subcommand = arg
    } else if (arg) {
      commandArgs.push(arg)
    }
  }

  const workspace = options.workspace || process.cwd()

  return {
    command: command || '',
    subcommand,
    args: commandArgs,
    options,
    workspace,
  }
}

/**
 * Check if an argument is a valid subcommand for the given command
 */
function isSubcommand(command: string, arg: string): boolean {
  const subcommands: Record<string, string[]> = {
    components: ['list', 'ls', 'show', 'checkout', 'add', 'remove', 'rm'],
    tag: ['create', 'list', 'show', 'delete', 'push'],
    deploy: ['set', 'promote', 'status', 'list', 'rollback'],
    discover: ['scan', 'detect', 'patterns'],
    patterns: ['list', 'add', 'remove', 'show'],
  }

  return subcommands[command]?.includes(arg) || false
}

/**
 * Validate workspace directory
 */
async function validateWorkspace(workspaceDir: string): Promise<string> {
  try {
    const stat = await fs.stat(workspaceDir)
    if (!stat.isDirectory()) {
      throw new Error(`${workspaceDir} is not a directory`)
    }

    const absolutePath = path.resolve(workspaceDir)

    // Check if it's a git repository
    try {
      await fs.access(path.join(absolutePath, '.git'))
    } catch {
      throw new Error(
        `${absolutePath} is not a git repository. Please run "git init" first, then "edgit setup".`
      )
    }

    return absolutePath
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error(`ENOENT: no such file or directory, stat '${workspaceDir}'`)
    }
    throw error
  }
}

/**
 * Show main help information
 */
function showHelp(): void {
  console.log(`
🧩 Edgit - Git Tag-Based Component Versioning for AI Orchestration

USAGE:
  edgit <command> [args...] [workspace-dir]
  edgit --workspace <dir> <command> [args...]

GLOBAL OPTIONS:
  --workspace <dir>, -w <dir>  Set workspace directory
  --version, -v                Show version information
  --help, -h                   Show this help message

CORE COMMANDS:
  init                 Initialize edgit in current git repository
  commit [args...]     Commit with AI-powered commit messages
  status [args...]     Show git status with component information

COMPONENT MANAGEMENT:
  components list      List all tracked components with Git tag info
  components show <name>       Show component details and version tags
  components checkout <comp@ref> Show component content at version/tag/SHA
  components add <name> <path> <type> Add new component to registry
  components remove <name>     Remove component from registry

GIT TAG-BASED VERSIONING:
  tag create <comp> <version>  Create immutable version tag (v1.0.0)
  tag create <comp> <env>      Create/move deployment tag (prod, staging)
  tag list [component]         List tags for component(s)
  tag show <comp>@<tag>        Show detailed tag information
  tag delete <comp>@<tag>      Delete a tag
  tag push [component]         Push tags to remote

DEPLOYMENT MANAGEMENT:
  deploy set <comp> <ver> --to <env>     Deploy version to environment
  deploy promote <comp> --from <src> --to <dst> Promote between environments
  deploy status [component]              Show deployment status
  deploy list [environment]              List deployments
  deploy rollback <comp> --env <env>     Rollback deployment

DISCOVERY & ANALYSIS:
  discover scan [options]      Find potential components
  discover detect <file>       Analyze specific file
  discover patterns [options]  Manage detection patterns

SHORTCUTS:
  checkout <comp@ref>  Shortcut to components checkout
  
EXAMPLES:
  # Component management
  edgit components add my-prompt prompts/test.md prompt
  edgit components show extraction-prompt
  edgit checkout extraction-prompt@v1.0.0
  
  # Git tag versioning
  edgit tag create extraction-prompt v1.0.0    # Create version
  edgit tag create extraction-prompt prod      # Create deployment tag
  edgit tag list extraction-prompt             # List all tags
  
  # Deployment workflows
  edgit deploy set extraction-prompt v1.0.0 --to staging
  edgit deploy promote extraction-prompt --from staging --to prod
  edgit deploy status                          # Show all deployments
  
  # Discovery
  edgit discover scan --type prompt            # Find potential prompts
  edgit commit                                 # AI-generated commit message

KEY CONCEPTS:
  • Components are minimal manifests (path + type) in .edgit/components.json
  • All versioning is handled by Git tags: components/<name>/<version>
  • Version tags (v1.0.0) are immutable, deployment tags (prod) can move
  • No merge conflicts - Git tags are the source of truth
  • AI-powered commit messages analyze component changes

GIT PASSTHROUGH:
  All other commands are passed through to git unchanged.
  Examples: edgit branch, edgit log, edgit push, etc.
`)
}

/**
 * Show version information
 */
async function showVersion(): Promise<void> {
  try {
    const packageJsonPath = path.join(
      path.dirname(new URL(import.meta.url).pathname),
      '../package.json'
    )
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'))
    console.log(`edgit v${packageJson.version}`)
  } catch {
    console.log('edgit v0.0.2')
  }
}

/**
 * Main CLI entry point with comprehensive command routing
 */
async function main(): Promise<void> {
  try {
    const parsed = parseArgs(process.argv)

    // Handle global options first
    if (parsed.options.version) {
      await showVersion()
      return
    }

    // Only show main help if no command specified, or if help requested for main command
    if (!parsed.command || (parsed.options.help && !parsed.command)) {
      showHelp()
      return
    } // Set working directory if specified
    let workspaceDir = parsed.workspace
    if (parsed.command !== 'init' && parsed.command !== 'setup') {
      try {
        workspaceDir = await validateWorkspace(workspaceDir || process.cwd())
        process.chdir(workspaceDir)

        // Show workspace info if different from original cwd
        if (parsed.options.workspace) {
          console.log(`📁 Working in: ${workspaceDir}\n`)
        }
      } catch (error: any) {
        if (parsed.command !== 'help' && parsed.command !== 'version') {
          console.error(`❌ Failed to validate workspace directory: ${error.message}`)
          process.exit(1)
        }
      }
    }

    // Route commands to appropriate handlers
    const command = parsed.command
    const subcommand = parsed.subcommand
    const args = parsed.args

    switch (command) {
      case 'init':
      case 'setup':
        await setupEdgit(args)
        break

      case 'commit':
        await commitWithVersioning(args)
        break

      case 'components':
      case 'component':
        const componentsCmd = new ComponentsCommand()
        const componentArgs = [subcommand, ...args].filter(Boolean) as string[]
        if (parsed.options.help) {
          componentArgs.push('--help')
        }
        await componentsCmd.execute(componentArgs)
        break

      case 'tag':
        const tagCmd = new TagCommand()
        const tagArgs = [subcommand, ...args].filter(Boolean) as string[]
        if (parsed.options.help) {
          tagArgs.push('--help')
        }
        await tagCmd.execute(tagArgs)
        break

      case 'deploy':
        const deployCmd = new DeployCommand()
        const deployArgs = [subcommand, ...args].filter(Boolean) as string[]
        if (parsed.options.help) {
          deployArgs.push('--help')
        }
        await deployCmd.execute(deployArgs)
        break
      case 'discover':
        const discoverCmd = new DiscoverCommand()
        const discoverArgs = [subcommand, ...args].filter(Boolean) as string[]
        if (parsed.options.help) {
          discoverArgs.push('--help')
        }
        await discoverCmd.execute(discoverArgs)
        break

      case 'detect':
        const detectCmd = new DetectCommand()
        const detectArgs = [...args]
        if (parsed.options.help) {
          detectArgs.push('--help')
        }
        await detectCmd.execute(detectArgs)
        break

      case 'scan':
        console.log('ℹ️  "edgit scan" moved to "edgit discover scan"')
        const scanCmd = new DiscoverCommand()
        await scanCmd.execute(['scan', ...args])
        break

      case 'register':
        const registerCmd = new RegisterCommand()
        const registerArgs = [...args]
        if (parsed.options.help) {
          registerArgs.push('--help')
        }
        await registerCmd.execute(registerArgs)
        break

      case 'resync':
        const resyncCmd = new ResyncCommand()
        const resyncArgs = [...args]
        if (parsed.options.help) {
          resyncArgs.push('--help')
        }
        await resyncCmd.execute(resyncArgs)
        break

      case 'patterns':
        const patternsCmd = new PatternsCommand()
        const patternsArgs = [subcommand, ...args].filter(Boolean) as string[]
        if (parsed.options.help) {
          patternsArgs.push('--help')
        }
        await patternsCmd.execute(patternsArgs)
        break

      case 'history':
        console.log('ℹ️  "edgit history" moved to "edgit components show"')
        const historyComponentsCmd = new ComponentsCommand()
        await historyComponentsCmd.execute(['show', ...args])
        break

      case 'checkout':
        // Direct component checkout shortcut
        const checkoutComponentsCmd = new ComponentsCommand()
        await checkoutComponentsCmd.execute(['checkout', ...args])
        break

      case 'status':
        // Git status with component information
        const gitStatus = new GitWrapper()
        await gitStatus.passthrough(['status', ...args])

        console.log('\n🧩 Component Status:')
        console.log('🚧 Component status tracking is not yet implemented.')
        break

      default:
        // Git passthrough for all unknown commands
        const gitPassthrough = new GitWrapper()
        await gitPassthrough.passthrough([command, ...args])
        break
    }
  } catch (error: any) {
    console.error(`❌ ${error.message}`)
    process.exit(1)
  }
}

// Execute if running directly (handle both direct execution and npm bin symlinks)
const currentFileUrl = import.meta.url
const currentFilePath = new URL(currentFileUrl).pathname
const calledScript = process.argv[1]

// Check if this script is being executed directly or via npm bin
const isDirectExecution =
  calledScript &&
  (currentFilePath === calledScript || // Direct execution
    currentFileUrl === `file://${calledScript}` || // Direct with file:// protocol
    calledScript.includes('edgit')) // npm bin symlink

if (isDirectExecution) {
  main().catch((error) => {
    console.error('❌', error.message || error)
    process.exit(1)
  })
}
