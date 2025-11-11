# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) and other AI assistants when working with code in this repository.

## ⚠️ Important: Local Planning Directory

**When creating planning documents, phase summaries, TODO lists, or any working notes, ALWAYS place them in the `.planning/` directory.**

The `.planning/` directory is organized into three areas:

### `.planning/strategy/` - Strategic Planning
Long-term planning and project direction:
- Phase summaries: `PHASE0_SUMMARY.md`, `PHASE1_SUMMARY.md`, etc.
- Project checkpoints: `CHECKPOINT.md`
- Roadmaps and vision documents

### `.planning/todos/` - Task Management
Day-to-day tactical tasks:
- Current work items: `current-tasks.md`
- Backlog: `backlog.md`
- Bug tracking and quick action items

### `.planning/standards/` - Reference Materials
Reusable guidelines and checklists:
- Code review standards
- Architecture decision records (ADRs)
- Development guidelines

**Do NOT create these files in the project root or src/ directory.**

See [.planning/README.md](.planning/README.md) for full details.

## Development Commands

### Setup and Build
- `npm install` - Install dependencies (required first step)
- `npm run build` - Build TypeScript to JavaScript (outputs to `dist/`)
- `npm run dev` - Build and run in development mode
- `npm run prepublishOnly` - Build before publishing (runs automatically)

### Testing
✅ **Current State**: Vitest test framework configured with comprehensive test coverage
- `npm test` - Run all tests (160 tests passing)
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage report
- **Test Categories**:
  - Integration tests for Git operations (16 tests)
  - Component detection tests (24 tests)
  - Component listing tests with all formats (24 tests)
  - Command parsing and execution tests (96+ tests)

### Code Quality
⚠️ **Current State**: No linting/formatting configured yet
- **TODO**: ESLint setup needed
- **TODO**: Prettier configuration needed
- TypeScript strict mode IS enabled (`tsconfig.json`)

### Git Operations
```bash
# This is a Git wrapper CLI - all commands interact with Git
git status         # Check repo state
git tag -l         # List all tags (edgit creates tags under components/*)
git log --oneline  # View commit history
```

## Git Commit Standards

### Commit Message Format
All commits must follow Conventional Commits format WITHOUT any AI attribution:

- **NEVER** append "code written by claude" or similar attribution to commit messages
- **NEVER** add signatures, author notes, or "written by" suffixes
- Use clean, professional commit messages focusing only on the changes

### Correct Format:
```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Examples:
✅ CORRECT:
- `feat: add error handling to API endpoints`
- `fix: resolve memory leak in component registry`
- `docs: update development guide`
- `refactor: extract shared utilities`

❌ INCORRECT:
- `feat: add API endpoints - code written by claude`
- `fix: bug fix (written by Claude)`
- Any commit with attribution or signatures

### Commit Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions or changes
- `chore`: Maintenance tasks
- `build`: Build system or compiled output changes

## Build Artifacts and dist/

**IMPORTANT**: The `dist/` directory **must be committed** to the repository.

### Why commit dist/?
- NPM package consumers get pre-built files (no build step required)
- Enables `npx @ensemble-edge/edgit` to work immediately
- CI builds are for verification only; the published package uses committed dist/

### Workflow when changing source code:
1. Make changes to `src/` files
2. Run `npm run build` to compile TypeScript → JavaScript
3. Commit both `src/` changes AND `dist/` changes together:
   ```bash
   git add src/ dist/
   git commit -m "feat: add new feature"
   ```

### When to commit dist/:
- ✅ After making changes to source code in `src/`
- ✅ After adding new tests that pass
- ✅ As part of feature/fix commits
- ❌ Don't skip committing dist/ - the package won't work without it

### Build commit pattern:
If dist/ changes are from a previous commit's source changes, create a separate build commit:
```bash
git add dist/
git commit -m "build: update compiled dist files

