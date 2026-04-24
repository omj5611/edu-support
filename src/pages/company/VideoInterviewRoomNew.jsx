import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import MeetRecord from './MeetRecord'

const STAGE_OPTIONS = ['평가 전', '면접 예정', '예비합격', '최종합격', '불합격', '중도포기']

const STAGE_COLOR = {
  '평가 전': '#64748B',
  '면접 예정': '#3B82F6',
  '예비합격': '#F59E0B',
  '최종합격': '#10B981',
  '불합격': '#EF4444',
  '중도포기': '#8B5CF6',
  '대기': '#64748B',
}

const FIELD_LABELS = {
  birth: '생년월일',
  phone: '연락처',
  email: '이메일',
  company_name: '지원 기업',
  booked_date: '면접 날짜',
  booked_time: '면접 시간',
  introduce: '자기소개',
  motivation: '지원 동기',
  experience: '경력사항',
  education: '학력',
  address: '주소',
}

const PORTFOLIO_KEYS = ['portfolio', 'portfolio_url', 'portfolio_link', '포트폴리오']
const RESUME_KEYS = ['resume', 'resume_url', 'resume_link', '이력서', 'cv', 'cv_url']

function normalizeCompanyName(value) {
  return String(value || '').trim().toLowerCase()
}

function normalizeStage(stage) {
  const s = String(stage || '').trim()
  if (!s || s === '대기') return '평가 전'
  return s
}

