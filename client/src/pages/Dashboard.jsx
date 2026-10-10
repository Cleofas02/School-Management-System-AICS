import { Link } from 'react-router-dom'
import {
  ArrowRight, Banknote, BookOpen, CalendarDays, Clock, ClipboardList, GraduationCap,
  Layers, MapPin, Ticket, TrendingUp, UserCheck, Users, Wallet,
} from 'lucide-react'
import { useAuth, roleKey } from '../AuthContext'
import { useFetch } from '../hooks'
import { BarList, Donut, Legend, Ring } from '../components/charts'
import {
  Avatar, Card, EmptyState, ErrorBox, Loading, PROGRAMS, ProgramChip, Progress, StatCard,
  fmtDate, greeting, peso, pesoShort, programStyle, schedule,
} from '../components/ui'

const HERO_TEXT = {
  admin: 'Here is what is happening across your school today.',
  registrar: 'Review enrollment requests and keep class sections in order.',
  accounting: 'Verify reference numbers and keep tuition records up to date.',
  faculty: 'Your classes, students and grades at a glance.',
  student: 'Your classes, grades and tuition in one place.',
}

function Hero({ user }) {
  const today = new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })
  return (
    <div className="anim-fade-up relative overflow-hidden rounded-3xl bg-linear-to-br from-brand-900 via-brand-700 to-brand-500 p-6 text-white border-b-4 border-gold-500 shadow-xl shadow-brand-500/20 sm:p-8">
      <div className="anim-float absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gold-500/25" />
      <div className="anim-float absolute -bottom-20 right-1/3 h-48 w-48 rounded-full bg-white/10" style={{ animationDelay: '-3s' }} />
      <p className="relative text-sm font-medium text-white/80">{today}</p>
      <h1 className="relative mt-1 text-2xl font-extrabold sm:text-3xl">{greeting()}, {user.first_name} 👋</h1>
      <p className="relative mt-2 max-w-xl text-white/80">{HERO_TEXT[roleKey(user)]}</p>
    </div>
  )
}

