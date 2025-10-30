/**
 * Component type definitions for Edgit
 * These define the structure of component versioning and registry
 */
import { ComponentNameGenerator } from '../utils/component-name-generator.js';
/**
 * Semantic versioning utilities
 */
export class SemVer {
    major;
    minor;
    patch;
    constructor(version) {
        const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
        if (!match || !match[1] || !match[2] || !match[3]) {
            throw new Error(`Invalid semver format: ${version}`);
        }
        this.major = parseInt(match[1], 10);
        this.minor = parseInt(match[2], 10);
        this.patch = parseInt(match[3], 10);
    }
    /** Bump patch version (1.0.0 -> 1.0.1) */
    bumpPatch() {
        return new SemVer(`${this.major}.${this.minor}.${this.patch + 1}`);
    }
    /** Bump minor version (1.0.0 -> 1.1.0) */
    bumpMinor() {
        return new SemVer(`${this.major}.${this.minor + 1}.0`);
    }
    /** Bump major version (1.0.0 -> 2.0.0) */
    bumpMajor() {
        return new SemVer(`${this.major + 1}.0.0`);
    }
    /** Get version string */
    toString() {
        return `${this.major}.${this.minor}.${this.patch}`;
    }
    /** Compare versions */
    compare(other) {
        if (this.major !== other.major)
            return this.major - other.major;
        if (this.minor !== other.minor)
            return this.minor - other.minor;
        return this.patch - other.patch;
    }
    /** Check if this version is greater than other */
    isGreaterThan(other) {
        return this.compare(other) > 0;
    }
    /** Check if this version is less than other */
    isLessThan(other) {
        return this.compare(other) < 0;
    }
    /** Check if versions are equal */
    equals(other) {
        return this.compare(other) === 0;
    }
    /** Parse version from string */
    static parse(version) {
        return new SemVer(version);
    }
    /** Validate version format */
    static isValid(version) {
        return /^(\d+)\.(\d+)\.(\d+)$/.test(version);
    }
}
/**
 * Component specification parser
 */
export class ComponentSpecParser {
    /** Parse component spec from string (e.g., "extraction-prompt@1.0.0") */
    static parse(spec) {
        const parts = spec.split('@');
        if (parts.length === 1) {
            const name = parts[0];
            if (!name)
                throw new Error(`Invalid component specification: ${spec}`);
            return { name };
        }
        if (parts.length === 2) {
            const [name, versionOrTag] = parts;
            if (!name || !versionOrTag) {
                throw new Error(`Invalid component specification: ${spec}`);
            }
            const isVersion = SemVer.isValid(versionOrTag);
            return {
                name,
                version: versionOrTag,
                isTag: !isVersion
            };
        }
        throw new Error(`Invalid component specification: ${spec}`);
    }
    /** Format component spec to string */
    static format(spec) {
        if (spec.version) {
            return `${spec.name}@${spec.version}`;
        }
        return spec.name;
    }
}
/**
 * Helper functions for component management
 */
export class ComponentUtils {
    /** Generate component name from file path */
    static generateComponentName(filePath, type, existingComponents) {
        const fileName = filePath.split('/').pop() || 'unknown';
        const baseName = fileName.split('.')[0];
        // Use smart suffix logic to avoid duplicates like "auth-agent-agent"
        const { ComponentNameGenerator } = require('../utils/component-name-generator.js');
        const result = ComponentNameGenerator.generateComponentName(baseName, type, existingComponents);
        return result.name;
    }
    /** Create initial component from file path */
    static createComponent(filePath, type, commit, message, existingComponents) {
        const name = this.generateComponentName(filePath, type, existingComponents);
        const now = new Date().toISOString();
        const version = '1.0.0';
        const versionEntry = {
            version,
            commit,
            timestamp: now
        };
        if (message) {
            versionEntry.message = message;
        }
        return {
            id: ComponentNameGenerator.generateComponentId(),
            name,
            type,
            path: filePath,
            version,
            versionHistory: [versionEntry]
        };
    }
    /** Create component with Cloudflare-safe naming (async version) */
    static async createComponentWithWorkerName(filePath, type, commit, repoContext, message, userBaseName, existingComponents) {
        const { ComponentNameGenerator } = await import('../utils/component-name-generator.js');
        // Generate base name from file path if not provided
        let baseName;
        if (userBaseName) {
            baseName = userBaseName;
        }
        else {
            const fileName = filePath.split('/').pop() || 'unknown';
            baseName = fileName.split('.')[0] || 'unknown';
        }
        // Generate smart component name with type suffix handling and collision detection
        const nameResult = ComponentNameGenerator.generateComponentName(baseName, type, existingComponents);
        const now = new Date().toISOString();
        const version = '1.0.0';
        const versionEntry = {
            version,
            commit,
            timestamp: now
        };
        if (message) {
            versionEntry.message = message;
        }
        return {
            id: ComponentNameGenerator.generateComponentId(),
            name: nameResult.name,
            type,
            path: filePath,
            version,
            versionHistory: [versionEntry]
        };
    }
    /** Create empty registry */
    static createEmptyRegistry() {
        return {
            version: '1.0.0',
            components: {},
            updated: new Date().toISOString()
        };
    }
    /** Update registry timestamp */
    static updateRegistry(registry) {
        return {
            ...registry,
            updated: new Date().toISOString()
        };
    }
    /** Find component by name (searches through all components) */
    static findComponentByName(registry, name) {
        return Object.values(registry.components).find(comp => comp.name === name);
    }
    /** Find component by ID (direct lookup) */
    static findComponentById(registry, id) {
        return registry.components[id];
    }
    /** Add component to registry (keyed by ID) */
    static addComponent(registry, component) {
        registry.components[component.id] = component;
    }
    /** Remove component from registry by ID */
    static removeComponent(registry, id) {
        if (registry.components[id]) {
            delete registry.components[id];
            return true;
        }
        return false;
    }
    /** Get all components as array */
    static getAllComponents(registry) {
        return Object.values(registry.components);
    }
    /** Check if name is already used by another component */
    static isNameTaken(registry, name, excludeId) {
        return Object.values(registry.components).some(comp => comp.name === name && comp.id !== excludeId);
    }
}
//# sourceMappingURL=components.js.map