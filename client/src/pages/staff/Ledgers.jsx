import { useState } from 'react'
import { Banknote, Pencil, TrendingUp, Wallet } from 'lucide-react'
import Page from '../../components/Page'
import { Modal } from '../../components/Modal'
import {
  Avatar, Badge, Btn, Card, EmptyState, ErrorBox, Field, Input, Loading, PROGRAMS, ProgramChip, Progress,
  SearchBox, Select, StatCard, Tabs, peso, pesoShort,
} from '../../components/ui'
import { useFetch, useAction } from '../../hooks'
import { api } from '../../api'

export default function Ledgers() {
  const { data, error, reload } = useFetch('/ledgers')
  const { run, busy } = useAction(reload)

  const [status, setStatus] = useState('all')
  const [program, setProgram] = useState('all')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null) // the ledger being edited
  const [paying, setPaying] = useState(null) // the ledger receiving a payment
  const [payAmount, setPayAmount] = useState('')
  const [form, setForm] = useState({ total_amount: '', amount_paid: '' })

  const all = data || []
  const countOf = (s) => (s === 'all' ? all.length : all.filter((l) => l.payment_status === s).length)
  const q = search.trim().toLowerCase()
  const list = all.filter(
    (l) =>
      (status === 'all' || l.payment_status === status) &&
      (program === 'all' || l.program === program) &&
      (!q || `${l.first_name} ${l.last_name} ${l.student_number}`.toLowerCase().includes(q))
  )

  const billed = all.reduce((s, l) => s + l.total_amount, 0)
  const collected = all.reduce((s, l) => s + l.amount_paid, 0)

  function startEdit(l) {
    setEditing(l)
    setForm({ total_amount: String(l.total_amount), amount_paid: String(l.amount_paid) })
  }

  async function save(e) {
    e.preventDefault()
    const ok = await run(() => api(`/ledgers/${editing.ledger_id}`, { method: 'PATCH', body: form }), 'Tuition updated')
    if (ok) setEditing(null)
  }

  async function pay(e) {
    e.preventDefault()
    const ok = await run(() => api(`/ledgers/${paying.ledger_id}/payments`, { method: 'POST', body: { amount: payAmount } }), 'Payment recorded')
    if (ok) { setPaying(null); setPayAmount('') }
  }

  return (
    <Page title="Tuition" subtitle="Track what each student has paid.">
      <ErrorBox error={error} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Wallet} label="Total billed" value={billed} format={pesoShort} />
        <StatCard icon={Banknote} tone="emerald" label="Collected" value={collected} format={pesoShort} delay={60} />
        <StatCard icon={Wallet} tone="rose" label="Outstanding" value={billed - collected} format={pesoShort} delay={120} />
        <StatCard icon={TrendingUp} tone="cyan" label="Collection rate" value={billed > 0 ? (collected / billed) * 100 : 0} format={(n) => `${Math.round(n)}%`} delay={180} />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Tabs
          value={status}
          onChange={setStatus}
          tabs={[
            { value: 'all', label: 'All', count: countOf('all') },
            { value: 'unpaid', label: 'Unpaid', count: countOf('unpaid') },
            { value: 'partial', label: 'Partial', count: countOf('partial') },
            { value: 'paid', label: 'Paid', count: countOf('paid') },
          ]}
        />
        <Select value={program} onChange={(e) => setProgram(e.target.value)} className="w-auto">
          <option value="all">All programs</option>
          {PROGRAMS.map((p) => <option key={p}>{p}</option>)}
        </Select>
        <SearchBox value={search} onChange={setSearch} placeholder="Search name or student no." className="min-w-48 flex-1 sm:max-w-xs" />
      </div>

      {!data && !error && <Loading rows={4} />}
      {data && list.length === 0 && <EmptyState icon={Wallet} title="No tuition records found" />}

      <div className="space-y-3">
        {list.map((l, i) => {
          const balance = l.total_amount - l.amount_paid
          return (
            <Card key={l.ledger_id} hover className="anim-fade-up flex flex-wrap items-center gap-4 p-4" style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}>
              <div className="flex min-w-0 flex-1 basis-52 items-center gap-3">
                <Avatar name={`${l.first_name} ${l.last_name}`} size={42} />
                <div className="min-w-0">
                  <p className="truncate font-bold">{l.first_name} {l.last_name}</p>
                  <p className="text-xs text-muted">{l.student_number}</p>
                </div>
                <ProgramChip program={l.program} />
              </div>
              <div className="flex-1 basis-60">
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-muted">{peso(l.amount_paid)} of {peso(l.total_amount)}</span>
                  <b className={balance > 0 ? 'text-rose-500' : 'text-emerald-500'}>{balance > 0 ? `${peso(balance)} left` : 'Fully paid'}</b>
                </div>
                <Progress value={l.amount_paid} max={l.total_amount} color={l.payment_status === 'paid' ? 'bg-emerald-500' : 'bg-brand-500'} />
              </div>
              <Badge value={l.payment_status} />
              <Btn size="sm" variant="soft" icon={Banknote} onClick={() => { setPaying(l); setPayAmount('') }}>Add payment</Btn>
              <Btn size="sm" variant="ghost" icon={Pencil} onClick={() => startEdit(l)}>Edit</Btn>
            </Card>
          )
        })}
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit tuition"
        subtitle={editing && `${editing.first_name} ${editing.last_name} · ${editing.student_number}`}
        footer={<><Btn variant="ghost" onClick={() => setEditing(null)}>Cancel</Btn><Btn type="submit" form="ledger-form" loading={busy}>Save</Btn></>}
      >
        <form id="ledger-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field label="Total tuition (₱)"><Input type="number" min="0" step="0.01" required value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} /></Field>
          <Field label="Amount paid (₱)"><Input type="number" min="0" step="0.01" required value={form.amount_paid} onChange={(e) => setForm({ ...form, amount_paid: e.target.value })} /></Field>
          <div className="flex gap-2 sm:col-span-2">
            <Btn size="sm" variant="soft" onClick={() => setForm({ ...form, amount_paid: form.total_amount })}>Mark fully paid</Btn>
            <Btn size="sm" variant="plain" onClick={() => setForm({ ...form, amount_paid: '0' })}>Reset to 0</Btn>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!paying}
        onClose={() => setPaying(null)}
        title="Add payment"
        subtitle={paying && `${paying.first_name} ${paying.last_name} · balance ${peso(paying.total_amount - paying.amount_paid)}`}
        footer={<><Btn variant="ghost" onClick={() => setPaying(null)}>Cancel</Btn><Btn type="submit" form="pay-form" loading={busy}>Record payment</Btn></>}
      >
        <form id="pay-form" onSubmit={pay}>
          <Field label="Payment amount (₱)"><Input type="number" min="0.01" step="0.01" required value={payAmount} onChange={(e) => setPayAmount(e.target.value)} /></Field>
        </form>
      </Modal>
    </Page>
  )
}
