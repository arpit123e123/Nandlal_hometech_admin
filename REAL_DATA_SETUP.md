# Real data setup (NANDLAL HOMETECH and UTILITY)

Current state: frontend only. Data layer = src/lib/api.js (Zustand + browser localStorage). No server, no database.

## Modes (src/lib/config.js, set in .env.local, see .env.example)
- VITE_DATA_MODE=demo  : fake seed data (src/lib/seed.js). Default.
- VITE_DATA_MODE=empty : zero fake records. First login creates the OWNER. Data still lives ONLY in that browser until a backend exists. Not safe for real shop operations yet.

## Needed for truly real operations
1. Backend (Express + Postgres) with real auth (hashed passwords, JWT), server-side RBAC, audit log, daily backups.
2. Replace function bodies in src/lib/api.js with fetch(API_URL + ...) keeping the same function names.
3. Import real data (products, stock, customers, balances, users). CSV templates are in templates/.
Secrets (DB URL, JWT secret, WhatsApp keys) go ONLY in the host's secret/env store. Never in chat, git, or VITE_* vars (public in the browser bundle).
