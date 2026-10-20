# Subscription Management Dashboard

A mini SaaS admin dashboard where users sign up, subscribe to a plan, view and manage their active plan and profile, and admins monitor every subscription. Built for the GNXTACE Technologies Full Stack Web Developer technical assessment.

**Author:** _<Your Name>_ · _<your.email@example.com>_ · _<phone / LinkedIn>_

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite 6, Redux Toolkit, React Router 6, Tailwind CSS 3, Axios |
| Backend | Node.js (ESM), Express 4 |
| Database | PostgreSQL (14+) |
| ORM | Prisma 6 |
| Auth | JWT access token (in memory) + rotating refresh token (HTTP-only cookie), bcrypt password hashing |
| Validation | Zod (request bodies, params, query strings and environment variables) |
| Security | Helmet, CORS allow-list, express-rate-limit, payload size limits |
| Tests | `node:test` + Supertest (API), Vitest (client state) |

## Features

**Required**
- Registration, login, logout, silent token refresh, current-user endpoint
- Role-based access control (`USER`, `ADMIN`) on the API and in the client router (`/admin/*` is admin-only)
- Plans, users and subscriptions tables with relations, unique constraints, indexes and timestamps
- Subscribe to a plan; start and end dates are calculated from the plan's `durationDays`
- `GET /api/my-subscription` reports status `ACTIVE`, `EXPIRED`, `CANCELLED` or `NONE`
- Admin list of all subscriptions
- Zod validation with structured error responses and correct HTTP status codes
- Seed data: four plans (Free, Basic, Pro, Enterprise) plus demo admin and user accounts
- Pages: `/login`, `/register`, `/plans`, `/dashboard`, `/admin/subscriptions`
- Responsive layout with a navbar, user menu, logout, status badges, loading and error states

**Extras**
- Plan upgrade and downgrade (`PATCH /api/my-subscription`) done in a single transaction, plus cancellation
- Admin filters (search by name or email, status, plan), sorting, pagination and summary stats
- Profile page: change your display name and password (changing the password signs out your other sessions)
- Subscription history on the dashboard
- Dark and light theme toggle
- Refresh-token rotation with reuse detection

## Project structure

```
subscription-dashboard-task/
├── client/                     # React + Vite frontend
│   └── src/
│       ├── api/                # Axios instance, interceptors, endpoint wrappers
│       ├── app/store.js        # Redux store
│       ├── features/           # Redux slices (auth, subscription)
│       ├── components/         # layout/, routing/, ui/, PlanCard
│       ├── pages/              # Route pages
│       ├── hooks/ utils/
│       └── __tests__/
├── server/                     # Express API
│   ├── prisma/                 # schema.prisma, migrations/, seed.js
│   ├── src/
│   │   ├── config/env.js       # Zod-validated environment
│   │   ├── routes/             # Route definitions
│   │   ├── controllers/        # HTTP layer
│   │   ├── services/           # Business logic + Prisma
│   │   ├── middleware/         # auth, validate, error, rate limit
│   │   ├── validators/         # Zod schemas
│   │   ├── utils/              # tokens, serializers, ApiError
│   │   ├── jobs/               # periodic expiry and token cleanup
│   │   ├── app.js              # Express app factory
│   │   └── server.js           # Entry point
│   └── tests/
├── README.md
└── .gitignore
```

## Getting started

### Prerequisites
- Node.js **20.x** (tested with 20.15) and npm
- PostgreSQL **14+** running locally or remotely

### 1. Create the database

```bash
# Example with the default postgres superuser. Use your own role name and password.
sudo -u postgres psql -c "CREATE ROLE subdash WITH LOGIN CREATEDB PASSWORD 'change-me';"
sudo -u postgres psql -c "CREATE DATABASE subscription_dashboard OWNER subdash;"
```

### 2. Backend

```bash
cd server
npm install
cp .env.example .env
```

Edit `server/.env`:
- `DATABASE_URL`, e.g. `postgresql://subdash:change-me@localhost:5432/subscription_dashboard?schema=public`
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`: two different random strings of 32+ characters. Generate each with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```

Then run the migrations, seed the data and start the API:

```bash
npx prisma migrate deploy   # apply migrations (use `npm run prisma:migrate` while developing)
npm run db:seed             # 4 plans + demo admin and user accounts
npm run dev                 # http://localhost:4000
```

### 3. Frontend

```bash
cd client
npm install
cp .env.example .env
npm run dev                 # http://localhost:5173
```

In development, Vite proxies `/api` to `http://localhost:4000`, so the client and API share an origin and the `SameSite=Strict` refresh cookie works without any extra setup.

