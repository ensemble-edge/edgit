/**
 * Zod validation schemas for Edgit CLI input
 *
 * Provides runtime validation for user input with helpful error messages.
 * Used by commands to validate arguments before processing.
 */

import { z } from 'zod'

// ============================================================================
// Base Schemas
// ============================================================================

/**
 * Semantic version string (with or without 'v' prefix)
 * Examples: v1.0.0, 1.2.3, v2.0.0-beta.1
 */
export const versionSchema = z
  .string()
  .regex(/^v?\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/, {
    message: 'Invalid version format. Use semver (e.g., v1.0.0, 1.2.3, v2.0.0-beta.1)',
  })

/**
 * Component name - lowercase alphanumeric with hyphens/underscores
 * Examples: my-prompt, user_config, extraction-agent
 */
export const componentNameSchema = z
  .string()
  .min(1, 'Component name cannot be empty')
  .max(128, 'Component name too long (max 128 characters)')
  .regex(/^[a-z0-9][a-z0-9-_]*[a-z0-9]$|^[a-z0-9]$/, {
    message:
      'Component name must be lowercase alphanumeric with hyphens/underscores (e.g., my-prompt)',
  })

/**
 * Component type - aligned with Edgit and Conductor types
 */
export const componentTypeSchema = z.enum([
  'prompt',
  'template',
  'query',
  'config',
  'script',
  'schema',
  'agent-definition',
  'ensemble',
  'tool',
])

/**
 * Deployment environment names
 */
export const deploymentEnvSchema = z.enum(['prod', 'staging', 'canary', 'latest', 'dev', 'test'])

/**
 * Git SHA (short or full)
 */
export const gitShaSchema = z
  .string()
  .regex(/^[0-9a-f]{6,40}$/i, {
    message: 'Invalid SHA. Must be 6-40 hexadecimal characters',
  })

/**
 * Git reference (SHA, tag name, branch, HEAD)
 */
export const gitRefSchema = z.string().min(1, 'Git reference cannot be empty')

/**
 * File path (relative)
 */
export const filePathSchema = z
  .string()
  .min(1, 'File path cannot be empty')
  .refine((path) => !path.startsWith('/'), {
    message: 'Use relative paths, not absolute paths',
  })

// ============================================================================
// Command Argument Schemas
// ============================================================================

/**
 * Tag command arguments
 * Usage: edgit tag create <component> <tagname> [sha]
 */
export const tagCreateArgsSchema = z.object({
  component: componentNameSchema,
  tagName: z.union([versionSchema, deploymentEnvSchema, z.string().min(1)]),
  sha: gitShaSchema.optional(),
  message: z.string().optional(),
})

/**
 * Tag show/delete arguments
 * Usage: edgit tag show <component>@<tag>
 */
export const tagSpecSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-_]*@.+$/, {
    message: 'Invalid tag specification. Use format: component@tag (e.g., my-prompt@v1.0.0)',
  })
  .transform((spec) => {
    const [component, tag] = spec.split('@')
    return { component: component!, tag: tag! }
  })

/**
 * Deploy command arguments
 */
export const deployArgsSchema = z.object({
  component: componentNameSchema,
  version: z.union([versionSchema, gitRefSchema]),
  environment: deploymentEnvSchema,
  force: z.boolean().default(false),
})

/**
 * Component add arguments
 */
export const componentAddArgsSchema = z.object({
  name: componentNameSchema,
  path: filePathSchema,
  type: componentTypeSchema.optional(),
})

/**
 * Components list flags
 */
export const componentsListFlagsSchema = z.object({
  type: componentTypeSchema.optional(),
  format: z.enum(['table', 'json', 'yaml', 'tree']).default('table'),
  limit: z.number().int().positive().optional(),
  verbose: z.boolean().default(false),
  tracked: z.boolean().default(false),
  untracked: z.boolean().default(false),
  tagsOnly: z.boolean().default(false),
})

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validate and parse input with helpful error messages
 */
export function validateInput<T>(
  schema: z.ZodType<T>,
  input: unknown,
  context?: string
): { ok: true; data: T } | { ok: false; error: string } {
  const result = schema.safeParse(input)

  if (result.success) {
    return { ok: true, data: result.data }
  }

  // Format error messages from Zod 4 issues
  const issues = result.error.issues || []
  const errors = issues.map((issue: z.ZodIssue) => {
    const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : ''
    return `${path}${issue.message}`
  })

  const prefix = context ? `${context}: ` : ''
  return {
    ok: false,
    error: `${prefix}${errors.join('; ')}`,
  }
}

/**
 * Parse component specification (component@ref)
 */
export function parseComponentSpec(
  spec: string
): { ok: true; component: string; ref?: string } | { ok: false; error: string } {
  if (!spec.includes('@')) {
    // Just component name
    const nameResult = componentNameSchema.safeParse(spec)
    if (!nameResult.success) {
      const issues = nameResult.error.issues || []
      return { ok: false, error: issues[0]?.message || 'Invalid component name' }
    }
    return { ok: true, component: spec }
  }

  // Component@ref format
  const [component, ref] = spec.split('@')
  if (!component || !ref) {
    return { ok: false, error: 'Invalid format. Use: component or component@ref' }
  }

  const nameResult = componentNameSchema.safeParse(component)
  if (!nameResult.success) {
    const issues = nameResult.error.issues || []
    return { ok: false, error: issues[0]?.message || 'Invalid component name' }
  }

  return { ok: true, component, ref }
}

/**
 * Validate version string
 */
export function isValidVersion(version: string): boolean {
  return versionSchema.safeParse(version).success
}

/**
 * Validate component name
 */
export function isValidComponentName(name: string): boolean {
  return componentNameSchema.safeParse(name).success
}

/**
 * Validate deployment environment
 */
export function isValidDeploymentEnv(env: string): boolean {
  return deploymentEnvSchema.safeParse(env).success
}

// ============================================================================
// Type exports
// ============================================================================

export type Version = z.infer<typeof versionSchema>
export type ComponentName = z.infer<typeof componentNameSchema>
export type ComponentType = z.infer<typeof componentTypeSchema>
export type DeploymentEnv = z.infer<typeof deploymentEnvSchema>
export type TagCreateArgs = z.infer<typeof tagCreateArgsSchema>
export type DeployArgs = z.infer<typeof deployArgsSchema>
export type ComponentAddArgs = z.infer<typeof componentAddArgsSchema>
export type ComponentsListFlags = z.infer<typeof componentsListFlagsSchema>
