import { Command } from './base.js';
import { ComponentDetector } from '../utils/component-detector.js';
import { fileHeaderManager } from '../utils/file-headers.js';
import { ComponentUtils, type ComponentRegistry, type Component, type ComponentType } from '../models/components.js';
import { ComponentNameGenerator } from '../utils/component-name-generator.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as readline from 'readline';

export interface RegisterOptions {
  force?: boolean;
  withHeader?: boolean;
  withoutHeader?: boolean;
  updateHeader?: boolean;
  type?: ComponentType;
  name?: string;
  version?: string;
  interactive?: boolean;
}

export interface RegisterResult {
  component: Component;
  headerAdded: boolean;
  wasExisting: boolean;
}

/**
 * Register command for manually registering components
 */
export class RegisterCommand extends Command {
  async execute(args: string[]): Promise<void> {
    await this.validateGitRepo();
    await this.validateGitInstalled();
    
    const parsed = this.parseArgs(args);
    const options = this.extractRegisterOptions(parsed);
    
    // Handle help flag
    if (parsed.flags.help || parsed.flags.h) {
      console.log(this.getHelp());
      return;
    }
    
    if (parsed.positional.length === 0) {
      this.showError('Please specify a file to register.');
      console.log('\nUsage: edgit register <file> [options]');
      console.log('Run "edgit register --help" for more information.');
      return;
    }
    
    const filePath = parsed.positional[0];
    
    if (!filePath) {
      this.showError('File path is required.');
      return;
    }
    
    // Check if file exists (resolve relative to workspace directory)
    const resolvedFilePath = this.resolveWorkspacePath(filePath);
    try {
      await fs.access(resolvedFilePath);
    } catch {
      this.showError(`File not found: ${filePath}`);
      return;
    }
    
    console.log(`📝 Registering component: ${filePath}\n`);
    
    const result = await this.registerComponent(filePath, options);
    await this.outputResult(result, options);
  }

  getHelp(): string {
    return `
Usage: edgit register <file> [options]

Manually register a file as a component with version tracking.

Arguments:
  <file>                  Path to the file to register

Options:
  --force                 Force registration even if already registered
  --without-header        Skip adding version header to the file (default adds header)
  --update-header         Update existing version header
  --type <type>           Specify component type (prompt|agent|sql|config)
  --name <name>           Specify component name (auto-generated if not provided)
  --version <version>     Specify initial version (default: 1.0.0)
  --interactive, -i       Interactive mode with prompts

Examples:
  edgit register prompts/system.md               # Basic registration with header
  edgit register agent.py --type agent           # Specify type with header
  edgit register config.yaml --without-header    # Register without adding header
  edgit register prompt.md --interactive         # Interactive mode
  edgit register old-prompt.md --force           # Force re-registration

Note: Headers are added by default for hybrid versioning. Use --without-header to opt out.
    `.trim();
  }

  private extractRegisterOptions(parsed: any): RegisterOptions {
    return {
      force: parsed.flags.force,
      withHeader: parsed.flags['with-header'],
      withoutHeader: parsed.flags['without-header'],
      updateHeader: parsed.flags['update-header'],
      type: parsed.options.type as ComponentType,
      name: parsed.options.name,
      version: parsed.options.version || '1.0.0',
      interactive: parsed.flags.interactive || parsed.flags.i
    };
  }

