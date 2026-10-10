import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth, roleKey } from '../middleware/authMiddleware.js'
import { handle } from '../utils.js'

// Numbers for the dashboards. The answer depends on who is asking.
const router = Router()
router.use(requireAuth)

const many = async (sql, params = []) => (await pool.query(sql, params)).rows
const one = async (sql, params = []) => (await pool.query(sql, params)).rows[0]
const ENROLLMENT_STATUSES = ['pending', 'approved', 'denied', 'dropped']
const TICKET_STATUSES = ['pending', 'ready', 'completed', 'denied']

// [{status:'pending',count:3}] -> { pending: 3, approved: 0, ... }
function countsBy(rows, keys) {
  const result = Object.fromEntries(keys.map((k) => [k, 0]))
  rows.forEach((r) => { result[r.status] = r.count })
  return result
}
const attention = (items) => items.filter((i) => i.count > 0)

async function adminStats() {
  const users = await many('SELECT role, status, COUNT(*)::int AS count FROM users GROUP BY role, status')
  const sum = (fn) => users.filter(fn).reduce((s, u) => s + u.count, 0)
  const enrollments = countsBy(await many('SELECT status, COUNT(*)::int AS count FROM enrollments GROUP BY status'), ENROLLMENT_STATUSES)
  const tickets = countsBy(await many('SELECT status, COUNT(*)::int AS count FROM payment_tickets GROUP BY status'), TICKET_STATUSES)
  const finance = await one(`SELECT COALESCE(SUM(total_amount),0)::float8 AS total, COALESCE(SUM(amount_paid),0)::float8 AS paid FROM tuition_ledgers`)
  const byProgram = await many(
    `SELECT sp.program, COUNT(*)::int AS count
     FROM student_profiles sp JOIN users u ON u.id = sp.user_id
     WHERE u.status = 'approved' GROUP BY sp.program ORDER BY sp.program`
  )
  const totals = await one('SELECT (SELECT COUNT(*) FROM courses)::int AS courses, (SELECT COUNT(*) FROM class_sections)::int AS sections')
  const pendingUsers = sum((u) => u.status === 'pending')

  return {
    kind: 'admin',
    counts: {
      students: sum((u) => u.role === 'student' && u.status === 'approved'),
      faculty: sum((u) => u.role === 'faculty' && u.status === 'approved'),
      staff: sum((u) => u.role === 'staff' && u.status === 'approved'),
      pending_users: pendingUsers,
      ...totals,
    },
    students_by_program: byProgram,
    enrollments,
    tickets,
    finance,
    attention: attention([
      { label: 'Accounts waiting for approval', count: pendingUsers, to: '/admin/users' },
      { label: 'Enrollment requests to review', count: enrollments.pending, to: '/enrollments' },
      { label: 'Tickets waiting for approval', count: tickets.pending, to: '/manage-tickets' },
      { label: 'Tickets ready to process', count: tickets.ready, to: '/manage-tickets' },
    ]),
  }
}

async function registrarStats() {
  const enrollments = countsBy(await many('SELECT status, COUNT(*)::int AS count FROM enrollments GROUP BY status'), ENROLLMENT_STATUSES)
  const tickets = countsBy(
    await many(`SELECT status, COUNT(*)::int AS count FROM payment_tickets WHERE purpose IN ('registration','inquiry') GROUP BY status`),
    TICKET_STATUSES
  )
  const byProgram = await many(
    `SELECT c.program, COUNT(*)::int AS count
     FROM enrollments e
     JOIN class_sections cs ON cs.section_id = e.section_id
     JOIN courses c ON c.course_id = cs.course_id
     WHERE e.status = 'approved' GROUP BY c.program ORDER BY c.program`
  )
  const totals = await one('SELECT (SELECT COUNT(*) FROM courses)::int AS courses, (SELECT COUNT(*) FROM class_sections)::int AS sections')
  return {
    kind: 'registrar',
    counts: totals,
    enrollments,
    tickets,
    enrollments_by_program: byProgram,
    attention: attention([
      { label: 'Enrollment requests to review', count: enrollments.pending, to: '/enrollments' },
      { label: 'Tickets waiting for approval', count: tickets.pending, to: '/manage-tickets' },
      { label: 'Tickets ready to process', count: tickets.ready, to: '/manage-tickets' },
    ]),
  }
}

