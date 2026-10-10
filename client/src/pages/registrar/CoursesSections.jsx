import { useState } from 'react'
import { BookOpen, Clock, Layers, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import Page from '../../components/Page'
import { Modal } from '../../components/Modal'
import { useConfirm } from '../../components/Feedback'
import {
  Avatar, Btn, Card, EmptyState, ErrorBox, Field, Input, Loading, PROGRAMS, ProgramChip, Progress,
  SearchBox, Select, Tabs, hhmm, programStyle, schedule,
} from '../../components/ui'
import { useFetch, useAction } from '../../hooks'
import { api } from '../../api'

const emptyCourse = { course_code: '', title: '', units: 3, program: PROGRAMS[0] }
const emptySection = { course_id: '', faculty_user_id: '', room_number: '', days_of_week: '', start_time: '', end_time: '', max_capacity: 40 }

export default function CoursesSections() {
  const confirm = useConfirm()
  const courses = useFetch('/courses')
  const sections = useFetch('/sections')
  const faculty = useFetch('/sections/faculty-options')
  const { run, busy } = useAction(() => Promise.all([courses.reload(), sections.reload()]))

  const [tab, setTab] = useState('courses')
  const [program, setProgram] = useState('all')
  const [search, setSearch] = useState('')
  const [courseForm, setCourseForm] = useState(null)
  const [courseId, setCourseId] = useState(null)
  const [sectionForm, setSectionForm] = useState(null)
  const [sectionId, setSectionId] = useState(null)

  const q = search.trim().toLowerCase()
  const courseList = (courses.data || []).filter(
    (c) => (program === 'all' || c.program === program) && (!q || `${c.course_code} ${c.title}`.toLowerCase().includes(q))
  )
  const sectionList = (sections.data || []).filter(
    (s) => (program === 'all' || s.program === program) && (!q || `${s.course_code} ${s.title} ${s.faculty_name || ''}`.toLowerCase().includes(q))
  )
  const sectionsOf = (id) => (sections.data || []).filter((s) => s.course_id === id).length

  // ----- courses -----
  function openCourse(c) {
    setCourseId(c ? c.course_id : null)
    setCourseForm(c ? { course_code: c.course_code, title: c.title, units: c.units, program: c.program } : { ...emptyCourse, program: program === 'all' ? PROGRAMS[0] : program })
  }
  async function saveCourse(e) {
    e.preventDefault()
    const ok = await run(
      () => (courseId ? api(`/courses/${courseId}`, { method: 'PATCH', body: courseForm }) : api('/courses', { method: 'POST', body: courseForm })),
      'Course saved'
    )
    if (ok) setCourseForm(null)
  }
  async function removeCourse(c) {
    const yes = await confirm({ title: `Delete ${c.course_code}?`, message: 'Its sections and all their enrollments will be deleted too.', confirmLabel: 'Delete', danger: true })
    if (yes) run(() => api(`/courses/${c.course_id}`, { method: 'DELETE' }), 'Course deleted')
  }

  // ----- sections -----
  function openSection(s, presetCourseId) {
    setSectionId(s ? s.section_id : null)
    setSectionForm(
      s
        ? { course_id: s.course_id, faculty_user_id: s.faculty_user_id || '', room_number: s.room_number || '', days_of_week: s.days_of_week || '', start_time: hhmm(s.start_time), end_time: hhmm(s.end_time), max_capacity: s.max_capacity }
        : { ...emptySection, course_id: presetCourseId || '' }
    )
  }
  async function saveSection(e) {
    e.preventDefault()
    const ok = await run(
      () => (sectionId ? api(`/sections/${sectionId}`, { method: 'PATCH', body: sectionForm }) : api('/sections', { method: 'POST', body: sectionForm })),
      'Section saved'
    )
    if (ok) setSectionForm(null)
  }
  async function removeSection(s) {
    const yes = await confirm({ title: `Delete this ${s.course_code} section?`, message: 'Its enrollments will be deleted too.', confirmLabel: 'Delete', danger: true })
    if (yes) run(() => api(`/sections/${s.section_id}`, { method: 'DELETE' }), 'Section deleted')
  }

  const setC = (f) => (e) => setCourseForm({ ...courseForm, [f]: e.target.value })
  const setS = (f) => (e) => setSectionForm({ ...sectionForm, [f]: e.target.value })
  const loading = !courses.data && !courses.error

  return (
    <Page
      title="Courses & Sections"
      subtitle="Computer Science, Computer Engineering and Entrepreneurship."
      actions={
        tab === 'courses'
          ? <Btn icon={Plus} onClick={() => openCourse(null)}>Add course</Btn>
          : <Btn icon={Plus} onClick={() => openSection(null)}>Add section</Btn>
      }
    >
      <ErrorBox error={courses.error || sections.error} />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'courses', label: 'Courses', count: courseList.length },
            { value: 'sections', label: 'Sections', count: sectionList.length },
          ]}
        />
        <Tabs
          value={program}
          onChange={setProgram}
          tabs={[{ value: 'all', label: 'All' }, ...PROGRAMS.map((p) => ({ value: p, label: programStyle(p).short }))]}
        />
        <SearchBox value={search} onChange={setSearch} placeholder="Search courses..." className="min-w-48 flex-1 sm:max-w-xs" />
      </div>

      {loading && <Loading rows={3} />}

      {tab === 'courses' && (
        <>
          {!loading && courseList.length === 0 && <EmptyState icon={BookOpen} title="No courses found" />}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {courseList.map((c, i) => (
              <Card key={c.course_id} hover className="anim-fade-up overflow-hidden" style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}>
                <div className={`h-1.5 bg-linear-to-r ${programStyle(c.program).grad}`} />
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-extrabold tracking-wide">{c.course_code}</span>
                    <ProgramChip program={c.program} />
                  </div>
                  <p className="mt-1 min-h-12 font-semibold leading-snug">{c.title}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                    <span className="text-sm text-muted">{c.units} units · {sectionsOf(c.course_id)} section(s)</span>
                    <div className="flex gap-1">
                      <Btn size="sm" variant="soft" onClick={() => openSection(null, c.course_id)} title="Add a section"><Layers size={15} /></Btn>
                      <Btn size="sm" variant="plain" onClick={() => openCourse(c)} title="Edit"><Pencil size={15} /></Btn>
                      <Btn size="sm" variant="plain" onClick={() => removeCourse(c)} title="Delete" className="hover:text-rose-500"><Trash2 size={15} /></Btn>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {tab === 'sections' && (
        <>
          {!loading && sectionList.length === 0 && <EmptyState icon={Layers} title="No sections found" />}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sectionList.map((s, i) => {
              const full = s.enrolled >= s.max_capacity
              return (
                <Card key={s.section_id} hover className="anim-fade-up overflow-hidden" style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}>
                  <div className={`h-1.5 bg-linear-to-r ${programStyle(s.program).grad}`} />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-muted">{s.course_code}</p>
                        <p className="font-bold leading-snug">{s.title}</p>
                      </div>
                      <ProgramChip program={s.program} />
                    </div>
                    <div className="mt-3 space-y-1.5 text-sm text-muted">
                      <p className="flex items-center gap-2"><Clock size={14} /> {schedule(s)}</p>
                      <p className="flex items-center gap-2"><MapPin size={14} /> {s.room_number || 'TBA'}</p>
                      <p className="flex items-center gap-2">
                        {s.faculty_name ? <Avatar name={s.faculty_name} size={20} /> : null}
                        {s.faculty_name || 'No teacher assigned'}
                      </p>
                    </div>
                    <div className="mt-4">
                      <div className="mb-1.5 flex justify-between text-xs">
                        <span className="text-muted">Seats taken</span>
                        <span className={full ? 'font-bold text-rose-500' : 'font-semibold'}>{s.enrolled}/{s.max_capacity}</span>
                      </div>
                      <Progress value={s.enrolled} max={s.max_capacity} color={full ? 'bg-rose-500' : programStyle(s.program).bar} />
                    </div>
                    <div className="mt-4 flex justify-end gap-1 border-t border-line pt-3">
                      <Btn size="sm" variant="plain" onClick={() => openSection(s)} title="Edit"><Pencil size={15} /></Btn>
                      <Btn size="sm" variant="plain" onClick={() => removeSection(s)} title="Delete" className="hover:text-rose-500"><Trash2 size={15} /></Btn>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      <Modal
        open={!!courseForm}
        onClose={() => setCourseForm(null)}
        title={courseId ? 'Edit course' : 'Add course'}
        footer={<><Btn variant="ghost" onClick={() => setCourseForm(null)}>Cancel</Btn><Btn type="submit" form="course-form" loading={busy}>Save</Btn></>}
      >
        {courseForm && (
          <form id="course-form" onSubmit={saveCourse} className="grid gap-4 sm:grid-cols-2">
            <Field label="Course code"><Input required value={courseForm.course_code} onChange={setC('course_code')} placeholder="CS101" /></Field>
            <Field label="Units"><Input type="number" min="1" max="10" value={courseForm.units} onChange={setC('units')} /></Field>
            <Field label="Title" className="sm:col-span-2"><Input required value={courseForm.title} onChange={setC('title')} /></Field>
            <Field label="Program" className="sm:col-span-2">
              <Select value={courseForm.program} onChange={setC('program')}>{PROGRAMS.map((p) => <option key={p}>{p}</option>)}</Select>
            </Field>
          </form>
        )}
      </Modal>

      <Modal
        open={!!sectionForm}
        onClose={() => setSectionForm(null)}
        title={sectionId ? 'Edit section' : 'Add section'}
        footer={<><Btn variant="ghost" onClick={() => setSectionForm(null)}>Cancel</Btn><Btn type="submit" form="section-form" loading={busy}>Save</Btn></>}
      >
        {sectionForm && (
          <form id="section-form" onSubmit={saveSection} className="grid gap-4 sm:grid-cols-2">
            <Field label="Course" className="sm:col-span-2">
              <Select required value={sectionForm.course_id} onChange={setS('course_id')}>
                <option value="">Choose a course</option>
                {(courses.data || []).map((c) => <option key={c.course_id} value={c.course_id}>{c.course_code} - {c.title}</option>)}
              </Select>
            </Field>
            <Field label="Teacher" className="sm:col-span-2">
              <Select value={sectionForm.faculty_user_id} onChange={setS('faculty_user_id')}>
                <option value="">Not assigned</option>
                {(faculty.data || []).map((f) => <option key={f.user_id} value={f.user_id}>{f.first_name} {f.last_name}</option>)}
              </Select>
            </Field>
            <Field label="Room"><Input value={sectionForm.room_number} onChange={setS('room_number')} placeholder="Room 201" /></Field>
            <Field label="Days"><Input value={sectionForm.days_of_week} onChange={setS('days_of_week')} placeholder="Mon/Wed" /></Field>
            <Field label="Start time"><Input type="time" value={sectionForm.start_time} onChange={setS('start_time')} /></Field>
            <Field label="End time"><Input type="time" value={sectionForm.end_time} onChange={setS('end_time')} /></Field>
            <Field label="Max students"><Input type="number" min="1" value={sectionForm.max_capacity} onChange={setS('max_capacity')} /></Field>
          </form>
        )}
      </Modal>
    </Page>
  )
}
