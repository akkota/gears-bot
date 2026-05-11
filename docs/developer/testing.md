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

## Notes

- Tests use Vitest.
- Keep tests deterministic and unit-focused.
- Add/expand tests whenever new helpers, services, or command flows are added.
