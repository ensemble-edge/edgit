import { Command } from './base.js';
import { createGitTagManager } from '../utils/git-tags.js';
import { ComponentUtils } from '../models/components.js';
import * as fs from 'fs/promises';
import * as path from 'path';
/**
 * Tag command for creating and managing component version and deployment tags
 * Replaces stored versioning with Git's native tag system
 */
export class TagCommand extends Command {
    tagManager;
    constructor() {
        super();
        this.tagManager = createGitTagManager(this.git);
    }
    async execute(args) {
        if (args.length === 0) {
            await this.showHelp();
            return;
        }
        const subcommand = args[0];
        switch (subcommand) {
            case 'create':
                await this.createTag(args.slice(1));
                break;
            case 'list':
                await this.listTags(args.slice(1));
                break;
            case 'show':
                await this.showTag(args.slice(1));
                break;
            case 'delete':
                await this.deleteTag(args.slice(1));
                break;
            case 'push':
                await this.pushTags(args.slice(1));
                break;
            default:
                // Default behavior: create tag
                await this.createTag(args);
        }
    }
    /**
     * Create a version or deployment tag
     * Usage: edgit tag create <component> <tagname> [sha]
     *        edgit tag <component> <tagname> [sha]
     */
    async createTag(args) {
        if (args.length < 2) {
            console.error('Usage: edgit tag create <component> <tagname> [sha]');
            console.error('       edgit tag <component> <tagname> [sha]');
            process.exit(1);
        }
        const componentName = args[0];
        const tagName = args[1];
        const sha = args[2];
        if (!componentName || !tagName) {
            console.error('Component name and tag name are required');
            process.exit(1);
        }
        // Load registry to verify component exists
        const registry = await this.loadRegistry();
        const component = ComponentUtils.findComponentByName(registry, componentName);
        if (!component) {
            console.error(`❌ Component '${componentName}' not found`);
            console.log(`Available components: ${ComponentUtils.listComponentNames(registry).join(', ')}`);
            process.exit(1);
        }
        try {
            // Check if it's a version tag or deployment tag
            if (this.isVersionTag(tagName)) {
                await this.createVersionTag(componentName, tagName, sha);
            }
            else if (this.isDeploymentTag(tagName)) {
                await this.createDeploymentTag(componentName, tagName, sha);
            }
            else {
                await this.createCustomTag(componentName, tagName, sha);
            }
        }
        catch (error) {
            console.error(`❌ Failed to create tag: ${error instanceof Error ? error.message : error}`);
            process.exit(1);
        }
    }
    /**
     * Create an immutable version tag (v1.0.0)
     */
    async createVersionTag(componentName, version, sha) {
        const gitTag = await this.tagManager.createVersionTag(componentName, version, 'component', sha, `Release ${componentName} ${version}`);
        console.log(`✅ Created version tag: ${componentName}@${version}`);
        console.log(`   Git tag: ${gitTag}`);
        if (sha) {
            console.log(`   SHA: ${sha}`);
        }
        console.log(`\n💡 Push with: git push origin ${gitTag}`);
    }
    /**
     * Create or move a deployment tag (prod, staging, etc.)
     */
    async createDeploymentTag(componentName, env, targetRef) {
        const target = targetRef || 'HEAD';
        const gitTag = await this.tagManager.moveDeploymentTag(componentName, env, target, 'component', `Deploy ${componentName} to ${env}`);
        console.log(`✅ ${targetRef ? 'Moved' : 'Created'} deployment tag: ${componentName}@${env}`);
        console.log(`   Git tag: ${gitTag}`);
        console.log(`   Points to: ${target}`);
        console.log(`\n💡 Push with: git push origin ${gitTag} --force`);
    }
    /**
     * Create a custom tag
     */
    async createCustomTag(componentName, tagName, sha) {
        const gitTag = await this.tagManager.tagComponent(componentName, tagName, sha, `Tag ${componentName} as ${tagName}`);
        console.log(`✅ Created custom tag: ${componentName}@${tagName}`);
        console.log(`   Git tag: ${gitTag}`);
        if (sha) {
            console.log(`   SHA: ${sha}`);
        }
        console.log(`\n💡 Push with: git push origin ${gitTag}`);
    }
    /**
     * List tags for a component or all components
     * Usage: edgit tag list [component]
     */
    async listTags(args) {
        const registry = await this.loadRegistry();
        if (args.length === 0) {
            // List all components and their tags
            await this.listAllComponentTags(registry);
        }
        else {
            // List tags for specific component
            const componentName = args[0];
            if (!componentName) {
                console.error('Component name is required');
                process.exit(1);
            }
            await this.listComponentTags(componentName, registry);
        }
    }
    /**
     * Show detailed information about a specific tag
     * Usage: edgit tag show <component>@<tag>
     */
    async showTag(args) {
        if (args.length === 0) {
            console.error('Usage: edgit tag show <component>@<tag>');
            process.exit(1);
        }
        const spec = args[0];
        if (!spec) {
            console.error('Usage: edgit tag show <component>@<tag>');
            process.exit(1);
        }
        const parts = spec.split('@');
        if (parts.length !== 2) {
            console.error('Usage: edgit tag show <component>@<tag>');
            process.exit(1);
        }
        const componentName = parts[0];
        const tagName = parts[1];
        if (!componentName || !tagName) {
            console.error('Usage: edgit tag show <component>@<tag>');
            process.exit(1);
        }
        // Verify component exists
        const registry = await this.loadRegistry();
        const component = ComponentUtils.findComponentByName(registry, componentName);
        if (!component) {
            console.error(`❌ Component '${componentName}' not found`);
            process.exit(1);
        }
        try {
            const tagInfo = await this.tagManager.getTagInfo(componentName, tagName);
            console.log(`📦 ${componentName}@${tagName}`);
            console.log(`   SHA: ${tagInfo.sha}`);
            console.log(`   Date: ${tagInfo.date}`);
            console.log(`   Author: ${tagInfo.author}`);
            console.log(`   Message: ${tagInfo.message}`);
            // Show file path
            console.log(`   File: ${component.path}`);
            console.log(`   Type: ${component.type}`);
        }
        catch (error) {
            console.error(`❌ Tag not found: ${componentName}@${tagName}`);
            process.exit(1);
        }
    }
    /**
     * Delete a tag
     * Usage: edgit tag delete <component>@<tag> [--remote]
     */
    async deleteTag(args) {
        if (args.length === 0) {
            console.error('Usage: edgit tag delete <component>@<tag> [--remote]');
            process.exit(1);
        }
        const spec = args[0];
        if (!spec) {
            console.error('Usage: edgit tag delete <component>@<tag> [--remote]');
            process.exit(1);
        }
        const deleteRemote = args.includes('--remote');
        const parts = spec.split('@');
        if (parts.length !== 2) {
            console.error('Usage: edgit tag delete <component>@<tag> [--remote]');
            process.exit(1);
        }
        const componentName = parts[0];
        const tagName = parts[1];
        if (!componentName || !tagName) {
            console.error('Usage: edgit tag delete <component>@<tag> [--remote]');
            process.exit(1);
        }
        // Verify component exists
        const registry = await this.loadRegistry();
        const component = ComponentUtils.findComponentByName(registry, componentName);
        if (!component) {
            console.error(`❌ Component '${componentName}' not found`);
            process.exit(1);
        }
        try {
            await this.tagManager.deleteTag(componentName, tagName, 'component', deleteRemote);
            console.log(`✅ Deleted tag: ${componentName}@${tagName}`);
            if (deleteRemote) {
                console.log('   Also deleted from remote');
            }
        }
        catch (error) {
            console.error(`❌ Failed to delete tag: ${error instanceof Error ? error.message : error}`);
            process.exit(1);
        }
    }
    /**
     * Push tags to remote
     * Usage: edgit tag push [component] [--force]
     */
    async pushTags(args) {
        const force = args.includes('--force');
        const componentName = args.find((arg) => arg !== '--force');
        if (componentName) {
            // Push tags for specific component
            const registry = await this.loadRegistry();
            const component = ComponentUtils.findComponentByName(registry, componentName);
            if (!component) {
                console.error(`❌ Component '${componentName}' not found`);
                process.exit(1);
            }
            try {
                await this.tagManager.pushTags(componentName, 'component', undefined, force);
                console.log(`✅ Pushed tags for ${componentName}`);
            }
            catch (error) {
                console.error(`❌ Failed to push tags: ${error instanceof Error ? error.message : error}`);
                process.exit(1);
            }
        }
        else {
            // Push all component tags
            const registry = await this.loadRegistry();
            const componentNames = ComponentUtils.listComponentNames(registry);
            for (const name of componentNames) {
                try {
                    await this.tagManager.pushTags(name, 'component', undefined, force);
                    console.log(`✅ Pushed tags for ${name}`);
                }
                catch (error) {
                    console.warn(`⚠️  Warning: Failed to push tags for ${name}: ${error instanceof Error ? error.message : error}`);
                }
            }
        }
    }
    // Helper methods
    /**
     * Check if tag name is a version tag (v1.0.0, 1.0.0)
     */
    isVersionTag(tagName) {
        return /^v?\d+\.\d+\.\d+/.test(tagName);
    }
    /**
     * Check if tag name is a deployment tag
     */
    isDeploymentTag(tagName) {
        const deploymentTags = ['prod', 'staging', 'canary', 'latest', 'dev', 'test'];
        return deploymentTags.includes(tagName);
    }
    /**
     * List tags for all components
     */
    async listAllComponentTags(registry) {
        const componentNames = ComponentUtils.listComponentNames(registry);
        if (componentNames.length === 0) {
            console.log('No components registered');
            return;
        }
        console.log('📦 Component Tags:\n');
        for (const componentName of componentNames) {
            await this.listComponentTags(componentName, registry, false);
            console.log(); // Empty line between components
        }
    }
    /**
     * List tags for a specific component
     */
    async listComponentTags(componentName, registry, standalone = true) {
        const component = ComponentUtils.findComponentByName(registry, componentName);
        if (!component) {
            console.error(`❌ Component '${componentName}' not found`);
            if (standalone) {
                process.exit(1);
            }
            return;
        }
        try {
            const allTags = await this.tagManager.listComponentTags(componentName);
            const versionTags = await this.tagManager.getVersionTags(componentName);
            const deploymentTags = await this.tagManager.getDeploymentTags(componentName);
            console.log(`📦 ${componentName} (${component.type})`);
            console.log(`   Path: ${component.path}`);
            if (versionTags.length > 0) {
                console.log(`   Versions: ${versionTags.join(', ')}`);
            }
            if (deploymentTags.length > 0) {
                console.log(`   Deployments: ${deploymentTags.join(', ')}`);
            }
            const customTags = allTags.filter((tag) => !this.isVersionTag(tag) && !this.isDeploymentTag(tag));
            if (customTags.length > 0) {
                console.log(`   Custom: ${customTags.join(', ')}`);
            }
            if (allTags.length === 0) {
                console.log('   No tags');
            }
        }
        catch (error) {
            console.error(`❌ Failed to list tags for ${componentName}: ${error instanceof Error ? error.message : error}`);
            if (standalone) {
                process.exit(1);
            }
        }
    }
    /**
     * Load component registry
     */
    async loadRegistry() {
        const registryPath = path.join(process.cwd(), '.edgit', 'components.json');
        try {
            const content = await fs.readFile(registryPath, 'utf-8');
            return JSON.parse(content);
        }
        catch {
            // Return empty registry if file doesn't exist
            return ComponentUtils.createEmptyRegistry();
        }
    }
    /**
     * Show help for tag command
     */
    getHelp() {
        return `
edgit tag - Manage component version and deployment tags

USAGE:
  edgit tag create <component> <tagname> [sha]  Create a new tag
  edgit tag <component> <tagname> [sha]         Create a new tag (shorthand)
  edgit tag list [component]                    List tags for component(s)
  edgit tag show <component>@<tag>              Show detailed tag information
  edgit tag delete <component>@<tag> [--remote] Delete a tag
  edgit tag push [component] [--force]          Push tags to remote

TAG TYPES:
  Version tags:    v1.0.0, v2.1.3 (immutable, cannot be moved)
  Deployment tags: prod, staging, canary, latest (moveable)
  Custom tags:     Any other name

EXAMPLES:
  edgit tag create extraction-prompt v1.0.0     # Create version tag
  edgit tag create extraction-prompt prod       # Create/move deployment tag
  edgit tag list                                # List all component tags
  edgit tag list extraction-prompt              # List tags for one component
  edgit tag show extraction-prompt@v1.0.0       # Show tag details
  edgit tag delete extraction-prompt@v1.0.0     # Delete local tag
  edgit tag push extraction-prompt --force      # Push tags (force for deployments)

GIT TAG FORMAT:
  All tags are stored as: components/<component>/<tag>
  Example: components/extraction-prompt/v1.0.0
`;
    }
    /**
     * Show help for tag command
     */
    async showHelp() {
        console.log(this.getHelp());
    }
}
//# sourceMappingURL=tag.js.map