import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth, requireAccess, roleKey } from '../middleware/authMiddleware.js'
import { handle, httpError, paymentStatus } from '../utils.js'

const router = Router()
router.use(requireAuth)

const LEDGER_SELECT = `
  SELECT l.ledger_id, l.student_id, l.total_amount::float8 AS total_amount,
         l.amount_paid::float8 AS amount_paid, l.payment_status,
         u.first_name, u.last_name, sp.student_number, sp.program
  FROM tuition_ledgers l
  JOIN users u ON u.id = l.student_id
  JOIN student_profiles sp ON sp.user_id = l.student_id`

// GET /api/ledgers
//   student           -> only their own
//   accounting/admin  -> everyone's
router.get('/', handle(async (req, res) => {
  const key = roleKey(req.user)
  if (key === 'student') {
    const result = await pool.query(`${LEDGER_SELECT} WHERE l.student_id = $1`, [req.user.id])
    return res.json(result.rows)
  }
  if (key === 'accounting' || key === 'admin') {
    const result = await pool.query(`${LEDGER_SELECT} ORDER BY u.last_name, u.first_name`)
    return res.json(result.rows)
  }
  throw httpError(403, 'You do not have permission to do this')
}))

// PATCH /api/ledgers/:id  - set the total and amount paid (accounting or admin)
router.patch('/:id', requireAccess('accounting', 'admin'), handle(async (req, res) => {
  const total = Number(req.body.total_amount)
  const paid = Number(req.body.amount_paid)
  if (Number.isNaN(total) || Number.isNaN(paid) || total < 0 || paid < 0) {
    throw httpError(400, 'Amounts must be numbers of 0 or more')
  }
  const result = await pool.query(
    'UPDATE tuition_ledgers SET total_amount = $1, amount_paid = $2, payment_status = $3 WHERE ledger_id = $4 RETURNING ledger_id',
    [total, paid, paymentStatus(total, paid), req.params.id]
  )
  if (!result.rows[0]) throw httpError(404, 'Ledger not found')
  res.json({ ok: true })
}))

// POST /api/ledgers/:id/payments  - record ONE payment (accounting or admin)
// Safe for simultaneous requests: runs in a transaction and locks the ledger row
// (SELECT ... FOR UPDATE), so two payments to the same student are processed one at a time
// and no payment is ever lost.
router.post('/:id/payments', requireAccess('accounting', 'admin'), handle(async (req, res) => {
  const id = Number(req.params.id)
  const amount = Number(req.body.amount)
  if (!id) throw httpError(400, 'Invalid ledger')
  if (!Number.isFinite(amount) || amount <= 0) throw httpError(400, 'Payment must be a number greater than 0')

  const client = await pool.connect() // one connection from the shared pool
  try {
    console.log(`[payment] BEGIN transaction (ledger ${id}, amount ${amount})`)
    await client.query('BEGIN')
    console.log(`[payment] waiting for row lock on ledger ${id}`)
    const cur = await client.query(
      'SELECT total_amount::float8 AS total, amount_paid::float8 AS paid FROM tuition_ledgers WHERE ledger_id = $1 FOR UPDATE',
      [id]
    )
    if (!cur.rows[0]) throw httpError(404, 'Ledger not found')
    const { total, paid } = cur.rows[0]
    console.log(`[payment] lock acquired on ledger ${id}, paid so far = ${paid} of ${total}`)
    if (paid + amount > total + 0.005) {
      throw httpError(409, `Payment is more than the remaining balance (${(total - paid).toFixed(2)})`)
    }
    const upd = await client.query(
      `UPDATE tuition_ledgers
       SET amount_paid = amount_paid + $1,
           payment_status = CASE WHEN amount_paid + $1 >= total_amount THEN 'paid' ELSE 'partial' END
       WHERE ledger_id = $2
       RETURNING total_amount::float8 AS total_amount, amount_paid::float8 AS amount_paid, payment_status`,
      [amount, id]
    )
    await client.query('COMMIT')
    console.log(`[payment] COMMIT done (ledger ${id}, now paid ${upd.rows[0].amount_paid})`)
    res.status(201).json({ ok: true, ...upd.rows[0] })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.log(`[payment] ROLLBACK (ledger ${id}): ${err.message}`)
    throw err
  } finally {
    client.release()
  }
}))

export default router
