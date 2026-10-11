import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth, requireAccess, roleKey } from '../middleware/authMiddleware.js'
import { handle, httpError, mustBeOneOf, paymentStatus } from '../utils.js'

const router = Router()
router.use(requireAuth)

const PURPOSES = ['accounting', 'registration', 'inquiry']
const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/

const TICKET_SELECT = `
  SELECT t.ticket_id, t.reference_no, t.purpose, t.appointment_date::text AS appointment_date,
         t.time_slot, t.amount_due::float8 AS amount_due, t.status, t.created_at, t.student_id,
         u.first_name, u.last_name, sp.student_number
  FROM payment_tickets t
  JOIN users u ON u.id = t.student_id
  JOIN student_profiles sp ON sp.user_id = t.student_id`

// Which ticket purposes can this person see? (null = all)
function purposesFor(user) {
  const key = roleKey(user)
  if (key === 'admin') return null
  if (key === 'registrar') return ['registration', 'inquiry']
  if (key === 'accounting') return ['accounting']
  throw httpError(403, 'You do not have permission to do this')
}

// Load a ticket and make sure this staff member is allowed to handle it
async function loadTicketFor(user, id) {
  const result = await pool.query(`${TICKET_SELECT} WHERE t.ticket_id = $1`, [id])
  const ticket = result.rows[0]
  if (!ticket) throw httpError(404, 'Ticket not found')
  const allowed = purposesFor(user)
  if (allowed && !allowed.includes(ticket.purpose)) {
    throw httpError(403, 'This ticket belongs to another department')
  }
  return ticket
}

const staffOnly = requireAccess('admin', 'registrar', 'accounting')

// GET /api/tickets
//   student -> their own tickets
//   staff   -> tickets for their department (admin sees all). Optional ?status=ready
router.get('/', handle(async (req, res) => {
  const key = roleKey(req.user)
  const params = []
  const where = []

  if (key === 'student') {
    params.push(req.user.id)
    where.push(`t.student_id = $${params.length}`)
  } else {
    const allowed = purposesFor(req.user)
    if (allowed) {
      params.push(allowed)
      where.push(`t.purpose = ANY($${params.length})`)
    }
    if (req.query.status) {
      params.push(req.query.status)
      where.push(`t.status = $${params.length}`)
    }
  }
  const sql = `${TICKET_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY t.created_at DESC`
  const result = await pool.query(sql, params)
  res.json(result.rows)
}))

// POST /api/tickets  - a student books an appointment and gets a reference number
router.post('/', requireAccess('student'), handle(async (req, res) => {
  const { purpose, appointment_date, time_slot } = req.body
  mustBeOneOf(purpose, PURPOSES, 'Purpose')
  if (!DATE_FORMAT.test(appointment_date || '')) throw httpError(400, 'Please choose a date')
  if (!time_slot) throw httpError(400, 'Please choose a time slot')

  // For accounting visits the student says how much they will pay (default: the whole balance).
  // It can never be more than what they still owe.
  let amountDue = 0
  if (purpose === 'accounting') {
    const ledger = await pool.query(
      'SELECT total_amount::float8 AS total, amount_paid::float8 AS paid FROM tuition_ledgers WHERE student_id = $1',
      [req.user.id]
    )
    if (ledger.rows[0]) {
      const balance = Math.max(ledger.rows[0].total - ledger.rows[0].paid, 0)
      const asked = req.body.amount
      if (asked === undefined || asked === null || asked === '') {
        amountDue = balance
      } else {
        const amount = Math.round(Number(asked) * 100) / 100
        if (!(amount > 0) || amount > balance + 0.001) {
          throw httpError(400, `Amount must be more than 0 and not more than your balance (${balance.toFixed(2)})`)
        }
        amountDue = amount
      }
    }
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const ref = `REF-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`
    try {
      const result = await pool.query(
        `INSERT INTO payment_tickets (student_id, reference_no, purpose, appointment_date, time_slot, amount_due)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING ticket_id, reference_no`,
        [req.user.id, ref, purpose, appointment_date, time_slot, amountDue]
      )
      return res.status(201).json(result.rows[0])
    } catch (err) {
      if (err.code !== '23505') throw err // only retry if the reference number was taken
    }
  }
  throw httpError(500, 'Could not create the ticket. Please try again.')
}))

