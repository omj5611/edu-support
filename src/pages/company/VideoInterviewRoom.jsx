import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import MeetRecord from './MeetRecord'
import { useAuth } from '../../contexts/AuthContext'

// ─────────────────────────────────────────────────────────────
const STAGE_COLOR = {
    '면접 예정': '#3B82F6',
    '최종합격':  '#10B981',
    '예비합격':  '#F59E0B',
    '불합격':    '#EF4444',
    '대기':      '#64748B',
}

const FIELD_LABELS = {
    birth:         '생년월일',
    phone:         '연락처',
    email:         '이메일',
    company_name:  '지원 기업',
    booked_date:   '면접 날짜',
    booked_time:   '면접 시간',
    introduce:     '자기소개',
    motivation:    '지원 동기',
    experience:    '경력사항',
    education:     '학력',
    address:       '주소',
}

// 포트폴리오/이력서로 판단하는 키 목록
const PORTFOLIO_KEYS = ['portfolio', 'portfolio_url', 'portfolio_link', '포트폴리오']
const RESUME_KEYS    = ['resume', 'resume_url', 'resume_link', '이력서', 'cv', 'cv_url']

function findDocField(fd, keys) {
    for (const k of keys) {
        if (fd[k] && typeof fd[k] === 'string' && fd[k].trim()) return fd[k].trim()
    }
    return null
}

