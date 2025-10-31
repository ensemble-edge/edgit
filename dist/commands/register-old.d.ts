import { Command } from './base.js';
import { type Component, type ComponentType } from '../models/components.js';
export interface RegisterOptions {
    force?: boolean;
    withHeader?: boolean;
    withoutHeader?: boolean;
    updateHeader?: boolean;
    type?: ComponentType;
    name?: string;
    version?: string;
    interactive?: boolean;
}
export interface RegisterResult {
    component: Component;
    headerAdded: boolean;
    wasExisting: boolean;
}
/**
 * Register command for manually registering components
 */
export declare class RegisterCommand extends Command {
    execute(args: string[]): Promise<void>;
    getHelp(): string;
    private extractRegisterOptions;
    private registerComponent;
    private loadOrCreateRegistry;
    private getCurrentCommit;
    private generateComponentName;
    private promptForType;
    private promptForName;
    private saveRegistry;
    private outputResult;
    /**
     * Detect previous version from deregistered header or git history
     */
    private detectPreviousVersion;
}
//# sourceMappingURL=register-old.d.ts.map