/**
 * Component type definitions for Edgit (Git Tag-Based Versioning)
 * Components are now minimal manifests with all versioning handled by Git tags
 */
import { ComponentNameGenerator } from '../utils/component-name-generator.js';
/**
 * Component specification parser for the new Git tag-based system
 */
export class ComponentSpecParser {
    /** Parse component spec from string (e.g., "extraction-prompt@v1.0.0" or "extraction-prompt@prod") */
    static parse(spec) {
        const parts = spec.split('@');
        if (parts.length === 1) {
            const name = parts[0];
            if (!name)
                throw new Error(`Invalid component specification: ${spec}`);
            return { name };
        }
        if (parts.length === 2) {
            const [name, ref] = parts;
            if (!name || !ref) {
                throw new Error(`Invalid component specification: ${spec}`);
            }
            return { name, ref };
        }
        throw new Error(`Invalid component specification: ${spec}`);
    }
    /** Format component spec to string */
    static format(spec) {
        if (spec.ref) {
            return `${spec.name}@${spec.ref}`;
        }
        return spec.name;
    }
}
/**
 * Helper functions for component management
 */
export class ComponentUtils {
    /** Generate component name from file path with collision detection */
    static generateComponentName(filePath, type, existingComponents) {
        const fileName = filePath.split('/').pop() || 'unknown';
        const baseName = fileName.split('.')[0] || 'unknown';
        // Use the sophisticated ComponentNameGenerator with collision detection
        const result = ComponentNameGenerator.generateComponentName(baseName, type, existingComponents?.components);
        // If collision detected, throw error with suggestions
        if (result.collision?.detected) {
            const suggestions = result.collision.suggestions.join(', ');
            throw new Error(`Component name collision detected: "${result.name}" already exists.\n` +
                `Suggested alternatives: ${suggestions}\n` +
                `File: ${filePath}`);
        }
        // Log warning if name was normalized
        if (result.warning) {
            console.warn(`⚠️  ${result.warning}`);
        }
        return result.name;
    }
    /** Create initial component from file path */
    static createComponent(filePath, type) {
        return {
            path: filePath,
            type,
        };
    }
    /** Create empty registry */
    static createEmptyRegistry() {
        return {
            version: '3.0.0', // New Git tag-based format
            components: {},
            updated: new Date().toISOString(),
        };
    }
    /** Update registry timestamp */
    static updateRegistry(registry) {
        return {
            ...registry,
            updated: new Date().toISOString(),
        };
    }
    /** Find component by name */
    static findComponentByName(registry, name) {
        return registry.components[name];
    }
    /** Add component to registry (keyed by name) */
    static addComponent(registry, name, component) {
        registry.components[name] = component;
    }
    /** Remove component from registry by name */
    static removeComponent(registry, name) {
        if (registry.components[name]) {
            delete registry.components[name];
            return true;
        }
        return false;
    }
    /** Get all components as array with names */
    static getAllComponents(registry) {
        return Object.entries(registry.components).map(([name, component]) => ({ name, component }));
    }
    /** Check if component name exists */
    static componentExists(registry, name) {
        return name in registry.components;
    }
    /** List all component names */
    static listComponentNames(registry) {
        return Object.keys(registry.components);
    }
}
//# sourceMappingURL=components.js.map