import * as path from 'path';
import { minimatch } from 'minimatch';
import { GitWrapper } from './git.js';
import { ComponentNameGenerator } from './component-name-generator.js';
/**
 * ComponentDetector handles detecting which components changed in commits
 * and determining component types from file paths
 */
export class ComponentDetector {
    git;
    // Component patterns to track (can be customized via registry config)
    patterns = {
        prompt: [
            'prompts/**/*', // Any file in prompts/ directory
            '**/prompt*', // Files starting with "prompt"
            '**/*prompt*', // Files containing "prompt"
            '**/*.prompt.*', // Files with .prompt in name
            'instructions/**/*', // Instructions directory
            'templates/**/*', // Templates directory
        ],
        agent: [
            'agents/**/*', // Any file in agents/ directory
            'scripts/**/*.js',
            'scripts/**/*.ts',
            'scripts/**/*.py',
            'scripts/**/*.sh', // Shell scripts
            'scripts/**/*.bash', // Bash scripts
            '**/*.agent.*', // Files with .agent in name
            '**/agent*', // Files starting with "agent"
        ],
        sql: [
            'queries/**/*', // Any file in queries/ directory
            'sql/**/*', // Any file in sql/ directory
            'database/**/*', // Any file in database/ directory
            '**/*.sql', // SQL extension files
            '**/*.query.*', // Files with .query in name
            '**/query*', // Files starting with "query"
            '**/schema*', // Schema files
        ],
        config: [
            'configs/**/*', // Any file in configs/ directory
            'config/**/*', // Any file in config/ directory
            'settings/**/*', // Any file in settings/ directory
            '**/*.config.*', // Files with .config in name
            '**/*.yaml', // YAML files (often config)
            '**/*.yml', // YML files
            '**/*.json', // JSON files (often config)
            '**/*.toml', // TOML files
            '**/*.ini', // INI files
            '**/config*', // Files starting with "config"
        ],
    };
    constructor(git) {
        this.git = git || GitWrapper.getInstance();
    }
    /**
     * Detect component type and name from file path
     */
    detectComponent(filePath) {
        const normalizedPath = filePath.replace(/\\/g, '/');
        for (const [type, patterns] of Object.entries(this.patterns)) {
            for (const pattern of patterns) {
                if (minimatch(normalizedPath, pattern)) {
                    const componentType = type;
                    const name = this.generateComponentName(filePath, componentType);
                    return { type: componentType, name };
                }
            }
        }
        return null;
    }
    /**
     * Generate component name from file path using smart naming logic
     */
    generateComponentName(filePath, type) {
        const fileName = path.basename(filePath);
        const baseName = fileName.split('.')[0];
        if (!baseName) {
            throw new Error(`Cannot generate component name from file: ${filePath}`);
        }
        // Use the smart ComponentNameGenerator that handles suffix detection
        const result = ComponentNameGenerator.generateComponentName(baseName, type);
        return result.name;
    }
    /**
     * Get changed components from git diff
     */
    async getChangedComponents(fromRef, toRef) {
        try {
            const changedFiles = await this.git.getChangedFiles(fromRef, toRef);
            const changes = [];
            for (const filePath of changedFiles) {
                const component = this.detectComponent(filePath);
                if (component) {
                    // For now, we'll treat all changes as 'modified'
                    // In the future, we could use git status to determine actual action
                    changes.push({
                        type: component.type,
                        name: component.name,
                        path: filePath,
                        action: 'modified',
                    });
                }
            }
            return changes;
        }
        catch (error) {
            console.error('Error detecting changed components:', error);
            return [];
        }
    }
    /**
     * Get staged components (for commit interception)
     */
    async getStagedComponents() {
        try {
            const status = await this.git.getStatus();
            const changes = [];
            // Process staged files
            for (const filePath of status.staged) {
                const component = this.detectComponent(filePath);
                if (component) {
                    changes.push({
                        type: component.type,
                        name: component.name,
                        path: filePath,
                        action: 'modified', // Could be enhanced to detect actual action
                    });
                }
            }
            return changes;
        }
        catch (error) {
            console.error('Error detecting staged components:', error);
            return [];
        }
    }
    /**
     * Check if a file path is a component
     */
    isComponent(filePath) {
        return this.detectComponent(filePath) !== null;
    }
    /**
     * Get all component files in the repository
     */
    async getAllComponents() {
        try {
            // Use git ls-files to get all tracked files
            const result = await this.git.exec(['ls-files']);
            if (result.exitCode !== 0) {
                throw new Error(`Git ls-files failed: ${result.stderr}`);
            }
            const files = result.stdout.split('\n').filter((line) => line.trim());
            const components = [];
            for (const filePath of files) {
                const component = this.detectComponent(filePath);
                if (component) {
                    components.push({
                        type: component.type,
                        name: component.name,
                        path: filePath,
                    });
                }
            }
            return components;
        }
        catch (error) {
            console.error('Error scanning for components:', error);
            return [];
        }
    }
    /**
     * Update component patterns (useful for custom configurations)
     */
    updatePatterns(patterns) {
        this.patterns = { ...this.patterns, ...patterns };
    }
    /**
     * Get components by type
     */
    async getComponentsByType(type) {
        const allComponents = await this.getAllComponents();
        return allComponents
            .filter((component) => component.type === type)
            .map((component) => ({ name: component.name, path: component.path }));
    }
    /**
     * Find component by name across all types
     */
    async findComponentByName(name) {
        const allComponents = await this.getAllComponents();
        return allComponents.find((component) => component.name === name) || null;
    }
    /**
     * Validate component patterns
     */
    validatePatterns() {
        const errors = [];
        for (const [type, patterns] of Object.entries(this.patterns)) {
            if (!Array.isArray(patterns)) {
                errors.push(`Patterns for ${type} must be an array`);
                continue;
            }
            for (const pattern of patterns) {
                if (typeof pattern !== 'string') {
                    errors.push(`Pattern in ${type} must be a string: ${pattern}`);
                }
                else if (pattern.trim() === '') {
                    errors.push(`Empty pattern in ${type}`);
                }
            }
        }
        return { valid: errors.length === 0, errors };
    }
    /**
     * Get all detection patterns as DetectionPattern objects
     */
    getPatterns() {
        const patterns = [];
        Object.entries(this.patterns).forEach(([type, typePatterns]) => {
            typePatterns.forEach((pattern, index) => {
                patterns.push({
                    id: `${type}-${index}`,
                    type: type,
                    pattern,
                    confidence: 0.8,
                    description: `Default ${type} pattern`,
                    isCustom: false,
                });
            });
        });
        return patterns;
    }
    /**
     * Test if a file path matches a detection pattern
     */
    matchesPattern(filePath, pattern) {
        const normalizedPath = filePath.replace(/\\/g, '/');
        return minimatch(normalizedPath, pattern.pattern);
    }
}
/**
 * Convenience function to get ComponentDetector instance
 */
export const componentDetector = () => new ComponentDetector();
//# sourceMappingURL=component-detector.js.map