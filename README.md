# 🌌 Edgit: The Multiverse Already Exists in Your Git History

*Every version of every component that ever existed is still there. Edgit just makes them visible.*

```bash
# Recommended: Via unified Ensemble CLI (no installation needed)
npx @ensemble-edge/ensemble edgit --help

# Or direct
npx @ensemble-edge/edgit --help
```

**Git tag-based component and agent versioning for AI systems.** The multiverse already exists in your Git history—every version of every component and agent lives in your commits. Edgit makes them accessible through native Git tags, eliminating merge conflicts while unlocking independent versioning for components and agents. Deploy any combination to Cloudflare's edge in under 50ms globally.

## Novel Architecture: The Multiverse Made Visible

### The Hidden Truth About Your Repository

Your Git repository is already a multiverse. Every component version that ever existed is there—Git never forgets. But you can't see them, can't access them, can't deploy them independently.

**Until now.**

### What You See vs What Actually Exists

```bash
# What Git shows you
git log --oneline
abc1234 "Update everything to v3.0.0"
def5678 "Fix bugs in v2.1.0" 
789abcd "Initial v1.0.0"

# What actually exists (the multiverse)
Your Repository Contains:
├── helper-prompt v1.0.0 (perfect, locked away)
├── helper-prompt v2.0.0 (good, but lost)  
├── helper-prompt v3.0.0 (current, but broken)
├── data-agent v1.0.0 (stable, unreachable)
├── data-agent v2.0.0 (experimental, buried)
└── sql-query v1.0.0 (worked perfectly, gone)

# What Edgit reveals (Git tags as portals)
git tag -l
components/helper-prompt/v1.0.0    ← Portal to the perfect version
components/helper-prompt/v2.0.0    ← Portal to the good version  
components/helper-prompt/v3.0.0    ← Portal to current version
components/data-agent/v1.0.0       ← Portal to stable version
components/sql-query/v1.0.0        ← Portal to the working version
```

**The Magic: Git tags are portals to every version that ever existed.**

### The Problem We Solved

**Traditional Approach: Fighting the Multiverse**
```bash
❌ components.json stores versions → Merge conflicts destroy the multiverse
❌ Custom version tracking → Data corruption erases parallel realities  
❌ Stored state gets out of sync → Lost access to perfect versions
❌ Complex state management → Can't navigate the component multiverse
```

**Edgit's Solution: Git Tags as Multiverse Navigation**
```bash
✅ Git tags reveal all versions → Navigate the multiverse without conflicts
✅ Native Git operations → The multiverse is bulletproof (Git guarantees)
✅ Git is the portal system → Always in sync with reality
✅ Standard Git workflows → Multiverse navigation feels natural
```

## About

Edgit wraps Git to add component-level, agent-level, and ensemble-level versioning while maintaining 100% Git compatibility. Every prompt, script, query, config, schema, agent definition, and ensemble gets its own version automatically. Components are versioned artifacts used by agents. Agents are versioned workers that consume components. Ensembles are versioned workflow definitions that orchestrate agents. Zero learning curve - your git commands just get smarter.

## Why Now? The Perfect Storm

### The Evolution We're Living Through

**2010s: The Monorepo Migration**
```
Before: 100 repositories, 100 version numbers, dependency hell
After:  1 repository, 1 version number, deployment heaven
```

**2020s: The AI Component Explosion**
```
Reality: 1 repository, 500 components, 1 version number
Problem: Your prompt changes shouldn't force a database migration
Bigger Problem: That perfect prompt from v2.1.0? Locked away when you ship v3.0.0
```

**2024: Edge Deployment Changes Everything**
```
Traditional: Deploy entire app → Restart everything → Hope it works
Edge Reality: 
  - Prompt v3.1 running in Singapore
  - Prompt v3.0 still running in Frankfurt (canary failed)
  - Agent v2.0 globally (it's perfect, don't touch it)
  - SQL v4.0 in US-WEST (testing new query)
  
The Truth: Components live independently at the edge.
Your versioning should too.
```

### The Critical Insight

**We've built monorepos for deployment simplicity but lost component independence.**

Every AI system today is actually:
- 20+ prompts (each evolving at different speeds)
- 10+ agents (some stable for months, some changing daily)  
- 50+ SQL queries (that one perfect query from March? Gone.)
- 100+ configs (model params, temperature settings, tools)