Include dist/ build artifacts from previous source changes"
```

## Architecture Overview

**Edgit** is a Git tag-based component versioning system for AI workflows. It treats Git tags as "portals" to different component versions, eliminating merge conflicts while enabling independent component versioning.

### Core Philosophy

1. **Git Tags as Source of Truth**: All versioning lives in Git tags, not tracked files
2. **Zero Merge Conflicts**: No version data in repository files means no conflicts
3. **Component Independence**: Each component (prompt, agent, SQL, config) versions independently
4. **Immutable Versions**: Version tags (v1.0.0) are immutable; deployment tags (prod) can move

### Project Structure

```
edgit/
├── src/
│   ├── index.ts                 # CLI entry point, command routing
│   ├── commands/                # Command handlers
│   │   ├── base.ts             # Base Command class
│   │   ├── init.ts             # Repository initialization
│   │   ├── commit.ts           # AI-powered commits
│   │   ├── tag.ts              # Tag management
│   │   ├── deploy.ts           # Deployment operations
│   │   ├── components.ts       # Component management & listing
│   │   ├── discover.ts         # Discovery command group
│   │   ├── scan.ts             # Scan for components
│   │   ├── detect.ts           # Detect specific files
│   │   ├── patterns.ts         # Manage detection patterns
│   │   └── ...                 # Other commands
│   ├── utils/                   # Core utilities
│   │   ├── git.ts              # GitWrapper class
│   │   ├── git-tags.ts         # Tag operations
│   │   ├── component-detector.ts  # File pattern detection
│   │   ├── component-resolver.ts  # Component reference resolution
│   │   ├── ai-commit.ts        # OpenAI integration
│   │   └── ...                 # Other utilities
│   ├── models/                  # Type definitions
│   │   └── components.ts       # Component types & utilities
│   └── types/                   # Additional types
├── tests/                       # Test suite (Vitest)
│   ├── integration/            # Integration tests
│   ├── unit/                   # Unit tests
│   └── helpers/                # Test utilities
├── dist/                        # Build output (JS, maps, declarations)
├── .edgit/                      # Edgit metadata (created by init)
│   ├── components.json         # Component registry (path + type only)
│   └── config.json             # Configuration
└── package.json
```

### Key Components

#### 1. **GitWrapper** (`src/utils/git.ts`)
- Wraps `child_process` for Git operations
- Provides both passthrough and structured Git commands
- Handles error output and exit codes

#### 2. **Component Detection** (`src/utils/component-detector.ts`)
- Pattern-based file detection
- Supports: prompts, agents, SQL queries, configs
- Collision detection and name generation

#### 3. **Git Tag Manager** (`src/utils/git-tags.ts`)
- Creates/moves/deletes Git tags
- Manages tag namespace: `components/<name>/<version>`
- Handles version tags (immutable) vs deployment tags (mutable)

#### 4. **Command System**
- Mix of class-based (extending `Command`) and functional approaches
- Commands receive parsed arguments and execute operations
- Help text and error handling per command

#### 5. **AI Commit** (`src/utils/ai-commit.ts`)
- OpenAI API integration for commit messages
- Analyzes diffs and generates conventional commit messages
- Falls back to manual input if API unavailable

### Data Flow

```
1. User runs: edgit tag create my-prompt v1.0.0
2. CLI parses arguments → routes to TagCommand
3. TagCommand loads component registry (.edgit/components.json)
4. Validates component exists and version is valid semver
5. GitWrapper creates Git tag: components/my-prompt/v1.0.0
6. Tag points to current HEAD SHA
7. User can now: git show components/my-prompt/v1.0.0
```

### Tag Namespace Design

```bash
# Version tags (immutable - semantic versioning)
components/my-prompt/v1.0.0
components/my-prompt/v1.1.0
components/data-agent/v2.0.0

# Deployment tags (mutable - can point to different versions)
components/my-prompt/prod     → points to v1.0.0
components/my-prompt/staging  → points to v1.1.0
components/data-agent/prod    → points to v2.0.0
```

## Development Guidelines

### Current Code Patterns

#### Command Pattern (Recommended for new commands)
```typescript
// src/commands/example.ts
import { Command } from './base.js';

export class ExampleCommand extends Command {
  async execute(args: string[]): Promise<void> {
    if (this.hasOption(args, '--help')) {
      this.showHelp();
      return;
    }

    // Implementation
  }

