# ShareVault Test Report

**Run date:** 2026-10-23
**Environment:** Node.js 22, local Windows development environment

## Summary

| Check | Result | Details |
|---|---|---|
| Frontend component tests | PASS | 3 passed; auth guard coverage: 100% statements, branches, functions, and lines |
| Backend integration tests | PASS | 13 passed; middleware coverage: 100% lines, branches, and functions |
| Playwright Chromium E2E | PASS | 1 passed; homepage title and primary heading are visible |
| Frontend ESLint | PASS | Strict lint of all client source, tests, and configuration |
| Backend ESLint | PASS | Strict lint of all server source and integration tests |
| Reproducible installs | PASS | `npm ci` completed using both client and server lockfiles |
| Production frontend build | PASS | Vite build completed; existing bundle-size and Browserslist warnings remain |
| CI workflow YAML | PASS | Parsed; lint, test, build, and e2e jobs and triggers verified |

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
- Actual user API routes reject invalid registration data, protect profile access,
  and clear the session cookie on logout.
- The public homepage loads in Chromium with the expected title and heading.

## Notes and limitations

- The tests use local requests and fixtures; they do not connect to MongoDB,
  AWS, or external AI services.
- ESLint cleanup removed unused imports, added component prop contracts, fixed
  JSX text escaping, and corrected undefined chat assistant handlers/refs.
- Backend presigning fallbacks now log failures; an unnecessary duplicate
  database lookup before its error handler was removed.
- The browser run displayed an existing Browserslist data freshness warning.
- npm's production dependency audit reported 10 client advisories (1 critical,
  including transitive `form-data`) and 56 server advisories (3 critical,
  including direct `mongoose`). The CI workflow does not currently gate on these
  existing findings; review and resolve them before deployment.
- These checks were run locally. No GitHub Actions run or deployment has been
  performed as part of this report.