async function accountingStats() {
  const tickets = countsBy(
    await many(`SELECT status, COUNT(*)::int AS count FROM payment_tickets WHERE purpose = 'accounting' GROUP BY status`),
    TICKET_STATUSES
  )
  const finance = await one(`SELECT COALESCE(SUM(total_amount),0)::float8 AS total, COALESCE(SUM(amount_paid),0)::float8 AS paid FROM tuition_ledgers`)
  const ledger = countsBy(
    (await many('SELECT payment_status AS status, COUNT(*)::int AS count FROM tuition_ledgers GROUP BY payment_status')),
    ['unpaid', 'partial', 'paid']
  )
  const topBalances = await many(
    `SELECT u.first_name, u.last_name, sp.program, l.total_amount::float8 AS total, l.amount_paid::float8 AS paid
     FROM tuition_ledgers l
     JOIN users u ON u.id = l.student_id
     JOIN student_profiles sp ON sp.user_id = l.student_id
     ORDER BY (l.total_amount - l.amount_paid) DESC LIMIT 5`
  )
  return {
    kind: 'accounting',
    tickets,
    finance,
    ledger,
    top_balances: topBalances,
    attention: attention([
      { label: 'Payment tickets waiting for approval', count: tickets.pending, to: '/manage-tickets' },
      { label: 'Payment tickets ready to process', count: tickets.ready, to: '/manage-tickets' },
    ]),
  }
}

async function facultyStats(userId) {
  const sections = await many(
    `SELECT cs.section_id, c.course_code, c.title, c.program, cs.days_of_week, cs.start_time, cs.end_time,
            cs.room_number, cs.max_capacity,
            COUNT(e.enrollment_id) FILTER (WHERE e.status = 'approved')::int AS enrolled,
            COUNT(e.enrollment_id) FILTER (WHERE e.status = 'approved' AND e.grade IS NULL)::int AS ungraded
     FROM class_sections cs
     JOIN courses c ON c.course_id = cs.course_id
     LEFT JOIN enrollments e ON e.section_id = cs.section_id
     WHERE cs.faculty_user_id = $1
     GROUP BY cs.section_id, c.course_code, c.title, c.program
     ORDER BY c.course_code`,
    [userId]
  )
  const students = sections.reduce((s, x) => s + x.enrolled, 0)
  const ungraded = sections.reduce((s, x) => s + x.ungraded, 0)
  return {
    kind: 'faculty',
    counts: { sections: sections.length, students, ungraded },
    sections,
    attention: attention([{ label: 'Students waiting for a grade', count: ungraded, to: '/teaching' }]),
  }
}

async function studentStats(userId) {
  const enrollments = countsBy(
    await many('SELECT status, COUNT(*)::int AS count FROM enrollments WHERE student_id = $1 GROUP BY status', [userId]),
    ENROLLMENT_STATUSES
  )
  const units = await one(
    `SELECT COALESCE(SUM(c.units),0)::int AS units
     FROM enrollments e
     JOIN class_sections cs ON cs.section_id = e.section_id
     JOIN courses c ON c.course_id = cs.course_id
     WHERE e.student_id = $1 AND e.status = 'approved'`,
    [userId]
  )
  const avg = await one(
    `SELECT AVG(CASE WHEN grade ~ '^[0-9]+([.][0-9]+)?$' THEN grade::numeric END)::float8 AS avg
     FROM enrollments WHERE student_id = $1 AND status = 'approved'`,
    [userId]
  )
  const ledger = await one(
    `SELECT total_amount::float8 AS total, amount_paid::float8 AS paid, payment_status AS status
     FROM tuition_ledgers WHERE student_id = $1`,
    [userId]
  )
  const nextTicket = await one(
    `SELECT reference_no, purpose, appointment_date::text AS appointment_date, time_slot, status
     FROM payment_tickets
     WHERE student_id = $1 AND status IN ('pending', 'ready')
     ORDER BY appointment_date, created_at LIMIT 1`,
    [userId]
  )
  const schedule = await many(
    `SELECT c.course_code, c.title, c.program, c.units, cs.days_of_week, cs.start_time, cs.end_time, cs.room_number,
            f.first_name || ' ' || f.last_name AS faculty_name, e.grade
     FROM enrollments e
     JOIN class_sections cs ON cs.section_id = e.section_id
     JOIN courses c ON c.course_id = cs.course_id
     LEFT JOIN users f ON f.id = cs.faculty_user_id
     WHERE e.student_id = $1 AND e.status = 'approved'
     ORDER BY c.course_code`,
    [userId]
  )
  return {
    kind: 'student',
    units: units.units,
    avg_grade: avg?.avg ?? null,
    enrollments,
    ledger: ledger || null,
    next_ticket: nextTicket || null,
    schedule,
    attention: attention([
      { label: 'Enrollment requests waiting for approval', count: enrollments.pending, to: '/enroll' },
    ]),
  }
}

router.get('/', handle(async (req, res) => {
  const key = roleKey(req.user)
  if (key === 'admin') return res.json(await adminStats())
  if (key === 'registrar') return res.json(await registrarStats())
  if (key === 'accounting') return res.json(await accountingStats())
  if (key === 'faculty') return res.json(await facultyStats(req.user.id))
  if (key === 'student') return res.json(await studentStats(req.user.id))
  res.json({ kind: 'none', attention: [] })
}))

export default router
