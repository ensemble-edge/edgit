/**
 * EdgitError - Typed error class for Edgit CLI
 *
 * Replaces process.exit(1) calls with throwable errors,
 * enabling proper testing and error recovery.
 */
/**
 * Error codes for categorizing Edgit errors
 */
export type EdgitErrorCode = 'COMPONENT_NOT_FOUND' | 'COMPONENT_EXISTS' | 'INVALID_COMPONENT' | 'INVALID_VERSION' | 'INVALID_REFERENCE' | 'TAG_EXISTS' | 'TAG_NOT_FOUND' | 'DEPLOYMENT_NOT_FOUND' | 'GIT_ERROR' | 'GIT_NOT_INITIALIZED' | 'REGISTRY_ERROR' | 'REGISTRY_NOT_FOUND' | 'CONFIG_ERROR' | 'VALIDATION_ERROR' | 'FILE_NOT_FOUND' | 'WORKSPACE_ERROR' | 'AI_ERROR' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
/**
 * EdgitError class with typed error codes
 *
 * Usage:
 * ```typescript
 * throw new EdgitError('COMPONENT_NOT_FOUND', `Component '${name}' not found`)
 * ```
 */
export declare class EdgitError extends Error {
    readonly code: EdgitErrorCode;
    readonly cause?: Error;
    constructor(code: EdgitErrorCode, message: string, cause?: Error);
    /**
     * Create from an unknown error (catch clause)
     */
    static from(error: unknown, code?: EdgitErrorCode): EdgitError;
    /**
     * Format for CLI display
     */
    toCliMessage(): string;
}
/**
 * Type guard to check if an error is an EdgitError
 */
export declare function isEdgitError(error: unknown): error is EdgitError;
/**
 * Helper to throw component not found error
 */
export declare function componentNotFound(name: string): never;
/**
 * Helper to throw component already exists error
 */
export declare function componentExists(name: string): never;
/**
 * Helper to throw invalid version error
 */
export declare function invalidVersion(version: string, reason?: string): never;
/**
 * Helper to throw tag not found error
 */
export declare function tagNotFound(componentName: string, tag: string): never;
/**
 * Helper to throw tag already exists error
 */
export declare function tagExists(componentName: string, tag: string): never;
/**
 * Helper to throw registry not initialized error
 */
export declare function registryNotFound(): never;
/**
 * Helper to throw git error
 */
export declare function gitError(message: string, cause?: Error): never;
/**
 * Helper to throw validation error
 */
export declare function validationError(message: string): never;
//# sourceMappingURL=edgit-error.d.ts.map