  showHelp(): void {
    console.log('Help text...');
  }
}
```

#### Functional Pattern (Used in some commands)
```typescript
// src/commands/example.ts
export async function exampleCommand(args: string[]): Promise<void> {
  // Direct implementation
}
```

**Recommendation**: Prefer Command class pattern for consistency and testability.

### Error Handling

⚠️ **Current State**: Inconsistent error handling
- Some commands throw errors (caught in main())
- Some use process.exit(1)
- Error messages manually formatted

**TODO**: Implement custom error types:
```typescript
// Needed: src/lib/errors/types.ts
class EdgitError extends Error {
  constructor(message: string, public code: string, public suggestions: string[]) {}
}

class ComponentNotFoundError extends EdgitError {
  constructor(componentName: string, available: string[]) {
    super(`Component '${componentName}' not found`, 'COMPONENT_NOT_FOUND', [...suggestions]);
  }
}
```

### TypeScript Conventions

- **Strict mode enabled** - No implicit any, strict null checks
- **ES Modules** - Use `.js` extensions in imports (required for ESM)
- **Node types** - `@types/node` available
- **Explicit return types** - Preferred for public functions
- **Interface over type** - Use `interface` for object shapes

### Git Operations

#### Always use GitWrapper
```typescript
// ✅ Good
import { GitWrapper } from '../utils/git.js';
const git = new GitWrapper();
await git.exec(['tag', '-l']);

// ❌ Bad - don't call git directly
import { exec } from 'child_process';
exec('git tag -l'); // Don't do this
```

#### Tag Operations
```typescript
import { GitTagManager } from '../utils/git-tags.js';

const tagManager = new GitTagManager();
await tagManager.createVersionTag('my-component', 'v1.0.0');
await tagManager.createDeploymentTag('my-component', 'prod', 'v1.0.0');
```

### Version Control

- Follow Conventional Commits strictly
- Keep commits atomic and focused
- Write commit messages in imperative mood
- No AI attribution in any git operations
- See [Git Commit Standards](#git-commit-standards) section for detailed requirements

### Component Detection

Components are detected by file patterns:

```typescript
// Prompt patterns
'prompts/**/*', '*.prompt.md', 'instructions/**/*', 'templates/**/*'

// Agent patterns
'agents/**/*', 'scripts/**/*.{js,ts,py,sh,bash}', '*.agent.*'

// SQL patterns
'queries/**/*', 'sql/**/*', 'database/**/*', '*.sql', '*.query.*'

// Config patterns
'configs/**/*', 'config/**/*', 'settings/**/*', '*.config.*', '*.{yaml,yml,json,toml,ini}'
```

## Common Tasks

### Listing Components

The `edgit components list` command provides powerful component overview capabilities:

```bash
# List all components with version info (table format)
edgit components list

# Different output formats
edgit components list --format json    # JSON for scripting
edgit components list --format yaml    # YAML for configs
edgit components list --format tree    # Tree with deployment indicators

# Filter components
edgit components list --type prompt           # Only prompts
edgit components list --tags-only             # Only components with version tags
edgit components list --tracked               # Only registered components
edgit components list --untracked             # Only unregistered component files

# Limit versions shown
edgit components list --limit 5               # Show max 5 versions per component

# Combine filters
edgit components list --type agent --tracked --format tree
```

**Implementation Details:**
- Located in `src/commands/components.ts`
- Supports 4 output formats: table (default), JSON, YAML, tree
- Uses `ComponentUtils` for registry operations
- Uses `ComponentDetector` for finding untracked components
- Integrates with Git tag system to show version history
- Shows deployment indicators in tree and table formats

### Discovering Components

The `edgit discover` command group helps find and analyze components:

```bash
# Scan repository for potential components
edgit discover scan                           # Scan all files
edgit discover scan --type prompt             # Find only prompts
edgit discover scan --tracked-only            # Only git-tracked files
edgit discover scan --pattern "*.md"          # Custom file pattern
edgit discover scan --with-headers            # Only files with version headers

# Analyze specific file
edgit discover detect path/to/file.md         # Get component type, confidence