// GET /api/tickets/lookup/:ref  - staff types the reference number at the window
router.get('/lookup/:ref', staffOnly, handle(async (req, res) => {
  const result = await pool.query(`${TICKET_SELECT} WHERE t.reference_no = $1`, [req.params.ref.trim().toUpperCase()])
  const ticket = result.rows[0]
  if (!ticket) throw httpError(404, 'No ticket found with that reference number')
  const allowed = purposesFor(req.user)
  if (allowed && !allowed.includes(ticket.purpose)) {
    throw httpError(403, 'This ticket belongs to another department')
  }
  const ledger = await pool.query(
    'SELECT total_amount::float8 AS total_amount, amount_paid::float8 AS amount_paid FROM tuition_ledgers WHERE student_id = $1',
    [ticket.student_id]
  )
  res.json({ ...ticket, ledger: ledger.rows[0] || null })
}))

// PATCH /api/tickets/:id/status  - approve (ready) or deny a ticket
router.patch('/:id/status', staffOnly, handle(async (req, res) => {
  const status = mustBeOneOf(req.body.status, ['pending', 'ready', 'denied'], 'Status')
  const ticket = await loadTicketFor(req.user, req.params.id)
  if (ticket.status === 'completed') throw httpError(400, 'This ticket is already completed')
  await pool.query('UPDATE payment_tickets SET status = $1 WHERE ticket_id = $2', [status, ticket.ticket_id])
  res.json({ ok: true })
}))

// POST /api/tickets/:id/complete  - student showed up, transaction done
//   For accounting tickets, send { amount_paid } to record cash received.
router.post('/:id/complete', staffOnly, handle(async (req, res) => {
  const ticket = await loadTicketFor(req.user, req.params.id)
  if (ticket.status !== 'ready') throw httpError(400, 'The ticket must be approved (ready) before it can be completed')

  const amount = Number(req.body.amount_paid) || 0
  if (amount < 0) throw httpError(400, 'Amount cannot be negative')

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    if (ticket.purpose === 'accounting' && amount > 0) {
      const ledger = await client.query('SELECT * FROM tuition_ledgers WHERE student_id = $1 FOR UPDATE', [ticket.student_id])
      if (!ledger.rows[0]) throw httpError(400, 'This student has no tuition ledger yet')
      const newPaid = Number(ledger.rows[0].amount_paid) + amount
      await client.query(
        'UPDATE tuition_ledgers SET amount_paid = $1, payment_status = $2 WHERE ledger_id = $3',
        [newPaid, paymentStatus(ledger.rows[0].total_amount, newPaid), ledger.rows[0].ledger_id]
      )
    }
    await client.query("UPDATE payment_tickets SET status = 'completed' WHERE ticket_id = $1", [ticket.ticket_id])
    await client.query('COMMIT')
    res.json({ ok: true })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}))

// PATCH /api/tickets/:id  - admin edits ticket details
router.patch('/:id', requireAccess('admin'), handle(async (req, res) => {
  const { purpose, appointment_date, time_slot, amount_due } = req.body
  mustBeOneOf(purpose, PURPOSES, 'Purpose')
  if (!DATE_FORMAT.test(appointment_date || '')) throw httpError(400, 'Please choose a date')
  if (!time_slot) throw httpError(400, 'Please choose a time slot')
  const amount = Number(amount_due)
  if (Number.isNaN(amount) || amount < 0) throw httpError(400, 'Amount must be 0 or more')

  const result = await pool.query(
    `UPDATE payment_tickets SET purpose = $1, appointment_date = $2, time_slot = $3, amount_due = $4
     WHERE ticket_id = $5 RETURNING ticket_id`,
    [purpose, appointment_date, time_slot, amount, req.params.id]
  )
  if (!result.rows[0]) throw httpError(404, 'Ticket not found')
  res.json({ ok: true })
}))

// DELETE /api/tickets/:id  (admin)
router.delete('/:id', requireAccess('admin'), handle(async (req, res) => {
  const result = await pool.query('DELETE FROM payment_tickets WHERE ticket_id = $1 RETURNING ticket_id', [req.params.id])
  if (!result.rows[0]) throw httpError(404, 'Ticket not found')
  res.json({ ok: true })
}))

export default router
