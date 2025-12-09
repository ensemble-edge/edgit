/**
 * Zod validation schemas for Edgit CLI input
 *
 * Provides runtime validation for user input with helpful error messages.
 * Used by commands to validate arguments before processing.
 */
import { z } from 'zod';
/**
 * Semantic version string (with or without 'v' prefix)
 * Examples: v1.0.0, 1.2.3, v2.0.0-beta.1
 */
export declare const versionSchema: z.ZodString;
/**
 * Component name - lowercase alphanumeric with hyphens/underscores
 * Examples: my-prompt, user_config, extraction-agent
 */
export declare const componentNameSchema: z.ZodString;
/**
 * Component type - aligned with Edgit and Conductor types
 */
export declare const componentTypeSchema: z.ZodEnum<{
    template: "template";
    prompt: "prompt";
    query: "query";
    config: "config";
    script: "script";
    schema: "schema";
    "agent-definition": "agent-definition";
    ensemble: "ensemble";
    tool: "tool";
}>;
/**
 * Deployment environment names
 */
export declare const deploymentEnvSchema: z.ZodEnum<{
    test: "test";
    prod: "prod";
    staging: "staging";
    dev: "dev";
    canary: "canary";
    latest: "latest";
}>;
/**
 * Git SHA (short or full)
 */
export declare const gitShaSchema: z.ZodString;
/**
 * Git reference (SHA, tag name, branch, HEAD)
 */
export declare const gitRefSchema: z.ZodString;
/**
 * File path (relative)
 */
export declare const filePathSchema: z.ZodString;
/**
 * Tag command arguments
 * Usage: edgit tag create <component> <tagname> [sha]
 */
export declare const tagCreateArgsSchema: z.ZodObject<{
    component: z.ZodString;
    tagName: z.ZodUnion<readonly [z.ZodString, z.ZodEnum<{
        test: "test";
        prod: "prod";
        staging: "staging";
        dev: "dev";
        canary: "canary";
        latest: "latest";
    }>, z.ZodString]>;
    sha: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * Tag show/delete arguments
 * Usage: edgit tag show <component>@<tag>
 */
export declare const tagSpecSchema: z.ZodPipe<z.ZodString, z.ZodTransform<{
    component: string;
    tag: string;
}, string>>;
/**
 * Deploy command arguments
 */
export declare const deployArgsSchema: z.ZodObject<{
    component: z.ZodString;
    version: z.ZodUnion<readonly [z.ZodString, z.ZodString]>;
    environment: z.ZodEnum<{
        test: "test";
        prod: "prod";
        staging: "staging";
        dev: "dev";
        canary: "canary";
        latest: "latest";
    }>;
    force: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
/**
 * Component add arguments
 */
export declare const componentAddArgsSchema: z.ZodObject<{
    name: z.ZodString;
    path: z.ZodString;
    type: z.ZodOptional<z.ZodEnum<{
        template: "template";
        prompt: "prompt";
        query: "query";
        config: "config";
        script: "script";
        schema: "schema";
        "agent-definition": "agent-definition";
        ensemble: "ensemble";
        tool: "tool";
    }>>;
}, z.core.$strip>;
/**
 * Components list flags
 */
export declare const componentsListFlagsSchema: z.ZodObject<{
    type: z.ZodOptional<z.ZodEnum<{
        template: "template";
        prompt: "prompt";
        query: "query";
        config: "config";
        script: "script";
        schema: "schema";
        "agent-definition": "agent-definition";
        ensemble: "ensemble";
        tool: "tool";
    }>>;
    format: z.ZodDefault<z.ZodEnum<{
        table: "table";
        json: "json";
        yaml: "yaml";
        tree: "tree";
    }>>;
    limit: z.ZodOptional<z.ZodNumber>;
    verbose: z.ZodDefault<z.ZodBoolean>;
    tracked: z.ZodDefault<z.ZodBoolean>;
    untracked: z.ZodDefault<z.ZodBoolean>;
    tagsOnly: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
/**
 * Validate and parse input with helpful error messages
 */
export declare function validateInput<T>(schema: z.ZodType<T>, input: unknown, context?: string): {
    ok: true;
    data: T;
} | {
    ok: false;
    error: string;
};
/**
 * Parse component specification (component@ref)
 */
export declare function parseComponentSpec(spec: string): {
    ok: true;
    component: string;
    ref?: string;
} | {
    ok: false;
    error: string;
};
/**
 * Validate version string
 */
export declare function isValidVersion(version: string): boolean;
/**
 * Validate component name
 */
export declare function isValidComponentName(name: string): boolean;
/**
 * Validate deployment environment
 */
export declare function isValidDeploymentEnv(env: string): boolean;
export type Version = z.infer<typeof versionSchema>;
export type ComponentName = z.infer<typeof componentNameSchema>;
export type ComponentType = z.infer<typeof componentTypeSchema>;
export type DeploymentEnv = z.infer<typeof deploymentEnvSchema>;
export type TagCreateArgs = z.infer<typeof tagCreateArgsSchema>;
export type DeployArgs = z.infer<typeof deployArgsSchema>;
export type ComponentAddArgs = z.infer<typeof componentAddArgsSchema>;
export type ComponentsListFlags = z.infer<typeof componentsListFlagsSchema>;
//# sourceMappingURL=schemas.d.ts.map