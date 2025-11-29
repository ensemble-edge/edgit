/**
 * CHANGELOG.md management utility following Keep a Changelog standard
 * Automatically updates changelog with component version changes
 */
import * as fs from 'fs/promises';
import * as path from 'path';
/**
 * Manages CHANGELOG.md following Keep a Changelog format
 */
export class ChangelogManager {
    filePath;
    constructor(repoRoot) {
        this.filePath = path.join(repoRoot, 'CHANGELOG.md');
    }
    /**
     * Update changelog with component version changes
     */
    async updateChangelog(versionChanges, commitMessage, aiGeneratedEntries) {
        if (versionChanges.length === 0)
            return;
        try {
            const existingContent = await this.readExistingChangelog();
            const newEntry = this.createChangelogEntry(versionChanges, commitMessage, aiGeneratedEntries);
            const updatedContent = this.insertNewEntry(existingContent, newEntry);
            await fs.writeFile(this.filePath, updatedContent, 'utf8');
            console.log(`📝 Updated CHANGELOG.md with ${versionChanges.length} component changes`);
        }
        catch (error) {
            console.warn(`⚠️  Warning: Could not update CHANGELOG.md: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Read existing changelog or create template
     */
    async readExistingChangelog() {
        try {
            return await fs.readFile(this.filePath, 'utf8');
        }
        catch (error) {
            // Check for ENOENT (file not found) error
            if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
                // Create new changelog with standard template
                return this.createChangelogTemplate();
            }
            throw error;
        }
    }
    /**
     * Create a new changelog entry from component changes
     */
    createChangelogEntry(versionChanges, commitMessage, aiGeneratedEntries) {
        const today = new Date().toISOString().split('T')[0]; // Will always return a string
        const changes = {
            added: [],
            changed: [],
            deprecated: [],
            removed: [],
            fixed: [],
            security: [],
        };
        for (const change of versionChanges) {
            const description = this.createChangeDescription(change, aiGeneratedEntries);
            switch (change.action) {
                case 'created':
                    changes.added.push(description);
                    break;
                case 'updated':
                    if (this.isFixCommit(commitMessage || change.message)) {
                        changes.fixed.push(description);
                    }
                    else {
                        changes.changed.push(description);
                    }
                    break;
                case 'renamed':
                    changes.changed.push(description);
                    break;
                case 'deleted':
                    changes.removed.push(description);
                    break;
            }
        }
        // Determine overall version from highest component version bump
        const version = this.determineReleaseVersion(versionChanges);
        return {
            version,
            date: today,
            changes,
        };
    }
    /**
     * Create description for a component change
     */
    createChangeDescription(change, aiGeneratedEntries) {
        // Use AI-generated description if available
        const aiDescription = aiGeneratedEntries?.get(change.name);
        if (aiDescription) {
            return `${change.name} (${change.type}): ${aiDescription} [${change.oldVersion} → ${change.newVersion}]`;
        }
        // Use commit message if available
        if (change.message) {
            return `${change.name} (${change.type}): ${change.message} [${change.oldVersion} → ${change.newVersion}]`;
        }
        // Fallback to standard format
        const actionDescription = this.getActionDescription(change.action);
        return `${change.name} (${change.type}): ${actionDescription} [${change.oldVersion} → ${change.newVersion}]`;
    }
    getActionDescription(action) {
        switch (action) {
            case 'created':
                return 'Added new component';
            case 'updated':
                return 'Updated component';
            case 'renamed':
                return 'Renamed component';
            case 'deleted':
                return 'Removed component';
            default:
                return 'Modified component';
        }
    }
    /**
     * Determine if commit is a fix based on message
     */
    isFixCommit(message) {
        if (!message)
            return false;
        const fixKeywords = ['fix:', 'bugfix:', 'patch:', 'hotfix:', 'correct:'];
        return fixKeywords.some((keyword) => message.toLowerCase().includes(keyword));
    }
    /**
     * Determine release version from component changes
     */
    determineReleaseVersion(versionChanges) {
        // For now, use current date as version (YYYY.MM.DD format)
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}.${month}.${day}`;
    }
    /**
     * Insert new entry at the top of existing changelog
     */
    insertNewEntry(existingContent, entry) {
        const entryMarkdown = this.formatChangelogEntry(entry);
        if (existingContent.includes('## [Unreleased]')) {
            // Insert after unreleased section
            return existingContent.replace(/## \[Unreleased\][\s\S]*?(?=## \[|\n*$)/, `## [Unreleased]\n\n${entryMarkdown}`);
        }
        else if (existingContent.includes('# Changelog')) {
            // Insert after main heading
            return existingContent.replace(/(# Changelog[\s\S]*?\n\n)/, `$1${entryMarkdown}`);
        }
        else {
            // Prepend to existing content
            return `${entryMarkdown}\n${existingContent}`;
        }
    }
    /**
     * Format changelog entry as Markdown
     */
    formatChangelogEntry(entry) {
        let markdown = `## [${entry.version}] - ${entry.date}\n\n`;
        const sections = [
            { key: 'added', title: 'Added' },
            { key: 'changed', title: 'Changed' },
            { key: 'deprecated', title: 'Deprecated' },
            { key: 'removed', title: 'Removed' },
            { key: 'fixed', title: 'Fixed' },
            { key: 'security', title: 'Security' },
        ];
        for (const section of sections) {
            const items = entry.changes[section.key];
            if (items.length > 0) {
                markdown += `### ${section.title}\n\n`;
                for (const item of items) {
                    markdown += `- ${item}\n`;
                }
                markdown += '\n';
            }
        }
        return markdown;
    }
    /**
     * Create standard changelog template
     */
    createChangelogTemplate() {
        return `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

`;
    }
    /**
     * Check if changelog exists
     */
    async exists() {
        try {
            await fs.access(this.filePath);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Get changelog file path
     */
    getFilePath() {
        return this.filePath;
    }
}
/**
 * Create changelog manager for current repository
 */
export async function createChangelogManager(repoRoot) {
    return new ChangelogManager(repoRoot);
}
//# sourceMappingURL=changelog.js.map