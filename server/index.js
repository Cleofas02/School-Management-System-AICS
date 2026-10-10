import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { pool } from './db.js'
import authRoutes from './routes/authRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import courseRoutes from './routes/courseRoutes.js'
import sectionRoutes from './routes/sectionRoutes.js'
import enrollmentRoutes from './routes/enrollmentRoutes.js'
import teachingRoutes from './routes/teachingRoutes.js'
import ticketRoutes from './routes/ticketRoutes.js'
import ledgerRoutes from './routes/ledgerRoutes.js'
import statsRoutes from './routes/statsRoutes.js'

const app = express()
// CLIENT_URL = your Vercel address (comma separated for more than one). Empty = allow all (local dev).
const origins = (process.env.CLIENT_URL || '').split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean)
app.use(cors(origins.length ? { origin: origins } : undefined))
app.use(express.json())

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()')
    res.json({ ok: true, time: result.rows[0].now })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

app.use('/api/auth', authRoutes)               // login, register, me
app.use('/api/admin', adminRoutes)             // admin: users
app.use('/api/courses', courseRoutes)          // courses
app.use('/api/sections', sectionRoutes)        // class sections
app.use('/api/enrollments', enrollmentRoutes)  // enrollments
app.use('/api/teaching', teachingRoutes)       // faculty rosters + grades
app.use('/api/tickets', ticketRoutes)          // appointments / payment tickets
app.use('/api/ledgers', ledgerRoutes)          // tuition ledgers
app.use('/api/stats', statsRoutes)             // dashboard numbers

const port = process.env.PORT || 5000
app.listen(port, () => console.log(`API running on http://localhost:${port}`))
