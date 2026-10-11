import { useEffect, useRef, useState } from 'react'
import { Clock, GraduationCap, MapPin, Plus, Trash2, UserPlus, Users } from 'lucide-react'
import Page from '../../components/Page'
import { Modal } from '../../components/Modal'
import { useConfirm } from '../../components/Feedback'
import {
  Avatar, Btn, Card, EmptyState, ErrorBox, Field, Input, Loading, PROGRAMS, ProgramChip, Progress, SearchBox, Select, cx, programStyle, schedule,
} from '../../components/ui'
import { useFetch, useAction } from '../../hooks'
import { api } from '../../api'

const EMPTY_CLASS = { course_id: '', course_code: '', title: '', units: 3, program: PROGRAMS[0], days_of_week: '', room_number: '', start_time: '', end_time: '', max_capacity: 40 }

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
  const confirm = useConfirm()

  // New class pop-up
  const courses = useFetch('/courses')
  const classAction = useAction(sections.reload)
  const [classOpen, setClassOpen] = useState(false)
  const [classForm, setClassForm] = useState(EMPTY_CLASS)
  const setC = (k) => (e) => setClassForm((f) => ({ ...f, [k]: e.target.value }))

  // Add / remove students
  const rosterAction = useAction(() => Promise.all([roster.reload(), sections.reload()]))
  const [addOpen, setAddOpen] = useState(false)
  const [studentQ, setStudentQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(studentQ.trim()), 250)
    return () => clearTimeout(id)
  }, [studentQ])
  const available = useFetch(addOpen && selected ? `/teaching/sections/${selected.section_id}/available-students?q=${encodeURIComponent(debouncedQ)}` : null)

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

  async function createClass(e) {
    e.preventDefault()
    const f = classForm
    const body = {
      ...(f.course_id ? { course_id: f.course_id } : { course_code: f.course_code, title: f.title, units: f.units, program: f.program }),
      days_of_week: f.days_of_week, room_number: f.room_number, start_time: f.start_time, end_time: f.end_time, max_capacity: f.max_capacity,
    }
    const ok = await classAction.run(() => api('/teaching/sections', { method: 'POST', body }), 'Class created')
    if (ok) {
      setClassOpen(false)
      setClassForm(EMPTY_CLASS)
      courses.reload()
    }
  }

  async function addStudent(s) {
    const ok = await rosterAction.run(
      () => api(`/teaching/sections/${selected.section_id}/students`, { method: 'POST', body: { student_id: s.student_id } }),
      `${s.first_name} added to ${selected.course_code}`
    )
    if (ok) available.reload()
  }

  async function removeStudent(r) {
    const yes = await confirm({ title: 'Remove this student?', message: `${r.first_name} ${r.last_name} will be removed from ${selected.course_code}.`, confirmLabel: 'Remove', danger: true })
    if (yes) rosterAction.run(() => api(`/teaching/enrollments/${r.enrollment_id}`, { method: 'DELETE' }), `${r.first_name} removed`)
  }

  const seatsLeft = selected ? selected.max_capacity - students.length : 0

  return (
    <Page
      title="Classes & Grades"
      subtitle="Open a class, manage its students and enter grades."
      actions={<Btn icon={Plus} onClick={() => setClassOpen(true)}>New class</Btn>}
    >
      <ErrorBox error={sections.error || roster.error} />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-2">
          <SearchBox value={search} onChange={setSearch} placeholder="Search classes..." />
          {!sections.data && !sections.error && <Loading rows={4} />}
          {sections.data && list.length === 0 && <EmptyState icon={GraduationCap} title="No classes found" text="Press New class to open your first one." />}
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
                <div className="flex flex-wrap items-center gap-3">
                  <Btn size="sm" variant="soft" icon={UserPlus} onClick={() => { setStudentQ(''); setDebouncedQ(''); setAddOpen(true) }}>Add student</Btn>
                  <div className="w-40 shrink-0">
                    <div className="mb-1.5 flex justify-between text-xs"><span className="text-muted">Graded</span><b>{graded}/{students.length}</b></div>
                    <Progress value={graded} max={students.length} color="bg-emerald-500" />
                  </div>
                </div>
              </div>
              <p className="mb-2 text-xs text-muted">{students.length}/{selected.max_capacity} seats taken</p>

              {!roster.data && !roster.error && <Loading rows={3} />}
              {roster.data && students.length === 0 && <EmptyState icon={Users} title="No students yet" text="Press Add student to put someone in this class." />}

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
                    <button
                      onClick={() => removeStudent(r)}
                      aria-label={`Remove ${r.first_name} ${r.last_name}`}
                      title="Remove from class"
                      className="shrink-0 rounded-lg p-2 text-muted transition hover:bg-rose-500/10 hover:text-rose-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={classOpen}
        onClose={() => setClassOpen(false)}
        title="New class"
        subtitle="It is assigned to you right away. Students you add are enrolled immediately."
        footer={<><Btn variant="ghost" onClick={() => setClassOpen(false)}>Cancel</Btn><Btn type="submit" form="class-form" loading={classAction.busy}>Create class</Btn></>}
      >
        <form id="class-form" onSubmit={createClass} className="grid gap-4 sm:grid-cols-2">
          <Field label="Course" className="sm:col-span-2">
            <Select value={classForm.course_id} onChange={setC('course_id')}>
              <option value="">+ Create a new course</option>
              {(courses.data || []).map((c) => <option key={c.course_id} value={c.course_id}>{c.course_code} - {c.title}</option>)}
            </Select>
          </Field>
          {!classForm.course_id && (
            <>
              <Field label="Course code"><Input required value={classForm.course_code} onChange={setC('course_code')} placeholder="CS401" /></Field>
              <Field label="Units"><Input type="number" min="1" max="6" value={classForm.units} onChange={setC('units')} /></Field>
              <Field label="Course title" className="sm:col-span-2"><Input required value={classForm.title} onChange={setC('title')} placeholder="Machine Learning" /></Field>
              <Field label="Program" className="sm:col-span-2">
                <Select value={classForm.program} onChange={setC('program')}>{PROGRAMS.map((p) => <option key={p}>{p}</option>)}</Select>
              </Field>
            </>
          )}
          <Field label="Days"><Input value={classForm.days_of_week} onChange={setC('days_of_week')} placeholder="Mon/Wed" /></Field>
          <Field label="Room"><Input value={classForm.room_number} onChange={setC('room_number')} placeholder="Room 201" /></Field>
          <Field label="Start time"><Input type="time" value={classForm.start_time} onChange={setC('start_time')} /></Field>
          <Field label="End time"><Input type="time" value={classForm.end_time} onChange={setC('end_time')} /></Field>
          <Field label="Seats"><Input type="number" min="1" max="200" value={classForm.max_capacity} onChange={setC('max_capacity')} /></Field>
        </form>
      </Modal>

      <Modal
        open={addOpen && !!selected}
        onClose={() => setAddOpen(false)}
        title="Add student"
        subtitle={selected && `${selected.course_code} · ${seatsLeft} seat${seatsLeft === 1 ? '' : 's'} left`}
        footer={<Btn onClick={() => setAddOpen(false)}>Done</Btn>}
      >
        <SearchBox value={studentQ} onChange={setStudentQ} placeholder="Search by name or student number..." />
        <ErrorBox error={available.error} />
        {!available.data && !available.error && <div className="mt-3"><Loading rows={2} /></div>}
        {available.data && available.data.length === 0 && <EmptyState icon={Users} title="No students found" text="Everyone matching is already in this class." />}
        <div className="mt-3 divide-y divide-line">
          {(available.data || []).map((s) => (
            <div key={s.student_id} className="flex items-center gap-3 py-2.5">
              <Avatar name={`${s.first_name} ${s.last_name}`} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{s.last_name}, {s.first_name}</p>
                <p className="text-xs text-muted">{s.student_number} · {s.program}</p>
              </div>
              <Btn size="sm" variant="soft" icon={Plus} loading={rosterAction.busy} disabled={seatsLeft <= 0} onClick={() => addStudent(s)}>Add</Btn>
            </div>
          ))}
        </div>
      </Modal>
    </Page>
  )
}
