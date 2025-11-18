---
"@ensemble-edge/edgit": minor
---

Add template component support and standardize component system

**New Features:**
- Added `template` component type support across all edgit systems
- Template components now detected via file patterns (.hbs, .handlebars, .mjml, .liquid, .mustache, .ejs)
- AI commit message generation for template component changes
- Template confidence patterns for component detection (high/medium)

**Improvements:**
- Updated ComponentType to include all 6 component types: template, prompt, script, query, config, schema, agent-definition
- Enhanced component-detector with template patterns in templates/** directories
- Added componentTemplate and componentSchema to AI prompt templates
- Updated README with complete component protocol list (6 types)

**Component Detection:**
- High confidence: .hbs, .handlebars, .mjml, .liquid files and templates/ directories
- Medium confidence: .mustache, .ejs, .template.* files

**AI Commit Messages:**
- Template changes: focuses on HTML/markup structure, styling, layout, and dynamic variables
- Schema changes: focuses on JSON Schema structure, validation rules, and type definitions
