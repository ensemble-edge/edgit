import { spawn } from 'child_process'
import type { ChildProcess } from 'child_process'
import * as path from 'path'
import * as fs from 'fs/promises'

/**
 * Core git wrapper functionality for Edgit
 * Provides git integration with proper error handling and validation
 */
export class GitWrapper {
  private static instance: GitWrapper
  private workspaceDir?: string

  public static getInstance(workspaceDir?: string): GitWrapper {
    if (!GitWrapper.instance) {
      GitWrapper.instance = new GitWrapper()
    }
    if (workspaceDir) {
      GitWrapper.instance.workspaceDir = workspaceDir
    }
    return GitWrapper.instance
  }

  /**
   * Set workspace directory for all git operations
   */
  public setWorkspaceDir(workspaceDir: string): void {
    this.workspaceDir = workspaceDir
  }

  /**
   * Get current workspace directory
   */
  public getWorkspaceDir(): string {
    return this.workspaceDir || process.cwd()
  }

  /**
   * Check if git is installed and get version information
   */
  async checkGitInstalled(): Promise<{ installed: boolean; version?: string; error?: string }> {
    try {
      const result = await this.exec(['--version'])
      if (result.exitCode === 0) {
        const version = result.stdout.trim().match(/git version (.+)/)?.[1]
        return version ? { installed: true, version } : { installed: true }
      }
      return { installed: false, error: result.stderr }
    } catch (error) {
      return {
        installed: false,
        error: error instanceof Error ? error.message : 'Git not found in PATH',
      }
    }
  }

