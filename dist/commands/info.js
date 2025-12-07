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
import { log, colors } from '../utils/ui.js';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
// ─────────────────────────────────────────────────────────────────────────────
// Info Command
// ─────────────────────────────────────────────────────────────────────────────
export class InfoCommand extends Command {
    /**
     * Execute the info command
     */
    async execute(args) {
        if (this.shouldShowHelp(args)) {
            console.log(this.getHelp());
            return;
        }
        const isJson = args.includes('--json');
        const isCompact = args.includes('--compact');
        const status = await this.gatherStatus();
        if (isJson) {
            console.log(JSON.stringify(status, null, 2));
        }
        else if (isCompact) {
            this.displayCompact(status);
        }
        else {
            this.displayFull(status);
        }
    }
    /**
     * Gather all status information
     * This is the core logic that provides the single source of truth
     */
    async gatherStatus() {
        const gitRepo = this.isGitRepo();
        const initialized = this.isEdgitInitialized();
        const projectName = await this.getProjectName();
        // Early return for uninitialized state
        if (!initialized) {
            return {
                initialized: false,
                gitRepo,
                projectName,
                componentsCount: this.emptyComponentCounts(),
                components: [],
                deployments: [],
                recentVersions: [],
                untrackedCount: 0,
                stats: { totalVersions: 0, prodDeployments: 0, stagingDeployments: 0 },
                error: gitRepo ? 'Edgit not initialized' : 'Git repository required',
            };
        }
        const registry = await this.readRegistry();
        const componentsCount = this.countComponents(registry);
        const components = registry?.components || [];
        const deployments = this.getDeployments(registry);
        const recentVersions = gitRepo ? this.getRecentVersions(5) : [];
        const totalVersions = gitRepo ? this.countTotalVersions() : 0;
        const untrackedCount = await this.countUntrackedComponents(registry);
        // Calculate deployment stats
        const prodDeployments = deployments.filter((d) => d.prod).length;
        const stagingDeployments = deployments.filter((d) => d.staging).length;
        return {
            initialized,
            gitRepo,
            projectName,
            componentsCount,
            components,
            deployments,
            recentVersions,
            untrackedCount,
            stats: {
                totalVersions,
                prodDeployments,
                stagingDeployments,
            },
        };
    }
    // ─────────────────────────────────────────────────────────────────────────────
    // Data Gathering Methods
    // ─────────────────────────────────────────────────────────────────────────────
    /**
     * Check if edgit is initialized
     */
    isEdgitInitialized() {
        return existsSync('.edgit') || existsSync('.edgit/components.json');
    }
    /**
     * Check if we're in a git repo
     */
    isGitRepo() {
        return existsSync('.git');
    }
    /**
     * Get project name from package.json or directory
     */
    async getProjectName() {
        try {
            if (existsSync('package.json')) {
                const content = await fs.readFile('package.json', 'utf-8');
                const pkg = JSON.parse(content);
                if (pkg.name)
                    return pkg.name;
            }
        }
        catch {
            // Ignore
        }
        return path.basename(process.cwd());
    }
    /**
     * Read edgit registry
     */
    async readRegistry() {
        const registryPath = '.edgit/components.json';
        if (!existsSync(registryPath)) {
            return null;
        }
        try {
            const content = await fs.readFile(registryPath, 'utf-8');
            return JSON.parse(content);
        }
        catch {
            return null;
        }
    }
    /**
     * Create empty component counts
     */
    emptyComponentCounts() {
        return {
            total: 0,
            prompts: 0,
            schemas: 0,
            configs: 0,
            queries: 0,
            scripts: 0,
            templates: 0,
            docs: 0,
            agents: 0,
            ensembles: 0,
            tools: 0,
        };
    }
    /**
     * Count components by type
     */
    countComponents(registry) {
        const counts = this.emptyComponentCounts();
        if (!registry?.components) {
            return counts;
        }
        for (const component of registry.components) {
            counts.total++;
            switch (component.type) {
                case 'prompt':
                    counts.prompts++;
                    break;
                case 'schema':
                    counts.schemas++;
                    break;
                case 'config':
                    counts.configs++;
                    break;
                case 'query':
                    counts.queries++;
                    break;
                case 'script':
                    counts.scripts++;
                    break;
                case 'template':
                    counts.templates++;
                    break;
                case 'docs':
                    counts.docs++;
                    break;
                case 'agent':
                    counts.agents++;
                    break;
                case 'ensemble':
                    counts.ensembles++;
                    break;
                case 'tool':
                    counts.tools++;
                    break;
            }
        }
        return counts;
    }
    /**
     * Get deployment info from registry
     */
    getDeployments(registry) {
        const deployments = [];
        if (!registry?.deployments) {
            return deployments;
        }
        for (const [component, envs] of Object.entries(registry.deployments)) {
            const info = { component };
            const prod = envs.prod || envs.production;
            const staging = envs.staging;
            const dev = envs.dev || envs.development;
            if (prod)
                info.prod = prod;
            if (staging)
                info.staging = staging;
            if (dev)
                info.dev = dev;
            deployments.push(info);
        }
        return deployments;
    }
    /**
     * Get recent versions from git tags
     */
    getRecentVersions(limit = 5) {
        const versions = [];
        try {
            // Get edgit-style tags (prompts/name/v1.0.0, agents/name/v1.0.0, etc.)
            const output = execSync('git tag -l --sort=-creatordate "prompts/*" "schemas/*" "configs/*" "queries/*" "scripts/*" "templates/*" "agents/*" "ensembles/*" "tools/*" 2>/dev/null | head -20', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
            const tags = output.trim().split('\n').filter(Boolean);
            for (const tag of tags.slice(0, limit)) {
                // Parse tag format: type/name/version (e.g., prompts/extraction-prompt/v1.0.0)
                const parts = tag.split('/');
                if (parts.length >= 3) {
                    const type = parts[0]?.replace(/s$/, '') || ''; // prompts -> prompt
                    const name = parts[1] || '';
                    const version = parts.slice(2).join('/');
                    // Get tag date
                    let date;
                    try {
                        const dateOutput = execSync(`git log -1 --format=%ci "${tag}" 2>/dev/null`, {
                            encoding: 'utf-8',
                            stdio: ['pipe', 'pipe', 'pipe'],
                        });
                        date = dateOutput.trim().split(' ')[0]; // Just the date part
                    }
                    catch {
                        // Ignore
                    }
                    const versionInfo = { component: name, type, version };
                    if (date)
                        versionInfo.date = date;
                    versions.push(versionInfo);
                }
            }
        }
        catch {
            // Not a git repo or no tags
        }
        return versions;
    }
    /**
     * Count total versions from git tags
     */
    countTotalVersions() {
        try {
            const output = execSync('git tag -l "prompts/*" "schemas/*" "configs/*" "queries/*" "scripts/*" "templates/*" "agents/*" "ensembles/*" "tools/*" 2>/dev/null | wc -l', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
            return parseInt(output.trim(), 10) || 0;
        }
        catch {
            return 0;
        }
    }
    /**
     * Scan for potential untracked components
     */
    async countUntrackedComponents(registry) {
        const registeredPaths = new Set(registry?.components?.map((c) => c.path) || []);
        let untracked = 0;
        // Directories to scan
        const scanDirs = [
            { dir: 'prompts', ext: ['.md', '.txt'] },
            { dir: 'components/prompts', ext: ['.md', '.txt'] },
            { dir: 'schemas', ext: ['.json'] },
            { dir: 'components/schemas', ext: ['.json'] },
            { dir: 'configs', ext: ['.json', '.yaml', '.yml'] },
            { dir: 'components/configs', ext: ['.json', '.yaml', '.yml'] },
            { dir: 'queries', ext: ['.sql'] },
            { dir: 'components/queries', ext: ['.sql'] },
            { dir: 'scripts', ext: ['.ts', '.js'] },
            { dir: 'components/scripts', ext: ['.ts', '.js'] },
            { dir: 'templates', ext: ['.html', '.hbs', '.liquid'] },
            { dir: 'components/templates', ext: ['.html', '.hbs', '.liquid'] },
        ];
        for (const { dir, ext } of scanDirs) {
            if (!existsSync(dir))
                continue;
            try {
                const files = await fs.readdir(dir, { withFileTypes: true });
                for (const file of files) {
                    if (file.isFile() && ext.includes(path.extname(file.name))) {
                        const filePath = path.join(dir, file.name);
                        if (!registeredPaths.has(filePath)) {
                            untracked++;
                        }
                    }
                }
            }
            catch {
                // Ignore errors
            }
        }
        return untracked;
    }
    // ─────────────────────────────────────────────────────────────────────────────
    // Display Methods (for direct edgit CLI usage)
    // ─────────────────────────────────────────────────────────────────────────────
    /**
     * Display status in full mode
     */
    displayFull(status) {
        console.log('');
        console.log(colors.primaryBold('Edgit Status'));
        console.log(colors.dim('─'.repeat(50)));
        console.log('');
        // Project section
        console.log(colors.bold('Project'));
        console.log(`  Name:             ${colors.accent(status.projectName)}`);
        console.log(`  Git repository:   ${status.gitRepo ? colors.success('Yes') : colors.error('No')}`);
        console.log(`  Edgit initialized:${status.initialized ? colors.success('Yes') : colors.dim('No')}`);
        console.log('');
        if (!status.initialized) {
            if (!status.gitRepo) {
                log.warn('Edgit requires a Git repository. Run `git init` first.');
            }
            else {
                log.dim('Run `edgit init` to initialize Edgit in this repository.');
            }
            console.log('');
            return;
        }
        // Components section
        console.log(colors.bold('Components'));
        console.log(`  Total registered: ${status.componentsCount.total}`);
        if (status.componentsCount.total > 0) {
            const parts = [];
            if (status.componentsCount.prompts > 0)
                parts.push(`${status.componentsCount.prompts} prompts`);
            if (status.componentsCount.schemas > 0)
                parts.push(`${status.componentsCount.schemas} schemas`);
            if (status.componentsCount.configs > 0)
                parts.push(`${status.componentsCount.configs} configs`);
            if (status.componentsCount.agents > 0)
                parts.push(`${status.componentsCount.agents} agents`);
            if (status.componentsCount.ensembles > 0)
                parts.push(`${status.componentsCount.ensembles} ensembles`);
            if (status.componentsCount.tools > 0)
                parts.push(`${status.componentsCount.tools} tools`);
            const other = status.componentsCount.queries +
                status.componentsCount.scripts +
                status.componentsCount.templates +
                status.componentsCount.docs;
            if (other > 0)
                parts.push(`${other} other`);
            if (parts.length > 0) {
                console.log(`  Breakdown:        ${parts.join(', ')}`);
            }
        }
        if (status.untrackedCount > 0) {
            console.log(`  Untracked:        ${colors.warning(String(status.untrackedCount))} files`);
        }
        console.log('');
        // Versions section
        console.log(colors.bold('Versions'));
        console.log(`  Total tags:       ${status.stats.totalVersions}`);
        if (status.recentVersions.length > 0) {
            console.log(`  Recent:`);
            for (const v of status.recentVersions.slice(0, 3)) {
                const dateStr = v.date ? colors.dim(` (${v.date})`) : '';
                console.log(`    ${v.component} ${colors.accent(v.version)}${dateStr}`);
            }
        }
        console.log('');
        // Deployments section
        console.log(colors.bold('Deployments'));
        console.log(`  Production:       ${status.stats.prodDeployments > 0 ? colors.success(String(status.stats.prodDeployments)) + ' components' : colors.dim('None')}`);
        console.log(`  Staging:          ${status.stats.stagingDeployments > 0 ? colors.accent(String(status.stats.stagingDeployments)) + ' components' : colors.dim('None')}`);
        console.log('');
        log.dim('Docs: https://docs.ensemble.ai/edgit');
        console.log('');
    }
    /**
     * Display status in compact mode
     */
    displayCompact(status) {
        console.log('');
        console.log(colors.primaryBold('Edgit Status'));
        console.log('');
        console.log(`Project:     ${colors.accent(status.projectName)}`);
        console.log(`Git:         ${status.gitRepo ? colors.success('Yes') : colors.error('No')}`);
        console.log(`Initialized: ${status.initialized ? colors.success('Yes') : colors.dim('No')}`);
        if (status.initialized) {
            console.log(`Components:  ${status.componentsCount.total} total`);
            console.log(`Versions:    ${status.stats.totalVersions} tags`);
            if (status.stats.prodDeployments > 0 || status.stats.stagingDeployments > 0) {
                const parts = [];
                if (status.stats.prodDeployments > 0)
                    parts.push(`${status.stats.prodDeployments} prod`);
                if (status.stats.stagingDeployments > 0)
                    parts.push(`${status.stats.stagingDeployments} staging`);
                console.log(`Deployments: ${parts.join(' | ')}`);
            }
            if (status.untrackedCount > 0) {
                console.log(`Untracked:   ${colors.warning(String(status.untrackedCount))} files`);
            }
        }
        console.log('');
    }
    /**
     * Get help text
     */
    getHelp() {
        return `
${colors.bold('USAGE:')}
  edgit status [options]

${colors.bold('OPTIONS:')}
  --json              Output as JSON (for programmatic access)
  --compact           Compact single-line format
  --help, -h          Show this help message

${colors.bold('DESCRIPTION:')}
  Shows the current status of your Edgit-managed repository including:
  - Git and Edgit initialization state
  - Component counts by type
  - Recent version tags
  - Deployment status across environments
  - Untracked component detection

${colors.bold('EXAMPLES:')}
  ${colors.accent('edgit status')}              # Full status display
  ${colors.accent('edgit status --compact')}    # Compact format
  ${colors.accent('edgit status --json')}       # JSON output for scripts

${colors.bold('JSON OUTPUT:')}
  The --json flag outputs a structured object that can be consumed by
  other tools. This is the authoritative data source that ensemble CLI
  uses for its pretty-formatted status display.
`;
    }
}
//# sourceMappingURL=info.js.map