/**
 * Edgit UI utilities - standalone version
 * Provides consistent CLI output without external dependencies
 */
/**
 * Status icons for CLI output
 */
export const statusIcons = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ',
    pending: '○',
    running: '◐',
};
/**
 * Simple ANSI color codes for terminal output
 */
const ansi = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
};
/**
 * Color helpers for consistent output
 */
export const colors = {
    // Status colors
    success: (text) => `${ansi.green}${text}${ansi.reset}`,
    error: (text) => `${ansi.red}${text}${ansi.reset}`,
    warning: (text) => `${ansi.yellow}${text}${ansi.reset}`,
    info: (text) => `${ansi.blue}${text}${ansi.reset}`,
    // Style modifiers
    bold: (text) => `${ansi.bold}${text}${ansi.reset}`,
    dim: (text) => `${ansi.dim}${text}${ansi.reset}`,
    // Brand colors (mapped to terminal equivalents)
    primary: (text) => `${ansi.magenta}${text}${ansi.reset}`,
    primaryBold: (text) => `${ansi.bold}${ansi.magenta}${text}${ansi.reset}`,
    accent: (text) => `${ansi.cyan}${text}${ansi.reset}`,
    // Text decoration
    underline: (text) => `\x1b[4m${text}${ansi.reset}`,
};
/**
 * Logging utilities with consistent formatting
 */
export const log = {
    success: (message) => console.log(`${colors.success(statusIcons.success)} ${message}`),
    error: (message) => console.error(`${colors.error(statusIcons.error)} ${message}`),
    warn: (message) => console.log(`${colors.warning(statusIcons.warning)} ${message}`),
    info: (message) => console.log(`${colors.info(statusIcons.info)} ${message}`),
    dim: (message) => console.log(colors.dim(message)),
};
/**
 * Banners for Edgit branding
 */
export const banners = {
    edgit: () => {
        console.log('');
        console.log(colors.primaryBold('  ┌─────────────────────────────────────┐'));
        console.log(colors.primaryBold('  │') +
            colors.bold('          E D G I T              ') +
            colors.primaryBold('│'));
        console.log(colors.primaryBold('  │') +
            colors.dim('    Git-Native Component Versioning  ') +
            colors.primaryBold('│'));
        console.log(colors.primaryBold('  └─────────────────────────────────────┘'));
    },
};
//# sourceMappingURL=ui.js.map