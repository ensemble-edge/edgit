/**
 * EdgitError - Typed error class for Edgit CLI
 *
 * Replaces process.exit(1) calls with throwable errors,
 * enabling proper testing and error recovery.
 */
import { statusIcons } from '../utils/ui.js';
/**
 * EdgitError class with typed error codes
 *
 * Usage:
 * ```typescript
 * throw new EdgitError('COMPONENT_NOT_FOUND', `Component '${name}' not found`)
 * ```
 */
export class EdgitError extends Error {
    code;
    cause;
    constructor(code, message, cause) {
        super(message);
        this.name = 'EdgitError';
        this.code = code;
        if (cause !== undefined) {
            this.cause = cause;
        }
        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, EdgitError);
        }
    }
    /**
     * Create from an unknown error (catch clause)
     */
    static from(error, code = 'UNKNOWN_ERROR') {
        if (error instanceof EdgitError) {
            return error;
        }
        if (error instanceof Error) {
            return new EdgitError(code, error.message, error);
        }
        return new EdgitError(code, String(error));
    }
    /**
     * Format for CLI display
     */
    toCliMessage() {
        return `${statusIcons.error} ${this.message}`;
    }
}
/**
 * Type guard to check if an error is an EdgitError
 */
export function isEdgitError(error) {
    return error instanceof EdgitError;
}
/**
 * Helper to throw component not found error
 */
export function componentNotFound(name) {
    throw new EdgitError('COMPONENT_NOT_FOUND', `Component '${name}' not found`);
}
/**
 * Helper to throw component already exists error
 */
export function componentExists(name) {
    throw new EdgitError('COMPONENT_EXISTS', `Component '${name}' already exists`);
}
/**
 * Helper to throw invalid version error
 */
export function invalidVersion(version, reason) {
    const message = reason
        ? `Invalid version '${version}': ${reason}`
        : `Invalid version format: '${version}'`;
    throw new EdgitError('INVALID_VERSION', message);
}
/**
 * Helper to throw tag not found error
 */
export function tagNotFound(componentName, tag) {
    throw new EdgitError('TAG_NOT_FOUND', `Tag '${tag}' not found for component '${componentName}'`);
}
/**
 * Helper to throw tag already exists error
 */
export function tagExists(componentName, tag) {
    throw new EdgitError('TAG_EXISTS', `Tag '${tag}' already exists for component '${componentName}'`);
}
/**
 * Helper to throw registry not initialized error
 */
export function registryNotFound() {
    throw new EdgitError('REGISTRY_NOT_FOUND', 'Edgit is not initialized in this repository. Run "edgit init" first.');
}
/**
 * Helper to throw git error
 */
export function gitError(message, cause) {
    throw new EdgitError('GIT_ERROR', message, cause);
}
/**
 * Helper to throw validation error
 */
export function validationError(message) {
    throw new EdgitError('VALIDATION_ERROR', message);
}
//# sourceMappingURL=edgit-error.js.map