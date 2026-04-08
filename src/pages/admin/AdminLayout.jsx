import { Outlet, useNavigate, useParams, NavLink } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useProgram } from '../../contexts/ProgramContext'
import { supabase } from '../../lib/supabase'

const NAV = [
  { id: 'settings',   label: '면접 설정',   icon: '⚙️' },
  { id: 'management', label: '면접 관리',   icon: '🏢' },
  { id: 'notice',     label: '공지사항',    icon: '🔔' },
  { id: 'inquiry',    label: '문의 및 지원', icon: '💬' },
]

export default function AdminLayout() {
  const { progId } = useParams()
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const { selectedProgram, setSelectedProgram } = useProgram()

  useEffect(() => {
    if (!selectedProgram && progId) {
      supabase.from('programs').select('*').eq('id', progId).single()
        .then(({ data }) => { if (data) setSelectedProgram(data) })
    }
  }, [progId])

  return (
    <div className="app-layout">
      <header className="topbar">
        <div className="logo"><div className="logo-icon">M</div><span>면접 관리</span></div>
        {selectedProgram && (
          <><div className="topbar-divider" />
          <button className="prog-chip" onClick={() => navigate('/admin')}>
            {selectedProgram.title} ▾
          </button></>
        )}
        <div className="topbar-spacer" />
        <span className="role-badge admin">운영진 (Admin)</span>
        <div className="topbar-divider" />
        <button className="btn-ghost-sm" onClick={async () => { await signOut(); navigate('/login') }}>로그아웃</button>
      </header>
      <div className="layout-body">
        <aside className="sidebar">
          <nav className="nav-section">
            <div className="nav-label">관리자 메뉴</div>
            {NAV.map(item => (
              <NavLink key={item.id} to={`/admin/${progId}/${item.id}`}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <span className="nav-icon">{item.icon}</span>{item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="main-content"><Outlet /></main>
      </div>
    </div>
  )
}
