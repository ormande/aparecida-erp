# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev              # Start dev server with .env
npm run dev:test         # Start dev server with .env.test

# Build & Lint
npm run build
npm run lint

# Database (Prisma)
npm run db:generate      # Generate Prisma Client after schema changes
npm run db:migrate       # Create and apply migrations (dev)
npm run db:push          # Push schema without creating migration files
npm run db:studio        # Open Prisma Studio GUI

# E2E Tests
npm run test:e2e         # Migrate + run Playwright tests
npm run test:e2e:ui      # Same, with interactive UI
npm run test:e2e:reset   # Full reset+seed+test cycle

# Test DB helpers (requires .env.test)
npm run db:fresh:test    # Migrate + reset + seed test DB
npm run db:reset:test
npm run db:seed:test

# Run a single test file
npx playwright test e2e/login.spec.ts
```

## Architecture

**Stack**: Next.js 14 (App Router) · TypeScript · Prisma + PostgreSQL · NextAuth v4 (JWT) · Tailwind CSS + shadcn/ui · SWR · Playwright (E2E) · Upstash Redis (rate limiting) · Sentry

### Request flow

```
Client (SWR hook) → API route (/app/api/...) → getRequiredSessionContext() → service layer (/services/) → Prisma → PostgreSQL
```

`getRequiredSessionContext()` is the auth gate for every API route — it validates the JWT session and extracts `{ userId, companyId, activeUnitId }`. All database queries are scoped to `companyId` (multi-tenant) and, where applicable, `activeUnitId`.

### Key conventions

- **Services layer** (`/services/*.service.ts`): All business logic lives here. API routes are thin wrappers that call services.
- **Audit logging**: Every mutation should go through `lib/prisma-audit.ts` to create `AuditLog` entries.
- **Feature flags**: `lib/config.ts` exports flags like `ESTOQUE_ATIVO` that gate whole modules without removing routes.
- **RBAC**: Use `checkRole(session, ['PROPRIETARIO', 'GESTOR'])` to restrict endpoints. Roles: `PROPRIETARIO > GESTOR > FUNCIONARIO`.
- **Formatters**: Always use `lib/formatters.ts` for dates and currency (BRL locale).

### Data model highlights

- `Company` → `Unit[]` → `User[]` (multi-unit company structure)
- `ServiceOrder` links Customer + Employee + products/services + AccountReceivable
- `AccountReceivable` / `AccountPayable` track financial state with `PaymentStatus` (PENDENTE · PARCIAL · PAGO · CANCELADO)
- `DATABASE_URL` (pooled, for runtime) vs `DIRECT_URL` (direct, for migrations) — both required in env

### E2E test setup

Tests authenticate once via `e2e/auth.setup.ts`, which saves session state to `e2e/.auth/user.json` and is a prerequisite project in `playwright.config.ts`. The test user is seeded by `scripts/seed-test-db.mjs` and requires `ALLOW_DB_SEED=true` in `.env.test`.

### CI

GitHub Actions (`.github/workflows/ci.yml`) spins up a Postgres 16 service, runs `tsc --noEmit`, migrates the DB, seeds test data, and runs Playwright. Test report is uploaded on failure.

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled PostgreSQL URL (runtime) |
| `DIRECT_URL` | Direct PostgreSQL URL (migrations) |
| `NEXTAUTH_SECRET` | JWT signing key |
| `NEXTAUTH_URL` | Auth callback base URL |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Rate limiting |
| `CRON_SECRET` | Authenticates `/api/cron/mark-overdue` |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry error tracking |
