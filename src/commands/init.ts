import * as fs from 'fs/promises';
import * as path from 'path';
import { Command } from './base.js';
import { GitWrapper } from '../utils/git.js';
import { ComponentDetector } from '../utils/component-detector.js';
import type { ComponentRegistry, Component } from '../models/components.js';
import { ComponentUtils } from '../models/components.js';

/**
 * InitCommand handles 'edgit init' and 'edgit setup'
 * Initializes edgit in an existing git repository
 */
export class InitCommand extends Command {
  private static readonly EDGIT_DIR = '.edgit';
  private static readonly COMPONENTS_FILE = 'components.json';
  private static readonly GITIGNORE_ENTRY = '.edgit/';

  constructor() {
    super();
    this.detector = new ComponentDetector(this.git);
  }

  async execute(args: string[]): Promise<void> {
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
      if (!force && await this.isAlreadyInitialized(componentsFile)) {
        this.showWarning('Edgit is already initialized in this repository.');
        console.log('Use --force to reinitialize and rescan components.');
        return;
      }

      this.showInfo('Initializing edgit component tracking...');

      // Step 1: Create .edgit directory
      await this.createEdgitDirectory(edgitDir);

      // Step 2: Scan for existing components (or skip if --no-scan)
      let components: Component[] = [];
      if (scan) {
        components = await this.scanExistingComponents(repoRoot, { 
          headers: headers || false 
        });
      }

      // Step 3: Create components.json
      await this.createComponentsRegistry(componentsFile, components, { 
        headers: headers || false 
      });

      // Step 4: Update .gitignore (optional)
      await this.updateGitignore(repoRoot, flags.gitignore !== false);

      // Step 5: Show results
      await this.showResults(components, repoRoot);

      this.showSuccess('Edgit initialization complete!');

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.showError(`Failed to initialize edgit: ${message}`, [
        'Ensure you are in a git repository',
        'Check that you have write permissions',
        'Try running with --force to overwrite existing setup'
      ]);
      throw error;
    }
  }

  private async isAlreadyInitialized(componentsFile: string): Promise<boolean> {
    try {
      await fs.access(componentsFile);
      return true;
    } catch {
      return false;
    }
  }

  private async createEdgitDirectory(edgitDir: string): Promise<void> {
    try {
      await fs.mkdir(edgitDir, { recursive: true });
      this.showInfo(`Created ${InitCommand.EDGIT_DIR}/ directory`);
    } catch (error) {
      throw new Error(`Failed to create .edgit directory: ${error}`);
    }
  }

  private async scanExistingComponents(
    repoRoot: string, 
    options: { headers?: boolean } = {}
  ): Promise<Component[]> {
    if (!this.detector) {
      throw new Error('Component detector not initialized');
    }

    this.showInfo('Scanning repository for existing components...');
    
    const detectedComponents = await this.detector.getAllComponents();
    const components: Component[] = [];

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
      
      // Create component with Cloudflare-safe naming
      const component = await ComponentUtils.createComponentWithWorkerName(
        detected.path,
        detected.type,
        currentCommit,
        'init-scan', // Simple context
        'Initial component scan'
      );
      
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
  private async getRepoUrl(): Promise<string | undefined> {
    try {
      const result = await this.git.exec(['remote', 'get-url', 'origin']);
      return result.exitCode === 0 ? result.stdout.trim() : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Add file headers to components
   */
  private async addFileHeaders(components: Component[]): Promise<void> {
    const { fileHeaderManager } = await import('../utils/file-headers.js');
    
    for (const component of components) {
      try {
        const filePath = this.resolveWorkspacePath(component.path);
        
        // Check if file exists
        try {
          await fs.access(filePath);
        } catch {
          this.showWarning(`File not found: ${component.path}`);
          continue;
        }
        
        // Check if header already exists
        const existingHeader = await fileHeaderManager.readMetadata(filePath);
        if (existingHeader) {
          this.showInfo(`Header already exists in ${component.path}`);
          continue;
        }
        
        // Add header
        await fileHeaderManager.writeMetadata(filePath, {
          version: component.version,
          component: component.name
        }, {
          componentType: component.type,
          replace: false
        });
        
        this.showInfo(`Added header to ${component.path}`);
      } catch (error) {
        this.showWarning(`Failed to add header to ${component.path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private async createComponentsRegistry(
    componentsFile: string, 
    components: Component[],
    options: { headers?: boolean } = {}
  ): Promise<void> {
    const registry: ComponentRegistry = ComponentUtils.createEmptyRegistry();
    
    // Add all components to registry
    for (const component of components) {
      ComponentUtils.addComponent(registry, component);
    }

    // Add metadata
    const repoRoot = await this.git.getRepoRoot();
    if (repoRoot) {
      try {
        const remoteResult = await this.git.exec(['remote', 'get-url', 'origin']);
        const remote = remoteResult.exitCode === 0 ? remoteResult.stdout.trim() : undefined;
        
        const branchResult = await this.git.exec(['branch', '--show-current']);
        const branch = branchResult.exitCode === 0 ? branchResult.stdout.trim() : undefined;

        const repositoryInfo: { remote?: string; branch?: string } = {};
        if (remote) repositoryInfo.remote = remote;
        if (branch) repositoryInfo.branch = branch;

        registry.metadata = {
          repository: repositoryInfo,
          config: {
            defaultBump: 'patch',
            useFileHeaders: options.headers || false
          }
        };
      } catch {
        // Ignore errors getting remote/branch info
      }
    }

    try {
      const registryJson = JSON.stringify(registry, null, 2);
      await fs.writeFile(componentsFile, registryJson, 'utf8');
      this.showInfo(`Created ${InitCommand.COMPONENTS_FILE}`);
    } catch (error) {
      throw new Error(`Failed to write components registry: ${error}`);
    }
  }

  private async updateGitignore(repoRoot: string, shouldUpdate: boolean): Promise<void> {
    if (!shouldUpdate) {
      return;
    }

    const gitignorePath = path.join(repoRoot, '.gitignore');
    
    try {
      let gitignoreContent = '';
      
      try {
        gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
      } catch {
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
      
    } catch (error) {
      this.showWarning(`Could not update .gitignore: ${error}`);
    }
  }

  private async showResults(components: Component[], repoRoot: string): Promise<void> {
    console.log('\n📊 Initialization Summary:');
    console.log(`   Repository: ${repoRoot}`);
    console.log(`   Components found: ${components.length}`);
    
    if (components.length > 0) {
      console.log('\n🧩 Detected Components:');
      
      const byType = components.reduce((acc, comp) => {
        if (!acc[comp.type]) acc[comp.type] = [];
        acc[comp.type]!.push(comp);
        return acc;
      }, {} as Record<string, Component[]>);

      for (const [type, comps] of Object.entries(byType)) {
        console.log(`   ${type}s (${comps.length}):`);
        for (const comp of comps) {
          console.log(`     • ${comp.name} v${comp.version} (${comp.path})`);
        }
      }
    }

    console.log('\n🚀 Next Steps:');
    console.log('   • Modify a component file and run "edgit commit" to auto-version it');
    console.log('   • Use "edgit components" to list all tracked components');
    console.log('   • Use "edgit checkout component@version" to restore old versions');
  }

  getHelp(): string {
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
export async function setupEdgit(args: string[] = []): Promise<void> {
  const command = new InitCommand();
  await command.execute(args);
}