/**
 * Component type definitions for Edgit
 * These define the structure of component versioning and registry
 */
export type ComponentType = 'prompt' | 'agent' | 'sql' | 'config';
export interface ComponentVersion {
    /** Semantic version string (e.g., "1.0.0") */
    version: string;
    /** Git commit hash where this version was created */
    commit: string;
    /** ISO timestamp when this version was created */
    timestamp: string;
    /** Optional commit message associated with this version */
    message?: string;
}
export interface Component {
    /** Stable unique identifier (short UUID) */
    id: string;
    /** Component name that's Cloudflare Edge Worker safe (e.g., "utils-prompt") - can be changed */
    name: string;
    /** Component type for classification */
    type: ComponentType;
    /** Relative path to the component file */
    path: string;
    /** Current semantic version */
    version: string;
    /** Full version history */
    versionHistory: ComponentVersion[];
    /** Optional tags for deployment stages */
    tags?: Record<string, string>;
    /** Optional metadata for component */
    metadata?: Record<string, any>;
}
export interface ComponentRegistry {
    /** Registry format version for migration compatibility */
    version: string;
    /** All tracked components */
    components: Record<string, Component>;
    /** ISO timestamp of last registry update */
    updated: string;
    /** Custom component patterns (overrides defaults) */
    customPatterns?: Record<ComponentType, string[]>;
    /** Components registered manually (not following patterns) */
    manualComponents?: string[];
    /** Optional registry metadata */
    metadata?: {
        /** Git repository information */
        repository?: {
            remote?: string;
            branch?: string;
        };
        /** Edgit configuration */
        config?: {
            /** Default version bump strategy */
            defaultBump?: 'patch' | 'minor' | 'major';
            /** Whether to use file headers for version metadata */
            useFileHeaders?: boolean;
            /** File header configuration per type */
            headerConfig?: Record<ComponentType, {
                enabled: boolean;
                format: string;
            }>;
            /** Whether using custom patterns */
            customPatterns?: boolean;
        };
    };
}
/**
 * Parsed component specification from user input
 * Format: component-name@version or component-name@tag
 */
export interface ComponentSpec {
    /** Component name */
    name: string;
    /** Requested version or tag */
    version?: string;
    /** Whether this is a tag reference */
    isTag?: boolean;
}
/**
 * Semantic versioning utilities
 */
export declare class SemVer {
    major: number;
    minor: number;
    patch: number;
    constructor(version: string);
    /** Bump patch version (1.0.0 -> 1.0.1) */
    bumpPatch(): SemVer;
    /** Bump minor version (1.0.0 -> 1.1.0) */
    bumpMinor(): SemVer;
    /** Bump major version (1.0.0 -> 2.0.0) */
    bumpMajor(): SemVer;
    /** Get version string */
    toString(): string;
    /** Compare versions */
    compare(other: SemVer): number;
    /** Check if this version is greater than other */
    isGreaterThan(other: SemVer): boolean;
    /** Check if this version is less than other */
    isLessThan(other: SemVer): boolean;
    /** Check if versions are equal */
    equals(other: SemVer): boolean;
    /** Parse version from string */
    static parse(version: string): SemVer;
    /** Validate version format */
    static isValid(version: string): boolean;
}
/**
 * Component specification parser
 */
export declare class ComponentSpecParser {
    /** Parse component spec from string (e.g., "extraction-prompt@1.0.0") */
    static parse(spec: string): ComponentSpec;
    /** Format component spec to string */
    static format(spec: ComponentSpec): string;
}
/**
 * Helper functions for component management
 */
export declare class ComponentUtils {
    /** Generate component name from file path */
    static generateComponentName(filePath: string, type: ComponentType, existingComponents?: Record<string, any>): string;
    /** Create initial component from file path */
    static createComponent(filePath: string, type: ComponentType, commit: string, message?: string, existingComponents?: Record<string, any>): Component;
    /** Create component with Cloudflare-safe naming (async version) */
    static createComponentWithWorkerName(filePath: string, type: ComponentType, commit: string, repoContext: string, message?: string, userBaseName?: string, existingComponents?: Record<string, any>): Promise<Component>;
    /** Create empty registry */
    static createEmptyRegistry(): ComponentRegistry;
    /** Update registry timestamp */
    static updateRegistry(registry: ComponentRegistry): ComponentRegistry;
    /** Find component by name (searches through all components) */
    static findComponentByName(registry: ComponentRegistry, name: string): Component | undefined;
    /** Find component by ID (direct lookup) */
    static findComponentById(registry: ComponentRegistry, id: string): Component | undefined;
    /** Add component to registry (keyed by ID) */
    static addComponent(registry: ComponentRegistry, component: Component): void;
    /** Remove component from registry by ID */
    static removeComponent(registry: ComponentRegistry, id: string): boolean;
    /** Get all components as array */
    static getAllComponents(registry: ComponentRegistry): Component[];
    /** Check if name is already used by another component */
    static isNameTaken(registry: ComponentRegistry, name: string, excludeId?: string): boolean;
}
//# sourceMappingURL=components.d.ts.map