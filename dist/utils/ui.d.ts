/**
 * Edgit UI utilities - standalone version
 * Provides consistent CLI output without external dependencies
 */
/**
 * Status icons for CLI output
 */
export declare const statusIcons: {
    success: string;
    error: string;
    warning: string;
    info: string;
    pending: string;
    running: string;
};
/**
 * Color helpers for consistent output
 */
export declare const colors: {
    success: (text: string) => string;
    error: (text: string) => string;
    warning: (text: string) => string;
    info: (text: string) => string;
    bold: (text: string) => string;
    dim: (text: string) => string;
    primary: (text: string) => string;
    primaryBold: (text: string) => string;
    accent: (text: string) => string;
    underline: (text: string) => string;
};
/**
 * Logging utilities with consistent formatting
 */
export declare const log: {
    success: (message: string) => void;
    error: (message: string) => void;
    warn: (message: string) => void;
    info: (message: string) => void;
    dim: (message: string) => void;
};
/**
 * Banners for Edgit branding
 */
export declare const banners: {
    edgit: () => void;
};
//# sourceMappingURL=ui.d.ts.map