function Attention({ items }) {
  return (
    <Card className="p-5">
      <h3 className="mb-4 font-bold">Needs your attention</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted">You are all caught up 🎉</p>
      ) : (
        <div className="space-y-2">
          {items.map((i) => (
            <Link
              key={i.label}
              to={i.to}
              className="group flex items-center justify-between gap-3 rounded-xl bg-surface2 px-4 py-3 text-sm transition hover:bg-brand-500/10"
            >
              <span>{i.label}</span>
              <span className="flex items-center gap-2">
                <b className="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs text-rose-500">{i.count}</b>
                <ArrowRight size={16} className="text-muted transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </Card>
  )
}

function QuickLinks({ items }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map(([Icon, label, text, to]) => (
        <Link key={to + label} to={to}>
          <Card hover className="group h-full p-5">
            <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300 transition group-hover:bg-brand-500 group-hover:text-white">
              <Icon size={20} />
            </div>
            <p className="font-bold">{label}</p>
            <p className="mt-1 text-sm text-muted">{text}</p>
          </Card>
        </Link>
      ))}
    </div>
  )
}

const TICKET_COLORS = { pending: '#f59e0b', ready: '#10b981', completed: '#0ea5e9', denied: '#f43f5e' }
const ticketData = (t) => Object.keys(TICKET_COLORS).map((k) => ({ label: k[0].toUpperCase() + k.slice(1), value: t[k], color: TICKET_COLORS[k] }))
const collectedPct = (f) => (f.total > 0 ? Math.round((f.paid / f.total) * 100) : 0)

function AdminView({ d }) {
  const programData = PROGRAMS.map((p) => ({
    label: p,
    value: d.students_by_program.find((x) => x.program === p)?.count || 0,
    color: programStyle(p).hex,
  }))
  const totalStudents = programData.reduce((s, x) => s + x.value, 0)

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={GraduationCap} label="Students" value={d.counts.students} hint={`${d.counts.faculty} faculty · ${d.counts.staff} staff`} />
        <StatCard icon={UserCheck} tone="amber" label="Pending approvals" value={d.counts.pending_users} hint="New accounts to review" to="/admin/users" delay={60} />
        <StatCard icon={ClipboardList} tone="cyan" label="Active enrollments" value={d.enrollments.approved} hint={`${d.enrollments.pending} waiting for review`} to="/enrollments" delay={120} />
        <StatCard icon={Banknote} tone="emerald" label="Tuition collected" value={d.finance.paid} format={pesoShort} hint={`of ${pesoShort(d.finance.total)} billed`} to="/ledgers" delay={180} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5">
          <h3 className="mb-4 font-bold">Students by program</h3>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Donut
              data={programData}
              center={<div><p className="text-3xl font-extrabold">{totalStudents}</p><p className="text-xs text-muted">students</p></div>}
            />
            <Legend items={programData} />
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 font-bold">Appointment tickets</h3>
          <BarList items={ticketData(d.tickets)} />
        </Card>
        <Card className="flex flex-col items-center p-5">
          <h3 className="mb-4 self-start font-bold">Tuition collection</h3>
          <Ring value={d.finance.paid} max={d.finance.total} color="#10b981" size={150}>
            <div><p className="text-3xl font-extrabold">{collectedPct(d.finance)}%</p><p className="text-xs text-muted">collected</p></div>
          </Ring>
          <p className="mt-4 text-sm text-muted">{peso(d.finance.total - d.finance.paid)} still outstanding</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <QuickLinks
            items={[
              [Users, 'Users', 'Approve, edit, or remove accounts', '/admin/users'],
              [BookOpen, 'Courses & Sections', `${d.counts.courses} courses · ${d.counts.sections} sections`, '/courses'],
              [GraduationCap, 'Classes & Grades', 'Open any roster and edit grades', '/teaching'],
              [Ticket, 'Tickets', 'Approve, edit, or delete appointments', '/manage-tickets'],
              [Wallet, 'Tuition', 'View and adjust balances', '/ledgers'],
              [ClipboardList, 'Enrollments', 'Approve or deny requests', '/enrollments'],
            ]}
          />
        </div>
        <Attention items={d.attention} />
      </div>
    </>
  )
}

function RegistrarView({ d }) {
  const byProgram = PROGRAMS.map((p) => ({
    label: p,
    value: d.enrollments_by_program.find((x) => x.program === p)?.count || 0,
    color: programStyle(p).hex,
  }))
  const statusData = [
    { label: 'Approved', value: d.enrollments.approved, color: '#10b981' },
    { label: 'Pending', value: d.enrollments.pending, color: '#f59e0b' },
    { label: 'Denied', value: d.enrollments.denied, color: '#f43f5e' },
    { label: 'Dropped', value: d.enrollments.dropped, color: '#94a3b8' },
  ]
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={BookOpen} label="Courses" value={d.counts.courses} to="/courses" />
        <StatCard icon={Layers} tone="cyan" label="Class sections" value={d.counts.sections} to="/courses" delay={60} />
        <StatCard icon={ClipboardList} tone="amber" label="Pending enrollments" value={d.enrollments.pending} hint="Waiting for your review" to="/enrollments" delay={120} />
        <StatCard icon={Ticket} tone="emerald" label="Open tickets" value={d.tickets.pending + d.tickets.ready} hint={`${d.tickets.ready} ready to process`} to="/manage-tickets" delay={180} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5">
          <h3 className="mb-4 font-bold">Approved enrollments by program</h3>
          <BarList items={byProgram} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 font-bold">Enrollment status</h3>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Donut data={statusData} size={150} center={<p className="text-2xl font-extrabold">{statusData.reduce((s, x) => s + x.value, 0)}</p>} />
            <Legend items={statusData} />
          </div>
        </Card>
        <Attention items={d.attention} />
      </div>
    </>
  )
}

