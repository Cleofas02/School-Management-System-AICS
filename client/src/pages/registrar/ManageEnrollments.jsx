import { useState } from 'react'
import { Check, CheckCheck, ClipboardList, Trash2, X } from 'lucide-react'
import Page from '../../components/Page'
import { useConfirm, useToast } from '../../components/Feedback'
import {
  Avatar, Badge, Btn, Card, EmptyState, ErrorBox, Loading, PROGRAMS, ProgramChip, SearchBox, Select, Tabs, schedule,
} from '../../components/ui'
import { useFetch, useAction } from '../../hooks'
import { api } from '../../api'

export default function ManageEnrollments() {
  const confirm = useConfirm()
  const toast = useToast()
  const { data, error, reload } = useFetch('/enrollments')
  const { run } = useAction(reload)

  const [status, setStatus] = useState('pending')
  const [program, setProgram] = useState('all')
  const [search, setSearch] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)

  const all = data || []
  const countOf = (s) => (s === 'all' ? all.length : all.filter((e) => e.status === s).length)
  const q = search.trim().toLowerCase()
  const list = all.filter(
    (e) =>
      (status === 'all' || e.status === status) &&
      (program === 'all' || e.program === program) &&
      (!q || `${e.student_first} ${e.student_last} ${e.student_number} ${e.course_code} ${e.title}`.toLowerCase().includes(q))
  )

  const change = (e, next) =>
    run(
      () => api(`/enrollments/${e.enrollment_id}/status`, { method: 'PATCH', body: { status: next } }),
      `${e.student_first}'s request for ${e.course_code} is now ${next}`
    )

  async function remove(e) {
    const yes = await confirm({ title: 'Delete this enrollment?', message: `${e.student_first} ${e.student_last} - ${e.course_code}`, confirmLabel: 'Delete', danger: true })
    if (yes) run(() => api(`/enrollments/${e.enrollment_id}`, { method: 'DELETE' }), 'Enrollment deleted')
  }

  async function approveAll() {
    const yes = await confirm({
      title: `Approve ${list.length} request(s)?`,
      message: 'Requests for sections that are already full will be skipped.',
      confirmLabel: 'Approve all',
    })
    if (!yes) return
    setBulkBusy(true)
    let done = 0
    let skipped = 0
    for (const e of list) {
      try {
        await api(`/enrollments/${e.enrollment_id}/status`, { method: 'PATCH', body: { status: 'approved' } })
        done++
      } catch {
        skipped++
      }
    }
    setBulkBusy(false)
    toast.success(`${done} approved${skipped ? `, ${skipped} skipped (section full)` : ''}`)
    reload()
  }

  return (
    <Page
      title="Enrollments"
      subtitle="Review class requests from students."
      actions={
        status === 'pending' && list.length > 0 && (
          <Btn variant="success" icon={CheckCheck} loading={bulkBusy} onClick={approveAll}>Approve all ({list.length})</Btn>
        )
      }
    >
      <ErrorBox error={error} />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Tabs
          value={status}
          onChange={setStatus}
          tabs={[
            { value: 'pending', label: 'Pending', count: countOf('pending') },
            { value: 'approved', label: 'Approved', count: countOf('approved') },
            { value: 'denied', label: 'Denied', count: countOf('denied') },
            { value: 'dropped', label: 'Dropped', count: countOf('dropped') },
            { value: 'all', label: 'All', count: countOf('all') },
          ]}
        />
        <Select value={program} onChange={(e) => setProgram(e.target.value)} className="w-auto">
          <option value="all">All programs</option>
          {PROGRAMS.map((p) => <option key={p}>{p}</option>)}
        </Select>
        <SearchBox value={search} onChange={setSearch} placeholder="Search student or class..." className="min-w-48 flex-1 sm:max-w-xs" />
      </div>

      {!data && !error && <Loading rows={4} />}
      {data && list.length === 0 && (
        <EmptyState icon={ClipboardList} title={status === 'pending' ? 'No pending requests 🎉' : 'Nothing here'} text="New requests from students will show up here." />
      )}

      <div className="space-y-3">
        {list.map((e, i) => (
          <Card key={e.enrollment_id} hover className="anim-fade-up flex flex-wrap items-center gap-4 p-4" style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}>
            <div className="flex min-w-0 flex-1 basis-52 items-center gap-3">
              <Avatar name={`${e.student_first} ${e.student_last}`} size={42} />
              <div className="min-w-0">
                <p className="truncate font-bold">{e.student_first} {e.student_last}</p>
                <p className="text-xs text-muted">{e.student_number}</p>
              </div>
            </div>
            <div className="min-w-0 flex-1 basis-60">
              <p className="truncate font-semibold">{e.course_code} - {e.title}</p>
              <p className="truncate text-xs text-muted">{schedule(e)} · {e.faculty_name || 'No teacher'}</p>
            </div>
            <div className="flex items-center gap-2">
              <ProgramChip program={e.program} />
              {e.grade && <span className="rounded-lg bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-500">{e.grade}</span>}
              <Badge value={e.status} />
            </div>
            <div className="flex gap-2">
              {e.status !== 'approved' && <Btn size="sm" variant="success" icon={Check} onClick={() => change(e, 'approved')}>Approve</Btn>}
              {e.status !== 'denied' && <Btn size="sm" variant="ghost" icon={X} onClick={() => change(e, 'denied')}>Deny</Btn>}
              <Btn size="sm" variant="plain" onClick={() => remove(e)} title="Delete" className="hover:text-rose-500"><Trash2 size={15} /></Btn>
            </div>
          </Card>
        ))}
      </div>
    </Page>
  )
}
