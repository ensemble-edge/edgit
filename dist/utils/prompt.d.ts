/**
 * Interactive CLI prompt utilities
 *
 * Provides simple, dependency-free interactive prompts using Node.js readline.
 * Designed for CLI commands that need user input.
 */
/**
 * Options for prompt utilities
 */
export interface PromptOptions {
    /** Default value if user presses enter without input */
    default?: string;
    /** Whether to show the prompt on a new line after the message */
    newLine?: boolean;
}
/**
 * Options for selection prompts
 */
export interface SelectOptions<T> {
    /** Map display value to return value */
    value?: (item: T) => string;
    /** Default selection (1-indexed) */
    defaultIndex?: number;
}
/**
 * Ask a yes/no confirmation question
 *
 * @param message - The question to ask
 * @param defaultYes - Whether default is yes (default: false)
 * @returns Promise resolving to true for yes, false for no
 *
 * @example
 * ```typescript
 * const confirmed = await confirm('Delete this file?')
 * if (confirmed) {
 *   // proceed with deletion
 * }
 * ```
 */
export declare function confirm(message: string, defaultYes?: boolean): Promise<boolean>;
/**
 * Ask for text input
 *
 * @param message - The prompt message
 * @param options - Optional configuration
 * @returns Promise resolving to user input
 *
 * @example
 * ```typescript
 * const name = await input('Enter component name:')
 * const version = await input('Version:', { default: 'v1.0.0' })
 * ```
 */
export declare function input(message: string, options?: PromptOptions): Promise<string>;
/**
 * Ask user to select from a list of options
 *
 * @param message - The prompt message
 * @param choices - Array of choices to display
 * @param options - Optional configuration
 * @returns Promise resolving to the selected choice
 *
 * @example
 * ```typescript
 * const type = await select('Select component type:', [
 *   'prompt',
 *   'agent',
 *   'config',
 *   'sql'
 * ])
 *
 * // With custom display
 * const env = await select('Select environment:', [
 *   { name: 'Production', value: 'prod' },
 *   { name: 'Staging', value: 'staging' },
 * ], { value: (item) => item.value })
 * ```
 */
export declare function select<T>(message: string, choices: T[], options?: SelectOptions<T>): Promise<T>;
/**
 * Interactive prompt manager for commands
 *
 * Provides a stateful prompt interface that can be easily mocked for testing.
 */
export declare class InteractivePrompt {
    private enabled;
    /**
     * Create an interactive prompt manager
     * @param interactive - Whether prompts are enabled (disable for CI/testing)
     */
    constructor(interactive?: boolean);
    /**
     * Check if interactive mode is enabled
     */
    isInteractive(): boolean;
    /**
     * Ask for confirmation
     */
    confirm(message: string, defaultYes?: boolean): Promise<boolean>;
    /**
     * Ask for text input
     */
    input(message: string, options?: PromptOptions): Promise<string>;
    /**
     * Ask user to select from options
     */
    select<T>(message: string, choices: T[], options?: SelectOptions<T>): Promise<T>;
}
/**
 * Create an interactive prompt instance
 * @param interactive - Whether to enable interactive mode
 */
export declare function createPrompt(interactive?: boolean): InteractivePrompt;
/**
 * Default global prompt instance
 */
export declare const prompt: InteractivePrompt;
//# sourceMappingURL=prompt.d.ts.map