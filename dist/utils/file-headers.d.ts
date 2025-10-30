import type { ComponentType } from '../models/components.js';
/**
 * File header management for component version metadata
 * Supports different file formats with appropriate comment styles
 */
export interface ComponentMetadata {
    version: string;
    component: string;
    componentId?: string;
    type?: ComponentType;
    updated?: string;
}
export interface HeaderFormat {
    prefix: string;
    suffix: string;
    template: string;
}
/**
 * Default header formats for different file types
 */
export declare const DEFAULT_HEADER_FORMATS: Record<string, HeaderFormat>;
/**
 * YAML-specific metadata block for structured files
 */
export declare const YAML_METADATA_BLOCK = "_edgit:\n  version: \"{version}\"\n  component: \"{component}\"\n  updated: \"{updated}\"";
/**
 * File header manager class
 */
export declare class FileHeaderManager {
    /**
     * Read component metadata from file header
     */
    readMetadata(filePath: string): Promise<ComponentMetadata | null>;
    /**
     * Write component metadata to file header
     */
    writeMetadata(filePath: string, metadata: ComponentMetadata, options?: {
        replace?: boolean;
        componentType?: ComponentType;
    }): Promise<void>;
    /**
     * Get appropriate header format based on file extension and component type
     */
    private getHeaderFormat;
    /**
     * Check if we should override extension format with component type format
     */
    private shouldUseComponentTypeFormat;
    /**
     * Get header format appropriate for component type
     */
    private getFormatForComponentType;
    /**
     * Remove component metadata from file header
     */
    removeMetadata(filePath: string): Promise<void>;
    /**
     * Check if file supports header metadata
     */
    supportsHeaders(filePath: string): boolean;
    /**
     * Parse YAML metadata block
     */
    private parseYamlMetadata;
    /**
     * Parse comment-based metadata
     */
    private parseCommentMetadata;
    /**
     * Update YAML metadata block
     */
    private updateYamlMetadata;
    /**
     * Update comment-based metadata
     */
    private updateCommentMetadata;
    /**
     * Remove YAML metadata block
     */
    private removeYamlMetadata;
    /**
     * Remove comment-based metadata
     */
    private removeCommentMetadata;
}
/**
 * Convenience instance
 */
export declare const fileHeaderManager: FileHeaderManager;
//# sourceMappingURL=file-headers.d.ts.map