import { useState } from 'react'
import { Check, Pencil, Plus, Trash2, Users as UsersIcon, X } from 'lucide-react'
import Page from '../../components/Page'
import { Modal } from '../../components/Modal'
import { useConfirm } from '../../components/Feedback'
import {
  Avatar, Badge, Btn, Card, EmptyState, ErrorBox, Field, Input, Loading, PROGRAMS, ProgramChip,
  SearchBox, Select, Tabs, cx,
} from '../../components/ui'
import { useFetch, useAction } from '../../hooks'
import { useAuth } from '../../AuthContext'
import { api } from '../../api'

const emptyForm = {
  first_name: '', last_name: '', email: '', password: '', role: 'student',
  program: PROGRAMS[0], year_level: 1, department_type: 'registrar', department: PROGRAMS[0], title: '', is_active: true,
}

const roleLabel = (u) => (u.role === 'staff' ? u.department_type : u.role)

function UserCard({ u, me, index, onStatus, onEdit, onDelete }) {
  const isMe = u.id === me.id
  return (
    <Card hover className="anim-fade-up p-5" style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}>
      <div className="flex items-start gap-3">
        <Avatar name={`${u.first_name} ${u.last_name}`} size={46} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">
            {u.first_name} {u.last_name}
            {isMe && <span className="ml-2 text-xs font-semibold text-brand-600 dark:text-brand-300">(you)</span>}
          </p>
          <p className="truncate text-sm text-muted">{u.email}</p>
        </div>
        <Badge value={u.status} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-lg bg-surface2 px-2 py-1 font-semibold capitalize">{roleLabel(u)}</span>
        {u.role === 'student' && <ProgramChip program={u.program} />}
        {u.role === 'student' && <span className="text-muted">Year {u.year_level} · {u.student_number}</span>}
        {u.role === 'faculty' && <span className="text-muted">{u.department} · {u.faculty_id}</span>}
        {u.role === 'staff' && <span className="text-muted">{u.employee_id}</span>}
        {!u.is_active && <span className="rounded-lg bg-rose-500/15 px-2 py-1 font-semibold text-rose-500">inactive</span>}
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-line pt-4">
        {!isMe && u.status !== 'approved' && <Btn size="sm" variant="success" icon={Check} onClick={() => onStatus(u, 'approved')}>Approve</Btn>}
        {!isMe && u.status !== 'denied' && <Btn size="sm" variant="ghost" icon={X} onClick={() => onStatus(u, 'denied')}>Deny</Btn>}
        <div className="ml-auto flex gap-1">
          <Btn size="sm" variant="plain" onClick={() => onEdit(u)} title="Edit"><Pencil size={15} /></Btn>
          {!isMe && <Btn size="sm" variant="plain" onClick={() => onDelete(u)} title="Delete" className="hover:text-rose-500"><Trash2 size={15} /></Btn>}
        </div>
      </div>
    </Card>
  )
}

