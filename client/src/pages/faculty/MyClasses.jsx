import { useRef, useState } from 'react'
import { Clock, GraduationCap, MapPin, Users } from 'lucide-react'
import Page from '../../components/Page'
import {
  Avatar, Card, EmptyState, ErrorBox, Loading, ProgramChip, Progress, SearchBox, cx, programStyle, schedule,
} from '../../components/ui'
import { useFetch, useAction } from '../../hooks'
import { api } from '../../api'

const GRADE_OPTIONS = ['', '1.00', '1.25', '1.50', '1.75', '2.00', '2.25', '2.50', '2.75', '3.00', '5.00', 'INC']

function gradeColor(g) {
  const n = parseFloat(g)
  if (Number.isNaN(n)) return g ? 'bg-slate-500/15 text-slate-400' : ''
  if (n <= 1.75) return 'bg-emerald-500/15 text-emerald-500'
  if (n <= 2.5) return 'bg-sky-500/15 text-sky-500'
  if (n <= 3) return 'bg-amber-500/15 text-amber-500'
  return 'bg-rose-500/15 text-rose-500'
}

export default function MyClasses() {
  const sections = useFetch('/teaching/sections')
  const [selected, setSelected] = useState(null)
  const roster = useFetch(selected ? `/teaching/sections/${selected.section_id}/roster` : null)
  const { run } = useAction(roster.reload)
  const [search, setSearch] = useState('')
  const [local, setLocal] = useState({}) // grades shown instantly, before the server answers
  const rosterRef = useRef(null)

  const q = search.trim().toLowerCase()
  const list = (sections.data || []).filter((s) => !q || `${s.course_code} ${s.title} ${s.faculty_name || ''}`.toLowerCase().includes(q))
  const students = roster.data || []
  const gradeOf = (r) => local[r.enrollment_id] ?? r.grade ?? ''
  const graded = students.filter((r) => gradeOf(r)).length

  function choose(s) {
    setSelected(s)
    setLocal({})
    if (window.innerWidth < 1024) setTimeout(() => rosterRef.current?.scrollIntoView({ behavior: 'smooth' }), 150)
  }

  async function saveGrade(r, value) {
    setLocal((l) => ({ ...l, [r.enrollment_id]: value }))
    const ok = await run(() => api(`/teaching/enrollments/${r.enrollment_id}/grade`, { method: 'PATCH', body: { grade: value } }), `Grade saved for ${r.first_name}`)
    if (!ok) setLocal((l) => { const next = { ...l }; delete next[r.enrollment_id]; return next })
  }

  return (
    <Page title="Classes & Grades" subtitle="Pick a class to see its students and enter grades.">
      <ErrorBox error={sections.error || roster.error} />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-2">
          <SearchBox value={search} onChange={setSearch} placeholder="Search classes..." />
          {!sections.data && !sections.error && <Loading rows={4} />}
          {sections.data && list.length === 0 && <EmptyState icon={GraduationCap} title="No classes found" />}
          <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
            {list.map((s, i) => {
              const active = selected?.section_id === s.section_id
              return (
                <button key={s.section_id} onClick={() => choose(s)} className="block w-full text-left">
                  <Card
                    hover
                    className={cx('anim-fade-up flex overflow-hidden', active && 'ring-2 ring-brand-500')}
                    style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
                  >
                    <div className={`w-1.5 bg-linear-to-b ${programStyle(s.program).grad}`} />
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-muted">{s.course_code}</p>
                          <p className="font-bold leading-snug">{s.title}</p>
                        </div>
                        <ProgramChip program={s.program} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                        <span className="flex items-center gap-1"><Clock size={12} /> {schedule(s)}</span>
                        <span className="flex items-center gap-1"><MapPin size={12} /> {s.room_number || 'TBA'}</span>
                        <span className="flex items-center gap-1"><Users size={12} /> {s.enrolled}/{s.max_capacity}</span>
                      </div>
                      {s.faculty_name && <p className="mt-1 text-xs text-muted">{s.faculty_name}</p>}
                    </div>
                  </Card>
                </button>
              )
            })}
          </div>
        </div>

        <div className="lg:col-span-3" ref={rosterRef}>
          {!selected && <EmptyState icon={Users} title="No class selected" text="Choose a class on the left to open its roster." />}
          {selected && (
            <Card className="anim-pop p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-muted">{selected.course_code}</p>
                  <h3 className="text-lg font-bold">{selected.title}</h3>
                </div>
                <div className="w-40 shrink-0">
                  <div className="mb-1.5 flex justify-between text-xs"><span className="text-muted">Graded</span><b>{graded}/{students.length}</b></div>
                  <Progress value={graded} max={students.length} color="bg-emerald-500" />
                </div>
              </div>

              {!roster.data && !roster.error && <Loading rows={3} />}
              {roster.data && students.length === 0 && <EmptyState icon={Users} title="No approved students yet" />}

              <div className="divide-y divide-line">
                {students.map((r) => (
                  <div key={r.enrollment_id} className="flex items-center gap-3 py-3">
                    <Avatar name={`${r.first_name} ${r.last_name}`} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{r.last_name}, {r.first_name}</p>
                      <p className="text-xs text-muted">{r.student_number} · {r.program}</p>
                    </div>
                    <select
                      value={gradeOf(r)}
                      onChange={(e) => saveGrade(r, e.target.value)}
                      aria-label={`Grade for ${r.first_name} ${r.last_name}`}
                      className={cx(
                        'h-9 w-[5.5rem] shrink-0 cursor-pointer rounded-lg border border-line px-2 text-center text-sm font-extrabold transition focus:outline-none focus:ring-2 focus:ring-brand-500/40',
                        gradeOf(r) ? gradeColor(gradeOf(r)) : 'bg-surface2 text-muted'
                      )}
                    >
                      {GRADE_OPTIONS.map((g) => <option key={g} value={g} className="bg-surface text-ink">{g || 'Grade'}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </Page>
  )
}
