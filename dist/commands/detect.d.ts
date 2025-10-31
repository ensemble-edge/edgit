import { Command } from './base.js';
import { type ComponentType } from '../models/components.js';
export interface DetectOptions {
    output?: 'detailed' | 'json' | 'simple';
    preview?: boolean | undefined;
}
export interface DetectResult {
    file: string;
    type: ComponentType | null;
    confidence: 'high' | 'medium' | 'low' | 'none';
    registered: boolean;
    hasHeader: boolean;
    headerMetadata?: {
        version?: string;
        component?: string;
    } | undefined;
    suggestedName: string;
    suggestedVersion: string;
    patterns: {
        matched: string[];
        reason: string;
    };
    recommendations: string[];
    preview?: {
        registryEntry: any;
        headerContent: string;
    };
}
/**
 * Detect command for detailed analysis of specific files
 */
export declare class DetectCommand extends Command {
    execute(args: string[]): Promise<void>;
    getHelp(): string;
    private extractDetectOptions;
    private analyzeFile;
    private isFileRegistered;
    private calculateConfidence;
    private getMatchedPatterns;
    private testPattern;
    private suggestComponentName;
    private suggestInitialVersion;
    private generateRecommendations;
    private generatePreview;
    private generateHeaderPreview;
    private outputResult;
}
//# sourceMappingURL=detect.d.ts.map