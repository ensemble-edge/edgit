/**
 * Simple OpenAI client with graceful error handling
 */
class OpenAIProvider {
    apiKey;
    model;
    timeout;
    constructor(apiKey, model = 'gpt-4-turbo-preview', timeout = 10000) {
        this.apiKey = apiKey;
        this.model = model;
        this.timeout = timeout;
    }
    async generateRepoMessage(context) {
        const prompt = this.buildRepoPrompt(context);
        return this.callOpenAI(prompt);
    }
    async generateComponentMessage(component) {
        const prompt = this.buildComponentPrompt(component);
        return this.callOpenAI(prompt);
    }
    buildRepoPrompt(context) {
        const { components, overallDiff } = context;
        if (components.length === 1) {
            const comp = components[0];
            return PROMPT_TEMPLATES.repoSingleComponent
                .replace('${componentName}', comp.name)
                .replace('${componentType}', comp.type)
                .replace('${diff}', this.truncateDiff(comp.diff, 1500));
        }
        const componentSummary = components
            .map((c) => {
            const action = c.oldVersion === '0.0.0' || !c.oldVersion ? 'new' : 'modified';
            return `• ${c.name} (${c.type}) - ${action}`;
        })
            .join('\n');
        return PROMPT_TEMPLATES.repoMultiComponent
            .replace('${count}', components.length.toString())
            .replace('${componentSummary}', componentSummary)
            .replace('${stats}', this.truncateDiff(overallDiff, 800));
    }
    buildComponentPrompt(component) {
        const template = this.getComponentTemplate(component.type);
        return template
            .replace('${componentName}', component.name)
            .replace('${diff}', this.truncateDiff(component.diff, 2000));
    }
    getComponentTemplate(type) {
        switch (type) {
            case 'template':
                return PROMPT_TEMPLATES.componentTemplate;
            case 'prompt':
                return PROMPT_TEMPLATES.componentPrompt;
            case 'script':
                return PROMPT_TEMPLATES.componentScript;
            case 'query':
                return PROMPT_TEMPLATES.componentQuery;
            case 'config':
                return PROMPT_TEMPLATES.componentConfig;
            case 'schema':
                return PROMPT_TEMPLATES.componentSchema;
            case 'agent-definition':
                return PROMPT_TEMPLATES.componentAgentDefinition;
            default:
                return PROMPT_TEMPLATES.componentPrompt;
        }
    }
    truncateDiff(diff, maxLength) {
        if (diff.length <= maxLength)
            return diff;
        // Smart truncation: keep headers and important changes
        const lines = diff.split('\n');
        const important = lines.filter((line) => line.startsWith('+++') ||
            line.startsWith('---') ||
            line.startsWith('@@') ||
            line.includes('TODO') ||
            line.includes('BREAKING') ||
            line.trim().startsWith('+') ||
            line.trim().startsWith('-'));
        const truncated = important.join('\n').slice(0, maxLength);
        return truncated + '\n\n[... diff truncated ...]';
    }
    async callOpenAI(prompt) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an expert at writing clear, concise Git commit messages. Follow conventional commit format when appropriate.',
                        },
                        {
                            role: 'user',
                            content: prompt,
                        },
                    ],
                    max_tokens: 100,
                    temperature: 0.3,
                }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            const message = data.choices?.[0]?.message?.content?.trim();
            if (!message) {
                throw new Error('Empty response from OpenAI');
            }
            return message;
        }
        catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('OpenAI request timed out');
            }
            throw error;
        }
    }
}
/**
 * Main AI commit orchestrator
 */
