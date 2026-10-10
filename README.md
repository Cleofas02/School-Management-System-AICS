# Campus SMS — AICS Commonwealth

School Management System for the Asian Institute of Computer Studies, Commonwealth Branch.
React + Tailwind (client) · Express (server) · PostgreSQL (database).

Roles: Admin, Registrar, Accounting, Faculty, Student.

## Run locally
```bash
docker compose up -d                 # PostgreSQL + pgAdmin
cd server && cp .env.example .env    # then edit if needed
npm install && npm run db:schema && npm run db:seed && npm run dev
cd ../client && npm install && npm run dev
```
Seeded accounts use the password `password123` (or `SEED_PASSWORD` if set):
`admin@sms.com`, `registrar@sms.com`, `accounting@sms.com`, `faculty@sms.com`, `student@sms.com`.

## Deploy
- **Database:** Neon (or any hosted PostgreSQL). Run `npm run db:schema` then `npm run db:seed` with its `DATABASE_URL` and `DATABASE_SSL=true`.
- **Backend:** Render (root directory `server`, build `npm install`, start `npm start`). Env: `DATABASE_URL`, `DATABASE_SSL=true`, `JWT_SECRET`, `CLIENT_URL`.
- **Frontend:** Vercel (root directory `client`, framework Vite). Env: `VITE_API_URL` = the Render URL.
