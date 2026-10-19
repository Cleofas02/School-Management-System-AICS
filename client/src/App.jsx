import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth, roleKey } from './AuthContext'
import Shell from './components/Shell'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Users from './pages/admin/Users'
import CoursesSections from './pages/registrar/CoursesSections'
import ManageEnrollments from './pages/registrar/ManageEnrollments'
import MyClasses from './pages/faculty/MyClasses'
import Enroll from './pages/student/Enroll'
import Grades from './pages/student/Grades'
import Tickets from './pages/student/Tickets'
import ManageTickets from './pages/staff/ManageTickets'
import Ledgers from './pages/staff/Ledgers'

function RequireAuth() {
  const { user, loading } = useAuth()
  if (loading) return <div className="grid min-h-screen place-items-center text-muted">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  return <Shell />
}

function OnlyFor({ roles }) {
  const { user } = useAuth()
  return roles.includes(roleKey(user)) ? <Outlet /> : <Navigate to="/" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<RequireAuth />}>
        <Route path="/" element={<Dashboard />} />

        <Route element={<OnlyFor roles={['admin']} />}>
          <Route path="/admin/users" element={<Users />} />
        </Route>
        <Route element={<OnlyFor roles={['registrar', 'admin']} />}>
          <Route path="/courses" element={<CoursesSections />} />
          <Route path="/enrollments" element={<ManageEnrollments />} />
        </Route>
        <Route element={<OnlyFor roles={['faculty', 'admin']} />}>
          <Route path="/teaching" element={<MyClasses />} />
        </Route>
        <Route element={<OnlyFor roles={['admin', 'registrar', 'accounting']} />}>
          <Route path="/manage-tickets" element={<ManageTickets />} />
        </Route>
        <Route element={<OnlyFor roles={['accounting', 'admin']} />}>
          <Route path="/ledgers" element={<Ledgers />} />
        </Route>
        <Route element={<OnlyFor roles={['student']} />}>
          <Route path="/enroll" element={<Enroll />} />
          <Route path="/grades" element={<Grades />} />
          <Route path="/tickets" element={<Tickets />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
