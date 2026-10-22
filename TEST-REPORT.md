# ShareVault Test Report

**Run date:** 2026-10-22  
**Environment:** Node.js 22, local Windows development environment

## Summary

| Check | Result | Details |
|---|---|---|
| Frontend component tests | PASS | 2 passed; auth guard coverage: 100% statements, branches, functions, and lines |
| Backend integration tests | PASS | 9 passed; tested middleware coverage: 100% lines, 100% branches, 94.12% functions |
| Playwright Chromium E2E | PASS | 1 passed; homepage title and primary heading are visible |
| Scoped ESLint | PASS | Tested auth flow, E2E test, Playwright config, and test setup |

## Coverage scope

Coverage figures apply only to the configured test scope, not the entire
ShareVault application. Frontend coverage is scoped to
`client/src/components/Auth/NotRequireAuth.jsx`. Backend reports cover the
authentication and request-validation middleware exercised by
`server/test/middleware.integration.test.js`.

## Tests exercised

- Signed-out visitors can access public routes.
- Signed-in visitors are redirected to the dashboard.
- Request body validation accepts valid input and rejects invalid input.
- Route parameter and query validation accepts valid input.
- Unexpected validation errors return the configured fallback response.
- Protected routes reject missing or invalid bearer tokens and accept a valid token.
- The public homepage loads in Chromium with the expected title and heading.

## Notes and limitations

- The tests use local requests and fixtures; they do not connect to MongoDB,
  AWS, or external AI services.
- The full-project ESLint command still reports existing lint violations
  outside the scoped test files; CI currently gates the tested flows.
- The browser run displayed an existing Browserslist data freshness warning.
