import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Inbox, Search, TriangleAlert } from 'lucide-react'

// ---------- small helpers ----------
export const cx = (...parts) => parts.filter(Boolean).join(' ')

export const hhmm = (t) => (t ? t.slice(0, 5) : '')

export const schedule = (s) =>
  [s.days_of_week, s.start_time ? `${hhmm(s.start_time)}-${hhmm(s.end_time)}` : ''].filter(Boolean).join(' ') || 'TBA'

export const peso = (n) =>
  '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const pesoShort = (n) => '₱' + Math.round(Number(n || 0)).toLocaleString('en-PH')

export const fmtDate = (s) =>
  s ? new Date(s + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'

export const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

// Numbers that count up when they appear
export function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const end = Number(target) || 0
    const start = performance.now()
    let frame
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1)
      setValue(end * (1 - Math.pow(1 - p, 3)))
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])
  return value
}

// ---------- programs (each one has its own color) ----------
export const PROGRAMS = ['Computer Science', 'Computer Engineering', 'Entrepreneurship']

export const PROGRAM = {
  'Computer Science': { short: 'CS', hex: '#2f6fd1', chip: 'bg-brand-500/15 text-brand-600 dark:text-brand-300', bar: 'bg-brand-500', grad: 'from-brand-500 to-brand-700' },
  'Computer Engineering': { short: 'CpE', hex: '#06b6d4', chip: 'bg-cyan-500/15 text-cyan-500', bar: 'bg-cyan-500', grad: 'from-cyan-500 to-sky-500' },
  Entrepreneurship: { short: 'ENT', hex: '#f5a623', chip: 'bg-gold-500/15 text-gold-600 dark:text-gold-400', bar: 'bg-gold-500', grad: 'from-gold-400 to-gold-600' },
}
const FALLBACK = { short: '-', hex: '#94a3b8', chip: 'bg-slate-500/15 text-slate-500', bar: 'bg-slate-400', grad: 'from-slate-500 to-slate-400' }
export const programStyle = (p) => PROGRAM[p] || FALLBACK

export function ProgramChip({ program, full = false }) {
  const p = programStyle(program)
  return <span className={cx('inline-block rounded-lg px-2 py-0.5 text-xs font-bold', p.chip)}>{full ? program : p.short}</span>
}

// ---------- building blocks ----------
export function Card({ className, hover = false, children, ...rest }) {
  return (
    <div
      {...rest}
      className={cx(
        'rounded-2xl border border-line bg-surface shadow-sm',
        hover && 'transition duration-200 hover:-translate-y-0.5 hover:shadow-lg',
        className
      )}
    >
      {children}
    </div>
  )
}

const VARIANTS = {
  primary: 'bg-linear-to-r from-brand-500 to-brand-700 text-white shadow-md shadow-brand-500/25 hover:brightness-110',
  success: 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-600',
  danger: 'bg-rose-500 text-white shadow-md shadow-rose-500/20 hover:bg-rose-600',
  soft: 'bg-brand-500/10 text-brand-600 dark:text-brand-300 hover:bg-brand-500/20',
  ghost: 'border border-line text-ink hover:bg-surface2',
  plain: 'text-muted hover:bg-surface2 hover:text-ink',
}
const SIZES = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-3 text-sm' }

export function Btn({ variant = 'primary', size = 'md', icon: Icon, loading, className, children, ...props }) {
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-95 disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
    >
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : Icon && <Icon size={size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  )
}

const STATUS = {
  pending: 'bg-amber-500/15 text-amber-500',
  approved: 'bg-emerald-500/15 text-emerald-500',
  ready: 'bg-emerald-500/15 text-emerald-500',
  paid: 'bg-emerald-500/15 text-emerald-500',
  completed: 'bg-sky-500/15 text-sky-500',
  partial: 'bg-orange-500/15 text-orange-500',
  denied: 'bg-rose-500/15 text-rose-500',
  unpaid: 'bg-rose-500/15 text-rose-500',
  dropped: 'bg-slate-500/15 text-slate-400',
}

