/**
 * Tagged union Result type for explicit error handling
 * Inspired by Rust's Result<T, E>
 */

export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E }

/**
 * Utility functions for working with Result
 */
export const Result = {
  ok: <T>(value: T): Result<T> => ({ ok: true, value }),

  err: <T, E>(error: E): Result<T, E> => ({ ok: false, error }),

  map: <T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> =>
    result.ok ? { ok: true, value: fn(result.value) } : result,

  mapErr: <T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> =>
    result.ok ? result : { ok: false, error: fn(result.error) },

  flatMap: <T, U, E>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E> =>
    result.ok ? fn(result.value) : result,

  getOrThrow: <T, E extends Error>(result: Result<T, E>): T => {
    if (result.ok) return result.value
    throw result.error
  },

  isOk: <T, E>(result: Result<T, E>): result is { ok: true; value: T } => result.ok,

  isErr: <T, E>(result: Result<T, E>): result is { ok: false; error: E } => !result.ok,
}

/**
 * Async Result wrapper - catches exceptions and converts to Result
 */
export async function resultTry<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    const value = await fn()
    return { ok: true, value }
  } catch (error) {
    return { ok: false, error: error as Error }
  }
}

/**
 * Sync Result wrapper - catches exceptions and converts to Result
 */
export function resultTrySync<T>(fn: () => T): Result<T> {
  try {
    const value = fn()
    return { ok: true, value }
  } catch (error) {
    return { ok: false, error: error as Error }
  }
}
