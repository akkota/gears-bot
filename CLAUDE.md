# CLAUDE.md

Follow all project rules in `AGENTS.md`.

This file exists to give Claude Code project-specific behavior instructions.

## Preferred Workflow

For every task:

1. Read `AGENTS.md`.
2. Read relevant files in `docs/developer/`.
3. Inspect the current implementation before editing.
4. Make a short plan.
5. Implement only the requested ticket.
6. Run:

```bash
pnpm typecheck
pnpm test
pnpm build