function AccountingView({ d }) {
  const ledgerData = [
    { label: 'Paid', value: d.ledger.paid, color: '#10b981' },
    { label: 'Partial', value: d.ledger.partial, color: '#f59e0b' },
    { label: 'Unpaid', value: d.ledger.unpaid, color: '#f43f5e' },
  ]
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Ticket} tone="amber" label="Ready to process" value={d.tickets.ready} hint={`${d.tickets.pending} waiting for approval`} to="/manage-tickets" />
        <StatCard icon={Banknote} tone="emerald" label="Collected" value={d.finance.paid} format={pesoShort} to="/ledgers" delay={60} />
        <StatCard icon={Wallet} tone="rose" label="Outstanding" value={d.finance.total - d.finance.paid} format={pesoShort} to="/ledgers" delay={120} />
        <StatCard icon={TrendingUp} tone="cyan" label="Collection rate" value={collectedPct(d.finance)} format={(n) => `${Math.round(n)}%`} delay={180} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5">
          <h3 className="mb-4 font-bold">Tuition status</h3>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Donut data={ledgerData} size={150} center={<p className="text-2xl font-extrabold">{ledgerData.reduce((s, x) => s + x.value, 0)}</p>} />
            <Legend items={ledgerData} />
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 font-bold">Largest balances</h3>
          <div className="space-y-4">
            {d.top_balances.length === 0 && <p className="text-sm text-muted">No tuition records yet.</p>}
            {d.top_balances.map((b) => (
              <div key={b.first_name + b.last_name} className="flex items-center gap-3">
                <Avatar name={`${b.first_name} ${b.last_name}`} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="truncate font-semibold">{b.first_name} {b.last_name}</span>
                    <span className="font-semibold text-rose-500">{pesoShort(b.total - b.paid)}</span>
                  </div>
                  <Progress value={b.paid} max={b.total} color="bg-emerald-500" className="mt-1.5" />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Attention items={d.attention} />
      </div>
    </>
  )
}

function FacultyView({ d }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={BookOpen} label="My sections" value={d.counts.sections} to="/teaching" />
        <StatCard icon={Users} tone="cyan" label="My students" value={d.counts.students} delay={60} to="/teaching" />
        <StatCard icon={ClipboardList} tone="amber" label="Waiting for a grade" value={d.counts.ungraded} delay={120} to="/teaching" />
      </div>
      <h3 className="font-bold">My classes</h3>
      {d.sections.length === 0 && <EmptyState icon={BookOpen} title="No classes assigned yet" text="Ask the registrar to assign you to a section." />}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {d.sections.map((s, i) => (
          <Link key={s.section_id} to="/teaching">
            <Card hover className="anim-fade-up h-full overflow-hidden" style={{ animationDelay: `${i * 50}ms` }}>
              <div className={`h-1.5 bg-linear-to-r ${programStyle(s.program).grad}`} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-muted">{s.course_code}</p>
                    <p className="font-bold leading-snug">{s.title}</p>
                  </div>
                  <ProgramChip program={s.program} />
                </div>
                <div className="mt-3 space-y-1 text-sm text-muted">
                  <p className="flex items-center gap-2"><Clock size={14} /> {schedule(s)}</p>
                  <p className="flex items-center gap-2"><MapPin size={14} /> {s.room_number || 'TBA'}</p>
                </div>
                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-xs"><span className="text-muted">Seats</span><span className="font-semibold">{s.enrolled}/{s.max_capacity}</span></div>
                  <Progress value={s.enrolled} max={s.max_capacity} color={programStyle(s.program).bar} />
                </div>
                {s.ungraded > 0 && <p className="mt-3 text-xs font-semibold text-amber-500">{s.ungraded} student(s) not graded yet</p>}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </>
  )
}

function StudentView({ d }) {
  const ticket = d.next_ticket
  const balance = d.ledger ? d.ledger.total - d.ledger.paid : 0
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={BookOpen} label="Units enrolled" value={d.units} hint="Approved classes" />
        <StatCard
          icon={GraduationCap} tone="emerald" label="Average grade" value={d.avg_grade || 0}
          format={(n) => (d.avg_grade ? n.toFixed(2) : '-')} hint="1.00 is the best" to="/grades" delay={60}
        />
        <StatCard icon={Wallet} tone="rose" label="Balance" value={balance} format={pesoShort} hint={d.ledger ? `${peso(d.ledger.paid)} paid` : 'No tuition record yet'} to="/tickets" delay={120} />
        <StatCard icon={ClipboardList} tone="amber" label="Waiting for approval" value={d.enrollments.pending} hint="Enrollment requests" to="/enroll" delay={180} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-4 font-bold">Next appointment</h3>
          {ticket ? (
            <div className="flex flex-wrap items-center gap-5">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-linear-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-500/30">
                <CalendarDays size={28} />
              </div>
              <div className="flex-1">
                <p className="font-mono text-lg font-bold">#{ticket.reference_no}</p>
                <p className="text-sm capitalize text-muted">{ticket.purpose} · {fmtDate(ticket.appointment_date)} · {ticket.time_slot}</p>
              </div>
              <Link to="/tickets" className="inline-flex items-center gap-2 rounded-xl bg-brand-500/10 px-4 py-2 text-sm font-semibold text-brand-600 dark:text-brand-300 hover:bg-brand-500/20">
                View ticket <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">No upcoming appointment. Book one to visit the registrar or accounting.</p>
              <Link to="/tickets" className="rounded-xl bg-linear-to-r from-brand-500 to-brand-700 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-500/25">Book now</Link>
            </div>
          )}
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 font-bold">Tuition</h3>
          {d.ledger ? (
            <>
              <div className="mb-2 flex justify-between text-sm"><span className="text-muted">Paid</span><b>{peso(d.ledger.paid)}</b></div>
              <Progress value={d.ledger.paid} max={d.ledger.total} color="bg-emerald-500" />
              <p className="mt-2 text-xs text-muted">of {peso(d.ledger.total)}</p>
            </>
          ) : (
            <p className="text-sm text-muted">Your tuition will appear once your account is approved.</p>
          )}
        </Card>
      </div>

      <h3 className="font-bold">My classes</h3>
      {d.schedule.length === 0 && <EmptyState icon={BookOpen} title="No approved classes yet" text="Request classes from Enroll in Classes." />}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {d.schedule.map((s, i) => (
          <Card key={s.course_code} hover className="anim-fade-up overflow-hidden" style={{ animationDelay: `${i * 50}ms` }}>
            <div className={`h-1.5 bg-linear-to-r ${programStyle(s.program).grad}`} />
            <div className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-muted">{s.course_code} · {s.units} units</p>
                  <p className="font-bold leading-snug">{s.title}</p>
                </div>
                {s.grade && <span className="rounded-xl bg-emerald-500/15 px-2.5 py-1 text-sm font-extrabold text-emerald-500">{s.grade}</span>}
              </div>
              <div className="mt-3 space-y-1 text-sm text-muted">
                <p className="flex items-center gap-2"><Clock size={14} /> {schedule(s)}</p>
                <p className="flex items-center gap-2"><MapPin size={14} /> {s.room_number || 'TBA'} · {s.faculty_name || 'TBA'}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { data, error } = useFetch('/stats')

  return (
    <div className="space-y-6">
      <Hero user={user} />
      <ErrorBox error={error} />
      {!data && !error && <Loading rows={3} />}
      {data?.kind === 'admin' && <AdminView d={data} />}
      {data?.kind === 'registrar' && <RegistrarView d={data} />}
      {data?.kind === 'accounting' && <AccountingView d={data} />}
      {data?.kind === 'faculty' && <FacultyView d={data} />}
      {data?.kind === 'student' && <StudentView d={data} />}
    </div>
  )
}
