import { useState } from 'react'
import { Banknote, Check, ClipboardList, MessageCircle, Pencil, ScanLine, Trash2, X } from 'lucide-react'
import Page from '../../components/Page'
import { Modal } from '../../components/Modal'
import { useConfirm, useToast } from '../../components/Feedback'
import { Avatar, Badge, Btn, Card, ErrorBox, Field, Input, Loading, SearchBox, Select, cx, fmtDate, inputCls, peso } from '../../components/ui'
import { useFetch, useAction } from '../../hooks'
import { useAuth, roleKey } from '../../AuthContext'
import { api } from '../../api'

const SLOTS = ['09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '03:00 PM']
const COLUMNS = [
  { key: 'pending', title: 'Waiting for approval', dot: 'bg-amber-500' },
  { key: 'ready', title: 'Ready to process', dot: 'bg-emerald-500' },
  { key: 'completed', title: 'Completed', dot: 'bg-sky-500' },
  { key: 'denied', title: 'Denied', dot: 'bg-rose-500' },
]
const PURPOSE_ICON = { accounting: Banknote, registration: ClipboardList, inquiry: MessageCircle }

function TicketItem({ t, index, isAdmin, onStatus, onVerify, onEdit, onDelete }) {
  const Icon = PURPOSE_ICON[t.purpose]
  return (
    <Card hover className="anim-fade-up p-4" style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}>
      <div className="flex items-center gap-3">
        <Avatar name={`${t.first_name} ${t.last_name}`} size={38} />
        <div className="min-w-0">
          <p className="truncate font-semibold">{t.first_name} {t.last_name}</p>
          <p className="font-mono text-xs text-muted">{t.reference_no}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-lg bg-surface2 px-2 py-1 font-semibold capitalize"><Icon size={12} /> {t.purpose}</span>
        <span className="text-muted">{fmtDate(t.appointment_date)} · {t.time_slot}</span>
      </div>
      {t.purpose === 'accounting' && <p className="mt-2 text-sm font-semibold">{peso(t.amount_due)} <span className="font-normal text-muted">due</span></p>}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        {t.status === 'pending' && <Btn size="sm" variant="success" icon={Check} onClick={() => onStatus(t, 'ready')}>Approve</Btn>}
        {t.status === 'denied' && <Btn size="sm" variant="success" icon={Check} onClick={() => onStatus(t, 'ready')}>Approve</Btn>}
        {t.status === 'ready' && <Btn size="sm" icon={ScanLine} onClick={() => onVerify(t.reference_no)}>Verify</Btn>}
        {(t.status === 'pending' || t.status === 'ready') && <Btn size="sm" variant="ghost" icon={X} onClick={() => onStatus(t, 'denied')}>Deny</Btn>}
        {isAdmin && (
          <div className="ml-auto flex gap-1">
            <Btn size="sm" variant="plain" onClick={() => onEdit(t)} title="Edit"><Pencil size={14} /></Btn>
            <Btn size="sm" variant="plain" onClick={() => onDelete(t)} title="Delete" className="hover:text-rose-500"><Trash2 size={14} /></Btn>
          </div>
        )}
      </div>
    </Card>
  )
}

