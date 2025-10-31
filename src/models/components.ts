/**
 * Component type definitions for Edgit
 * These define the structure of component versioning and registry
 */

import { ComponentNameGenerator } from '../utils/component-name-generator.js';

export type ComponentType = 'prompt' | 'agent' | 'sql' | 'config';

export interface ComponentVersion {
  /** Semantic version string (e.g., "1.0.0") */
  version: string;
  
  /** Git commit hash where this version was created */
  commit: string;
  
  /** ISO timestamp when this version was created */
  timestamp: string;
  
  /** File path at the time this version was created */
  path: string;
  
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
  tags?: Record<string, string>; // e.g., { "prod": "1.0.0", "canary": "2.0.0" }
  
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
      
      /** AI-powered commit configuration */
      ai?: {
        mode: 'auto' | 'enhance' | 'off';
        provider: 'openai';
        model: string;
        maxDiffSize: number;
        timeout: number;
        generateComponentMessages: boolean;
        includeVersionsInCommit: boolean;
      };
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
export class SemVer {
  public major: number;
  public minor: number;
  public patch: number;

  constructor(version: string) {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
    if (!match || !match[1] || !match[2] || !match[3]) {
      throw new Error(`Invalid semver format: ${version}`);
    }
    
    this.major = parseInt(match[1], 10);
    this.minor = parseInt(match[2], 10);
    this.patch = parseInt(match[3], 10);
  }

  /** Bump patch version (1.0.0 -> 1.0.1) */
  bumpPatch(): SemVer {
    return new SemVer(`${this.major}.${this.minor}.${this.patch + 1}`);
  }

  /** Bump minor version (1.0.0 -> 1.1.0) */
  bumpMinor(): SemVer {
    return new SemVer(`${this.major}.${this.minor + 1}.0`);
  }

  /** Bump major version (1.0.0 -> 2.0.0) */
  bumpMajor(): SemVer {
    return new SemVer(`${this.major + 1}.0.0`);
  }

  /** Get version string */
  toString(): string {
    return `${this.major}.${this.minor}.${this.patch}`;
  }

  /** Compare versions */
  compare(other: SemVer): number {
    if (this.major !== other.major) return this.major - other.major;
    if (this.minor !== other.minor) return this.minor - other.minor;
    return this.patch - other.patch;
  }

  /** Check if this version is greater than other */
  isGreaterThan(other: SemVer): boolean {
    return this.compare(other) > 0;
  }

  /** Check if this version is less than other */
  isLessThan(other: SemVer): boolean {
    return this.compare(other) < 0;
  }

  /** Check if versions are equal */
  equals(other: SemVer): boolean {
    return this.compare(other) === 0;
  }

  /** Parse version from string */
  static parse(version: string): SemVer {
    return new SemVer(version);
  }

  /** Validate version format */
  static isValid(version: string): boolean {
    return /^(\d+)\.(\d+)\.(\d+)$/.test(version);
  }
}

/**
 * Component specification parser
 */
export class ComponentSpecParser {
  /** Parse component spec from string (e.g., "extraction-prompt@1.0.0") */
  static parse(spec: string): ComponentSpec {
    const parts = spec.split('@');
    
    if (parts.length === 1) {
      const name = parts[0];
      if (!name) throw new Error(`Invalid component specification: ${spec}`);
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
  static format(spec: ComponentSpec): string {
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
  static generateComponentName(filePath: string, type: ComponentType, existingComponents?: Record<string, any>): string {
    const fileName = filePath.split('/').pop() || 'unknown';
    const baseName = fileName.split('.')[0];

    // Use smart suffix logic to avoid duplicates like "auth-agent-agent"
    const { ComponentNameGenerator } = require('../utils/component-name-generator.js');
    const result = ComponentNameGenerator.generateComponentName(baseName, type, existingComponents);

    return result.name;
  }

  /** Create initial component from file path */
  static createComponent(
    filePath: string, 
    type: ComponentType, 
    commit: string,
    message?: string,
    userBaseName?: string,
    existingComponents?: Record<string, any>
  ): Component {
    const name = this.generateComponentName(filePath, type, existingComponents);
    
    const now = new Date().toISOString();
    const version = '1.0.0';

    const versionEntry: ComponentVersion = {
      version,
      commit,
      timestamp: now,
      path: filePath
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
  static async createComponentWithWorkerName(
    filePath: string, 
    type: ComponentType, 
    commit: string,
    repoContext: string,
    message?: string,
    userBaseName?: string,
    existingComponents?: Record<string, any>
  ): Promise<Component> {
    const { ComponentNameGenerator } = await import('../utils/component-name-generator.js');
    
    // Generate base name from file path if not provided
    let baseName: string;
    if (userBaseName) {
      baseName = userBaseName;
    } else {
      const fileName = filePath.split('/').pop() || 'unknown';
      baseName = fileName.split('.')[0] || 'unknown';
    }
    
    // Generate smart component name with type suffix handling and collision detection
    const nameResult = ComponentNameGenerator.generateComponentName(
      baseName,
      type,
      existingComponents
    );
    
    const now = new Date().toISOString();
    const version = '1.0.0';

    const versionEntry: ComponentVersion = {
      version,
      commit,
      timestamp: now,
      path: filePath
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
  static createEmptyRegistry(): ComponentRegistry {
    return {
      version: '1.0.0',
      components: {},
      updated: new Date().toISOString()
    };
  }

  /** Update registry timestamp */
  static updateRegistry(registry: ComponentRegistry): ComponentRegistry {
    return {
      ...registry,
      updated: new Date().toISOString()
    };
  }

  /** Find component by name (searches through all components) */
  static findComponentByName(registry: ComponentRegistry, name: string): Component | undefined {
    return Object.values(registry.components).find(comp => comp.name === name);
  }

  /** Find component by ID (direct lookup) */
  static findComponentById(registry: ComponentRegistry, id: string): Component | undefined {
    return registry.components[id];
  }

  /** Add component to registry (keyed by ID) */
  static addComponent(registry: ComponentRegistry, component: Component): void {
    registry.components[component.id] = component;
  }

  /** Remove component from registry by ID */
  static removeComponent(registry: ComponentRegistry, id: string): boolean {
    if (registry.components[id]) {
      delete registry.components[id];
      return true;
    }
    return false;
  }

  /** Get all components as array */
  static getAllComponents(registry: ComponentRegistry): Component[] {
    return Object.values(registry.components);
  }

  /** Check if name is already used by another component */
  static isNameTaken(registry: ComponentRegistry, name: string, excludeId?: string): boolean {
    return Object.values(registry.components).some(comp => 
      comp.name === name && comp.id !== excludeId
    );
  }
}