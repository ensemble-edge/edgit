# .planning Directory

This directory contains planning documents, development standards, and strategic planning materials organized into three areas.

## Structure

```
.planning/
├── README.md                    # This file
│
├── todos/                      # Tactical: Day-to-day tasks
│   ├── README.md
│   ├── current-tasks.md
│   └── backlog.md
│
├── strategy/                   # Strategic: Long-term planning
│   ├── README.md
│   ├── CHECKPOINT.md
│   ├── PHASE0_SUMMARY.md
│   ├── PHASE1_PLAN.md
│   ├── PHASE1_PROGRESS.md
│   └── SETUP_COMPLETE.md
│
└── standards/                  # Reference: Guidelines & checklists
    ├── README.md
    ├── code-review-standard.md
    └── architecture-decisions/
```

## Purpose

Store working documents organized by type:

### Strategy (`strategy/`)
Long-term planning and project direction:
- Phase summaries and plans
- Project checkpoints and milestones
- Roadmaps and vision documents
- Architecture decision records

### Todos (`todos/`)
Day-to-day task management:
- Current work items
- Backlog and future tasks
- Bug tracking
- Quick action items

### Standards (`standards/`)
Reusable reference materials:
- Code review checklists
- Development guidelines
- Testing standards
- Security requirements

## Usage

### For Developers
- Use `strategy/` and `standards/` for team-wide planning and guidelines (committed to Git)
- Use `todos/` for personal notes and task lists (local-only, not committed)

### For AI Assistants
**IMPORTANT**: When creating planning documents, summaries, or phase reports, ALWAYS place them in the appropriate `.planning/` subdirectory:

**Strategic planning** → `.planning/strategy/`
```bash
# ✅ Good - Committed to Git for team
.planning/strategy/PHASE0_SUMMARY.md
.planning/strategy/CHECKPOINT.md
.planning/strategy/roadmap-2024.md
```

**Development standards** → `.planning/standards/`
```bash
# ✅ Good - Committed to Git for team
.planning/standards/code-review-standard.md
.planning/standards/architecture-decisions/adr-001.md
```

**Personal tasks** → `.planning/todos/`
```bash
# ✅ Good - Local only, not committed
.planning/todos/current-tasks.md
.planning/todos/backlog.md
```

**Never in project root:**
```bash
# ❌ Bad (don't put these in root or src/)
PHASE0_SUMMARY.md
TODO.md
NOTES.md
```

## Git and NPM Strategy

### Committed to Git
The following subdirectories are committed to the repository for team collaboration:
- **`strategy/`** - Phase planning, checkpoints, project history
- **`standards/`** - Code review standards, architecture decisions, team guidelines

### Local Only (Not Committed)
The following stays in `.gitignore` and is never committed:
- **`todos/`** - Personal task lists, work-in-progress notes, individual planning

### Excluded from npm
The entire `.planning/` directory is in `.npmignore` - users installing the package don't need internal planning documents

## Exceptions

Public-facing documentation should still go in the appropriate places:
- User docs: `README.md`, `docs/`
- Contributor docs: `CONTRIBUTING.md`, `DEVELOPMENT.md`, `TESTING.md`
- Architecture docs: `CLAUDE.md`
- Code docs: JSDoc comments in source files
