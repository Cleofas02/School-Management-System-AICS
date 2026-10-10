import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from '../db.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { PROGRAMS } from '../utils.js'

const router = Router()

// POST /api/auth/register  - students sign up, then wait for admin approval
router.post('/register', async (req, res) => {
  const { email, password, first_name, last_name, program } = req.body
  if (!email || !password || !first_name || !last_name || !program) {
    return res.status(400).json({ error: 'All fields are required' })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }
  if (!PROGRAMS.includes(program)) {
    return res.status(400).json({ error: 'Please choose a valid program' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const hash = await bcrypt.hash(password, 10)
    const created = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, status)
       VALUES ($1, $2, $3, $4, 'student', 'pending') RETURNING id`,
      [email.toLowerCase().trim(), hash, first_name.trim(), last_name.trim()]
    )
    const id = created.rows[0].id
    const studentNumber = `${new Date().getFullYear()}-${String(id).padStart(4, '0')}`
    await client.query(
      `INSERT INTO student_profiles (user_id, student_number, program) VALUES ($1, $2, $3)`,
      [id, studentNumber, program.trim()]
    )
    await client.query('COMMIT')
    res.status(201).json({ message: 'Registered! Please wait for admin approval before logging in.' })
  } catch (err) {
    await client.query('ROLLBACK')
    if (err.code === '23505') {
      return res.status(409).json({ error: 'That email is already registered' })
    }
    console.error(err)
    res.status(500).json({ error: 'Something went wrong' })
  } finally {
    client.release()
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  try {
    const result = await pool.query(
      `SELECT u.*, s.department_type
       FROM users u
       LEFT JOIN staff_profiles s ON s.user_id = u.id
       WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    )
    const user = result.rows[0]
    const passwordOk = user && (await bcrypt.compare(password, user.password_hash))

    // Same message for wrong email or wrong password (don't reveal which)
    if (!passwordOk) {
      return res.status(401).json({ error: 'Incorrect email or password' })
    }
    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Your account is waiting for admin approval' })
    }
    if (user.status === 'denied') {
      return res.status(403).json({ error: 'Your registration was denied. Please contact the school.' })
    }
    if (!user.is_active) {
      return res.status(403).json({ error: 'This account is deactivated' })
    }

    const department = user.department_type || null // 'registrar' / 'accounting' for staff
    const token = jwt.sign(
      { id: user.id, role: user.role, department },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    )

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        department,
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

// GET /api/auth/me  - who am I? (needs a valid token)
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, s.department_type AS department
       FROM users u
       LEFT JOIN staff_profiles s ON s.user_id = u.id
       WHERE u.id = $1 AND u.status = 'approved' AND u.is_active = TRUE`,
      [req.user.id]
    )
    if (!result.rows[0]) {
      return res.status(401).json({ error: 'Account no longer available' })
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

export default router
