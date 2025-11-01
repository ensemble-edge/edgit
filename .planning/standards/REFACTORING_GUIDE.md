# EDGIT REFACTORING GUIDE
## Practical Examples & Implementation Strategy

---

## QUICK START: Top 5 Refactors

### 1. EXTRACT LOAD REGISTRY UTILITY ⭐⭐⭐⭐⭐

**Current:** 4 different files reimplement registry loading

```typescript
// File: utils/registry.ts (NEW)

import * as fs from 'fs/promises'
import * as path from 'path'
import type { ComponentRegistry } from '../models/components.js'
import { ComponentUtils } from '../models/components.js'

type RegistryLoadResult<T> = 
  | { ok: true; value: T }
  | { ok: false; error: RegistryError }

type RegistryError = 
  | { kind: 'not_initialized'; message: string }
  | { kind: 'parse_error'; message: string }
  | { kind: 'not_in_repo'; message: string }

export class RegistryLoader {
  constructor(private repoRoot: string, private edgitDir: string = '.edgit') {}

  async load(): Promise<RegistryLoadResult<ComponentRegistry>> {
    try {
      const registryPath = path.join(this.repoRoot, this.edgitDir, 'components.json')
      const content = await fs.readFile(registryPath, 'utf8')
      const registry = JSON.parse(content) as ComponentRegistry
      return { ok: true, value: registry }
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return { 
          ok: false, 
          error: { kind: 'not_initialized', message: 'Edgit not initialized' }
        }
      }
      return { 
        ok: false, 
        error: { kind: 'parse_error', message: `Failed to load registry: ${error}` }
      }
    }
  }

  async save(registry: ComponentRegistry): Promise<RegistryLoadResult<void>> {
    try {
      const registryPath = path.join(this.repoRoot, this.edgitDir, 'components.json')
      await fs.mkdir(path.dirname(registryPath), { recursive: true })
      const content = JSON.stringify(registry, null, 2)
      await fs.writeFile(registryPath, content, 'utf8')
      return { ok: true, value: undefined }
    } catch (error) {
      return {
        ok: false,
        error: { kind: 'parse_error', message: `Failed to save registry: ${error}` }
      }
    }
  }
}

export const createRegistryLoader = (repoRoot: string): RegistryLoader =>
  new RegistryLoader(repoRoot)
```

**Usage in Commands:**

```typescript
// Before: ~30 lines in each command
private async loadComponentsRegistry(): Promise<ComponentRegistry> {
  const repoRoot = await this.git.getRepoRoot()
  if (!repoRoot) throw new Error('Not in a git repository')
  
  const componentsFile = path.join(repoRoot, '.edgit', 'components.json')
  try {
    const content = await fs.readFile(componentsFile, 'utf8')
    return JSON.parse(content) as ComponentRegistry
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      throw new Error('Edgit not initialized...')
    }
    throw new Error(`Failed to load...`)
  }
}

// After: ~5 lines in each command
private async loadComponentsRegistry(): Promise<ComponentRegistry> {
  const repoRoot = await this.git.getRepoRoot()
  if (!repoRoot) throw new Error('Not in a git repository')
  
  const loader = createRegistryLoader(repoRoot)
  const result = await loader.load()
  
  if (!result.ok) {
    if (result.error.kind === 'not_initialized') {
      throw new Error('Edgit not initialized. Run "edgit init" first.')
    }
    throw new Error(result.error.message)
  }
  
  return result.value
}
```

**Saves:** ~80 LOC across 4 files  
**Time:** 20-30 minutes

---

### 2. IMPLEMENT RESULT<T> TYPE SYSTEM ⭐⭐⭐⭐⭐

**File: types/result.ts (NEW)**