export function Badge({ value }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize', STATUS[value] || 'bg-slate-500/15 text-slate-400')}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {value}
    </span>
  )
}

const AVATAR_COLORS = [
  'from-brand-500 to-brand-700', 'from-cyan-500 to-sky-500', 'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500', 'from-rose-500 to-pink-500', 'from-gold-400 to-gold-600',
]

export function Avatar({ name = '?', size = 40, className }) {
  const parts = name.trim().split(/\s+/)
  const initials = ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
  const hash = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={cx('grid shrink-0 place-items-center rounded-full bg-linear-to-br font-bold text-white', AVATAR_COLORS[hash % AVATAR_COLORS.length], className)}
    >
      {initials}
    </div>
  )
}

// ---------- form fields ----------
export const inputCls =
  'w-full rounded-xl border border-line bg-surface2 px-3.5 py-2.5 text-sm text-ink placeholder:text-muted transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40'

export function Field({ label, children, className }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  )
}

// If you pass your own width (w-24, w-auto ...), the default w-full is dropped so the two never fight
const fieldCls = (className) => cx(/(^|\s)w-/.test(className || '') ? inputCls.replace('w-full ', '') : inputCls, className)
export const Input = ({ className, ...props }) => <input {...props} className={fieldCls(className)} />
export const Select = ({ className, children, ...props }) => (
  <select {...props} className={fieldCls(className)}>{children}</select>
)

export function SearchBox({ value, onChange, placeholder = 'Search...', className }) {
  return (
    <div className={cx('relative', className)}>
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cx(inputCls, 'pl-10')} />
    </div>
  )
}

// Pill tabs: tabs = [{ value, label, count }]
export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cx('inline-flex flex-wrap gap-1 rounded-2xl border border-line bg-surface2 p-1', className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cx(
            'flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-sm font-semibold transition',
            value === t.value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={cx('rounded-full px-1.5 text-xs', value === t.value ? 'bg-brand-500/15 text-brand-600 dark:text-brand-300' : 'bg-line text-muted')}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export function Progress({ value, max = 100, color = 'bg-brand-500', className }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className={cx('h-2 w-full overflow-hidden rounded-full bg-line', className)}>
      <div className={cx('h-full rounded-full transition-all duration-700', color)} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ---------- states ----------
export function EmptyState({ icon: Icon = Inbox, title, text }) {
  return (
    <div className="anim-fade-up grid place-items-center rounded-2xl border border-dashed border-line px-6 py-14 text-center">
      <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-surface2 text-muted"><Icon size={26} /></div>
      <p className="font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-xs text-sm text-muted">{text}</p>}
    </div>
  )
}

export function ErrorBox({ error }) {
  if (!error) return null
  return (
    <div className="mb-4 flex items-center gap-3 rounded-2xl bg-rose-500/10 p-4 text-sm text-rose-500">
      <TriangleAlert size={18} /> {error}
    </div>
  )
}

export function Loading({ rows = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
    </div>
  )
}

// Big number card with an icon. Add `to` to make it a link.
const TONES = {
  indigo: 'from-brand-500 to-brand-700 shadow-brand-500/30',
  cyan: 'from-cyan-500 to-sky-500 shadow-cyan-500/30',
  emerald: 'from-emerald-500 to-teal-500 shadow-emerald-500/30',
  amber: 'from-gold-400 to-gold-600 shadow-gold-500/30',
  rose: 'from-rose-500 to-pink-500 shadow-rose-500/30',
}

export function StatCard({ icon: Icon, label, value, format, tone = 'indigo', hint, to, delay = 0 }) {
  const n = useCountUp(value)
  const shown = format ? format(n) : Math.round(n).toLocaleString()
  const card = (
    <Card hover className="anim-fade-up h-full p-5" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight">{shown}</p>
          {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
        </div>
        <div className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-linear-to-br text-white shadow-lg', TONES[tone])}>
          <Icon size={20} />
        </div>
      </div>
    </Card>
  )
  return to ? <Link to={to} className="block">{card}</Link> : card
}
