/**
 * Info Command - Show project info and component counts
 *
 * This is the authoritative source for Edgit project statistics.
 * Ensemble CLI calls this via `npx edgit info --json`
 *
 * Why "info" instead of "status"?
 * - "edgit status" passes through to "git status" (with component info)
 * - "edgit info" is edgit-specific project information
 * - Consistent naming with Conductor CLI
 * - Ensemble CLI uses "status" as a user-friendly alias for "info"
 *
 * Architecture:
 * - This command provides the single source of truth for status data
 * - Returns structured JSON for programmatic access
 * - Ensemble CLI consumes this and adds pretty visual formatting
 *
 * Features:
 * - Counts components by type
 * - Shows recent version tags
 * - Shows deployment status across environments
 * - Detects untracked components
 * - Supports --json output for automation
 */
import { Command } from './base.js';
interface EdgitComponent {
    name: string;
    type: string;
    path: string;
    description?: string;
}
interface ComponentCounts {
    total: number;
    prompts: number;
    schemas: number;
    configs: number;
    queries: number;
    scripts: number;
    templates: number;
    docs: number;
    agents: number;
    ensembles: number;
    tools: number;
}
interface VersionInfo {
    component: string;
    type: string;
    version: string;
    date?: string;
}
interface DeploymentInfo {
    component: string;
    prod?: string;
    staging?: string;
    dev?: string;
}
interface EdgitStats {
    totalVersions: number;
    prodDeployments: number;
    stagingDeployments: number;
}
/**
 * Status output structure - the authoritative data model
 * Ensemble CLI mirrors this type to consume the JSON output
 */
export interface EdgitStatusOutput {
    initialized: boolean;
    gitRepo: boolean;
    projectName: string;
    componentsCount: ComponentCounts;
    components: EdgitComponent[];
    deployments: DeploymentInfo[];
    recentVersions: VersionInfo[];
    untrackedCount: number;
    stats: EdgitStats;
    error?: string;
}
export declare class InfoCommand extends Command {
    /**
     * Execute the info command
     */
    execute(args: string[]): Promise<void>;
    /**
     * Gather all status information
     * This is the core logic that provides the single source of truth
     */
    private gatherStatus;
    /**
     * Check if edgit is initialized
     */
    private isEdgitInitialized;
    /**
     * Check if we're in a git repo
     */
    private isGitRepo;
    /**
     * Get project name from package.json or directory
     */
    private getProjectName;
    /**
     * Read edgit registry
     */
    private readRegistry;
    /**
     * Create empty component counts
     */
    private emptyComponentCounts;
    /**
     * Count components by type
     */
    private countComponents;
    /**
     * Get deployment info from registry
     */
    private getDeployments;
    /**
     * Get recent versions from git tags
     */
    private getRecentVersions;
    /**
     * Count total versions from git tags
     */
    private countTotalVersions;
    /**
     * Scan for potential untracked components
     */
    private countUntrackedComponents;
    /**
     * Display status in full mode
     */
    private displayFull;
    /**
     * Display status in compact mode
     */
    private displayCompact;
    /**
     * Get help text
     */
    getHelp(): string;
}
export {};
//# sourceMappingURL=info.d.ts.map