```typescript
/**
 * Tagged union Result type for explicit error handling
 * Inspired by Rust's Result<T, E>
 */

export type Result<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E }

/**
 * Utility functions for working with Result
 */
export const Result = {
  ok: <T,>(value: T): Result<T> => ({ ok: true, value }),
  
  err: <T, E,>(error: E): Result<T, E> => ({ ok: false, error }),
  
  map: <T, U, E,>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> =>
    result.ok ? { ok: true, value: fn(result.value) } : result,
  
  mapErr: <T, E, F,>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> =>
    result.ok ? result : { ok: false, error: fn(result.error) },
  
  flatMap: <T, U, E,>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E> =>
    result.ok ? fn(result.value) : result,
  
  getOrThrow: <T, E extends Error,>(result: Result<T, E>): T => {
    if (result.ok) return result.value
    throw result.error
  },
  
  isOk: <T, E,>(result: Result<T, E>): result is { ok: true; value: T } =>
    result.ok,
  
  isErr: <T, E,>(result: Result<T, E>): result is { ok: false; error: E } =>
    !result.ok,
}

/**
 * Async Result wrapper
 */
export async function resultTry<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    const value = await fn()
    return { ok: true, value }
  } catch (error) {
    return { ok: false, error: error as Error }
  }
}
```

**Usage Example: Before vs After**

```typescript
// BEFORE: Exception-based
async function loadRegistry(): Promise<ComponentRegistry> {
  try {
    const repoRoot = await git.getRepoRoot()
    if (!repoRoot) throw new Error('Not in git repo')
    
    const path = join(repoRoot, '.edgit', 'components.json')
    const content = await fs.readFile(path, 'utf8')
    return JSON.parse(content)
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`)
    throw error // Re-throw to main()
  }
}

// AFTER: Result-typed
async function loadRegistry(): Promise<Result<ComponentRegistry>> {
  const repoRoot = await git.getRepoRoot()
  if (!repoRoot) return Result.err(new NotInRepoError('Not in git repository'))
  
  return resultTry(async () => {
    const path = join(repoRoot, '.edgit', 'components.json')
    const content = await fs.readFile(path, 'utf8')
    return JSON.parse(content) as ComponentRegistry
  })
}

// In command:
const result = await loadRegistry()
if (!result.ok) {
  this.showError(result.error.message)
  return // Or handle specifically
}

const registry = result.value
```

**Benefits:**
- Errors are explicit, can't be forgotten
- No more exceptions for control flow
- Composable with map/flatMap
- Testable without try/catch
- Type-safe error handling

**Time:** 1-2 hours (includes updating 5-7 core functions)

---

### 3. COMPOSE PARSEARS FUNCTION ⭐⭐⭐⭐

**File: utils/cli-parser.ts (NEW)**

```typescript
/**
 * Composable CLI argument parser following functional programming principles
 */

export interface ParseResult {
  command: string
  subcommand?: string
  args: string[]
  flags: Record<string, boolean>
  options: Record<string, string>
}

// Simple, focused parsers
const parseGlobalOptions = (argv: string[]): { workspace?: string; isHelp: boolean; isVersion: boolean } => {
  const workspace = argv.indexOf('--workspace') !== -1 
    ? argv[argv.indexOf('--workspace') + 1]
    : undefined
  const isHelp = argv.includes('--help') || argv.includes('-h')
  const isVersion = argv.includes('--version') || argv.includes('-v')
  
  return { workspace, isHelp, isVersion }
}

const parseCommand = (argv: string[]): string => {
  return argv.find(arg => !arg.startsWith('-')) || ''
}

const parseSubcommand = (argv: string[], command: string): string | undefined => {
  const cmdIndex = argv.indexOf(command)
  if (cmdIndex === -1 || cmdIndex + 1 >= argv.length) return undefined
  
  const next = argv[cmdIndex + 1]
  return next && !next.startsWith('-') && isSubcommand(command, next) ? next : undefined
}

const parseFlags = (argv: string[]): Record<string, boolean> => {
  const flags: Record<string, boolean> = {}
  
  for (const arg of argv) {
    if (arg.startsWith('-') && !arg.startsWith('--')) {
      // Short flags: -abc = a, b, c flags
      for (const char of arg.slice(1)) {
        flags[char] = true
      }
    } else if (arg.startsWith('--')) {
      // Long flags
      flags[arg.slice(2)] = true
    }
  }
  
  return flags
}

