import { Command } from './base.js';
import { ComponentDetector } from '../utils/component-detector.js';
import { ComponentUtils, type ComponentRegistry, type Component, type ComponentVersion } from '../models/components.js';
import { ComponentNameGenerator } from '../utils/component-name-generator.js';
import { fileHeaderManager } from '../utils/file-headers.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ResyncOptions {
  force?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
  rebuildHistory?: boolean;
  fixHeaders?: boolean;
}

export interface ResyncResult {
  componentsScanned: number;
  componentsFixed: number;
  versionsRecovered: number;
  headersFixed: number;
  errors: string[];
  changes: {
    added: Component[];
    updated: Component[];
    removed: string[];
    headerUpdates: string[];
  };
}

/**
 * Resync command for recovery and synchronization of component state
 */
export class ResyncCommand extends Command {
  async execute(args: string[]): Promise<void> {
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
    } else {
      console.log('🔄 Resyncing component state with Git history...\n');
    }
    
    const result = await this.performResync(options);
    await this.outputResult(result, options);
  }

  getHelp(): string {
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

  private extractResyncOptions(parsed: any): ResyncOptions {
    return {
      force: parsed.flags.force,
      dryRun: parsed.flags['dry-run'],
      verbose: parsed.flags.verbose,
      rebuildHistory: parsed.flags['rebuild-history'],
      fixHeaders: parsed.flags['fix-headers']
    };
  }

  private async performResync(options: ResyncOptions): Promise<ResyncResult> {
    const result: ResyncResult = {
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
        } catch (error) {
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

      // Fix file headers if requested
      if (options.fixHeaders) {
        await this.fixFileHeaders(registry, result, options);
      }

      // Save updated registry
      if (!options.dryRun && (result.componentsFixed > 0 || options.force)) {
        await this.saveRegistry(registry);
        
        if (options.verbose) {
          console.log('💾 Saved updated components registry');
        }
      }

    } catch (error) {
      result.errors.push(`Critical error during resync: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  private async loadOrCreateRegistry(): Promise<ComponentRegistry> {
    try {
      const content = await fs.readFile('.edgit/components.json', 'utf8');
      return JSON.parse(content);
    } catch {
      // Create new registry if file doesn't exist or is corrupted
      return ComponentUtils.createEmptyRegistry();
    }
  }

  private async discoverAllComponents(detector: ComponentDetector): Promise<string[]> {
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
    } catch (error) {
      throw new Error(`Failed to list repository files: ${error}`);
    }
  }

  /**
   * Find files that have component headers (for hybrid versioning)
   */
  private async findFilesWithHeaders(): Promise<string[]> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const filesWithHeaders: string[] = [];
      
      // Recursively scan directory for files with headers
      const scanDirectory = async (dir: string): Promise<void> => {
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
            } else if (entry.isFile()) {
              // Check if file has component header
              const hasHeader = await this.fileHasComponentHeader(relativePath);
              if (hasHeader) {
                filesWithHeaders.push(relativePath);
              }
            }
          }
        } catch (error) {
          // Skip directories we can't read
        }
      };
      
      await scanDirectory('.');
      return filesWithHeaders;
    } catch (error) {
      console.warn(`Warning: Could not scan for files with headers: ${error}`);
      return [];
    }
  }

  /**
   * Check if a file has a component header
   */
  private async fileHasComponentHeader(filePath: string): Promise<boolean> {
    try {
      const metadata = await fileHeaderManager.readMetadata(filePath);
      return metadata !== null && !!metadata.version && !!metadata.component;
    } catch {
      return false;
    }
  }

  private async processComponentFile(
    filePath: string,
    registry: ComponentRegistry,
    detector: ComponentDetector,
    result: ResyncResult,
    options: ResyncOptions
  ): Promise<void> {
    const detected = detector.detectComponent(filePath);
    if (!detected) return;

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
    } else {
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

  private async createComponentFromGitHistory(
    filePath: string,
    detected: { type: any; name: string },
    options: ResyncOptions
  ): Promise<Component> {
    // Build version history from Git first
    const versionHistory = await this.buildVersionHistoryFromGit(filePath);
    
    // Get current version from file header, or latest from git history, or default to 1.0.0
    const headerMetadata = await fileHeaderManager.readMetadata(filePath);
    let currentVersion = headerMetadata?.version;
    
    if (!currentVersion) {
      // No header version - use latest from git history or default
      if (versionHistory.length > 0) {
        // Sort versions and use the latest
        const sortedVersions = versionHistory.slice().sort((a, b) => {
          try {
            const vA = new (require('../models/components.js').SemVer)(a.version);
            const vB = new (require('../models/components.js').SemVer)(b.version);
            return vB.compare(vA); // Latest first
          } catch {
            return b.timestamp.localeCompare(a.timestamp);
          }
        });
        currentVersion = sortedVersions[0]?.version || '1.0.0';
      } else {
        currentVersion = '1.0.0';
      }
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

  private async validateAndUpdateComponent(
    component: Component,
    filePath: string,
    detected: { type: any; name: string },
    options: ResyncOptions
  ): Promise<Component | null> {
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
    } else {
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

  private async buildVersionHistoryFromGit(filePath: string): Promise<ComponentVersion[]> {
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
      const versionHistory: ComponentVersion[] = [];

      for (let i = 0; i < commits.length; i++) {
        const commitLine = commits[i];
        if (!commitLine) continue;
        
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
    } catch (error) {
      console.warn(`Warning: Could not build version history for ${filePath}: ${error}`);
      return [];
    }
  }

  /**
   * Validate version history entries against git and fix invalid ones
   */
  private async validateVersionHistory(
    versionHistory: ComponentVersion[], 
    filePath: string, 
    options: ResyncOptions
  ): Promise<{ history: ComponentVersion[]; hasChanges: boolean; fixCount: number }> {
    const validatedHistory: ComponentVersion[] = [];
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
      } else {
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
        } else {
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
  private async findCommitForVersion(
    filePath: string, 
    version: ComponentVersion, 
    options: ResyncOptions
  ): Promise<string | null> {
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
    } catch (error) {
      if (options.verbose) {
        console.log(`    ⚠️  Error finding commit for v${version.version}: ${error}`);
      }
      return null;
    }
  }

  /**
   * Find the commit where a file was first created
   */
  private async findFileCreationCommit(filePath: string): Promise<string | null> {
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
    } catch (error) {
      return null;
    }
  }

  private async getCurrentCommit(): Promise<string> {
    try {
      const result = await this.git.exec(['rev-parse', 'HEAD']);
      return result.stdout.trim();
    } catch {
      return 'unknown';
    }
  }

  private async removeDeletedComponents(
    registry: ComponentRegistry,
    result: ResyncResult,
    options: ResyncOptions
  ): Promise<void> {
    const toRemove: string[] = [];

    for (const [name, component] of Object.entries(registry.components)) {
      try {
        await fs.access(component.path);
      } catch {
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

  private async rebuildVersionHistory(
    registry: ComponentRegistry,
    result: ResyncResult,
    options: ResyncOptions
  ): Promise<void> {
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

  private async fixFileHeaders(
    registry: ComponentRegistry,
    result: ResyncResult,
    options: ResyncOptions
  ): Promise<void> {
    for (const [name, component] of Object.entries(registry.components)) {
      try {
        const hasHeader = !!(await fileHeaderManager.readMetadata(component.path));
        
        if (!hasHeader) {
          if (!options.dryRun) {
            await fileHeaderManager.writeMetadata(component.path, {
              version: component.version,
              component: component.name
            });
          }
          
          result.changes.headerUpdates.push(component.path);
          result.headersFixed++;
          
          if (options.verbose) {
            console.log(`📄 Added header to ${component.path}`);
          }
        }
      } catch (error) {
        result.errors.push(`Failed to update header for ${component.path}: ${error}`);
      }
    }
  }

  private async saveRegistry(registry: ComponentRegistry): Promise<void> {
    await fs.mkdir('.edgit', { recursive: true });
    const content = JSON.stringify(ComponentUtils.updateRegistry(registry), null, 2);
    await fs.writeFile('.edgit/components.json', content, 'utf8');
  }

  private async outputResult(result: ResyncResult, options: ResyncOptions): Promise<void> {
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