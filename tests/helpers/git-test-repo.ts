import { mkdtemp, rm, writeFile, readFile, access, mkdir } from 'fs/promises'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface CommandResult {
  exitCode: number
  stdout: string
  stderr: string
}

/**
 * TestGitRepo - Helper class for creating isolated Git repositories for testing
 *
 * Creates temporary Git repositories with proper initialization and cleanup.
 * Each test gets its own isolated environment.
 */
export class TestGitRepo {
  constructor(public path: string) {}

  /**
   * Create a new test repository in a temporary directory
   */
  static async create(): Promise<TestGitRepo> {
    const tempDir = await mkdtemp(join(tmpdir(), 'edgit-test-'))
    return new TestGitRepo(tempDir)
  }

  /**
   * Initialize Git repository with default config
   */
  async init(): Promise<void> {
    await this.exec('git init')
    await this.exec('git config user.email "test@example.com"')
    await this.exec('git config user.name "Test User"')
    // Create initial commit so we have a branch
    await this.writeFile('.gitkeep', '')
    await this.exec('git add .')
    await this.exec('git commit -m "Initial commit"')
  }

  /**
   * Write a file to the repository and stage it
   */
  async writeFile(relativePath: string, content: string): Promise<void> {
    const fullPath = join(this.path, relativePath)

    // Ensure directory exists
    await mkdir(dirname(fullPath), { recursive: true })

    await writeFile(fullPath, content, 'utf-8')
    await this.exec(`git add "${relativePath}"`)
  }

  /**
   * Read a file from the repository
   */
  async readFile(relativePath: string): Promise<string> {
    const fullPath = join(this.path, relativePath)
    return await readFile(fullPath, 'utf-8')
  }

  /**
   * Read and parse a JSON file
   */
  async readJSON<T = any>(relativePath: string): Promise<T> {
    const content = await this.readFile(relativePath)
    return JSON.parse(content) as T
  }

  /**
   * Check if a file exists
   */
  async fileExists(relativePath: string): Promise<boolean> {
    try {
      const fullPath = join(this.path, relativePath)
      await access(fullPath)
      return true
    } catch {
      return false
    }
  }

  /**
   * Create a Git commit
   */
  async commit(message: string): Promise<void> {
    await this.exec(`git commit -m "${message}"`)
  }

  /**
   * Create a Git tag
   */
  async createTag(tagName: string, message?: string): Promise<void> {
    if (message) {
      await this.exec(`git tag -a "${tagName}" -m "${message}"`)
    } else {
      await this.exec(`git tag "${tagName}"`)
    }
  }

  /**
   * List all Git tags
   */
  async listTags(): Promise<string[]> {
    const result = await this.exec('git tag -l')
    return result.stdout
      .split('\n')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
  }

  /**
   * Get the SHA of a tag
   */
  async getTagSha(tagName: string): Promise<string> {
    const result = await this.exec(`git rev-list -n 1 "${tagName}"`)
    return result.stdout.trim()
  }

  /**
   * Get current HEAD SHA
   */
  async getCurrentSha(): Promise<string> {
    const result = await this.exec('git rev-parse HEAD')
    return result.stdout.trim()
  }

  /**
   * Run edgit command in this repository
   */
  async runEdgit(args: string[]): Promise<CommandResult> {
    // Path to the built edgit CLI
    const edgitPath = join(__dirname, '../../dist/index.js')

    // Escape arguments properly
    const escapedArgs = args.map((arg) => {
      // If arg contains spaces or special chars, quote it
      if (arg.includes(' ') || arg.includes('*')) {
        return `"${arg.replace(/"/g, '\\"')}"`
      }
      return arg
    })

    const command = `node "${edgitPath}" ${escapedArgs.join(' ')}`

    try {
      const { stdout, stderr } = await execAsync(command, { cwd: this.path })
      return { exitCode: 0, stdout, stderr }
    } catch (error: any) {
      return {
        exitCode: error.code || 1,
        stdout: error.stdout || '',
        stderr: error.stderr || error.message || '',
      }
    }
  }

  /**
   * Execute a Git command in this repository
   */
  private async exec(command: string): Promise<{ stdout: string; stderr: string }> {
    return await execAsync(command, { cwd: this.path })
  }

  /**
   * Clean up the temporary repository
   */
  async cleanup(): Promise<void> {
    try {
      await rm(this.path, { recursive: true, force: true })
    } catch (error) {
      // Ignore cleanup errors
      console.warn(`Failed to cleanup test repo ${this.path}:`, error)
    }
  }
}
