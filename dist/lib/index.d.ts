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
export { GitWrapper, createGitWrapper } from '../utils/git.js';
export { GitTagManager, GitTagManagerResult, createGitTagManager, createGitTagManagerWithResult, type EntityType, type GitTagError, type TagInfo, } from '../utils/git-tags.js';
export { RegistryLoader, createRegistryLoader, type RegistryError, } from '../utils/registry.js';
export { ComponentDetector, type DetectionPattern, } from '../utils/component-detector.js';
export { ComponentUtils, ComponentSpecParser, type Component, type ComponentRegistry, type ComponentType, type ComponentSpec, } from '../models/components.js';
export { EdgitError, isEdgitError, type EdgitErrorCode, componentNotFound, componentExists, invalidVersion, tagNotFound, tagExists, registryNotFound, gitError, validationError, } from '../errors/index.js';
export { Result, resultTry, resultTrySync, type Result as ResultType } from '../types/result.js';
export { fileHeaderManager, type ComponentMetadata, type HeaderFormat, } from '../utils/file-headers.js';
export { ComponentNameGenerator } from '../utils/component-name-generator.js';
export { ChangelogManager, createChangelogManager, type ChangelogEntry, type ComponentVersionChange, } from '../utils/changelog.js';
export { AICommitManager, DEFAULT_AI_CONFIG } from '../utils/ai-commit.js';
export type { AIConfig, AIMode, AIProviderName, AIProvider, AIResponse, CommitContext, ComponentChange, PromptTemplates, } from '../types/ai-commit.js';
export { InteractivePrompt, createPrompt, confirm, input, select, type PromptOptions, type SelectOptions, } from '../utils/prompt.js';
export { versionSchema, componentNameSchema, componentTypeSchema, deploymentEnvSchema, gitShaSchema, gitRefSchema, filePathSchema, tagCreateArgsSchema, tagSpecSchema, deployArgsSchema, componentAddArgsSchema, componentsListFlagsSchema, validateInput, parseComponentSpec, isValidVersion, isValidComponentName, isValidDeploymentEnv, type Version, type ComponentName, type DeploymentEnv, type TagCreateArgs, type DeployArgs, type ComponentAddArgs, type ComponentsListFlags, } from '../validation/index.js';
//# sourceMappingURL=index.d.ts.map