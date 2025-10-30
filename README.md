# edgit

Component-atomic versioning for Git. It's Git, but it knows what changed.

## About

Edgit wraps Git to add component-level versioning while maintaining 100% Git compatibility. Every prompt, agent, model config, and SQL query gets its own version automatically. Zero learning curve - your git commands just get smarter.

## Features

- 🎯 Component detection on every commit
- 🔄 Individual version tracking for each component
- ⚡ Zero latency Git passthrough
- 📦 Test any version combination locally
- 🚀 Deploy to edge when ready

## Quick Start
```bash
npm install -g @ensemble-edge/edgit
edgit setup
# Now just use Git normally
```

## License

MIT
