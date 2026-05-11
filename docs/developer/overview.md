
## `CLAUDE.md`

Paste this:

```md
# CLAUDE.md

Follow all project rules in `AGENTS.md`.

Preferred workflow:
1. Explore the relevant files.
2. Make a short plan.
3. Implement only the requested ticket.
4. Run `pnpm typecheck`, `pnpm test`, and `pnpm build`.
5. Update developer and user docs.
6. Summarize the diff.

Do not:
- rewrite unrelated files
- change architecture without approval
- add dependencies without approval
- expose secrets
- skip permission checks
- put Supabase queries directly in command files
- implement prefix commands

For code review tasks:
- do not modify files unless asked
- rank issues by severity
- focus on correctness, permissions, security, Discord API edge cases, and maintainability