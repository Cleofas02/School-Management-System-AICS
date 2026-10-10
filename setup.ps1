# School Management System - Phase 0 setup
# Run this from inside your (empty) project folder.
# Requirements: Node.js, Git, Docker Desktop (running)

$ErrorActionPreference = "Stop"

# Builds everything directly inside the current folder (no extra subfolder)

# ---------- root files ----------
@'
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: sms_user
      POSTGRES_PASSWORD: sms_pass
      POSTGRES_DB: sms_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  pgadmin:
    image: dpage/pgadmin4
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@sms.com
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"

volumes:
  pgdata:
'@ | Set-Content -Encoding UTF8 docker-compose.yml

@'
node_modules
.env
dist
'@ | Set-Content -Encoding UTF8 .gitignore

# ---------- database ----------
Write-Host "Starting Docker containers..." -ForegroundColor Cyan
docker compose up -d

# ---------- backend ----------
Write-Host "Setting up backend (server)..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path server | Out-Null
Set-Location server
npm init -y | Out-Null
npm pkg set type=module
npm pkg set scripts.dev="nodemon index.js"
npm install express pg bcryptjs jsonwebtoken cors dotenv
npm install -D nodemon

@'
PORT=5000
DATABASE_URL=postgres://sms_user:sms_pass@localhost:5432/sms_db
JWT_SECRET=change_this_later
'@ | Set-Content -Encoding UTF8 .env

@'
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import pg from 'pg'

const app = express()
app.use(cors())
app.use(express.json())

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()')
    res.json({ ok: true, time: result.rows[0].now })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

const port = process.env.PORT || 5000
app.listen(port, () => console.log(`API running on http://localhost:${port}`))
'@ | Set-Content -Encoding UTF8 index.js

Set-Location ..

# ---------- frontend ----------
Write-Host "Setting up frontend (client)... answer the Vite prompts: no rolldown, no 'install and start'" -ForegroundColor Cyan
npm create vite@latest client -- --template react
Set-Location client
npm install
npm install tailwindcss @tailwindcss/vite react-router-dom

@'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: { '/api': 'http://localhost:5000' },
  },
})
'@ | Set-Content -Encoding UTF8 vite.config.js

@'
@import "tailwindcss";
'@ | Set-Content -Encoding UTF8 src/index.css

@'
import { useEffect, useState } from 'react'

export default function App() {
  const [status, setStatus] = useState('Checking...')

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setStatus(d.ok ? 'Database connected: ' + d.time : 'Database error'))
      .catch(() => setStatus('API not reachable'))
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white p-8 rounded-xl shadow">
        <h1 className="text-2xl font-bold text-blue-600">School Management System</h1>
        <p className="mt-2 text-slate-600">{status}</p>
      </div>
    </div>
  )
}
'@ | Set-Content -Encoding UTF8 src/App.jsx

Set-Location ..

Write-Host ""
Write-Host "Done! Project created in: $((Get-Location).Path)" -ForegroundColor Green
Write-Host "Next: open two terminals -> 'cd server; npm run dev'  and  'cd client; npm run dev'"
