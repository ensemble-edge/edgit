/**
 * ComponentNameGenerator provides simple, Cloudflare Edge Worker safe naming
 * with smart type suffix handling to prevent duplicates like "chat-prompt-prompt"
 *
 * Key principles:
 * - Single name: no separate display/worker names
 * - Cloudflare safe: validates against Edge Worker requirements
 * - Smart type suffix: avoid "name-type-type" duplicates
 * - Collision detection: suggests alternatives when names exist
 * - Stable IDs: short UUIDs for identity, names can change
 */
export declare class ComponentNameGenerator {
    /**
     * Generate a short, stable component ID (6 characters, alphanumeric)
     */
    static generateComponentId(): string;
    /**
     * Generate a single Cloudflare Edge Worker safe component name with type suffix detection and collision avoidance
     */
    static generateComponentName(userBaseName: string, type: string, existingComponents?: Record<string, any>): {
        name: string;
        wasNormalized: boolean;
        warning?: string;
        collision?: {
            detected: boolean;
            suggestions: string[];
        };
    };
    /**
     * Check for name collisions and suggest alternatives
     */
    private static checkCollision;
    /**
     * Clean and normalize base name for component naming
     */
    private static cleanBaseName;
    /**
     * Validate worker name meets Cloudflare Edge Worker requirements
     */
    static validateWorkerName(name: string): {
        valid: boolean;
        errors: string[];
    };
}
//# sourceMappingURL=component-name-generator.d.ts.map