import { AIConfig, AIResponse, CommitContext, ComponentChange } from '../types/ai-commit.js';
/**
 * Main AI commit orchestrator
 */
export declare class AICommitManager {
    private config;
    private provider?;
    constructor(config: AIConfig);
    private initializeProvider;
    generateRepoMessage(context: CommitContext): Promise<AIResponse>;
    generateComponentMessage(component: ComponentChange): Promise<AIResponse>;
    isEnabled(): boolean;
    getMode(): string;
}
/**
 * Default AI configuration
 */
export declare const DEFAULT_AI_CONFIG: AIConfig;
//# sourceMappingURL=ai-commit.d.ts.map