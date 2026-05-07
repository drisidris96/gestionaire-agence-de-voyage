# نظام إدارة الوكالة السياحية — Atlas Travel Management

نظام متكامل لإدارة الوكالة السياحية يشمل العملاء، الرحلات، الحجوزات، والمدفوعات.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/travel-agency run dev` — run the frontend (port 19981)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + Wouter + TanStack Query + Recharts
- API: Express 5 + OpenAPI-first with Orval codegen
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all API contracts)
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/api.ts` — generated Zod validation schemas
- `lib/db/src/schema/` — Drizzle ORM table definitions (clients, destinations, packages, bookings, payments)
- `artifacts/api-server/src/routes/` — Express route handlers per domain
- `artifacts/travel-agency/src/` — React frontend (pages, components, hooks)

## Architecture decisions

- OpenAPI-first: all API contracts live in `openapi.yaml`, types and hooks are generated via Orval
- Orval zod output uses `mode: "single"` to avoid duplicate exports between schemas and types
- `lib/api-zod/src/index.ts` exports only from `./generated/api` (not types barrel) to avoid naming conflicts
- Numeric fields (prices, amounts) are stored as `numeric` in Postgres and converted to `Number()` in route handlers
- Dashboard endpoints use raw SQL via `db.execute()` for aggregation queries; result is unwrapped via `Array.isArray(result) ? result : result.rows`

## Product

- **Dashboard** — إجمالي الإيرادات، الحجوزات، العملاء، مخطط حالات الحجز، مخطط الإيرادات الشهرية، وآخر الحجوزات
- **العملاء** — إدارة كاملة للعملاء مع بحث وتفاصيل كل عميل وسجل حجوزاته
- **الوجهات** — إدارة الوجهات السياحية
- **الباقات** — إدارة الباقات السياحية مع الأسعار والمدة والوجهة
- **الحجوزات** — إدارة الحجوزات مع تصفية حسب الحالة (معلق، مؤكد، ملغى، مكتمل)
- **المدفوعات** — تتبع المدفوعات لكل حجز مع طرق الدفع المختلفة

## Gotchas

- After changing `openapi.yaml`, run codegen, then manually set `lib/api-zod/src/index.ts` to only export from `./generated/api` (orval may regenerate with duplicate exports)
- Numeric DB fields (pricePerPerson, totalPrice, amount) must be converted via `Number()` before passing to Zod schemas
- `db.execute()` for raw SQL returns different shapes — always unwrap with `Array.isArray(result) ? result : result.rows ?? []`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
