import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuth } from '../AuthContext'
import AuthLayout from '../components/AuthLayout'
import { Btn, Field, Input } from '../components/ui'

export default function Login() {
  const { user, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <h2 className="text-3xl font-extrabold tracking-tight">Welcome back 👋</h2>
      <p className="mt-2 text-muted">Log in to your account to continue.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {error && <div className="anim-pop rounded-2xl bg-rose-500/10 p-3.5 text-sm font-medium text-rose-500">{error}</div>}

        <Field label="Email">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.com" />
        </Field>
        <Field label="Password">
          <div className="relative">
            <Input
              type={show ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="pr-11"
            />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink">
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>

        <Btn type="submit" size="lg" loading={busy} icon={LogIn} className="w-full">Log in</Btn>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New student?{' '}
        <Link to="/register" className="font-semibold text-brand-600 dark:text-brand-300 hover:underline">Create an account</Link>
      </p>
    </AuthLayout>
  )
}
