# Edgit Killer Features - Future Enhancements

Ideas for making edgit a no-brainer adoption tool on top of Git.

## Priority: High Impact, Low Effort

### 1. Onboarding & Discovery
**Goal:** Make it dead simple to get started

- [ ] `edgit migrate` - Scan existing repo and suggest components
  - Auto-detect prompts, agents, SQL files, configs
  - Generate initial `.edgit/components.json` with suggestions
  - Option to review before committing

- [ ] Interactive `edgit init` with examples
  - Explain concepts (components, tags, deployments)
  - Show example workflows
  - Ask user about their use case (AI workflows, SQL versioning, config management)

- [ ] `edgit quickstart` - Generate sample repo structure
  - Create example prompts/, agents/, queries/ directories
  - Add sample components with version tags
  - Include README with workflow examples

### 2. Visualization (Git tags are invisible!)
**Goal:** Make versioning visible and understandable

- [ ] `edgit log <component>` - Component version history
  - Show timeline of versions with commit messages
  - Display tag creation dates and authors
  - Highlight deployment tags (prod, staging)

- [ ] `edgit graph [component]` - Visual component version tree
  - ASCII/Unicode tree of versions and deployments
  - Show relationships between versions
  - Indicate current HEAD and deployment states

- [ ] `edgit diff <comp>@v1..v2` - Compare versions
  - Show file content differences between versions
  - Display metadata changes
  - Useful for understanding what changed in a release

### 3. Smart Workflows
**Goal:** Make common patterns one command

- [ ] `edgit release <component>` - All-in-one release
  - Auto-bump version (suggest based on changes)
  - Create immutable version tag
  - Push tags to remote
  - Update CHANGELOG if present

- [ ] `edgit hotfix <component>` - Quick patch workflow
  - Create patch version (v1.0.1)
  - Tag and push immediately
  - Deploy to specified environment

- [ ] `edgit deploy promote --all` - Bulk promotions
  - Promote all changed components between environments
  - Useful for "deploy everything in staging to prod"

- [ ] `edgit workspace sync` - Multi-repo workflows
  - Sync component versions across multiple repos
  - Useful for microservices sharing prompts/configs

### 4. CI/CD Integration
**Goal:** Drop-in automation templates

- [ ] GitHub Actions workflow generator
  - `edgit generate workflow github`
  - Auto-deploy on version tags
  - Component-specific pipelines

- [ ] Pre-commit hooks generator
  - `edgit generate hooks`
  - Validate component registry
  - Enforce version tag format
  - Check for uncommitted changes to tracked components

- [ ] Examples for common CI systems
  - GitHub Actions templates
  - GitLab CI examples
  - CircleCI configs
  - Jenkins pipelines

### 5. Component Dependencies & Impact Analysis
**Goal:** Understand component relationships

- [ ] Track component dependencies
  - Declare in components.json: `"dependencies": ["other-component"]`
  - Version compatibility constraints

- [ ] `edgit impact <component>` - Impact analysis
  - Show what components depend on this one
  - Warn about breaking changes
  - Suggest version bumps for dependents

- [ ] `edgit validate` - Compatibility checks
  - Check all dependency versions are compatible
  - Warn about mismatched deployments
  - Suggest fixes

## Priority: Nice to Have

### 6. Advanced Features

- [ ] `edgit snapshot` - Create point-in-time snapshots
  - Capture all component versions at once
  - Useful for "known good state"
  - Easy rollback to snapshot

- [ ] `edgit compare @snapshot1 @snapshot2` - Compare states
  - Show all component version changes between snapshots

- [ ] Component templates
  - `edgit template create <name>`
  - Reusable component structures
  - Versioned templates

### 7. Integration with AI Tools

- [ ] OpenAI/Anthropic prompt versioning helpers
  - Detect prompt files automatically
  - Track token counts across versions
  - A/B testing support

- [ ] LangChain integration
  - Export components for LangChain
  - Version LangChain prompts/chains

- [ ] Prompt playground integration
  - Quick test prompts at specific versions
  - Compare outputs across versions

## Decision: Focus on Conductor First

**Rationale:**
- Edgit provides solid foundation with current feature set
- Real value comes from AI orchestration (Conductor)
- Conductor will drive edgit adoption
- Can add edgit features based on conductor user feedback

**Next Steps:**
1. Ship conductor alpha
2. Get user feedback on edgit pain points
3. Prioritize features based on real usage patterns
