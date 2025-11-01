/**
 * Tagged union Result type for explicit error handling
 * Inspired by Rust's Result<T, E>
 */
/**
 * Utility functions for working with Result
 */
export const Result = {
    ok: (value) => ({ ok: true, value }),
    err: (error) => ({ ok: false, error }),
    map: (result, fn) => result.ok ? { ok: true, value: fn(result.value) } : result,
    mapErr: (result, fn) => result.ok ? result : { ok: false, error: fn(result.error) },
    flatMap: (result, fn) => result.ok ? fn(result.value) : result,
    getOrThrow: (result) => {
        if (result.ok)
            return result.value;
        throw result.error;
    },
    isOk: (result) => result.ok,
    isErr: (result) => !result.ok,
};
/**
 * Async Result wrapper - catches exceptions and converts to Result
 */
export async function resultTry(fn) {
    try {
        const value = await fn();
        return { ok: true, value };
    }
    catch (error) {
        return { ok: false, error: error };
    }
}
/**
 * Sync Result wrapper - catches exceptions and converts to Result
 */
export function resultTrySync(fn) {
    try {
        const value = fn();
        return { ok: true, value };
    }
    catch (error) {
        return { ok: false, error: error };
    }
}
//# sourceMappingURL=result.js.map