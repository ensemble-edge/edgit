import { Command } from './base.js';
import { ComponentUtils } from '../models/components.js';
import * as fs from 'fs/promises';
/**
 * History command for component version history with Git integration
 */
export class HistoryCommand extends Command {
    async execute(args) {
        await this.validateGitRepo();
        await this.validateGitInstalled();
        const parsed = this.parseArgs(args);
        const options = this.extractHistoryOptions(parsed);
        const registry = await this.loadComponentsRegistry();
        if (options.component) {
            await this.showSingleComponentHistory(registry, options.component, options);
        }
        else {
            await this.showAllComponentsHistory(registry, options);
        }
    }
    getHelp() {
        return `
Usage: edgit history [component] [options]

Show version history for components with Git integration.

Arguments:
  [component]             Show history for specific component

Options:
  -n, --limit <number>    Limit number of versions shown (default: 20)
  --since <date>          Show versions since date (git format)
  --with-tags             Show tag information
  --git-log               Include full Git log details
  -o, --output <format>   Output format: table (default), json, compact

Examples:
  edgit history                           # Show recent history for all components
  edgit history extraction-prompt         # Show history for specific component
  edgit history --limit 10 --with-tags   # Last 10 versions with tags
  edgit history --since "1 month ago"    # Recent changes
  edgit history --git-log                # Include Git commit details
    `.trim();
    }
    extractHistoryOptions(parsed) {
        return {
            component: parsed.positional[0],
            limit: parsed.options.limit ? parseInt(parsed.options.limit) : 20,
            since: parsed.options.since,
            format: parsed.options.output || 'table',
            withTags: parsed.flags['with-tags'],
            gitLog: parsed.flags['git-log']
        };
    }
    async loadComponentsRegistry() {
        try {
            const content = await fs.readFile('.edgit/components.json', 'utf8');
            return JSON.parse(content);
        }
        catch {
            throw new Error('No components registry found. Run "edgit setup" first.');
        }
    }
    async showSingleComponentHistory(registry, componentName, options) {
        const component = ComponentUtils.findComponentByName(registry, componentName);
        if (!component) {
            this.showError(`Component "${componentName}" not found.`);
            return;
        }
        const history = await this.buildComponentHistory(component, options);
        await this.outputHistory([history], options);
    }
    async showAllComponentsHistory(registry, options) {
        const histories = [];
        for (const [name, component] of Object.entries(registry.components)) {
            const history = await this.buildComponentHistory(component, options);
            if (history.versions.length > 0) {
                histories.push(history);
            }
        }
        await this.outputHistory(histories, options);
    }
    async buildComponentHistory(component, options) {
        let versions = [...component.versionHistory];
        // Sort by timestamp (newest first)
        versions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        // Apply date filter
        if (options.since) {
            const sinceDate = await this.parseGitDate(options.since);
            versions = versions.filter(v => new Date(v.timestamp) >= sinceDate);
        }
        // Apply limit
        if (options.limit) {
            versions = versions.slice(0, options.limit);
        }
        // Enhance with Git data if requested
        const enhancedVersions = await Promise.all(versions.map(async (version) => {
            const tags = this.getTagsForVersion(component, version.version);
            const isCurrent = version.version === component.version;
            let changes;
            if (options.gitLog) {
                changes = await this.getCommitChanges(version.commit, component.path);
            }
            // Get commit message from Git if not stored
            let message = version.message;
            if (!message && options.gitLog) {
                message = await this.getCommitMessage(version.commit);
            }
            return {
                version: version.version,
                commit: version.commit,
                timestamp: version.timestamp,
                message,
                tags,
                isCurrent,
                changes
            };
        }));
        return {
            component: component.name,
            type: component.type,
            versions: enhancedVersions
        };
    }
    getTagsForVersion(component, version) {
        const tags = [];
        // Add user-defined tags
        if (component.tags) {
            const userTags = Object.entries(component.tags)
                .filter(([tag, tagVersion]) => tagVersion === version)
                .map(([tag]) => tag);
            tags.push(...userTags);
        }
        // Add automatic "latest" tag for current version
        if (version === component.version) {
            tags.push('latest');
        }
        return tags;
    }
    async parseGitDate(dateStr) {
        try {
            // Use git to parse the date
            const result = await this.git.exec(['log', '--date=iso', '--format=%cd', '--since=' + dateStr, '-1']);
            if (result.stdout.trim()) {
                return new Date(result.stdout.trim());
            }
        }
        catch {
            // Fallback to JS date parsing
        }
        return new Date(dateStr);
    }
    async getCommitMessage(commit) {
        try {
            const result = await this.git.exec(['log', '--format=%s', '-1', commit]);
            return result.stdout.trim();
        }
        catch {
            return 'No message';
        }
    }
    async getCommitChanges(commit, filePath) {
        try {
            const result = await this.git.exec(['show', '--stat', '--format=', commit, '--', filePath]);
            const lines = result.stdout.split('\n');
            // Parse stat line (e.g., "1 file changed, 5 insertions(+), 2 deletions(-)")
            const statLine = lines.find(line => line.includes('file changed') || line.includes('files changed'));
            if (statLine) {
                const added = (statLine.match(/(\d+) insertion/) || [0, 0])[1];
                const removed = (statLine.match(/(\d+) deletion/) || [0, 0])[1];
                return {
                    added: parseInt(added) || 0,
                    removed: parseInt(removed) || 0,
                    files: [filePath]
                };
            }
        }
        catch {
            // Ignore errors
        }
        return null;
    }
    async outputHistory(histories, options) {
        if (options.format === 'json') {
            console.log(JSON.stringify(histories, null, 2));
            return;
        }
        if (histories.length === 0) {
            console.log('No version history found.');
            return;
        }
        if (options.format === 'compact') {
            for (const history of histories) {
                console.log(`\n📦 ${history.component} (${history.type})`);
                for (const version of history.versions) {
                    const current = version.isCurrent ? ' (current)' : '';
                    const tags = version.tags.length > 0 ? ` [${version.tags.join(', ')}]` : '';
                    const changes = version.changes ? ` (+${version.changes.added}/-${version.changes.removed})` : '';
                    console.log(`   ${version.version}${current}${tags}${changes} • ${version.commit.slice(0, 8)} • ${version.message || 'No message'}`);
                }
            }
            return;
        }
        // Table format (default)
        for (const history of histories) {
            console.log(`\n📦 ${history.component} (${history.type})`);
            console.log('─'.repeat(60));
            console.log('Version'.padEnd(12) + 'Date'.padEnd(12) + 'Commit'.padEnd(10) + 'Tags'.padEnd(15) + 'Message');
            console.log('─'.repeat(60));
            for (const version of history.versions) {
                const versionStr = version.isCurrent ? `${version.version} *` : version.version;
                const dateStr = new Date(version.timestamp).toLocaleDateString();
                const commitStr = version.commit.slice(0, 8);
                const tagsStr = version.tags.join(', ');
                const messageStr = (version.message || 'No message').slice(0, 30);
                console.log(versionStr.padEnd(12) +
                    dateStr.padEnd(12) +
                    commitStr.padEnd(10) +
                    tagsStr.padEnd(15) +
                    messageStr);
                if (version.changes && options.gitLog) {
                    console.log(`${''.padEnd(12)}${''.padEnd(12)}${''.padEnd(10)}${''.padEnd(15)}+${version.changes.added}/-${version.changes.removed} lines`);
                }
            }
            if (options.withTags && history.versions.some(v => v.tags.length > 0)) {
                console.log('\nTags:');
                for (const version of history.versions) {
                    if (version.tags.length > 0) {
                        console.log(`  ${version.tags.join(', ')} → ${version.version}`);
                    }
                }
            }
        }
        console.log('\n💡 Use "edgit checkout <component>@<version>" to restore any version');
        console.log('💡 Use "edgit components tag <component> <tag> <version>" to tag versions');
    }
}
//# sourceMappingURL=history-old.js.map