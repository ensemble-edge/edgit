import * as fs from 'fs/promises';
import * as path from 'path';
/**
 * Registry loader class - eliminates duplication across 4+ command files
 * Handles loading and saving component registry with proper error handling
 */
export class RegistryLoader {
    repoRoot;
    edgitDir;
    constructor(repoRoot, edgitDir = '.edgit') {
        this.repoRoot = repoRoot;
        this.edgitDir = edgitDir;
    }
    /**
     * Load component registry from disk
     * Returns Result type for explicit error handling
     */
    async load() {
        try {
            const registryPath = path.join(this.repoRoot, this.edgitDir, 'components.json');
            const content = await fs.readFile(registryPath, 'utf8');
            const registry = JSON.parse(content);
            return { ok: true, value: registry };
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return {
                    ok: false,
                    error: {
                        kind: 'not_initialized',
                        message: 'Edgit not initialized. Run "edgit init" first.',
                    },
                };
            }
            return {
                ok: false,
                error: {
                    kind: 'parse_error',
                    message: `Failed to load registry: ${error.message}`,
                    cause: error,
                },
            };
        }
    }
    /**
     * Save component registry to disk
     * Creates directory if needed
     */
    async save(registry) {
        try {
            const registryPath = path.join(this.repoRoot, this.edgitDir, 'components.json');
            await fs.mkdir(path.dirname(registryPath), { recursive: true });
            const content = JSON.stringify(registry, null, 2);
            await fs.writeFile(registryPath, content, 'utf8');
            return { ok: true, value: undefined };
        }
        catch (error) {
            return {
                ok: false,
                error: {
                    kind: 'write_error',
                    message: `Failed to save registry: ${error.message}`,
                    cause: error,
                },
            };
        }
    }
    /**
     * Get full path to registry file
     */
    getRegistryPath() {
        return path.join(this.repoRoot, this.edgitDir, 'components.json');
    }
}
/**
 * Factory function for creating registry loaders
 * Makes dependency injection easy for testing
 */
export const createRegistryLoader = (repoRoot) => new RegistryLoader(repoRoot);
//# sourceMappingURL=registry.js.map