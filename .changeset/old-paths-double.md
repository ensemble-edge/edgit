---
"@ensemble-edge/edgit": major
---

**BREAKING CHANGES**: Component nomenclature refactor for agent/component separation

- Component types renamed: 'sql' → 'query', 'agent' → 'script'
- Added new 'agent-definition' component type for agent.yaml files
- Implemented dual Git tag namespaces: `components/{name}/{version}` and `agents/{name}/{version}`
- Updated all detection patterns with proper priority ordering
- Enhanced GitTagManager with EntityType support for both components and agents
- Zero backward compatibility - clean v0.3.0 release

This enables different deployment strategies: agents (compiled) vs components (storage-based).