# Manage detection patterns
edgit discover patterns list                  # Show all patterns
edgit discover patterns add prompt "*.txt"    # Add custom pattern
edgit discover patterns remove sql "*.old"    # Remove pattern
```

**Implementation Details:**
- Command group in `src/commands/discover.ts`
- Scan implementation: `src/commands/scan.ts`
- Detect implementation: `src/commands/detect.ts`
- Patterns implementation: `src/commands/patterns.ts`
- Uses `ComponentDetector` for file analysis
- Supports both tracked and untracked file discovery

### Adding a New Command

1. **Create command file**: `src/commands/my-command.ts`
2. **Extend Command class or create function**
3. **Add command to index.ts router** (in main switch statement)
4. **Add help text** to showHelp() function
5. **Update README.md** with new command

Example:
```typescript
// src/commands/my-command.ts
import { Command } from './base.js';

export class MyCommand extends Command {
  async execute(args: string[]): Promise<void> {
    if (this.hasOption(args, '--help')) {
      this.showHelp();
      return;
    }

    // Implementation
    const [firstArg] = args;
    console.log(`Processing: ${firstArg}`);
  }

  showHelp(): void {
    console.log(`
Usage: edgit my-command [options]

Description of what this command does.

Options:
  --help    Show this help message
    `);
  }
}
```

```typescript
// src/index.ts - Add to switch statement
case 'my-command':
  const myCmd = new MyCommand();
  await myCmd.execute(args);
  break;
```

### Adding a New Component Type

1. **Update component detector** patterns in `src/utils/component-detector.ts`
2. **Add type** to `ComponentType` in `src/models/components.ts`
3. **Update README** with new patterns
4. **Add tests** (when test infrastructure exists)

### Working with Git Tags

```typescript
// List tags for a component
const tagManager = new GitTagManager();
const tags = await tagManager.listVersionTags('my-component');

// Create immutable version tag
await tagManager.createVersionTag('my-component', 'v1.0.0');

// Create/move deployment tag
await tagManager.createDeploymentTag('my-component', 'prod', 'v1.0.0');

// Delete tag
await tagManager.deleteTag('my-component', 'v1.0.0');
```

### AI Commit Integration

```typescript
import { generateCommitMessage } from '../utils/ai-commit.js';

// Generate AI commit message from diff
const diff = await git.exec(['diff', '--cached']);
const message = await generateCommitMessage(diff.stdout);

// Fallback if API unavailable
if (!process.env.OPENAI_API_KEY) {
  console.log('⚠️  No OpenAI API key, using manual commit');
  // Prompt user for message
}
```

## Testing Strategy

### Current State
✅ **Comprehensive test coverage with Vitest** (160 tests passing)

### Test Structure

```
tests/
├── integration/
│   ├── basic.test.ts                      # Core Git operations (16 tests)
│   ├── components-list-enhanced.test.ts   # Component listing (24 tests)
│   ├── component-detection.test.ts        # Detection patterns (24 tests)
│   └── ...                                # Other integration tests
├── unit/
│   ├── component-resolver.test.ts         # Component resolution (29 tests)
│   └── ...                                # Other unit tests
└── helpers/
    ├── TestGitRepo.ts                     # Test repository helper
    └── fixtures/                          # Sample component files
```

### Test Coverage Areas

1. **Git Operations** (16 tests)
   - Repository initialization
   - Tag creation and management
   - Component detection
   - Git command execution

2. **Component Listing** (24 tests)
   - All output formats (table, JSON, YAML, tree)
   - Filtering (type, tags-only, tracked, untracked)
   - Version limiting
   - Deployment indicators
   - Edge cases (empty, no tags, etc.)

3. **Component Detection** (24 tests)
   - Pattern matching for all component types
   - Confidence scoring
   - Name generation
   - Collision detection

4. **Component Resolution** (29 tests)
   - URI parsing (prompt://, template://, etc.)
   - Version resolution
   - Deployment tag resolution
   - Error handling

5. **Command Execution** (67+ tests)
   - Argument parsing
   - Option handling
   - Error cases
   - Help text generation

### Test Utilities

**TestGitRepo** - Helper class for isolated Git testing:
```typescript
const repo = new TestGitRepo()
await repo.init()
await repo.writeFile('prompts/test.md', 'content')
await repo.commit('Add prompt')
await repo.runEdgit(['tag', 'create', 'test-prompt', 'v1.0.0'])
```

**Fixtures**:
- Sample prompt files
- Sample agent scripts
- Sample SQL queries
- Sample config files
- Test component registries

### Running Tests

```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage

# Run specific test file
npm test components-list-enhanced
```

## Known Issues & TODOs

### Critical
- [ ] No ESLint/Prettier configuration
- [ ] No error type system (still using generic errors)
- [ ] Inconsistent error handling patterns across commands

### High Priority
- [ ] GitWrapper should support dependency injection (currently creates instances)
- [ ] AI commit timeout is hardcoded (10s)
- [ ] No validation before destructive operations (tag deletion, etc.)
- [ ] Component resolver needs integration into Conductor loaders

### Medium Priority
- [ ] Registry could be cached in memory for performance
- [ ] Component detection is O(n) on all files (acceptable for now)
- [ ] No progress indicators for long operations
- [ ] Limited logging/debug mode

### Documentation
- [ ] JSDoc comments sparse in utilities
- [ ] No architecture decision records (ADRs)
- [ ] Examples directory needs more samples
- [ ] API documentation could be more comprehensive

### Completed Recently
- [x] Test infrastructure (Vitest with 160 tests)
- [x] Component listing with multiple output formats
- [x] Component discovery commands (scan, detect, patterns)
- [x] Component resolution system
- [x] Untracked component detection
- [x] Deployment tag indicators
- [x] Enhanced component name collision detection

## Troubleshooting

### Build Issues
```bash
# Clean build
rm -rf dist/
npm run build

# Check TypeScript errors
npx tsc --noEmit
```

### Git Tag Issues
```bash
# List all edgit tags
git tag -l "components/*"

# Show tag details
git show components/my-prompt/v1.0.0

# Delete local tag
git tag -d components/my-prompt/v1.0.0

# Sync with remote
git fetch --tags
git push --tags
```

### Component Registry Issues
```bash
# Registry file location
cat .edgit/components.json

# Reinitialize (force)
edgit init --force

# Manually inspect Git tags
git tag -l "components/*" | sort
```

### AI Commit Issues
```bash
# Check API key
echo $OPENAI_API_KEY

# Use in .env file (recommended)
echo "OPENAI_API_KEY=sk-..." > .env

# Skip AI and use manual message
edgit commit -m "manual message"
```

## Integration with Other Tools

### CI/CD
```yaml
# GitHub Actions example
- name: Install edgit
  run: npm install -g @ensemble-edge/edgit

- name: Check components
  run: edgit components list

- name: Create version tag
  run: edgit tag create my-component v${{ github.run_number }}.0.0

- name: Deploy to staging
  run: edgit deploy set my-component v${{ github.run_number }}.0.0 --to staging
```

### Git Hooks
```bash
# .git/hooks/pre-commit
#!/bin/bash
# Validate component changes
edgit discover scan --validate
```

### VSCode
```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "edgit: tag version",
      "type": "shell",
      "command": "edgit tag create ${input:component} ${input:version}"
    }
  ]
}
```

## Project Context

### Business Domain
Edgit solves the "AI component multiverse problem" where:
- AI systems have dozens of independently-evolving components
- Traditional monorepos force components to share one version number
- Edge deployment needs component-level version control
- Developers need to access any historical version instantly

### Key Innovation
Using Git tags as "portals" to component versions instead of:
- Version files (cause merge conflicts)
- Separate repositories (lose monorepo benefits)
- Custom databases (adds complexity)

### Target Users
- AI/ML engineers managing prompts and agents
- Platform teams deploying to edge infrastructure
- Teams using monorepos but needing component independence
- Anyone versioning AI components (prompts, configs, queries)

## Resources

- [Repository](https://github.com/ensemble-edge/edgit)
- [README](./README.md) - User-facing documentation
- [CONTRIBUTING](./CONTRIBUTING.md) - Contribution guidelines
- [Issues](https://github.com/ensemble-edge/edgit/issues)