const parseOptions = (argv: string[]): Record<string, string> => {
  const options: Record<string, string> = {}
  
  for (let i = 0; i < argv.length; i++) {
    if (argv[i]?.startsWith('--')) {
      const key = argv[i].slice(2)
      const next = argv[i + 1]
      
      if (next && !next.startsWith('-')) {
        options[key] = next
        i++ // Skip next
      }
    }
  }
  
  return options
}

const parsePositional = (argv: string[], command: string, subcommand?: string): string[] => {
  const positional: string[] = []
  let started = false
  
  for (const arg of argv) {
    if (arg === command) started = true
    else if (started && !arg.startsWith('-')) {
      if (subcommand && arg === subcommand) continue
      positional.push(arg)
    }
  }
  
  return positional
}

// Compose all parsers
export const parseArgs = (argv: string[]): ParseResult => {
  const command = parseCommand(argv)
  const subcommand = parseSubcommand(argv, command)
  
  return {
    command,
    subcommand,
    args: parsePositional(argv, command, subcommand),
    flags: parseFlags(argv),
    options: parseOptions(argv),
  }
}
```

**Usage in index.ts:**

```typescript
// Before: 35-line monolith
function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2)
  const options: GlobalOptions = {}
  const commandArgs: string[] = []
  // ... 32 more lines of mixed logic
}

// After: Clean, composable
import { parseArgs } from './utils/cli-parser.js'

const parsed = parseArgs(process.argv)
```

**Benefits:**
- Each parser is independently testable
- Easy to add new parsing logic
- Simple to understand each piece
- Reusable across CLI tools

**Time:** 45 minutes

---

### 4. FIX O(N²) IN COMMIT COMMAND ⭐⭐⭐⭐

**File: commands/commit.ts (Lines 115-138 refactor)**

```typescript
// BEFORE: O(n²) with repeated git.getStatus()
private async detectChangedComponents(): Promise<ComponentType[]> {
  const stagedFiles = await this.git.getStagedFiles()
  const registry = await this.loadComponentsRegistry()
  const componentEntries = ComponentUtils.getAllComponents(registry)
  
  const changedComponents: ComponentType[] = []
  
  for (const stagedFile of stagedFiles) {  // n iterations
    for (const { name, component } of componentEntries) {  // m iterations
      if (component.path === stagedFile) {
        const status = await this.git.getStatus()  // REPEATED n*m times!
        // ...
      }
    }
  }
  
  return changedComponents
}

// AFTER: O(n + m)
private async detectChangedComponents(): Promise<ComponentType[]> {
  // Pre-compute all data once
  const [stagedFiles, registry, status] = await Promise.all([
    this.git.getStagedFiles(),
    this.loadComponentsRegistry(),
    this.git.getStatus(),
  ])
  
  // Build lookup map for O(1) access
  const componentByPath = new Map(
    ComponentUtils.getAllComponents(registry)
      .map(({ name, component }) => [component.path, { name, component }])
  )
  
  // Single pass: O(n)
  return stagedFiles
    .map(stagedFile => componentByPath.get(stagedFile))
    .filter((entry): entry is typeof entry & {} => entry != null)
    .map(({ name, component }) => ({
      type: component.type,
      name,
      path: component.path,
      action: status.staged.includes(component.path) ? 'modified' : 'added',
    }))
}
```

**Impact:** 
- Performance: O(n²) → O(n + m)
- For 100 components × 50 files: 5,000 operations → 150 operations
- Network calls: 5,000 → 3

**Time:** 1 hour

---

### 5. EXTRACT FIND VERSION FOR SHA ⭐⭐⭐⭐

**File: utils/git-tags.ts (add method)**

```typescript
// ADD TO GitTagManager CLASS:

/**
 * Find which version tag a SHA points to
 * @param component Component name
 * @param sha SHA hash
 * @returns Version tag name or 'unknown'
 */
async findVersionForSHA(component: string, sha: string): Promise<string> {
  const versionTags = await this.getVersionTags(component)
  
  for (const versionTag of versionTags) {
    try {
      const tagSHA = await this.getTagSHA(component, versionTag)
      if (tagSHA === sha) {
        return versionTag
      }
    } catch {
      // Continue searching
      continue
    }
  }
  
  return 'unknown'
}
```

**Usage in deploy.ts - Replace 3 identical blocks:**

```typescript
// BEFORE: Lines 152-166, 376-404, 448-458
const versionTags = await this.tagManager.getVersionTags(componentName)
let versionInfo = 'unknown'

