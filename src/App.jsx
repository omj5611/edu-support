import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProgramProvider } from './contexts/ProgramContext'
import LoginPage from './pages/LoginPage'
import AdminRouter from './pages/admin/AdminRouter'
import CompanyRouter from './pages/company/CompanyRouter'
import StudentRouter from './pages/student/StudentRouter'
import MeetRecordPage from './pages/meet/MeetRecordPage'

function PrivateRoute({ children, allowedRoles }) {
  const { session, role, loading } = useAuth()
  const location = useLocation()

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontSize: 14, color: '#6B7280' }}>
      로딩 중...
    </div>
  )

  if (!session) {
    const next = `${location.pathname}${location.search}`
    return <Navigate to={`/login?redirect=${encodeURIComponent(next)}`} replace />
  }

  // role이 아직 null이면 (profile 로드 중) 잠깐 대기
  if (!role) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontSize: 14, color: '#6B7280' }}>
      로딩 중...
    </div>
  )

  if (allowedRoles && !allowedRoles.includes(role)) {
    const next = `${location.pathname}${location.search}`
    return <Navigate to={`/login?redirect=${encodeURIComponent(next)}`} replace />
  }

  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin/*" element={
        <PrivateRoute allowedRoles={['ADMIN', 'MASTER']}>
          <AdminRouter />
        </PrivateRoute>
      } />
      <Route path="/company/*" element={
        <PrivateRoute allowedRoles={['COMPANY']}>
          <CompanyRouter />
        </PrivateRoute>
      } />
      <Route path="/student/*" element={
        <PrivateRoute allowedRoles={['USER']}>
          <StudentRouter />
        </PrivateRoute>
      } />
      <Route path="/meet-record" element={
        <PrivateRoute allowedRoles={['ADMIN', 'MASTER', 'COMPANY', 'USER']}>
          <MeetRecordPage />
        </PrivateRoute>
      } />
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
