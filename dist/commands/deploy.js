import { Command } from './base.js';
import { createGitTagManager } from '../utils/git-tags.js';
import { ComponentUtils } from '../models/components.js';
import * as fs from 'fs/promises';
import * as path from 'path';
/**
 * Deploy command for managing component deployments using Git tags
 * Moves deployment tags between environments and promotes components
 */
export class DeployCommand extends Command {
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
            case 'set':
                await this.deployComponent(args.slice(1));
                break;
            case 'promote':
                await this.promoteComponent(args.slice(1));
                break;
            case 'status':
                await this.showDeploymentStatus(args.slice(1));
                break;
            case 'list':
                await this.listDeployments(args.slice(1));
                break;
            case 'rollback':
                await this.rollbackDeployment(args.slice(1));
                break;
            default:
                // Default behavior: deploy component
                await this.deployComponent(args);
        }
    }
    /**
     * Deploy a specific version to an environment
     * Usage: edgit deploy set <component> <version> --to <env>
     *        edgit deploy <component> <version> --to <env>
     */
    async deployComponent(args) {
        const toIndex = args.indexOf('--to');
        if (args.length < 3 || toIndex === -1 || toIndex === args.length - 1) {
            console.error('Usage: edgit deploy set <component> <version> --to <env>');
            console.error('       edgit deploy <component> <version> --to <env>');
            process.exit(1);
        }
        const componentName = args[0];
        const version = args[1];
        const environment = args[toIndex + 1];
        if (!componentName || !version || !environment) {
            console.error('Component name, version, and environment are required');
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
            // Resolve version to SHA
            const sha = await this.tagManager.resolveRef(componentName, version);
            // Move deployment tag to this SHA
            const gitTag = await this.tagManager.moveDeploymentTag(componentName, environment, sha, `Deploy ${componentName}@${version} to ${environment}`);
            console.log(`✅ Deployed ${componentName}@${version} to ${environment}`);
            console.log(`   Git tag: ${gitTag} → ${sha.substring(0, 8)}`);
            // Show what's now deployed with the specific version that was deployed
            await this.showSpecificDeployment(componentName, environment, version, sha);
            console.log(`\n💡 Push with: git push origin ${gitTag} --force`);
        }
        catch (error) {
            console.error(`❌ Failed to deploy: ${error instanceof Error ? error.message : error}`);
            process.exit(1);
        }
    }
    /**
     * Promote a component from one environment to another
     * Usage: edgit deploy promote <component> --from <source-env> --to <target-env>
     */
    async promoteComponent(args) {
        const fromIndex = args.indexOf('--from');
        const toIndex = args.indexOf('--to');
        if (args.length < 5 ||
            fromIndex === -1 ||
            toIndex === -1 ||
            fromIndex === args.length - 1 ||
            toIndex === args.length - 1) {
            console.error('Usage: edgit deploy promote <component> --from <source-env> --to <target-env>');
            process.exit(1);
        }
        const componentName = args[0];
        const fromEnv = args[fromIndex + 1];
        const toEnv = args[toIndex + 1];
        if (!componentName || !fromEnv || !toEnv) {
            console.error('Component name, source environment, and target environment are required');
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
            // Get SHA from source environment
            const fromSHA = await this.tagManager.getTagSHA(componentName, fromEnv);
            // Get version info for the SHA (find which version tag points to this SHA)
            const versionTags = await this.tagManager.getVersionTags(componentName);
            let versionInfo = 'unknown';
            for (const versionTag of versionTags) {
                try {
                    const versionSHA = await this.tagManager.getTagSHA(componentName, versionTag);
                    if (versionSHA === fromSHA) {
                        versionInfo = versionTag;
                        break;
                    }
                }
                catch {
                    // Continue searching
                }
            }
            // Move target environment tag to same SHA
            const gitTag = await this.tagManager.moveDeploymentTag(componentName, toEnv, fromSHA, `Promote ${componentName} from ${fromEnv} to ${toEnv}`);
            console.log(`✅ Promoted ${componentName} from ${fromEnv} to ${toEnv}`);
            console.log(`   Version: ${versionInfo}`);
            console.log(`   SHA: ${fromSHA.substring(0, 8)}`);
            console.log(`   Git tag: ${gitTag}`);
            // Show deployment status
            await this.showEnvironmentStatus(componentName, toEnv);
            console.log(`\n💡 Push with: git push origin ${gitTag} --force`);
        }
        catch (error) {
            console.error(`❌ Failed to promote: ${error instanceof Error ? error.message : error}`);
            process.exit(1);
        }
    }
    /**
     * Show deployment status for all environments or specific component
     * Usage: edgit deploy status [component]
     */
    async showDeploymentStatus(args) {
        const registry = await this.loadRegistry();
        if (args.length === 0) {
            // Show status for all components
            await this.showAllDeploymentStatus(registry);
        }
        else {
            const componentName = args[0];
            if (!componentName) {
                console.error('Component name is required');
                process.exit(1);
            }
            await this.showComponentDeploymentStatus(componentName, registry);
        }
    }
    /**
     * List all deployments across environments
     * Usage: edgit deploy list [environment]
     */
    async listDeployments(args) {
        const registry = await this.loadRegistry();
        const targetEnv = args[0];
        if (targetEnv) {
            // List deployments for specific environment
            await this.listEnvironmentDeployments(targetEnv, registry);
        }
        else {
            // List all deployments
            await this.listAllDeployments(registry);
        }
    }
    /**
     * Rollback a deployment to previous version
     * Usage: edgit deploy rollback <component> --env <environment> [--to <version>]
     */
    async rollbackDeployment(args) {
        const envIndex = args.indexOf('--env');
        const toIndex = args.indexOf('--to');
        if (args.length < 3 || envIndex === -1 || envIndex === args.length - 1) {
            console.error('Usage: edgit deploy rollback <component> --env <environment> [--to <version>]');
            process.exit(1);
        }
        const componentName = args[0];
        const environment = args[envIndex + 1];
        const targetVersion = toIndex !== -1 && toIndex < args.length - 1 ? args[toIndex + 1] : undefined;
        if (!componentName || !environment) {
            console.error('Component name and environment are required');
            process.exit(1);
        }
        // Load registry to verify component exists
        const registry = await this.loadRegistry();
        const component = ComponentUtils.findComponentByName(registry, componentName);
        if (!component) {
            console.error(`❌ Component '${componentName}' not found`);
            process.exit(1);
        }
        try {
            let rollbackSHA;
            let rollbackVersion;
            if (targetVersion) {
                // Rollback to specific version
                rollbackSHA = await this.tagManager.resolveRef(componentName, targetVersion);
                rollbackVersion = targetVersion;
            }
            else {
                // Find previous version (simplified - get second-to-last version tag)
                const versionTags = await this.tagManager.getVersionTags(componentName);
                if (versionTags.length < 2) {
                    console.error('❌ No previous version found for rollback');
                    process.exit(1);
                }
                rollbackVersion = versionTags[versionTags.length - 2]; // Second-to-last (guaranteed to exist)
                rollbackSHA = await this.tagManager.getTagSHA(componentName, rollbackVersion);
            }
            // Move deployment tag to rollback SHA
            const gitTag = await this.tagManager.moveDeploymentTag(componentName, environment, rollbackSHA, `Rollback ${componentName} in ${environment} to ${rollbackVersion}`);
            console.log(`✅ Rolled back ${componentName} in ${environment} to ${rollbackVersion}`);
            console.log(`   SHA: ${rollbackSHA.substring(0, 8)}`);
            console.log(`   Git tag: ${gitTag}`);
            console.log(`\n💡 Push with: git push origin ${gitTag} --force`);
        }
        catch (error) {
            console.error(`❌ Failed to rollback: ${error instanceof Error ? error.message : error}`);
            process.exit(1);
        }
    }
    // Helper methods
    /**
     * Show deployment status for all components
     */
    async showAllDeploymentStatus(registry) {
        const componentNames = ComponentUtils.listComponentNames(registry);
        if (componentNames.length === 0) {
            console.log('No components registered');
            return;
        }
        console.log('🚀 Deployment Status:\n');
        for (const componentName of componentNames) {
            await this.showComponentDeploymentStatus(componentName, registry, false);
            console.log(); // Empty line between components
        }
    }
    /**
     * Show deployment status for a specific component
     */
    async showComponentDeploymentStatus(componentName, registry, standalone = true) {
        const component = ComponentUtils.findComponentByName(registry, componentName);
        if (!component) {
            console.error(`❌ Component '${componentName}' not found`);
            if (standalone) {
                process.exit(1);
            }
            return;
        }
        try {
            const deploymentTags = await this.tagManager.getDeploymentTags(componentName);
            console.log(`📦 ${componentName} (${component.type})`);
            console.log(`   Path: ${component.path}`);
            if (deploymentTags.length === 0) {
                console.log('   No deployments');
                return;
            }
            console.log('   Deployments:');
            for (const env of deploymentTags) {
                await this.showEnvironmentStatus(componentName, env, '     ');
            }
        }
        catch (error) {
            console.error(`❌ Failed to get deployment status for ${componentName}: ${error instanceof Error ? error.message : error}`);
            if (standalone) {
                process.exit(1);
            }
        }
    }
    /**
     * Show status for a specific environment
     */
    async showEnvironmentStatus(componentName, environment, indent = '   ') {
        try {
            const sha = await this.tagManager.getTagSHA(componentName, environment);
            const tagInfo = await this.tagManager.getTagInfo(componentName, environment);
            // Try to extract version from deployment tag message first
            let version = 'custom';
            const deployMessage = tagInfo.message;
            const versionMatch = deployMessage.match(/@(v?[\d\.\w\-]+)\s+to\s+/);
            if (versionMatch) {
                // Found version in deployment tag message
                version = versionMatch[1];
            }
            else {
                // Fallback: find matching version tags and use the latest one
                const versionTags = await this.tagManager.getVersionTags(componentName);
                const matchingVersions = [];
                for (const versionTag of versionTags) {
                    try {
                        const versionSHA = await this.tagManager.getTagSHA(componentName, versionTag);
                        if (versionSHA === sha) {
                            matchingVersions.push(versionTag);
                        }
                    }
                    catch {
                        // Continue searching
                    }
                }
                // If we found matching versions, use the latest one (last in sorted array)
                if (matchingVersions.length > 0) {
                    version = matchingVersions[matchingVersions.length - 1];
                }
            }
            console.log(`${indent}${environment}: ${version} (${sha.substring(0, 8)}) - ${tagInfo.date}`);
        }
        catch (error) {
            console.log(`${indent}${environment}: not deployed`);
        }
    }
    /**
     * Show deployment confirmation with the specific version that was deployed
     */
    async showSpecificDeployment(componentName, environment, version, sha) {
        try {
            const tagInfo = await this.tagManager.getTagInfo(componentName, environment);
            console.log(`   ${environment}: ${version} (${sha.substring(0, 8)}) - ${tagInfo.date}`);
        }
        catch (error) {
            console.log(`   ${environment}: ${version} (${sha.substring(0, 8)}) - just deployed`);
        }
    }
    /**
     * List deployments for a specific environment
     */
    async listEnvironmentDeployments(environment, registry) {
        const componentNames = ComponentUtils.listComponentNames(registry);
        console.log(`🚀 Deployments in ${environment}:\n`);
        for (const componentName of componentNames) {
            try {
                const sha = await this.tagManager.getTagSHA(componentName, environment);
                // Find version for this SHA
                const versionTags = await this.tagManager.getVersionTags(componentName);
                let version = 'custom';
                for (const versionTag of versionTags) {
                    try {
                        const versionSHA = await this.tagManager.getTagSHA(componentName, versionTag);
                        if (versionSHA === sha) {
                            version = versionTag;
                            break;
                        }
                    }
                    catch {
                        // Continue searching
                    }
                }
                console.log(`📦 ${componentName}: ${version} (${sha.substring(0, 8)})`);
            }
            catch {
                // Component not deployed in this environment
            }
        }
    }
    /**
     * List all deployments across all environments
     */
    async listAllDeployments(registry) {
        const componentNames = ComponentUtils.listComponentNames(registry);
        const environments = new Set();
        // Collect all environments
        for (const componentName of componentNames) {
            try {
                const deploymentTags = await this.tagManager.getDeploymentTags(componentName);
                deploymentTags.forEach((env) => environments.add(env));
            }
            catch {
                // Continue
            }
        }
        if (environments.size === 0) {
            console.log('No deployments found');
            return;
        }
        console.log('🚀 All Deployments:\n');
        for (const env of Array.from(environments).sort()) {
            await this.listEnvironmentDeployments(env, registry);
            console.log(); // Empty line between environments
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
     * Show help for deploy command
     */
    getHelp() {
        return `
edgit deploy - Manage component deployments using Git tags

USAGE:
  edgit deploy set <component> <version> --to <env>      Deploy version to environment
  edgit deploy <component> <version> --to <env>          Deploy version to environment (shorthand)
  edgit deploy promote <component> --from <env> --to <env> Promote between environments
  edgit deploy status [component]                        Show deployment status
  edgit deploy list [environment]                        List deployments
  edgit deploy rollback <component> --env <env> [--to <version>] Rollback deployment

ENVIRONMENTS:
  Common environments: prod, staging, canary, latest, dev, test
  Custom environments are also supported

EXAMPLES:
  edgit deploy set extraction-prompt v1.0.0 --to prod    # Deploy v1.0.0 to production
  edgit deploy promote extraction-prompt --from staging --to prod # Promote staging to prod
  edgit deploy status                                     # Show all deployment status
  edgit deploy status extraction-prompt                   # Show deployment status for one component
  edgit deploy list prod                                  # List all components in production
  edgit deploy rollback extraction-prompt --env prod     # Rollback to previous version
  edgit deploy rollback extraction-prompt --env prod --to v1.0.0 # Rollback to specific version

DEPLOYMENT TAGS:
  Deployment tags are moveable Git tags that point to specific versions
  Format: components/<component>/<environment>
  Example: components/extraction-prompt/prod → points to a version SHA

NOTES:
  - Deployment tags are force-pushed (they can move)
  - Version tags are immutable (they never move)
  - Always push deployment tags with --force: git push origin <tag> --force
`;
    }
    /**
     * Show help for deploy command
     */
    async showHelp() {
        console.log(this.getHelp());
    }
}
//# sourceMappingURL=deploy.js.map