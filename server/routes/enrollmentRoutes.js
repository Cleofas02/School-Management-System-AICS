import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth, requireAccess, roleKey } from '../middleware/authMiddleware.js'
import { handle, httpError, mustBeOneOf } from '../utils.js'

const router = Router()
router.use(requireAuth)

const ENROLLMENT_SELECT = `
  SELECT e.enrollment_id, e.status, e.grade, e.section_id, e.student_id,
         c.course_code, c.title, c.units, c.program,
         cs.days_of_week, cs.start_time, cs.end_time, cs.room_number,
         f.first_name || ' ' || f.last_name AS faculty_name,
         s.first_name AS student_first, s.last_name AS student_last, sp.student_number
  FROM enrollments e
  JOIN class_sections cs ON cs.section_id = e.section_id
  JOIN courses c ON c.course_id = cs.course_id
  LEFT JOIN users f ON f.id = cs.faculty_user_id
  JOIN users s ON s.id = e.student_id
  JOIN student_profiles sp ON sp.user_id = e.student_id`

// GET /api/enrollments
//   student        -> only their own
//   registrar/admin -> everyone's (optional ?status=pending)
router.get('/', handle(async (req, res) => {
  const key = roleKey(req.user)
  if (key === 'student') {
    const result = await pool.query(
      `${ENROLLMENT_SELECT} WHERE e.student_id = $1 ORDER BY e.enrollment_id DESC`,
      [req.user.id]
    )
    return res.json(result.rows)
  }
  if (key === 'registrar' || key === 'admin') {
    const params = []
    let where = ''
    if (req.query.status) {
      params.push(req.query.status)
      where = 'WHERE e.status = $1'
    }
    const result = await pool.query(`${ENROLLMENT_SELECT} ${where} ORDER BY e.enrollment_id DESC`, params)
    return res.json(result.rows)
  }
  throw httpError(403, 'You do not have permission to do this')
}))

// POST /api/enrollments  - a student asks to join a section
router.post('/', requireAccess('student'), handle(async (req, res) => {
  const sectionId = Number(req.body.section_id)
  if (!sectionId) throw httpError(400, 'Please choose a section')

  const section = await pool.query('SELECT 1 FROM class_sections WHERE section_id = $1', [sectionId])
  if (!section.rows[0]) throw httpError(404, 'Section not found')

  // New request, or re-request after a drop/denial. Active requests are not duplicated.
  const result = await pool.query(
    `INSERT INTO enrollments (student_id, section_id, status)
     VALUES ($1, $2, 'pending')
     ON CONFLICT (student_id, section_id)
     DO UPDATE SET status = 'pending', grade = NULL
       WHERE enrollments.status IN ('dropped', 'denied')
     RETURNING enrollment_id`,
    [req.user.id, sectionId]
  )
  if (!result.rows[0]) throw httpError(409, 'You already have a request or enrollment for this section')
  res.status(201).json({ ok: true })
}))

// PATCH /api/enrollments/:id/status  - approve / deny / drop (registrar or admin)
router.patch('/:id/status', requireAccess('registrar', 'admin'), handle(async (req, res) => {
  const status = mustBeOneOf(req.body.status, ['pending', 'approved', 'denied', 'dropped'], 'Status')
  const id = Number(req.params.id)

  if (status === 'approved') {
    const info = await pool.query(
      `SELECT cs.max_capacity,
              (SELECT COUNT(*) FROM enrollments e2
                WHERE e2.section_id = cs.section_id AND e2.status = 'approved'
                  AND e2.enrollment_id <> $1)::int AS taken
       FROM enrollments en
       JOIN class_sections cs ON cs.section_id = en.section_id
       WHERE en.enrollment_id = $1`,
      [id]
    )
    if (!info.rows[0]) throw httpError(404, 'Enrollment not found')
    if (info.rows[0].taken >= info.rows[0].max_capacity) throw httpError(409, 'This section is already full')
  }

  const result = await pool.query(
    'UPDATE enrollments SET status = $1 WHERE enrollment_id = $2 RETURNING enrollment_id',
    [status, id]
  )
  if (!result.rows[0]) throw httpError(404, 'Enrollment not found')
  res.json({ ok: true })
}))

// POST /api/enrollments/:id/drop  - a student drops their own class
router.post('/:id/drop', requireAccess('student'), handle(async (req, res) => {
  const result = await pool.query(
    `UPDATE enrollments SET status = 'dropped'
     WHERE enrollment_id = $1 AND student_id = $2
       AND status IN ('pending', 'approved') AND grade IS NULL
     RETURNING enrollment_id`,
    [req.params.id, req.user.id]
  )
  if (!result.rows[0]) throw httpError(400, 'This class cannot be dropped')
  res.json({ ok: true })
}))

// DELETE /api/enrollments/:id  (registrar or admin)
router.delete('/:id', requireAccess('registrar', 'admin'), handle(async (req, res) => {
  const result = await pool.query('DELETE FROM enrollments WHERE enrollment_id = $1 RETURNING enrollment_id', [req.params.id])
  if (!result.rows[0]) throw httpError(404, 'Enrollment not found')
  res.json({ ok: true })
}))

export default router
