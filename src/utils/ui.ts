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
}

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
}

/**
 * Color helpers for consistent output
 */
export const colors = {
  // Status colors
  success: (text: string) => `${ansi.green}${text}${ansi.reset}`,
  error: (text: string) => `${ansi.red}${text}${ansi.reset}`,
  warning: (text: string) => `${ansi.yellow}${text}${ansi.reset}`,
  info: (text: string) => `${ansi.blue}${text}${ansi.reset}`,

  // Style modifiers
  bold: (text: string) => `${ansi.bold}${text}${ansi.reset}`,
  dim: (text: string) => `${ansi.dim}${text}${ansi.reset}`,

  // Brand colors (mapped to terminal equivalents)
  primary: (text: string) => `${ansi.magenta}${text}${ansi.reset}`,
  primaryBold: (text: string) => `${ansi.bold}${ansi.magenta}${text}${ansi.reset}`,
  accent: (text: string) => `${ansi.cyan}${text}${ansi.reset}`,

  // Text decoration
  underline: (text: string) => `\x1b[4m${text}${ansi.reset}`,
}

/**
 * Logging utilities with consistent formatting
 */
export const log = {
  success: (message: string) => console.log(`${colors.success(statusIcons.success)} ${message}`),
  error: (message: string) => console.error(`${colors.error(statusIcons.error)} ${message}`),
  warn: (message: string) => console.log(`${colors.warning(statusIcons.warning)} ${message}`),
  info: (message: string) => console.log(`${colors.info(statusIcons.info)} ${message}`),
  dim: (message: string) => console.log(colors.dim(message)),
}

/**
 * Banners for Edgit branding
 */
export const banners = {
  edgit: () => {
    console.log('')
    console.log(colors.primaryBold('  ┌─────────────────────────────────────┐'))
    console.log(
      colors.primaryBold('  │') +
        colors.bold('          E D G I T              ') +
        colors.primaryBold('│')
    )
    console.log(
      colors.primaryBold('  │') +
        colors.dim('    Git-Native Component Versioning  ') +
        colors.primaryBold('│')
    )
    console.log(colors.primaryBold('  └─────────────────────────────────────┘'))
  },
}
