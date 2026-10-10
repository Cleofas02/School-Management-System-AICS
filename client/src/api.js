// Small helper for talking to our backend.
// Usage: const data = await api('/auth/me')
//        const data = await api('/auth/login', { method: 'POST', body: { email, password } })
// In development the Vite proxy forwards /api to localhost:5000.
// On Vercel, set VITE_API_URL to your deployed backend (e.g. https://sms-api.onrender.com).
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export async function api(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('token')

  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong')
  return data
}
