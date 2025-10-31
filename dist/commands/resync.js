import { Command } from './base.js';
import { ComponentDetector } from '../utils/component-detector.js';
import { ComponentUtils } from '../models/components.js';
import { ComponentNameGenerator } from '../utils/component-name-generator.js';
import { fileHeaderManager } from '../utils/file-headers.js';
import * as fs from 'fs/promises';
/**
 * Resync command for recovery and synchronization of component state
 */
export class ResyncCommand extends Command {
    async execute(args) {
        if (this.shouldShowHelp(args)) {
            console.log(this.getHelp());
            return;
        }
        await this.validateGitRepo();
        await this.validateGitInstalled();
        const parsed = this.parseArgs(args);
        const options = this.extractResyncOptions(parsed);
        if (options.dryRun) {
            console.log('🔍 Running resync analysis (dry run)...\n');
        }
        else {
            console.log('🔄 Resyncing component state with Git history...\n');
        }
        const result = await this.performResync(options);
        await this.outputResult(result, options);
    }
    getHelp() {
        return `
Usage: edgit resync [options]

Resynchronize component state with Git history and fix inconsistencies.
Use this command to recover from corrupted state or migrate existing repositories.

Options:
  --force                 Force resync even if no issues detected
  --dry-run               Show what would be changed without making changes
  --verbose               Show detailed progress information
  --rebuild-history       Rebuild version history from Git log
  --fix-headers           Update file headers to match registry

Recovery Scenarios:
  • Corrupted components.json file
  • Missing version history
  • Inconsistent file headers
  • Components not tracked in registry
  • Registry out of sync with Git history

Examples:
  edgit resync                    # Standard resync and validation
  edgit resync --dry-run          # See what would be fixed
  edgit resync --rebuild-history  # Rebuild from Git history
  edgit resync --fix-headers      # Sync headers with registry
  edgit resync --force            # Force full resync
    `.trim();
    }
    extractResyncOptions(parsed) {
        return {
            force: parsed.flags.force,
            dryRun: parsed.flags['dry-run'],
            verbose: parsed.flags.verbose,
            rebuildHistory: parsed.flags['rebuild-history'],
            fixHeaders: parsed.flags['fix-headers']
        };
    }
    async performResync(options) {
        const result = {
            componentsScanned: 0,
            componentsFixed: 0,
            versionsRecovered: 0,
            headersFixed: 0,
            errors: [],
            changes: {
                added: [],
                updated: [],
                removed: [],
                headerUpdates: []
            }
        };
        try {
            // Load existing registry (or create empty if corrupted)
            const registry = await this.loadOrCreateRegistry();
            // Discover all component files
            const detector = new ComponentDetector(this.git);
            const componentFiles = await this.discoverAllComponents(detector);
            result.componentsScanned = componentFiles.length;
            if (options.verbose) {
                console.log(`📁 Found ${componentFiles.length} potential component files`);
            }
            // Process each component file
            for (const filePath of componentFiles) {
                try {
                    await this.processComponentFile(filePath, registry, detector, result, options);
                }
                catch (error) {
                    const errorMsg = `Error processing ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                    result.errors.push(errorMsg);
                    if (options.verbose) {
                        console.log(`❌ ${errorMsg}`);
                    }
                }
            }
            // Remove components that no longer exist
            await this.removeDeletedComponents(registry, result, options);
            // Rebuild version history from Git if requested
            if (options.rebuildHistory) {
                await this.rebuildVersionHistory(registry, result, options);
            }
            // Always fix missing file headers during resync
            await this.fixFileHeaders(registry, result, options);
            // Save updated registry
            if (!options.dryRun && (result.componentsFixed > 0 || options.force)) {
                await this.saveRegistry(registry);
                if (options.verbose) {
                    console.log('💾 Saved updated components registry');
                }
            }
        }
        catch (error) {
            result.errors.push(`Critical error during resync: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        return result;
    }
    async loadOrCreateRegistry() {
        try {
            const content = await fs.readFile('.edgit/components.json', 'utf8');
            return JSON.parse(content);
        }
        catch {
            // Create new registry if file doesn't exist or is corrupted
            return ComponentUtils.createEmptyRegistry();
        }
    }
    async discoverAllComponents(detector) {
        try {
            // Get git-tracked files
            const result = await this.git.exec(['ls-files']);
            const trackedFiles = result.stdout.split('\n').filter(f => f.trim());
            // Filter tracked files that match patterns
            const patternMatchedFiles = trackedFiles.filter(file => {
                const detected = detector.detectComponent(file);
                return detected !== null;
            });
            // Also scan for files with component headers (hybrid versioning)
            const headerFiles = await this.findFilesWithHeaders();
            // Combine and deduplicate
            const allComponentFiles = [...new Set([...patternMatchedFiles, ...headerFiles])];
            return allComponentFiles;
        }
        catch (error) {
            throw new Error(`Failed to list repository files: ${error}`);
        }
    }
    /**
     * Find files that have component headers (for hybrid versioning)
     */
    async findFilesWithHeaders() {
        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            const filesWithHeaders = [];
            // Recursively scan directory for files with headers
            const scanDirectory = async (dir) => {
                try {
                    const entries = await fs.readdir(dir, { withFileTypes: true });
                    for (const entry of entries) {
                        const fullPath = path.join(dir, entry.name);
                        const relativePath = path.relative(process.cwd(), fullPath);
                        // Skip git directory and node_modules
                        if (entry.name.startsWith('.git') || entry.name === 'node_modules') {
                            continue;
                        }
                        if (entry.isDirectory()) {
                            await scanDirectory(fullPath);
                        }
                        else if (entry.isFile()) {
                            // Check if file has component header
                            const hasHeader = await this.fileHasComponentHeader(relativePath);
                            if (hasHeader) {
                                filesWithHeaders.push(relativePath);
                            }
                        }
                    }
                }
                catch (error) {
                    // Skip directories we can't read
                }
            };
            await scanDirectory('.');
            return filesWithHeaders;
        }
        catch (error) {
            console.warn(`Warning: Could not scan for files with headers: ${error}`);
            return [];
        }
    }
    /**
     * Check if a file has a component header
     */
    async fileHasComponentHeader(filePath) {
        try {
            const metadata = await fileHeaderManager.readMetadata(filePath);
            return metadata !== null && !!metadata.version && !!metadata.component;
        }
        catch {
            return false;
        }
    }
    async processComponentFile(filePath, registry, detector, result, options) {
        const detected = detector.detectComponent(filePath);
        if (!detected)
            return;
        const componentName = detected.name;
        const existingComponent = ComponentUtils.findComponentByName(registry, componentName);
        if (!existingComponent) {
            // New component - create it
            const component = await this.createComponentFromGitHistory(filePath, detected, options);
            ComponentUtils.addComponent(registry, component);
            result.changes.added.push(component);
            result.componentsFixed++;
            if (options.verbose) {
                console.log(`➕ Added component: ${componentName}`);
            }
        }
        else {
            // Existing component - validate and update if needed
            const updated = await this.validateAndUpdateComponent(existingComponent, filePath, detected, options);
            if (updated) {
                // Component is already in registry by ID, no need to re-add
                result.changes.updated.push(updated);
                result.componentsFixed++;
                if (options.verbose) {
                    console.log(`🔄 Updated component: ${componentName}`);
                }
            }
        }
    }
    async createComponentFromGitHistory(filePath, detected, options) {
        // Build version history from Git first
        const versionHistory = await this.buildVersionHistoryFromGit(filePath);
        // Get current version from file header
        const headerMetadata = await fileHeaderManager.readMetadata(filePath);
        const headerVersion = headerMetadata?.version;
        // Get latest version from git history
        let gitLatestVersion = null;
        if (versionHistory.length > 0) {
            // Sort versions and use the latest
            const sortedVersions = versionHistory.slice().sort((a, b) => {
                try {
                    const vA = new (require('../models/components.js').SemVer)(a.version);
                    const vB = new (require('../models/components.js').SemVer)(b.version);
                    return vB.compare(vA); // Latest first
                }
                catch {
                    return b.timestamp.localeCompare(a.timestamp);
                }
            });
            gitLatestVersion = sortedVersions[0]?.version || null;
        }
        // Determine the correct current version
        let currentVersion;
        if (headerVersion && gitLatestVersion) {
            // Both available - use the higher version (in case git history has newer versions)
            try {
                const hVer = new (require('../models/components.js').SemVer)(headerVersion);
                const gVer = new (require('../models/components.js').SemVer)(gitLatestVersion);
                currentVersion = gVer.compare(hVer) > 0 ? gitLatestVersion : headerVersion;
                if (currentVersion === gitLatestVersion && currentVersion !== headerVersion) {
                    console.log(`📝 Using git history version ${gitLatestVersion} for ${detected.name} (header: ${headerVersion})`);
                }
            }
            catch {
                // Fallback to git version if comparison fails
                currentVersion = gitLatestVersion;
            }
        }
        else if (headerVersion) {
            // Only header available
            currentVersion = headerVersion;
        }
        else if (gitLatestVersion) {
            // Only git history available
            currentVersion = gitLatestVersion;
            console.log(`📝 Using git history version ${gitLatestVersion} for ${detected.name} (no header)`);
        }
        else {
            // Neither available - new component
            currentVersion = '1.0.0';
        }
        // If no history found, create initial version
        if (versionHistory.length === 0) {
            const currentCommit = await this.getCurrentCommit();
            versionHistory.push({
                version: currentVersion,
                commit: currentCommit,
                timestamp: new Date().toISOString(),
                path: filePath,
                message: 'Initial component discovery'
            });
        }
        return {
            id: ComponentNameGenerator.generateComponentId(),
            name: detected.name,
            type: detected.type,
            path: filePath,
            version: currentVersion,
            versionHistory
        };
    }
    async validateAndUpdateComponent(component, filePath, detected, options) {
        let needsUpdate = false;
        const updated = { ...component };
        // Check if path matches
        if (component.path !== filePath) {
            updated.path = filePath;
            needsUpdate = true;
        }
        // Check if type matches
        if (component.type !== detected.type) {
            updated.type = detected.type;
            needsUpdate = true;
        }
        // Check if version matches header
        const { fileHeaderManager } = await import('../utils/file-headers.js');
        const headerMetadata = await fileHeaderManager.readMetadata(filePath);
        const headerVersion = headerMetadata?.version;
        if (headerVersion && component.version !== headerVersion) {
            updated.version = headerVersion;
            needsUpdate = true;
            if (options.verbose) {
                console.log(`🔄 Updated version from header: ${component.version} → ${headerVersion}`);
            }
        }
        // Validate version history
        if (!component.versionHistory || component.versionHistory.length === 0) {
            updated.versionHistory = await this.buildVersionHistoryFromGit(filePath);
            needsUpdate = true;
        }
        else {
            // Validate existing version history entries
            const validatedHistory = await this.validateVersionHistory(component.versionHistory, filePath, options);
            if (validatedHistory.hasChanges) {
                updated.versionHistory = validatedHistory.history;
                needsUpdate = true;
                if (options.verbose) {
                    console.log(`🔧 Fixed ${validatedHistory.fixCount} invalid version entries for ${component.name}`);
                }
            }
        }
        return needsUpdate ? updated : null;
    }
    async buildVersionHistoryFromGit(filePath) {
        try {
            // Get commit history for this file
            const result = await this.git.exec([
                'log',
                '--follow',
                '--format=%H|%ci|%s',
                '--',
                filePath
            ]);
            const commits = result.stdout.split('\n').filter(line => line.trim());
            const versionHistory = [];
            for (let i = 0; i < commits.length; i++) {
                const commitLine = commits[i];
                if (!commitLine)
                    continue;
                const [commit, timestamp, message] = commitLine.split('|');
                if (commit && timestamp) {
                    // For now, we'll use simple versioning based on commit order
                    // In a real implementation, you might parse semantic version tags
                    const versionNumber = `1.0.${commits.length - i - 1}`;
                    versionHistory.push({
                        version: versionNumber,
                        commit: commit.trim(),
                        timestamp: new Date(timestamp.trim()).toISOString(),
                        path: filePath,
                        message: message?.trim() || 'No message'
                    });
                }
            }
            return versionHistory.reverse(); // Oldest first
        }
        catch (error) {
            console.warn(`Warning: Could not build version history for ${filePath}: ${error}`);
            return [];
        }
    }
    /**
     * Validate version history entries against git and fix invalid ones
     */
    async validateVersionHistory(versionHistory, filePath, options) {
        const validatedHistory = [];
        let hasChanges = false;
        let fixCount = 0;
        if (options.verbose) {
            console.log(`🔍 Validating ${versionHistory.length} version entries for ${filePath}`);
        }
        for (const version of versionHistory) {
            // Check if file exists at the commit
            const fileExistsAtCommit = await this.git.fileExistsAtCommit(filePath, version.commit);
            if (fileExistsAtCommit) {
                // Valid entry - keep it
                validatedHistory.push(version);
                if (options.verbose) {
                    console.log(`  ✅ v${version.version} at ${version.commit.substring(0, 8)} - valid`);
                }
            }
            else {
                // Invalid entry - try to find the correct commit for this version
                if (options.verbose) {
                    console.log(`  ❌ v${version.version} at ${version.commit.substring(0, 8)} - file doesn't exist`);
                }
                const correctedCommit = await this.findCommitForVersion(filePath, version, options);
                if (correctedCommit) {
                    const correctedVersion = {
                        ...version,
                        commit: correctedCommit
                    };
                    validatedHistory.push(correctedVersion);
                    hasChanges = true;
                    fixCount++;
                    if (options.verbose) {
                        console.log(`    🔧 Fixed: v${version.version} now points to ${correctedCommit.substring(0, 8)}`);
                    }
                }
                else {
                    // Can't fix this version - remove it
                    hasChanges = true;
                    fixCount++;
                    if (options.verbose) {
                        console.log(`    🗑️  Removed: v${version.version} - couldn't find valid commit`);
                    }
                }
            }
        }
        // If we lost all versions, rebuild from git
        if (validatedHistory.length === 0) {
            if (options.verbose) {
                console.log(`  🔄 No valid versions found, rebuilding from git...`);
            }
            const rebuiltHistory = await this.buildVersionHistoryFromGit(filePath);
            return {
                history: rebuiltHistory,
                hasChanges: true,
                fixCount: fixCount + rebuiltHistory.length
            };
        }
        return { history: validatedHistory, hasChanges, fixCount };
    }
    /**
     * Try to find the correct commit for a version by looking at git history
     */
    async findCommitForVersion(filePath, version, options) {
        try {
            // For v1.0.0, find the file creation commit (first commit where file exists)
            if (version.version === '1.0.0') {
                return await this.findFileCreationCommit(filePath);
            }
            // For other versions, try to find commit around the timestamp
            const result = await this.git.exec([
                'log',
                '--follow',
                '--pretty=format:%H %ci',
                '--since=' + new Date(new Date(version.timestamp).getTime() - 86400000).toISOString(), // 1 day before
                '--until=' + new Date(new Date(version.timestamp).getTime() + 86400000).toISOString(), // 1 day after
                '--',
                filePath
            ]);
            if (result.stdout.trim()) {
                const commits = result.stdout.trim().split('\n');
                for (const commitLine of commits) {
                    const [commit] = commitLine.split(' ');
                    if (commit && await this.git.fileExistsAtCommit(filePath, commit)) {
                        return commit;
                    }
                }
            }
            // Fallback: find the file creation commit
            return await this.findFileCreationCommit(filePath);
        }
        catch (error) {
            if (options.verbose) {
                console.log(`    ⚠️  Error finding commit for v${version.version}: ${error}`);
            }
            return null;
        }
    }
    /**
     * Find the commit where a file was first created
     */
    async findFileCreationCommit(filePath) {
        try {
            const result = await this.git.exec([
                'log',
                '--follow',
                '--pretty=format:%H',
                '--reverse', // Oldest first
                '--',
                filePath
            ]);
            if (result.stdout.trim()) {
                const commits = result.stdout.trim().split('\n');
                // Return the first (oldest) commit where the file exists
                for (const commit of commits) {
                    if (commit && await this.git.fileExistsAtCommit(filePath, commit.trim())) {
                        return commit.trim();
                    }
                }
            }
            return null;
        }
        catch (error) {
            return null;
        }
    }
    async getCurrentCommit() {
        try {
            const result = await this.git.exec(['rev-parse', 'HEAD']);
            return result.stdout.trim();
        }
        catch {
            return 'unknown';
        }
    }
    async removeDeletedComponents(registry, result, options) {
        const toRemove = [];
        for (const [name, component] of Object.entries(registry.components)) {
            try {
                await fs.access(component.path);
            }
            catch {
                // File doesn't exist
                toRemove.push(name);
            }
        }
        for (const name of toRemove) {
            delete registry.components[name];
            result.changes.removed.push(name);
            if (options.verbose) {
                console.log(`🗑️  Removed deleted component: ${name}`);
            }
        }
    }
    async rebuildVersionHistory(registry, result, options) {
        for (const [name, component] of Object.entries(registry.components)) {
            const newHistory = await this.buildVersionHistoryFromGit(component.path);
            if (newHistory.length > component.versionHistory.length) {
                component.versionHistory = newHistory;
                result.versionsRecovered += newHistory.length - component.versionHistory.length;
                if (options.verbose) {
                    console.log(`📈 Rebuilt history for ${name}: ${newHistory.length} versions`);
                }
            }
        }
    }
    async fixFileHeaders(registry, result, options) {
        for (const [name, component] of Object.entries(registry.components)) {
            try {
                const headerMetadata = await fileHeaderManager.readMetadata(component.path);
                if (!headerMetadata) {
                    // Missing header - add it
                    if (!options.dryRun) {
                        await fileHeaderManager.writeMetadata(component.path, {
                            version: component.version,
                            component: component.name,
                            componentId: component.id
                        });
                    }
                    result.changes.headerUpdates.push(component.path);
                    result.headersFixed++;
                    if (options.verbose) {
                        console.log(`📄 Added header to ${component.path}`);
                    }
                }
                else if (headerMetadata.version !== component.version) {
                    // Version mismatch detected - bump from the higher version to be safe
                    const registryVersion = component.version;
                    const headerVersion = headerMetadata.version;
                    // Determine which version is higher
                    const higherVersion = this.compareVersions(registryVersion, headerVersion) >= 0
                        ? registryVersion
                        : headerVersion;
                    // Calculate next version after the higher version
                    const nextVersion = this.bumpVersion(higherVersion, 'patch');
                    // Update component in registry
                    component.version = nextVersion;
                    component.versionHistory.push({
                        version: nextVersion,
                        commit: await this.getCurrentCommit() || 'unknown',
                        timestamp: new Date().toISOString(),
                        path: component.path,
                        message: `Version mismatch resolved: registry v${registryVersion} vs header v${headerVersion} (used higher: v${higherVersion})`
                    });
                    // Update file header
                    if (!options.dryRun) {
                        await fileHeaderManager.writeMetadata(component.path, {
                            version: nextVersion,
                            component: component.name,
                            componentId: component.id
                        }, { replace: true });
                    }
                    result.changes.headerUpdates.push(component.path);
                    result.headersFixed++;
                    result.componentsFixed++;
                    console.log(`🔄 Version mismatch resolved for ${component.name}: registry v${registryVersion} vs header v${headerVersion} → v${nextVersion} (used higher: v${higherVersion})`);
                    if (options.verbose) {
                        console.log(`📄 Updated header for ${component.path} to v${nextVersion}`);
                    }
                }
            }
            catch (error) {
                result.errors.push(`Failed to update header for ${component.path}: ${error}`);
            }
        }
    }
    /**
     * Bump a semantic version
     */
    bumpVersion(version, type = 'patch') {
        try {
            const parts = version.split('.').map(Number);
            if (parts.length !== 3 || parts.some(isNaN))
                throw new Error('Invalid version format');
            const major = parts[0];
            const minor = parts[1];
            const patch = parts[2];
            switch (type) {
                case 'major':
                    return `${major + 1}.0.0`;
                case 'minor':
                    return `${major}.${minor + 1}.0`;
                case 'patch':
                default:
                    return `${major}.${minor}.${patch + 1}`;
            }
        }
        catch {
            // Fallback for invalid version formats
            return '1.0.1';
        }
    }
    /**
     * Compare two semantic versions
     * @returns > 0 if v1 > v2, < 0 if v1 < v2, 0 if equal
     */
    compareVersions(v1, v2) {
        try {
            const parts1 = v1.split('.').map(Number);
            const parts2 = v2.split('.').map(Number);
            if (parts1.length !== 3 || parts2.length !== 3 ||
                parts1.some(isNaN) || parts2.some(isNaN)) {
                // Fallback to string comparison for invalid formats
                return v1.localeCompare(v2);
            }
            const [major1, minor1, patch1] = parts1;
            const [major2, minor2, patch2] = parts2;
            if (major1 !== major2)
                return major1 - major2;
            if (minor1 !== minor2)
                return minor1 - minor2;
            return patch1 - patch2;
        }
        catch {
            // Fallback to string comparison
            return v1.localeCompare(v2);
        }
    }
    async saveRegistry(registry) {
        await fs.mkdir('.edgit', { recursive: true });
        const content = JSON.stringify(ComponentUtils.updateRegistry(registry), null, 2);
        await fs.writeFile('.edgit/components.json', content, 'utf8');
    }
    async outputResult(result, options) {
        const prefix = options.dryRun ? '📋 Would' : '✅ ';
        console.log(`\n${prefix}Resync Results:`);
        console.log(`   📁 Files scanned: ${result.componentsScanned}`);
        if (result.componentsFixed > 0) {
            console.log(`   🔧 Components fixed: ${result.componentsFixed}`);
        }
        if (result.versionsRecovered > 0) {
            console.log(`   📈 Versions recovered: ${result.versionsRecovered}`);
        }
        if (result.headersFixed > 0) {
            console.log(`   📄 Headers fixed: ${result.headersFixed}`);
        }
        if (result.changes.added.length > 0) {
            console.log(`\n➕ Added Components (${result.changes.added.length}):`);
            for (const component of result.changes.added) {
                console.log(`   • ${component.name} (${component.type})`);
            }
        }
        if (result.changes.updated.length > 0) {
            console.log(`\n🔄 Updated Components (${result.changes.updated.length}):`);
            for (const component of result.changes.updated) {
                console.log(`   • ${component.name} (${component.type})`);
            }
        }
        if (result.changes.removed.length > 0) {
            console.log(`\n🗑️  Removed Components (${result.changes.removed.length}):`);
            for (const name of result.changes.removed) {
                console.log(`   • ${name}`);
            }
        }
        if (result.errors.length > 0) {
            console.log(`\n❌ Errors (${result.errors.length}):`);
            for (const error of result.errors) {
                console.log(`   • ${error}`);
            }
        }
        if (result.componentsFixed === 0 && result.errors.length === 0 && !options.force) {
            console.log('\n✨ Component state is already synchronized!');
        }
        if (options.dryRun && (result.componentsFixed > 0 || result.headersFixed > 0)) {
            console.log('\n💡 Run without --dry-run to apply these changes');
        }
    }
}
//# sourceMappingURL=resync.js.map