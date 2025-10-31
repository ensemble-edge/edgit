import * as fs from 'fs/promises';
import * as path from 'path';
/**
 * Default header formats for different file types
 */
export const DEFAULT_HEADER_FORMATS = {
    // Markdown files
    '.md': {
        prefix: '<!-- ',
        suffix: ' -->',
        template: 'Edgit: id={componentId} version={version} component={component}'
    },
    // Text files
    '.txt': {
        prefix: '<!-- ',
        suffix: ' -->',
        template: 'Edgit: id={componentId} version={version} component={component}'
    },
    // Prompt files (treat as text with HTML comments)
    '.prompt': {
        prefix: '<!-- ',
        suffix: ' -->',
        template: 'Edgit: id={componentId} version={version} component={component}'
    },
    // YAML files
    '.yaml': {
        prefix: '# ',
        suffix: '',
        template: 'Edgit: id={componentId} version={version} component={component}'
    },
    '.yml': {
        prefix: '# ',
        suffix: '',
        template: 'Edgit: id={componentId} version={version} component={component}'
    },
    // SQL files
    '.sql': {
        prefix: '-- ',
        suffix: '',
        template: 'Edgit: id={componentId} version={version} component={component}'
    },
    // JavaScript/TypeScript files
    '.js': {
        prefix: '/**\n * ',
        suffix: '\n */',
        template: 'Edgit: id={componentId} version={version} component={component}'
    },
    '.ts': {
        prefix: '/**\n * ',
        suffix: '\n */',
        template: 'Edgit: id={componentId} version={version} component={component}'
    },
    // Python files
    '.py': {
        prefix: '"""',
        suffix: '"""',
        template: 'Edgit: id={componentId} version={version} component={component}'
    },
    // JSON files (using comment-like structure)
    '.json': {
        prefix: '',
        suffix: '',
        template: '"_edgit": {"id": "{componentId}", "version": "{version}", "component": "{component}"}'
    }
};
/**
 * YAML-specific metadata block for structured files
 */
export const YAML_METADATA_BLOCK = `_edgit:
  version: "{version}"
  component: "{component}"
  updated: "{updated}"`;
/**
 * File header manager class
 */
