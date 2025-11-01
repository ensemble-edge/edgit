/**
 * AI-powered commit system types
 */

export type AIMode = 'auto' | 'enhance' | 'off'
export type AIProviderName = 'openai' // Room for 'anthropic', 'gemini', etc.
export type ComponentType = 'prompt' | 'agent' | 'sql' | 'config'

export interface AIConfig {
  mode: AIMode
  provider: AIProviderName
  model: string
  maxDiffSize: number
  timeout: number
  generateComponentMessages: boolean
  includeVersionsInCommit: boolean
}

export interface CommitContext {
  stagedFiles: string[]
  components: ComponentChange[]
  repoMessage?: string
  overallDiff: string
}

export interface ComponentChange {
  name: string
  type: ComponentType
  path: string
  oldVersion: string
  newVersion: string
  diff: string
  message?: string
}

export interface AIProvider {
  generateRepoMessage(context: CommitContext): Promise<string>
  generateComponentMessage(component: ComponentChange): Promise<string>
}

export interface AIResponse {
  success: boolean
  message?: string
  error?: string
  fallback?: boolean
}

export interface PromptTemplates {
  repoMultiComponent: string
  repoSingleComponent: string
  componentPrompt: string
  componentAgent: string
  componentSQL: string
  componentConfig: string
}