  private async registerComponent(filePath: string, options: RegisterOptions): Promise<RegisterResult> {
    const detector = new ComponentDetector(this.git);
    
    // Resolve file path for all operations
    const resolvedFilePath = this.resolveWorkspacePath(filePath);
    
    // Load existing registry
    const registry = await this.loadOrCreateRegistry();
    
    // Detect component type and name
    let componentType = options.type;
    let componentName = options.name;
    
    if (!componentType || !componentName) {
      const detected = detector.detectComponent(resolvedFilePath);
      
      if (detected) {
        componentType = componentType || detected.type;
        componentName = componentName || detected.name;
      } else {
        // Manual detection needed
        if (!componentType) {
          if (options.interactive) {
            componentType = await this.promptForType();
          } else {
            throw new Error(`Could not detect component type for ${filePath}. Use --type to specify manually.`);
          }
        }
        
        if (!componentName) {
          componentName = this.generateComponentName(filePath, componentType, registry.components);
          if (options.interactive) {
            componentName = await this.promptForName(componentName);
          }
        }
      }
    }
    
    if (!componentType || !componentName) {
      throw new Error('Component type and name are required for registration.');
    }
    
    // Check if already registered (by name)
    const existing = ComponentUtils.findComponentByName(registry, componentName);
    const wasExisting = !!existing;
    
    if (existing && !options.force) {
      // Generate collision suggestions using name-based lookup
      const existingByName: Record<string, any> = {};
      ComponentUtils.getAllComponents(registry).forEach(comp => {
        existingByName[comp.name] = comp;
      });
      
      const result = ComponentNameGenerator.generateComponentName(path.basename(filePath, path.extname(filePath)), componentType, existingByName);
      
      let errorMessage = `Component "${componentName}" already exists. Use --force to overwrite.`;
      if (result.collision?.suggestions.length) {
        errorMessage += `\n💡 Suggested alternatives: ${result.collision.suggestions.join(', ')}`;
      }
      
      throw new Error(errorMessage);
    }
    
    // Get current commit
    const currentCommit = await this.getCurrentCommit();
    
    // Determine version to use - check for previous versions if not explicitly provided
    let versionToUse = options.version;
    if (!versionToUse || versionToUse === '1.0.0') {
      const previousVersion = await this.detectPreviousVersion(resolvedFilePath, componentName);
      if (previousVersion) {
        versionToUse = previousVersion;
        console.log(`📝 Continuing from previous version: ${previousVersion}`);
      } else {
        versionToUse = '1.0.0';
      }
    }
    // Ensure versionToUse is always a string
    const finalVersion: string = versionToUse || '1.0.0';
    
    // Create or update component
    const component: Component = {
      id: existing?.id || ComponentNameGenerator.generateComponentId(),
      name: componentName,
      type: componentType,
      path: filePath,
      version: finalVersion,
      versionHistory: existing?.versionHistory || [{
        version: finalVersion,
        commit: currentCommit,
        timestamp: new Date().toISOString(),
        path: filePath,
        message: wasExisting ? 'Component re-registered' : 'Initial component registration'
      }]
    };
    
    // Preserve existing tags if updating
    if (existing?.tags) {
      component.tags = existing.tags;
    }
    
    // When using --force, clean up any duplicate entries with same name but different ID
    if (options.force && existing) {
      const allComponents = ComponentUtils.getAllComponents(registry);
      for (const comp of allComponents) {
        if (comp.name === componentName && comp.id !== component.id) {
          ComponentUtils.removeComponent(registry, comp.id);
        }
      }
    }
    
    // Add to registry (keyed by ID)
    ComponentUtils.addComponent(registry, component);
    
    // Handle file headers
    // Default behavior: add headers unless --without-header is specified
    let headerAdded = false;
    const shouldAddHeader = !options.withoutHeader || options.withHeader || options.updateHeader;
    
    if (shouldAddHeader) {
      const existingHeader = await fileHeaderManager.readMetadata(resolvedFilePath);
      
      // Check if header is deregistered and needs updating
      let needsUpdate = !existingHeader || options.updateHeader;
      if (existingHeader) {
        const fileContent = await fs.readFile(resolvedFilePath, 'utf-8');
        const lines = fileContent.split('\n');
        const firstLine = lines[0];
        if (firstLine && firstLine.includes('[DEREGISTERED]')) {
          needsUpdate = true; // Always update deregistered headers
        }
      }
      
      if (needsUpdate) {
        const writeOptions: { replace?: boolean; componentType?: ComponentType } = {
          componentType: componentType
        };
        
        if (needsUpdate) {
          writeOptions.replace = true;
        }
        
        await fileHeaderManager.writeMetadata(resolvedFilePath, {
          version: component.version,
          component: componentName,
          componentId: component.id
        }, writeOptions);
        headerAdded = true;
      }
    }
    
    // Save registry
    await this.saveRegistry(registry);
    
    return {
      component,
      headerAdded,
      wasExisting
    };
  }

