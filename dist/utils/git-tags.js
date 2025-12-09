/**
 * Git Tag Manager for Edgit component versioning
 *
 * Implements the 4-level tag hierarchy:
 *   {prefix}/{type}/{name}/{slot}
 *
 * Where:
 * - prefix: 'components' or 'logic'
 * - type: prompts, agents, schemas, ensembles, etc.
 * - name: component name (e.g., extraction, classifier)
 * - slot: version (v1.0.0) or environment (main, staging, production)
 *
 * Philosophy: Edgit is a thin git wrapper. It creates and manages git tags.
 * It doesn't deploy, doesn't sync to KV, doesn't communicate with Cloudflare.
 * GitHub Actions handles everything after `git push`.
 */
export class GitTagManager {
    git;
    constructor(git) {
        this.git = git;
    }
    // ============================================================================
    // Tag Format Utilities
    // ============================================================================
    /**
     * Get namespace (pluralized type name) for entity type
     */
    getNamespace(entityType) {
        switch (entityType) {
            case 'agent':
                return 'agents';
            case 'query':
                return 'queries';
            default:
                return `${entityType}s`;
        }
    }
    /**
     * Check if a slot is a version (semver format)
     */
    isVersionSlot(slot) {
        return /^v\d+\.\d+\.\d+(-[\w.]+)?$/.test(slot);
    }
    /**
     * Check if a slot is an environment (not a version)
     */
    isEnvironmentSlot(slot) {
        return !this.isVersionSlot(slot);
    }
    /**
     * Get slot type from slot string
     */
    getSlotType(slot) {
        return this.isVersionSlot(slot) ? 'version' : 'environment';
    }
    /**
     * Build a 4-level tag path
     * Format: {prefix}/{type}/{name}/{slot}
     */
    buildTagPath(prefix, entityType, name, slot) {
        const namespace = this.getNamespace(entityType);
        return `${prefix}/${namespace}/${name}/${slot}`;
    }
    /**
     * Parse a 4-level tag path
     * Returns null if format is invalid
     */
    parseTagPath(tag) {
        const parts = tag.split('/');
        if (parts.length !== 4)
            return null;
        const [prefix, type, name, slot] = parts;
        if (prefix !== 'components' && prefix !== 'logic')
            return null;
        if (!type || !name || !slot)
            return null;
        return {
            prefix: prefix,
            type,
            name,
            slot,
            slotType: this.getSlotType(slot),
            fullTag: tag,
        };
    }
    // ============================================================================
    // Core Tag Operations
    // ============================================================================
    /**
     * Create an immutable version tag
     * Version tags cannot be overwritten
     */
    async createVersionTag(prefix, entityType, name, version, sha, message) {
        if (!this.isVersionSlot(version)) {
            throw new Error(`Invalid semver version: ${version}. Use format: v1.0.0`);
        }
        const gitTag = this.buildTagPath(prefix, entityType, name, version);
        const exists = await this.tagExistsByPath(gitTag);
        if (exists) {
            throw new Error(`Tag already exists: ${gitTag}. Version tags are immutable.`);
        }
        const target = sha || 'HEAD';
        const tagMessage = message || `Release ${entityType} ${name} ${version}`;
        const result = await this.git.exec(['tag', '-a', gitTag, target, '-m', tagMessage]);
        if (result.exitCode !== 0) {
            throw new Error(`Failed to create tag ${gitTag}: ${result.stderr}`);
        }
        return gitTag;
    }
    /**
     * Create or move an environment tag
     * Environment tags are mutable and can be moved with force
     */
    async setEnvironmentTag(prefix, entityType, name, env, targetRef = 'HEAD', message) {
        if (this.isVersionSlot(env)) {
            throw new Error(`"${env}" looks like a version. Use 'createVersionTag' for version tags.`);
        }
        const gitTag = this.buildTagPath(prefix, entityType, name, env);
        const targetSHA = await this.resolveRefToSHA(targetRef);
        const tagMessage = message || `Set ${entityType} ${name} to ${env}`;
        // Delete existing local tag if present
        await this.git.exec(['tag', '-d', gitTag]).catch(() => { });
        const result = await this.git.exec(['tag', '-a', gitTag, targetSHA, '-m', tagMessage]);
        if (result.exitCode !== 0) {
            throw new Error(`Failed to set environment tag ${gitTag}: ${result.stderr}`);
        }
        return gitTag;
    }
    /**
     * Delete a tag (local only)
     */
    async deleteTag(prefix, entityType, name, slot) {
        const gitTag = this.buildTagPath(prefix, entityType, name, slot);
        const result = await this.git.exec(['tag', '-d', gitTag]);
        if (result.exitCode !== 0) {
            throw new Error(`Failed to delete tag ${gitTag}: ${result.stderr}`);
        }
    }
    /**
     * List all tags matching the 4-level pattern
     */
    async listTags(prefix, entityType, name) {
        let pattern;
        if (prefix && entityType && name) {
            const namespace = this.getNamespace(entityType);
            pattern = `${prefix}/${namespace}/${name}/*`;
        }
        else if (prefix && entityType) {
            const namespace = this.getNamespace(entityType);
            pattern = `${prefix}/${namespace}/*/*`;
        }
        else if (prefix) {
            pattern = `${prefix}/*/*/*`;
        }
        else {
            pattern = '{components,logic}/*/*/*';
        }
        const result = await this.git.exec([
            'for-each-ref',
            '--format=%(refname:short)|%(if)%(*objectname)%(then)%(*objectname)%(else)%(objectname)%(end)|%(creatordate:iso)|%(contents:subject)|%(authorname)',
            `refs/tags/${pattern}`,
        ]);
        if (result.exitCode !== 0 || !result.stdout.trim()) {
            return [];
        }
        return result.stdout
            .trim()
            .split('\n')
            .map((line) => {
            const [fullTag, sha, date, message, author] = line.split('|');
            const parsed = this.parseTagPath(fullTag || '');
            if (!parsed)
                return null;
            return {
                ...parsed,
                tag: parsed.slot,
                sha: sha || '',
                date: date || '',
                message: message || '',
                author: author || '',
            };
        })
            .filter((info) => info !== null);
    }
    /**
     * Get tag info by full path
     */
    async getTagInfo(gitTag) {
        const result = await this.git.exec([
            'for-each-ref',
            '--format=%(if)%(*objectname)%(then)%(*objectname)%(else)%(objectname)%(end)|%(creatordate:iso)|%(contents:subject)|%(authorname)',
            `refs/tags/${gitTag}`,
        ]);
        if (result.exitCode !== 0 || !result.stdout.trim()) {
            throw new Error(`Tag not found: ${gitTag}`);
        }
        const parts = result.stdout.trim().split('|');
        const [sha, date, message, author] = parts;
        const tagName = gitTag.split('/').pop() || gitTag;
        return {
            tag: tagName,
            sha: sha || '',
            date: date || '',
            message: message || '',
            author: author || '',
        };
    }
    /**
     * Check if a tag exists by full path
     */
    async tagExistsByPath(gitTag) {
        const result = await this.git.exec(['tag', '-l', gitTag]);
        return result.stdout.trim() === gitTag;
    }
    /**
     * Check if a tag exists
     */
    async tagExists(prefix, entityType, name, slot) {
        const gitTag = this.buildTagPath(prefix, entityType, name, slot);
        return this.tagExistsByPath(gitTag);
    }
    /**
     * Resolve any ref (SHA, tag, branch) to a SHA
     */
    async resolveRefToSHA(ref) {
        const result = await this.git.exec(['rev-parse', '--verify', ref]);
        if (result.exitCode !== 0) {
            throw new Error(`Invalid ref: ${ref}. Not a valid commit, branch, or tag.`);
        }
        return result.stdout.trim();
    }
    /**
     * Get SHA that a tag points to
     */
    async getTagSHA(prefix, entityType, name, slot) {
        const gitTag = this.buildTagPath(prefix, entityType, name, slot);
        const result = await this.git.exec(['rev-list', '-n', '1', gitTag]);
        if (result.exitCode !== 0) {
            throw new Error(`Tag not found: ${gitTag}`);
        }
        return result.stdout.trim();
    }
    /**
     * Get file content at a specific tag
     */
    async getFileAtTag(prefix, entityType, name, slot, filePath) {
        const sha = await this.getTagSHA(prefix, entityType, name, slot);
        const result = await this.git.exec(['show', `${sha}:${filePath}`]);
        if (result.exitCode !== 0) {
            throw new Error(`File not found: ${filePath} at ${name}@${slot}`);
        }
        return result.stdout;
    }
    /**
     * Get all version tags for a component (sorted by semver)
     */
    async getVersionTags(prefix, entityType, name) {
        const tags = await this.listTags(prefix, entityType, name);
        return tags
            .filter((t) => t.slotType === 'version')
            .sort((a, b) => {
            const aVersion = a.slot
                .replace(/^v/, '')
                .split('.')
                .map((n) => parseInt(n, 10));
            const bVersion = b.slot
                .replace(/^v/, '')
                .split('.')
                .map((n) => parseInt(n, 10));
            for (let i = 0; i < Math.min(aVersion.length, bVersion.length); i++) {
                const aNum = aVersion[i] ?? 0;
                const bNum = bVersion[i] ?? 0;
                if (aNum !== bNum) {
                    return aNum - bNum;
                }
            }
            return aVersion.length - bVersion.length;
        });
    }
    /**
     * Get all environment tags for a component
     */
    async getEnvironmentTags(prefix, entityType, name) {
        const tags = await this.listTags(prefix, entityType, name);
        return tags.filter((t) => t.slotType === 'environment');
    }
}
export class GitTagManagerResult {
    manager;
    constructor(git) {
        this.manager = new GitTagManager(git);
    }
    async createVersionTag(prefix, entityType, name, version, sha, message) {
        try {
            const gitTag = await this.manager.createVersionTag(prefix, entityType, name, version, sha, message);
            return { ok: true, value: gitTag };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('already exists')) {
                return { ok: false, error: { kind: 'tag_exists', tag: version, message: errorMessage } };
            }
            if (errorMessage.includes('Invalid semver')) {
                return { ok: false, error: { kind: 'invalid_version', version, message: errorMessage } };
            }
            return { ok: false, error: { kind: 'git_error', message: errorMessage } };
        }
    }
    async setEnvironmentTag(prefix, entityType, name, env, targetRef = 'HEAD', message) {
        try {
            const gitTag = await this.manager.setEnvironmentTag(prefix, entityType, name, env, targetRef, message);
            return { ok: true, value: gitTag };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('looks like a version')) {
                return {
                    ok: false,
                    error: { kind: 'invalid_version', version: env, message: errorMessage },
                };
            }
            if (errorMessage.includes('Invalid ref')) {
                return { ok: false, error: { kind: 'invalid_ref', ref: targetRef, message: errorMessage } };
            }
            return { ok: false, error: { kind: 'git_error', message: errorMessage } };
        }
    }
    async deleteTag(prefix, entityType, name, slot) {
        try {
            await this.manager.deleteTag(prefix, entityType, name, slot);
            return { ok: true, value: undefined };
        }
        catch (error) {
            return {
                ok: false,
                error: {
                    kind: 'tag_not_found',
                    tag: slot,
                    message: error instanceof Error ? error.message : String(error),
                },
            };
        }
    }
    async getTagSHA(prefix, entityType, name, slot) {
        try {
            const sha = await this.manager.getTagSHA(prefix, entityType, name, slot);
            return { ok: true, value: sha };
        }
        catch (error) {
            return {
                ok: false,
                error: {
                    kind: 'tag_not_found',
                    tag: slot,
                    message: error instanceof Error ? error.message : String(error),
                },
            };
        }
    }
    async getTagInfo(gitTag) {
        try {
            const info = await this.manager.getTagInfo(gitTag);
            return { ok: true, value: info };
        }
        catch (error) {
            return {
                ok: false,
                error: {
                    kind: 'tag_not_found',
                    tag: gitTag,
                    message: error instanceof Error ? error.message : String(error),
                },
            };
        }
    }
    async resolveRefToSHA(ref) {
        try {
            const sha = await this.manager.resolveRefToSHA(ref);
            return { ok: true, value: sha };
        }
        catch (error) {
            return {
                ok: false,
                error: {
                    kind: 'invalid_ref',
                    ref,
                    message: error instanceof Error ? error.message : String(error),
                },
            };
        }
    }
    async getFileAtTag(prefix, entityType, name, slot, filePath) {
        try {
            const content = await this.manager.getFileAtTag(prefix, entityType, name, slot, filePath);
            return { ok: true, value: content };
        }
        catch (error) {
            return {
                ok: false,
                error: {
                    kind: 'file_not_found',
                    path: filePath,
                    tag: slot,
                    message: error instanceof Error ? error.message : String(error),
                },
            };
        }
    }
    get underlying() {
        return this.manager;
    }
    // Passthrough methods
    listTags = (prefix, entityType, name) => this.manager.listTags(prefix, entityType, name);
    tagExists = (prefix, entityType, name, slot) => this.manager.tagExists(prefix, entityType, name, slot);
    getVersionTags = (prefix, entityType, name) => this.manager.getVersionTags(prefix, entityType, name);
    getEnvironmentTags = (prefix, entityType, name) => this.manager.getEnvironmentTags(prefix, entityType, name);
    isVersionSlot = (slot) => this.manager.isVersionSlot(slot);
    isEnvironmentSlot = (slot) => this.manager.isEnvironmentSlot(slot);
    getSlotType = (slot) => this.manager.getSlotType(slot);
    buildTagPath = (prefix, entityType, name, slot) => this.manager.buildTagPath(prefix, entityType, name, slot);
    parseTagPath = (tag) => this.manager.parseTagPath(tag);
    getNamespace = (entityType) => this.manager.getNamespace(entityType);
}
export function createGitTagManager(git) {
    return new GitTagManager(git);
}
export function createGitTagManagerWithResult(git) {
    return new GitTagManagerResult(git);
}
//# sourceMappingURL=git-tags.js.map