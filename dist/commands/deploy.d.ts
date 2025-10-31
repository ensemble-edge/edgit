import { Command } from './base.js';
/**
 * Deploy command for managing component deployments using Git tags
 * Moves deployment tags between environments and promotes components
 */
export declare class DeployCommand extends Command {
    private tagManager;
    constructor();
    execute(args: string[]): Promise<void>;
    /**
     * Deploy a specific version to an environment
     * Usage: edgit deploy set <component> <version> --to <env>
     *        edgit deploy <component> <version> --to <env>
     */
    deployComponent(args: string[]): Promise<void>;
    /**
     * Promote a component from one environment to another
     * Usage: edgit deploy promote <component> --from <source-env> --to <target-env>
     */
    promoteComponent(args: string[]): Promise<void>;
    /**
     * Show deployment status for all environments or specific component
     * Usage: edgit deploy status [component]
     */
    showDeploymentStatus(args: string[]): Promise<void>;
    /**
     * List all deployments across environments
     * Usage: edgit deploy list [environment]
     */
    listDeployments(args: string[]): Promise<void>;
    /**
     * Rollback a deployment to previous version
     * Usage: edgit deploy rollback <component> --env <environment> [--to <version>]
     */
    rollbackDeployment(args: string[]): Promise<void>;
    /**
     * Show deployment status for all components
     */
    private showAllDeploymentStatus;
    /**
     * Show deployment status for a specific component
     */
    private showComponentDeploymentStatus;
    /**
     * Show status for a specific environment
     */
    private showEnvironmentStatus;
    /**
     * Show deployment confirmation with the specific version that was deployed
     */
    private showSpecificDeployment;
    /**
     * List deployments for a specific environment
     */
    private listEnvironmentDeployments;
    /**
     * List all deployments across all environments
     */
    private listAllDeployments;
    /**
     * Load component registry
     */
    private loadRegistry;
    /**
     * Show help for deploy command
     */
    getHelp(): string;
    /**
     * Show help for deploy command
     */
    private showHelp;
}
//# sourceMappingURL=deploy.d.ts.map