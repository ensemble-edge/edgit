import * as fs from 'fs/promises';
import * as path from 'path';
import { Command } from './base.js';
import { ComponentDetector } from '../utils/component-detector.js';
import { HistoryCommand } from './history.js';
import { ComponentSpecParser, SemVer } from '../models/components.js';
/**
 * ComponentsCommand handles listing and managing components
 */
export class ComponentsCommand extends Command {
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
            const { flags, options, positional } = this.parseArgs(args);
            const [subcommand, ...subArgs] = positional;
            // Load components registry
            const registry = await this.loadComponentsRegistry();
            if (!subcommand || subcommand === 'list' || subcommand === 'ls') {
                if (flags['show-worker-names']) {
                    await this.showWorkerNames(registry, flags);
                }
                else {
                    await this.listComponents(registry, flags);
                }
            }
            else if (subcommand === 'show') {
                await this.showComponent(registry, subArgs[0], flags);
            }
            else if (subcommand === 'checkout') {
                await this.checkoutComponent(registry, subArgs[0], flags);
            }
            else if (subcommand === 'history') {
                await this.showComponentHistory(registry, subArgs[0], flags);
            }
            else if (subcommand === 'tag') {
                await this.tagComponent(registry, subArgs[0], subArgs[1], subArgs[2], flags);
            }
            else if (subcommand === 'sync') {
                await this.syncComponents(registry, subArgs, flags);
            }
            else if (subcommand === 'remove' || subcommand === 'rm') {
                if (!subArgs[0]) {
                    throw new Error('Component name is required for remove command');
                }
                await this.removeComponent(registry, subArgs[0], flags);
            }
            else if (subcommand === 'rename') {
                if (!subArgs[0] || !subArgs[1]) {
                    throw new Error('Both old and new component names are required for rename command');
                }
                await this.renameComponent(registry, subArgs[0], subArgs[1], flags);
            }
            else {
                // Treat as component name for show
                await this.showComponent(registry, subcommand, flags);
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.showError(`Component operation failed: ${message}`, [
                'Ensure edgit is initialized with "edgit setup"',
                'Check that the component name is correct',
                'Use "edgit components" to list all components'
            ]);
            throw error;
        }
    }
    async loadComponentsRegistry() {
        const repoRoot = await this.git.getRepoRoot();
        if (!repoRoot) {
            throw new Error('Not in a git repository');
        }
        const componentsFile = path.join(repoRoot, ComponentsCommand.EDGIT_DIR, ComponentsCommand.COMPONENTS_FILE);
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
        const componentsFile = path.join(repoRoot, ComponentsCommand.EDGIT_DIR, ComponentsCommand.COMPONENTS_FILE);
        try {
            registry.updated = new Date().toISOString();
            const content = JSON.stringify(registry, null, 2);
            await fs.writeFile(componentsFile, content, 'utf8');
        }
        catch (error) {
            throw new Error(`Failed to save components registry: ${error}`);
        }
    }
    async listComponents(registry, flags) {
        const components = Object.values(registry.components);
        if (components.length === 0) {
            this.showInfo('No components found. Add some component files and run "edgit setup".');
            return;
        }
        console.log(`\n🧩 Components (${components.length} total):\n`);
        if (flags.verbose || flags.v) {
            // Verbose listing with details
            for (const component of components) {
                console.log(`📦 ${component.name}`);
                console.log(`   Type: ${component.type}`);
                console.log(`   Path: ${component.path}`);
                console.log(`   Version: v${component.version}`);
                console.log(`   Versions: ${component.versionHistory.length}`);
                if (component.tags && Object.keys(component.tags).length > 0) {
                    const tags = Object.entries(component.tags)
                        .map(([tag, version]) => `${tag}:v${version}`)
                        .join(', ');
                    console.log(`   Tags: ${tags}`);
                }
                console.log('');
            }
        }
        else {
            // Compact listing
            const byType = components.reduce((acc, comp) => {
                if (!acc[comp.type])
                    acc[comp.type] = [];
                acc[comp.type].push(comp);
                return acc;
            }, {});
            for (const [type, comps] of Object.entries(byType)) {
                console.log(`${this.getTypeIcon(type)} ${type}s (${comps.length}):`);
                for (const comp of comps) {
                    const tags = comp.tags && Object.keys(comp.tags).length > 0
                        ? ` [${Object.keys(comp.tags).join(', ')}]`
                        : '';
                    console.log(`   • ${comp.name} v${comp.version}${tags}`);
                }
                console.log('');
            }
        }
        console.log('💡 Use "edgit components show <name>" for detailed component info');
        console.log('💡 Use "edgit components --verbose" for expanded listing');
    }
    async showComponent(registry, componentName, flags) {
        if (!componentName) {
            throw new Error('Component name is required');
        }
        const component = this.findComponent(registry, componentName);
        if (!component) {
            this.showError(`Component "${componentName}" not found`, [
                'Use "edgit components" to list available components',
                'Check component name spelling'
            ]);
            return;
        }
        console.log(`\n📦 ${component.name}\n`);
        console.log(`Type:        ${component.type}`);
        console.log(`Path:        ${component.path}`);
        console.log(`Version:     v${component.version}`);
        console.log(`Versions:    ${component.versionHistory.length} total`);
        if (component.tags && Object.keys(component.tags).length > 0) {
            console.log('Tags:');
            for (const [tag, version] of Object.entries(component.tags)) {
                console.log(`             ${tag} → v${version}`);
            }
        }
        console.log('\n📚 Version History:');
        const sortedVersions = component.versionHistory
            .slice()
            .sort((a, b) => {
            try {
                const versionA = new SemVer(a.version);
                const versionB = new SemVer(b.version);
                return versionB.compare(versionA); // Newest first
            }
            catch {
                return b.timestamp.localeCompare(a.timestamp);
            }
        });
        for (const version of sortedVersions) {
            const date = new Date(version.timestamp).toLocaleDateString();
            const commitShort = version.commit.substring(0, 8);
            const current = version.version === component.version ? ' (current)' : '';
            console.log(`   v${version.version}${current}`);
            console.log(`     ${date} • ${commitShort} • ${version.message || 'No message'}`);
        }
        console.log(`\n💡 Use "edgit checkout ${componentName}@<version>" to restore a specific version`);
        console.log(`💡 Use "edgit components tag ${componentName} <tag> [version]" to tag a version`);
    }
    async checkoutComponent(registry, componentSpec, flags) {
        if (!componentSpec) {
            throw new Error('Component specification is required (component@version or component@tag)');
        }
        const spec = ComponentSpecParser.parse(componentSpec);
        if (!spec.version) {
            throw new Error('Version or tag is required for checkout');
        }
        const component = this.findComponent(registry, spec.name);
        if (!component) {
            throw new Error(`Component "${spec.name}" not found`);
        }
        let targetCommit;
        let targetVersion;
        let versionEntry;
        if (spec.isTag) {
            if (spec.version === 'latest') {
                // Special "latest" tag - always points to current version
                targetVersion = component.version;
                const entry = component.versionHistory.find(v => v.version === targetVersion);
                if (!entry) {
                    throw new Error(`Current version "${targetVersion}" not found in history`);
                }
                versionEntry = entry;
                targetCommit = versionEntry.commit;
                this.showInfo(`Checking out latest version (v${targetVersion})`);
            }
            else if (component.tags?.[spec.version]) {
                // Regular tag reference
                const taggedVersion = component.tags[spec.version];
                if (!taggedVersion) {
                    throw new Error(`Tag "${spec.version}" not found for component "${spec.name}"`);
                }
                targetVersion = taggedVersion;
                const entry = component.versionHistory.find(v => v.version === targetVersion);
                if (!entry) {
                    throw new Error(`Tagged version "${targetVersion}" not found in history`);
                }
                versionEntry = entry;
                targetCommit = versionEntry.commit;
                this.showInfo(`Checking out tag "${spec.version}" (v${targetVersion})`);
            }
            else {
                throw new Error(`Tag "${spec.version}" not found for component "${spec.name}"`);
            }
        }
        else {
            // Direct version reference
            targetVersion = spec.version;
            const entry = component.versionHistory.find(v => v.version === targetVersion);
            if (!entry) {
                throw new Error(`Version "${targetVersion}" not found for component "${spec.name}"`);
            }
            versionEntry = entry;
            targetCommit = versionEntry.commit;
            this.showInfo(`Checking out v${targetVersion}`);
        }
        // Check if file exists at the target commit before attempting checkout
        // Use the path from the version history since file may have been renamed
        const targetPath = versionEntry.path || component.path; // fallback to current path for old version histories
        const fileExists = await this.git.fileExistsAtCommit(targetPath, targetCommit);
        if (!fileExists) {
            throw new Error(`File "${targetPath}" does not exist at commit ${targetCommit} (version ${targetVersion}).\n` +
                `This might indicate an incorrect version history. Try:\n` +
                `  • edgit resync "${spec.name}" to rebuild the component history\n` +
                `  • edgit components show "${spec.name}" to view available versions\n` +
                `  • Check that the component was properly registered`);
        }
        // Check out the file from the specific commit
        // If the file was renamed, checkout to a temp location then move to current location
        if (targetPath !== component.path) {
            // File was renamed - checkout to temp location then move
            const success = await this.git.checkoutFile(targetPath, targetCommit);
            if (!success) {
                throw new Error(`Failed to checkout ${targetPath} from commit ${targetCommit}`);
            }
            // Move the file to current location
            try {
                await fs.rename(targetPath, component.path);
            }
            catch (error) {
                throw new Error(`Failed to move restored file from ${targetPath} to ${component.path}: ${error}`);
            }
        }
        else {
            // Same path - direct checkout
            const success = await this.git.checkoutFile(component.path, targetCommit);
            if (!success) {
                throw new Error(`Failed to checkout ${component.path} from commit ${targetCommit}`);
            }
        }
        this.showSuccess(`✅ Restored ${component.path} to v${targetVersion}`);
        this.showWarning('⚠️  File has been modified in working directory. Commit or stash changes if needed.');
    }
    async tagComponent(registry, componentName, tagName, version, flags) {
        if (!componentName || !tagName) {
            throw new Error('Component name and tag name are required');
        }
        const component = this.findComponent(registry, componentName);
        if (!component) {
            throw new Error(`Component "${componentName}" not found`);
        }
        const targetVersion = version || component.version;
        // Validate version exists
        const versionExists = component.versionHistory.some(v => v.version === targetVersion);
        if (!versionExists) {
            throw new Error(`Version "${targetVersion}" not found for component "${componentName}"`);
        }
        // Add tag
        if (!component.tags) {
            component.tags = {};
        }
        component.tags[tagName] = targetVersion;
        // Save registry
        await this.saveComponentsRegistry(registry);
        this.showSuccess(`Tagged ${componentName} v${targetVersion} as "${tagName}"`);
    }
    async showComponentHistory(registry, componentName, flags) {
        if (!componentName) {
            throw new Error('Component name is required for history');
        }
        // Delegate to HistoryCommand
        const historyCommand = new HistoryCommand();
        await historyCommand.execute([componentName]);
    }
    getTypeIcon(type) {
        switch (type) {
            case 'prompt': return '💬';
            case 'agent': return '🤖';
            case 'sql': return '🗃️';
            case 'config': return '⚙️';
            default: return '📄';
        }
    }
    getHelp() {
        return `
edgit components - Manage component versions

USAGE:
  edgit components [subcommand] [options]
  edgit component [subcommand] [options]

SUBCOMMANDS:
  list, ls             List all components (default)
  show <name>          Show detailed component information
  history <name>       Show version history for component
  checkout <comp@ver>  Restore component to specific version
  tag <name> <tag>     Tag a component version
  sync [names...]      Sync file headers with registry versions
  remove <name>        Remove component from registry (--force required)
  rename <old> <new>   Rename component in registry and update headers
  
OPTIONS:
  --verbose, -v        Show detailed information
  --force, -f          Skip confirmations (for remove command)
  --show-worker-names  Show Cloudflare worker names for deployment
  --help, -h           Show this help message

EXAMPLES:
  edgit components                    # List all components
  edgit components --verbose          # List with detailed info
  edgit components --show-worker-names # Show Cloudflare worker names
  edgit components show extraction    # Show extraction component details
  edgit components history extraction # Show version history
  edgit components checkout prompt@1.0.0  # Restore prompt to v1.0.0
  edgit components tag prompt prod 1.2.0   # Tag v1.2.0 as "prod"
  edgit components sync               # Sync all headers with registry
  edgit components sync extractor     # Sync specific component header
  edgit components remove old-component --force  # Remove component
  edgit components rename old new     # Rename component

COMPONENT SPECIFICATION:
  component@version    # Specific version (e.g., extraction@1.0.0)
  component@tag        # Tagged version (e.g., extraction@prod)
`;
    }
    /**
     * Sync components - Update file headers to match registry versions
     */
    async syncComponents(registry, componentNames, flags) {
        const { fileHeaderManager } = await import('../utils/file-headers.js');
        let componentsToSync;
        if (componentNames.length === 0) {
            // Sync all components
            componentsToSync = Object.values(registry.components);
            console.log('🔄 Syncing all component headers...');
        }
        else {
            // Sync specific components
            componentsToSync = [];
            for (const name of componentNames) {
                const component = registry.components[name];
                if (!component) {
                    console.warn(`⚠️  Component '${name}' not found in registry`);
                    continue;
                }
                componentsToSync.push(component);
            }
            console.log(`🔄 Syncing ${componentsToSync.length} component headers...`);
        }
        let synced = 0;
        let skipped = 0;
        for (const component of componentsToSync) {
            try {
                const filePath = this.resolveWorkspacePath(component.path);
                // Check if file exists
                try {
                    await fs.access(filePath);
                }
                catch {
                    console.warn(`⚠️  File not found: ${component.path}`);
                    skipped++;
                    continue;
                }
                // Check if header exists
                const existingHeader = await fileHeaderManager.readMetadata(filePath);
                if (existingHeader) {
                    // Update header to match registry version
                    await fileHeaderManager.writeMetadata(filePath, {
                        version: component.version,
                        component: component.name
                    }, {
                        replace: true,
                        componentType: component.type
                    });
                    console.log(`  ✅ ${component.name}: ${existingHeader.version} → ${component.version}`);
                    synced++;
                }
                else {
                    if (flags.verbose) {
                        console.log(`  ⏭️  ${component.name}: No header found (skipping)`);
                    }
                    skipped++;
                }
            }
            catch (error) {
                console.warn(`  ❌ ${component.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                skipped++;
            }
        }
        console.log(`\n📊 Sync Summary: ${synced} updated, ${skipped} skipped`);
        if (synced > 0) {
            console.log('💡 Run "git add ." to stage header changes');
        }
    }
    /**
     * Remove component from registry
     */
    async removeComponent(registry, componentName, flags) {
        if (!componentName) {
            throw new Error('Component name is required for remove command');
        }
        const component = this.findComponent(registry, componentName);
        if (!component) {
            throw new Error(`Component '${componentName}' not found in registry`);
        }
        // Confirm deletion unless --force flag is used
        if (!flags.force) {
            console.log(`\n🗑️  About to remove component: ${componentName}`);
            console.log(`   ID: ${component.id}`);
            console.log(`   Path: ${component.path}`);
            console.log(`   Version: ${component.version}`);
            console.log(`   History: ${component.versionHistory.length} versions`);
            console.log('\n⚠️  This will remove the component from the registry but NOT delete the file.');
            console.log('   The file header will be marked as deregistered.');
            console.log('   Use --force to skip this confirmation.');
            // In a real implementation, you'd use readline for user input
            // For now, require --force flag
            throw new Error('Add --force flag to confirm component removal');
        }
        // Remove from registry
        delete registry.components[component.id];
        registry.updated = new Date().toISOString();
        // Mark file header as deregistered (if header exists)
        try {
            const { fileHeaderManager } = await import('../utils/file-headers.js');
            const existingHeader = await fileHeaderManager.readMetadata(component.path);
            if (existingHeader) {
                // Update header to mark as deregistered
                await fileHeaderManager.writeMetadata(component.path, {
                    version: component.version,
                    component: `${component.name} [DEREGISTERED]`,
                    componentId: component.id
                }, {
                    replace: true,
                    componentType: component.type
                });
                console.log(`📝 Marked file header as deregistered: ${component.path}`);
            }
        }
        catch (error) {
            console.warn(`⚠️  Could not update file header: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        // Save updated registry
        await this.saveComponentsRegistry(registry);
        console.log(`✅ Removed component '${componentName}' from registry`);
        console.log('💡 The file still exists and can be re-registered if needed');
        console.log('💡 File header has been marked as [DEREGISTERED] for tracking');
    }
    /**
     * Rename component in registry
     */
    async renameComponent(registry, oldName, newName, flags) {
        if (!oldName || !newName) {
            throw new Error('Both old and new component names are required');
        }
        if (oldName === newName) {
            throw new Error('Old and new names cannot be the same');
        }
        // Find component by name (not by registry key)
        const component = this.findComponent(registry, oldName);
        if (!component) {
            throw new Error(`Component '${oldName}' not found in registry`);
        }
        // Check if new name already exists
        const existingComponent = this.findComponent(registry, newName);
        if (existingComponent) {
            throw new Error(`Component '${newName}' already exists in registry`);
        }
        // Update component name (component stays under same ID key)
        component.name = newName;
        registry.updated = new Date().toISOString();
        // Update file header if it exists
        try {
            const { fileHeaderManager } = await import('../utils/file-headers.js');
            const filePath = this.resolveWorkspacePath(component.path);
            const existingHeader = await fileHeaderManager.readMetadata(filePath);
            if (existingHeader) {
                await fileHeaderManager.writeMetadata(filePath, {
                    version: component.version,
                    component: newName
                }, {
                    replace: true,
                    componentType: component.type
                });
                console.log(`🔄 Updated file header: ${oldName} → ${newName}`);
            }
        }
        catch (error) {
            console.warn(`⚠️  Could not update file header: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        // Save updated registry
        await this.saveComponentsRegistry(registry);
        console.log(`✅ Renamed component: ${oldName} → ${newName}`);
        console.log('💡 File header and registry have been updated');
    }
    /**
     * Find component by name or display name
     */
    findComponent(registry, nameOrDisplayName) {
        // Search through all components to find by name
        const components = Object.values(registry.components);
        return components.find(comp => comp.name === nameOrDisplayName);
    }
    /**
     * Show worker names for Cloudflare deployment
     */
    async showWorkerNames(registry, flags) {
        const components = Object.values(registry.components);
        if (components.length === 0) {
            console.log('\n⚡ No components found for worker deployment');
            return;
        }
        console.log(`\n⚡ Cloudflare Worker Names (${components.length} total):\n`);
        for (const component of components) {
            console.log(`📦 ${component.name}`);
            console.log(`   Type: ${component.type}`);
            console.log(`   Version: v${component.version}`);
            console.log('');
        }
        console.log('💡 Use these exact worker names when deploying to Cloudflare');
        if (flags.verbose || flags.v) {
            console.log('💡 Worker names are Cloudflare Edge Worker safe');
        }
    }
}
/**
 * Convenience function to create and execute ComponentsCommand
 */
export async function manageComponents(args = []) {
    const command = new ComponentsCommand();
    await command.execute(args);
}
//# sourceMappingURL=components-old.js.map