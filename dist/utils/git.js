import { spawn } from 'child_process';
import { EdgitError } from '../errors/index.js';
/**
 * Core git wrapper functionality for Edgit
 * Provides git integration with proper error handling and validation
 *
 * Each instance is bound to a specific workspace directory (immutable).
 * Use createGitWrapper() factory function to create instances.
 */
export class GitWrapper {
    /**
     * Workspace directory for git operations (immutable after construction)
     */
    workspaceDir;
    /**
     * Create a new GitWrapper instance
     * @param workspaceDir - The workspace directory for git operations (defaults to process.cwd())
     */
    constructor(workspaceDir) {
        this.workspaceDir = workspaceDir || process.cwd();
    }
    /**
     * Get current workspace directory
     */
    getWorkspaceDir() {
        return this.workspaceDir;
    }
    /**
     * Check if git is installed and get version information
     */
    async checkGitInstalled() {
        try {
            const result = await this.exec(['--version']);
            if (result.exitCode === 0) {
                const version = result.stdout.trim().match(/git version (.+)/)?.[1];
                return version ? { installed: true, version } : { installed: true };
            }
            return { installed: false, error: result.stderr };
        }
        catch (error) {
            return {
                installed: false,
                error: error instanceof Error ? error.message : 'Git not found in PATH',
            };
        }
    }
    /**
     * Execute git command with proper error handling
     */
    async exec(args, cwd) {
        // Use provided cwd or the instance's workspace directory
        const workingDir = cwd || this.workspaceDir;
        return new Promise((resolve) => {
            const childProcess = spawn('git', args, {
                cwd: workingDir,
                stdio: ['inherit', 'pipe', 'pipe'],
            });
            let stdout = '';
            let stderr = '';
            childProcess.stdout?.on('data', (data) => {
                stdout += data.toString();
            });
            childProcess.stderr?.on('data', (data) => {
                stderr += data.toString();
            });
            childProcess.on('close', (exitCode) => {
                resolve({
                    stdout: stdout.trim(),
                    stderr: stderr.trim(),
                    exitCode: exitCode || 0,
                });
            });
            childProcess.on('error', (error) => {
                resolve({
                    stdout: '',
                    stderr: error.message,
                    exitCode: 1,
                });
            });
        });
    }
    /**
     * Check if current directory is a git repository
     */
    async isGitRepo(path) {
        try {
            // Use provided path or the instance's workspace directory
            const checkPath = path || this.workspaceDir;
            const result = await this.exec(['rev-parse', '--git-dir'], checkPath);
            return result.exitCode === 0;
        }
        catch {
            return false;
        }
    }
    /**
     * Get the root directory of the git repository
     */
    async getRepoRoot(cwd) {
        try {
            // Use provided cwd or the instance's workspace directory
            const workingDir = cwd || this.workspaceDir;
            const result = await this.exec(['rev-parse', '--show-toplevel'], workingDir);
            if (result.exitCode === 0) {
                return result.stdout.trim();
            }
            return null;
        }
        catch {
            return null;
        }
    }
    /**
     * Get current git status (staged, unstaged, untracked files)
     */
    async getStatus() {
        const result = await this.exec(['status', '--porcelain']);
        const staged = [];
        const unstaged = [];
        const untracked = [];
        if (result.exitCode === 0) {
            const lines = result.stdout.split('\n').filter((line) => line.trim());
            for (const line of lines) {
                const status = line.substring(0, 2);
                const filePath = line.substring(3);
                if (status[0] !== ' ' && status[0] !== '?') {
                    staged.push(filePath);
                }
                if (status[1] !== ' ') {
                    if (status[1] === '?') {
                        untracked.push(filePath);
                    }
                    else {
                        unstaged.push(filePath);
                    }
                }
            }
        }
        return { staged, unstaged, untracked };
    }
    /**
     * Get list of changed files between two commits
     */
    async getChangedFiles(fromRef, toRef) {
        const args = ['diff', '--name-only'];
        if (fromRef && toRef) {
            args.push(`${fromRef}..${toRef}`);
        }
        else if (fromRef) {
            args.push(fromRef);
        }
        else {
            args.push('--cached'); // Staged files
        }
        const result = await this.exec(args);
        if (result.exitCode === 0) {
            return result.stdout.split('\n').filter((line) => line.trim());
        }
        return [];
    }
    /**
     * Get current commit hash
     */
    async getCurrentCommit() {
        const result = await this.exec(['rev-parse', 'HEAD']);
        return result.exitCode === 0 ? result.stdout.trim() : null;
    }
    /**
     * Get commit information
     */
    async getCommitInfo(commitHash) {
        const result = await this.exec(['show', '--format=%H%n%s%n%an%n%ai', '--no-patch', commitHash]);
        if (result.exitCode === 0) {
            const lines = result.stdout.split('\n');
            if (lines.length >= 4 && lines[0] && lines[1] && lines[2] && lines[3]) {
                return {
                    hash: lines[0],
                    message: lines[1],
                    author: lines[2],
                    date: lines[3],
                };
            }
        }
        return null;
    }
    /**
     * Check out a specific file from a commit
     */
    async checkoutFile(filePath, commitHash) {
        // First check if the file exists at the target commit
        const fileExists = await this.fileExistsAtCommit(filePath, commitHash);
        if (!fileExists) {
            return false;
        }
        const result = await this.exec(['checkout', commitHash, '--', filePath]);
        return result.exitCode === 0;
    }
    /**
     * Check if a file exists at a specific commit
     */
    async fileExistsAtCommit(filePath, commitHash) {
        try {
            const result = await this.exec(['cat-file', '-e', `${commitHash}:${filePath}`]);
            return result.exitCode === 0;
        }
        catch {
            return false;
        }
    }
    /**
     * Pass through to native git (for unintercepted commands)
     * This maintains full compatibility with git CLI
     */
    async passthrough(args) {
        return new Promise((resolve, reject) => {
            const childProcess = spawn('git', args, {
                stdio: 'inherit', // Pass through all I/O
                cwd: this.workspaceDir,
            });
            childProcess.on('close', (exitCode) => {
                if (exitCode === 0) {
                    resolve();
                }
                else {
                    // Reject with EdgitError that includes exit code for CLI to handle
                    const error = new EdgitError('GIT_ERROR', `Git command failed with exit code ${exitCode || 1}`);
                    error.exitCode = exitCode || 1;
                    reject(error);
                }
            });
            childProcess.on('error', (error) => {
                reject(new EdgitError('GIT_ERROR', `Failed to execute git command: ${error.message}`, error));
            });
        });
    }
    /**
     * Check if git repository is clean (no uncommitted changes)
     */
    async isClean() {
        const status = await this.getStatus();
        return (status.staged.length === 0 && status.unstaged.length === 0 && status.untracked.length === 0);
    }
    /**
     * Add files to git staging area
     */
    async add(filePaths) {
        if (filePaths.length === 0)
            return true;
        const result = await this.exec(['add', ...filePaths]);
        return result.exitCode === 0;
    }
    /**
     * Create a git commit
     */
    async commit(message, filePaths) {
        const args = ['commit', '-m', message];
        if (filePaths && filePaths.length > 0) {
            args.push('--', ...filePaths);
        }
        const result = await this.exec(args);
        return result.exitCode === 0;
    }
    /**
     * Get git diff for specific files
     */
    async getDiff(filePaths) {
        const args = ['diff'];
        if (filePaths && filePaths.length > 0) {
            args.push('--', ...filePaths);
        }
        const result = await this.exec(args);
        return result.stdout;
    }
    /**
     * Get current branch name
     */
    async getCurrentBranch() {
        try {
            const result = await this.exec(['branch', '--show-current']);
            return result.exitCode === 0 ? result.stdout.trim() || null : null;
        }
        catch {
            return null;
        }
    }
    /**
     * Get commit history
     */
    async getCommitHistory(count = 10) {
        try {
            const result = await this.exec(['log', '--oneline', `-${count}`]);
            if (result.exitCode === 0) {
                return result.stdout
                    .trim()
                    .split('\n')
                    .filter((line) => line.length > 0);
            }
            return [];
        }
        catch {
            return [];
        }
    }
    /**
     * Get staged files
     */
    async getStagedFiles() {
        try {
            const result = await this.exec(['diff', '--cached', '--name-only']);
            if (result.exitCode === 0) {
                return result.stdout
                    .trim()
                    .split('\n')
                    .filter((line) => line.length > 0);
            }
            return [];
        }
        catch {
            return [];
        }
    }
}
/**
 * Factory function to create a new GitWrapper instance
 * @param workspaceDir - The workspace directory for git operations (defaults to process.cwd())
 */
export function createGitWrapper(workspaceDir) {
    return new GitWrapper(workspaceDir);
}
/**
 * Convenience function to create a GitWrapper for the current directory
 * @deprecated Use createGitWrapper() for explicit workspace control
 */
export const git = () => new GitWrapper();
//# sourceMappingURL=git.js.map