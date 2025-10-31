/**
 * Core git wrapper functionality for Edgit
 * Provides git integration with proper error handling and validation
 */
export declare class GitWrapper {
    private static instance;
    private workspaceDir?;
    static getInstance(workspaceDir?: string): GitWrapper;
    /**
     * Set workspace directory for all git operations
     */
    setWorkspaceDir(workspaceDir: string): void;
    /**
     * Get current workspace directory
     */
    getWorkspaceDir(): string;
    /**
     * Check if git is installed and get version information
     */
    checkGitInstalled(): Promise<{
        installed: boolean;
        version?: string;
        error?: string;
    }>;
    /**
     * Execute git command with proper error handling
     */
    exec(args: string[], cwd?: string): Promise<{
        stdout: string;
        stderr: string;
        exitCode: number;
    }>;
    /**
     * Check if current directory is a git repository
     */
    isGitRepo(path?: string): Promise<boolean>;
    /**
     * Get the root directory of the git repository
     */
    getRepoRoot(cwd?: string): Promise<string | null>;
    /**
     * Get current git status (staged, unstaged, untracked files)
     */
    getStatus(): Promise<{
        staged: string[];
        unstaged: string[];
        untracked: string[];
    }>;
    /**
     * Get list of changed files between two commits
     */
    getChangedFiles(fromRef?: string, toRef?: string): Promise<string[]>;
    /**
     * Get current commit hash
     */
    getCurrentCommit(): Promise<string | null>;
    /**
     * Get commit information
     */
    getCommitInfo(commitHash: string): Promise<{
        hash: string;
        message: string;
        author: string;
        date: string;
    } | null>;
    /**
     * Check out a specific file from a commit
     */
    checkoutFile(filePath: string, commitHash: string): Promise<boolean>;
    /**
     * Check if a file exists at a specific commit
     */
    fileExistsAtCommit(filePath: string, commitHash: string): Promise<boolean>;
    /**
     * Pass through to native git (for unintercepted commands)
     * This maintains full compatibility with git CLI
     */
    passthrough(args: string[]): Promise<void>;
    /**
     * Check if git repository is clean (no uncommitted changes)
     */
    isClean(): Promise<boolean>;
    /**
     * Add files to git staging area
     */
    add(filePaths: string[]): Promise<boolean>;
    /**
     * Create a git commit
     */
    commit(message: string, filePaths?: string[]): Promise<boolean>;
    /**
     * Get git diff for specific files
     */
    getDiff(filePaths?: string[]): Promise<string>;
    /**
     * Get current branch name
     */
    getCurrentBranch(): Promise<string | null>;
    /**
     * Get commit history
     */
    getCommitHistory(count?: number): Promise<string[]>;
    /**
     * Get staged files
     */
    getStagedFiles(): Promise<string[]>;
}
/**
 * Convenience function to get GitWrapper instance
 */
export declare const git: () => GitWrapper;
//# sourceMappingURL=git.d.ts.map