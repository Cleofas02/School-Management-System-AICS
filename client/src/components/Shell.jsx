import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Bell, BookOpen, CalendarDays, ClipboardList, GraduationCap, LayoutDashboard,
  LogOut, Menu, Moon, Sun, Ticket, Users, Wallet, X,
} from 'lucide-react'
import { useAuth, roleKey } from '../AuthContext'
import { useFetch, useTheme } from '../hooks'
import { Avatar, cx } from './ui'

// [address, label, icon] for each role
const NAV = {
  admin: [
    ['/', 'Dashboard', LayoutDashboard],
    ['/admin/users', 'Users', Users],
    ['/courses', 'Courses & Sections', BookOpen],
    ['/enrollments', 'Enrollments', ClipboardList],
    ['/teaching', 'Classes & Grades', GraduationCap],
    ['/manage-tickets', 'Tickets', Ticket],
    ['/ledgers', 'Tuition', Wallet],
  ],
  registrar: [
    ['/', 'Dashboard', LayoutDashboard],
    ['/courses', 'Courses & Sections', BookOpen],
    ['/enrollments', 'Enrollments', ClipboardList],
    ['/manage-tickets', 'Tickets', Ticket],
  ],
  accounting: [
    ['/', 'Dashboard', LayoutDashboard],
    ['/manage-tickets', 'Tickets', Ticket],
    ['/ledgers', 'Tuition', Wallet],
  ],
  faculty: [
    ['/', 'Dashboard', LayoutDashboard],
    ['/teaching', 'My Classes', GraduationCap],
  ],
  student: [
    ['/', 'Dashboard', LayoutDashboard],
    ['/enroll', 'Enroll in Classes', BookOpen],
    ['/grades', 'My Grades', GraduationCap],
    ['/tickets', 'Appointments', CalendarDays],
  ],
}

function Sidebar({ items, user, onLogout }) {
  return (
    <div className="flex h-full flex-col p-4">
      <Link to="/" className="mb-8 flex items-center gap-3 px-2">
        <img src="/logo.png" alt="AICS" className="h-11 w-11 rounded-full shadow-md ring-2 ring-gold-500/60" />
        <div>
          <p className="font-extrabold leading-tight">AICS Commonwealth</p>
          <p className="text-xs text-muted">Campus SMS</p>
        </div>
      </Link>

      <nav className="flex-1 space-y-1">
        {items.map(([to, label, Icon]) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cx(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                isActive
                  ? 'border-l-4 border-gold-500 bg-linear-to-r from-brand-600 to-brand-700 text-white shadow-md shadow-brand-500/25'
                  : 'text-muted hover:bg-surface2 hover:text-ink'
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-4 rounded-2xl border border-line bg-surface2 p-3">
        <div className="flex items-center gap-3">
          <Avatar name={`${user.first_name} ${user.last_name}`} size={38} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user.first_name} {user.last_name}</p>
            <p className="text-xs capitalize text-muted">{roleKey(user)}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-line py-2 text-sm font-semibold text-muted transition hover:bg-surface hover:text-rose-500"
        >
          <LogOut size={16} /> Log out
        </button>
      </div>
    </div>
  )
}

// Bell with a list of things that need attention
function Notifications({ items }) {
  const [open, setOpen] = useState(false)
  const total = items.reduce((sum, i) => sum + i.count, 0)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-muted transition hover:text-ink"
      >
        <Bell size={18} />
        {total > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="anim-pop absolute right-0 z-40 mt-2 w-80 max-w-[85vw] rounded-2xl border border-line bg-surface p-2 shadow-2xl">
            <p className="px-3 py-2 text-sm font-bold">Needs your attention</p>
            {items.length === 0 && <p className="px-3 pb-3 text-sm text-muted">You are all caught up 🎉</p>}
            {items.map((i) => (
              <Link
                key={i.label}
                to={i.to}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-surface2"
              >
                <span>{i.label}</span>
                <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-bold text-rose-500">{i.count}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// The frame around every page: sidebar, top bar, and the page itself
export default function Shell() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const [dark, toggleTheme] = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  // The ?at= part makes the numbers refresh every time you open a page
  const stats = useFetch(`/stats?at=${encodeURIComponent(pathname)}`)

  useEffect(() => setMenuOpen(false), [pathname])

  const items = NAV[roleKey(user)] || NAV.student
  const current = items.find(([to]) => to === pathname)?.[1] || 'AICS Campus SMS'

  return (
    <div className="min-h-screen lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-line bg-surface lg:block">
        <Sidebar items={items} user={user} onLogout={logout} />
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="anim-slide relative h-full w-72 bg-surface shadow-2xl">
            <button onClick={() => setMenuOpen(false)} className="absolute right-3 top-3 rounded-xl p-2 text-muted hover:bg-surface2">
              <X size={18} />
            </button>
            <Sidebar items={items} user={user} onLogout={logout} />
          </div>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-surface/80 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
          <button onClick={() => setMenuOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-line text-muted lg:hidden">
            <Menu size={18} />
          </button>
          <p className="flex-1 truncate font-bold">{current}</p>
          <Notifications items={stats.data?.attention || []} />
          <button
            onClick={toggleTheme}
            className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-muted transition hover:text-ink"
            title="Switch light / dark"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>

        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
          <div key={pathname} className="anim-fade-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
