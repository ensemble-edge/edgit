# Repository Synchronization Strategy

## Repository Overview

| Repository | Purpose | License | Release Method | Visibility |
|------------|---------|---------|----------------|------------|
| edgit | Component registry & Git management | MIT | NPX package | Public |
| conductor | AI orchestration platform | Apache 2.0 | NPX package | Public |
| docs | Central documentation hub | MIT | Static site | Public |
| cloud | Enterprise cloud services | Proprietary | Cloud deployment | Private |
| examples | Usage examples & templates | MIT | Reference only | Public |

## Synchronization Strategy

### Core Principle
Maintain consistency across public-facing repositories while respecting:
- License differences (MIT vs Apache 2.0)
- Privacy requirements (cloud repo)
- Package distribution needs (npx for edgit/conductor)
- Organizational standards and planning documents

### File Categories to Synchronize

#### 1. Planning & Standards
Organizational planning and standards documents:
- `.planning/standards/` - Engineering and operational standards
  - `code-review.md` - Code review process
  - `architecture.md` - Architecture principles
  - `security.md` - Security standards
  - `documentation.md` - Documentation requirements
  - `release.md` - Release process
  - `testing.md` - Testing requirements

#### 2. Community Standards
Files that define how people interact with the project:
- `CODE_OF_CONDUCT.md` - Community behavior standards
- `CONTRIBUTING.md` - How to contribute
- `SECURITY.md` - Security policy and reporting
- `SUPPORT.md` - How to get help

#### 3. GitHub Configuration
Standardized GitHub workflows and templates:
- `.github/ISSUE_TEMPLATE/` - Issue templates
- `.github/PULL_REQUEST_TEMPLATE.md` - PR template  
- `.github/workflows/security.yml` - Security scanning
- `.github/dependabot.yml` - Dependency updates

#### 4. Development Standards
Consistent development experience across repos:
- `.editorconfig` - Editor settings
- `.prettierrc` - Code formatting
- `.eslintrc.js` - Linting rules  
- `commitlint.config.js` - Commit message format
- `.nvmrc` - Node version

#### 5. Legal & Compliance
- `LICENSE` - Varies by repo (MIT vs Apache 2.0)
- `NOTICE` - Required for Apache 2.0 (conductor only)
- `COPYRIGHT` - Copyright notices (standardized format)

### Files NOT to Synchronize

#### Repository-Specific Files
- `.gitignore` - Each repo has unique build artifacts and dependencies
- `package.json` - Different dependencies and scripts
- `README.md` - Unique to each project's purpose
- `tsconfig.json` - May vary based on build targets
- `.npmrc` - Publishing configuration differs

#### Release-Specific Files
For npx-enabled repos (edgit, conductor):
- `bin/` directory - CLI entry points
- `dist/` or `build/` configuration
- `.npmignore` - Package-specific excludes
- `release.config.js` - Release automation

## Copyright & Trademark Standards

### Copyright Format
All repositories must use this copyright format:
```
Copyright (c) 2024-2025 Higher Order Capital
All rights reserved.
```

Update yearly to: `2024-[CURRENT_YEAR]`

### Trademark Notice
Include in appropriate locations (README files, documentation, website footers):
```
Ensemble® is a registered trademark of Higinio O. Maycotte.
```

### License Headers

**MIT Licensed Files** (edgit, docs, examples):
```
Copyright (c) 2024-2025 Higher Order Capital

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
[rest of MIT license]
```

**Apache 2.0 Licensed Files** (conductor):
```
Copyright 2024-2025 Higher Order Capital

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License...
[rest of Apache 2.0 header]
```

**NOTICE file for Apache 2.0** (conductor only):
```
Ensemble Conductor
Copyright 2024-2025 Higher Order Capital

This product includes software developed at Higher Order Capital.
Ensemble® is a registered trademark of Higher Order Capital.
```

### README Trademark Section
Include in all public repository READMEs:
```markdown
## License

[License Type] - see [LICENSE](LICENSE) file for details.

## Trademark

Ensemble® is a registered trademark of Higher Order Capital.
```

## Synchronization Approach

### 1. Master Repository
Use `ensemble-edge/.github` as source of truth for:
- Organizational defaults (automatically applied by GitHub)
- `.planning/standards/` directory (must be manually synced)
- Copyright and trademark templates

### 2. Planning Standards Directory

Structure for `.planning/standards/`:
```
.planning/
└── standards/
    ├── README.md              # Index of standards
    ├── code-review.md         # Code review process
    ├── architecture.md        # Architecture principles
    ├── security.md           # Security requirements
    ├── documentation.md      # Documentation standards
    ├── release.md            # Release process
    └── testing.md            # Testing requirements
```

These documents should be:
- Identical across all repositories
- Updated only in master repository
- Synced via automated workflow
- Reviewed quarterly by engineering leadership

### 3. Override Strategy
Each repo can override organizational defaults by creating local versions. Local files always take precedence except for `.planning/standards/` which should remain synchronized.

### 4. License Handling
```
MIT repos (edgit, docs, examples):
- Standard MIT LICENSE file
- COPYRIGHT file with Higher Order Capital

Apache 2.0 repo (conductor):  
- Apache 2.0 LICENSE file
- NOTICE file with trademark notice
- COPYRIGHT file with Higher Order Capital

Private repo (cloud):
- No public LICENSE file
- Internal COPYRIGHT notice only
```

### 5. NPX Package Considerations

For edgit and conductor:
- Ensure `bin` field in package.json points to CLI entry
- Include copyright header in CLI entry files
- Display trademark notice in CLI help text
- Maintain backward compatibility in CLI commands

## Maintenance Cadence

### Automated Checks
- Weekly: Verify file consistency across repos
- Weekly: Verify `.planning/standards/` synchronization
- On PR: Check if synchronized files are modified
- On Release: Ensure legal files are current

### Manual Reviews
- Monthly: Review and update shared templates
- Quarterly: Review `.planning/standards/` documents
- Yearly: Update COPYRIGHT years (January)

## Implementation Notes

### Quick Sync Check
Look for these indicators of drift:
1. Different Code of Conduct versions
2. Inconsistent security contact information
3. Varying contribution processes
4. Outdated copyright years
5. Missing trademark notices
6. Out-of-sync `.planning/standards/` files

### Priority Order
When bringing repos into sync:
1. Security and legal files (highest priority)
2. `.planning/standards/` directory
3. Community standards
4. GitHub templates
5. Development tooling

### Special Considerations

**NPX Packages** (edgit, conductor):
- Include copyright in package.json
- Display trademark notice in `--version` output
- Test `npx` command after each release
- Document minimum Node version

**Documentation Repo**:
- Prominent trademark notice on homepage
- Copyright in footer of all pages
- Legal section in documentation

**Cloud Repo**:
- Exclude from public synchronization
- Maintain separate internal standards
- Include enterprise license terms

## Success Metrics

- All repos have current copyright (2024-[CURRENT_YEAR])
- Trademark notices present in all public repos
- `.planning/standards/` identical across all repos
- All public repos have consistent community standards
- Security reporting process is identical across repos
- Development tooling provides same experience
- Legal compliance maintained per license type
- NPX packages remain installable and executable

## Yearly Tasks

### January Updates
1. Update all COPYRIGHT files to include new year
2. Update NOTICE files (Apache 2.0 repos)
3. Update LICENSE copyright years if embedded
4. Verify trademark notices are current
5. Sync changes across all repositories

---

**Goal**: A contributor moving between repos should find familiar processes, standards, and legal notices while respecting each project's unique requirements. All work should properly attribute Higher Order Capital and protect the Ensemble® trademark.