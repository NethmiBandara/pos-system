# POS System

Bookshop POS monorepo: **Next.js** + **NestJS** + **Prisma** + **SQLite**.

## Features

- **Auth & roles** — JWT login (Admin / Manager / Cashier)
- **POS terminal** — barcode scan, product picker, photocopy/print services, custom items
- **Billing** — Cash, Card, Credit, Account transfer, Cheque (LKR)
- **Discounts** — bill discount in Rs or %
- **Credit** — track credit sales and settle payments
- **Catalog** — products & categories CRUD
- **Copy / Print** — manage photocopy & printout service prices
- **Customers** — create from POS, attach to sale
- **Orders** — history, refunds, cancel held carts
- **Inventory** — stock adjustments, low-stock alerts
- **Reports** — dashboard KPIs, sales by day & payment method
- **Users & settings** — staff and store configuration

## Requirements

- Node.js 20+
- npm 10+

## Setup

```bash
git clone <your-repo-url> pos-system
cd pos-system
npm install

# Environment files (not committed)
cp .env.example .env
cp packages/database/.env.example packages/database/.env
cp apps/web/.env.example apps/web/.env.local

# Database
npm run db:generate
npm run db:migrate
npm run db:seed
```

## Run

```bash
# Terminal 1 — API (http://localhost:3001/api)
npm run dev:api

# Terminal 2 — Web (http://localhost:3000 by default)
npm run dev:web
```

If port 3000 is busy:

```bash
npm run dev -w @pos/web -- --port 3002
```

Then open http://localhost:3002 (ensure `CORS_ORIGIN` in `.env` includes that origin).

### Demo logins (password: `password`)

| Email | Role |
|-------|------|
| `admin@pos.local` | ADMIN |
| `manager@pos.local` | MANAGER |
| `cashier@pos.local` | CASHIER |

## Structure

```
pos-system/
├── apps/web          # Next.js UI
├── apps/api          # NestJS API
├── packages/database # Prisma + SQLite
└── packages/shared   # Shared types
```

## Environment

See `.env.example`. Important variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | SQLite file (`file:./dev.db` relative to Prisma schema) |
| `PORT` | API port (default `3001`) |
| `CORS_ORIGIN` | Allowed web origins |
| `JWT_SECRET` | Change before any real deployment |
| `NEXT_PUBLIC_API_URL` | API base URL for the web app |

**Do not commit** `.env`, `.env.local`, or `*.db` files.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev:api` | Start NestJS in watch mode |
| `npm run dev:web` | Start Next.js |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run migrations |
| `npm run db:seed` | Seed bookshop sample data |
| `npm run build` | Build all workspaces |

## License

Private / unlicensed unless you add a license file.