  private async loadOrCreateRegistry(): Promise<ComponentRegistry> {
    try {
      const registryPath = path.join(this.getWorkingDirectory(), '.edgit', 'components.json');
      const content = await fs.readFile(registryPath, 'utf8');
      return JSON.parse(content);
    } catch {
      return ComponentUtils.createEmptyRegistry();
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

  private generateComponentName(filePath: string, type: ComponentType, existingComponents?: Record<string, any>): string {
    const basename = path.basename(filePath, path.extname(filePath));
    
    const result = ComponentNameGenerator.generateComponentName(basename, type, existingComponents);
    
    // Display collision warning if detected
    if (result.collision?.detected) {
      console.log(`⚠️  Name collision detected for "${result.name}"`);
      if (result.collision.suggestions.length > 0) {
        console.log(`💡 Suggested alternatives: ${result.collision.suggestions.join(', ')}`);
      }
    }
    
    return result.name;
  }

  private async promptForType(): Promise<ComponentType> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      console.log('Available component types:');
      console.log('  1. prompt   - AI prompts and instructions');
      console.log('  2. agent    - Agent scripts and workflows');
      console.log('  3. sql      - SQL queries and schemas');
      console.log('  4. config   - Configuration files');
      
      rl.question('\nSelect component type (1-4): ', (answer) => {
        rl.close();
        
        const typeMap: Record<string, ComponentType> = {
          '1': 'prompt',
          '2': 'agent', 
          '3': 'sql',
          '4': 'config'
        };
        
        const type = typeMap[answer.trim()];
        if (type) {
          resolve(type);
        } else {
          console.log('Invalid selection, defaulting to "prompt"');
          resolve('prompt');
        }
      });
    });
  }

  private async promptForName(suggestedName: string): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(`Component name [${suggestedName}]: `, (answer) => {
        rl.close();
        resolve(answer.trim() || suggestedName);
      });
    });
  }

  private async saveRegistry(registry: ComponentRegistry): Promise<void> {
    const edgitDir = path.join(this.getWorkingDirectory(), '.edgit');
    const registryPath = path.join(edgitDir, 'components.json');
    
    await fs.mkdir(edgitDir, { recursive: true });
    const content = JSON.stringify(ComponentUtils.updateRegistry(registry), null, 2);
    await fs.writeFile(registryPath, content, 'utf8');
  }

  private async outputResult(result: RegisterResult, options: RegisterOptions): Promise<void> {
    const { component, headerAdded, wasExisting } = result;
    
    if (wasExisting) {
      this.showSuccess(`Updated component: ${component.name}`);
    } else {
      this.showSuccess(`Registered new component: ${component.name}`);
    }
    
    console.log(`   Type: ${component.type}`);
    console.log(`   Path: ${component.path}`);
    console.log(`   Version: ${component.version}`);
    
    if (headerAdded) {
      console.log(`   ✅ Added version header to file`);
    }
    
    console.log('\n💡 Next steps:');
    console.log(`   edgit components show ${component.name}     # View component details`);
    console.log(`   edgit commit -m "Add ${component.name}"     # Commit the changes`);
    
    if (!headerAdded && !options.withoutHeader) {
      console.log(`   edgit register ${component.path} --update-header  # Add version header`);
    }
  }

  /**
   * Detect previous version from deregistered header or git history
   */
  private async detectPreviousVersion(filePath: string, componentName: string): Promise<string | null> {
    try {
      // First, check for deregistered header in the file
      const existingHeader = await fileHeaderManager.readMetadata(filePath);
      if (existingHeader && existingHeader.version) {
        // Check if it's marked as deregistered
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const lines = fileContent.split('\n');
        const firstLine = lines[0];
        if (firstLine && firstLine.includes('[DEREGISTERED]')) {
          return existingHeader.version;
        }
      }

      // Second, check git history for this component name
      try {
        const historyCommand = ['log', '--oneline', `--grep=component=${componentName}`, `--grep=Component: ${componentName}`];
        const historyResult = await this.git.exec(historyCommand);
        
        if (historyResult.stdout.trim()) {
          // Try to extract version from commit messages using git log
          const versionCommand = ['log', '-p', `--grep=component=${componentName}`, '--', filePath];
          const versionResult = await this.git.exec(versionCommand);
          
          if (versionResult.stdout.trim()) {
            const versionMatch = versionResult.stdout.match(/version=([0-9]+\.[0-9]+\.[0-9]+)/);
            if (versionMatch && versionMatch[1]) {
              return versionMatch[1];
            }
          }
        }
      } catch (gitError) {
        // Git history check failed, continue to return null
      }

      return null;
    } catch (error) {
      // If any error occurs, return null to fall back to 1.0.0
      return null;
    }
  }
}