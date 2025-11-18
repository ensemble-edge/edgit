/**
 * Component type definitions for Edgit (Git Tag-Based Versioning)
 * Components are now minimal manifests with all versioning handled by Git tags
 */
export type ComponentType = 'template' | 'prompt' | 'query' | 'config' | 'script' | 'schema' | 'agent-definition';
/**
 * Minimal component definition - only static manifest data
 * All versioning, SHAs, and deployment state moved to Git tags
 */
export interface Component {
    /** Relative path to the component file */
    path: string;
    /** Component type for classification */
    type: ComponentType;
}
/**
 * Minimal component registry - static manifest only
 * No more versions, SHAs, or deployment state
 */
export interface ComponentRegistry {
    /** Registry format version for migration compatibility */
    version: string;
    /** All tracked components (keyed by component name) */
    components: Record<string, Component>;
    /** ISO timestamp of last registry update */
    updated: string;
}
/**
 * Parsed component specification from user input
 * Format: component-name@version or component-name@tag or component-name@sha
 */
export interface ComponentSpec {
    /** Component name */
    name: string;
    /** Requested version, tag, or SHA */
    ref?: string;
}
/**
 * Component specification parser for the new Git tag-based system
 */
export declare class ComponentSpecParser {
    /** Parse component spec from string (e.g., "extraction-prompt@v1.0.0" or "extraction-prompt@prod") */
    static parse(spec: string): ComponentSpec;
    /** Format component spec to string */
    static format(spec: ComponentSpec): string;
}
/**
 * Helper functions for component management
 */
export declare class ComponentUtils {
    /** Generate component name from file path with collision detection */
    static generateComponentName(filePath: string, type: ComponentType, existingComponents?: ComponentRegistry): string;
    /** Create initial component from file path */
    static createComponent(filePath: string, type: ComponentType): Component;
    /** Create empty registry */
    static createEmptyRegistry(): ComponentRegistry;
    /** Update registry timestamp */
    static updateRegistry(registry: ComponentRegistry): ComponentRegistry;
    /** Find component by name */
    static findComponentByName(registry: ComponentRegistry, name: string): Component | undefined;
    /** Add component to registry (keyed by name) */
    static addComponent(registry: ComponentRegistry, name: string, component: Component): void;
    /** Remove component from registry by name */
    static removeComponent(registry: ComponentRegistry, name: string): boolean;
    /** Get all components as array with names */
    static getAllComponents(registry: ComponentRegistry): Array<{
        name: string;
        component: Component;
    }>;
    /** Check if component name exists */
    static componentExists(registry: ComponentRegistry, name: string): boolean;
    /** List all component names */
    static listComponentNames(registry: ComponentRegistry): string[];
}
//# sourceMappingURL=components.d.ts.map