for (const versionTag of versionTags) {
  try {
    const versionSHA = await this.tagManager.getTagSHA(componentName, versionTag)
    if (versionSHA === fromSHA) {
      versionInfo = versionTag
      break
    }
  } catch {
    // Continue searching
  }
}

// AFTER: One-liner
const versionInfo = await this.tagManager.findVersionForSHA(componentName, fromSHA)
```

**Saves:** ~20 LOC across 3 places  
**Time:** 30 minutes

---

## PHASE 2: MEDIUM-PRIORITY REFACTORS

### Extract Confidence Calculation

**File: utils/component-confidence.ts (NEW)**

```typescript
import type { ComponentType } from '../models/components.js'

export type Confidence = 'high' | 'medium' | 'low'

const HIGH_CONFIDENCE_PATTERNS: Record<ComponentType, RegExp[]> = {
  prompt: [/prompt/, /instruction/, /system/, /template/],
  agent: [/agent/, /assistant/, /bot/, /workflow/],
  sql: [/query/, /schema/, /migration/, /view/, /procedure/],
  config: [/config/, /settings/, /env/, /props/],
}

const MEDIUM_CONFIDENCE_PATTERNS: Record<ComponentType, RegExp[]> = {
  prompt: [/\.md$/, /readme/, /doc/],
  agent: [/\.py$/, /\.js$/, /\.ts$/],
  sql: [/\.sql$/],
  config: [/\.json$/, /\.yaml$/, /\.yml$/],
}

export const calculateConfidence = (
  filePath: string,
  type: ComponentType
): Confidence => {
  const basename = filePath.split('/').pop()?.toLowerCase() || ''
  const dirname = filePath.toLowerCase()
  
  // Check high confidence first
  for (const pattern of HIGH_CONFIDENCE_PATTERNS[type] ?? []) {
    if (pattern.test(basename) || pattern.test(dirname)) {
      return 'high'
    }
  }
  
  // Check medium confidence
  for (const pattern of MEDIUM_CONFIDENCE_PATTERNS[type] ?? []) {
    if (pattern.test(filePath)) {
      return 'medium'
    }
  }
  
  return 'low'
}
```

**Usage:** Remove duplicate logic from scan.ts (88 lines) and detect.ts (43 lines)

---

## PHASE 3: LOW-PRIORITY REFACTORS

### Externalize AI Configuration

```typescript
// config/ai.config.ts (NEW)
export const AI_CONFIG = {
  models: {
    default: process.env.EDGIT_AI_MODEL || 'gpt-4-turbo-preview',
    fallback: 'gpt-3.5-turbo',
  },
  timeouts: {
    shortOp: 5000,
    mediumOp: 10000,
    longOp: 30000,
  },
  prompts: {
    systemRole: 'You are an expert at writing clear, concise Git commit messages...',
    templates: {
      singleComponent: '...',
      multiComponent: '...',
      // etc
    },
  },
}
```

---

## IMPLEMENTATION CHECKLIST

```
Phase 1 (2-3 days):
- [ ] Extract LoadComponentRegistry utility
- [ ] Implement Result<T> types
- [ ] Compose parseArgs function
- [ ] Fix O(n²) in commit.ts
- [ ] Extract findVersionForSHA

Phase 2 (3-4 days):
- [ ] Break monolithic enhanceWithAICommitMessage
- [ ] Extract confidence calculation
- [ ] Add proper error types
- [ ] Refactor GitWrapper (DI pattern)
- [ ] Create command registration pattern

Phase 3 (2-3 days):
- [ ] Externalize configuration
- [ ] Add AI provider abstraction
- [ ] Pattern matcher abstraction
- [ ] Optimize component detection caching
- [ ] Immutability audit & fixes

Testing & Verification:
- [ ] Add unit tests for refactored functions
- [ ] Run existing tests to ensure no regressions
- [ ] Performance test: component detection
- [ ] Manual testing of all commands
- [ ] Update documentation
```

---

**Ready to start? Pick one from Phase 1 and begin!**