export default function Users() {
  const { user: me } = useAuth()
  const confirm = useConfirm()
  const { data, error, reload } = useFetch('/admin/users')
  const { run, busy } = useAction(reload)

  const [status, setStatus] = useState('all')
  const [role, setRole] = useState('all')
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(18)
  const [form, setForm] = useState(null) // null = pop-up closed
  const [editingId, setEditingId] = useState(null)

  const all = data || []
  const countOf = (s) => (s === 'all' ? all.length : all.filter((u) => u.status === s).length)
  const q = search.trim().toLowerCase()
  const filtered = all.filter(
    (u) =>
      (status === 'all' || u.status === status) &&
      (role === 'all' || u.role === role) &&
      (!q || `${u.first_name} ${u.last_name} ${u.email} ${u.student_number || ''}`.toLowerCase().includes(q))
  )
  const pending = all.filter((u) => u.status === 'pending')

  function startNew() {
    setEditingId(null)
    setForm(emptyForm)
  }

  function startEdit(u) {
    setEditingId(u.id)
    setForm({
      first_name: u.first_name, last_name: u.last_name, email: u.email, password: '', role: u.role,
      program: u.program || PROGRAMS[0], year_level: u.year_level || 1, department_type: u.department_type || 'registrar',
      department: u.department || PROGRAMS[0], title: u.title || '', is_active: u.is_active,
    })
  }

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  async function save(e) {
    e.preventDefault()
    const ok = await run(
      () => (editingId ? api(`/admin/users/${editingId}`, { method: 'PATCH', body: form }) : api('/admin/users', { method: 'POST', body: form })),
      editingId ? 'User updated' : 'User created'
    )
    if (ok) setForm(null)
  }

  const changeStatus = (u, next) =>
    run(() => api(`/admin/users/${u.id}/status`, { method: 'PATCH', body: { status: next } }), `${u.first_name} ${u.last_name} is now ${next}`)

  async function remove(u) {
    const yes = await confirm({
      title: `Delete ${u.first_name} ${u.last_name}?`,
      message: 'This also deletes their enrollments, tickets and tuition record. It cannot be undone.',
      confirmLabel: 'Delete', danger: true,
    })
    if (yes) run(() => api(`/admin/users/${u.id}`, { method: 'DELETE' }), 'User deleted')
  }

  return (
    <Page
      title="Users"
      subtitle="Approve new accounts, and edit or remove anyone."
      actions={<Btn icon={Plus} onClick={startNew}>Add user</Btn>}
    >
      <ErrorBox error={error} />

      {pending.length > 0 && status === 'all' && !q && (
        <div className="anim-fade-up mb-6 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5">
          <p className="mb-3 font-bold text-amber-500">⏳ {pending.length} account(s) waiting for approval</p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {pending.map((u) => (
              <div key={u.id} className="flex shrink-0 items-center gap-3 rounded-2xl bg-surface p-3 shadow-sm">
                <Avatar name={`${u.first_name} ${u.last_name}`} size={38} />
                <div className="pr-2">
                  <p className="text-sm font-bold">{u.first_name} {u.last_name}</p>
                  <p className="text-xs text-muted">{u.program || roleLabel(u)}</p>
                </div>
                <Btn size="sm" variant="success" onClick={() => changeStatus(u, 'approved')} title="Approve"><Check size={15} /></Btn>
                <Btn size="sm" variant="ghost" onClick={() => changeStatus(u, 'denied')} title="Deny"><X size={15} /></Btn>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Tabs
          value={status}
          onChange={(v) => { setStatus(v); setLimit(18) }}
          tabs={[
            { value: 'all', label: 'All', count: countOf('all') },
            { value: 'pending', label: 'Pending', count: countOf('pending') },
            { value: 'approved', label: 'Approved', count: countOf('approved') },
            { value: 'denied', label: 'Denied', count: countOf('denied') },
          ]}
        />
        <Select value={role} onChange={(e) => { setRole(e.target.value); setLimit(18) }} className="w-auto">
          <option value="all">All roles</option>
          <option value="student">Students</option>
          <option value="faculty">Faculty</option>
          <option value="staff">Staff</option>
          <option value="admin">Admins</option>
        </Select>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setLimit(18) }} placeholder="Search name, email, student no." className="min-w-56 flex-1 sm:max-w-xs" />
      </div>

      {!data && !error && <Loading rows={4} />}
      {data && filtered.length === 0 && <EmptyState icon={UsersIcon} title="No users found" text="Try a different filter or search." />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.slice(0, limit).map((u, i) => (
          <UserCard key={u.id} u={u} me={me} index={i} onStatus={changeStatus} onEdit={startEdit} onDelete={remove} />
        ))}
      </div>

      {filtered.length > limit && (
        <div className="mt-6 text-center">
          <Btn variant="ghost" onClick={() => setLimit(limit + 18)}>Show more ({filtered.length - limit} left)</Btn>
        </div>
      )}

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={editingId ? 'Edit user' : 'Add user'}
        subtitle={editingId ? 'Update details. The role cannot be changed.' : 'New accounts are approved right away.'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setForm(null)}>Cancel</Btn>
            <Btn type="submit" form="user-form" loading={busy}>Save</Btn>
          </>
        }
      >
        {form && (
          <form id="user-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label="First name"><Input required value={form.first_name} onChange={set('first_name')} /></Field>
            <Field label="Last name"><Input required value={form.last_name} onChange={set('last_name')} /></Field>
            <Field label="Email" className="sm:col-span-2"><Input type="email" required value={form.email} onChange={set('email')} /></Field>
            <Field label={editingId ? 'New password (blank = keep)' : 'Password (min. 8)'} className="sm:col-span-2">
              <Input type="password" required={!editingId} value={form.password} onChange={set('password')} />
            </Field>
            <Field label="Role">
              <Select value={form.role} onChange={set('role')} disabled={!!editingId}>
                <option value="student">Student</option>
                <option value="staff">Staff</option>
                <option value="faculty">Faculty</option>
                <option value="admin">Admin</option>
              </Select>
            </Field>

            {form.role === 'student' && (
              <>
                <Field label="Year level"><Input type="number" min="1" max="6" value={form.year_level} onChange={set('year_level')} /></Field>
                <Field label="Program" className="sm:col-span-2">
                  <Select value={form.program} onChange={set('program')}>{PROGRAMS.map((p) => <option key={p}>{p}</option>)}</Select>
                </Field>
              </>
            )}
            {form.role === 'staff' && (
              <Field label="Department">
                <Select value={form.department_type} onChange={set('department_type')}>
                  <option value="registrar">Registrar</option>
                  <option value="accounting">Accounting</option>
                </Select>
              </Field>
            )}
            {form.role === 'faculty' && (
              <>
                <Field label="Department">
                  <Select value={form.department} onChange={set('department')}>{PROGRAMS.map((p) => <option key={p}>{p}</option>)}</Select>
                </Field>
                <Field label="Title" className="sm:col-span-2"><Input value={form.title} onChange={set('title')} placeholder="Instructor" /></Field>
              </>
            )}
            {editingId && (
              <label className={cx('flex items-center gap-3 rounded-xl bg-surface2 p-3 text-sm font-medium sm:col-span-2')}>
                <input type="checkbox" checked={form.is_active} onChange={set('is_active')} className="h-4 w-4 accent-brand-500" />
                Account is active (untick to deactivate)
              </label>
            )}
          </form>
        )}
      </Modal>
    </Page>
  )
}