export class FileHeaderManager {
    /**
     * Read user-defined component headers (like "# Component: name")
     */
    async readUserHeader(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const lines = content.split('\n').slice(0, 10); // Only check first 10 lines
            const header = {};
            for (const line of lines) {
                const trimmed = line.trim();
                // Match patterns like "# Component: name" or "// Component: name"
                const componentMatch = trimmed.match(/^[#\/\*\-]*\s*Component:\s*(.+)$/i);
                if (componentMatch && componentMatch[1]) {
                    header.name = componentMatch[1].trim();
                }
                // Match patterns like "# Type: prompt" or "// Type: prompt"  
                const typeMatch = trimmed.match(/^[#\/\*\-]*\s*Type:\s*(.+)$/i);
                if (typeMatch && typeMatch[1]) {
                    header.type = typeMatch[1].trim().toLowerCase();
                }
                // Match patterns like "# Description: text" or "// Description: text"
                const descMatch = trimmed.match(/^[#\/\*\-]*\s*Description:\s*(.+)$/i);
                if (descMatch && descMatch[1]) {
                    header.description = descMatch[1].trim();
                }
            }
            return Object.keys(header).length > 0 ? header : null;
        }
        catch {
            return null;
        }
    }
    /**
     * Read component metadata from file header
     */
    async readMetadata(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const ext = path.extname(filePath).toLowerCase();
            if (ext === '.yaml' || ext === '.yml') {
                return this.parseYamlMetadata(content);
            }
            else {
                return this.parseCommentMetadata(content, ext);
            }
        }
        catch {
            return null;
        }
    }
    /**
     * Write component metadata to file header
     */
    async writeMetadata(filePath, metadata, options = {}) {
        const content = await fs.readFile(filePath, 'utf8');
        const ext = path.extname(filePath).toLowerCase();
        let newContent;
        if (ext === '.yaml' || ext === '.yml') {
            newContent = this.updateYamlMetadata(content, metadata, options.replace);
        }
        else {
            newContent = this.updateCommentMetadata(content, metadata, ext, options.replace, options.componentType);
        }
        await fs.writeFile(filePath, newContent, 'utf8');
    }
    /**
     * Get appropriate header format based on file extension and component type
     */
    getHeaderFormat(ext, componentType) {
        // First try extension-specific format
        let format = DEFAULT_HEADER_FORMATS[ext];
        // If no format for extension, or if component type suggests a different format
        if (!format || this.shouldUseComponentTypeFormat(ext, componentType)) {
            const typeFormat = this.getFormatForComponentType(componentType);
            if (typeFormat) {
                format = typeFormat;
            }
        }
        // Final fallback to HTML comments for unknown types
        if (!format) {
            format = {
                prefix: '<!-- ',
                suffix: ' -->',
                template: 'Edgit: id={componentId} version={version} component={component}'
            };
        }
        return format;
    }
    /**
     * Check if we should override extension format with component type format
     */
    shouldUseComponentTypeFormat(ext, componentType) {
        if (!componentType)
            return false;
        // Override for potentially unsafe combinations
        const unsafeCombinations = [
            { ext: '.txt', type: 'sql' }, // .txt file containing SQL should use SQL comments
            { ext: '.md', type: 'sql' }, // .md file containing SQL should use SQL comments  
            { ext: '.txt', type: 'config' }, // .txt file as config might be YAML-like
        ];
        return unsafeCombinations.some(combo => combo.ext === ext && combo.type === componentType);
    }
    /**
     * Get header format appropriate for component type
     */
    getFormatForComponentType(componentType) {
        if (!componentType)
            return null;
        switch (componentType) {
            case 'sql':
                return {
                    prefix: '-- ',
                    suffix: '',
                    template: 'Edgit: id={componentId} version={version} component={component}'
                };
            case 'config':
                return {
                    prefix: '# ',
                    suffix: '',
                    template: 'Edgit: id={componentId} version={version} component={component}'
                };
            case 'agent':
                // Assume scripts - use /* */ comments
                return {
                    prefix: '/* ',
                    suffix: ' */',
                    template: 'Edgit: id={componentId} version={version} component={component}'
                };
            case 'prompt':
            default:
                // For prompts and unknown types, HTML comments are usually safe
                return {
                    prefix: '<!-- ',
                    suffix: ' -->',
                    template: 'Edgit: id={componentId} version={version} component={component}'
                };
        }
    }
    /**
     * Remove component metadata from file header
     */
    async removeMetadata(filePath) {
        const content = await fs.readFile(filePath, 'utf8');
        const ext = path.extname(filePath).toLowerCase();
        let newContent;
        if (ext === '.yaml' || ext === '.yml') {
            newContent = this.removeYamlMetadata(content);
        }
        else {
            newContent = this.removeCommentMetadata(content, ext);
        }
        await fs.writeFile(filePath, newContent, 'utf8');
    }
    /**
     * Check if file supports header metadata
     */
    supportsHeaders(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return DEFAULT_HEADER_FORMATS.hasOwnProperty(ext);
    }
    /**
     * Parse YAML metadata block
     */
    parseYamlMetadata(content) {
        const yamlMetadataRegex = /^_edgit:\s*\n\s*version:\s*["']?([^"'\n]+)["']?\s*\n\s*component:\s*["']?([^"'\n]+)["']?/m;
        const match = content.match(yamlMetadataRegex);
        if (match && match[1] && match[2]) {
            return {
                version: match[1],
                component: match[2]
            };
        }
        return null;
    }
    /**
     * Parse comment-based metadata
     */
    parseCommentMetadata(content, ext) {
        // New format with ID: Edgit: id=abc123 version=1.0.0 component=my-component
        const newFormatPattern = /Edgit:\s*id=([^\s]+)\s+version=([^\s]+)\s+component=([^\s\n\r]+)/;
        const newFormatMatch = content.match(newFormatPattern);
        if (newFormatMatch && newFormatMatch[1] && newFormatMatch[2] && newFormatMatch[3]) {
            return {
                componentId: newFormatMatch[1],
                version: newFormatMatch[2],
                component: newFormatMatch[3]
            };
        }
        // Legacy formats (no ID)
        const legacyPatterns = [
            /Edgit:\s*version=([^\s]+)\s+component=([^\s\n\r]+)/,
            /version=([^\s]+)\s+component=([^\s\n\r]+)/
        ];
        for (const pattern of legacyPatterns) {
            const match = content.match(pattern);
            if (match && match[1] && match[2]) {
                return {
                    version: match[1],
                    component: match[2]
                };
            }
        }
        return null;
    }
    /**
     * Update YAML metadata block
     */
    updateYamlMetadata(content, metadata, replace = false) {
        const existing = this.parseYamlMetadata(content);
        if (existing && !replace) {
            // Update existing metadata
            const metadataBlock = YAML_METADATA_BLOCK
                .replace('{version}', metadata.version)
                .replace('{component}', metadata.component)
                .replace('{updated}', new Date().toISOString());
            return content.replace(/^_edgit:\s*\n\s*version:.*?\n\s*component:.*?\n(\s*updated:.*?\n)?/m, metadataBlock + '\n\n');
        }
        else {
            // Add new metadata at the top
            const metadataBlock = YAML_METADATA_BLOCK
                .replace('{version}', metadata.version)
                .replace('{component}', metadata.component)
                .replace('{updated}', new Date().toISOString());
            return metadataBlock + '\n\n' + content;
        }
    }
    /**
     * Update comment-based metadata
     */
    updateCommentMetadata(content, metadata, ext, replace = false, componentType) {
        let format = this.getHeaderFormat(ext, componentType);
        const existing = this.parseCommentMetadata(content, ext);
        const headerText = format.template
            .replace('{componentId}', metadata.componentId || 'unknown')
            .replace('{version}', metadata.version)
            .replace('{component}', metadata.component);
        const fullHeader = format.prefix + headerText + format.suffix;
        if (existing && replace) {
            // Replace existing header
            const patterns = [
                /<!--\s*Edgit:.*?-->/,
                /\/\*\*?\s*\n?\s*\*?\s*Edgit:.*?\*\//s,
                /--\s*Edgit:.*?\n/,
                /#\s*Edgit:.*?\n/,
                /"""\s*Edgit:.*?"""/s
            ];
            for (const pattern of patterns) {
                if (pattern.test(content)) {
                    return content.replace(pattern, fullHeader);
                }
            }
        }
        // Add new header at the top
        return fullHeader + '\n' + content;
    }
    /**
     * Remove YAML metadata block
     */
    removeYamlMetadata(content) {
        return content.replace(/^_edgit:\s*\n\s*version:.*?\n\s*component:.*?\n(\s*updated:.*?\n)?\n?/m, '');
    }
    /**
     * Remove comment-based metadata
     */
    removeCommentMetadata(content, ext) {
        const patterns = [
            /<!--\s*Edgit:.*?-->\n?/,
            /\/\*\*?\s*\n?\s*\*?\s*Edgit:.*?\*\/\n?/s,
            /--\s*Edgit:.*?\n/,
            /#\s*Edgit:.*?\n/,
            /"""\s*Edgit:.*?"""\n?/s
        ];
        for (const pattern of patterns) {
            content = content.replace(pattern, '');
        }
        return content;
    }
}
/**
 * Convenience instance
 */
export const fileHeaderManager = new FileHeaderManager();
//# sourceMappingURL=file-headers.js.map