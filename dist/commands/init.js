import * as fs from 'fs/promises';
import * as path from 'path';
import { Command } from './base.js';
import { ComponentDetector } from '../utils/component-detector.js';
import { ComponentUtils } from '../models/components.js';
/**
 * InitCommand handles 'edgit init' and 'edgit setup'
 * Initializes edgit in an existing git repository
 */
export class InitCommand extends Command {
    static EDGIT_DIR = '.edgit';
    static COMPONENTS_FILE = 'components.json';
    static GITIGNORE_ENTRY = '.edgit/';
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
            const { flags, options } = this.parseArgs(args);
            const force = flags.force || flags.f;
            const scan = !flags['no-scan']; // Default to true, but allow --no-scan
            const headers = flags.headers || flags.h; // Add file headers to detected components
            await this.validateGitInstalled();
            await this.validateGitRepo();
            const repoRoot = await this.git.getRepoRoot();
            if (!repoRoot) {
                throw new Error('Could not determine git repository root');
            }
            const edgitDir = path.join(repoRoot, InitCommand.EDGIT_DIR);
            const componentsFile = path.join(edgitDir, InitCommand.COMPONENTS_FILE);
            // Check if already initialized
            if (!force && (await this.isAlreadyInitialized(componentsFile))) {
                this.showWarning('Edgit is already initialized in this repository.');
                console.log('Use --force to reinitialize and rescan components.');
                return;
            }
            this.showInfo('Initializing edgit component tracking...');
            // Step 1: Create .edgit directory
            await this.createEdgitDirectory(edgitDir);
            // Step 2: Scan for existing components (or skip if --no-scan)
            let components = [];
            if (scan) {
                components = await this.scanExistingComponents(repoRoot, {
                    headers: headers || false,
                });
            }
            // Step 3: Create components.json
            await this.createComponentsRegistry(componentsFile, components, {
                headers: headers || false,
            });
            // Step 4: Update .gitignore (optional)
            await this.updateGitignore(repoRoot, flags.gitignore !== false);
            // Step 5: Setup environment for AI features
            await this.setupEnvironment(repoRoot);
            // Step 6: Show results
            await this.showResults(components, repoRoot);
            this.showSuccess('Edgit initialization complete!');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.showError(`Failed to initialize edgit: ${message}`, [
                'Ensure you are in a git repository',
                'Check that you have write permissions',
                'Try running with --force to overwrite existing setup',
            ]);
            throw error;
        }
    }
    async isAlreadyInitialized(componentsFile) {
        try {
            await fs.access(componentsFile);
            return true;
        }
        catch {
            return false;
        }
    }
    async createEdgitDirectory(edgitDir) {
        try {
            await fs.mkdir(edgitDir, { recursive: true });
            this.showInfo(`Created ${InitCommand.EDGIT_DIR}/ directory`);
        }
        catch (error) {
            throw new Error(`Failed to create .edgit directory: ${error}`);
        }
    }
    async scanExistingComponents(repoRoot, options = {}) {
        if (!this.detector) {
            throw new Error('Component detector not initialized');
        }
        this.showInfo('Scanning repository for existing components...');
        const detectedComponents = await this.detector.getAllComponents();
        const components = [];
        if (detectedComponents.length === 0) {
            this.showInfo('No components found in repository');
            return components;
        }
        // Get current commit for initial versioning
        const currentCommit = await this.git.getCurrentCommit();
        if (!currentCommit) {
            throw new Error('Could not get current commit hash');
        }
        // Create component entries
        for (const detected of detectedComponents) {
            const currentCommit = await this.git.getCurrentCommit();
            if (!currentCommit) {
                this.showError('Unable to determine current commit');
                continue;
            }
            // Create minimal component for registry
            const component = ComponentUtils.createComponent(detected.path, detected.type);
            components.push(component);
        }
        // Add file headers if requested
        if (options.headers) {
            this.showInfo('Adding file headers to detected components...');
            await this.addFileHeaders(components);
        }
        this.showInfo(`Found ${components.length} components`);
        return components;
    }
    /**
     * Get repository URL for naming context
     */
    async getRepoUrl() {
        try {
            const result = await this.git.exec(['remote', 'get-url', 'origin']);
            return result.exitCode === 0 ? result.stdout.trim() : undefined;
        }
        catch {
            return undefined;
        }
    }
    /**
     * Add file headers to components
     */
    async addFileHeaders(components) {
        const { fileHeaderManager } = await import('../utils/file-headers.js');
        for (const component of components) {
            try {
                const filePath = this.resolveWorkspacePath(component.path);
                // Check if file exists
                try {
                    await fs.access(filePath);
                }
                catch {
                    this.showWarning(`File not found: ${component.path}`);
                    continue;
                }
                // Check if header already exists
                const existingHeader = await fileHeaderManager.readMetadata(filePath);
                if (existingHeader) {
                    this.showInfo(`Header already exists in ${component.path}`);
                    continue;
                }
                // Generate component name from path
                const componentName = ComponentUtils.generateComponentName(component.path, component.type);
                // Add header with default version (actual versions managed via Git tags)
                await fileHeaderManager.writeMetadata(filePath, {
                    version: '1.0.0', // Default version for new components
                    component: componentName,
                }, {
                    componentType: component.type,
                    replace: false,
                });
                this.showInfo(`Added header to ${component.path}`);
            }
            catch (error) {
                this.showWarning(`Failed to add header to ${component.path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    }
    async createComponentsRegistry(componentsFile, components, options = {}) {
        const registry = ComponentUtils.createEmptyRegistry();
        // Add all components to registry with collision detection
        for (const component of components) {
            const componentName = ComponentUtils.generateComponentName(component.path, component.type, registry);
            ComponentUtils.addComponent(registry, componentName, component);
        }
        // Update registry timestamp
        ComponentUtils.updateRegistry(registry);
        try {
            const registryJson = JSON.stringify(registry, null, 2);
            await fs.writeFile(componentsFile, registryJson, 'utf8');
            this.showInfo(`Created ${InitCommand.COMPONENTS_FILE}`);
        }
        catch (error) {
            throw new Error(`Failed to write components registry: ${error}`);
        }
    }
    async updateGitignore(repoRoot, shouldUpdate) {
        if (!shouldUpdate) {
            return;
        }
        const gitignorePath = path.join(repoRoot, '.gitignore');
        try {
            let gitignoreContent = '';
            try {
                gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
            }
            catch {
                // .gitignore doesn't exist, that's fine
            }
            // Check if .edgit/ is already in .gitignore
            if (gitignoreContent.includes(InitCommand.GITIGNORE_ENTRY)) {
                return;
            }
            // Add .edgit/ to .gitignore
            const newContent = gitignoreContent.endsWith('\n') || gitignoreContent === ''
                ? gitignoreContent
                : gitignoreContent + '\n';
            const updatedContent = newContent + `\n# Edgit internal files\n${InitCommand.GITIGNORE_ENTRY}\n`;
            await fs.writeFile(gitignorePath, updatedContent, 'utf8');
            this.showInfo('Added .edgit/ to .gitignore');
        }
        catch (error) {
            this.showWarning(`Could not update .gitignore: ${error}`);
        }
    }
    async showResults(components, repoRoot) {
        console.log('\n📊 Initialization Summary:');
        console.log(`   Repository: ${repoRoot}`);
        console.log(`   Components found: ${components.length}`);
        if (components.length > 0) {
            console.log('\n🧩 Detected Components:');
            const byType = components.reduce((acc, comp) => {
                if (!acc[comp.type])
                    acc[comp.type] = [];
                acc[comp.type].push(comp);
                return acc;
            }, {});
            for (const [type, comps] of Object.entries(byType)) {
                console.log(`   ${type}s (${comps.length}):`);
                for (const comp of comps) {
                    const componentName = ComponentUtils.generateComponentName(comp.path, comp.type);
                    console.log(`     • ${componentName} (${comp.path})`);
                }
            }
        }
        console.log('\n🚀 Next Steps:');
        console.log('   • Run "edgit tag create <component> <version>" to version your components');
        console.log('   • Use "edgit components" to list all tracked components');
        console.log('   • Use "edgit components checkout <component>@<version>" to restore versions');
    }
    /**
     * Setup environment configuration for AI features
     */
    async setupEnvironment(repoRoot) {
        const envPath = path.join(repoRoot, '.env');
        try {
            // Check if .env already exists
            const envExists = await fs
                .access(envPath)
                .then(() => true)
                .catch(() => false);
            if (!envExists) {
                // Create .env template with AI configuration
                const envTemplate = `# Edgit AI Configuration
# Get your OpenAI API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Customize AI behavior
# EDGIT_AI_MODEL=gpt-3.5-turbo
# EDGIT_AI_TIMEOUT=30000
`;
                await fs.writeFile(envPath, envTemplate, 'utf8');
                console.log('   • Created .env template for AI configuration');
            }
            // Ensure .env is in .gitignore
            await this.ensureInGitignore(repoRoot, '.env');
        }
        catch (error) {
            console.warn(`   ⚠️  Warning: Could not setup environment: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Ensure a pattern exists in .gitignore
     */
    async ensureInGitignore(repoRoot, pattern) {
        const gitignorePath = path.join(repoRoot, '.gitignore');
        try {
            let gitignoreContent = '';
            // Read existing .gitignore if it exists
            try {
                gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
            }
            catch (error) {
                // .gitignore doesn't exist, will be created
            }
            // Check if pattern already exists
            const lines = gitignoreContent.split('\n');
            const patternExists = lines.some((line) => line.trim() === pattern);
            if (!patternExists) {
                // Add pattern to .gitignore
                const newContent = gitignoreContent.trim() + (gitignoreContent.trim() ? '\n' : '') + pattern + '\n';
                await fs.writeFile(gitignorePath, newContent, 'utf8');
                console.log(`   • Added ${pattern} to .gitignore`);
            }
        }
        catch (error) {
            console.warn(`   ⚠️  Warning: Could not update .gitignore: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    getHelp() {
        return `
edgit setup - Initialize component tracking in git repository

USAGE:
  edgit setup [options]
  edgit init [options]

OPTIONS:
  --force, -f         Force initialization (overwrite existing setup)
  --headers, -h       Add file headers to detected components (hybrid versioning)
  --no-scan           Skip component scanning (create empty registry)
  --no-gitignore      Don't add .edgit/ to .gitignore
  --help              Show this help message

DESCRIPTION:
  Initializes edgit component tracking in the current git repository.
  This command will:
  
  1. Create .edgit/ directory for metadata
  2. Scan repository for existing components
  3. Create .edgit/components.json with initial versions
  4. Add .edgit/ to .gitignore (optional)

COMPONENT DETECTION:
  Prompts:  prompts/**/*.md, **/*.prompt.md
  Agents:   agents/**/*.{js,ts}, **/*.agent.{js,ts}
  SQL:      queries/**/*.sql, **/*.query.sql
  Configs:  configs/**/*.{yaml,yml}, **/*.config.{yaml,yml}

EXAMPLES:
  edgit setup                    # Initialize with default options
  edgit setup --force            # Reinitialize, overwriting existing setup
  edgit init --no-gitignore      # Initialize without updating .gitignore
`;
    }
}
/**
 * Convenience function to create and execute InitCommand
 */
export async function setupEdgit(args = []) {
    const command = new InitCommand();
    await command.execute(args);
}
//# sourceMappingURL=init.js.map