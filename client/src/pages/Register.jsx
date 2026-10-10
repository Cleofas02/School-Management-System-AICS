import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import AuthLayout from '../components/AuthLayout'
import { Btn, Field, Input, PROGRAMS, cx, programStyle } from '../components/ui'

export default function Register() {
  const [form, setForm] = useState({ first_name: '', last_name: '', program: PROGRAMS[0], email: '', password: '' })
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const data = await api('/auth/register', { method: 'POST', body: form })
      setDone(data.message)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <AuthLayout>
        <div className="text-center">
          <svg viewBox="0 0 52 52" className="mx-auto h-24 w-24">
            <circle cx="26" cy="26" r="24" fill="none" stroke="#10b981" strokeWidth="3" opacity="0.25" />
            <path className="anim-check" fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" d="M14 27 l8 8 l16 -16" />
          </svg>
          <h2 className="mt-4 text-2xl font-extrabold">Registration sent</h2>
          <p className="mt-2 text-muted">{done}</p>
          <Link to="/login" className="mt-6 inline-block font-semibold text-brand-600 dark:text-brand-300 hover:underline">Back to login</Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <h2 className="text-3xl font-extrabold tracking-tight">Create your account</h2>
      <p className="mt-2 text-muted">An admin will review it before you can log in.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && <div className="anim-pop rounded-2xl bg-rose-500/10 p-3.5 text-sm font-medium text-rose-500">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <Field label="First name"><Input required value={form.first_name} onChange={set('first_name')} /></Field>
          <Field label="Last name"><Input required value={form.last_name} onChange={set('last_name')} /></Field>
        </div>

        <Field label="Program">
          <div className="grid gap-2">
            {PROGRAMS.map((p) => {
              const style = programStyle(p)
              const active = form.program === p
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm({ ...form, program: p })}
                  className={cx(
                    'flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm font-semibold transition',
                    active ? 'border-brand-500 bg-brand-500/10' : 'border-line bg-surface2 hover:border-brand-500/50'
                  )}
                >
                  <span className={cx('grid h-8 w-10 place-items-center rounded-lg text-xs font-bold', style.chip)}>{style.short}</span>
                  {p}
                </button>
              )
            })}
          </div>
        </Field>

        <Field label="Email"><Input type="email" required value={form.email} onChange={set('email')} /></Field>
        <Field label="Password (min. 8 characters)">
          <Input type="password" required minLength={8} value={form.password} onChange={set('password')} />
        </Field>

        <Btn type="submit" size="lg" loading={busy} className="w-full">Register</Btn>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand-600 dark:text-brand-300 hover:underline">Log in</Link>
      </p>
    </AuthLayout>
  )
}