function parseRoomCode(link) {
  if (!link) return ''
  try {
    const url = new URL(String(link), window.location.origin)
    return String(url.searchParams.get('room') || '').trim()
  } catch (_) {
    const m = String(link).match(/[?&]room=([^&#]+)/i)
    return m?.[1] ? decodeURIComponent(m[1]) : ''
  }
}

function formatRoomTime(room) {
  if (!room) return '-'
  const start = room.scheduled_start_time || ''
  const end = room.scheduled_end_time || ''
  if (!start && !end) return '-'
  return `${start}${end ? ` ~ ${end}` : ''}`
}

function parseRoomStartMs(room) {
  if (!room?.scheduled_date || !room?.scheduled_start_time) return NaN
  const d = new Date(`${room.scheduled_date}T${String(room.scheduled_start_time).slice(0, 8)}`)
  return d.getTime()
}

function parseRoomEndMs(room) {
  if (!room?.scheduled_date) return NaN
  if (room?.scheduled_end_time) {
    const d = new Date(`${room.scheduled_date}T${String(room.scheduled_end_time).slice(0, 8)}`)
    return d.getTime()
  }
  const startMs = parseRoomStartMs(room)
  if (Number.isNaN(startMs)) return NaN
  return startMs + 60 * 60 * 1000
}

function findDocField(fd, keys) {
  for (const k of keys) {
    const v = fd?.[k]
    if (v && typeof v === 'string' && v.trim()) return v.trim()
    if (v && typeof v === 'object') {
      const link = v.url || v.publicUrl || v.link || v.href
      if (link && typeof link === 'string' && link.trim()) return link.trim()
    }
  }
  return ''
}

function normalizeDocUrl(raw) {
  const v = String(raw || '').trim()
  if (!v) return ''
  if (/^https?:\/\//i.test(v)) return v
  if (v.startsWith('//')) return `https:${v}`
  if (/^www\./i.test(v)) return `https://${v}`
  // plain domain/path 입력도 프리뷰 가능하게 보정
  if (/^[a-z0-9.-]+\.[a-z]{2,}($|\/)/i.test(v)) return `https://${v}`
  return v
}

function getDisplayRows(applicant) {
  if (!applicant) return []
  const fd = applicant.form_data || {}
  const rows = []
  const taken = new Set()
  const hidden = new Set([...PORTFOLIO_KEYS, ...RESUME_KEYS])
  const role = String(applicant?._viewerRole || '').trim().toUpperCase()
  const companyHiddenKeys = new Set([
    'anomaly_check',
    'emp_insurance',
    'has_attachment',
    'portfolio_link',
    'privacy_consent',
    'participation_count',
    'national_emp_support',
  ])

  const orderedKeys = Object.keys(FIELD_LABELS)
  for (const key of orderedKeys) {
    const value = fd[key]
    if (value === null || value === undefined || value === '') continue
    rows.push({ key, label: FIELD_LABELS[key], value: String(value) })
    taken.add(key)
  }

  if (!taken.has('email')) {
    const value = applicant.email || fd.email
    if (value) rows.push({ key: 'email_fallback', label: '이메일', value: String(value) })
  }
  if (!taken.has('phone')) {
    const value = applicant.phone || fd.phone
    if (value) rows.push({ key: 'phone_fallback', label: '연락처', value: String(value) })
  }

  for (const [k, v] of Object.entries(fd)) {
    if (taken.has(k) || hidden.has(k)) continue
    if (role === 'COMPANY' && companyHiddenKeys.has(k)) continue
    if (v === null || v === undefined || v === '') continue
    if (typeof v === 'object') continue
    rows.push({ key: `extra_${k}`, label: k, value: String(v) })
  }
  return rows
}

function DocViewer({ url, label }) {
  const normalizedUrl = useMemo(() => normalizeDocUrl(url), [url])
  const [loading, setLoading] = useState(Boolean(normalizedUrl))
  const [error, setError] = useState(false)

  useEffect(() => {
    setLoading(Boolean(normalizedUrl))
    setError(false)
  }, [normalizedUrl])

  if (!normalizedUrl) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#94A3B8' }}>
        {label} 파일이 없습니다.
      </div>
    )
  }

  const isPdf = /\.pdf(\?|$)/i.test(normalizedUrl)
  const isHttp = /^https?:\/\//i.test(normalizedUrl)
  const fallbackViewer = `https://docs.google.com/viewer?url=${encodeURIComponent(normalizedUrl)}&embedded=true`

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ height: 34, padding: '0 10px', borderBottom: '1px solid rgba(148,163,184,0.2)', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(15,23,42,0.9)' }}>
        <div style={{ flex: 1, fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{normalizedUrl}</div>
        {isPdf ? (
          <a href={normalizedUrl} download style={{ fontSize: 11, fontWeight: 700, color: '#22C55E', textDecoration: 'none' }}>다운로드</a>
        ) : (
          <a href={normalizedUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, fontWeight: 700, color: '#818CF8', textDecoration: 'none' }}>바로가기 ↗</a>
        )}
      </div>
      <div style={{ position: 'relative', flex: 1, minHeight: 0, background: '#fff' }}>
        {!error && isHttp ? (
          <>
            {loading && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: 12 }}>
                미리보기 불러오는 중...
              </div>
            )}
            {isPdf ? (
              <object
                data={normalizedUrl}
                type="application/pdf"
                width="100%"
                height="100%"
                aria-label={label}
              >
                <iframe
                  key={fallbackViewer}
                  src={fallbackViewer}
                  title={label}
                  onLoad={() => setLoading(false)}
                  onError={() => { setLoading(false); setError(true) }}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              </object>
            ) : (
              <iframe
                key={normalizedUrl}
                src={normalizedUrl}
                title={label}
                onLoad={() => setLoading(false)}
                onError={() => { setLoading(false); setError(true) }}
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            )}
          </>
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, color: '#475569' }}>
            <div style={{ fontSize: 13 }}>미리보기를 표시할 수 없습니다.</div>
            <a href={normalizedUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#818CF8', textDecoration: 'none' }}>
              {isPdf ? 'PDF 열기 ↗' : '링크 바로가기 ↗'}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

function RoomPreviewCard({ room, isSelected, onSelect, nowMs }) {
  const startMs = parseRoomStartMs(room)
  const endMs = parseRoomEndMs(room)
  const isCompleted = room?.status === 'completed'
  const isBefore = !isCompleted && !Number.isNaN(startMs) && nowMs < startMs
  const isInProgress = !isCompleted && !Number.isNaN(startMs) && nowMs >= startMs && (Number.isNaN(endMs) || nowMs < endMs)

  let statusText = '면접 시간입니다.'
  if (isCompleted) {
    statusText = '종료된 면접입니다'
  } else if (isBefore) {
    statusText = `예정된 면접입니다 (${room.scheduled_date || '-'} ${formatRoomTime(room)})`
  } else if (isInProgress) {
    statusText = '면접 시간입니다.'
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        width: '100%',
        border: isSelected ? '1px solid #22C55E' : '1px solid rgba(148,163,184,0.2)',
        borderRadius: 12,
        marginBottom: 10,
        padding: 10,
        textAlign: 'left',
        cursor: 'pointer',
        background: isSelected ? 'rgba(34,197,94,0.1)' : 'rgba(15,23,42,0.72)',
      }}
    >
      <div style={{ aspectRatio: '16 / 9', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(148,163,184,0.22)', background: '#0F172A', marginBottom: 8, position: 'relative' }}>
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E2E8F0', fontSize: 13, fontWeight: 700, textAlign: 'center', padding: 14 }}>
          {statusText}
        </div>
        <div style={{ position: 'absolute', right: 6, top: 6, fontSize: 10, color: '#E2E8F0', background: 'rgba(2,6,23,0.65)', borderRadius: 999, padding: '2px 8px', border: '1px solid rgba(148,163,184,0.25)' }}>
          {room.status === 'completed' ? '종료' : '진행/대기'}
        </div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#F8FAFC' }}>
        {room.scheduled_date || '-'} {formatRoomTime(room)}
      </div>
      <div style={{ fontSize: 11, color: '#A5B4FC', marginTop: 4 }}>
        방 코드: <b>{room.roomCode || '-'}</b>
      </div>
      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
        참여 면접자 {room.applicants.length}명
      </div>
      <div style={{ fontSize: 11, color: '#CBD5E1', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {room.applicants.map((a) => a.name).filter(Boolean).join(', ') || '입장/배정 면접자 없음'}
      </div>
    </button>
  )
}

export default function VideoInterviewRoomNew({ companyInfo, onClose }) {
  const { role, profile } = useAuth()
  const viewerRole = String(role || '').trim().toUpperCase()
  const isAdminViewer = viewerRole === 'ADMIN' || viewerRole === 'MASTER'
  const isCompanyViewer = viewerRole === 'COMPANY'
  const { programId, companyName, teamId, program } = companyInfo || {}

  const [loading, setLoading] = useState(true)
  const [applicants, setApplicants] = useState([])
  const [rooms, setRooms] = useState([])
  const [selectedApplicantId, setSelectedApplicantId] = useState('')
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [stageSavingId, setStageSavingId] = useState('')
  const [settingRow, setSettingRow] = useState(null)
  const [infoTab, setInfoTab] = useState('info')
  const [pendingAdmissions, setPendingAdmissions] = useState([])
  const [pendingAdmissionsByRoom, setPendingAdmissionsByRoom] = useState({})
  const [admitActionSignal, setAdmitActionSignal] = useState(null)
  const admitSignalSeqRef = useRef(0)
  const monitorSocketsRef = useRef(new Map())
  const [nowMs, setNowMs] = useState(() => Date.now())
  const refreshTimerRef = useRef(null)
  const loadingRef = useRef(false)
  const isInitialLoadedRef = useRef(false)

  const canEditStage = useMemo(() => {
    if (isAdminViewer) return true
    if (isCompanyViewer) return String(settingRow?.evaluation_status || '').trim() !== '평가완료'
    return false
  }, [isAdminViewer, isCompanyViewer, settingRow?.evaluation_status])

  const selectedApplicant = useMemo(
    () => applicants.find((a) => a.id === selectedApplicantId) || null,
    [applicants, selectedApplicantId],
  )
  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) || null,
    [rooms, selectedRoomId],
  )

  const selectedRoomStartAt = selectedRoom?.scheduled_date && selectedRoom?.scheduled_start_time
    ? `${selectedRoom.scheduled_date}T${String(selectedRoom.scheduled_start_time).slice(0, 8)}`
    : ''

  const supportRows = useMemo(() => getDisplayRows(selectedApplicant), [selectedApplicant])
  const supportRowsWithRole = useMemo(() => {
    if (!selectedApplicant) return []
    return getDisplayRows({ ...selectedApplicant, _viewerRole: role })
  }, [selectedApplicant, role])
  const portfolioUrl = useMemo(() => findDocField(selectedApplicant?.form_data || {}, PORTFOLIO_KEYS), [selectedApplicant])
  const resumeUrl = useMemo(() => findDocField(selectedApplicant?.form_data || {}, RESUME_KEYS), [selectedApplicant])
  const pendingAdmissionsAll = useMemo(() => (
    Object.values(pendingAdmissionsByRoom || {}).flat()
  ), [pendingAdmissionsByRoom])

  function decodeJoinRole(rawName) {
    const raw = String(rawName || '')
    if (raw.startsWith('\u200B')) return 'ie'
    if (raw.startsWith('\u200C')) return 'ir'
    return ''
  }

  function decodeJoinDisplayName(rawName) {
    let name = String(rawName || '')
    if (name.startsWith('\u200B') || name.startsWith('\u200C')) name = name.slice(1)
    if (name.startsWith('\u2064')) name = name.slice(1)
    if (name.startsWith('\u2063')) {
      const next = name.indexOf('\u2063', 1)
      if (next > 1) name = name.slice(next + 1)
    }
    return name || '면접자'
  }

  useEffect(() => {
    isInitialLoadedRef.current = false
    loadData({ silent: false })
  }, [programId, companyName, teamId])

  useEffect(() => {
    setInfoTab('info')
  }, [selectedApplicantId])

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 30 * 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!programId) return undefined
    const scheduleRefresh = () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = setTimeout(() => {
        loadData({ silent: true })
      }, 250)
    }
    const channel = supabase
      .channel(`video-room-new-${programId}-${companyName || ''}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, (payload) => {
        const row = payload.new || payload.old
        if (row?.program_id !== programId || row?.application_type !== 'interview') return
        scheduleRefresh()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interview_schedules' }, (payload) => {
        const row = payload.new || payload.old
        if (row?.program_id !== programId) return
        if (normalizeCompanyName(row?.company_name) !== normalizeCompanyName(companyName)) return
        scheduleRefresh()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interview_settings' }, (payload) => {
        const row = payload.new || payload.old
        if (row?.program_id !== programId) return
        scheduleRefresh()
      })
      .subscribe()
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
      supabase.removeChannel(channel)
    }
  }, [programId, companyName])

  useEffect(() => {
    if (!isAdminViewer) return undefined
    if (!window.io) return undefined

    const nextRoomIds = new Set(rooms.map((r) => r.id))
    const monitorMap = monitorSocketsRef.current

    // removed rooms cleanup
    for (const [roomId, socket] of monitorMap.entries()) {
      if (nextRoomIds.has(roomId)) continue
      try { socket.disconnect() } catch (_) {}
      monitorMap.delete(roomId)
    }

    rooms.forEach((room) => {
      if (!room?.id || !room?.roomCode) return
      if (monitorMap.has(room.id)) return
      const socket = window.io('https://meet-server-diix.onrender.com', {
        transports: ['polling'],
        upgrade: false,
        reconnection: true,
        reconnectionAttempts: Infinity,
      })
      monitorMap.set(room.id, socket)

      const monitorName = `${profile?.name || profile?.email || '운영진'}(monitor)`
      socket.emit('join-room', {
        roomId: room.roomCode,
        username: `\u200C${monitorName}`,
        isHost: true,
      })

      socket.on('user-joined', ({ socketId, username: uName }) => {
        if (!socketId) return
        const desiredRole = decodeJoinRole(uName)
        if (desiredRole !== 'ie') return
        const nextItem = {
          sid: socketId,
          username: decodeJoinDisplayName(uName),
          desiredRole: 'ie',
          roomId: room.id,
          roomCode: room.roomCode,
          roomLabel: `${room.scheduled_date || '-'} ${formatRoomTime(room)}`,
        }
        setPendingAdmissionsByRoom((prev) => {
          const curr = prev[room.id] || []
          if (curr.some((x) => x.sid === nextItem.sid)) return prev
          return { ...prev, [room.id]: [...curr, nextItem] }
        })
      })

      socket.on('user-left', ({ socketId }) => {
        if (!socketId) return
        setPendingAdmissionsByRoom((prev) => ({
          ...prev,
          [room.id]: (prev[room.id] || []).filter((x) => x.sid !== socketId),
        }))
      })
    })

    return () => {
      for (const socket of monitorSocketsRef.current.values()) {
        try { socket.disconnect() } catch (_) {}
      }
      monitorSocketsRef.current.clear()
    }
  }, [isAdminViewer, rooms, profile?.name, profile?.email])

  async function loadData({ silent = false } = {}) {
    if (loadingRef.current) return
    if (!programId) {
      setApplicants([])
      setRooms([])
      setLoading(false)
      return
    }
    loadingRef.current = true
    if (!silent || !isInitialLoadedRef.current) setLoading(true)
    try {
      let resolvedTeamId = teamId || null
      if (!resolvedTeamId && companyName) {
        const { data: byName } = await supabase
          .from('program_teams')
          .select('id')
          .eq('program_id', programId)
          .eq('name', companyName)
          .maybeSingle()
        resolvedTeamId = byName?.id || null
      }

      let settingQuery = supabase
        .from('interview_settings')
        .select('id, evaluation_status, program_teams_id')
        .eq('program_id', programId)
      if (resolvedTeamId) {
        settingQuery = settingQuery.eq('program_teams_id', resolvedTeamId)
      } else {
        settingQuery = settingQuery.is('program_teams_id', null)
      }

      const [{ data: appRows, error: appError }, { data: scheduleRows, error: scheduleError }, { data: settings, error: settingError }] = await Promise.all([
        supabase
          .from('applications')
          .select('id, name, stage, created_at, form_data, phone, email')
          .eq('program_id', programId)
          .eq('application_type', 'interview')
          .order('created_at', { ascending: false }),
        supabase
          .from('interview_schedules')
          .select('id, application_id, company_name, scheduled_date, scheduled_start_time, scheduled_end_time, meeting_link, status')
          .eq('program_id', programId)
          .neq('status', 'cancelled')
          .order('scheduled_date', { ascending: true })
          .order('scheduled_start_time', { ascending: true }),
        settingQuery.maybeSingle(),
      ])

      if (appError) throw appError
      if (scheduleError) throw scheduleError
      if (settingError) console.warn('interview_settings load warning:', settingError)
      setSettingRow(settings || null)

      const normalizedCompany = normalizeCompanyName(companyName)
      const schedulesByCompany = (scheduleRows || []).filter((s) => (
        normalizeCompanyName(s?.company_name) === normalizedCompany
      ))
      const scheduleAppIdSet = new Set(schedulesByCompany.map((s) => s.application_id).filter(Boolean))

      const appsByCompany = (appRows || []).filter((a) => (
        normalizeCompanyName(a?.form_data?.company_name || a?.form_data?.company || '') === normalizedCompany
      ))
      const finalApps = appsByCompany.length > 0
        ? appsByCompany
        : (appRows || []).filter((a) => scheduleAppIdSet.has(a.id))

      const scheduleByAppId = new Map()
      for (const row of schedulesByCompany) {
        if (!row?.application_id) continue
        if (!scheduleByAppId.has(row.application_id)) scheduleByAppId.set(row.application_id, row)
      }

      const nextApplicants = finalApps.map((a) => ({
        ...a,
        stage: normalizeStage(a.stage),
        _schedule: scheduleByAppId.get(a.id) || null,
      }))

      const appById = new Map(nextApplicants.map((a) => [a.id, a]))
      const roomMap = new Map()
      for (const s of schedulesByCompany) {
        const roomCode = parseRoomCode(s.meeting_link || '')
        const key = `${s.scheduled_date || ''}_${s.scheduled_start_time || ''}_${roomCode || 'no-room'}`
        if (!roomMap.has(key)) {
          roomMap.set(key, {
            id: key,
            roomCode,
            meetingLink: s.meeting_link || '',
            scheduled_date: s.scheduled_date || '',
            scheduled_start_time: s.scheduled_start_time || '',
            scheduled_end_time: s.scheduled_end_time || '',
            status: s.status || '',
            applicants: [],
          })
        }
        const room = roomMap.get(key)
        const app = appById.get(s.application_id)
        if (app && !room.applicants.some((x) => x.id === app.id)) room.applicants.push(app)
      }

      const nextRooms = Array.from(roomMap.values())
      setApplicants(nextApplicants)
      setRooms(nextRooms)

      setSelectedApplicantId((prev) => {
        if (prev && nextApplicants.some((a) => a.id === prev)) return prev
        return nextApplicants[0]?.id || ''
      })
      setSelectedRoomId((prev) => {
        if (prev && nextRooms.some((r) => r.id === prev)) return prev
        return ''
      })
      isInitialLoadedRef.current = true
    } catch (e) {
      console.error('VideoInterviewRoomNew loadData failed:', e)
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }

  async function onChangeStage(applicantId, nextStage) {
    if (!applicantId || !nextStage) return
    if (!canEditStage) return
    setStageSavingId(applicantId)
    try {
      const { error } = await supabase
        .from('applications')
        .update({ stage: nextStage })
        .eq('id', applicantId)
      if (error) throw error
      setApplicants((prev) => prev.map((a) => (
        a.id === applicantId ? { ...a, stage: normalizeStage(nextStage) } : a
      )))
      alert('면접자 상태가 변경되었습니다')
    } catch (e) {
      console.error('stage update failed:', e)
      alert(`면접자 상태 변경 실패: ${e.message}`)
    } finally {
      setStageSavingId('')
    }
  }

  function onSelectApplicant(applicant) {
    setSelectedApplicantId(applicant.id)
  }

  function onSelectRoom(room) {
    if (!room?.id) return
    if (!selectedRoomId) {
      const ok = window.confirm('해당 면접방에 입장하시겠습니까?')
      if (!ok) return
    } else if (selectedRoomId !== room.id) {
      const ok = window.confirm('해당 면접방에 입장하시겠습니까? 지금 있던 면접방에서는 나가게됩니다')
      if (!ok) return
    }
    setSelectedRoomId(room.id)
    setPendingAdmissions(pendingAdmissionsByRoom[room.id] || [])
    if (room.applicants.length > 0) {
      setSelectedApplicantId(room.applicants[0].id)
    }
  }

  async function markRoomCompleted(room) {
    if (!room?.id) return
    setRooms((prev) => prev.map((r) => (r.id === room.id ? { ...r, status: 'completed' } : r)))
    try {
      let query = supabase
        .from('interview_schedules')
        .update({ status: 'completed' })
        .eq('program_id', programId)
        .eq('company_name', companyName)
        .eq('scheduled_date', room.scheduled_date)
        .eq('scheduled_start_time', room.scheduled_start_time)
        .neq('status', 'cancelled')
      if (room.roomCode) {
        query = query.ilike('meeting_link', `%room=${room.roomCode}%`)
      }
      const { error } = await query
      if (error) throw error
    } catch (e) {
      console.error('markRoomCompleted failed:', e)
    }
  }

  function sendAdmitAction(sid, action) {
    if (!sid) return
    const request = pendingAdmissionsAll.find((p) => p.sid === sid) || null
    const targetRoomId = request?.roomId || selectedRoomId || ''
    const targetRoomCode = request?.roomCode || ''
    admitSignalSeqRef.current += 1
    if (targetRoomId && targetRoomId === selectedRoomId) {
      setAdmitActionSignal({
        token: `${Date.now()}_${admitSignalSeqRef.current}`,
        sid,
        action,
      })
    } else if (targetRoomId) {
      const monitorSocket = monitorSocketsRef.current.get(targetRoomId)
      if (monitorSocket && targetRoomCode) {
        if (action === 'approve') {
          monitorSocket.emit('admit-user', { roomId: targetRoomCode, socketId: sid, role: 'ie' })
        } else if (action === 'deny') {
          monitorSocket.emit('deny-user', { roomId: targetRoomCode, socketId: sid })
        }
      }
    }
    setPendingAdmissions((prev) => prev.filter((p) => p.sid !== sid))
    if (targetRoomId) {
      setPendingAdmissionsByRoom((prev) => ({
        ...prev,
        [targetRoomId]: (prev[targetRoomId] || []).filter((p) => p.sid !== sid),
      }))
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: '#0B1220', color: '#E2E8F0', display: 'flex', flexDirection: 'column' }}>
      <header style={{ height: 56, borderBottom: '1px solid rgba(148,163,184,0.2)', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 800 }}>화상 면접 대시보드</div>
        <div style={{ fontSize: 12, color: '#94A3B8' }}>{companyName || '-'}</div>
        {program?.title && <div style={{ fontSize: 12, color: '#A5B4FC' }}>{program.title}</div>}
        <div style={{ marginLeft: 'auto' }}>
          <button type="button" onClick={onClose} style={{ border: '1px solid rgba(248,113,113,0.35)', background: 'rgba(248,113,113,0.08)', color: '#FCA5A5', borderRadius: 8, height: 34, padding: '0 12px', cursor: 'pointer', fontWeight: 700 }}>
            닫기
          </button>
        </div>
      </header>

      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '300px 1fr 360px' }}>
        <aside style={{ borderRight: '1px solid rgba(148,163,184,0.2)', padding: 12, overflow: 'auto' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>면접자 목록 ({applicants.length})</div>
          {loading && <div style={{ fontSize: 12, color: '#94A3B8' }}>불러오는 중...</div>}
          {!loading && applicants.length === 0 && (
            <div style={{ fontSize: 12, color: '#94A3B8' }}>해당 프로그램/기업 면접자가 없습니다.</div>
          )}
          {applicants.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelectApplicant(a)}
              style={{
                width: '100%',
                textAlign: 'left',
                border: selectedApplicantId === a.id ? '1px solid #6366F1' : '1px solid rgba(148,163,184,0.2)',
                background: selectedApplicantId === a.id ? 'rgba(99,102,241,0.15)' : 'rgba(15,23,42,0.65)',
                borderRadius: 10,
                padding: 10,
                marginBottom: 8,
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC', flex: 1 }}>{a.name || '이름 없음'}</div>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: STAGE_COLOR[a.stage] || '#64748B' }} />
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: '#94A3B8' }}>
                {a._schedule?.scheduled_date ? `${a._schedule.scheduled_date} ${a._schedule.scheduled_start_time || ''}` : '일정 미정'}
              </div>
            </button>
          ))}
        </aside>

        <main style={{ minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0, padding: 12 }}>
          <section style={{ flex: '0 0 66.66%', minHeight: 280, border: '1px solid rgba(148,163,184,0.2)', borderRadius: 12, overflow: 'hidden', background: '#020617', display: 'flex', alignItems: 'stretch', justifyContent: 'stretch' }}>
            {selectedRoom?.roomCode ? (
              <div style={{ width: '100%', height: '100%', minHeight: 0 }}>
                <MeetRecord
                  key={selectedRoom.id}
                  embedded
                  forcedRoomCode={selectedRoom.roomCode}
                  defaultUsername={profile?.name || profile?.email || companyName || '면접관'}
                  autoJoin
                  forceHost={isAdminViewer || isCompanyViewer}
                  scheduledStartAt={selectedRoomStartAt}
                  reportContext={{
                    programId,
                    companyName,
                    applicationId: selectedApplicant?.id || null,
                    applicantName: selectedApplicant?.name || null,
                    roomId: selectedRoom.id,
                    roomDate: selectedRoom.scheduled_date || null,
                    roomTime: formatRoomTime(selectedRoom),
                  }}
                  onClose={() => {}}
                  onInterviewEnded={() => {
                    if (selectedRoom) markRoomCompleted(selectedRoom)
                  }}
                  onPendingAdmissionsChange={(pending) => {
                    if (!isAdminViewer) return
                    const next = Array.isArray(pending) ? pending : []
                    const roomId = selectedRoom?.id || selectedRoomId || ''
                    if (!roomId) {
                      setPendingAdmissions(next)
                      return
                    }
                    const enriched = next.map((item) => ({
                      ...item,
                      roomId,
                      roomCode: selectedRoom?.roomCode || '',
                      roomLabel: selectedRoom ? `${selectedRoom.scheduled_date || '-'} ${formatRoomTime(selectedRoom)}` : '',
                    }))
                    setPendingAdmissions(enriched)
                    setPendingAdmissionsByRoom((prev) => ({
                      ...prev,
                      [roomId]: enriched,
                    }))
                  }}
                  admitActionSignal={admitActionSignal}
                />
              </div>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 13 }}>
                우측 면접방 목록에서 방을 선택하면 화상 화면이 표시됩니다.
              </div>
            )}
          </section>

          <section style={{ flex: '0 0 33.34%', marginTop: 10, minHeight: 230, border: '1px solid rgba(148,163,184,0.2)', borderRadius: 12, overflow: 'hidden', background: 'rgba(15,23,42,0.75)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: 42, borderBottom: '1px solid rgba(148,163,184,0.2)', display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8 }}>
              {[
                { id: 'info', label: '지원 정보' },
                { id: 'portfolio', label: '포트폴리오' },
                { id: 'resume', label: '이력서' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setInfoTab(tab.id)}
                  style={{
                    height: 28,
                    borderRadius: 8,
                    border: infoTab === tab.id ? '1px solid #6366F1' : '1px solid rgba(148,163,184,0.2)',
                    background: infoTab === tab.id ? 'rgba(99,102,241,0.22)' : 'rgba(2,6,23,0.25)',
                    color: infoTab === tab.id ? '#C7D2FE' : '#CBD5E1',
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '0 10px',
                    cursor: 'pointer',
                  }}
                >
                  {tab.label}
                </button>
              ))}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  value={selectedApplicant?.stage || '평가 전'}
                  disabled={!selectedApplicant || !canEditStage || stageSavingId === selectedApplicant?.id}
                  onChange={(e) => selectedApplicant && onChangeStage(selectedApplicant.id, e.target.value)}
                  style={{ height: 30, borderRadius: 8, border: '1px solid rgba(148,163,184,0.3)', background: '#0F172A', color: '#E2E8F0', padding: '0 8px', fontSize: 12 }}
                >
                  {STAGE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              {infoTab === 'info' && (
                <div style={{ height: '100%', overflow: 'auto', padding: 12 }}>
                  {!selectedApplicant ? (
                    <div style={{ fontSize: 13, color: '#94A3B8' }}>좌측에서 면접자를 선택하세요.</div>
                  ) : supportRowsWithRole.length === 0 ? (
                    <div style={{ fontSize: 13, color: '#94A3B8' }}>표시할 지원 정보가 없습니다.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {supportRowsWithRole.map((row) => (
                        <div key={row.key} style={{ border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, padding: 10, background: 'rgba(2,6,23,0.32)' }}>
                          <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 4 }}>{row.label}</div>
                          <div style={{ fontSize: 13, color: '#F8FAFC', wordBreak: 'break-word' }}>{row.value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {infoTab === 'portfolio' && (
                <DocViewer url={portfolioUrl} label="포트폴리오" />
              )}
              {infoTab === 'resume' && (
                <DocViewer url={resumeUrl} label="이력서" />
              )}
            </div>
          </section>
        </main>

        <aside style={{ borderLeft: '1px solid rgba(148,163,184,0.2)', padding: 12, overflow: 'auto' }}>
          {isAdminViewer && (
            <div style={{ marginBottom: 12, border: '1px solid rgba(148,163,184,0.22)', borderRadius: 10, background: 'rgba(2,6,23,0.36)', overflow: 'hidden' }}>
              <div style={{ height: 36, display: 'flex', alignItems: 'center', padding: '0 10px', borderBottom: '1px solid rgba(148,163,184,0.16)', fontSize: 12, fontWeight: 800, color: '#F8FAFC' }}>
                입장 요청 리스트 ({pendingAdmissionsAll.length})
              </div>
              <div style={{ maxHeight: 180, overflow: 'auto', padding: 10 }}>
                {pendingAdmissionsAll.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#94A3B8' }}>현재 입장 요청이 없습니다.</div>
                ) : (
                  pendingAdmissionsAll.map((p) => (
                    <div key={p.sid} style={{ border: '1px solid rgba(148,163,184,0.16)', borderRadius: 8, padding: 8, marginBottom: 8, background: 'rgba(15,23,42,0.6)' }}>
                      <div style={{ fontSize: 12, color: '#E2E8F0', fontWeight: 700 }}>{p.username || '사용자'}</div>
                      <div style={{ fontSize: 11, color: '#A5B4FC', marginTop: 2 }}>{p.roomLabel || '-'}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>socket: {p.sid}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        <button
                          type="button"
                          onClick={() => sendAdmitAction(p.sid, 'approve')}
                          style={{ height: 28, borderRadius: 8, border: '1px solid rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.16)', color: '#86EFAC', fontSize: 11, fontWeight: 700, padding: '0 10px', cursor: 'pointer' }}
                        >
                          승인
                        </button>
                        <button
                          type="button"
                          onClick={() => sendAdmitAction(p.sid, 'deny')}
                          style={{ height: 28, borderRadius: 8, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.16)', color: '#FCA5A5', fontSize: 11, fontWeight: 700, padding: '0 10px', cursor: 'pointer' }}
                        >
                          거부
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>면접방 목록 ({rooms.length})</div>
          {loading && <div style={{ fontSize: 12, color: '#94A3B8' }}>불러오는 중...</div>}
          {!loading && rooms.length === 0 && (
            <div style={{ fontSize: 12, color: '#94A3B8' }}>해당 기업 면접방이 없습니다.</div>
          )}
          {rooms.map((room) => (
            <RoomPreviewCard
              key={room.id}
              room={room}
              isSelected={selectedRoomId === room.id}
              onSelect={() => onSelectRoom(room)}
              nowMs={nowMs}
            />
          ))}
        </aside>
      </div>
    </div>
  )
}
