import * as fs from 'fs/promises'
import * as path from 'path'
import type { ComponentRegistry } from '../models/components.js'
import type { Result } from '../types/result.js'

/**
 * Type guard for NodeJS filesystem errors with error codes
 */
function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}

/**
 * Registry-specific error types
 */
export type RegistryError =
  | { kind: 'not_initialized'; message: string }
  | { kind: 'parse_error'; message: string; cause?: Error }
  | { kind: 'not_in_repo'; message: string }
  | { kind: 'write_error'; message: string; cause?: Error }

/**
 * Registry loader class - eliminates duplication across 4+ command files
 * Handles loading and saving component registry with proper error handling
 */
export class RegistryLoader {
  constructor(
    private repoRoot: string,
    private edgitDir: string = '.edgit'
  ) {}

  /**
   * Load component registry from disk
   * Returns Result type for explicit error handling
   */
  async load(): Promise<Result<ComponentRegistry, RegistryError>> {
    try {
      const registryPath = path.join(this.repoRoot, this.edgitDir, 'components.json')
      const content = await fs.readFile(registryPath, 'utf8')
      const registry = JSON.parse(content) as ComponentRegistry
      return { ok: true, value: registry }
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return {
          ok: false,
          error: {
            kind: 'not_initialized',
            message: 'Edgit not initialized. Run "edgit init" first.',
          },
        }
      }
      const errorMessage = error instanceof Error ? error.message : String(error)
      const parseError: RegistryError = {
        kind: 'parse_error',
        message: `Failed to load registry: ${errorMessage}`,
      }
      // Only add cause if it's an Error (satisfies exactOptionalPropertyTypes)
      if (error instanceof Error) {
        parseError.cause = error
      }
      return {
        ok: false,
        error: parseError,
      }
    }
  }

  /**
   * Save component registry to disk
   * Creates directory if needed
   */
  async save(registry: ComponentRegistry): Promise<Result<void, RegistryError>> {
    try {
      const registryPath = path.join(this.repoRoot, this.edgitDir, 'components.json')
      await fs.mkdir(path.dirname(registryPath), { recursive: true })
      const content = JSON.stringify(registry, null, 2)
      await fs.writeFile(registryPath, content, 'utf8')
      return { ok: true, value: undefined }
    } catch (error) {
      return {
        ok: false,
        error: {
          kind: 'write_error',
          message: `Failed to save registry: ${(error as Error).message}`,
          cause: error as Error,
        },
      }
    }
  }

  /**
   * Get full path to registry file
   */
  getRegistryPath(): string {
    return path.join(this.repoRoot, this.edgitDir, 'components.json')
  }
}

/**
 * Factory function for creating registry loaders
 * Makes dependency injection easy for testing
 */
export const createRegistryLoader = (repoRoot: string): RegistryLoader =>
  new RegistryLoader(repoRoot)
