/**
 * Edgit Programmatic API
 *
 * This module provides programmatic access to Edgit functionality for use as a library.
 * Import from '@ensemble-edge/edgit' to use these APIs in your code.
 *
 * @example
 * ```typescript
 * import {
 *   createGitWrapper,
 *   createGitTagManager,
 *   createRegistryLoader,
 *   ComponentUtils,
 * } from '@ensemble-edge/edgit'
 *
 * const git = createGitWrapper('/path/to/repo')
 * const tagManager = createGitTagManager(git)
 * const tags = await tagManager.listTags('my-prompt', 'prompt')
 * ```
 */
// ============================================================================
// Core Git Operations
// ============================================================================
export { GitWrapper, createGitWrapper } from '../utils/git.js';
// ============================================================================
// Git Tag Management (Version & Deployment)
// ============================================================================
export { GitTagManager, GitTagManagerResult, createGitTagManager, createGitTagManagerWithResult, } from '../utils/git-tags.js';
// ============================================================================
// Component Registry
// ============================================================================
export { RegistryLoader, createRegistryLoader, } from '../utils/registry.js';
// ============================================================================
// Component Detection
// ============================================================================
export { ComponentDetector, } from '../utils/component-detector.js';
// ============================================================================
// Component Models & Utilities
// ============================================================================
export { ComponentUtils, ComponentSpecParser, } from '../models/components.js';
// ============================================================================
// Error Handling
// ============================================================================
export { EdgitError, isEdgitError, 
// Helper functions for common errors
componentNotFound, componentExists, invalidVersion, tagNotFound, tagExists, registryNotFound, gitError, validationError, } from '../errors/index.js';
// ============================================================================
// Result Type for Functional Error Handling
// ============================================================================
export { Result, resultTry, resultTrySync } from '../types/result.js';
// ============================================================================
// File Header Management
// ============================================================================
export { fileHeaderManager, } from '../utils/file-headers.js';
// ============================================================================
// Component Name Generation
// ============================================================================
export { ComponentNameGenerator } from '../utils/component-name-generator.js';
// ============================================================================
// Changelog Management
// ============================================================================
export { ChangelogManager, createChangelogManager, } from '../utils/changelog.js';
// ============================================================================
// AI Commit Message Generation
// ============================================================================
export { AICommitManager, DEFAULT_AI_CONFIG } from '../utils/ai-commit.js';
// ============================================================================
// Interactive Prompts
// ============================================================================
export { InteractivePrompt, createPrompt, confirm, input, select, } from '../utils/prompt.js';
// ============================================================================
// Input Validation (Zod schemas)
// ============================================================================
export { 
// Schemas
versionSchema, componentNameSchema, componentTypeSchema, deploymentEnvSchema, gitShaSchema, gitRefSchema, filePathSchema, tagCreateArgsSchema, tagSpecSchema, deployArgsSchema, componentAddArgsSchema, componentsListFlagsSchema, 
// Utilities
validateInput, parseComponentSpec, isValidVersion, isValidComponentName, isValidDeploymentEnv, } from '../validation/index.js';
//# sourceMappingURL=index.js.map