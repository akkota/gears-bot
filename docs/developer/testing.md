# Testing

## Commands

Run these for each feature:

```bash
pnpm typecheck
pnpm test
pnpm build
```

## Current Tests

- `tests/permissions.test.ts`: verifies permission ranking helpers.
- `tests/projectSearch.test.ts`: Plan.io mapping, query matching, pagination custom ids.
- `tests/eswIntegrations.test.ts`: email ignore rules, calendar mapping, social post mapping.
- `tests/xpRanks.test.ts`: XP curve, rank selection, skip-multiple unlocks, max rank, `/rank` and `/xp` embeds.

## Notes

- Tests use Vitest.
- Keep tests deterministic and unit-focused.
- Add/expand tests whenever new helpers, services, or command flows are added.