export class AICommitManager {
    config;
    provider;
    constructor(config) {
        this.config = config;
        this.initializeProvider();
    }
    initializeProvider() {
        if (this.config.mode === 'off')
            return;
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.warn('⚠️  OPENAI_API_KEY not found in environment. AI features disabled.');
            return;
        }
        if (this.config.provider === 'openai') {
            this.provider = new OpenAIProvider(apiKey, this.config.model, this.config.timeout);
        }
    }
    async generateRepoMessage(context) {
        if (!this.provider || this.config.mode === 'off') {
            return { success: false, error: 'AI disabled' };
        }
        try {
            const message = await this.provider.generateRepoMessage(context);
            return { success: true, message };
        }
        catch (error) {
            console.warn(`⚠️  AI repo message generation failed: ${error.message}`);
            return {
                success: false,
                error: error.message,
                fallback: true,
            };
        }
    }
    async generateComponentMessage(component) {
        if (!this.provider || !this.config.generateComponentMessages) {
            return {
                success: false,
                message: `Updated ${component.name} to v${component.newVersion}`,
                fallback: true,
            };
        }
        try {
            const message = await this.provider.generateComponentMessage(component);
            return { success: true, message };
        }
        catch (error) {
            console.warn(`⚠️  AI component message generation failed for ${component.name}: ${error.message}`);
            return {
                success: false,
                message: `Updated ${component.name} to v${component.newVersion}`,
                fallback: true,
            };
        }
    }
    isEnabled() {
        return this.config.mode !== 'off' && !!this.provider;
    }
    getMode() {
        return this.config.mode;
    }
}
/**
 * Prompt templates for different scenarios
 */
const PROMPT_TEMPLATES = {
    repoMultiComponent: `Create a Git commit message for these component changes:

\${componentSummary}

Changes: \${stats}

IMPORTANT: Return ONLY the commit message, nothing else.
Analyze the component names and types to understand the business purpose.
Format: type(scope): description
Examples:
- "feat: add user validation and cleanup automation"
- "feat(api): enhance rate limiting and error handling" 
- "fix: resolve data processing and config issues"
Maximum 72 characters. Be specific about functionality, not just component types.`,
    repoSingleComponent: `Generate a Git commit message for \${componentName} (\${componentType}):

\${diff}

Format: type(\${componentName}): description
Keep it under 72 characters. Focus on the main change.`,
    componentTemplate: `Describe what changed in this template:

\${diff}

Focus on:
- New HTML/markup structure
- Styling or layout changes
- Dynamic variable updates
- Template engine features

One clear sentence describing the change, no prefix.`,
    componentPrompt: `Describe what changed in this AI prompt component:

\${diff}

Be specific about:
- New patterns or instructions added
- Improvements to existing guidance
- Constraints or formatting changes

One clear sentence describing the change, no prefix or component name.`,
    componentScript: `Describe what changed in this script:

\${diff}

Focus on:
- New capabilities or features
- Performance improvements
- Bug fixes or error handling
- API or interface changes

One clear sentence describing the change, no prefix.`,
    componentQuery: `Describe this SQL query change:

\${diff}

Mention:
- Tables or data affected
- Query optimization or performance
- New data fields or relationships
- Filter or join changes

One clear sentence describing the change, no prefix.`,
    componentConfig: `Describe this configuration change:

\${diff}

Focus on:
- New settings or options
- Parameter adjustments
- Feature toggles
- Performance tuning

One clear sentence describing the change, no prefix.`,
    componentSchema: `Describe what changed in this JSON Schema:

\${diff}

Focus on:
- New fields or properties
- Validation rule changes
- Type constraints
- Required field updates

One clear sentence describing the change, no prefix.`,
    componentAgentDefinition: `Describe what changed in this agent definition:

\${diff}

Focus on:
- Agent operation or behavior changes
- Input/output modifications
- Component or tool integrations
- Configuration updates

One clear sentence describing the change, no prefix.`,
};
/**
 * Default AI configuration
 */
export const DEFAULT_AI_CONFIG = {
    mode: 'auto',
    provider: 'openai',
    model: 'gpt-4-turbo-preview',
    maxDiffSize: 10000,
    timeout: 10000,
    generateComponentMessages: true,
    includeVersionsInCommit: false,
};
//# sourceMappingURL=ai-commit.js.map