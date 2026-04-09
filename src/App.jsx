import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProgramProvider } from './contexts/ProgramContext'
import LoginPage from './pages/LoginPage'
import AdminRouter from './pages/admin/AdminRouter'
import CompanyRouter from './pages/company/CompanyRouter'
import StudentRouter from './pages/student/StudentRouter'

const ROLE_MAP = {
  MASTER: ['admin', 'company', 'student'],
  ADMIN: ['admin'],
  COMPANY: ['company'],
  USER: ['student'],
}

function PrivateRoute({ children, allowedRole }) {
  const { session, profile, loading } = useAuth()

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontSize: 14, color: '#6B7280' }}>
      로딩 중...
    </div>
  )

  if (!session) return <Navigate to="/login" replace />

  // profile 로드 완료 후에만 role 체크
  if (profile) {
    const allowed = ROLE_MAP[profile.role] || []
    if (!allowed.includes(allowedRole)) return <Navigate to="/login" replace />
  }

  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin/*" element={<PrivateRoute allowedRole="admin"><AdminRouter /></PrivateRoute>} />
      <Route path="/company/*" element={
        <PrivateRoute allowedRoles={['COMPANY']}>
          <CompanyRouter />
        </PrivateRoute>
      } />
      <Route path="/student/*" element={<PrivateRoute allowedRole="student"><StudentRouter /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProgramProvider>
          <AppRoutes />
        </ProgramProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}