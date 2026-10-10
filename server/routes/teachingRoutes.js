import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth, requireAccess, roleKey } from '../middleware/authMiddleware.js'
import { handle, httpError } from '../utils.js'

const router = Router()
router.use(requireAuth, requireAccess('faculty', 'admin'))

// Faculty can only touch their own sections. Admin can touch all.
function mustOwn(user, facultyUserId) {
  if (roleKey(user) === 'admin') return
  if (facultyUserId !== user.id) throw httpError(403, 'This is not your class')
}

// GET /api/teaching/sections
router.get('/sections', handle(async (req, res) => {
  const onlyMine = roleKey(req.user) === 'faculty'
  const result = await pool.query(
    `SELECT cs.section_id, c.course_code, c.title, c.program, cs.room_number, cs.days_of_week,
            cs.start_time, cs.end_time, cs.max_capacity,
            u.first_name || ' ' || u.last_name AS faculty_name,
            (SELECT COUNT(*) FROM enrollments e
              WHERE e.section_id = cs.section_id AND e.status = 'approved')::int AS enrolled
     FROM class_sections cs
     JOIN courses c ON c.course_id = cs.course_id
     LEFT JOIN users u ON u.id = cs.faculty_user_id
     ${onlyMine ? 'WHERE cs.faculty_user_id = $1' : ''}
     ORDER BY c.course_code, cs.section_id`,
    onlyMine ? [req.user.id] : []
  )
  res.json(result.rows)
}))

// GET /api/teaching/sections/:id/roster  - approved students in a section
router.get('/sections/:id/roster', handle(async (req, res) => {
  const section = await pool.query('SELECT faculty_user_id FROM class_sections WHERE section_id = $1', [req.params.id])
  if (!section.rows[0]) throw httpError(404, 'Section not found')
  mustOwn(req.user, section.rows[0].faculty_user_id)

  const result = await pool.query(
    `SELECT e.enrollment_id, e.grade, sp.student_number, sp.program, u.first_name, u.last_name
     FROM enrollments e
     JOIN users u ON u.id = e.student_id
     JOIN student_profiles sp ON sp.user_id = e.student_id
     WHERE e.section_id = $1 AND e.status = 'approved'
     ORDER BY u.last_name, u.first_name`,
    [req.params.id]
  )
  res.json(result.rows)
}))

// PATCH /api/teaching/enrollments/:id/grade
router.patch('/enrollments/:id/grade', handle(async (req, res) => {
  const found = await pool.query(
    `SELECT cs.faculty_user_id
     FROM enrollments e
     JOIN class_sections cs ON cs.section_id = e.section_id
     WHERE e.enrollment_id = $1 AND e.status = 'approved'`,
    [req.params.id]
  )
  if (!found.rows[0]) throw httpError(404, 'Enrollment not found')
  mustOwn(req.user, found.rows[0].faculty_user_id)

  const grade = (req.body.grade ?? '').toString().trim()
  if (grade.length > 10) throw httpError(400, 'Grade is too long')
  await pool.query('UPDATE enrollments SET grade = $1 WHERE enrollment_id = $2', [grade || null, req.params.id])
  res.json({ ok: true })
}))

export default router