// ─────────────────────────────────────────────────────────────
// PDF / 링크 뷰어
function DocViewer({ url, label }) {
    const [error, setError] = useState(false)

    if (!url) {
        return (
            <div style={{
                height: '100%', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 12,
                color: '#334155',
            }}>
                <span style={{ fontSize: 32 }}>📄</span>
                <span style={{ fontSize: 13 }}>{label} 파일이 없습니다</span>
            </div>
        )
    }

    const isPdf = /\.pdf(\?|$)/i.test(url)
    const isHttpLink = /^https?:\/\//i.test(url)
    // Google Docs 임베드 우회 (X-Frame-Options 대응)
    const embedUrl = isPdf
        ? `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`
        : url

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* 툴바 */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 14px', flexShrink: 0,
                background: 'rgba(255,255,255,0.03)',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
                <span style={{ fontSize: 11, color: '#64748B', flex: 1,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {url}
                </span>
                {isPdf ? (
                    <>
                        <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                                fontSize: 10, fontWeight: 700, color: '#818CF8',
                                background: 'rgba(99,102,241,0.12)', padding: '3px 10px',
                                borderRadius: 6, border: '1px solid rgba(99,102,241,0.25)',
                                textDecoration: 'none', flexShrink: 0,
                            }}
                        >
                            전체보기 ↗
                        </a>
                        <a
                            href={url}
                            download
                            style={{
                                fontSize: 10, fontWeight: 700, color: '#22C55E',
                                background: 'rgba(34,197,94,0.12)', padding: '3px 10px',
                                borderRadius: 6, border: '1px solid rgba(34,197,94,0.25)',
                                textDecoration: 'none', flexShrink: 0,
                            }}
                        >
                            다운로드
                        </a>
                    </>
                ) : (
                    <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                            fontSize: 10, fontWeight: 700, color: '#818CF8',
                            background: 'rgba(99,102,241,0.12)', padding: '3px 10px',
                            borderRadius: 6, border: '1px solid rgba(99,102,241,0.25)',
                            textDecoration: 'none', flexShrink: 0,
                        }}
                    >
                        링크 이동하기 ↗
                    </a>
                )}
            </div>

            {/* 뷰어 */}
            {!error && isHttpLink ? (
                <iframe
                    key={url}
                    src={embedUrl}
                    title={label}
                    onError={() => setError(true)}
                    style={{
                        flex: 1, width: '100%', border: 'none',
                        background: '#fff',
                    }}
                />
            ) : (
                <div style={{
                    flex: 1, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 14,
                    color: '#475569',
                }}>
                    <span style={{ fontSize: 32 }}>🔒</span>
                    <span style={{ fontSize: 13 }}>미리보기를 로드할 수 없습니다</span>
                    <a
                        href={url} target="_blank" rel="noreferrer"
                        style={{
                            fontSize: 12, fontWeight: 700, color: '#818CF8',
                            background: 'rgba(99,102,241,0.12)', padding: '7px 20px',
                            borderRadius: 8, border: '1px solid rgba(99,102,241,0.25)',
                            textDecoration: 'none',
                        }}
                    >
                        {isPdf ? 'PDF 열기 ↗' : '링크 이동하기 ↗'}
                    </a>
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// 하단 – 지원 정보 패널 (탭)
function ApplicantInfoPanel({ applicant, onStageChange, stageSaving }) {
    const [tab, setTab] = useState('info') // 'info' | 'portfolio' | 'resume'

    // applicant 바뀌면 탭 초기화
    useEffect(() => { setTab('info') }, [applicant?.id])

    if (!applicant) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '100%', color: '#334155', fontSize: 13,
            }}>
                좌측에서 면접자를 선택하면 지원 정보가 표시됩니다
            </div>
        )
    }

    const fd            = applicant.form_data || {}
    const portfolioUrl  = findDocField(fd, PORTFOLIO_KEYS)
    const resumeUrl     = findDocField(fd, RESUME_KEYS)

    const TABS = [
        { id: 'info',      label: '📋 기본 정보' },
        { id: 'portfolio', label: `💼 포트폴리오${portfolioUrl ? '' : ''}` },
        { id: 'resume',    label: `📄 이력서${resumeUrl ? '' : ''}` },
    ]

    const simpleFields = [
        { label: '이름',      value: applicant.name },
        { label: '생년월일',  value: fd.birth },
        { label: '연락처',    value: fd.phone || applicant.phone },
        { label: '이메일',    value: fd.email || applicant.email },
        { label: '면접 날짜', value: fd.booked_date },
        { label: '면접 시간', value: fd.booked_time },
        { label: '선발 상태', value: applicant.stage || '대기' },
    ].filter(f => f.value)

    const longFields = Object.entries(fd).filter(([k, v]) =>
        v && typeof v === 'string' && v.length > 20 &&
        !['company_name','booked_date','booked_time',
          ...PORTFOLIO_KEYS, ...RESUME_KEYS].includes(k)
    )
    const stageOptions = ['면접 예정', '예비합격', '최종합격', '불합격']

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* 탭 바 */}
            <div style={{
                display: 'flex', alignItems: 'center',
                padding: '0 16px',
                background: 'rgba(255,255,255,0.02)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                flexShrink: 0, gap: 0,
            }}>
                {/* 면접자 이름 */}
                <div style={{
                    fontSize: 12, fontWeight: 700, color: '#94A3B8',
                    marginRight: 14, paddingRight: 14,
                    borderRight: '1px solid rgba(255,255,255,0.08)',
                    whiteSpace: 'nowrap',
                }}>
                    {applicant.name}
                    {applicant.stage && (
                        <span style={{
                            marginLeft: 7, fontSize: 10, fontWeight: 700,
                            padding: '1px 8px', borderRadius: 999,
                            background: `${STAGE_COLOR[applicant.stage] || '#64748B'}22`,
                            color: STAGE_COLOR[applicant.stage] || '#94A3B8',
                        }}>
                            {applicant.stage}
                        </span>
                    )}
                </div>

                {/* 탭 */}
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{
                        padding: '10px 14px', border: 'none', background: 'none',
                        cursor: 'pointer', fontSize: 11, fontWeight: 700,
                        color: tab === t.id ? '#818CF8' : '#475569',
                        borderBottom: `2px solid ${tab === t.id ? '#6366F1' : 'transparent'}`,
                        transition: 'all .15s', whiteSpace: 'nowrap',
                    }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* 탭 콘텐츠 */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
                {tab === 'info' && (
                    <div style={{ padding: '12px 16px', overflowY: 'auto', height: '100%' }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))',
                            gap: 7, marginBottom: longFields.length ? 10 : 0,
                        }}>
                            {simpleFields.map(f => (
                                <div key={f.label} style={{
                                    padding: '8px 11px', borderRadius: 8,
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                }}>
                                    <div style={{ fontSize: 9, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                                        {f.label}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#E2E8F0', fontWeight: 600 }}>{f.value}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{
                            marginBottom: 10,
                            padding: '10px 12px',
                            borderRadius: 8,
                            background: 'rgba(99,102,241,0.08)',
                            border: '1px solid rgba(99,102,241,0.18)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            flexWrap: 'wrap',
                        }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#A5B4FC' }}>면접 평가</div>
                            <select
                                value={applicant.stage || '면접 예정'}
                                onChange={(e) => onStageChange?.(applicant.id, e.target.value)}
                                disabled={stageSaving}
                                style={{
                                    height: 32,
                                    borderRadius: 8,
                                    border: '1px solid rgba(99,102,241,0.35)',
                                    background: 'rgba(15,23,42,0.7)',
                                    color: '#E2E8F0',
                                    padding: '0 10px',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    outline: 'none',
                                }}>
                                {stageOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            {stageSaving && <span style={{ fontSize: 11, color: '#94A3B8' }}>저장 중...</span>}
                        </div>
                        {longFields.map(([k, v]) => (
                            <div key={k} style={{
                                marginBottom: 7, padding: '9px 11px', borderRadius: 8,
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid rgba(255,255,255,0.05)',
                            }}>
                                <div style={{ fontSize: 9, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                                    {FIELD_LABELS[k] || k}
                                </div>
                                <div style={{ fontSize: 12, color: '#CBD5E1', lineHeight: 1.75 }}>{v}</div>
                            </div>
                        ))}
                    </div>
                )}

                {tab === 'portfolio' && (
                    <DocViewer url={portfolioUrl} label="포트폴리오" />
                )}

                {tab === 'resume' && (
                    <DocViewer url={resumeUrl} label="이력서" />
                )}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// Mock 화상 피드
function MockVideoFeed({ label, isMain = false, roomTime = '' }) {
    const PALETTE = ['#6366F1','#8B5CF6','#3B82F6','#10B981','#F59E0B','#EC4899','#06B6D4']
    const seed  = label ? label.charCodeAt(0) : 0
    const color = PALETTE[seed % PALETTE.length]

    return (
        <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(145deg,#0D1629,#1A2440)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden',
        }}>
            <div style={{
                position: 'absolute', inset: 0,
                background: `radial-gradient(ellipse at 50% 45%,${color}18 0%,transparent 65%)`,
                animation: 'vPulse 4s ease-in-out infinite',
            }} />
            <div style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMain ? 14 : 5 }}>
                <div style={{
                    width: isMain ? 80 : 28, height: isMain ? 80 : 28,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg,${color},${color}88)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: isMain ? 30 : 11, fontWeight: 800, color: '#fff',
                    boxShadow: `0 0 ${isMain ? 30 : 8}px ${color}55`,
                }}>
                    {isMain ? '📹' : '🎥'}
                </div>
                {isMain && (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#94A3B8', marginBottom: 6 }}>{label}</div>
                        <div style={{
                            fontSize: 11, color: '#6366F1',
                            background: 'rgba(99,102,241,0.12)', padding: '3px 12px',
                            borderRadius: 999, border: '1px solid rgba(99,102,241,0.25)',
                        }}>
                            📹 화상 연결 준비 중
                        </div>
                    </div>
                )}
            </div>
            {roomTime && (
                <div style={{
                    position: 'absolute', bottom: isMain ? 16 : 5, left: isMain ? 14 : 5,
                    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
                    borderRadius: 4, padding: isMain ? '4px 10px' : '2px 5px',
                    fontSize: isMain ? 11 : 9, color: '#fff', fontWeight: 700,
                }}>
                    {roomTime}
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// 좌측 면접자 행
function ApplicantRow({ app, isSelected, onClick }) {
    const fd    = app.form_data || {}
    const color = STAGE_COLOR[app.stage] || STAGE_COLOR['대기']
    return (
        <button onClick={onClick} style={{
            width: '100%', textAlign: 'left',
            padding: '10px 12px', borderRadius: 10, marginBottom: 5,
            border: `1.5px solid ${isSelected ? 'rgba(99,102,241,0.65)' : 'rgba(255,255,255,0.05)'}`,
            background: isSelected ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.02)',
            cursor: 'pointer', transition: 'all .15s',
            display: 'flex', alignItems: 'center', gap: 10,
        }}>
            <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg,#6366F1,#8B5CF6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: '#fff',
            }}>
                {(app.name || '?').charAt(0)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: 13, fontWeight: 700, color: '#F1F5F9',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2,
                }}>
                    {app.name || '이름 없음'}
                </div>
                <div style={{ fontSize: 10, color: '#64748B' }}>
                    {fd.booked_date ? `${fd.booked_date} ${fd.booked_time || ''}` : '일정 미제출'}
                </div>
            </div>
            <div style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: color, boxShadow: `0 0 6px ${color}`,
            }} />
        </button>
    )
}

