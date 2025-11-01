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
export class ComponentNameGenerator {
    /**
     * Generate a short, stable component ID (6 characters, alphanumeric)
     */
    static generateComponentId() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    /**
     * Generate a single Cloudflare Edge Worker safe component name with type suffix detection and collision avoidance
     */
    static generateComponentName(userBaseName, type, existingComponents) {
        const cleanBaseName = this.cleanBaseName(userBaseName);
        const typeSuffix = `-${type.toLowerCase()}`;
        const endsWithType = cleanBaseName.toLowerCase().endsWith(typeSuffix);
        let candidateName;
        let warning;
        if (endsWithType) {
            candidateName = cleanBaseName;
            warning = `Detected existing "${type}" suffix in name - using "${candidateName}" as-is`;
        }
        else {
            candidateName = `${cleanBaseName}${typeSuffix}`;
        }
        // Validate Cloudflare Edge Worker safety
        const validation = this.validateWorkerName(candidateName);
        if (!validation.valid) {
            throw new Error(`Generated name "${candidateName}" is not Cloudflare Edge Worker safe: ${validation.errors.join(', ')}`);
        }
        // Check for collisions if registry provided
        const collision = this.checkCollision(candidateName, existingComponents);
        const result = {
            name: candidateName,
            wasNormalized: endsWithType,
        };
        if (warning) {
            result.warning = warning;
        }
        if (collision) {
            result.collision = collision;
        }
        return result;
    }
    /**
     * Check for name collisions and suggest alternatives
     */
    static checkCollision(candidateName, existingComponents) {
        if (!existingComponents || !existingComponents[candidateName]) {
            return undefined; // No collision
        }
        // Generate alternative suggestions
        const suggestions = [];
        const baseName = candidateName;
        // Try numbered suffixes: name-2, name-3, etc.
        for (let i = 2; i <= 5; i++) {
            const altName = `${baseName}-${i}`;
            if (!existingComponents[altName]) {
                suggestions.push(altName);
            }
        }
        // Try descriptive suffixes
        const descriptors = ['new', 'alt', 'v2', 'updated'];
        for (const desc of descriptors) {
            const altName = `${baseName}-${desc}`;
            if (!existingComponents[altName]) {
                suggestions.push(altName);
            }
        }
        return {
            detected: true,
            suggestions: suggestions.slice(0, 3), // Return top 3 suggestions
        };
    }
    /**
     * Clean and normalize base name for component naming
     */
    static cleanBaseName(baseName) {
        return (baseName
            .replace(/[^a-zA-Z0-9-_]/g, '-') // Replace invalid chars with hyphens
            .replace(/-+/g, '-') // Collapse multiple hyphens
            .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
            .toLowerCase() || 'component'); // Fallback if empty
    }
    /**
     * Validate worker name meets Cloudflare Edge Worker requirements
     */
    static validateWorkerName(name) {
        const errors = [];
        // Length requirements
        if (name.length < 1) {
            errors.push('Name cannot be empty');
        }
        if (name.length > 63) {
            errors.push('Name cannot exceed 63 characters');
        }
        // Character requirements
        if (!/^[a-z0-9-]+$/.test(name)) {
            errors.push('Name can only contain lowercase letters, numbers, and hyphens');
        }
        // Must start and end with alphanumeric
        if (name.startsWith('-') || name.endsWith('-')) {
            errors.push('Name cannot start or end with a hyphen');
        }
        // Cannot contain consecutive hyphens
        if (name.includes('--')) {
            errors.push('Name cannot contain consecutive hyphens');
        }
        // Reserved names
        const reserved = ['api', 'www', 'mail', 'ftp', 'localhost', 'admin'];
        if (reserved.includes(name)) {
            errors.push(`"${name}" is a reserved name`);
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
}
//# sourceMappingURL=component-name-generator.js.map