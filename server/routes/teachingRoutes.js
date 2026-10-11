import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth, requireAccess, roleKey } from '../middleware/authMiddleware.js'
import { handle, httpError, mustBeOneOf, nullIfEmpty, PROGRAMS } from '../utils.js'

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

// POST /api/teaching/sections  - faculty open a class (optionally creating a new course first)
//   { course_id }  OR  { course_code, title, units, program }
//   plus optional room_number, days_of_week, start_time, end_time, max_capacity
//   The class is assigned to the logged-in teacher. (Admin may send faculty_user_id.)
router.post('/sections', handle(async (req, res) => {
  const b = req.body
  const isAdmin = roleKey(req.user) === 'admin'
  const facultyId = isAdmin ? nullIfEmpty(b.faculty_user_id) : req.user.id
  const capacity = Number(b.max_capacity) || 40
  if (capacity < 1 || capacity > 200) throw httpError(400, 'Capacity must be between 1 and 200')

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    let courseId = Number(b.course_id)
    if (courseId) {
      const found = await client.query('SELECT 1 FROM courses WHERE course_id = $1', [courseId])
      if (!found.rows[0]) throw httpError(404, 'Course not found')
    } else {
      const code = (b.course_code || '').trim().toUpperCase()
      const title = (b.title || '').trim()
      if (!code || !title) throw httpError(400, 'Choose an existing course, or type a new course code and title')
      mustBeOneOf(b.program, PROGRAMS, 'Program')
      const units = Math.min(Math.max(Number(b.units) || 3, 1), 6)
      const dup = await client.query('SELECT 1 FROM courses WHERE course_code = $1', [code])
      if (dup.rows[0]) throw httpError(409, `${code} already exists. Pick it from the course list instead.`)
      const course = await client.query(
        'INSERT INTO courses (course_code, title, units, program) VALUES ($1, $2, $3, $4) RETURNING course_id',
        [code, title, units, b.program]
      )
      courseId = course.rows[0].course_id
    }

    const section = await client.query(
      `INSERT INTO class_sections (course_id, faculty_user_id, room_number, days_of_week, start_time, end_time, max_capacity)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING section_id`,
      [courseId, facultyId, nullIfEmpty(b.room_number), nullIfEmpty(b.days_of_week), nullIfEmpty(b.start_time), nullIfEmpty(b.end_time), capacity]
    )
    await client.query('COMMIT')
    res.status(201).json(section.rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}))

// GET /api/teaching/sections/:id/available-students?q=  - approved students NOT already in this class
router.get('/sections/:id/available-students', handle(async (req, res) => {
  const section = await pool.query('SELECT faculty_user_id FROM class_sections WHERE section_id = $1', [req.params.id])
  if (!section.rows[0]) throw httpError(404, 'Section not found')
  mustOwn(req.user, section.rows[0].faculty_user_id)

  const q = `%${(req.query.q || '').toString().trim().toLowerCase()}%`
  const result = await pool.query(
    `SELECT u.id AS student_id, u.first_name, u.last_name, sp.student_number, sp.program
     FROM users u
     JOIN student_profiles sp ON sp.user_id = u.id
     WHERE u.status = 'approved' AND u.is_active
       AND NOT EXISTS (SELECT 1 FROM enrollments e
                       WHERE e.student_id = u.id AND e.section_id = $1 AND e.status = 'approved')
       AND (LOWER(u.first_name || ' ' || u.last_name) LIKE $2 OR LOWER(sp.student_number) LIKE $2)
     ORDER BY u.last_name, u.first_name
     LIMIT 15`,
    [req.params.id, q]
  )
  res.json(result.rows)
}))

// POST /api/teaching/sections/:id/students  { student_id }  - teacher adds a student (approved right away)
router.post('/sections/:id/students', handle(async (req, res) => {
  const studentId = Number(req.body.student_id)
  if (!studentId) throw httpError(400, 'Please choose a student')

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // Lock the section so two people cannot take the last seat at the same time
    const section = await client.query('SELECT faculty_user_id, max_capacity FROM class_sections WHERE section_id = $1 FOR UPDATE', [req.params.id])
    if (!section.rows[0]) throw httpError(404, 'Section not found')
    mustOwn(req.user, section.rows[0].faculty_user_id)

    const student = await client.query(
      `SELECT 1 FROM users u JOIN student_profiles sp ON sp.user_id = u.id
       WHERE u.id = $1 AND u.status = 'approved' AND u.is_active`, [studentId])
    if (!student.rows[0]) throw httpError(404, 'Student not found or not approved')

    const taken = await client.query("SELECT COUNT(*)::int AS n FROM enrollments WHERE section_id = $1 AND status = 'approved'", [req.params.id])
    if (taken.rows[0].n >= section.rows[0].max_capacity) throw httpError(409, 'This class is already full')

    const result = await client.query(
      `INSERT INTO enrollments (student_id, section_id, status)
       VALUES ($1, $2, 'approved')
       ON CONFLICT (student_id, section_id)
       DO UPDATE SET status = 'approved', grade = NULL WHERE enrollments.status <> 'approved'
       RETURNING enrollment_id`,
      [studentId, req.params.id]
    )
    if (!result.rows[0]) throw httpError(409, 'This student is already in the class')
    await client.query('COMMIT')
    res.status(201).json({ ok: true })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}))

// DELETE /api/teaching/enrollments/:id  - teacher removes a student (the enrollment becomes "dropped")
router.delete('/enrollments/:id', handle(async (req, res) => {
  const found = await pool.query(
    `SELECT cs.faculty_user_id
     FROM enrollments e JOIN class_sections cs ON cs.section_id = e.section_id
     WHERE e.enrollment_id = $1 AND e.status = 'approved'`,
    [req.params.id]
  )
  if (!found.rows[0]) throw httpError(404, 'Enrollment not found')
  mustOwn(req.user, found.rows[0].faculty_user_id)
  await pool.query("UPDATE enrollments SET status = 'dropped' WHERE enrollment_id = $1", [req.params.id])
  res.json({ ok: true })
}))

export default router
