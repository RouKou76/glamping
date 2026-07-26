import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@glamping/ui'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AdminLayout from './layouts/AdminLayout'
import Login from './pages/Login/Login'
import Tickets from './pages/Tickets/Tickets'
import Chats from './pages/Chats/Chats'
import Management from './pages/Management/Management'
import CheckIn from './pages/CheckIn/CheckIn'
import Staff from './pages/Staff/Staff'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-glamp-600 border-t-transparent rounded-full animate-spin" /></div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequirePermission({ permission, anyPermission, ticketAccess, children }: { permission?: string; anyPermission?: string[]; ticketAccess?: boolean; children: React.ReactNode }) {
  const { hasPermission, hasAnyPermission, hasTicketAccess } = useAuth()
  const allowed = ticketAccess ? hasTicketAccess() : anyPermission ? hasAnyPermission(...anyPermission) : hasPermission(permission ?? '')
  if (!allowed) return <Navigate to="/" replace />
  return <>{children}</>
}

function HomeRedirect() {
  const { hasTicketAccess, hasPermission, hasAnyPermission } = useAuth()
  if (hasTicketAccess()) return <Navigate to="/" replace />
  if (hasAnyPermission('manage_menu', 'manage_services', 'manage_info', 'manage_catalog')) return <Navigate to="/manage" replace />
  if (hasPermission('manage_chat')) return <Navigate to="/chats" replace />
  if (hasAnyPermission('manage_roles', 'manage_users')) return <Navigate to="/staff" replace />
  if (hasPermission('manage_houses')) return <Navigate to="/checkin" replace />
  return <Navigate to="/" replace />
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter basename="/admin">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
              <Route path="/" element={<RequirePermission ticketAccess><Tickets /></RequirePermission>} />
              <Route path="/checkin" element={<RequirePermission permission="manage_houses"><CheckIn /></RequirePermission>} />
              <Route path="/manage" element={<RequirePermission anyPermission={['manage_menu', 'manage_services', 'manage_info', 'manage_catalog']}><Management /></RequirePermission>} />
              <Route path="/chats" element={<RequirePermission permission="manage_chat"><Chats /></RequirePermission>} />
              <Route path="/staff" element={<RequirePermission anyPermission={['manage_roles', 'manage_users']}><Staff /></RequirePermission>} />
              <Route path="*" element={<HomeRedirect />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
