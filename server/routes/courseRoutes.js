import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth, requireAccess } from '../middleware/authMiddleware.js'
import { handle, httpError, mustBeOneOf, PROGRAMS } from '../utils.js'

const router = Router()
router.use(requireAuth)

// GET /api/courses  - everyone logged in can see courses
router.get('/', handle(async (req, res) => {
  const result = await pool.query('SELECT * FROM courses ORDER BY program, course_code')
  res.json(result.rows)
}))

const canEdit = requireAccess('registrar', 'admin')

function readCourse(body) {
  const { course_code, title, units, program } = body
  if (!course_code || !title) throw httpError(400, 'Course code and title are required')
  mustBeOneOf(program, PROGRAMS, 'Program')
  return [course_code.trim().toUpperCase(), title.trim(), Number(units) || 3, program]
}

router.post('/', canEdit, handle(async (req, res) => {
  const result = await pool.query(
    'INSERT INTO courses (course_code, title, units, program) VALUES ($1, $2, $3, $4) RETURNING *',
    readCourse(req.body)
  )
  res.status(201).json(result.rows[0])
}))

router.patch('/:id', canEdit, handle(async (req, res) => {
  const result = await pool.query(
    'UPDATE courses SET course_code = $1, title = $2, units = $3, program = $4 WHERE course_id = $5 RETURNING *',
    [...readCourse(req.body), req.params.id]
  )
  if (!result.rows[0]) throw httpError(404, 'Course not found')
  res.json(result.rows[0])
}))

// Deleting a course also deletes its sections and their enrollments
router.delete('/:id', canEdit, handle(async (req, res) => {
  const result = await pool.query('DELETE FROM courses WHERE course_id = $1 RETURNING course_id', [req.params.id])
  if (!result.rows[0]) throw httpError(404, 'Course not found')
  res.json({ ok: true })
}))

export default router