export default function ManageTickets() {
  const { user } = useAuth()
  const isAdmin = roleKey(user) === 'admin'
  const confirm = useConfirm()
  const toast = useToast()
  const { data, error, reload } = useFetch('/tickets')
  const { run, busy } = useAction(reload)

  const [search, setSearch] = useState('')
  const [ref, setRef] = useState('')
  const [verify, setVerify] = useState(null) // ticket found at the window
  const [paid, setPaid] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(null)

  const q = search.trim().toLowerCase()
  const all = (data || []).filter((t) => !q || `${t.first_name} ${t.last_name} ${t.reference_no} ${t.purpose}`.toLowerCase().includes(q))

  // ----- at the window -----
  async function lookup(value) {
    const r = (value || '').trim()
    if (!r) return
    try {
      const t = await api(`/tickets/lookup/${encodeURIComponent(r)}`)
      setVerify(t)
      setPaid(t.purpose === 'accounting' ? String(t.amount_due || '') : '')
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function complete() {
    const ok = await run(
      () => api(`/tickets/${verify.ticket_id}/complete`, { method: 'POST', body: { amount_paid: paid } }),
      'Transaction completed'
    )
    if (ok) { setVerify(null); setRef('') }
  }

  async function approveInModal() {
    const ok = await run(() => api(`/tickets/${verify.ticket_id}/status`, { method: 'PATCH', body: { status: 'ready' } }), 'Ticket approved')
    if (ok) lookup(verify.reference_no)
  }

  // ----- approve / deny -----
  const setStatus = (t, status) =>
    run(() => api(`/tickets/${t.ticket_id}/status`, { method: 'PATCH', body: { status } }), status === 'ready' ? `${t.reference_no} approved` : `${t.reference_no} denied`)

  // ----- admin -----
  function startEdit(t) {
    setEditingId(t.ticket_id)
    setForm({ purpose: t.purpose, appointment_date: t.appointment_date, time_slot: t.time_slot, amount_due: String(t.amount_due) })
  }
  async function saveEdit(e) {
    e.preventDefault()
    const ok = await run(() => api(`/tickets/${editingId}`, { method: 'PATCH', body: form }), 'Ticket updated')
    if (ok) setForm(null)
  }
  async function remove(t) {
    const yes = await confirm({ title: `Delete ticket ${t.reference_no}?`, message: `${t.first_name} ${t.last_name}`, confirmLabel: 'Delete', danger: true })
    if (yes) run(() => api(`/tickets/${t.ticket_id}`, { method: 'DELETE' }), 'Ticket deleted')
  }

  const set = (f) => (e) => setForm({ ...form, [f]: e.target.value })
  const balance = verify?.ledger ? verify.ledger.total_amount - verify.ledger.amount_paid : 0

  return (
    <Page title="Appointment Tickets" subtitle="Approve tickets, then verify the reference number when the student arrives.">
      <ErrorBox error={error} />

      <Card className="mb-6 overflow-hidden">
        <div className="bg-linear-to-r from-brand-500/10 to-gold-500/10 p-5">
          <p className="mb-3 flex items-center gap-2 font-bold"><ScanLine size={18} className="text-brand-600 dark:text-brand-300" /> At the window: enter a reference number</p>
          <form onSubmit={(e) => { e.preventDefault(); lookup(ref) }} className="flex max-w-xl gap-2">
            <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="REF-2026-12345" className={cx(inputCls, 'font-mono text-base')} />
            <Btn type="submit" size="lg">Find ticket</Btn>
          </form>
        </div>
      </Card>

      <SearchBox value={search} onChange={setSearch} placeholder="Filter by student, reference or purpose..." className="mb-5 max-w-md" />
      {!data && !error && <Loading rows={3} />}

      {data && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => {
            const items = all.filter((t) => t.status === col.key)
            return (
              <div key={col.key} className="rounded-3xl border border-line bg-surface2/60 p-3">
                <div className="mb-3 flex items-center justify-between px-2 pt-1">
                  <p className="flex items-center gap-2 text-sm font-bold"><span className={cx('h-2.5 w-2.5 rounded-full', col.dot)} />{col.title}</p>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-bold text-muted">{items.length}</span>
                </div>
                <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
                  {items.length === 0 && <p className="py-8 text-center text-sm text-muted">Nothing here</p>}
                  {items.map((t, i) => (
                    <TicketItem key={t.ticket_id} t={t} index={i} isAdmin={isAdmin} onStatus={setStatus} onVerify={lookup} onEdit={startEdit} onDelete={remove} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal
        open={!!verify}
        onClose={() => setVerify(null)}
        title="Verify ticket"
        subtitle={verify && `#${verify.reference_no}`}
        footer={
          verify && (
            <>
              <Btn variant="ghost" onClick={() => setVerify(null)}>Close</Btn>
              {verify.status === 'pending' && <Btn variant="success" icon={Check} loading={busy} onClick={approveInModal}>Approve now</Btn>}
              {verify.status === 'ready' && <Btn variant="success" icon={Check} loading={busy} onClick={complete}>Complete transaction</Btn>}
            </>
          )
        }
      >
        {verify && (
          <div>
            <div className="flex items-center gap-3 rounded-2xl bg-surface2 p-4">
              <Avatar name={`${verify.first_name} ${verify.last_name}`} size={48} />
              <div className="flex-1">
                <p className="font-bold">{verify.first_name} {verify.last_name}</p>
                <p className="text-sm text-muted">{verify.student_number}</p>
              </div>
              <Badge value={verify.status} />
            </div>
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted">Purpose</dt><dd className="font-semibold capitalize">{verify.purpose}</dd>
              <dt className="text-muted">When</dt><dd className="font-semibold">{fmtDate(verify.appointment_date)} · {verify.time_slot}</dd>
              {verify.purpose === 'accounting' && verify.ledger && (
                <>
                  <dt className="text-muted">Balance</dt>
                  <dd className="font-semibold text-rose-500">{peso(balance)} <span className="font-normal text-muted">of {peso(verify.ledger.total_amount)}</span></dd>
                </>
              )}
            </dl>

            {verify.status === 'pending' && <p className="mt-4 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-500">This ticket is still waiting for approval.</p>}
            {(verify.status === 'completed' || verify.status === 'denied') && <p className="mt-4 rounded-xl bg-surface2 p-3 text-sm text-muted">This ticket is {verify.status}, so it cannot be processed.</p>}
            {verify.status === 'ready' && verify.purpose === 'accounting' && (
              <div className="mt-4">
                <Field label="Cash received (₱)">
                  <Input type="number" min="0" step="0.01" value={paid} onChange={(e) => setPaid(e.target.value)} />
                </Field>
                <div className="mt-2 flex gap-2">
                  <Btn size="sm" variant="soft" onClick={() => setPaid(String(balance))}>Full balance</Btn>
                  <Btn size="sm" variant="plain" onClick={() => setPaid('0')}>No payment</Btn>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title="Edit ticket"
        footer={<><Btn variant="ghost" onClick={() => setForm(null)}>Cancel</Btn><Btn type="submit" form="ticket-form" loading={busy}>Save</Btn></>}
      >
        {form && (
          <form id="ticket-form" onSubmit={saveEdit} className="grid gap-4 sm:grid-cols-2">
            <Field label="Purpose">
              <Select value={form.purpose} onChange={set('purpose')}>
                <option value="accounting">Accounting</option>
                <option value="registration">Registration</option>
                <option value="inquiry">Inquiry</option>
              </Select>
            </Field>
            <Field label="Amount due"><Input type="number" min="0" step="0.01" value={form.amount_due} onChange={set('amount_due')} /></Field>
            <Field label="Date"><Input type="date" required value={form.appointment_date} onChange={set('appointment_date')} /></Field>
            <Field label="Time slot">
              <Select value={form.time_slot} onChange={set('time_slot')}>{SLOTS.map((s) => <option key={s}>{s}</option>)}</Select>
            </Field>
          </form>
        )}
      </Modal>
    </Page>
  )
}
