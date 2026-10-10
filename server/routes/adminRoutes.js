import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { pool } from '../db.js'
import { requireAuth, requireAccess } from '../middleware/authMiddleware.js'
import { handle, httpError, mustBeOneOf, nullIfEmpty, PROGRAMS } from '../utils.js'

const router = Router()
router.use(requireAuth, requireAccess('admin'))

const ROLES = ['admin', 'staff', 'faculty', 'student']

const USER_SELECT = `
  SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.status, u.is_active, u.created_at,
         sp.student_number, sp.program, sp.year_level,
         st.employee_id, st.department_type,
         fp.faculty_id, fp.department, fp.title
  FROM users u
  LEFT JOIN student_profiles sp ON sp.user_id = u.id
  LEFT JOIN staff_profiles st ON st.user_id = u.id
  LEFT JOIN faculty_profiles fp ON fp.user_id = u.id`

// GET /api/admin/users?status=pending&role=student
router.get('/users', handle(async (req, res) => {
  const { status, role } = req.query
  const where = []
  const params = []
  if (status) { params.push(status); where.push(`u.status = $${params.length}`) }
  if (role) { params.push(role); where.push(`u.role = $${params.length}`) }
  const sql = `${USER_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY u.created_at DESC, u.id DESC`
  const result = await pool.query(sql, params)
  res.json(result.rows)
}))

// POST /api/admin/users  - admin creates an account (already approved)
router.post('/users', handle(async (req, res) => {
  const b = req.body
  if (!b.email || !b.password || !b.first_name || !b.last_name) {
    throw httpError(400, 'Name, email and password are required')
  }
  if (b.password.length < 8) throw httpError(400, 'Password must be at least 8 characters')
  mustBeOneOf(b.role, ROLES, 'Role')
  if (b.role === 'student') mustBeOneOf(b.program, PROGRAMS, 'Program')
  if (b.role === 'staff') mustBeOneOf(b.department_type, ['registrar', 'accounting'], 'Department')
  if (b.role === 'faculty' && !b.department) throw httpError(400, 'Department is required for faculty')

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const hash = await bcrypt.hash(b.password, 10)
    const created = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, status)
       VALUES ($1, $2, $3, $4, $5, 'approved') RETURNING id`,
      [b.email.toLowerCase().trim(), hash, b.first_name.trim(), b.last_name.trim(), b.role]
    )
    const id = created.rows[0].id
    const pad = String(id).padStart(4, '0')

    if (b.role === 'student') {
      await client.query(
        `INSERT INTO student_profiles (user_id, student_number, program, year_level) VALUES ($1, $2, $3, $4)`,
        [id, `${new Date().getFullYear()}-${pad}`, b.program.trim(), Number(b.year_level) || 1]
      )
      await client.query(`INSERT INTO tuition_ledgers (student_id) VALUES ($1)`, [id])
    } else if (b.role === 'staff') {
      await client.query(
        `INSERT INTO staff_profiles (user_id, employee_id, department_type) VALUES ($1, $2, $3)`,
        [id, `EMP-${pad}`, b.department_type]
      )
    } else if (b.role === 'faculty') {
      await client.query(
        `INSERT INTO faculty_profiles (user_id, faculty_id, department, title) VALUES ($1, $2, $3, $4)`,
        [id, `FAC-${pad}`, b.department.trim(), nullIfEmpty(b.title)]
      )
    }
    await client.query('COMMIT')
    res.status(201).json({ id })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}))

// PATCH /api/admin/users/:id  - edit details (role cannot be changed)
router.patch('/users/:id', handle(async (req, res) => {
  const id = Number(req.params.id)
  const b = req.body

  const found = await pool.query('SELECT role FROM users WHERE id = $1', [id])
  if (!found.rows[0]) throw httpError(404, 'User not found')
  const role = found.rows[0].role

  if (id === req.user.id && b.is_active === false) {
    throw httpError(400, 'You cannot deactivate your own account')
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const hash = b.password ? await bcrypt.hash(b.password, 10) : null
    if (b.password && b.password.length < 8) throw httpError(400, 'Password must be at least 8 characters')

    await client.query(
      `UPDATE users SET
         first_name    = COALESCE($1, first_name),
         last_name     = COALESCE($2, last_name),
         email         = COALESCE($3, email),
         is_active     = COALESCE($4, is_active),
         password_hash = COALESCE($5, password_hash)
       WHERE id = $6`,
      [
        nullIfEmpty(b.first_name)?.trim() ?? null,
        nullIfEmpty(b.last_name)?.trim() ?? null,
        nullIfEmpty(b.email)?.toLowerCase().trim() ?? null,
        typeof b.is_active === 'boolean' ? b.is_active : null,
        hash,
        id,
      ]
    )

    if (role === 'student') {
      await client.query(
        `UPDATE student_profiles SET
           program    = COALESCE($1, program),
           year_level = COALESCE($2, year_level)
         WHERE user_id = $3`,
        [nullIfEmpty(b.program), b.year_level ? Number(b.year_level) : null, id]
      )
    } else if (role === 'staff') {
      if (b.department_type) mustBeOneOf(b.department_type, ['registrar', 'accounting'], 'Department')
      await client.query(
        `UPDATE staff_profiles SET department_type = COALESCE($1, department_type) WHERE user_id = $2`,
        [nullIfEmpty(b.department_type), id]
      )
    } else if (role === 'faculty') {
      await client.query(
        `UPDATE faculty_profiles SET
           department = COALESCE($1, department),
           title      = COALESCE($2, title)
         WHERE user_id = $3`,
        [nullIfEmpty(b.department), nullIfEmpty(b.title), id]
      )
    }
    await client.query('COMMIT')
    res.json({ ok: true })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}))

// PATCH /api/admin/users/:id/status  - approve / deny
router.patch('/users/:id/status', handle(async (req, res) => {
  const id = Number(req.params.id)
  const status = mustBeOneOf(req.body.status, ['pending', 'approved', 'denied'], 'Status')
  if (id === req.user.id) throw httpError(400, 'You cannot change your own status')

  const result = await pool.query('UPDATE users SET status = $1 WHERE id = $2 RETURNING id', [status, id])
  if (!result.rows[0]) throw httpError(404, 'User not found')

  // Approved students get a tuition ledger (if they do not have one yet)
  if (status === 'approved') {
    await pool.query(
      `INSERT INTO tuition_ledgers (student_id)
       SELECT user_id FROM student_profiles WHERE user_id = $1
       ON CONFLICT (student_id) DO NOTHING`,
      [id]
    )
  }
  res.json({ ok: true })
}))

// DELETE /api/admin/users/:id
router.delete('/users/:id', handle(async (req, res) => {
  const id = Number(req.params.id)
  if (id === req.user.id) throw httpError(400, 'You cannot delete your own account')
  const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id])
  if (!result.rows[0]) throw httpError(404, 'User not found')
  res.json({ ok: true })
}))

export default router
