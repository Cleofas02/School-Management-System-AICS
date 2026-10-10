import { useState } from 'react'
import { Banknote, CalendarDays, MessageCircle, ClipboardList, Copy, Ticket as TicketIcon } from 'lucide-react'
import Page from '../../components/Page'
import { Modal } from '../../components/Modal'
import { useToast } from '../../components/Feedback'
import { Ring } from '../../components/charts'
import { Btn, Card, EmptyState, ErrorBox, Loading, cx, fmtDate, peso } from '../../components/ui'
import { useFetch, useAction } from '../../hooks'
import { api } from '../../api'

const SLOTS = ['09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '03:00 PM']
const PURPOSES = [
  ['accounting', 'Accounting', 'Pay tuition in cash', Banknote],
  ['registration', 'Registration', 'Enrollment documents', ClipboardList],
  ['inquiry', 'Inquiry', 'Ask the registrar', MessageCircle],
]
const OFFICE = { accounting: 'Accounting', registration: 'Registrar', inquiry: 'Registrar' }

const STATUS_LOOK = {
  pending: { label: 'Waiting for approval', bar: 'bg-amber-500', text: 'text-amber-500' },
  ready: { label: 'Ready to go', bar: 'bg-emerald-500', text: 'text-emerald-500' },
  completed: { label: 'Completed', bar: 'bg-sky-500', text: 'text-sky-500' },
  denied: { label: 'Denied', bar: 'bg-rose-500', text: 'text-rose-500' },
}

// The next 12 days (no Sundays), as YYYY-MM-DD
function nextDays() {
  const days = []
  const d = new Date()
  while (days.length < 12) {
    if (d.getDay() !== 0) days.push({ value: d.toLocaleDateString('en-CA'), weekday: d.toLocaleDateString('en-PH', { weekday: 'short' }), day: d.getDate(), month: d.toLocaleDateString('en-PH', { month: 'short' }) })
    d.setDate(d.getDate() + 1)
  }
  return days
}

// A decorative QR-like pattern made from the reference number (not a real QR code)
function QrArt({ seed }) {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const cells = []
  for (let i = 0; i < 81; i++) {
    h = (h * 1103515245 + 12345) >>> 0
    cells.push((h >> 16) & 1)
  }
  return (
    <svg viewBox="0 0 9 9" className="h-24 w-24 rounded-lg bg-white p-1.5 text-slate-900">
      {cells.map((on, i) => on ? <rect key={i} x={i % 9} y={Math.floor(i / 9)} width="1" height="1" fill="currentColor" /> : null)}
    </svg>
  )
}

function TicketCard({ t, index }) {
  const look = STATUS_LOOK[t.status]
  return (
    <div className="anim-fade-up relative flex overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition hover:shadow-lg" style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
      <div className={cx('w-1.5', look.bar)} />
      <div className="min-w-0 flex-1 p-5">
        <p className={cx('text-xs font-bold uppercase tracking-wide', look.text)}>{t.status === 'ready' ? `Ready to go to ${OFFICE[t.purpose]}` : look.label}</p>
        <p className="mt-1 font-mono text-xl font-extrabold">#{t.reference_no}</p>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted">Student</dt><dd className="font-medium">{t.first_name} {t.last_name}</dd>
          <dt className="text-muted">Office</dt><dd className="font-medium">{OFFICE[t.purpose]} · <span className="capitalize">{t.purpose}</span></dd>
          <dt className="text-muted">When</dt><dd className="font-medium">{fmtDate(t.appointment_date)} · {t.time_slot}</dd>
          {t.purpose === 'accounting' && <><dt className="text-muted">Amount due</dt><dd className="font-medium">{peso(t.amount_due)}</dd></>}
        </dl>
      </div>
      <div className="relative grid w-32 shrink-0 place-items-center border-l-2 border-dashed border-line p-3 sm:w-36">
        <QrArt seed={t.reference_no} />
        <span className="pointer-events-none absolute -left-3 -top-3 h-6 w-6 rounded-full bg-canvas" />
        <span className="pointer-events-none absolute -bottom-3 -left-3 h-6 w-6 rounded-full bg-canvas" />
      </div>
    </div>
  )
}

export default function Tickets() {
  const toast = useToast()
  const tickets = useFetch('/tickets')
  const ledger = useFetch('/ledgers')
  const { run, busy } = useAction(() => Promise.all([tickets.reload(), ledger.reload()]))

  const days = nextDays()
  const [purpose, setPurpose] = useState('accounting')
  const [date, setDate] = useState(days[0].value)
  const [slot, setSlot] = useState(SLOTS[0])
  const [created, setCreated] = useState(null) // the new ticket, shown in a pop-up

  const list = tickets.data || []
  const my = (ledger.data || [])[0]
  const balance = my ? my.total_amount - my.amount_paid : 0

  async function book() {
    let result
    const ok = await run(async () => {
      result = await api('/tickets', { method: 'POST', body: { purpose, appointment_date: date, time_slot: slot } })
    })
    if (ok) setCreated(result)
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(created.reference_no)
      toast.success('Reference number copied')
    } catch {
      toast.error('Could not copy. Please copy it by hand.')
    }
  }

  return (
    <Page title="Appointments & Balance" subtitle="Book a visit, get your reference number, and show it at the window.">
      <ErrorBox error={tickets.error || ledger.error} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <h3 className="mb-4 font-bold">Tuition balance</h3>
          {!ledger.data && !ledger.error && <Loading rows={1} />}
          {ledger.data && !my && <p className="text-sm text-muted">Your tuition appears once your account is approved.</p>}
          {my && (
            <div className="flex items-center gap-5">
              <Ring value={my.amount_paid} max={my.total_amount} color="#10b981" size={110} thickness={12}>
                <p className="text-xl font-extrabold">{my.total_amount > 0 ? Math.round((my.amount_paid / my.total_amount) * 100) : 0}%</p>
              </Ring>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted">Total </span><b>{peso(my.total_amount)}</b></p>
                <p><span className="text-muted">Paid </span><b className="text-emerald-500">{peso(my.amount_paid)}</b></p>
                <p><span className="text-muted">Balance </span><b className="text-rose-500">{peso(balance)}</b></p>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-4 font-bold">Book an appointment</h3>

          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">1. What do you need?</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {PURPOSES.map(([value, label, text, Icon]) => (
              <button
                key={value}
                onClick={() => setPurpose(value)}
                className={cx('rounded-2xl border p-4 text-left transition', purpose === value ? 'border-brand-500 bg-brand-500/10 shadow-md shadow-brand-500/10' : 'border-line bg-surface2 hover:border-brand-500/50')}
              >
                <Icon size={22} className={purpose === value ? 'text-brand-600 dark:text-brand-300' : 'text-muted'} />
                <p className="mt-2 font-bold">{label}</p>
                <p className="text-xs text-muted">{text}</p>
              </button>
            ))}
          </div>

          <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-muted">2. Pick a day</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {days.map((d) => (
              <button
                key={d.value}
                onClick={() => setDate(d.value)}
                className={cx('w-16 shrink-0 rounded-2xl border py-2.5 text-center transition', date === d.value ? 'border-transparent bg-linear-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-500/30' : 'border-line bg-surface2 hover:border-brand-500/50')}
              >
                <p className="text-xs opacity-80">{d.weekday}</p>
                <p className="text-xl font-extrabold">{d.day}</p>
                <p className="text-xs opacity-80">{d.month}</p>
              </button>
            ))}
          </div>

          <p className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wide text-muted">3. Pick a time</p>
          <div className="flex flex-wrap gap-2">
            {SLOTS.map((s) => (
              <button
                key={s}
                onClick={() => setSlot(s)}
                className={cx('rounded-xl px-4 py-2 text-sm font-semibold transition', slot === s ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30' : 'bg-surface2 hover:bg-brand-500/15')}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface2 p-4">
            <p className="text-sm"><b className="capitalize">{purpose}</b> · {fmtDate(date)} · {slot}</p>
            <Btn icon={CalendarDays} loading={busy} onClick={book}>Get reference number</Btn>
          </div>
        </Card>
      </div>

      <h3 className="mb-3 mt-8 font-bold">My tickets</h3>
      {!tickets.data && !tickets.error && <Loading rows={2} />}
      {tickets.data && list.length === 0 && <EmptyState icon={TicketIcon} title="No tickets yet" text="Book an appointment above and your ticket will appear here." />}
      <div className="grid gap-4 xl:grid-cols-2">
        {list.map((t, i) => <TicketCard key={t.ticket_id} t={t} index={i} />)}
      </div>

      <Modal open={!!created} onClose={() => setCreated(null)} title="You're all set! 🎉" subtitle="Show this reference number at the window." size="sm"
        footer={<><Btn variant="ghost" icon={Copy} onClick={copy}>Copy</Btn><Btn onClick={() => setCreated(null)}>Done</Btn></>}>
        {created && (
          <div className="text-center">
            <p className="font-mono text-3xl font-extrabold tracking-wide text-brand-600 dark:text-brand-300">#{created.reference_no}</p>
            <div className="mt-4 flex justify-center"><QrArt seed={created.reference_no} /></div>
            <p className="mt-4 text-sm text-muted">Your ticket is waiting for approval. Its status will change to "Ready" here when it is approved.</p>
          </div>
        )}
      </Modal>
    </Page>
  )
}
