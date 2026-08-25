# SimplePlan Office Management Platform

Phase 1 — Foundation. Monorepo (npm workspaces + Turborepo) containing a web app, an
Electron desktop shell, a Fastify API, and shared packages.

## Layout

```
apps/web        React + Vite + TS + Tailwind + TanStack Query + Zustand
apps/desktop    Electron shell loading the web app
apps/api        Fastify + Prisma + Zod, REST API
packages/ui     Shared theme tokens + components
packages/shared Shared types/constants (roles, permissions)
packages/validation  Shared Zod schemas
packages/config Shared tsconfig/eslint config
prisma          schema.prisma, migrations, seed.ts
infrastructure  docker/nginx configs
```

## Setup

```bash
npm install
cp .env.example .env   # already present; edit if needed
docker compose up -d postgres
npm run db:migrate     # runs prisma migrate dev
npm run db:seed        # seeds roles, permissions, demo users/employees
```

## Run in dev

```bash
npm run dev --workspace=apps/api    # http://localhost:4000
npm run dev --workspace=apps/web    # http://localhost:5173
npm run dev --workspace=apps/desktop  # loads WEB_URL (defaults to localhost:5173)
```

## Demo credentials

All seeded users share the password `Password123!`.

| Email | Role |
|---|---|
| admin1@simpleplan.media | ADMIN |
| admin2@simpleplan.media | ADMIN |
| teamlead@simpleplan.media | TEAM_LEAD |

Team Leads can view and create employees but cannot see or edit salary data
(`salary.view` / `salary.update` are ADMIN-only permissions).

## Permission model

`roles`, `permissions`, `role_permissions` define a permission-based RBAC.
Routes are protected via `app.requirePermission("employees.view")` etc. in
`apps/api/src/plugins/auth.ts` — never hardcoded role checks.

## Theme

Design tokens live in `packages/ui/src/theme.css` as CSS variables, supporting
light/dark/system. See that file's header comment for the palette rationale.
