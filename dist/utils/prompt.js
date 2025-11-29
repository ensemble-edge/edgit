/**
 * Interactive CLI prompt utilities
 *
 * Provides simple, dependency-free interactive prompts using Node.js readline.
 * Designed for CLI commands that need user input.
 */
import * as readline from 'readline';
/**
 * Create a readline interface for prompts
 */
function createInterface() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
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
export async function confirm(message, defaultYes = false) {
    const rl = createInterface();
    const suffix = defaultYes ? '[Y/n]' : '[y/N]';
    const prompt = `${message} ${suffix} `;
    return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
            rl.close();
            const normalized = answer.trim().toLowerCase();
            if (normalized === '') {
                resolve(defaultYes);
                return;
            }
            resolve(normalized === 'y' || normalized === 'yes');
        });
    });
}
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
export async function input(message, options = {}) {
    const rl = createInterface();
    let prompt = message;
    if (options.default) {
        prompt += ` (${options.default})`;
    }
    prompt += options.newLine ? '\n> ' : ' ';
    return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
            rl.close();
            const value = answer.trim();
            resolve(value || options.default || '');
        });
    });
}
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
export async function select(message, choices, options = {}) {
    const rl = createInterface();
    // Display the choices
    console.log(`\n${message}`);
    choices.forEach((choice, index) => {
        const display = typeof choice === 'string' ? choice : String(choice);
        const marker = options.defaultIndex === index + 1 ? '>' : ' ';
        console.log(`${marker} ${index + 1}. ${display}`);
    });
    const defaultSuffix = options.defaultIndex ? ` (default: ${options.defaultIndex})` : '';
    const prompt = `\nEnter number${defaultSuffix}: `;
    return new Promise((resolve, reject) => {
        const askQuestion = () => {
            rl.question(prompt, (answer) => {
                const trimmed = answer.trim();
                // Handle default
                if (trimmed === '' && options.defaultIndex) {
                    const defaultChoice = choices[options.defaultIndex - 1];
                    if (defaultChoice !== undefined) {
                        rl.close();
                        resolve(defaultChoice);
                        return;
                    }
                }
                // Parse number
                const num = parseInt(trimmed, 10);
                if (isNaN(num) || num < 1 || num > choices.length) {
                    console.log(`Please enter a number between 1 and ${choices.length}`);
                    askQuestion();
                    return;
                }
                const selected = choices[num - 1];
                if (selected !== undefined) {
                    rl.close();
                    resolve(selected);
                }
                else {
                    console.log(`Invalid selection`);
                    askQuestion();
                }
            });
        };
        askQuestion();
    });
}
/**
 * Interactive prompt manager for commands
 *
 * Provides a stateful prompt interface that can be easily mocked for testing.
 */
export class InteractivePrompt {
    enabled;
    /**
     * Create an interactive prompt manager
     * @param interactive - Whether prompts are enabled (disable for CI/testing)
     */
    constructor(interactive = true) {
        this.enabled = interactive && !process.env.CI;
    }
    /**
     * Check if interactive mode is enabled
     */
    isInteractive() {
        return this.enabled;
    }
    /**
     * Ask for confirmation
     */
    async confirm(message, defaultYes = false) {
        if (!this.enabled) {
            return defaultYes;
        }
        return confirm(message, defaultYes);
    }
    /**
     * Ask for text input
     */
    async input(message, options = {}) {
        if (!this.enabled) {
            return options.default || '';
        }
        return input(message, options);
    }
    /**
     * Ask user to select from options
     */
    async select(message, choices, options = {}) {
        if (!this.enabled && options.defaultIndex) {
            const defaultChoice = choices[options.defaultIndex - 1];
            if (defaultChoice !== undefined) {
                return defaultChoice;
            }
        }
        if (!this.enabled) {
            // Return first choice in non-interactive mode
            const first = choices[0];
            if (first !== undefined) {
                return first;
            }
            throw new Error('No choices available');
        }
        return select(message, choices, options);
    }
}
/**
 * Create an interactive prompt instance
 * @param interactive - Whether to enable interactive mode
 */
export function createPrompt(interactive = true) {
    return new InteractivePrompt(interactive);
}
/**
 * Default global prompt instance
 */
export const prompt = new InteractivePrompt();
//# sourceMappingURL=prompt.js.map