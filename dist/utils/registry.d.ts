import type { ComponentRegistry } from '../models/components.js';
import type { Result } from '../types/result.js';
/**
 * Registry-specific error types
 */
export type RegistryError = {
    kind: 'not_initialized';
    message: string;
} | {
    kind: 'parse_error';
    message: string;
    cause?: Error;
} | {
    kind: 'not_in_repo';
    message: string;
} | {
    kind: 'write_error';
    message: string;
    cause?: Error;
};
/**
 * Registry loader class - eliminates duplication across 4+ command files
 * Handles loading and saving component registry with proper error handling
 */
export declare class RegistryLoader {
    private repoRoot;
    private edgitDir;
    constructor(repoRoot: string, edgitDir?: string);
    /**
     * Load component registry from disk
     * Returns Result type for explicit error handling
     */
    load(): Promise<Result<ComponentRegistry, RegistryError>>;
    /**
     * Save component registry to disk
     * Creates directory if needed
     */
    save(registry: ComponentRegistry): Promise<Result<void, RegistryError>>;
    /**
     * Get full path to registry file
     */
    getRegistryPath(): string;
}
/**
 * Factory function for creating registry loaders
 * Makes dependency injection easy for testing
 */
export declare const createRegistryLoader: (repoRoot: string) => RegistryLoader;
//# sourceMappingURL=registry.d.ts.map