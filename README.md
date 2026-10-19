# Campus SMS · AICS Commonwealth



School Management System for the Asian Institute of Computer Studies, Commonwealth Branch.
One web system for **Registrar**, **Accounting** and **Teaching**: enrollment, grades, appointment tickets and tuition.

**Live:** https://school-management-system-aics-mi37.vercel.app

## Demo

<!-- Drag campus-sms-brag.mp4 into this README in GitHub's editor and the video link appears here -->

## Features

- **Registrar:** approve student accounts, manage courses and sections, approve or deny enrollments (seat limits enforced)
- **Teaching:** open classes, add or remove students, enter grades
- **Accounting:** tuition records, verify appointment tickets, record payments
- **Students:** register, enroll, view grades and balance, book appointments and choose how much to pay
- Role-based access (Admin, Registrar, Accounting, Faculty, Student), light and dark theme

## Tech stack

| Part | Tools |
| --- | --- |
| Frontend | React 19, Vite, Tailwind CSS 4, React Router |
| Backend | Node.js, Express 5, JWT login, bcrypt |
| Database | PostgreSQL 16 (Neon in production, Docker locally) |
| Hosting | Vercel (frontend), Render (API), Neon (database) |

## How it works

```
Browser (React on Vercel) --HTTPS, JSON + JWT--> Express API (Render) --SQL over SSL--> PostgreSQL (Neon)
```

Every request carries a login token. The server checks the token and the user's role before touching the database.


<video src="https://github.com/user-attachments/assets/f24c1f5c-9213-4eb7-ae92-59726d9dbd17
" controls width="100%"></video>

















## Run locally

```bash
git clone <your-repo-url> && cd School-management-system

# 1. database (needs Docker)
docker compose up -d

# 2. backend
cd server
cp .env.example .env        # edit values if needed
npm install
npm run db:schema           # creates the tables
npm run db:seed             # adds sample data
npm run dev                 # API on http://localhost:5000

# 3. frontend (new terminal)
cd client
npm install
npm run dev                 # app on http://localhost:5173
```

Sample accounts: `admin@sms.com`, `registrar@sms.com`, `accounting@sms.com`, `faculty@sms.com`, `student@sms.com`.
Their password is `SEED_PASSWORD` from `server/.env` (set your own before seeding any public database).

## Environment variables

| File | Variable | Purpose |
| --- | --- | --- |
| `server/.env` | `DATABASE_URL` | PostgreSQL connection string |
| `server/.env` | `DATABASE_SSL` | `true` for Neon and other hosted databases |
| `server/.env` | `JWT_SECRET` | long random string for login tokens |
| `server/.env` | `CLIENT_URL` | allowed website address(es), comma separated |
| `server/.env` | `SEED_PASSWORD` | password for the seeded sample accounts |
| `client/.env` | `VITE_API_URL` | API address (production only) |

## Deploy

1. **Neon:** create a database, then run `npm run db:schema` and `npm run db:seed` with its connection string.
2. **Render:** web service, root directory `server`, build `npm install`, start `npm start`.
3. **Vercel:** root directory `client`, set `VITE_API_URL` to the Render address.
4. Put the Vercel address in `CLIENT_URL` on Render.

## Project structure

```
client/     React app (pages per role, components, api helper)
server/     Express API (routes, middleware, seed and schema scripts)
database/   schema.sql
docs/       system documentation
```

## API overview

9 route groups under `/api`: `auth`, `admin`, `courses`, `sections`, `enrollments`, `teaching`, `tickets`, `ledgers`, `stats`, plus `GET /api/health`.

## Authors

Built for AICS Commonwealth. *Go Beyond Learning.*
