/**
 * Tagged union Result type for explicit error handling
 * Inspired by Rust's Result<T, E>
 */
export type Result<T, E = Error> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: E;
};
/**
 * Utility functions for working with Result
 */
export declare const Result: {
    ok: <T>(value: T) => Result<T>;
    err: <T, E>(error: E) => Result<T, E>;
    map: <T, U, E>(result: Result<T, E>, fn: (value: T) => U) => Result<U, E>;
    mapErr: <T, E, F>(result: Result<T, E>, fn: (error: E) => F) => Result<T, F>;
    flatMap: <T, U, E>(result: Result<T, E>, fn: (value: T) => Result<U, E>) => Result<U, E>;
    getOrThrow: <T, E extends Error>(result: Result<T, E>) => T;
    isOk: <T, E>(result: Result<T, E>) => result is {
        ok: true;
        value: T;
    };
    isErr: <T, E>(result: Result<T, E>) => result is {
        ok: false;
        error: E;
    };
};
/**
 * Async Result wrapper - catches exceptions and converts to Result
 */
export declare function resultTry<T>(fn: () => Promise<T>): Promise<Result<T>>;
/**
 * Sync Result wrapper - catches exceptions and converts to Result
 */
export declare function resultTrySync<T>(fn: () => T): Result<T>;
//# sourceMappingURL=result.d.ts.map