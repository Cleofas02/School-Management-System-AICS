import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth, requireAccess } from '../middleware/authMiddleware.js'
import { handle, httpError, nullIfEmpty } from '../utils.js'

const router = Router()
router.use(requireAuth)

// GET /api/sections  - everyone logged in can see sections
router.get('/', handle(async (req, res) => {
  const result = await pool.query(`
    SELECT cs.section_id, cs.course_id, c.course_code, c.title, c.units, c.program,
           cs.room_number, cs.days_of_week, cs.start_time, cs.end_time, cs.max_capacity,
           cs.faculty_user_id, u.first_name || ' ' || u.last_name AS faculty_name,
           (SELECT COUNT(*) FROM enrollments e
             WHERE e.section_id = cs.section_id AND e.status = 'approved')::int AS enrolled
    FROM class_sections cs
    JOIN courses c ON c.course_id = cs.course_id
    LEFT JOIN users u ON u.id = cs.faculty_user_id
    ORDER BY c.course_code, cs.section_id`)
  res.json(result.rows)
}))

const canEdit = requireAccess('registrar', 'admin')

// GET /api/sections/faculty-options  - faculty list for the dropdown
router.get('/faculty-options', canEdit, handle(async (req, res) => {
  const result = await pool.query(`
    SELECT fp.user_id, u.first_name, u.last_name
    FROM faculty_profiles fp
    JOIN users u ON u.id = fp.user_id
    WHERE u.status = 'approved'
    ORDER BY u.last_name, u.first_name`)
  res.json(result.rows)
}))

function readSection(body) {
  if (!body.course_id) throw httpError(400, 'Please choose a course')
  return [
    body.course_id,
    nullIfEmpty(body.faculty_user_id),
    nullIfEmpty(body.room_number),
    nullIfEmpty(body.days_of_week),
    nullIfEmpty(body.start_time),
    nullIfEmpty(body.end_time),
    Number(body.max_capacity) || 40,
  ]
}

router.post('/', canEdit, handle(async (req, res) => {
  const values = readSection(req.body)
  const result = await pool.query(
    `INSERT INTO class_sections
       (course_id, faculty_user_id, room_number, days_of_week, start_time, end_time, max_capacity)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    values
  )
  res.status(201).json(result.rows[0])
}))

router.patch('/:id', canEdit, handle(async (req, res) => {
  const values = readSection(req.body)
  const result = await pool.query(
    `UPDATE class_sections SET
       course_id = $1, faculty_user_id = $2, room_number = $3, days_of_week = $4,
       start_time = $5, end_time = $6, max_capacity = $7
     WHERE section_id = $8 RETURNING *`,
    [...values, req.params.id]
  )
  if (!result.rows[0]) throw httpError(404, 'Section not found')
  res.json(result.rows[0])
}))

router.delete('/:id', canEdit, handle(async (req, res) => {
  const result = await pool.query('DELETE FROM class_sections WHERE section_id = $1 RETURNING section_id', [req.params.id])
  if (!result.rows[0]) throw httpError(404, 'Section not found')
  res.json({ ok: true })
}))

export default router
