import { Command } from './base.js';
import { ComponentDetector } from '../utils/component-detector.js';
import { createPrompt } from '../utils/prompt.js';
import * as fs from 'fs/promises';
/** Valid component types for pattern detection */
const COMPONENT_TYPES = ['prompt', 'template', 'query', 'config', 'script', 'schema', 'agent-definition', 'ensemble', 'tool'];
/**
 * Patterns command for managing component detection patterns
 */
export class PatternsCommand extends Command {
    prompt;
    constructor(...args) {
        super(...args);
        this.prompt = createPrompt();
    }
    async execute(args) {
        await this.validateGitRepo();
        const parsed = this.parseArgs(args);
        const options = this.extractPatternsOptions(parsed);
        const [subcommand, ...subArgs] = parsed.positional;
        switch (subcommand) {
            case 'list':
                await this.listPatterns(options);
                break;
            case 'add':
                await this.addPattern(subArgs, options);
                break;
            case 'remove':
                await this.removePattern(subArgs, options);
                break;
            case 'test':
                await this.testPattern(subArgs, options);
                break;
            default:
                if (subcommand && !subcommand.startsWith('-')) {
                    this.showError(`Unknown patterns subcommand: ${subcommand}`);
                }
                console.log(this.getHelp());
        }
    }
    getHelp() {
        return `
Usage: edgit discover patterns <subcommand> [options]

Manage component detection patterns for automatic discovery.

Subcommands:
  list                    Show all detection patterns
  add <pattern>           Add a new detection pattern
  remove <id>             Remove a pattern by ID
  test <file>             Test patterns against a file

Options:
  --type <type>           Component type for new patterns (prompt|agent|sql|config)
  --description <desc>    Description for new patterns
  --format <format>       Output format: table (default), json
  --force                 Force operations without confirmation
  --test <file>           Test file for pattern validation

Examples:
  edgit discover patterns list                           # Show all patterns
  edgit discover patterns list --type prompt            # Show prompt patterns only
  edgit discover patterns list --format json            # JSON output for scripting
  edgit discover patterns add "*.prompt.md"             # Add pattern with interactive setup
  edgit discover patterns add "scripts/*.py" --type agent --description "Python agent scripts"
  edgit discover patterns remove custom-1               # Remove custom pattern
  edgit discover patterns test prompts/system.md        # Test file against all patterns
    `.trim();
    }
    extractPatternsOptions(parsed) {
        const opts = {};
        // Only set properties if they have values (satisfies exactOptionalPropertyTypes)
        if (parsed.options.type) {
            opts.type = parsed.options.type;
        }
        if (parsed.options.pattern) {
            opts.pattern = parsed.options.pattern;
        }
        if (parsed.options.description) {
            opts.description = parsed.options.description;
        }
        if (parsed.flags.force !== undefined) {
            opts.force = parsed.flags.force;
        }
        if (parsed.options.test) {
            opts.test = parsed.options.test;
        }
        if (parsed.options.format) {
            opts.format = parsed.options.format;
        }
        return opts;
    }
    async listPatterns(options) {
        const detector = new ComponentDetector(this.git);
        const patterns = detector.getPatterns();
        const filteredPatterns = options.type
            ? patterns.filter((p) => p.type === options.type)
            : patterns;
        // JSON output
        if (options.format === 'json') {
            const output = {
                patterns: filteredPatterns.map((p) => ({
                    id: p.id || `${p.type}-auto`,
                    type: p.type,
                    pattern: p.pattern,
                    description: p.description,
                    confidence: p.confidence,
                    isCustom: p.isCustom || false,
                })),
                total: filteredPatterns.length,
                filter: options.type || null,
            };
            console.log(JSON.stringify(output, null, 2));
            return;
        }
        // Table output (default)
        console.log('🔍 Component Detection Patterns\n');
        if (filteredPatterns.length === 0) {
            if (options.type) {
                console.log(`No patterns found for type: ${options.type}`);
            }
            else {
                console.log('No patterns configured.');
            }
            return;
        }
        const groupedPatterns = this.groupPatternsByType(filteredPatterns);
        Object.entries(groupedPatterns).forEach(([type, typePatterns]) => {
            console.log(`📁 ${type.toUpperCase()} Components:`);
            typePatterns.forEach((pattern, index) => {
                const id = pattern.id || `${type}-${index}`;
                console.log(`   ${id}: ${pattern.pattern}`);
                if (pattern.description) {
                    console.log(`       ${pattern.description}`);
                }
                if (pattern.confidence !== undefined) {
                    console.log(`       Confidence: ${pattern.confidence}`);
                }
                console.log();
            });
        });
        console.log(`Total patterns: ${filteredPatterns.length}`);
    }
    async addPattern(args, options) {
        const patternGlob = args[0];
        if (!patternGlob) {
            this.showError('Pattern is required for add command.');
            console.log('Usage: edgit discover patterns add <pattern> [options]');
            return;
        }
        let type = options.type;
        let description = options.description;
        // Interactive prompts if not provided
        if (!type) {
            console.log('Available component types:');
            console.log('  1. prompt   - AI prompts and instructions');
            console.log('  2. agent    - Agent scripts and workflows');
            console.log('  3. sql      - SQL queries and schemas');
            console.log('  4. config   - Configuration files');
            type = await this.promptForType();
        }
        if (!description) {
            description = await this.promptForDescription(patternGlob, type);
        }
        const newPattern = {
            id: `custom-${Date.now()}`,
            type,
            pattern: patternGlob,
            description,
            confidence: 0.8, // Custom patterns get high confidence
            isCustom: true,
        };
        await this.saveCustomPattern(newPattern);
        this.showSuccess(`Added new ${type} pattern: ${patternGlob}`);
        console.log(`   ID: ${newPattern.id}`);
        console.log(`   Description: ${description}`);
        // Test the pattern
        if (options.test) {
            console.log('\n🧪 Testing new pattern...');
            await this.testPatternAgainstFile(newPattern, options.test);
        }
    }
    async removePattern(args, options) {
        const patternId = args[0];
        if (!patternId) {
            this.showError('Pattern ID is required for remove command.');
            console.log('Usage: edgit discover patterns remove <id>');
            console.log('Use "edgit discover patterns list" to see pattern IDs.');
            return;
        }
        const customPatterns = await this.loadCustomPatterns();
        const patternIndex = customPatterns.findIndex((p) => p.id === patternId);
        if (patternIndex === -1) {
            this.showError(`Pattern not found: ${patternId}`);
            console.log('Use "edgit discover patterns list" to see available patterns.');
            return;
        }
        const pattern = customPatterns[patternIndex];
        if (!pattern) {
            this.showError(`Pattern not found: ${patternId}`);
            return;
        }
        if (!options.force) {
            console.log(`About to remove pattern: ${pattern.pattern} (${pattern.type})`);
            const confirmed = await this.confirmAction('Remove this pattern?');
            if (!confirmed) {
                console.log('Cancelled.');
                return;
            }
        }
        customPatterns.splice(patternIndex, 1);
        await this.saveCustomPatterns(customPatterns);
        this.showSuccess(`Removed pattern: ${patternId}`);
    }
    async testPattern(args, options) {
        const testFile = args[0] || options.test;
        if (!testFile) {
            this.showError('Test file is required.');
            console.log('Usage: edgit discover patterns test <file>');
            return;
        }
        // Check if file exists
        try {
            await fs.access(testFile);
        }
        catch {
            this.showError(`File not found: ${testFile}`);
            return;
        }
        console.log(`🧪 Testing patterns against: ${testFile}\n`);
        const detector = new ComponentDetector(this.git);
        const patterns = detector.getPatterns();
        const matches = [];
        for (const pattern of patterns) {
            if (detector.matchesPattern(testFile, pattern)) {
                matches.push({ pattern, confidence: pattern.confidence || 0.5 });
            }
        }
        if (matches.length === 0) {
            console.log('❌ No patterns matched this file.');
            console.log('\n💡 Consider adding a custom pattern for this file type.');
            return;
        }
        console.log(`✅ Found ${matches.length} matching pattern(s):\n`);
        // Sort by confidence descending
        matches.sort((a, b) => b.confidence - a.confidence);
        matches.forEach((match, index) => {
            const { pattern, confidence } = match;
            console.log(`${index + 1}. ${pattern.type.toUpperCase()} - ${pattern.pattern}`);
            console.log(`   Confidence: ${(confidence * 100).toFixed(1)}%`);
            if (pattern.description) {
                console.log(`   Description: ${pattern.description}`);
            }
            if (pattern.isCustom) {
                console.log(`   Type: Custom pattern (ID: ${pattern.id})`);
            }
            console.log();
        });
        // Show what would be detected
        const detected = detector.detectComponent(testFile);
        if (detected) {
            console.log(`🎯 Would detect as: ${detected.name} (${detected.type})`);
        }
    }
    groupPatternsByType(patterns) {
        return patterns.reduce((groups, pattern) => {
            if (!groups[pattern.type]) {
                groups[pattern.type] = [];
            }
            groups[pattern.type].push(pattern);
            return groups;
        }, {});
    }
    async loadCustomPatterns() {
        try {
            const configPath = '.edgit/patterns.json';
            const content = await fs.readFile(configPath, 'utf8');
            return JSON.parse(content);
        }
        catch {
            return [];
        }
    }
    async saveCustomPattern(pattern) {
        const patterns = await this.loadCustomPatterns();
        patterns.push(pattern);
        await this.saveCustomPatterns(patterns);
    }
    async saveCustomPatterns(patterns) {
        await fs.mkdir('.edgit', { recursive: true });
        const content = JSON.stringify(patterns, null, 2);
        await fs.writeFile('.edgit/patterns.json', content, 'utf8');
    }
    async testPatternAgainstFile(pattern, filePath) {
        const detector = new ComponentDetector(this.git);
        if (detector.matchesPattern(filePath, pattern)) {
            console.log(`✅ Pattern matches: ${filePath}`);
        }
        else {
            console.log(`❌ Pattern does not match: ${filePath}`);
        }
    }
    async promptForType() {
        const type = await this.prompt.select('Select component type:', COMPONENT_TYPES, { defaultIndex: 1 });
        return type;
    }
    async promptForDescription(pattern, type) {
        const description = await this.prompt.input('Enter description:', { default: `Custom ${type} pattern for ${pattern}` });
        return description;
    }
    async confirmAction(message) {
        return this.prompt.confirm(message);
    }
}
//# sourceMappingURL=patterns.js.map