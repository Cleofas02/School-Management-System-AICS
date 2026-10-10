import { useState } from 'react'
import { BookOpen, Check, Clock, MapPin, Plus, UserRound } from 'lucide-react'
import Page from '../../components/Page'
import { useConfirm } from '../../components/Feedback'
import {
  Badge, Btn, Card, EmptyState, ErrorBox, Loading, PROGRAMS, ProgramChip, Progress, SearchBox, Tabs, cx, programStyle, schedule,
} from '../../components/ui'
import { useFetch, useAction } from '../../hooks'
import { api } from '../../api'

export default function Enroll() {
  const confirm = useConfirm()
  const sections = useFetch('/sections')
  const mine = useFetch('/enrollments')
  const { run } = useAction(() => Promise.all([sections.reload(), mine.reload()]))

  const [tab, setTab] = useState('browse')
  const [program, setProgram] = useState('all')
  const [search, setSearch] = useState('')

  const myList = mine.data || []
  // Sections I already requested or joined
  const active = new Set(myList.filter((e) => ['pending', 'approved'].includes(e.status)).map((e) => e.section_id))

  const q = search.trim().toLowerCase()
  const catalog = (sections.data || []).filter(
    (s) => (program === 'all' || s.program === program) && (!q || `${s.course_code} ${s.title} ${s.faculty_name || ''}`.toLowerCase().includes(q))
  )

  const request = (s) =>
    run(() => api('/enrollments', { method: 'POST', body: { section_id: s.section_id } }), `Request sent for ${s.course_code}. Wait for approval.`)

  async function drop(e) {
    const yes = await confirm({ title: `Drop ${e.course_code}?`, message: e.title, confirmLabel: 'Drop class', danger: true })
    if (yes) run(() => api(`/enrollments/${e.enrollment_id}/drop`, { method: 'POST' }), `${e.course_code} dropped`)
  }

  return (
    <Page title="Enroll in Classes" subtitle="Browse open classes and send a request. The registrar will approve it.">
      <ErrorBox error={sections.error || mine.error} />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'browse', label: 'Browse classes', count: catalog.length },
            { value: 'mine', label: 'My requests', count: myList.length },
          ]}
        />
        {tab === 'browse' && (
          <>
            <Tabs value={program} onChange={setProgram} tabs={[{ value: 'all', label: 'All' }, ...PROGRAMS.map((p) => ({ value: p, label: programStyle(p).short }))]} />
            <SearchBox value={search} onChange={setSearch} placeholder="Search classes..." className="min-w-48 flex-1 sm:max-w-xs" />
          </>
        )}
      </div>

      {!sections.data && !sections.error && <Loading rows={3} />}

      {tab === 'browse' && (
        <>
          {sections.data && catalog.length === 0 && <EmptyState icon={BookOpen} title="No classes found" text="Try another program or search." />}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {catalog.map((s, i) => {
              const full = s.enrolled >= s.max_capacity
              const requested = active.has(s.section_id)
              return (
                <Card key={s.section_id} hover className="anim-fade-up flex flex-col overflow-hidden" style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}>
                  <div className={`h-1.5 bg-linear-to-r ${programStyle(s.program).grad}`} />
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-muted">{s.course_code} · {s.units} units</p>
                        <p className="font-bold leading-snug">{s.title}</p>
                      </div>
                      <ProgramChip program={s.program} />
                    </div>
                    <div className="mt-3 space-y-1.5 text-sm text-muted">
                      <p className="flex items-center gap-2"><Clock size={14} /> {schedule(s)}</p>
                      <p className="flex items-center gap-2"><MapPin size={14} /> {s.room_number || 'TBA'}</p>
                      <p className="flex items-center gap-2"><UserRound size={14} /> {s.faculty_name || 'Teacher to be announced'}</p>
                    </div>
                    <div className="mt-4 flex-1">
                      <div className="mb-1.5 flex justify-between text-xs">
                        <span className="text-muted">Seats</span>
                        <span className={full ? 'font-bold text-rose-500' : 'font-semibold'}>{full ? 'Full' : `${s.max_capacity - s.enrolled} left`}</span>
                      </div>
                      <Progress value={s.enrolled} max={s.max_capacity} color={full ? 'bg-rose-500' : programStyle(s.program).bar} />
                    </div>
                    <Btn
                      className={cx('mt-4 w-full')}
                      variant={requested ? 'soft' : 'primary'}
                      icon={requested ? Check : Plus}
                      disabled={requested || full}
                      onClick={() => request(s)}
                    >
                      {requested ? 'Requested' : full ? 'Full' : 'Request to enroll'}
                    </Btn>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {tab === 'mine' && (
        <>
          {mine.data && myList.length === 0 && <EmptyState icon={BookOpen} title="No requests yet" text="Browse classes and request the ones you want." />}
          <div className="space-y-3">
            {myList.map((e, i) => (
              <Card key={e.enrollment_id} hover className="anim-fade-up flex flex-wrap items-center gap-4 p-4" style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}>
                <div className={`h-12 w-1.5 rounded-full bg-linear-to-b ${programStyle(e.program).grad}`} />
                <div className="min-w-0 flex-1 basis-56">
                  <p className="font-bold">{e.course_code} - {e.title}</p>
                  <p className="text-xs text-muted">{schedule(e)} · {e.faculty_name || 'Teacher TBA'}</p>
                </div>
                {e.grade && <span className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-sm font-extrabold text-emerald-500">{e.grade}</span>}
                <Badge value={e.status} />
                {['pending', 'approved'].includes(e.status) && !e.grade && (
                  <Btn size="sm" variant="ghost" onClick={() => drop(e)}>Drop</Btn>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </Page>
  )
}
