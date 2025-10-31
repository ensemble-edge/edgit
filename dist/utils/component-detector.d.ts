import { GitWrapper } from './git.js';
import type { ComponentType } from '../models/components.js';
export interface DetectionPattern {
    id?: string;
    type: ComponentType;
    pattern: string;
    description?: string;
    confidence?: number;
    isCustom?: boolean;
}
/**
 * ComponentDetector handles detecting which components changed in commits
 * and determining component types from file paths
 */
export declare class ComponentDetector {
    private git;
    patterns: Record<ComponentType, string[]>;
    constructor(git?: GitWrapper);
    /**
     * Detect component type and name from file path
     */
    detectComponent(filePath: string): {
        type: ComponentType;
        name: string;
    } | null;
    /**
     * Generate component name from file path using smart naming logic
     */
    private generateComponentName;
    /**
     * Get changed components from git diff
     */
    getChangedComponents(fromRef?: string, toRef?: string): Promise<{
        type: ComponentType;
        name: string;
        path: string;
        action: 'added' | 'modified' | 'deleted';
    }[]>;
    /**
     * Get staged components (for commit interception)
     */
    getStagedComponents(): Promise<{
        type: ComponentType;
        name: string;
        path: string;
        action: 'added' | 'modified' | 'deleted';
    }[]>;
    /**
     * Check if a file path is a component
     */
    isComponent(filePath: string): boolean;
    /**
     * Get all component files in the repository
     */
    getAllComponents(): Promise<{
        type: ComponentType;
        name: string;
        path: string;
    }[]>;
    /**
     * Update component patterns (useful for custom configurations)
     */
    updatePatterns(patterns: Partial<Record<ComponentType, string[]>>): void;
    /**
     * Get components by type
     */
    getComponentsByType(type: ComponentType): Promise<{
        name: string;
        path: string;
    }[]>;
    /**
     * Find component by name across all types
     */
    findComponentByName(name: string): Promise<{
        type: ComponentType;
        name: string;
        path: string;
    } | null>;
    /**
     * Validate component patterns
     */
    validatePatterns(): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Get all detection patterns as DetectionPattern objects
     */
    getPatterns(): DetectionPattern[];
    /**
     * Test if a file path matches a detection pattern
     */
    matchesPattern(filePath: string, pattern: DetectionPattern): boolean;
}
/**
 * Convenience function to get ComponentDetector instance
 */
export declare const componentDetector: () => ComponentDetector;
//# sourceMappingURL=component-detector.d.ts.map