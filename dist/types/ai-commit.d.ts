/**
 * AI-powered commit system types
 */
export type AIMode = 'auto' | 'enhance' | 'off';
export type AIProviderName = 'openai';
export type ComponentType = 'template' | 'prompt' | 'query' | 'config' | 'script' | 'schema' | 'agent-definition' | 'ensemble';
export interface AIConfig {
    mode: AIMode;
    provider: AIProviderName;
    model: string;
    maxDiffSize: number;
    timeout: number;
    generateComponentMessages: boolean;
    includeVersionsInCommit: boolean;
}
export interface CommitContext {
    stagedFiles: string[];
    components: ComponentChange[];
    repoMessage?: string;
    overallDiff: string;
}
export interface ComponentChange {
    name: string;
    type: ComponentType;
    path: string;
    oldVersion: string;
    newVersion: string;
    diff: string;
    message?: string;
}
export interface AIProvider {
    generateRepoMessage(context: CommitContext): Promise<string>;
    generateComponentMessage(component: ComponentChange): Promise<string>;
}
export interface AIResponse {
    success: boolean;
    message?: string;
    error?: string;
    fallback?: boolean;
}
export interface PromptTemplates {
    repoMultiComponent: string;
    repoSingleComponent: string;
    componentTemplate: string;
    componentPrompt: string;
    componentScript: string;
    componentQuery: string;
    componentConfig: string;
    componentSchema: string;
    componentAgentDefinition: string;
}
//# sourceMappingURL=ai-commit.d.ts.map