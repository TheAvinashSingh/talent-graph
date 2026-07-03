# Local Development Guide — Talent Graph

This guide explains how to configure, run, and log into the Talent Graph application on localhost.

## 1. How to Start the App

Since this monorepo uses `pnpm` workspace scripts that expect `pnpm` in the PATH, we use a local `.bin` shim directory that maps to Node's built-in `corepack pnpm`.

Run the following commands in two separate terminal tabs at the project root:

### Tab 1: Start the Express Backend API (Port 5050)
```bash
export $(cat .env | xargs) && PATH="./.bin:$PATH" PORT=5050 pnpm --filter @workspace/api-server run dev
```

### Tab 2: Start the React Frontend (Port 3000)
```bash
PATH="./.bin:$PATH" PORT=3000 BASE_PATH="/" pnpm --filter @workspace/talent-graph run dev
```

Once both are running, open **http://localhost:3000** in your browser.

---

## 2. Where to Change the Database URL

If you need to change your database connection string, update the `DATABASE_URL` key inside the `.env` file in the project root:

```env
DATABASE_URL="postgresql://username:password@host:port/database"
SESSION_SECRET="your-session-secret"
```

> **Crucial Tip on Special Characters**: If your database password contains special characters, they must be URL-encoded (for example, `@` becomes `%40`, `#` becomes `%23`).

---

## 3. Seeded Accounts / Credentials

Use these seeded email/password combinations to test the different user views:

| Role | Email | Password |
|---|---|---|
| **Admin Dashboard** | `admin@test.com` | `pass1234` |
| **Referrer Portal** | `ref@test.com` | `pass1234` |
| **Client Portal** | `client@test.com` | `pass1234` |

---

## 4. Initial Database Schema & Seeding (One-Time Setup)

If you connect to a new/empty database and need to initialize it, run:

1. **Push schema tables**:
   ```bash
   export $(cat .env | xargs) && PATH="./.bin:$PATH" pnpm --filter @workspace/db run push
   ```
2. **Seed mock data**:
   ```bash
   export $(cat .env | xargs) && PATH="./.bin:$PATH" pnpm --filter @workspace/scripts run seed
   ```