  /**
   * Execute git command with proper error handling
   */
  async exec(
    args: string[],
    cwd?: string
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    // Use workspace directory if no cwd specified
    const workingDir = cwd || this.workspaceDir || process.cwd()

    return new Promise((resolve) => {
      const childProcess: ChildProcess = spawn('git', args, {
        cwd: workingDir,
        stdio: ['inherit', 'pipe', 'pipe'],
      })

      let stdout = ''
      let stderr = ''

      childProcess.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString()
      })

      childProcess.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString()
      })

      childProcess.on('close', (exitCode: number | null) => {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: exitCode || 0,
        })
      })

      childProcess.on('error', (error: Error) => {
        resolve({
          stdout: '',
          stderr: error.message,
          exitCode: 1,
        })
      })
    })
  }

  /**
   * Check if current directory is a git repository
   */
  async isGitRepo(path?: string): Promise<boolean> {
    try {
      // Use workspace directory if no path specified and workspace is set
      const checkPath = path || this.workspaceDir || '.'
      const result = await this.exec(['rev-parse', '--git-dir'], checkPath)
      return result.exitCode === 0
    } catch {
      return false
    }
  }

  /**
   * Get the root directory of the git repository
   */
  async getRepoRoot(cwd?: string): Promise<string | null> {
    try {
      // Use workspace directory if no cwd specified and workspace is set
      const workingDir = cwd || this.workspaceDir
      const result = await this.exec(['rev-parse', '--show-toplevel'], workingDir)
      if (result.exitCode === 0) {
        return result.stdout.trim()
      }
      return null
    } catch {
      return null
    }
  }

  /**
   * Get current git status (staged, unstaged, untracked files)
   */
  async getStatus(): Promise<{
    staged: string[]
    unstaged: string[]
    untracked: string[]
  }> {
    const result = await this.exec(['status', '--porcelain'])

    const staged: string[] = []
    const unstaged: string[] = []
    const untracked: string[] = []

    if (result.exitCode === 0) {
      const lines = result.stdout.split('\n').filter((line) => line.trim())

      for (const line of lines) {
        const status = line.substring(0, 2)
        const filePath = line.substring(3)

        if (status[0] !== ' ' && status[0] !== '?') {
          staged.push(filePath)
        }
        if (status[1] !== ' ') {
          if (status[1] === '?') {
            untracked.push(filePath)
          } else {
            unstaged.push(filePath)
          }
        }
      }
    }

    return { staged, unstaged, untracked }
  }

  /**
   * Get list of changed files between two commits
   */
  async getChangedFiles(fromRef?: string, toRef?: string): Promise<string[]> {
    const args = ['diff', '--name-only']

    if (fromRef && toRef) {
      args.push(`${fromRef}..${toRef}`)
    } else if (fromRef) {
      args.push(fromRef)
    } else {
      args.push('--cached') // Staged files
    }

    const result = await this.exec(args)

    if (result.exitCode === 0) {
      return result.stdout.split('\n').filter((line) => line.trim())
    }

    return []
  }

  /**
   * Get current commit hash
   */
  async getCurrentCommit(): Promise<string | null> {
    const result = await this.exec(['rev-parse', 'HEAD'])
    return result.exitCode === 0 ? result.stdout.trim() : null
  }

  /**
   * Get commit information
   */
  async getCommitInfo(commitHash: string): Promise<{
    hash: string
    message: string
    author: string
    date: string
  } | null> {
    const result = await this.exec(['show', '--format=%H%n%s%n%an%n%ai', '--no-patch', commitHash])

    if (result.exitCode === 0) {
      const lines = result.stdout.split('\n')
      if (lines.length >= 4 && lines[0] && lines[1] && lines[2] && lines[3]) {
        return {
          hash: lines[0],
          message: lines[1],
          author: lines[2],
          date: lines[3],
        }
      }
    }

    return null
  }

  /**
   * Check out a specific file from a commit
   */
  async checkoutFile(filePath: string, commitHash: string): Promise<boolean> {
    // First check if the file exists at the target commit
    const fileExists = await this.fileExistsAtCommit(filePath, commitHash)
    if (!fileExists) {
      return false
    }

    const result = await this.exec(['checkout', commitHash, '--', filePath])
    return result.exitCode === 0
  }

  /**
   * Check if a file exists at a specific commit
   */
  async fileExistsAtCommit(filePath: string, commitHash: string): Promise<boolean> {
    try {
      const result = await this.exec(['cat-file', '-e', `${commitHash}:${filePath}`])
      return result.exitCode === 0
    } catch {
      return false
    }
  }

  /**
   * Pass through to native git (for unintercepted commands)
   * This maintains full compatibility with git CLI
   */
  async passthrough(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const childProcess: ChildProcess = spawn('git', args, {
        stdio: 'inherit', // Pass through all I/O
        cwd: process.cwd(),
      })

      childProcess.on('close', (exitCode: number | null) => {
        if (exitCode === 0) {
          resolve()
        } else {
          process.exit(exitCode || 1)
        }
      })

      childProcess.on('error', (error: Error) => {
        console.error('Failed to execute git command:', error.message)
        process.exit(1)
      })
    })
  }

  /**
   * Check if git repository is clean (no uncommitted changes)
   */
  async isClean(): Promise<boolean> {
    const status = await this.getStatus()
    return (
      status.staged.length === 0 && status.unstaged.length === 0 && status.untracked.length === 0
    )
  }

  /**
   * Add files to git staging area
   */
  async add(filePaths: string[]): Promise<boolean> {
    if (filePaths.length === 0) return true

    const result = await this.exec(['add', ...filePaths])
    return result.exitCode === 0
  }

  /**
   * Create a git commit
   */
  async commit(message: string, filePaths?: string[]): Promise<boolean> {
    const args = ['commit', '-m', message]

    if (filePaths && filePaths.length > 0) {
      args.push('--', ...filePaths)
    }

    const result = await this.exec(args)
    return result.exitCode === 0
  }

  /**
   * Get git diff for specific files
   */
  async getDiff(filePaths?: string[]): Promise<string> {
    const args = ['diff']
    if (filePaths && filePaths.length > 0) {
      args.push('--', ...filePaths)
    }

    const result = await this.exec(args)
    return result.stdout
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(): Promise<string | null> {
    try {
      const result = await this.exec(['branch', '--show-current'])
      return result.exitCode === 0 ? result.stdout.trim() || null : null
    } catch {
      return null
    }
  }

  /**
   * Get commit history
   */
  async getCommitHistory(count: number = 10): Promise<string[]> {
    try {
      const result = await this.exec(['log', '--oneline', `-${count}`])
      if (result.exitCode === 0) {
        return result.stdout
          .trim()
          .split('\n')
          .filter((line) => line.length > 0)
      }
      return []
    } catch {
      return []
    }
  }

  /**
   * Get staged files
   */
  async getStagedFiles(): Promise<string[]> {
    try {
      const result = await this.exec(['diff', '--cached', '--name-only'])
      if (result.exitCode === 0) {
        return result.stdout
          .trim()
          .split('\n')
          .filter((line) => line.length > 0)
      }
      return []
    } catch {
      return []
    }
  }
}

/**
 * Convenience function to get GitWrapper instance
 */
export const git = () => GitWrapper.getInstance()
