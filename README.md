# MacLoans — MACNO Enterprise LLC

Automated real estate & construction loan underwriting and prequalification platform.
**Mortgage solutions & construction support — all in one place.**

Borrowers apply online and get an instant preliminary result: **Prequalified**, **Conditionally Eligible**,
**Additional Information Required**, or **Manual Underwriting Review Required**. The result explains which factors
drove it. Lenders and underwriters then review, verify, and make the final decision.

## Features

| Area | What it does |
| --- | --- |
| **Public site** (`/`) | Branded landing page with loan programs, the platform overview, and review & due-diligence services |
| **Instant prequal** (`/prequalify`) | Anonymous quick check. Runs the live engine and saves nothing |
| **Applicant dashboard** (`/dashboard`) | Multi-step application with draft saving, progress tracker, preliminary result with metrics, conditions checklist, document uploads per condition, messaging, and activity history |
| **Underwriter dashboard** (`/underwriter`) | Pipeline with counts by engine result and filters. Per file: full metrics and rule findings, application data, assign, re-run the engine, record a decision (with a required justification for overrides), accept or reject documents, add/satisfy/waive conditions, internal notes |
| **Admin** (`/admin/guidelines`, `/admin/users`) | Edit each program's underwriting rules and tolerances. Promote users to underwriter or admin |

**Loan programs:** Residential, Investment (DSCR), Commercial, Construction, Land Acquisition, Construction-to-Permanent.

### Underwriting engine (`src/lib/underwriting/`)
A pure, unit-tested, rules-based engine. It calculates **LTV, LTC, loan-to-completed-value, front/back DTI, DSCR (NOI-based
for commercial), P&I and PITIA payments, down payment, closing costs, required cash contribution, post-closing reserves, and
available equity**. It then checks each value against the lender's guidelines:

- **pass**: within the limit
- **condition**: outside the limit but within the configured tolerance, or a fixable item (permits, plans, contractor license, contingency, experience). The result becomes *Conditionally Eligible*
- **fail**: well outside the limit, a bankruptcy or foreclosure, insufficient funds to close, or an infeasible project. The result becomes *Manual Review*
- **missing**: a required field is blank. The result becomes *Additional Information Required*

Each non-passing finding produces a borrower-facing condition with a document category. Standard conditions (ID, assets,
income, contract, budget and so on) are added for each program.

## Tech stack
- **Next.js 15** (App Router, Server Actions) + **TypeScript** + **Tailwind CSS 4**
- **Neon** serverless Postgres through `@neondatabase/serverless` (HTTP driver). Any other Postgres URL uses `pg` for local development
- Auth: bcrypt password hashes and signed, HTTP-only JWT session cookies (`jose`). Roles are `applicant`, `underwriter`, `admin`
- Documents are stored in Postgres (`bytea`, 10 MB limit). Downloads are access-checked in `/api/documents/[id]`

## Getting started
1. Create a Neon project at <https://console.neon.tech> and copy the connection string.
2. `cp .env.example .env.local`, then set `DATABASE_URL`, `AUTH_SECRET` and `SEED_ADMIN_PASSWORD`.
3. Install, create the tables, and create the admin account:
   ```bash
   npm install
   npm run db:migrate
   npm run db:seed          # or: npm run db:seed:demo  (adds a demo underwriter, a borrower and 3 sample loans)
   npm run dev
   ```
4. Open <http://localhost:3000> and sign in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.
   New sign-ups are borrowers. Promote staff from **Admin → Users**.

Demo logins (after `db:seed:demo`): `underwriter@demo.macloans.test` and `borrower@demo.macloans.test`, both with password `Demo12345!`.

## Scripts
| Command | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Underwriting engine unit tests (Vitest) |
| `npm run lint` | Type-check |
| `npm run db:migrate` | Apply `db/schema.sql` (idempotent) |
| `npm run db:seed` / `db:seed:demo` | Create the admin account (plus optional demo data) |

## Deploying
Deploy to Vercel (or any Node host). Set `DATABASE_URL` (use Neon's **pooled** connection string) and `AUTH_SECRET` in the
environment variables, then run `npm run db:migrate` once against the production database.

## Disclaimer
Preliminary results are not a commitment to lend. Final approval is subject to lender requirements, verification,
appraisal, title review, documentation, and underwriting and compliance review. MACNO Enterprise LLC provides information,
review, and support services only. No legal advice is provided.
