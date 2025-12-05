#!/usr/bin/env node
/**
 * Edgit - Git-native component versioning
 * Copyright (c) 2024-2025 Higher Order Capital
 * Licensed under the MIT License
 *
 * Ensemble® is a registered trademark of Higinio O. Maycotte.
 */
/**
 * Main CLI entry point with comprehensive command routing
 */
declare function main(): Promise<void>;
/**
 * Export main for programmatic CLI access
 * This allows the ensemble CLI to call edgit directly without subprocess spawning
 */
export { main };
/**
 * Run CLI with custom argv (for programmatic invocation)
 * Unlike main(), this throws errors instead of calling process.exit()
 * @param argv - Full argv array (typically starts with node path, script path, then args)
 */
export declare function runCLI(argv: string[]): Promise<void>;
//# sourceMappingURL=index.d.ts.map