**But Git sees only one thing: your repository version.**

This mismatch is killing AI development velocity:
```bash
# The daily tragedy
"The new prompt broke production" → Revert everything
"v2 agent is slower" → Can't use v1 agent with v3 prompt
"That SQL was perfect 5 commits ago" → Archaeology through Git history
"Customer X needs the old prompt" → Entire separate deployment
```

## The Hidden Truth

Your Git repository is already a multiverse. Every component version that ever existed is there—Git never forgets. But you can't see them, can't access them, can't deploy them independently.

**Until now.**

## What You See vs What Exists

[previous content continues...]

### Why Edge + AI + Monorepos = Need for Multiverse Navigation

```javascript
// Without Edgit: Trapped in one reality
const deployment = {
  version: "v3.0.0",
  includes: {
    brilliantNewAgent: "v3.0.0",      // ✅ Want this
    experimentalPrompt: "v3.0.0",      // ⚠️ Not ready
    brokenSQLQuery: "v3.0.0",          // ❌ Breaks production
    perfectOldValidator: "lost in git history"  // 😭 Exists but unreachable
  }
};

// With Edgit: Access the full multiverse
const deployment = {
  agent: "v3.0.0",         // ✅ Take the new agent
  prompt: "v2.1.0",        // ✅ Keep stable prompt from parallel reality
  query: "v1.0.0",         // ✅ Use working SQL from the past
  validator: "v1.0.0"      // ✅ Resurrect that perfect old validator
};
```

### The Multiverse Multiplier

Edge deployment makes this 100x more critical:

- **Instant rollback per component** - One prompt failing? Portal back to the working version
- **Geographic experimentation** - Test prompt v3 in Asia while v2 runs in Europe  
- **Zero-downtime iteration** - Update components across realities independently
- **Perfect combinations** - Mix prompt v1.0 with agent v3.0 from different timelines

**This isn't theoretical. The multiverse is real:**
- OpenAI updates embeddings without touching GPT (different component timelines)
- Anthropic versions Claude's capabilities independently (parallel evolution)
- Google deploys Gemini features progressively (selective reality deployment)

**Your AI system deserves multiverse navigation too.**

## Features

- 🏷️ **Git tag-based versioning** - All versions stored as native Git tags
- 🔄 **Zero merge conflicts** - No version data in tracked files
- 🎯 **Automatic component detection** - Smart file pattern recognition for prompts, scripts, configs, agents, and ensembles
- 🤖 **AI-powered commit messages** - OpenAI integration for intelligent commit descriptions
- 📦 **Independent component versions** - Version and deploy components separately
- 🎭 **TypeScript ensemble support** - Version TypeScript workflow definitions alongside YAML
- 🚀 **Deployment tag management** - Moveable tags for staging, prod, etc.
- ⚡ **Native Git performance** - Zero overhead, pure Git operations
- 🔒 **Immutable version history** - Git tags preserve all versions forever

## Conductor Integration

