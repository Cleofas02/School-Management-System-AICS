import { LayoutDashboard, ShieldCheck, Ticket } from 'lucide-react'

const FEATURES = [
  [ShieldCheck, 'Role-based access', 'Admin, registrar, accounting, faculty and students each see their own tools.'],
  [Ticket, 'Appointment tickets', 'Book a visit, get a reference number, and track it from your phone.'],
  [LayoutDashboard, 'Live dashboards', 'Enrollments, grades, balances and approvals in one place.'],
]

// Split screen used by the Login and Register pages
export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-linear-to-br from-brand-900 via-brand-800 to-brand-600 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="anim-float absolute -right-24 -top-24 h-80 w-80 rounded-full bg-gold-500/20" />
        <div className="anim-float absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-white/10" style={{ animationDelay: '-3s' }} />
        <div className="anim-float absolute right-20 top-1/2 h-24 w-24 rounded-3xl bg-white/10" style={{ animationDelay: '-5s' }} />

        <div className="relative flex items-center gap-3">
          <img src="/logo.png" alt="AICS Commonwealth seal" className="h-14 w-14 rounded-full shadow-lg ring-2 ring-gold-400/70" />
          <div>
            <p className="text-lg font-extrabold leading-tight">AICS Commonwealth</p>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold-300">Campus SMS</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-4xl font-extrabold leading-tight">Everything your campus needs, <span className="text-gold-400">in one place.</span></h1>
          <p className="mt-4 text-white/80">Computer Science, Computer Engineering and Entrepreneurship, from enrollment to tuition.</p>
          <div className="mt-8 space-y-5">
            {FEATURES.map(([Icon, title, text]) => (
              <div key={title} className="flex gap-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold-500/20 text-gold-300"><Icon size={18} /></div>
                <div>
                  <p className="font-bold">{title}</p>
                  <p className="text-sm text-white/75">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <p className="font-semibold italic text-gold-400">Go Beyond Learning</p>
          <p className="text-sm text-white/60">Asian Institute of Computer Studies · Commonwealth Branch</p>
        </div>
      </div>

      <div className="grid min-h-screen place-items-center p-6">
        <div className="anim-fade-up w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
