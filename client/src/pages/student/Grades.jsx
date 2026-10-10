import { GraduationCap } from 'lucide-react'
import Page from '../../components/Page'
import { Card, EmptyState, ErrorBox, Loading, ProgramChip, StatCard, cx, programStyle } from '../../components/ui'
import { useFetch } from '../../hooks'

// Philippine scale: 1.00 is the best, 3.00 is passing, 5.00 is failing
function gradeStyle(g) {
  const n = parseFloat(g)
  if (Number.isNaN(n)) return { text: 'text-slate-400', label: g ? 'Incomplete' : 'Not graded yet' }
  if (n <= 1.75) return { text: 'text-emerald-500', label: 'Excellent' }
  if (n <= 2.5) return { text: 'text-sky-500', label: 'Good' }
  if (n <= 3) return { text: 'text-amber-500', label: 'Passed' }
  return { text: 'text-rose-500', label: 'Failed' }
}

export default function Grades() {
  const { data, error } = useFetch('/enrollments')
  const rows = (data || []).filter((e) => e.status === 'approved')
  const graded = rows.filter((e) => !Number.isNaN(parseFloat(e.grade)))
  const average = graded.length ? graded.reduce((sum, e) => sum + parseFloat(e.grade), 0) / graded.length : 0
  const units = rows.reduce((sum, e) => sum + e.units, 0)

  return (
    <Page title="My Grades" subtitle="1.00 is the highest grade. 3.00 is the lowest passing grade.">
      <ErrorBox error={error} />
      {!data && !error && <Loading rows={3} />}

      {data && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard icon={GraduationCap} tone="emerald" label="Average grade" value={average} format={(n) => (graded.length ? n.toFixed(2) : '-')} hint={`${graded.length} graded class(es)`} />
          <StatCard icon={GraduationCap} label="Classes" value={rows.length} delay={60} />
          <StatCard icon={GraduationCap} tone="cyan" label="Units" value={units} delay={120} />
        </div>
      )}

      {data && rows.length === 0 && <EmptyState icon={GraduationCap} title="No approved classes yet" text="Your grades will appear here after your classes are approved." />}

      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((e, i) => {
          const g = gradeStyle(e.grade)
          return (
            <Card key={e.enrollment_id} hover className="anim-fade-up flex items-center gap-4 overflow-hidden p-0" style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}>
              <div className={`h-full w-1.5 self-stretch bg-linear-to-b ${programStyle(e.program).grad}`} />
              <div className="min-w-0 flex-1 py-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted">{e.course_code}</span>
                  <ProgramChip program={e.program} />
                </div>
                <p className="mt-1 truncate font-bold">{e.title}</p>
                <p className="text-xs text-muted">{e.units} units · {e.faculty_name || 'Teacher TBA'}</p>
              </div>
              <div className="pr-5 text-right">
                <p className={cx('text-3xl font-extrabold', g.text)}>{e.grade || '-'}</p>
                <p className="text-xs text-muted">{g.label}</p>
              </div>
            </Card>
          )
        })}
      </div>
    </Page>
  )
}
