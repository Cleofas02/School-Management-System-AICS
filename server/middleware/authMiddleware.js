import jwt from 'jsonwebtoken'

// Step 1: is the user logged in? (valid token in the request header)
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'Please log in first' })
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET) // { id, role, department }
    next()
  } catch {
    res.status(401).json({ error: 'Session expired or invalid. Please log in again.' })
  }
}

// Staff are split into 'registrar' / 'accounting'. Everyone else uses their role.
export function roleKey(user) {
  return user.role === 'staff' ? user.department : user.role
}

// Step 2: is the user allowed? Use AFTER requireAuth.
// Example: requireAccess('admin', 'registrar')
export function requireAccess(...keys) {
  return (req, res, next) => {
    if (!keys.includes(roleKey(req.user))) {
      return res.status(403).json({ error: 'You do not have permission to do this' })
    }
    next()
  }
}

// Older helper (role only), kept for convenience
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to do this' })
    }
    next()
  }
}