Edgit powers [Conductor](https://github.com/ensemble-edge/conductor)'s component loading system, enabling versioned templates, prompts, and configurations at the edge.

### Templates in Conductor

Deploy HTML, Email, and PDF templates with instant versioning:

```yaml
# ensemble.yaml
agents:
  - name: send-welcome
    operation: email
    config:
      # Load versioned template from Edgit
      template: template://welcome-email@v1.0.0
      data:
        name: ${input.userName}
        appName: "MyApp"
```

**Workflow:**
```bash
# Register template in Edgit
edgit components add welcome-email templates/email/welcome.html template

# Version it
edgit tag create welcome-email v1.0.0

# Deploy to Cloudflare KV (used by Conductor)
edgit deploy set welcome-email v1.0.0 --to production

# A/B test new version
edgit tag create welcome-email v2.0.0
# Use both: template://welcome-email@v1.0.0 and template://welcome-email@v2.0.0
```

### Prompts in Conductor

Version AI prompts for Think agents:

```yaml
# ensemble.yaml
agents:
  - name: analyze-company
    operation: think
    config:
      # Load versioned prompt from Edgit
      prompt: prompt://company-analysis@v2.0.0
      provider: anthropic
      model: claude-3-5-sonnet-20241022
      data:
        company_name: ${input.companyName}
        industry: ${input.industry}
```

**Workflow:**
```bash
# Register prompt in Edgit
edgit components add company-analysis prompts/company-analysis.md prompt

# Version it
edgit tag create company-analysis v1.0.0

# Deploy to edge
edgit deploy set company-analysis v1.0.0 --to production

# Iterate rapidly - update prompt without redeploying code
edgit tag create company-analysis v1.1.0
edgit deploy set company-analysis v1.1.0 --to production
```

### Ensembles in Conductor

Version TypeScript workflow definitions:

```typescript
// ensembles/company-intel.ts
import { createEnsemble, step } from '@ensemble-edge/conductor'

export default createEnsemble('company-intel')
  .addStep(
    step('analyze')
      .operation('think')
      .config({ prompt: 'Analyze the company...' })
  )
  .build()
```

**Workflow:**
```bash
# Register TypeScript ensemble in Edgit
edgit components add company-intel ensembles/company-intel.ts ensemble

# Version it
edgit tag create company-intel v1.0.0

# Deploy to edge
edgit deploy set company-intel v1.0.0 --to production

# A/B test versions - old YAML vs new TypeScript
# ensemble://company-intel@v1.0.0 (YAML)
# ensemble://company-intel@v2.0.0 (TypeScript)
```

### Why Edgit + Conductor?

**Instant Updates at the Edge**
- Update templates/prompts/ensembles without rebuilding your application
- Zero-downtime deployments - new versions load instantly
- Components cached globally at Cloudflare edge (1-hour TTL default)

**Multiverse Testing**
- Run multiple template versions simultaneously (A/B testing)
- Test prompt improvements in staging while prod uses stable version
- Mix and match component versions freely

**Component Independence**
- Version templates separately from prompts and code
- Update email template without touching API logic
- Each component evolves at its own pace

**Edge Performance**
```typescript
// Components loaded via ComponentLoader with edge caching
const componentLoader = createComponentLoader({
  kv: env.COMPONENTS,        // Cloudflare KV namespace
  cache: repositoryCache,    // Edge cache (1 hour default)
  logger: context.logger
});

// Load with custom cache settings
const template = await componentLoader.load(
  'template://welcome-email@v1.0.0',
  { cache: { ttl: 86400 } }  // Cache for 24 hours
);
```

### Component Protocols

Conductor's ComponentLoader supports multiple protocols powered by Edgit:

- `template://` - HTML/Email/PDF templates
- `prompt://` - AI prompts for Think agents
- `script://` - JavaScript/TypeScript code for Code agents
- `query://` - SQL queries for Data agents
- `config://` - Configuration objects
- `schema://` - JSON Schema definitions
- `ensemble://` - Workflow definitions (YAML or TypeScript)
- `agent://` - Agent definitions and handlers

All protocols use the same URI format: `{protocol}://{path}[@{version}]`

### Learn More

- **[Versioning Guide](https://docs.ensemble.ai/edgit/guides/versioning-components-agents)** - Version components and agents
- **[Conductor HTML Operation](https://docs.ensemble.ai/conductor/operations/html)** - Using templates in HTML/Email/PDF generation
- **[Starter Kit](https://docs.ensemble.ai/conductor/starter-kit/overview)** - Production-ready agents and ensembles

## Quick Start

```bash
cd your-repo
npx @ensemble-edge/edgit init
```

**See the multiverse in action:**
```bash
# Edit a component file
echo "You are a helpful assistant" > prompts/helper.prompt.md

# Commit with AI-generated message (optional)
edgit commit
# Creates Git commit: "feat: add helper prompt initial implementation"

# Create a portal to this version
edgit tag create helper-prompt v1.0.0
# Creates Git tag: components/helper-prompt/v1.0.0

# Deploy to production reality
edgit deploy set helper-prompt v1.0.0 --to prod
# Creates/moves Git tag: components/helper-prompt/prod → v1.0.0

# Navigate the multiverse - see all versions
edgit tag list helper-prompt
# v1.0.0  (Portal created: 2024-10-31, SHA: abc1234)

# See which reality is deployed where
edgit deploy status helper-prompt
# prod:    v1.0.0 (this reality)
# staging: (exploring other possibilities)

# Or see everything at once with components list
edgit components list --format tree
# helper-prompt (prompt)
# └── v1.0.0 [prod]  ← Your component is deployed!
```

**Advanced multiverse navigation:**
```bash
# All operations are pure Git portals under the hood
git tag -l "components/helper-prompt/*"    # List all realities
git show components/helper-prompt/v1.0.0   # Peek into a specific reality
git tag -d components/helper-prompt/v1.0.0 # Close a portal (careful!)

# Deploy by moving between realities (atomic operations)
git tag -f components/helper-prompt/prod components/helper-prompt/v1.0.0
git push origin --tags                     # Sync multiverse with remote
```

## Git Tag Architecture: Multiverse Navigation System

### Why Git Tags Make Perfect Multiverse Portals

**Git tags solve the fundamental problems of multiverse navigation:**

1. **No Reality Conflicts**: Tags exist outside the file tree - no merge conflicts between realities
2. **Immutable History**: Once created, version portals never change - every reality is preserved  
3. **Native Git**: Uses Git's built-in multiverse primitives (it was designed for this!)
4. **Distributed**: Portals sync naturally with Git remotes across the distributed multiverse
5. **Atomic Operations**: Portal creation/movement is atomic - no broken realities
6. **Performance**: No overhead - pure Git operations at the speed of light

### Portal Namespace Design

```bash
# Version portals (immutable doorways to specific realities)
components/<component-name>/<version>
components/helper-prompt/v1.0.0    ← Portal to the perfect prompt reality
components/data-agent/v2.1.3       ← Portal to the stable agent timeline

# Deployment portals (moveable - can point to different realities) 
components/<component-name>/<environment>
components/helper-prompt/prod      → currently points to v1.0.0 reality
components/helper-prompt/staging   → exploring v1.1.0-beta timeline  
components/data-agent/prod         → locked into v2.1.3 stable reality
```

### Component Discovery Across the Multiverse

Edgit automatically detects component realities by file patterns:
```bash
# Ensemble Definitions (NEW!)
ensembles/**/*.ts    → TypeScript ensemble workflows
ensembles/**/*.yaml  → YAML ensemble files
ensembles/**/*.yml   → YAML ensemble files
**/*.ensemble.ts     → Files with .ensemble.ts extension
**/*.ensemble.yaml   → Files with .ensemble.yaml extension

# Agent Definitions
agents/**/agent.yaml  → YAML agent definitions
agents/**/agent.yml   → YAML agent definitions
agents/**/index.ts    → TypeScript agent handlers (NEW!)
agents/**/*.ts        → TypeScript files in agents directory (NEW!)
**/*.agent.yaml       → Agent files anywhere
**/*.agent.yml        → Agent files anywhere

# Prompt Components
prompts/**/*        → prompt component multiverse
*.prompt.md         → prompt files anywhere
instructions/**/*   → instruction templates
templates/**/*      → template files

# Script Components
scripts/**/*.js     → JavaScript scripts
scripts/**/*.ts     → TypeScript scripts
scripts/**/*.py     → Python scripts
scripts/**/*.sh     → Shell scripts
scripts/**/*.bash   → Bash scripts
*.script.*          → Script files anywhere

# SQL Components
queries/**/*        → sql component reality
sql/**/*           → SQL directories
database/**/*      → database files
*.sql              → SQL files anywhere
*.query.*          → query files

# Config Components
configs/**/*        → config component dimension
config/**/*        → configuration directories
settings/**/*      → settings files
*.config.*         → config files anywhere
*.yaml, *.yml      → YAML configurations
*.json             → JSON configurations
*.toml, *.ini      → Other config formats
```

### Intelligent Collision Detection

Edgit prevents component naming conflicts with smart collision detection:

```bash
# When conflicts are detected
❌ Component name collision detected: "auth-prompt" already exists.
   Suggested alternatives: auth-prompt-2, auth-prompt-3, auth-prompt-new
   File: prompts/duplicate-auth.prompt.md

# Automatic suggestions include:
• Numbered variants: component-2, component-3
• Descriptive suffixes: component-new, component-alt, component-v2
• Smart type detection: prevents "prompt-prompt" duplicates
```

**Collision Protection Features:**
- **Fail-fast approach**: Stops initialization rather than silent overwrites
- **Helpful suggestions**: Provides ready-to-use alternative names
- **Registry awareness**: Checks existing components before naming
- **Smart suffix detection**: Avoids duplicate type suffixes

### Workflow Integration: Seamless Multiverse Travel

```bash
# Your existing Git workflow stays the same
git add .
git commit -m "update prompt"
git push

# Add Edgit multiverse navigation when ready
edgit tag create my-prompt v1.0.0    # Create immutable portal
edgit deploy set my-prompt v1.0.0 --to prod  # Deploy to production reality

# All portals live in Git tags - zero files touched, zero conflicts
```

## Commands Reference

### Core Commands

```bash
# Initialize repository
edgit init [--force]

# Component management
edgit components list [options]     # List components with version info
edgit components show <component>   # Show component details

# Version management
edgit tag create <component> <version>    # Create version tag
edgit tag list [component]                # List versions
edgit tag show <component> <version>      # Show version details
edgit tag delete <component> <version>    # Delete version

# Deployment management
edgit deploy set <component> <version> --to <env>  # Deploy version
edgit deploy status [component]                    # Show deployments
edgit deploy list                                  # List all deployments
edgit deploy promote <component> <from> <to>       # Promote between envs

# Commit assistance (optional)
edgit commit [-m message]           # AI-assisted or manual commit
```

### Component Listing: Navigate Your Multiverse

The `edgit components list` command provides powerful views into your component multiverse with multiple output formats and filtering options.

**Basic Usage:**
```bash
# Show all components with their versions (table format)
edgit components list

# Output:
Component       Type    Latest Version  Versions  Deployment
---------------------------------------------------------
helper-prompt   prompt  v2.1.0          5         prod: v2.1.0, staging: v2.0.0
data-agent      agent   v3.0.0          12        prod: v2.1.3
auth-query      sql     v1.5.0          3         prod: v1.5.0
api-config      config  v1.0.0          1         (none)
```

**Output Formats:**
```bash
# JSON output (for scripts and automation)
edgit components list --format json
# Returns structured JSON with full version history

# YAML output (for configuration)
edgit components list --format yaml
# Clean YAML format for easy reading

# Tree output (visual hierarchy with deployment indicators)
edgit components list --format tree
# Shows component versions in tree structure with deployment tags

# Table output (default, human-readable)
edgit components list --format table
# Formatted table with columns
```

**Tree Format with Deployment Indicators:**
```bash
edgit components list --format tree

# Output shows deployment status inline:
helper-prompt (prompt)
├── v2.1.0 [prod, staging]  ← Currently deployed
├── v2.0.0 [dev]
├── v1.5.0
├── v1.0.0
└── v0.9.0

data-agent (agent)
├── v3.0.0 [staging]        ← Testing in staging
├── v2.1.3 [prod]           ← Stable in production
└── v2.0.0
```

**Filtering by Component Type:**
```bash
# Show only prompts
edgit components list --type prompt

# Show only agents
edgit components list --type agent

# Show only SQL components
edgit components list --type sql

# Show only config components
edgit components list --type config
```

**Version Filtering:**
```bash
# Show only components with version tags
edgit components list --tags-only

# Show components that are untracked (files exist but not in registry)
edgit components list --untracked

# Show only tracked components (registered in .edgit/components.json)
edgit components list --tracked

# Limit number of versions shown per component
edgit components list --limit 3
```

**Combining Filters:**
```bash
# Show top 5 versions of prompt components with tags
edgit components list --type prompt --tags-only --limit 5

# Show untracked SQL files (potential new components)
edgit components list --type sql --untracked

# JSON output of tracked agents
edgit components list --type agent --tracked --format json
```

**Practical Workflows:**

*Discover Untracked Components:*
```bash
# Find component files that aren't registered yet
edgit components list --untracked

# Output shows detected but unregistered files:
Component         Type    Path                        Status
-----------------------------------------------------------
new-prompt       prompt  prompts/new.prompt.md       untracked
helper-script    agent   scripts/helper.sh           untracked
```

*Audit Version History:*
```bash
# See full version history in tree format
edgit components list --format tree

# Limit to recent versions for quick overview
edgit components list --limit 5 --format tree
```

*Check Deployment Status:*
```bash
# Table view shows which versions are deployed where
edgit components list --format table

# Tree view shows deployment tags inline with versions
edgit components list --format tree
```

*Export for Scripts:*
```bash
# Get component data as JSON for automation
edgit components list --format json > components.json

# Filter and process with jq
edgit components list --format json | jq '.[] | select(.type == "prompt")'
```

**Output Format Details:**

*Table Format (Default):*
- Shows: Component name, type, latest version, version count, deployment status
- Best for: Quick human-readable overview
- Deployment column shows: `env: version` format

*JSON Format:*
- Full structured data including all versions and deployments
- Best for: Scripting, automation, programmatic access
- Includes: name, type, path, versions array, deployments object

*YAML Format:*
- Clean, readable structured format
- Best for: Configuration files, documentation
- Easy to copy/paste into YAML configs

*Tree Format:*
- Visual hierarchy showing version relationships
- Deployment indicators shown inline: `v1.0.0 [prod, staging]`
- Best for: Understanding version history and deployment flow

### Component Discovery Commands

Edgit provides powerful discovery tools to find and analyze potential components in your repository:

**Scan for Components:**
```bash
# Scan all files in repository (tracked and untracked)
edgit discover scan

# Scan only git-tracked files
edgit discover scan --tracked-only

# Filter by component type
edgit discover scan --type prompt
edgit discover scan --type agent

# Scan specific file patterns
edgit discover scan --pattern "*.md"
edgit discover scan --pattern "scripts/**/*.py"

# Show only files with version headers
edgit discover scan --with-headers

# Output formats
edgit discover scan --output json
edgit discover scan --output simple
```

**Analyze Specific Files:**
```bash
# Get detailed analysis of a specific file
edgit discover detect prompts/my-prompt.md

# Shows: component type, confidence level, suggested name, patterns matched
```

**Manage Detection Patterns:**
```bash
# List all detection patterns
edgit discover patterns list

# Add custom pattern
edgit discover patterns add prompt "*.prompt.txt"
edgit discover patterns add agent "workers/**/*.ts"

# Remove pattern
edgit discover patterns remove prompt "*.old.md"
```

**Discovery vs Components List:**

- `edgit discover scan` - Analyzes **all files** to find potential components
- `edgit components list --untracked` - Shows files detected but **not yet registered**

```bash
# Full discovery workflow
edgit discover scan --type prompt          # Find all prompt-like files
edgit components list --untracked          # See which ones aren't registered yet
edgit init --force                         # Register discovered components
edgit components list --format tree        # View your complete component registry
```

### AI Integration Setup

Configure OpenAI for intelligent commit message generation:

```bash
# Add your OpenAI API key to .env
echo "OPENAI_API_KEY=sk-proj-..." >> .env

# AI will analyze your changes and generate contextual commits
edgit commit
# Example output: "feat(auth-prompt): enhance security with MFA token support"

# Manual override still available
edgit commit -m "your custom message"
```

**AI Commit Features:**
- **Context-aware analysis**: Understands component types and changes
- **Conventional commit format**: Follows standard commit conventions
- **Component scope detection**: Automatically identifies affected components
- **Fallback gracefully**: Works without API key (manual mode)

### Legacy Commands (Deprecated)

These commands now provide migration guidance:
```bash
edgit history    # → Use: edgit tag list <component>
edgit register   # → Use: edgit init --force  
edgit resync     # → Use: edgit init --force
```

## Requirements

- **Node.js** 18+ 
- **Git** 2.0+
- Works with any Git repository

*Note: Global npm installation now works correctly with built JavaScript files.*

## Migration from Legacy Versions

If you're upgrading from a pre-Git-tag version of Edgit:

```bash
# Your old component registry is preserved  
# but versions now live in Git tags

# Reinitialize to discover components
edgit init --force

# Create tags for your existing components
edgit tag create my-component v1.0.0

# Deploy using the new tag system
edgit deploy set my-component v1.0.0 --to prod
```

**Benefits of Migration:**
- ✅ Zero merge conflicts going forward
- ✅ Better performance (no JSON parsing)
- ✅ Native Git operations
- ✅ Immutable version history
- ✅ Easier debugging and inspection

## Technical Details

### Enhanced Error Handling & User Experience

Edgit provides comprehensive error handling with actionable guidance:

```bash
# Component naming conflicts
❌ Component name collision detected: "auth-prompt" already exists.
   Suggested alternatives: auth-prompt-2, auth-prompt-3, auth-prompt-new
   File: prompts/duplicate-auth.prompt.md

# Version tag conflicts  
❌ Version tag already exists: components/my-component/v1.0.0
   Use --force to overwrite or choose a different version

# Deployment validation
❌ Cannot deploy: version v2.0.0 does not exist for component "my-component"
   Available versions: v1.0.0, v1.1.0
   Create version first: edgit tag create my-component v2.0.0
```

### Enhanced Component Type Detection

**Ensemble Support (NEW)**: TypeScript and YAML workflow definitions
```bash
# Ensemble patterns
ensembles/**/*.ts    → TypeScript ensembles in ensembles directory
ensembles/**/*.yaml  → YAML ensembles in ensembles directory
ensembles/**/*.yml   → YAML ensembles (alternative extension)
**/*.ensemble.ts     → Files with .ensemble.ts extension
**/*.ensemble.yaml   → Files with .ensemble.yaml extension
```

**Expanded Agent Support**: TypeScript handlers and shell scripting
```bash
# Agent definition patterns
agents/**/agent.yaml  → YAML agent definitions
agents/**/agent.yml   → YAML agent definitions
agents/**/index.ts    → TypeScript agent handlers (NEW!)
agents/**/*.ts        → TypeScript files in agents directory (NEW!)
**/*.agent.yaml       → Agent files anywhere
**/*.agent.yml        → Agent files anywhere
```

**Script Components**: Multiple languages supported
```bash
# Script patterns
scripts/**/*.js     → JavaScript scripts
scripts/**/*.ts     → TypeScript scripts
scripts/**/*.py     → Python scripts
scripts/**/*.sh     → Shell scripts
scripts/**/*.bash   → Bash scripts
*.script.*          → Script files anywhere
```

**Smart Pattern Matching**: Comprehensive file pattern recognition
```bash
# Prompt patterns
prompts/**/*        → Dedicated prompts directory
*.prompt.md         → Prompt files anywhere
instructions/**/*   → Instruction templates
templates/**/*      → Template files

# Configuration patterns
configs/**/*        → Configuration directories
settings/**/*       → Settings files
*.config.*         → Config files with .config. in name
*.yaml, *.yml      → YAML configuration files
*.json             → JSON configuration files
*.toml, *.ini      → Additional config formats

# SQL patterns
queries/**/*        → SQL query directories
sql/**/*           → SQL directories
database/**/*      → Database-related files
*.sql              → SQL files anywhere
*.query.*          → Query files with .query. in name
```

### Component Name Collisions

**Problem**: Multiple files generate the same component name
```bash
❌ Component name collision detected: "auth-prompt" already exists.
```

**Solutions**:
```bash
# Option 1: Use suggested alternatives
# Rename one file using the suggestions provided

# Option 2: Use more specific naming
mv prompts/auth.prompt.md prompts/user-auth.prompt.md
mv prompts/admin-auth.prompt.md prompts/admin-auth.prompt.md

# Option 3: Organize in subdirectories
mkdir prompts/user && mv prompts/auth.prompt.md prompts/user/auth.prompt.md
```

### AI Commit Issues

**Problem**: AI commits failing or generating poor messages
```bash
# Check API key setup
cat .env | grep OPENAI_API_KEY

# Test with manual fallback
edgit commit -m "manual commit message"

# Debug mode (if available)
DEBUG=true edgit commit
```

### Git Tag Management

**Problem**: Deployment showing wrong versions
```bash
# Check what tags actually exist
git tag -l "components/*"

# Verify tag points to expected commit
git show components/my-component/v1.0.0

# Fix deployment tag if needed
edgit deploy set my-component v1.0.0 --to prod
```

### Performance Issues

**Problem**: Slow component detection in large repositories
```bash
# Limit scan scope (if many files)
# Focus on specific directories during init

# Use .gitignore to exclude irrelevant files
echo "node_modules/" >> .gitignore
echo "dist/" >> .gitignore
```

### Migration Problems

**Problem**: Upgrading from legacy Edgit versions
```bash
# Backup existing registry
cp .edgit/components.json .edgit/components.json.backup

# Force reinitialize with new system
edgit init --force

# Recreate tags for existing components
edgit tag create my-component v1.0.0
```

## Advanced Scenarios

### Tag Format Specification

```bash
# Version tags (immutable)
components/{component-name}/{semantic-version}
- Must follow semver: v1.0.0, v2.1.3-beta, etc.
- Immutable once created
- Points to specific Git SHA

# Deployment tags (moveable)
components/{component-name}/{environment-name}  
- Can be any environment name: prod, staging, dev, etc.
- Moveable - can point to different versions
- Atomic updates via Git tag operations
```

### Implementation Notes

- **Registry File**: Minimal `components.json` contains only `{path, type}` per component
- **Version Storage**: All versions stored as Git tags only
- **Conflict Resolution**: Impossible - no version data in tracked files  
- **Performance**: O(1) tag operations, no file I/O for versions
- **Backup**: Automatic via Git - tags sync with remotes

### Integration with Git Workflows

Edgit is designed to integrate seamlessly:

```bash
# Works with any Git workflow
git flow init
git flow feature start new-prompt
# ... edit files ...
edgit commit                        # Optional AI commit
git flow feature finish new-prompt  
edgit tag create my-prompt v1.1.0   # Version when ready

# Works with GitHub/GitLab workflows  
git checkout -b feature/new-agent
# ... edit files ...
git push origin feature/new-agent
# ... merge PR ...
edgit tag create my-agent v2.0.0    # Version on main
```

## Documentation

- 📖 **[Full Documentation](https://docs.ensemble.ai/edgit/overview)** - Complete guides and API reference
- 🚀 **[Getting Started](https://docs.ensemble.ai/edgit/getting-started/installation)** - Detailed setup and first steps
- 🔀 **[Versioning Guide](https://docs.ensemble.ai/edgit/guides/versioning-components-agents)** - Component versioning patterns
- 💡 **[Examples](./examples/)** - Real-world usage patterns

## Development & Contributing

We welcome contributions! The project has comprehensive development infrastructure to ensure code quality and maintainability.

### Development Setup

```bash
# Clone and install
git clone https://github.com/ensemble-edge/edgit.git
cd edgit
npm install

# Build
npm run build

# Run tests
npm test

# Run validation (types, lint, format, build, tests)
npm run validate
```

### Documentation for Contributors

- **[CLAUDE.md](./CLAUDE.md)** - Guidance for AI assistants working on the codebase
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Complete developer setup and workflow guide
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - Contribution guidelines and standards
- **[TESTING.md](./TESTING.md)** - Testing strategy and patterns

### Code Quality Tools

The project uses modern development tools:

- **TypeScript** - Strict mode enabled, no `any` types
- **ESLint** - TypeScript-focused linting with strict rules
- **Prettier** - Consistent code formatting
- **Vitest** - Fast, modern testing framework
- **VSCode Integration** - Settings and extensions configured

### Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

**Test Coverage:**
- 16 integration tests covering critical paths
- TestGitRepo helper for isolated Git operations
- Fixtures for all component types

### Code Style

- **Commits**: Follow [Conventional Commits](https://www.conventionalcommits.org/)
- **Formatting**: 2 spaces, single quotes, no semicolons
- **TypeScript**: Explicit return types, no `any`
- **Documentation**: JSDoc comments for all public APIs

### Contributing Workflow

1. Fork and clone the repository
2. Create a feature branch (`feature/your-feature`)
3. Make changes following code standards
4. Run `npm run validate` to verify
5. Commit using conventional commit format
6. Push and create a pull request

See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed guidelines.

## Versioning

This project is in beta and follows semantic versioning with pre-1.0 conventions:

- **Current Phase**: Beta (`0.x.x`)
  - Minor versions (`0.X.0`) may contain breaking changes
  - Patch versions (`0.0.X`) for backwards-compatible fixes
  - We'll stay in `0.x` until the API is stable

- **Future**: Stable (`1.0.0+`)
  - Standard semver: breaking.feature.fix
  - Breaking changes only in major versions

## Community & Support

- 🐛 **Issues** - [Report bugs or request features](https://github.com/ensemble-edge/edgit/issues)
- 💬 **Discussions** - [Community discussions and Q&A](https://github.com/ensemble-edge/edgit/discussions)
- 📧 **Contact** - [hello@ensemble.ai](mailto:hello@ensemble.ai)

## License


MIT - see [LICENSE](LICENSE) file for details.

## Trademark

Ensemble® is a registered trademark of Higinio O. Maycotte.
