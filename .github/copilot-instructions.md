# Project Guidelines

## Code Quality

- Write production-grade code at all times — no stubs, no placeholder logic, no `todo` comments left in final output
- Implement proper error handling everywhere: surface meaningful errors, never swallow exceptions silently
- Keep code clean and readable: clear naming, minimal nesting, single-responsibility functions
- Avoid dead code, unused imports, and unnecessary complexity

## Security

- Never hard-code credentials, API keys, tokens, secrets, or connection strings in source files
- All secrets and environment-specific values must be read from environment variables via `.env` files (never committed)
- Validate and sanitize all external inputs at system boundaries
- Follow OWASP Top 10 guidelines; flag and fix any insecure patterns immediately

## Post-Code Verification

After completing any code changes, always run the following checks before considering the task done:

**Frontend (Next.js / TypeScript):**
```
npm run lint
npx tsc --noEmit
```

**Backend (Rust):**
```
cargo run
```

Fix all errors and test failures before marking work as complete.

## Environment Configuration
- Use `.env` files for all environment-specific configuration