// ─────────────────────────────────────────────────────────────
// 메인 컴포넌트
export default function VideoInterviewRoom({ companyInfo, onClose }) {
    const { programId, companyName, program } = companyInfo
    const { profile, role } = useAuth()

    const [applicants,        setApplicants]        = useState([])
    const [selectedApplicant, setSelectedApplicant] = useState(null)
    const [selectedRoom,      setSelectedRoom]      = useState(null)
    const [loading,           setLoading]           = useState(true)
    const [showMeetRecord,    setShowMeetRecord]    = useState(false)
    const [stageSavingId,     setStageSavingId]     = useState('')
    const [entryNotice,       setEntryNotice]       = useState('')
    const [roomRecordingMap,  setRoomRecordingMap]  = useState({})

    useEffect(() => { loadData() }, [programId, companyName])
    useEffect(() => {
        if (!programId || !companyName) return
        const channel = supabase
            .channel(`company-video-room-${programId}-${companyName}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'interview_schedules' }, (payload) => {
                const p = payload.new || payload.old
                if (p?.program_id === programId && p?.company_name === companyName) {
                    loadData()
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, (payload) => {
                const p = payload.new || payload.old
                if (p?.program_id === programId && p?.application_type === 'interview') {
                    loadData()
                }
            })
            .subscribe()
        return () => {
            supabase.removeChannel(channel)
        }
    }, [programId, companyName])

    function parseRoomCode(link) {
        if (!link) return ''
        try {
            const url = new URL(link)
            return url.searchParams.get('room') || ''
        } catch (_) {
            return ''
        }
    }

    function getRoomStartDate(room) {
        if (!room?.date || !room?.startTime) return null
        const d = new Date(`${room.date}T${String(room.startTime).slice(0, 8)}`)
        if (Number.isNaN(d.getTime())) return null
        return d
    }

    function isRoomEnterable(room) {
        const start = getRoomStartDate(room)
        if (!start) return false
        const openAt = new Date(start.getTime() - (60 * 60 * 1000))
        return Date.now() >= openAt.getTime()
    }

    async function loadData() {
        setLoading(true)
        try {
            const [{ data: apps }, { data: schedules }] = await Promise.all([
                supabase
                    .from('applications')
                    .select('*')
                    .eq('program_id', programId)
                    .eq('application_type', 'interview')
                    .filter('form_data->>company_name', 'eq', companyName)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('interview_schedules')
                    .select('*')
                    .eq('program_id', programId)
                    .eq('company_name', companyName)
                    .neq('status', 'cancelled')
                    .order('scheduled_date', { ascending: true })
                    .order('scheduled_start_time', { ascending: true }),
            ])

            const scheduleByApp = new Map()
            ;(schedules || []).forEach((s) => {
                if (!s.application_id) return
                scheduleByApp.set(s.application_id, s)
            })
            const appList = (apps || []).map((app) => {
                const sc = scheduleByApp.get(app.id) || null
                const fd = app.form_data || {}
                return {
                    ...app,
                    _schedule: sc,
                    form_data: {
                        ...fd,
                        booked_date: sc?.scheduled_date || fd.booked_date || null,
                        booked_time: sc?.scheduled_start_time || fd.booked_time || null,
                    },
                }
            })
            setApplicants(appList)
            setSelectedApplicant((prev) => {
                if (!appList.length) return null
                if (!prev) return appList[0]
                return appList.find((a) => a.id === prev.id) || appList[0]
            })
        } catch (err) {
            console.error('VideoInterviewRoom loadData:', err)
        } finally {
            setLoading(false)
        }
    }

    const rooms = useMemo(() => {
        const map = {}
        applicants.forEach(app => {
            const sc = app._schedule
            if (!sc?.scheduled_date || !sc?.scheduled_start_time) return
            const roomCode = parseRoomCode(sc.meeting_link || '')
            if (!roomCode) return
            const key = `${sc.scheduled_date}_${sc.scheduled_start_time}_${roomCode}`
            if (!map[key]) {
                map[key] = {
                    id: key,
                    date: sc.scheduled_date,
                    timeLabel: `${sc.scheduled_start_time} ~ ${sc.scheduled_end_time || ''}`,
                    startTime: sc.scheduled_start_time,
                    endTime: sc.scheduled_end_time || '',
                    roomCode,
                    meetingLink: sc.meeting_link || '',
                    applicants: [],
                }
            }
            map[key].applicants.push(app)
        })
        return Object.values(map).sort((a, b) => a.id.localeCompare(b.id))
    }, [applicants])

    useEffect(() => {
        if (!rooms.length) {
            setSelectedRoom(null)
            return
        }
        setSelectedRoom((prev) => {
            if (!prev) return rooms[0]
            return rooms.find((r) => r.id === prev.id) || rooms[0]
        })
    }, [rooms])

    useEffect(() => {
        if (!selectedRoom) return
        if (showMeetRecord && !isRoomEnterable(selectedRoom)) {
            setShowMeetRecord(false)
            setEntryNotice('아직 면접 시간 전입니다. 1시간 전부터 입장 가능합니다.')
        }
    }, [selectedRoom, showMeetRecord])

    async function onChangeApplicantStage(appId, nextStage) {
        if (!appId || !nextStage) return
        setStageSavingId(appId)
        try {
            const { error } = await supabase
                .from('applications')
                .update({ stage: nextStage })
                .eq('id', appId)
            if (error) throw error
            setApplicants((prev) => prev.map((a) => a.id === appId ? { ...a, stage: nextStage } : a))
            setSelectedApplicant((prev) => prev && prev.id === appId ? { ...prev, stage: nextStage } : prev)
        } catch (e) {
            console.error('stage update failed:', e)
        } finally {
            setStageSavingId('')
        }
    }

    const centerLabel = selectedRoom
        ? `${selectedRoom.date}  ${selectedRoom.timeLabel}`
        : ''

    const selectedRoomStartAt = selectedRoom?.date && selectedRoom?.startTime
        ? `${selectedRoom.date}T${String(selectedRoom.startTime).slice(0, 8)}`
        : ''

    const isSelectedRoomRecording = selectedRoom ? !!roomRecordingMap[selectedRoom.id] : false

    // ── 렌더 ──────────────────────────────────────────────
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 3000,
            background: '#080C18',
            display: 'flex', flexDirection: 'column',
            fontFamily: "'Inter','Pretendard',-apple-system,sans-serif",
        }}>
            <style>{`
                @keyframes vPulse {
                    0%,100%{opacity:.35;transform:scale(1);}
                    50%{opacity:.72;transform:scale(1.04);}
                }
                @keyframes recBlink {
                    0%,100%{opacity:1;}50%{opacity:.25;}
                }
            `}</style>

            {/* ══ 헤더 ════════════════════════════════════ */}
            <header style={{
                height: 50, flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 14, padding: '0 18px',
                background: 'rgba(8,12,24,0.97)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: '#EF4444', animation: 'recBlink 2s ease infinite',
                    }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>화상 면접실</span>
                </div>
                <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />
                <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>{companyName}</span>
                {program?.title && (
                    <div style={{
                        fontSize: 11, fontWeight: 600, color: '#818CF8',
                        background: 'rgba(99,102,241,0.12)', padding: '2px 10px',
                        borderRadius: 999, border: '1px solid rgba(99,102,241,0.2)',
                    }}>
                        {program.title}
                    </div>
                )}
                <div style={{ flex: 1 }} />
                {(role === 'ADMIN' || role === 'MASTER') && (
                    <div style={{ fontSize: 11, color: isSelectedRoomRecording ? '#22C55E' : '#94A3B8' }}>
                        {isSelectedRoomRecording ? '해당 면접이 기록됨' : '기록 대기 중'}
                    </div>
                )}
                {selectedRoom && (
                    <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: '#10B981', boxShadow: '0 0 6px #10B981', display: 'inline-block',
                        }} />
                        {centerLabel}
                    </div>
                )}
                <button
                    onClick={() => {
                        if (!selectedRoom) return
                        if (!isRoomEnterable(selectedRoom)) {
                            setEntryNotice('아직 면접 시간 전입니다. 1시간 전부터 입장 가능합니다.')
                            setShowMeetRecord(false)
                            return
                        }
                        setEntryNotice('')
                        setShowMeetRecord(true)
                    }}
                    style={{
                        height: 30, padding: '0 12px', borderRadius: 8,
                        border: '1px solid rgba(99,102,241,0.35)',
                        background: 'rgba(99,102,241,0.12)', color: '#A5B4FC',
                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}
                >
                    면접실 입장
                </button>
                <button onClick={onClose} style={{
                    height: 30, padding: '0 14px', borderRadius: 8,
                    border: '1px solid rgba(239,68,68,0.3)',
                    background: 'rgba(239,68,68,0.08)', color: '#FCA5A5',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>
                    ✕ 면접실 나가기
                </button>
            </header>

            {/* ══ 바디 ════════════════════════════════════ */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                {/* ── 좌측: 면접자 목록 ─────────────────── */}
                <aside style={{
                    width: 234, flexShrink: 0,
                    display: 'flex', flexDirection: 'column',
                    background: 'rgba(10,14,26,0.9)',
                    borderRight: '1px solid rgba(255,255,255,0.05)',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        padding: '13px 14px 9px',
                        borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0,
                    }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                            면접자 목록
                        </div>
                        <div style={{ fontSize: 11, color: '#334155' }}>총 {applicants.length}명</div>
                    </div>

                    {selectedApplicant && (
                        <div style={{
                            margin: '10px 10px 0', padding: '11px',
                            background: 'rgba(99,102,241,0.08)',
                            border: '1px solid rgba(99,102,241,0.17)',
                            borderRadius: 10, flexShrink: 0,
                        }}>
                            <div style={{ fontSize: 10, color: '#818CF8', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                선택된 면접자
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#F1F5F9', marginBottom: 4 }}>
                                {selectedApplicant.name}
                            </div>
                            {selectedApplicant.form_data?.phone && (
                                <div style={{ fontSize: 10, color: '#94A3B8' }}>📱 {selectedApplicant.form_data.phone}</div>
                            )}
                            {selectedApplicant.form_data?.booked_date && (
                                <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
                                    📅 {selectedApplicant.form_data.booked_date} {selectedApplicant.form_data.booked_time || ''}
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '30px 0', color: '#334155', fontSize: 12 }}>불러오는 중...</div>
                        ) : applicants.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: '#1E293B', fontSize: 12 }}>면접자가 없습니다</div>
                        ) : applicants.map(app => (
                            <ApplicantRow
                                key={app.id}
                                app={app}
                                isSelected={selectedApplicant?.id === app.id}
                                onClick={() => setSelectedApplicant(app)}
                            />
                        ))}
                    </div>
                </aside>

                {/* ── 중앙: 화상 + 지원정보 ─────────────── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

                    {/* 상단 62% – 화상 영역 */}
                    <div style={{
                        flex: '0 0 62%', position: 'relative',
                        background: '#0A0E1A',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        overflow: 'hidden',
                    }}>
                        {!selectedRoom ? (
                            <div style={{
                                width: '100%', height: '100%',
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center', gap: 10,
                                color: '#94A3B8',
                            }}>
                                <div style={{ fontSize: 16, fontWeight: 700, color: '#E2E8F0' }}>면접방이 선택되지 않았습니다</div>
                                <div style={{ fontSize: 13 }}>오른쪽 면접방 목록에서 선택해주세요.</div>
                            </div>
                        ) : !isRoomEnterable(selectedRoom) ? (
                            <div style={{
                                width: '100%', height: '100%',
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center', gap: 10,
                                color: '#94A3B8',
                            }}>
                                <div style={{ fontSize: 16, fontWeight: 700, color: '#E2E8F0' }}>아직 면접 시간 전입니다.</div>
                                <div style={{ fontSize: 13 }}>1시간 전부터 입장 가능합니다.</div>
                            </div>
                        ) : showMeetRecord ? (
                            <div style={{ position: 'absolute', inset: 0 }}>
                                <MeetRecord
                                    embedded
                                    onClose={() => setShowMeetRecord(false)}
                                    hideHostRecordControls={role === 'COMPANY'}
                                    forcedRoomCode={selectedRoom?.roomCode || ''}
                                    defaultUsername={profile?.name || profile?.email || companyName}
                                    autoJoin={Boolean(selectedRoom?.roomCode)}
                                    scheduledStartAt={selectedRoomStartAt}
                                    onRecordingStateChange={(isRecording) => {
                                        if (!selectedRoom?.id) return
                                        setRoomRecordingMap((prev) => ({ ...prev, [selectedRoom.id]: !!isRecording }))
                                    }}
                                    reportContext={{
                                        programId,
                                        companyName,
                                        applicationId: selectedApplicant?.id || null,
                                        applicantName: selectedApplicant?.name || null,
                                        roomId: selectedRoom?.id || null,
                                        roomDate: selectedRoom?.date || null,
                                        roomTime: selectedRoom?.timeLabel || null,
                                        interviewerName: profile?.name || profile?.email || null,
                                        interviewees: (selectedRoom?.applicants || []).map((a) => ({
                                            applicationId: a.id,
                                            name: a.name,
                                        })),
                                    }}
                                />
                            </div>
                        ) : (
                            <>
                                <MockVideoFeed label={centerLabel} isMain roomTime={selectedRoom.timeLabel} />
                                <div style={{
                                    position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
                                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
                                    borderRadius: 999, padding: '5px 16px',
                                    fontSize: 11, color: '#94A3B8', fontWeight: 600,
                                    border: '1px solid rgba(255,255,255,0.07)',
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    whiteSpace: 'nowrap',
                                }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#64748B', display: 'inline-block' }} />
                                    {selectedRoom.date}  {selectedRoom.timeLabel}  ·  {selectedRoom.applicants.length}명 배정
                                </div>
                                <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)' }}>
                                    <button className="btn btn-primary btn-sm" onClick={() => setShowMeetRecord(true)}>면접실 입장</button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* 하단 38% – 지원 정보 (탭) */}
                    <div style={{ flex: '0 0 38%', background: '#0B0F1E', overflow: 'hidden' }}>
                        <ApplicantInfoPanel
                            applicant={selectedApplicant}
                            onStageChange={onChangeApplicantStage}
                            stageSaving={stageSavingId === selectedApplicant?.id}
                        />
                    </div>
                </div>

                {/* ── 우측: 면접방 목록 ───────────────────── */}
                <aside style={{
                    width: 210, flexShrink: 0,
                    display: 'flex', flexDirection: 'column',
                    background: 'rgba(10,14,26,0.9)',
                    borderLeft: '1px solid rgba(255,255,255,0.05)',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        padding: '13px 14px 9px',
                        borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0,
                    }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                            면접방 목록
                        </div>
                        <div style={{ fontSize: 11, color: '#334155' }}>총 {rooms.length}개 방</div>
                        <div style={{ fontSize: 10, color: '#64748B', marginTop: 4 }}>면접 시간 1시간 전부터 입장가능합니다.</div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '30px 0', color: '#334155', fontSize: 11 }}>불러오는 중...</div>
                        ) : rooms.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '30px 8px', color: '#1E293B', fontSize: 11, lineHeight: 1.6 }}>
                                면접 일정이 없습니다.<br />면접 설정에서 일정을 등록해주세요.
                            </div>
                        ) : rooms.map(room => {
                            const isActive = selectedRoom?.id === room.id
                            return (
                                <div key={room.id} style={{ marginBottom: 16 }}>
                                    {/* 시간 라벨 */}
                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5,
                                    }}>
                                        <div>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: isActive ? '#A5B4FC' : '#94A3B8' }}>
                                                {room.timeLabel || room.startTime}
                                            </div>
                                            <div style={{ fontSize: 9, color: '#475569' }}>
                                                {room.date}  ·  {room.applicants.length}명
                                            </div>
                                        </div>
                                        {isActive && (
                                            <div style={{
                                                width: 7, height: 7, borderRadius: '50%',
                                                background: '#10B981', boxShadow: '0 0 6px #10B981', flexShrink: 0,
                                            }} />
                                        )}
                                    </div>

                                    {/* 비디오 썸네일 */}
                                    <button
                                        onClick={() => {
                                            setSelectedRoom(room)
                                            if (isRoomEnterable(room)) {
                                                setEntryNotice('')
                                                setShowMeetRecord(true)
                                            } else {
                                                setShowMeetRecord(false)
                                                setEntryNotice('아직 면접 시간 전입니다. 1시간 전부터 입장 가능합니다.')
                                            }
                                        }}
                                        style={{
                                            width: '100%', aspectRatio: '16/9',
                                            borderRadius: 9, overflow: 'hidden',
                                            border: `1.5px solid ${isActive ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.06)'}`,
                                            cursor: 'pointer', background: 'transparent',
                                            padding: 0, display: 'block',
                                            boxShadow: isActive ? '0 0 14px rgba(99,102,241,0.25)' : 'none',
                                            transition: 'all .15s',
                                        }}
                                    >
                                        <MockVideoFeed
                                            label={room.timeLabel || room.startTime}
                                            isMain={false}
                                            roomTime={room.startTime}
                                        />
                                    </button>

                                    {/* 면접자 이름 태그 */}
                                    {room.applicants.length > 0 && (
                                        <div style={{ marginTop: 5, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                            {room.applicants.slice(0, 3).map(a => (
                                                <span key={a.id} style={{
                                                    fontSize: 9, color: '#64748B',
                                                    background: 'rgba(255,255,255,0.04)',
                                                    border: '1px solid rgba(255,255,255,0.06)',
                                                    padding: '1px 6px', borderRadius: 4, fontWeight: 600,
                                                }}>
                                                    {a.name}
                                                </span>
                                            ))}
                                            {room.applicants.length > 3 && (
                                                <span style={{ fontSize: 9, color: '#475569' }}>+{room.applicants.length - 3}명</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </aside>
            </div>
            {entryNotice && (
                <div style={{
                    position: 'fixed',
                    left: '50%',
                    bottom: 18,
                    transform: 'translateX(-50%)',
                    background: 'rgba(15,23,42,0.92)',
                    color: '#E2E8F0',
                    border: '1px solid rgba(148,163,184,0.35)',
                    borderRadius: 999,
                    padding: '8px 14px',
                    fontSize: 12,
                    zIndex: 3200,
                }}>
                    {entryNotice}
                </div>
            )}
        </div>
    )
}
