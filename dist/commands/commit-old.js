import * as fs from 'fs/promises';
import * as path from 'path';
import { Command } from './base.js';
import { ComponentDetector } from '../utils/component-detector.js';
import { fileHeaderManager } from '../utils/file-headers.js';
import { ComponentNameGenerator } from '../utils/component-name-generator.js';
import { AICommitManager } from '../utils/ai-commit.js';
import { ChangelogManager } from '../utils/changelog.js';
import { SemVer, ComponentUtils } from '../models/components.js';
/**
 * CommitCommand intercepts git commit to auto-version changed components
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
            // Parse commit message to determine version bump strategy
            const commitMessage = options.m || options.message;
            const bumpStrategy = this.parseBumpStrategy(commitMessage, flags);
            // Detect changed components
            const changedComponents = await this.detectChangedComponents();
            if (changedComponents.length === 0) {
                this.showInfo('No component changes detected. Proceeding with normal commit.');
                await this.git.passthrough(['commit', ...args]);
                return;
            }
            // Load components registry
            const registry = await this.loadComponentsRegistry();
            // Version the changed components
            const versionedComponents = await this.versionComponents(registry, changedComponents, bumpStrategy, commitMessage);
            if (versionedComponents.length > 0) {
                // HYBRID VERSIONING: Sync file headers before commit
                for (const versionedComponent of versionedComponents) {
                    const component = ComponentUtils.findComponentByName(registry, versionedComponent.name);
                    if (component) {
                        await this.syncFileHeader(component);
                    }
                }
                // Save updated registry
                await this.saveComponentsRegistry(registry);
                // Stage the components.json file
                const componentsFile = await this.getComponentsFilePath();
                await this.git.add([componentsFile]);
                this.showInfo(`Auto-versioned ${versionedComponents.length} components`);
            }
            // Generate AI commit message if needed
            let finalGitArgs = this.filterGitArgs(args);
            finalGitArgs = await this.enhanceWithAICommitMessage(finalGitArgs, commitMessage, changedComponents, registry);
            // Proceed with git commit (filter out edgit-specific flags)
            await this.git.passthrough(['commit', ...finalGitArgs]);
            // Update changelog after successful commit
            if (versionedComponents.length > 0) {
                await this.updateChangelog(versionedComponents, commitMessage || '', registry);
            }
            // Show versioning summary after successful commit
            if (versionedComponents.length > 0) {
                await this.showVersioningSummary(versionedComponents);
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.showError(`Commit failed: ${message}`, [
                'Check that all files are properly staged',
                'Ensure commit message is provided',
                'Run "edgit setup" if component tracking is not initialized'
            ]);
            throw error;
        }
    }
    async isEdgitInitialized() {
        try {
            await this.loadComponentsRegistry();
            return true;
        }
        catch {
            return false;
        }
    }
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
                throw new Error('Edgit not initialized. Run "edgit setup" first.');
            }
            throw new Error(`Failed to load components registry: ${error}`);
        }
    }
    async saveComponentsRegistry(registry) {
        const repoRoot = await this.git.getRepoRoot();
        if (!repoRoot) {
            throw new Error('Not in a git repository');
        }
        const componentsFile = path.join(repoRoot, CommitCommand.EDGIT_DIR, CommitCommand.COMPONENTS_FILE);
        try {
            registry.updated = new Date().toISOString();
            const content = JSON.stringify(registry, null, 2);
            await fs.writeFile(componentsFile, content, 'utf8');
        }
        catch (error) {
            throw new Error(`Failed to save components registry: ${error}`);
        }
    }
    async getComponentsFilePath() {
        const repoRoot = await this.git.getRepoRoot();
        if (!repoRoot) {
            throw new Error('Not in a git repository');
        }
        return path.join(repoRoot, CommitCommand.EDGIT_DIR, CommitCommand.COMPONENTS_FILE);
    }
    parseBumpStrategy(commitMessage, flags = {}) {
        // Check explicit flags first
        if (flags.major)
            return 'major';
        if (flags.minor)
            return 'minor';
        if (flags.patch)
            return 'patch';
        // Parse conventional commit patterns
        if (commitMessage) {
            const msg = commitMessage.toLowerCase();
            // Breaking changes
            if (msg.includes('breaking change') || msg.includes('!')) {
                return 'major';
            }
            // Features
            if (msg.startsWith('feat') || msg.startsWith('feature')) {
                return 'minor';
            }
            // Bug fixes, docs, etc.
            if (msg.startsWith('fix') || msg.startsWith('docs') ||
                msg.startsWith('style') || msg.startsWith('refactor') ||
                msg.startsWith('test') || msg.startsWith('chore')) {
                return 'patch';
            }
        }
        // Default to patch
        return 'patch';
    }
    async detectChangedComponents() {
        if (!this.detector) {
            throw new Error('Component detector not initialized');
        }
        // Get components detected by patterns
        const patternBasedComponents = await this.detector.getStagedComponents();
        // Get components with file headers that might be staged
        const headerBasedComponents = await this.detectStagedHeaderComponents();
        // Merge and deduplicate by path
        const allComponents = [...patternBasedComponents];
        for (const headerComponent of headerBasedComponents) {
            const existingIndex = allComponents.findIndex(c => c.path === headerComponent.path);
            if (existingIndex === -1) {
                allComponents.push(headerComponent);
            }
        }
        return allComponents;
    }
    /**
     * Detect staged components that have file headers (hybrid versioning)
     */
    async detectStagedHeaderComponents() {
        const headerComponents = [];
        try {
            // Get list of staged files
            const result = await this.git.exec(['diff', '--cached', '--name-status']);
            const stagedFiles = result.stdout.split('\n').filter(line => line.trim());
            for (const line of stagedFiles) {
                const [status, filePath] = line.split('\t');
                if (!filePath)
                    continue;
                const action = status === 'A' ? 'added' :
                    status === 'D' ? 'deleted' : 'modified';
                if (action === 'deleted') {
                    // For deleted files, we can't read headers, but we might want to track them
                    continue;
                }
                // Check if file has component header
                const resolvedPath = this.resolveWorkspacePath(filePath);
                try {
                    const headerMetadata = await fileHeaderManager.readMetadata(resolvedPath);
                    if (headerMetadata && headerMetadata.component && headerMetadata.version) {
                        // Detect component type - use detector or fallback to analysis
                        const detected = this.detector?.detectComponent(resolvedPath);
                        const componentType = detected?.type || this.inferTypeFromPath(filePath);
                        const componentData = {
                            type: componentType,
                            name: headerMetadata.component,
                            path: filePath,
                            action
                        };
                        if (headerMetadata.componentId) {
                            componentData.componentId = headerMetadata.componentId;
                        }
                        headerComponents.push(componentData);
                    }
                }
                catch {
                    // File doesn't have header or can't be read - skip
                }
            }
        }
        catch (error) {
            console.warn(`⚠️  Warning: Could not detect header-based components: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        return headerComponents;
    }
    /**
     * Infer component type from file path (fallback)
     */
    inferTypeFromPath(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const basename = path.basename(filePath).toLowerCase();
        if (ext === '.md' || ext === '.txt' || basename.includes('prompt')) {
            return 'prompt';
        }
        if (ext === '.sql') {
            return 'sql';
        }
        if (ext === '.yaml' || ext === '.yml' || ext === '.json' || basename.includes('config')) {
            return 'config';
        }
        if (ext === '.js' || ext === '.ts' || ext === '.py' || basename.includes('agent')) {
            return 'agent';
        }
        return 'config'; // fallback to config instead of 'component'
    }
    async versionComponents(registry, changedComponents, bumpStrategy, commitMessage) {
        const versionedComponents = [];
        // Get current commit (will be available after commit)
        // For now, we'll update this post-commit if needed
        const currentCommit = await this.git.getCurrentCommit() || 'pending';
        for (const changed of changedComponents) {
            const componentName = changed.name;
            const componentId = changed.componentId;
            if (changed.action === 'deleted') {
                // For now, we don't remove components from registry on deletion
                // We could add a 'deleted' flag or special handling here
                continue;
            }
            // Look up component by ID first (if available), then by name
            let component;
            let nameChanged = false;
            if (componentId) {
                // Component has stable ID - look up by ID
                component = ComponentUtils.findComponentById(registry, componentId);
                if (component && component.name !== componentName) {
                    // Name changed! User manually edited the header
                    nameChanged = true;
                    console.log(`📝 Detected name change: ${component.name} → ${componentName} (ID: ${componentId})`);
                    // Validate new name is Cloudflare-safe (optional - could be warning only)
                    const validationResult = ComponentNameGenerator.validateWorkerName(componentName);
                    if (!validationResult.valid) {
                        console.warn(`⚠️  Warning: New name "${componentName}" may not be Cloudflare-safe: ${validationResult.errors.join(', ')}`);
                        // You could choose to reject here or just warn
                    }
                    // Check for collisions with other components
                    const existingByName = ComponentUtils.findComponentByName(registry, componentName);
                    if (existingByName && existingByName.id !== componentId) {
                        throw new Error(`❌ Name collision: "${componentName}" is already used by component ${existingByName.id}`);
                    }
                    // Update component name (stays under same ID key)
                    component.name = componentName;
                }
            }
            if (!component) {
                // Fallback to name lookup (legacy components or new components)
                component = ComponentUtils.findComponentByName(registry, componentName);
            }
            if (!component) {
                // New component
                component = {
                    id: ComponentNameGenerator.generateComponentId(),
                    name: componentName,
                    type: changed.type,
                    path: changed.path,
                    version: '1.0.0',
                    versionHistory: []
                };
                ComponentUtils.addComponent(registry, component);
                versionedComponents.push({
                    name: componentName,
                    oldVersion: 'none',
                    newVersion: '1.0.0',
                    action: 'created'
                });
            }
            else {
                // Existing component - bump version
                const currentVersion = new SemVer(component.version);
                let newVersion;
                // If name changed, ensure at least a patch bump 
                // (user might want this to be minor or major depending on their policy)
                const minimumBump = nameChanged ? 'patch' : bumpStrategy;
                const effectiveBump = this.getHigherBumpStrategy(bumpStrategy, minimumBump);
                switch (effectiveBump) {
                    case 'major':
                        newVersion = currentVersion.bumpMajor();
                        break;
                    case 'minor':
                        newVersion = currentVersion.bumpMinor();
                        break;
                    case 'patch':
                    default:
                        newVersion = currentVersion.bumpPatch();
                        break;
                }
                const action = nameChanged ? 'renamed' : 'updated';
                const versionAction = nameChanged ? 'renamed' : 'updated';
                versionedComponents.push({
                    name: componentName,
                    oldVersion: component.version,
                    newVersion: newVersion.toString(),
                    action: versionAction
                });
                component.version = newVersion.toString();
            }
            // Add version history entry
            const versionEntry = {
                version: component.version, // component is guaranteed to exist here
                commit: currentCommit,
                timestamp: new Date().toISOString(),
                path: component.path
            };
            if (commitMessage) {
                versionEntry.message = commitMessage;
            }
            component.versionHistory.push(versionEntry);
            // Note: File header sync happens before commit in main execute method
        }
        return versionedComponents;
    }
    /**
     * Sync component file header with registry version (hybrid versioning)
     */
    async syncFileHeader(component) {
        try {
            const filePath = this.resolveWorkspacePath(component.path);
            // Check if file has existing header
            const existingHeader = await fileHeaderManager.readMetadata(filePath);
            if (existingHeader) {
                // Update existing header with new version AND name
                await fileHeaderManager.writeMetadata(filePath, {
                    version: component.version,
                    component: component.name,
                    componentId: component.id
                }, {
                    replace: true,
                    componentType: component.type
                });
            }
            else {
                // Create missing header for tracked component
                await fileHeaderManager.writeMetadata(filePath, {
                    version: component.version,
                    component: component.name,
                    componentId: component.id
                }, {
                    replace: false,
                    componentType: component.type
                });
            }
            // Stage the updated file header
            await this.git.add([component.path]);
        }
        catch (error) {
            // Log warning but don't fail the commit
            console.warn(`⚠️  Warning: Could not update header for ${component.path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get the higher of two bump strategies (major > minor > patch)
     */
    getHigherBumpStrategy(strategy1, strategy2) {
        const priorities = { major: 3, minor: 2, patch: 1 };
        return priorities[strategy1] >= priorities[strategy2] ? strategy1 : strategy2;
    }
    async showVersioningSummary(versionedComponents) {
        console.log('\n🧩 Component Versioning Summary:');
        for (const comp of versionedComponents) {
            if (comp.action === 'created') {
                console.log(`   ✨ ${comp.name}: created v${comp.newVersion}`);
            }
            else {
                console.log(`   📈 ${comp.name}: v${comp.oldVersion} → v${comp.newVersion}`);
            }
        }
        console.log('');
        console.log('💡 Use "edgit components" to see all component versions');
        console.log('💡 Use "edgit checkout component@version" to restore any version');
    }
    /**
     * Update CHANGELOG.md with component version changes
     */
    async updateChangelog(versionedComponents, commitMessage, registry) {
        try {
            const repoRoot = await this.git.getRepoRoot();
            if (!repoRoot)
                return;
            // Check if changelog updates are enabled
            const aiConfig = registry.metadata?.config?.ai;
            if (aiConfig?.mode === 'off')
                return; // Skip if AI is disabled
            const changelogManager = new ChangelogManager(repoRoot);
            // Convert versioned components to changelog format
            const versionChanges = versionedComponents.map(comp => {
                // Find component to get type
                const component = ComponentUtils.findComponentByName(registry, comp.name);
                const componentType = component?.type || 'unknown';
                return {
                    name: comp.name,
                    type: componentType,
                    oldVersion: comp.oldVersion,
                    newVersion: comp.newVersion,
                    action: comp.action,
                    message: commitMessage
                };
            });
            // Generate AI-powered changelog entries if enabled
            let aiGeneratedEntries;
            if (aiConfig?.generateComponentMessages) {
                aiGeneratedEntries = await this.generateChangelogEntries(versionChanges, aiConfig);
            }
            // Update changelog
            await changelogManager.updateChangelog(versionChanges, commitMessage, aiGeneratedEntries);
            // Stage the changelog if it was created/updated
            if (await changelogManager.exists()) {
                await this.git.add([changelogManager.getFilePath()]);
                console.log('📝 Staged CHANGELOG.md for next commit');
            }
        }
        catch (error) {
            console.warn(`⚠️  Warning: Could not update changelog: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Generate AI-powered changelog entries for components
     */
    async generateChangelogEntries(versionChanges, aiConfig) {
        const entries = new Map();
        try {
            const aiManager = new AICommitManager(aiConfig);
            for (const change of versionChanges) {
                if (change.action === 'created' || change.action === 'updated') {
                    const componentChange = {
                        name: change.name,
                        type: change.type,
                        path: '',
                        oldVersion: change.oldVersion,
                        newVersion: change.newVersion,
                        diff: '', // We don't have diff context here
                    };
                    const result = await aiManager.generateComponentMessage(componentChange);
                    if (result.success && result.message) {
                        entries.set(change.name, result.message);
                    }
                }
            }
        }
        catch (error) {
            console.warn('⚠️  Could not generate AI changelog entries:', error);
        }
        return entries;
    }
    filterGitArgs(args) {
        const edgitFlags = ['--major', '--minor', '--patch'];
        return args.filter(arg => !edgitFlags.includes(arg));
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
        const aiConfig = registry.metadata?.config?.ai;
        if (!aiConfig || aiConfig.mode === 'off') {
            return gitArgs;
        }
        // Only auto-generate if mode is 'auto' and no message provided
        if (aiConfig.mode !== 'auto') {
            return gitArgs;
        }
        try {
            this.showInfo('🤖 Generating AI commit message...');
            // Convert changed components to ComponentChange format
            const componentChanges = await Promise.all(changedComponents.map(async (comp) => {
                // Get the actual diff for this component
                const diff = await this.git.getDiff([comp.path]);
                // Find existing component to get version info
                const existingComponent = ComponentUtils.findComponentByName(registry, comp.name);
                const oldVersion = existingComponent?.version || '0.0.0';
                // Calculate new version (simplified for now)
                const currentVersion = new SemVer(oldVersion);
                const newVersion = comp.action === 'added' ? '1.0.0' : currentVersion.bumpPatch().toString();
                return {
                    name: comp.name,
                    type: comp.type,
                    path: comp.path,
                    action: comp.action,
                    diff: diff || '',
                    oldVersion,
                    newVersion
                };
            }));
            // Get current branch and recent commits for context
            const currentBranch = await this.git.getCurrentBranch();
            const recentCommits = await this.git.getCommitHistory(5);
            const stagedFiles = await this.git.getStagedFiles();
            // Get overall diff for context
            const overallDiff = await this.git.getDiff();
            // Generate AI commit message
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
    getHelp() {
        return `
edgit commit - Commit with automatic component versioning

USAGE:
  edgit commit [git-commit-options]

VERSION BUMP OPTIONS:
  --patch             Force patch version bump (default)
  --minor             Force minor version bump  
  --major             Force major version bump

GIT OPTIONS:
  All standard git commit options are supported:
  -m, --message <msg> Commit message
  -a, --all           Stage all changes
  --amend             Amend previous commit
  etc.

AUTOMATIC VERSION BUMPING:
  Edgit analyzes your commit message to determine version bump:
  
  • MAJOR: "feat!" "breaking change" or --major flag
  • MINOR: "feat:" "feature:" or --minor flag  
  • PATCH: "fix:" "docs:" "style:" "refactor:" "test:" "chore:" or --patch flag
  
  Default: patch bump

EXAMPLES:
  edgit commit -m "fix: update extraction prompt"     # Patch bump
  edgit commit -m "feat: add new data agent"          # Minor bump  
  edgit commit -m "feat!: breaking API change"        # Major bump
  edgit commit --major -m "rewrite component"         # Force major
  
WORKFLOW:
  1. Detects changed component files in staging area
  2. Auto-bumps version based on commit message
  3. Updates .edgit/components.json with new versions
  4. Stages components.json
  5. Proceeds with normal git commit
  6. Shows versioning summary
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
//# sourceMappingURL=commit-old.js.map