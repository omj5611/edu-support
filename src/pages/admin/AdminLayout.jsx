import { Outlet, useNavigate, useParams, NavLink, useLocation } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useProgram } from '../../contexts/ProgramContext'
import { supabase } from '../../lib/supabase'

const LineIcon = {
  Settings: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  ),
  Calendar: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Users: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Bell: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  Video: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  ),
}

const NAV = [
  { id: 'settings', label: '면접 설정', group: '운영', icon: LineIcon.Settings },
  { id: 'management', label: '면접 관리', group: '운영', icon: LineIcon.Calendar },
  { id: 'companies', label: '기업 및 면접자 관리', group: '운영', icon: LineIcon.Users },
  { id: 'notice', label: '공지사항', group: '운영', icon: LineIcon.Bell },
]

export default function AdminLayout() {
  const { progId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const { selectedProgram, setSelectedProgram } = useProgram()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showAlertPanel, setShowAlertPanel] = useState(false)
  const [alerts, setAlerts] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isTabletMobile, setIsTabletMobile] = useState(() => window.innerWidth <= 1024)
  const [alertPanelPos, setAlertPanelPos] = useState({ top: 0, left: 0 })
  const alertBtnRef = useRef(null)
  const topAlertBtnRef = useRef(null)
  const alertPanelRef = useRef(null)

  const readEntryKey = useMemo(() => `admin_alert_read_entries_${progId}`, [progId])

  useEffect(() => {
    if (!selectedProgram && progId) {
      supabase.from('programs').select('*').eq('id', progId).single()
        .then(({ data }) => { if (data) setSelectedProgram(data) })
    }
  }, [progId])

  useEffect(() => {
    if (!progId) return
    loadAlerts()
    const channel = supabase
      .channel(`admin-alert-${progId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interview_schedules' }, (payload) => {
        const p = payload.new || payload.old
        if (p?.program_id === progId) loadAlerts()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interview_settings' }, (payload) => {
        const p = payload.new || payload.old
        if (p?.program_id === progId) loadAlerts()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'users' }, () => {
        loadAlerts()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, () => {
        loadAlerts()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [progId])

  useEffect(() => {
    if (!progId) return
    const channel = supabase
      .channel(`admin-video-menu-${progId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interview_settings' }, (payload) => {
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, (payload) => {
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [progId])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!mobileMenuOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [mobileMenuOpen])

  useEffect(() => {
    const onResize = () => setIsTabletMobile(window.innerWidth <= 1024)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!showAlertPanel) return
    const updatePanelPosition = () => {
      const el = (isTabletMobile ? topAlertBtnRef.current : alertBtnRef.current) || alertBtnRef.current || topAlertBtnRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const panelWidth = Math.min(360, Math.max(260, window.innerWidth - 24))
      const gap = 20
      const maxLeft = Math.max(12, window.innerWidth - panelWidth - 12)
      const mobileLeft = Math.min(Math.max(12, rect.right - panelWidth), maxLeft)
      setAlertPanelPos({
        top: Math.max(72, rect.top + (isTabletMobile ? rect.height + 8 : 0)),
        left: isTabletMobile ? mobileLeft : Math.min(rect.right + gap, maxLeft),
      })
    }

    updatePanelPosition()
    window.addEventListener('resize', updatePanelPosition)
    window.addEventListener('scroll', updatePanelPosition, true)
    return () => {
      window.removeEventListener('resize', updatePanelPosition)
      window.removeEventListener('scroll', updatePanelPosition, true)
    }
  }, [showAlertPanel, isTabletMobile])

  useEffect(() => {
    if (!showAlertPanel) return
    const onDown = (e) => {
      const sidebarBtn = alertBtnRef.current
      const topBtn = topAlertBtnRef.current
      const panel = alertPanelRef.current
      const t = e.target
      if (panel && panel.contains(t)) return
      if (sidebarBtn && sidebarBtn.contains(t)) return
      if (topBtn && topBtn.contains(t)) return
      setShowAlertPanel(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [showAlertPanel])

  function getReadEntries() {
    try {
      const raw = localStorage.getItem(readEntryKey)
      const arr = raw ? JSON.parse(raw) : []
      return new Set(Array.isArray(arr) ? arr : [])
    } catch (_) {
      return new Set()
    }
  }

  function saveReadEntries(entries) {
    localStorage.setItem(readEntryKey, JSON.stringify([...entries]))
  }

  function markAlertRead(alert) {
    if (!alert || alert.read) return
    const entries = getReadEntries()
    entries.add(alert.entryKey)
    saveReadEntries(entries)
    setAlerts((prev) => prev.map((a) => a.entryKey === alert.entryKey ? { ...a, read: true } : a))
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  function formatAlertTime(ts) {
    if (!ts) return '-'
    const d = new Date(ts)
    if (Number.isNaN(d.getTime())) return '-'
    return d.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  async function loadAlerts() {
    try {
      const [
        { data: schedules },
        { data: apps },
        { data: settings },
        { data: teams },
        { data: signupUsers },
        { data: linkedApplications },
        { data: teamOwners },
        { data: programRow },
      ] = await Promise.all([
        supabase
          .from('interview_schedules')
          .select('id, updated_at, created_at, company_name, application_id, scheduled_date, scheduled_start_time, scheduled_end_time, status')
          .eq('program_id', progId)
          .neq('status', 'cancelled')
          .order('updated_at', { ascending: false })
          .limit(80),
        supabase
          .from('applications')
          .select('id, name')
          .eq('program_id', progId)
          .eq('application_type', 'interview'),
        supabase
          .from('interview_settings')
          .select('id, program_teams_id, evaluation_status, updated_at, created_at')
          .eq('program_id', progId),
        supabase
          .from('program_teams')
          .select('id, name')
          .eq('program_id', progId),
        supabase
          .from('users')
          .select('id, role, name, email, created_at, brand, metadata')
          .in('role', ['COMPANY', 'USER'])
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('applications')
          .select('user_id')
          .eq('program_id', progId)
          .eq('application_type', 'interview')
          .not('user_id', 'is', null),
        supabase
          .from('program_teams')
          .select('user_id')
          .eq('program_id', progId)
          .not('user_id', 'is', null),
        supabase
          .from('programs')
          .select('brand')
          .eq('id', progId)
          .maybeSingle(),
      ])
      const appNameById = new Map((apps || []).map((a) => [a.id, a.name || '면접자']))
      const teamNameById = new Map((teams || []).map((t) => [String(t.id), String(t.name || '').trim()]))
      const readEntries = getReadEntries()
      const linkedApplicantUserIds = new Set((linkedApplications || []).map((a) => a.user_id).filter(Boolean))
      const linkedCompanyUserIds = new Set((teamOwners || []).map((t) => t.user_id).filter(Boolean))
      const programBrand = String(programRow?.brand || selectedProgram?.brand || '').trim()

      const scheduleAlerts = (schedules || []).map((s) => {
        const isChanged = (s.updated_at || '') !== (s.created_at || '')
        const applicant = appNameById.get(s.application_id) || '면접자'
        const ts = s.updated_at || s.created_at
        const entryKey = `schedule:${s.id}:${ts}`
        return {
          id: `schedule:${s.id}`,
          ts,
          entryKey,
          title: isChanged ? '면접 일정 변경' : '면접 일정 등록',
          body: `${s.company_name} · ${applicant} · ${s.scheduled_date} ${s.scheduled_start_time || ''}`,
          read: readEntries.has(entryKey),
        }
      })

      const evaluationAlerts = (settings || [])
        .filter((s) => {
          const status = String(s?.evaluation_status || '').trim()
          return status === '평가완료' || status === '평가 완료'
        })
        .map((s) => {
          const ts = s.updated_at || s.created_at
          const companyName = teamNameById.get(String(s.program_teams_id || '')) || '기업'
          const entryKey = `evaluation:${s.id}:${ts}`
          return {
            id: `evaluation:${s.id}`,
            ts,
            entryKey,
            title: '기업 평가 완료',
            body: `${companyName} 기업이 면접자 평가를 완료했습니다.`,
            read: readEntries.has(entryKey),
          }
        })

      const signupAlerts = (signupUsers || [])
        .filter((u) => {
          const role = String(u?.role || '').trim().toUpperCase()
          const metadataProgramId = String(u?.metadata?.program_id || '').trim()
          const userBrand = String(u?.brand || u?.metadata?.brand || '').trim().toUpperCase()
          const sameBrand = !!programBrand && userBrand === String(programBrand).trim().toUpperCase()
          const sameProgram = metadataProgramId === String(progId)
          if (role === 'COMPANY') {
            if (programBrand) {
              return sameBrand && (sameProgram || linkedCompanyUserIds.has(u.id))
            }
            return sameProgram || linkedCompanyUserIds.has(u.id)
          }
          if (role === 'USER') {
            if (programBrand) {
              return sameBrand && (sameProgram || linkedApplicantUserIds.has(u.id))
            }
            return sameProgram || linkedApplicantUserIds.has(u.id)
          }
          return false
        })
        .map((u) => {
          const ts = u.created_at
          const role = String(u?.role || '').trim().toUpperCase()
          const isCompany = role === 'COMPANY'
          const entryKey = `signup:${u.id}:${ts}`
          return {
            id: `signup:${u.id}`,
            ts,
            entryKey,
            title: isCompany ? '기업 회원 가입' : '면접자 회원 가입',
            body: `${isCompany ? '기업' : '면접자'} 계정이 가입했습니다. (${u.name || u.email || '-'})`,
            read: readEntries.has(entryKey),
          }
        })

      const mapped = [...scheduleAlerts, ...evaluationAlerts, ...signupAlerts]
        .sort((a, b) => new Date(b.ts || 0).getTime() - new Date(a.ts || 0).getTime())
        .slice(0, 120)

      setAlerts(mapped)

      const unread = mapped.filter((a) => !a.read).length
      setUnreadCount(unread)
    } catch (e) {
      console.error('admin alerts load failed:', e)
    }
  }

  const renderAlertPanel = () => {
    if (!showAlertPanel) return null
    return (
      <div ref={alertPanelRef} style={{
        position: 'fixed',
        left: alertPanelPos.left,
        top: alertPanelPos.top,
        width: 'min(360px, calc(100vw - 24px))',
        maxHeight: 520,
        overflowY: 'auto',
        background: '#fff',
        border: '1px solid var(--gray-200)',
        borderRadius: 14,
        boxShadow: '0 16px 46px rgba(15,23,42,.18)',
        zIndex: 2200,
      }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--gray-900)' }}>일정 알림</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 600 }}>실시간 업데이트</span>
            <button
              type="button"
              onClick={loadAlerts}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, border: '1px solid var(--gray-200)', background: '#fff', color: 'var(--gray-600)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.5 9a9 9 0 0 1 14.1-3.36L23 10M1 14l5.4 4.36A9 9 0 0 0 20.5 15" />
              </svg>
            </button>
          </div>
        </div>
        {alerts.length === 0 ? (
          <div style={{ padding: '24px 16px', fontSize: 13, color: 'var(--gray-400)' }}>새로운 알림이 없습니다.</div>
        ) : (
          alerts.map((a) => (
            <div key={a.id} onClick={() => markAlertRead(a)} style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--gray-100)',
              display: 'grid',
              gap: 5,
              background: a.read ? '#fff' : 'var(--primary-light)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: a.read ? 600 : 800, color: a.read ? 'var(--gray-700)' : 'var(--gray-900)' }}>{a.title}</div>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: a.read ? 'var(--gray-400)' : 'var(--primary)',
                  background: a.read ? 'transparent' : '#DBEAFE',
                  border: a.read ? 'none' : '1px solid #BFDBFE',
                  padding: a.read ? 0 : '1px 7px',
                  borderRadius: 999,
                  whiteSpace: 'nowrap',
                }}>
                  {a.read ? '읽음' : '안읽음'}
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--gray-600)', lineHeight: 1.5 }}>{a.body}</div>
              <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                {formatAlertTime(a.ts)}
              </div>
            </div>
          ))
        )}
      </div>
    )
  }

  return (
    <div className="app-layout">
      <header className="topbar">
        <button
          type="button"
          className="mobile-menu-btn"
          aria-label="메뉴 열기"
          onClick={() => setMobileMenuOpen((v) => !v)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>
        <div className="logo">
          <div className="logo-icon">M</div>
          <span>면접 관리</span>
        </div>
        {selectedProgram && (
          <>
            <div className="topbar-divider" />
            <button className="prog-chip" onClick={() => navigate('/admin')}>
              {selectedProgram.title} ▾
            </button>
          </>
        )}
        <div className="topbar-spacer" />
        <button
          ref={topAlertBtnRef}
          type="button"
          className="mobile-top-alert"
          aria-label="알림"
          onClick={() => setShowAlertPanel((v) => !v)}>
          <LineIcon.Bell />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: -5,
              right: -5,
              minWidth: 16,
              height: 16,
              borderRadius: 999,
              background: '#DC2626',
              color: '#fff',
              fontSize: 10,
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              lineHeight: 1,
            }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
        <span className="role-badge admin">운영진</span>
        <div className="topbar-divider" />
        <button className="btn-ghost-sm topbar-logout" onClick={async () => { await signOut(); navigate('/login') }}>
          로그아웃
        </button>
      </header>

      <div className="layout-body">
        <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <nav className="nav-section" style={{ position: 'relative' }}>
            <div className="nav-label">관리자 메뉴</div>
            {NAV.map(item => (
              <NavLink
                key={item.id}
                to={`/admin/${progId}/${item.id}`}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                <span className="nav-icon"><item.icon /></span>
                <span>{item.label}</span>
              </NavLink>
            ))}
            {(() => {
              const AlertIcon = LineIcon.Bell
              const isAlertActive = showAlertPanel || location.pathname.includes('/inquiry')
              return (
                <button
                  ref={alertBtnRef}
                  className={`nav-item sidebar-alert-item ${isAlertActive ? 'active' : ''}`}
                  style={{ width: '100%', textAlign: 'left', position: 'relative', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setShowAlertPanel((v) => !v)
                  }}>
                  <span className="nav-icon"><AlertIcon /></span>
                  <span>알림</span>
                  {unreadCount > 0 && (
                    <span style={{
                      marginLeft: 'auto',
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: '#DC2626',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 700,
                      lineHeight: 1.3,
                    }}>
                      {unreadCount}
                    </span>
                  )}
                </button>
              )
            })()}

            {!isTabletMobile && renderAlertPanel()}
          </nav>
          <div className="mobile-sidebar-logout">
            <button className="btn-ghost-sm" onClick={async () => { await signOut(); navigate('/login') }}>
              로그아웃
            </button>
          </div>
        </aside>
        {isTabletMobile && renderAlertPanel()}
        {mobileMenuOpen && (
          <button
            type="button"
            className="mobile-sidebar-overlay"
            aria-label="메뉴 닫기"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
