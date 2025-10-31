import * as fs from 'fs/promises';
import * as path from 'path';
import { Command } from './base.js';
import { ComponentDetector } from '../utils/component-detector.js';
import { AICommitManager } from '../utils/ai-commit.js';
import { ComponentUtils } from '../models/components.js';
/**
 * CommitCommand for Git tag-based system
 * Keeps AI commit features but removes version bumping logic
 */
export class CommitCommand extends Command {
    static EDGIT_DIR = '.edgit';
    static COMPONENTS_FILE = 'components.json';
    constructor() {
        super();
        this.detector = new ComponentDetector(this.git);
    }
    async execute(args) {
        try {
            if (this.shouldShowHelp(args)) {
                console.log(this.getHelp());
                return;
            }
            await this.validateGitInstalled();
            await this.validateGitRepo();
            // Check if this is a component-aware repository
            if (!await this.isEdgitInitialized()) {
                this.showWarning('Edgit not initialized. Passing through to git commit.');
                await this.git.passthrough(['commit', ...args]);
                return;
            }
            const { flags, options } = this.parseArgs(args);
            // Parse commit message
            const commitMessage = options.m || options.message;
            // Detect changed components (for AI context only)
            const changedComponents = await this.detectChangedComponents();
            if (changedComponents.length === 0) {
                // No component changes, pass through to normal git commit
                await this.git.passthrough(['commit', ...args]);
                return;
            }
            // Load registry for AI configuration
            const registry = await this.loadComponentsRegistry();
            // Generate AI commit message if needed
            let finalGitArgs = [...args];
            finalGitArgs = await this.enhanceWithAICommitMessage(finalGitArgs, commitMessage, changedComponents, registry);
            // Execute git commit
            await this.git.passthrough(['commit', ...finalGitArgs]);
            // Show summary of changed components (without versioning)
            if (changedComponents.length > 0) {
                await this.showComponentsSummary(changedComponents);
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.showError(`Commit failed: ${message}`);
            throw error;
        }
    }
    /**
     * Detect changed components in staging area
     */
    async detectChangedComponents() {
        if (!this.detector) {
            return [];
        }
        try {
            // Get staged files
            const stagedFiles = await this.git.getStagedFiles();
            if (stagedFiles.length === 0) {
                return [];
            }
            // Load registry to know which files are components
            const registry = await this.loadComponentsRegistry();
            const componentEntries = ComponentUtils.getAllComponents(registry);
            const changedComponents = [];
            // Check which staged files correspond to registered components
            for (const stagedFile of stagedFiles) {
                for (const { name, component } of componentEntries) {
                    if (component.path === stagedFile) {
                        // Determine action based on file status
                        const status = await this.git.getStatus();
                        let action = 'modified';
                        if (status.staged.includes(stagedFile)) {
                            // File is in staging - check if it's new or modified
                            const fileExists = await this.fileExists(stagedFile);
                            action = fileExists ? 'modified' : 'added';
                        }
                        changedComponents.push({
                            type: component.type,
                            name,
                            path: component.path,
                            action
                        });
                        break;
                    }
                }
            }
            return changedComponents;
        }
        catch (error) {
            console.warn(`Warning: Could not detect changed components: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return [];
        }
    }
    /**
     * Check if a file exists in the working directory
     */
    async fileExists(filePath) {
        try {
            const repoRoot = await this.git.getRepoRoot();
            if (!repoRoot)
                return false;
            const fullPath = path.join(repoRoot, filePath);
            await fs.access(fullPath);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Enhance git args with AI-generated commit message if needed
     */
    async enhanceWithAICommitMessage(gitArgs, existingMessage, changedComponents, registry) {
        // If message already provided, use it as-is
        if (existingMessage) {
            return gitArgs;
        }
        // Check if AI is enabled in config
        // For new minimal registry format, AI config is not stored in registry
        // Instead, check for .env file with OPENAI_API_KEY for AI availability
        let aiEnabled = false;
        try {
            // Simple check: if OPENAI_API_KEY exists in environment, AI is available
            aiEnabled = !!process.env.OPENAI_API_KEY;
        }
        catch {
            aiEnabled = false;
        }
        if (!aiEnabled) {
            return gitArgs;
        }
        try {
            this.showInfo('🤖 Generating AI commit message...');
            // Convert changed components to ComponentChange format
            const componentChanges = await Promise.all(changedComponents.map(async (comp) => {
                // Get the actual diff for this component
                const diff = await this.git.getDiff([comp.path]);
                return {
                    name: comp.name,
                    type: comp.type,
                    path: comp.path,
                    action: comp.action,
                    diff: diff || '',
                    oldVersion: 'n/a', // No version tracking in Git tag system
                    newVersion: 'n/a' // Versions are created via tags
                };
            }));
            // Get current branch and recent commits for context
            const currentBranch = await this.git.getCurrentBranch();
            const recentCommits = await this.git.getCommitHistory(5);
            const stagedFiles = await this.git.getStagedFiles();
            // Get overall diff for context
            const overallDiff = await this.git.getDiff();
            // Generate AI commit message with simple config
            const aiConfig = {
                mode: 'auto',
                provider: 'openai',
                model: 'gpt-4',
                maxDiffSize: 4000,
                timeout: 30000,
                generateComponentMessages: true,
                includeVersionsInCommit: false // No version tracking in Git tag system
            };
            const aiManager = new AICommitManager(aiConfig);
            const aiResponse = await aiManager.generateRepoMessage({
                components: componentChanges,
                stagedFiles: stagedFiles,
                overallDiff: overallDiff
            });
            if (aiResponse.success && aiResponse.message) {
                console.log(`📝 AI generated message: "${aiResponse.message}"`);
                // Add the AI-generated message to git args
                const enhancedArgs = ['-m', aiResponse.message, ...gitArgs];
                return enhancedArgs;
            }
            else {
                this.showInfo('💡 AI message generation failed, proceeding without message');
                return gitArgs;
            }
        }
        catch (error) {
            console.warn(`⚠️  AI commit message generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            this.showInfo('💡 Proceeding with commit without AI message');
            return gitArgs;
        }
    }
    /**
     * Show summary of changed components (without versioning info)
     */
    async showComponentsSummary(changedComponents) {
        console.log(`\n📦 Component Changes:`);
        for (const comp of changedComponents) {
            const emoji = comp.action === 'added' ? '➕' : comp.action === 'deleted' ? '❌' : '📝';
            console.log(`   ${emoji} ${comp.name} (${comp.type}) - ${comp.action}`);
        }
        console.log(`\n💡 Git tag-based versioning:`);
        console.log(`   Create version tags: edgit tag <component> v1.0.0`);
        console.log(`   Deploy to environment: edgit deploy <component> v1.0.0 --to prod`);
        console.log(`   View component history: edgit components show <component>`);
    }
    /**
     * Check if edgit is initialized
     */
    async isEdgitInitialized() {
        try {
            const repoRoot = await this.git.getRepoRoot();
            if (!repoRoot)
                return false;
            const edgitDir = path.join(repoRoot, CommitCommand.EDGIT_DIR);
            const componentsFile = path.join(edgitDir, CommitCommand.COMPONENTS_FILE);
            await fs.access(componentsFile);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Load components registry
     */
    async loadComponentsRegistry() {
        const repoRoot = await this.git.getRepoRoot();
        if (!repoRoot) {
            throw new Error('Not in a git repository');
        }
        const componentsFile = path.join(repoRoot, CommitCommand.EDGIT_DIR, CommitCommand.COMPONENTS_FILE);
        try {
            const content = await fs.readFile(componentsFile, 'utf8');
            return JSON.parse(content);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error('Edgit not initialized. Run "edgit init" first.');
            }
            throw new Error(`Failed to load components registry: ${error}`);
        }
    }
    /**
     * Get components file path
     */
    async getComponentsFilePath() {
        const repoRoot = await this.git.getRepoRoot();
        if (!repoRoot) {
            throw new Error('Not in a git repository');
        }
        return path.join(repoRoot, CommitCommand.EDGIT_DIR, CommitCommand.COMPONENTS_FILE);
    }
    getHelp() {
        return `
edgit commit - Commit with AI-powered commit messages

USAGE:
  edgit commit [git-commit-options]

GIT OPTIONS:
  All standard git commit options are supported:
  -m, --message <msg> Commit message
  -a, --all           Stage all changes
  --amend             Amend previous commit
  etc.

AI-POWERED COMMIT MESSAGES:
  • Automatically generates descriptive commit messages when no -m flag provided
  • Analyzes changed components and file diffs for context
  • Follows conventional commit format (feat:, fix:, etc.)
  • Configurable through .edgit/components.json metadata

GIT TAG-BASED VERSIONING:
  Instead of automatic version bumping, use explicit Git tags:
  
  edgit tag <component> v1.0.0           # Create version tag
  edgit deploy <component> v1.0.0 --to prod # Deploy to environment
  edgit components show <component>      # View all versions

EXAMPLES:
  edgit commit -m "fix: update extraction prompt"   # Manual message
  edgit commit                                       # AI-generated message
  edgit commit -a                                    # Stage all + AI message
  
WORKFLOW:
  1. Stage your changes (git add ...)
  2. Run edgit commit (with or without -m)
  3. AI analyzes component changes and generates message if needed
  4. Commit proceeds normally
  5. Create version tags separately: edgit tag <component> <version>

NOTE:
  This replaces automatic version bumping with explicit Git tag management.
  Use edgit tag and edgit deploy for version control and deployments.
`;
    }
}
/**
 * Convenience function to create and execute CommitCommand
 */
export async function commitWithVersioning(args = [], context) {
    const command = new CommitCommand();
    if (context) {
        command.setContext(context);
    }
    await command.execute(args);
}
//# sourceMappingURL=commit.js.map