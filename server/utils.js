// Small helpers shared by all routes

// Wraps a route so errors are caught and turned into clean JSON messages
export const handle = (fn) => async (req, res) => {
  try {
    await fn(req, res)
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    if (err.code === '23505') return res.status(409).json({ error: 'That value already exists (duplicate)' })
    if (err.code === '23503') return res.status(409).json({ error: 'This record is linked to something that does not exist' })
    if (err.code === '22P02') return res.status(400).json({ error: 'Invalid value sent' })
    console.error(err)
    res.status(500).json({ error: 'Something went wrong' })
  }
}

// Throw this inside a route to send an error message: throw httpError(404, 'Not found')
export function httpError(status, message) {
  const err = new Error(message)
  err.status = status
  return err
}

// Turn '' or undefined into null (for optional database fields)
export const nullIfEmpty = (v) => (v === '' || v === undefined ? null : v)

// unpaid / partial / paid, based on the numbers
export function paymentStatus(total, paid) {
  const t = Number(total)
  const p = Number(paid)
  if (p <= 0) return 'unpaid'
  if (p >= t) return 'paid'
  return 'partial'
}

// Check that a value is one of the allowed options
export function mustBeOneOf(value, options, label) {
  if (!options.includes(value)) throw httpError(400, `${label} must be one of: ${options.join(', ')}`)
  return value
}

// The three programs offered by the school
export const PROGRAMS = ['Computer Science', 'Computer Engineering', 'Entrepreneurship']
