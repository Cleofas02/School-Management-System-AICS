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

export default router