### Demo accounts (created by the seed)

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@example.com` | `Admin@12345` |
| User | `user@example.com` | `User@12345` |

These are local development defaults, configurable through `SEED_*` in `server/.env`. Change them before deploying anywhere.

### Scripts

| Location | Command | Description |
| --- | --- | --- |
| server | `npm run dev` | Start the API with file watching |
| server | `npm start` | Start the API |
| server | `npm run prisma:migrate` | Create or apply a migration in development |
| server | `npm run prisma:deploy` | Apply migrations (CI/production) |
| server | `npm run db:seed` | Seed plans and demo users |
| server | `npm test` | Unit and integration tests (integration tests are skipped when the DB is unreachable) |
| client | `npm run dev` | Vite dev server |
| client | `npm run build` | Production build into `client/dist` |
| client | `npm run lint` | ESLint |
| client | `npm test` | Vitest |

## API reference

Every response uses one of these shapes:

```jsonc
// success
{ "success": true, "data": { ... }, "message": "optional", "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 } }
// error
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Request validation failed", "details": [{ "field": "email", "message": "Enter a valid email address" }] } }
```

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | — | Create an account; returns `{ user, accessToken }` and sets the refresh cookie |
| POST | `/api/auth/login` | — | Log in; same response as register |
| POST | `/api/auth/refresh` | cookie | Rotate the refresh token and return a new access token |
| POST | `/api/auth/logout` | cookie | Revoke the refresh token and clear the cookie |
| GET | `/api/auth/me` | Bearer | Current user |
| GET | `/api/plans` | — | List active plans |
| GET | `/api/plans/:planId` | — | Single plan |
| POST | `/api/subscribe/:planId` | Bearer | Subscribe to a plan (`409` if an active subscription exists) |
| GET | `/api/my-subscription` | Bearer | `{ status: ACTIVE \| EXPIRED \| CANCELLED \| NONE, subscription }` |
| GET | `/api/my-subscription/history` | Bearer | The user's past subscriptions |
| PATCH | `/api/my-subscription` | Bearer | Upgrade or downgrade: `{ planId }` |
| DELETE | `/api/my-subscription` | Bearer | Cancel the active subscription |
| PATCH | `/api/users/me` | Bearer | Update profile: `{ name }` |
| PATCH | `/api/users/me/password` | Bearer | `{ currentPassword, newPassword }` |
| GET | `/api/admin/subscriptions` | Bearer + ADMIN | All subscriptions. Query: `page`, `limit` (≤100), `status`, `planId`, `search`, `sortBy` (`createdAt` \| `startDate` \| `endDate`), `order` |
| GET | `/api/admin/stats` | Bearer + ADMIN | Counts by status, active revenue, active count per plan |
| GET | `/api/health` | — | Health check |

Status codes used: `200`, `201`, `400` (validation), `401` (missing, invalid or expired token; codes include `TOKEN_EXPIRED`), `403` (wrong role), `404`, `409` (duplicate email or active subscription), `413`, `429` (rate limited), `500`.

## Design notes

### Authentication and token storage
- The **access token** (15 min) is returned in the JSON body and kept **only in memory** in the Axios module. It is never written to `localStorage`.
- The **refresh token** (7 days) is set as an `HttpOnly`, `SameSite=Strict` cookie scoped to `/api/auth` (`Secure` in production). JavaScript can't read it.
- Refresh tokens are stored in the database as **SHA-256 hashes** and are **rotated** on every refresh. Presenting an already-rotated token revokes all of that user's sessions (reuse detection). A 10-second grace window covers harmless races between browser tabs.
- On page load the client calls `/auth/refresh` to restore the session silently. A timer refreshes the access token one minute before it expires. An Axios response interceptor also catches `401` responses, runs a single shared refresh, and replays the original request. If the refresh fails, the Redux state is cleared and the user is sent to `/login` with a "session expired" notice.
- Passwords are hashed with bcrypt (cost 12). Login takes the same time whether or not the email exists, so response timing doesn't reveal which accounts exist.

### Subscription rules
- `endDate = startDate + plan.durationDays`.
- **At most one ACTIVE subscription per user.** The service checks for an existing one inside a transaction, and a PostgreSQL **partial unique index** (`subscriptions(user_id) WHERE status = 'ACTIVE'`) enforces the same rule even when concurrent requests race each other.
- **Expiry:** any `ACTIVE` subscription whose `end_date` has passed is marked `EXPIRED` before each subscription read or write. A background job also runs every 15 minutes, so status stays correct even between job runs.
- Upgrades and downgrades cancel the current subscription and create the new one in a single transaction. Each subscription stores the price paid at purchase in `amount`.
- Money is stored as PostgreSQL `DECIMAL(10,2)` and serialised as strings, so values never pass through floating point.

### Security
- Helmet headers, a CORS allow-list with credentials, a global rate limit (300 requests per 15 min) and a stricter limit on login and register (20 per 15 min).
- Zod validates every request body, route parameter and query string. Unknown fields are rejected, so a client can't send `role: "ADMIN"` at registration.
- **No IDOR:** user-scoped endpoints take the user id from the verified token, never from the request.
- The auth middleware reloads the user from the database on each request, so deleted accounts and role changes take effect immediately.
- Response objects are built field by field (DTOs), so password hashes never leave the API.
- The environment is validated at startup. The server refuses to start with missing or weak JWT secrets.

## Deployment notes
If the client and API are on **different sites** (for example, Vercel and Render):
- Server: `COOKIE_SAMESITE=none`, `COOKIE_SECURE=true`, `TRUST_PROXY=true`, `CLIENT_ORIGIN=https://your-client.app`
- Client: `VITE_API_URL=https://your-api.app/api`
- Run `npx prisma migrate deploy && npm run db:seed` against the production database.
