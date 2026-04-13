import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import VideoInterviewRoom from './VideoInterviewRoom'
import StatusDropdown from '../../components/StatusDropdown'

const STAGE_BADGE = {
    '면접 예정': 'b-blue', '불합격': 'b-red',
    '예비합격': 'b-orange', '최종합격': 'b-green', '대기': 'b-gray', '중도포기': 'b-purple', '평가 전': 'b-blue',
}

const EVAL_OPTIONS = [
    { value: '평가 전', label: '평가 전', badgeClass: 'b-gray' },
    { value: '예비합격', label: '예비합격', badgeClass: 'b-orange' },
    { value: '최종합격', label: '최종합격', badgeClass: 'b-green' },
    { value: '불합격', label: '불합격', badgeClass: 'b-red' },
    { value: '중도포기', label: '중도포기', badgeClass: 'b-purple' },
]

const LineIcon = {
    Settings: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
    ),
    Users: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <path d="M20 8v6" />
            <path d="M23 11h-6" />
        </svg>
    ),
    Bell: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
            <path d="M9 17a3 3 0 0 0 6 0" />
        </svg>
    ),
    Calendar: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    ),
    Info: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
    ),
    Pin: () => (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 17v5" />
            <path d="M9 3h6l-1 7 4 4H6l4-4z" />
        </svg>
    ),
    Megaphone: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11v2a1 1 0 0 0 1 1h2l4 5a1 1 0 0 0 1.7-.7V6.7A1 1 0 0 0 10 6l-4 5H4a1 1 0 0 0-1 1z" />
            <path d="M14 9a5 5 0 0 1 0 6" />
            <path d="M17 7a8 8 0 0 1 0 10" />
        </svg>
    ),
    Video: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="14" height="12" rx="2" />
            <path d="M16 10l6-3v10l-6-3z" />
        </svg>
    ),
}

function downloadFile(url, filename) {
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = filename || 'download'
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
}

// ── 면접 설정 ────────────────────────────────────────────────
function InterviewSettings({ companyInfo, profile }) {
    const { programId, companyName, teamId } = companyInfo
    const today = new Date()

    const [mode, setMode] = useState('')
    const [faceAddress, setFaceAddress] = useState('')
    const [interviewType, setInterviewType] = useState('')
    const [groupMax, setGroupMax] = useState('')
    const [groupMaxCustom, setGroupMaxCustom] = useState('')
    const [slotMinutes, setSlotMinutes] = useState('')
    const [dates, setDates] = useState([])
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [toast, setToast] = useState('')
    const [existingSetting, setExistingSetting] = useState(null)
    const [interviewDate, setInterviewDate] = useState(null) // { start_date, end_date }
    const [activeDate, setActiveDate] = useState('')
    const [viewYear, setViewYear] = useState(today.getFullYear())
    const [viewMonth, setViewMonth] = useState(today.getMonth())
    const [loadedSettingId, setLoadedSettingId] = useState(null)
    const [faceAddressDirty, setFaceAddressDirty] = useState(false)
    const [isScheduleEditMode, setIsScheduleEditMode] = useState(false)
    const hasInitializedSettingRef = useRef(false)
    const faceAddressDirtyRef = useRef(false)

    useEffect(() => { loadSetting(); loadInterviewDate() }, [programId, teamId])
    useEffect(() => {
        setLoadedSettingId(null)
        setFaceAddressDirty(false)
        faceAddressDirtyRef.current = false
        hasInitializedSettingRef.current = false
    }, [programId, teamId])
    useEffect(() => {
        setIsScheduleEditMode(false)
    }, [programId, teamId])

    function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }
    const companySubmitDeadline = companyInfo?.program?.pre_recruit_start_date || null
    const deadlineDate = companySubmitDeadline ? new Date(companySubmitDeadline) : null
    const canEditByDeadline = !deadlineDate || new Date() <= deadlineDate

    async function resolveProgramTeamId() {
        if (!programId) return null

        if (teamId) {
            const { data: byId } = await supabase
                .from('program_teams')
                .select('id')
                .eq('id', teamId)
                .eq('program_id', programId)
                .maybeSingle()
            if (byId?.id) return byId.id
        }

        if (companyName) {
            const { data: byName } = await supabase
                .from('program_teams')
                .select('id')
                .eq('program_id', programId)
                .eq('name', companyName)
                .maybeSingle()
            if (byName?.id) return byName.id
        }

        return null
    }

    async function loadInterviewDate() {
        try {
            const { data } = await supabase
                .from('interview_date')
                .select('start_date, end_date')
                .eq('program_id', programId)
                .maybeSingle()
            setInterviewDate(data || null)
            if (data?.start_date) {
                const d = new Date(`${data.start_date}T00:00:00`)
                if (!Number.isNaN(d.getTime())) {
                    setViewYear(d.getFullYear())
                    setViewMonth(d.getMonth())
                }
            }
        } catch (e) { console.warn(e) }
    }

    async function loadSetting() {
        try {
            const validTeamId = await resolveProgramTeamId()
            let query = supabase
                .from('interview_settings')
                .select('*')
                .eq('program_id', programId)

            if (validTeamId) {
                query = query.eq('program_teams_id', validTeamId)
            } else if (profile?.email) {
                query = query.is('program_teams_id', null).eq('manager_email', profile.email)
            } else {
                query = query.is('program_teams_id', null)
            }

            const { data } = await query.maybeSingle()
            if (data) {
                const normalizedDates = (data.available_slots || [])
                    .filter(d => d?.date)
                    .map(d => ({
                        date: d.date,
                        timeSlots: (d.timeSlots || []).sort((a, b) => a.start.localeCompare(b.start)),
                    }))
                    .sort((a, b) => a.date.localeCompare(b.date))
                setExistingSetting(data)
                if (!hasInitializedSettingRef.current || loadedSettingId !== data.id) {
                    setMode(data.interview_mode || '')
                    if (!faceAddressDirtyRef.current) {
                        setFaceAddress(data.face_address || '')
                    }
                    setInterviewType(data.interview_type || '')
                    setGroupMax(data.group_max_count ? String(data.group_max_count) : '')
                    setSlotMinutes(data.slot_minutes ? String(data.slot_minutes) : '')
                    setDates(normalizedDates)
                    setActiveDate(normalizedDates[0]?.date || '')
                    setLoadedSettingId(data.id)
                    hasInitializedSettingRef.current = true
                }
                setSaved(data.status === 'submitted')
                if (data.status !== 'submitted') setIsScheduleEditMode(true)
            }
        } catch (e) { console.warn(e) }
    }

    function moveMonth(delta) {
        let y = viewYear
        let m = viewMonth + delta
        if (m < 0) { m = 11; y -= 1 }
        if (m > 11) { m = 0; y += 1 }
        setViewYear(y)
        setViewMonth(m)
    }

    function toDateKey(y, m, d) {
        return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }

    function isDateSelectable(dateKey) {
        if (!interviewDate?.start_date || !interviewDate?.end_date) return false
        return dateKey >= interviewDate.start_date && dateKey <= interviewDate.end_date
    }

    function ensureDateSelected(dateKey) {
        setDates(prev => {
            const exists = prev.some(d => d.date === dateKey)
            if (exists) return prev
            return [...prev, { date: dateKey, timeSlots: [] }].sort((a, b) => a.date.localeCompare(b.date))
        })
        setActiveDate(dateKey)
    }

    function removeDate(dateKey) {
        setDates(prev => {
            const nextDates = prev.filter(d => d.date !== dateKey)
            setActiveDate(prevActive => (prevActive === dateKey ? (nextDates[0]?.date || '') : prevActive))
            return nextDates
        })
    }

    function toggleTimeSlotByDate(dateKey, slot) {
        setDates(prev => prev.map((d) => {
            if (d.date !== dateKey) return d
            const exists = d.timeSlots.find(s => s.start === slot.start)
            if (exists) return { ...d, timeSlots: d.timeSlots.filter(s => s.start !== slot.start) }
            return { ...d, timeSlots: [...d.timeSlots, slot].sort((a, b) => a.start.localeCompare(b.start)) }
        }))
    }

    // 선택 가능한 시간 슬롯 목록 생성 (09:00 ~ 18:00)
    function getAvailableSlots() {
        const mins = parseInt(slotMinutes)
        if (!mins) return []
        const slots = []
        let cur = 9 * 60
        while (cur + mins <= 19 * 60) {
            const startStr = `${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`
            const endStr = `${String(Math.floor((cur + mins) / 60)).padStart(2, '0')}:${String((cur + mins) % 60).padStart(2, '0')}`
            slots.push({ start: startStr, end: endStr })
            cur += mins
        }
        return slots
    }

    async function handleSubmit() {
        if (!canEditByDeadline) { showToast('기업 제출 마감일이 지나 수정할 수 없습니다.'); return }
        if (!mode) { showToast('면접 방식을 선택해주세요.'); return }
        if (!interviewType) { showToast('면접 형태를 선택해주세요.'); return }
        if (!slotMinutes) { showToast('1회 면접 진행 시간을 선택해주세요.'); return }
        if (dates.length === 0) { showToast('면접 날짜를 최소 1개 이상 선택해주세요.'); return }
        const validDates = dates
            .filter(d => d.date && d.timeSlots.length > 0)
            .map(d => ({ ...d, timeSlots: [...d.timeSlots].sort((a, b) => a.start.localeCompare(b.start)) }))
            .sort((a, b) => a.date.localeCompare(b.date))
        if (validDates.length === 0) { showToast('각 날짜에 최소 1개 이상의 시간을 선택해주세요.'); return }

        setSaving(true)
        try {
            const validTeamId = await resolveProgramTeamId()
            const payload = {
                program_id: programId,
                program_teams_id: validTeamId || existingSetting?.program_teams_id || null,
                brand: companyInfo?.program?.brand || profile?.brand || null,
                interview_mode: mode,
                face_address: faceAddress,
                interview_type: interviewType,
                group_max_count: interviewType === 'group' ? parseInt(groupMax === '직접입력' ? groupMaxCustom : groupMax) : null,
                slot_minutes: parseInt(slotMinutes),
                available_slots: validDates,
                status: 'submitted',
                submitted_at: new Date().toISOString(),
                manager_email: profile?.email || '',
                manager_phone: profile?.phone || '',
            }

            if (existingSetting?.id) {
                const { error } = await supabase.from('interview_settings').update(payload).eq('id', existingSetting.id)
                if (error) throw error
            } else {
                const { error } = await supabase.from('interview_settings').insert(payload)
                if (error) throw error
            }
            setSaved(true)
            showToast('면접 정보 및 일정이 제출되었습니다.')
            loadSetting()
        } catch (err) {
            showToast('저장 실패: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const availableSlots = getAvailableSlots()
    const activeDateSlots = dates.find(d => d.date === activeDate)?.timeSlots || []
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const firstDay = new Date(viewYear, viewMonth, 1).getDay()
    const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
    while (cells.length % 7 !== 0) cells.push(null)
    const selectedDateSet = new Set(dates.map(d => d.date))
    const weekDays = ['일', '월', '화', '수', '목', '금', '토']
    const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
    const groupOptions = ['2명', '3명', '4명', '5명', '직접입력']
    const minuteOptions = ['10', '15', '20', '25', '30']

    const Section = ({ title, children }) => (
        <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 14, paddingBottom: 8, borderBottom: '2px solid var(--primary-light)' }}>{title}</div>
            {children}
        </div>
    )

    const RadioGroup = ({ options, value, onChange, labelFn }) => (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {options.map(opt => (
                <button key={opt} type="button" onClick={() => onChange(opt)}
                    style={{
                        padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                        border: `2px solid ${value === opt ? 'var(--primary)' : 'var(--gray-200)'}`,
                        background: value === opt ? 'var(--primary-light)' : '#fff',
                        color: value === opt ? 'var(--primary)' : 'var(--gray-600)',
                        cursor: 'pointer', transition: 'all .15s',
                    }}>
                    {labelFn ? labelFn(opt) : opt}
                </button>
            ))}
        </div>
    )

    return (
        <div style={{ maxWidth: 700 }}>
            <div className="page-header company-interviewee-header">
                <div>
                    <div className="page-title">면접 설정</div>
                    <div className="page-subtitle">{companyName} · {saved ? '제출 완료' : '면접 정보 및 일정을 설정해주세요.'}</div>
                </div>
            </div>

            <div className="card" style={{ padding: '28px 32px' }}>
                {/* 담당자 정보 */}
                <Section title="담당자 정보">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">담당자 이메일</label>
                            <input className="form-input" value={profile?.email || '-'} readOnly
                                style={{ background: 'var(--gray-50)', color: 'var(--gray-500)', cursor: 'not-allowed' }} />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">담당자 전화번호</label>
                            <input className="form-input" value={profile?.phone || '-'} readOnly
                                style={{ background: 'var(--gray-50)', color: 'var(--gray-500)', cursor: 'not-allowed' }} />
                        </div>
                    </div>
                </Section>

                {/* 면접 방식 */}
                <Section title="면접 방식">
                    <RadioGroup
                        options={['face', 'online']}
                        value={mode}
                        onChange={setMode}
                        labelFn={v => v === 'face' ? '대면' : '비대면(화상)'}
                    />
                    {mode === 'face' && (
                        <div className="form-group" style={{ marginTop: 14, marginBottom: 0 }}>
                            <label className="form-label">면접 장소 <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>(선택)</span></label>
                            <input className="form-input" placeholder="면접 장소 주소 입력" value={faceAddress} onChange={e => { setFaceAddress(e.target.value); setFaceAddressDirty(true); faceAddressDirtyRef.current = true }} />
                        </div>
                    )}
                    {mode === 'online' && (
                        <div style={{ marginTop: 12, padding: '12px 16px', background: 'var(--primary-light)', borderRadius: 8, fontSize: 13, color: 'var(--primary)', lineHeight: 1.6, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <LineIcon.Info />
                            화상 면접 링크는 면접 일정 확정 후 자동으로 생성됩니다.
                        </div>
                    )}
                </Section>

                {/* 면접 형태 */}
                <Section title="면접 형태">
                    <RadioGroup
                        options={['1on1', 'group']}
                        value={interviewType}
                        onChange={setInterviewType}
                        labelFn={v => v === '1on1' ? '1:1 면접' : '그룹 면접'}
                    />
                    {interviewType === 'group' && (
                        <div style={{ marginTop: 14 }}>
                            <label className="form-label">최대 인원</label>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                                {groupOptions.map(opt => (
                                    <button key={opt} type="button" onClick={() => { setGroupMax(opt); if (opt !== '직접입력') setGroupMaxCustom('') }}
                                        style={{
                                            padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                                            border: `2px solid ${groupMax === opt ? 'var(--primary)' : 'var(--gray-200)'}`,
                                            background: groupMax === opt ? 'var(--primary-light)' : '#fff',
                                            color: groupMax === opt ? 'var(--primary)' : 'var(--gray-600)',
                                            cursor: 'pointer',
                                        }}>
                                        {opt}
                                    </button>
                                ))}
                            </div>
                            {groupMax === '직접입력' && (
                                <input className="form-input" type="number" min="2" max="20" placeholder="인원 수 입력"
                                    value={groupMaxCustom} onChange={e => setGroupMaxCustom(e.target.value)}
                                    style={{ marginTop: 10, width: 160 }} />
                            )}
                        </div>
                    )}
                </Section>

                {/* 1회 면접 진행 시간 */}
                <Section title="1회 면접 진행 시간">
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {minuteOptions.map(opt => (
                            <button key={opt} type="button" onClick={() => { setSlotMinutes(opt); setDates(prev => prev.map(d => ({ ...d, timeSlots: [] }))) }}
                                style={{
                                    padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                                    border: `2px solid ${slotMinutes === opt ? 'var(--primary)' : 'var(--gray-200)'}`,
                                    background: slotMinutes === opt ? 'var(--primary-light)' : '#fff',
                                    color: slotMinutes === opt ? 'var(--primary)' : 'var(--gray-600)',
                                    cursor: 'pointer',
                                }}>
                                {opt}분
                            </button>
                        ))}
                    </div>
                </Section>

                {/* 날짜 및 시간 선택 */}
                <Section title="면접 가능 날짜 및 시간">
                    {interviewDate ? (
                        <div style={{ fontSize: 12, color: 'var(--primary)', background: 'var(--primary-light)', padding: '6px 12px', borderRadius: 6, marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <LineIcon.Calendar /> 운영진 설정 면접 가능 기간: {interviewDate.start_date} ~ {interviewDate.end_date}
                        </div>
                    ) : (
                        <div style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 12 }}>운영진이 면접 기간을 설정하면 캘린더에서 선택할 수 있습니다.</div>
                    )}
                    {saved && (
                        <div style={{ fontSize: 12, color: canEditByDeadline ? 'var(--primary)' : 'var(--danger-text)', background: canEditByDeadline ? 'var(--primary-light)' : 'var(--danger-bg)', border: `1px solid ${canEditByDeadline ? 'var(--primary-border)' : '#FCA5A5'}`, padding: '6px 12px', borderRadius: 6, marginBottom: 12, display: 'inline-block' }}>
                            {canEditByDeadline
                                ? `기업 제출 마감 전(${deadlineDate ? deadlineDate.toLocaleString('ko-KR') : '-'})이라 수정 후 재제출 가능합니다.`
                                : `기업 제출 마감(${deadlineDate ? deadlineDate.toLocaleString('ko-KR') : '-'})이 지나 수정할 수 없습니다.`}
                        </div>
                    )}

                    {saved && !isScheduleEditMode ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ border: '1px solid var(--gray-200)', borderRadius: 10, padding: 12, background: '#fff' }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>제출한 일정</div>
                                {dates.length === 0 ? (
                                    <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>제출된 일정이 없습니다.</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {dates
                                            .slice()
                                            .sort((a, b) => a.date.localeCompare(b.date))
                                            .map((d) => (
                                                <div key={`submitted-${d.date}`} style={{ border: '1px solid var(--gray-200)', borderRadius: 8, padding: '8px 10px', background: 'var(--gray-50)' }}>
                                                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 6 }}>
                                                        {d.date} ({d.timeSlots.length}개)
                                                    </div>
                                                    {d.timeSlots.length === 0 ? (
                                                        <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>선택된 시간이 없습니다.</div>
                                                    ) : (
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                            {d.timeSlots.map((ts) => (
                                                                <span key={`${d.date}-${ts.start}`} className="badge b-blue" style={{ fontSize: 11 }}>
                                                                    {ts.start} ~ {ts.end}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                            {canEditByDeadline && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button className="btn btn-secondary" onClick={() => setIsScheduleEditMode(true)}>수정하기</button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                    {!slotMinutes && (
                        <div style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 12 }}>먼저 1회 면접 진행 시간을 선택해주세요.</div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
                        <div style={{ border: '1px solid var(--gray-200)', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--gray-100)', background: 'var(--gray-50)' }}>
                                <button type="button" onClick={() => moveMonth(-1)}
                                    style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--gray-200)', background: '#fff', cursor: 'pointer' }}>
                                    ‹
                                </button>
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-900)' }}>{viewYear}년 {monthNames[viewMonth]}</span>
                                <button type="button" onClick={() => moveMonth(1)}
                                    style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--gray-200)', background: '#fff', cursor: 'pointer' }}>
                                    ›
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '8px 10px 2px' }}>
                                {weekDays.map((w, idx) => (
                                    <div key={w} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: idx === 0 ? 'var(--danger-text)' : idx === 6 ? 'var(--primary)' : 'var(--gray-500)', padding: '2px 0' }}>
                                        {w}
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, padding: '0 10px 10px' }}>
                                {cells.map((d, idx) => {
                                    if (!d) return <div key={`empty-${idx}`} />
                                    const dateKey = toDateKey(viewYear, viewMonth, d)
                                    const disabled = !isDateSelectable(dateKey) || !slotMinutes
                                    const isSelected = selectedDateSet.has(dateKey)
                                    const isActive = activeDate === dateKey
                                    return (
                                        <button
                                            key={dateKey}
                                            type="button"
                                            disabled={disabled}
                                            onClick={() => ensureDateSelected(dateKey)}
                                            style={{
                                                height: 34,
                                                borderRadius: 8,
                                                border: `1.5px solid ${isActive ? 'var(--primary)' : isSelected ? 'var(--primary-border)' : 'transparent'}`,
                                                background: isActive ? 'var(--primary)' : isSelected ? 'var(--primary-light)' : '#fff',
                                                color: isActive ? '#fff' : disabled ? 'var(--gray-300)' : 'var(--gray-700)',
                                                fontSize: 12,
                                                fontWeight: isActive || isSelected ? 700 : 500,
                                                cursor: disabled ? 'not-allowed' : 'pointer',
                                            }}>
                                            {d}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div style={{ border: '1px solid var(--gray-200)', borderRadius: 10, padding: 12, background: 'var(--gray-50)' }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>선택된 날짜</div>
                            {dates.length === 0 ? (
                                <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>캘린더에서 날짜를 눌러 추가하세요.</div>
                            ) : (
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {dates.map(d => {
                                        const isActive = d.date === activeDate
                                        return (
                                            <div key={d.date}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    padding: '6px 10px',
                                                    borderRadius: 999,
                                                    border: `1px solid ${isActive ? 'var(--primary)' : 'var(--gray-200)'}`,
                                                    background: isActive ? 'var(--primary-light)' : '#fff',
                                                }}>
                                                <button type="button" onClick={() => setActiveDate(d.date)}
                                                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, fontSize: 12, fontWeight: 700, color: isActive ? 'var(--primary)' : 'var(--gray-700)' }}>
                                                    {d.date}
                                                </button>
                                                <button type="button" onClick={() => removeDate(d.date)}
                                                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 13, padding: 0 }}>
                                                    ×
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        <div style={{ border: '1px solid var(--gray-200)', borderRadius: 10, padding: 12, background: '#fff' }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>날짜별 선택 시간 요약</div>
                            {dates.length === 0 ? (
                                <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>아직 선택된 날짜가 없습니다.</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {dates
                                        .slice()
                                        .sort((a, b) => a.date.localeCompare(b.date))
                                        .map((d) => (
                                            <div key={`summary-${d.date}`} style={{ border: '1px solid var(--gray-200)', borderRadius: 8, padding: '8px 10px', background: 'var(--gray-50)' }}>
                                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 6 }}>
                                                    {d.date} ({d.timeSlots.length}개)
                                                </div>
                                                {d.timeSlots.length === 0 ? (
                                                    <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>선택된 시간이 없습니다.</div>
                                                ) : (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                        {d.timeSlots.map((ts) => (
                                                            <span key={`${d.date}-${ts.start}`} className="badge b-blue" style={{ fontSize: 11 }}>
                                                                {ts.start} ~ {ts.end}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>

                        <div style={{ border: '1px solid var(--gray-200)', borderRadius: 10, padding: 14, background: '#fff' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-900)' }}>
                                    {activeDate ? `${activeDate} 시간 선택` : '시간 선택'}
                                </div>
                                {activeDate && (
                                    <span style={{ fontSize: 12, color: 'var(--primary)', background: 'var(--primary-light)', borderRadius: 999, padding: '3px 10px', fontWeight: 700 }}>
                                        선택 {activeDateSlots.length}개
                                    </span>
                                )}
                            </div>
                            {!activeDate ? (
                                <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>먼저 캘린더에서 날짜를 선택해주세요.</div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
                                    {availableSlots.map(slot => {
                                        const selected = activeDateSlots.some(s => s.start === slot.start)
                                        return (
                                            <button key={`${activeDate}-${slot.start}`} type="button" onClick={() => toggleTimeSlotByDate(activeDate, slot)}
                                                style={{
                                                    padding: '7px 10px',
                                                    borderRadius: 8,
                                                    border: `1.5px solid ${selected ? 'var(--primary)' : 'var(--gray-200)'}`,
                                                    background: selected ? 'var(--primary)' : '#fff',
                                                    color: selected ? '#fff' : 'var(--gray-700)',
                                                    fontSize: 12,
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                }}>
                                                {slot.start}~{slot.end}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                        </>
                    )}
                </Section>

                {/* 제출 버튼 */}
                {(!saved || isScheduleEditMode) && (
                    <button className="btn btn-primary" onClick={async () => { await handleSubmit(); setIsScheduleEditMode(false) }} disabled={saving || !canEditByDeadline}
                        style={{ width: '100%', height: 48, fontSize: 15, fontWeight: 700, marginTop: 8 }}>
                        {saving ? '저장 중...' : !canEditByDeadline ? '기업 제출 마감으로 수정 불가' : saved ? '수정 내용 다시 제출하기' : '면접 정보 및 일정 최종 제출하기'}
                    </button>
                )}
            </div>

            {toast && (
                <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--gray-900)', color: '#fff', padding: '10px 20px', borderRadius: 999, fontSize: 14, zIndex: 9999 }}>
                    {toast}
                </div>
            )}
        </div>
    )
}

// ── 면접자 리스트 ─────────────────────────────────────────────
function IntervieweeList({ companyInfo }) {
    const { companyName, programId, teamId } = companyInfo
    const [applicants, setApplicants] = useState([])
    const [reportByAppId, setReportByAppId] = useState({})
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterStage, setFilterStage] = useState('전체')
    const [selectedApp, setSelectedApp] = useState(null)
    const [selectedTab, setSelectedTab] = useState('info')
    const [stageSaving, setStageSaving] = useState(false)
    const [settingId, setSettingId] = useState(null)
    const [evaluationStatus, setEvaluationStatus] = useState('평가 전')
    const [showEvaluateModal, setShowEvaluateModal] = useState(false)
    const [showEvaluateConfirmModal, setShowEvaluateConfirmModal] = useState(false)
    const [evaluateSaving, setEvaluateSaving] = useState(false)

    useEffect(() => { loadApplicants() }, [companyName, programId, teamId])
    useEffect(() => {
        if (!programId || !companyName) return
        const channel = supabase
            .channel(`company-interviewees-${programId}-${companyName}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'interview_schedules' }, (payload) => {
                const p = payload.new || payload.old
                if (p?.program_id === programId && p?.company_name === companyName) {
                    loadApplicants()
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, (payload) => {
                const p = payload.new || payload.old
                if (p?.program_id === programId && p?.application_type === 'interview') {
                    loadApplicants()
                }
            })
            .subscribe()
        return () => {
            supabase.removeChannel(channel)
        }
    }, [programId, companyName, teamId])

    function normalizeEvaluationStatus(value) {
        if (value === '평가완료') return '평가완료'
        return '평가 전'
    }

    async function loadInterviewSetting() {
        if (!programId) return
        try {
            let resolvedTeamId = teamId || null
            if (!resolvedTeamId && companyName) {
                const { data: teamByName } = await supabase
                    .from('program_teams')
                    .select('id')
                    .eq('program_id', programId)
                    .eq('name', companyName)
                    .maybeSingle()
                resolvedTeamId = teamByName?.id || null
            }

            let query = supabase
                .from('interview_settings')
                .select('id, evaluation_status')
                .eq('program_id', programId)

            if (resolvedTeamId) {
                query = query.eq('program_teams_id', resolvedTeamId)
            }

            const { data } = await query.maybeSingle()
            setSettingId(data?.id || null)
            setEvaluationStatus(normalizeEvaluationStatus(data?.evaluation_status))
        } catch (err) {
            console.error('loadInterviewSetting failed:', err)
        }
    }

    async function loadApplicants() {
        setLoading(true)
        try {
            await loadInterviewSetting()
            const [{ data, error }, { data: schedules, error: schErr }] = await Promise.all([
                supabase
                    .from('applications').select('*')
                    .eq('program_id', programId).eq('application_type', 'interview')
                    .filter('form_data->>company_name', 'eq', companyName)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('interview_schedules')
                    .select('*')
                    .eq('program_id', programId)
                    .eq('company_name', companyName)
                    .neq('status', 'cancelled'),
            ])
            if (error) throw error
            if (schErr) throw schErr
            const scheduleByApp = new Map()
            ;(schedules || []).forEach((s) => {
                if (s.application_id) scheduleByApp.set(s.application_id, s)
            })
            const merged = (data || []).map((app) => ({
                ...app,
                _schedule: scheduleByApp.get(app.id) || null,
            }))
            setApplicants(merged)

            const appIds = merged.map(m => m.id)
            if (!appIds.length) {
                setReportByAppId({})
                return
            }
            const { data: reports } = await supabase
                .from('interview_ai_reports')
                .select('*')
                .in('application_id', appIds)
                .order('created_at', { ascending: false })
            const map = {}
            ;(reports || []).forEach((r) => {
                if (!r.application_id || map[r.application_id]) return
                map[r.application_id] = r
            })
            setReportByAppId(map)
        } catch (err) { console.error(err) } finally { setLoading(false) }
    }

    const stageOptions = ['전체', '평가 전', '예비합격', '최종합격', '불합격', '중도포기']
    const toEvaluationStatus = (stage) => (
        ['예비합격', '최종합격', '불합격', '중도포기'].includes(stage) ? stage : '평가 전'
    )
    const toStageValue = (evaluationStatusValue) => (
        evaluationStatusValue === '평가 전' ? '평가 전' : evaluationStatusValue
    )
    const filtered = applicants.filter(app => {
        const fd = app.form_data || {}
        if (search && !app.name?.includes(search) && !fd.phone?.includes(search)) return false
        if (filterStage !== '전체' && toEvaluationStatus(app.stage) !== filterStage) return false
        return true
    })

    async function onChangeStage(appId, nextEvaluationStatus) {
        if (!appId || !nextEvaluationStatus) return
        if (evaluationStatus === '평가완료') return
        const nextStage = toStageValue(nextEvaluationStatus)
        setStageSaving(true)
        try {
            const { error } = await supabase.from('applications').update({ stage: nextStage }).eq('id', appId)
            if (error) throw error
            setApplicants((prev) => prev.map((a) => (a.id === appId ? { ...a, stage: nextStage } : a)))
            setSelectedApp((prev) => prev && prev.id === appId ? { ...prev, stage: nextStage } : prev)
        } catch (e) {
            console.error('stage update failed:', e)
        } finally {
            setStageSaving(false)
        }
    }

    const resultLists = {
        reject: applicants.filter((a) => a.stage === '불합격'),
        reserve: applicants.filter((a) => a.stage === '예비합격'),
        pass: applicants.filter((a) => a.stage === '최종합격'),
        drop: applicants.filter((a) => a.stage === '중도포기'),
    }

    const allEvaluated = applicants.length > 0 && applicants.every((a) => ['불합격', '예비합격', '최종합격', '중도포기'].includes(a.stage))
    const canSubmitEvaluation = evaluationStatus !== '평가완료' && !!settingId && allEvaluated

    async function submitEvaluationComplete() {
        if (!settingId) {
            alert('면접 설정 정보가 없어 평가 완료를 저장할 수 없습니다.')
            return
        }
        setEvaluateSaving(true)
        try {
            const { error } = await supabase
                .from('interview_settings')
                .update({ evaluation_status: '평가완료' })
                .eq('id', settingId)
            if (error) throw error
            setEvaluationStatus('평가완료')
            setShowEvaluateConfirmModal(false)
            setShowEvaluateModal(false)
        } catch (e) {
            alert(`평가 완료 저장 실패: ${e.message}`)
        } finally {
            setEvaluateSaving(false)
        }
    }

    return (
        <div>
            <div className="page-header company-interviewee-header">
                <div>
                    <div className="page-title">면접자 리스트</div>
                    <div className="page-subtitle">{companyName} · 배정된 면접자를 확인하세요.</div>
                </div>
                <div className="company-interviewee-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className={`badge ${evaluationStatus === '평가완료' ? 'b-green' : 'b-gray'}`} style={{ fontSize: 12 }}>
                        {evaluationStatus}
                    </span>
                    <button
                        className="btn btn-primary"
                        disabled={!canSubmitEvaluation}
                        onClick={() => setShowEvaluateModal(true)}>
                        {evaluationStatus === '평가완료' ? '평가완료 처리됨' : '평가 완료하기'}
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
                {[
                    ['전체', applicants.length, 'var(--gray-900)'],
                    ['일정 제출', applicants.filter(a => !!a._schedule?.scheduled_date).length, 'var(--primary)'],
                    ['평가 전', applicants.filter(a => toEvaluationStatus(a.stage) === '평가 전').length, 'var(--warning)'],
                    ['최종 합격', applicants.filter(a => a.stage === '최종합격').length, 'var(--success)'],
                ].map(([label, val, color]) => (
                    <div key={label} style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 10, padding: '14px 18px' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', marginBottom: 4 }}>{label}</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color }}>{val}<span style={{ fontSize: 13, color: 'var(--gray-500)', marginLeft: 2 }}>명</span></div>
                    </div>
                ))}
            </div>

            <div className="company-interviewee-filters" style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="company-interviewee-search" style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 12px', border: '1px solid var(--gray-200)', borderRadius: 8, background: '#fff', flex: 1, minWidth: 200 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round">
                        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                    </svg>
                    <input style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 14 }}
                        placeholder="이름, 연락처 검색" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="seg">
                    {stageOptions.map(opt => (
                        <button key={opt} className={`seg-btn ${filterStage === opt ? 'on' : ''}`} onClick={() => setFilterStage(opt)}>{opt}</button>
                    ))}
                </div>
            </div>

            <div className="card" style={{ overflow: 'visible' }}>
                {loading ? (
                    <div className="empty"><div className="empty-title">불러오는 중...</div></div>
                ) : applicants.length === 0 ? (
                    <div className="empty">
                        <div className="empty-title">배정된 면접자가 없습니다.</div>
                        <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 4 }}>운영진이 면접자를 배정하면 여기에 표시됩니다.</div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="empty"><div className="empty-title">검색 결과가 없습니다.</div></div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                        {filtered.map((app) => {
                            const fd = app.form_data || {}
                            const schedule = app._schedule
                            const hasBooked = !!schedule?.scheduled_date
                            const interviewStatus = schedule?.status === 'completed' ? '면접 완료' : '면접 예정'
                            const evaluationStatusText = toEvaluationStatus(app.stage)
                            const report = reportByAppId[app.id]
                            const hasReport = !!report
                            return (
                                <div
                                    key={app.id}
                                    className="card"
                                    style={{ cursor: 'pointer', overflow: 'visible' }}
                                    onClick={() => { setSelectedApp(app); setSelectedTab('info') }}>
                                    <div style={{ padding: '14px 14px 0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>
                                                    {(app.name || '?')[0]}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--gray-900)' }}>{app.name || '-'}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{fd.birth || '-'}</div>
                                                </div>
                                            </div>
                                            <span className={`badge ${interviewStatus === '면접 완료' ? 'b-green' : 'b-blue'}`} style={{ fontSize: 11 }}>{interviewStatus}</span>
                                        </div>
                                        <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '8px 10px', marginBottom: 10 }}>
                                            <div style={{ fontSize: 12, color: 'var(--gray-600)', marginBottom: 3 }}>연락처: {fd.phone || app.phone || '-'}</div>
                                            <div style={{ fontSize: 12, color: 'var(--gray-600)' }}>이메일: {fd.email || app.email || '-'}</div>
                                            <div style={{ fontSize: 12, color: 'var(--gray-600)', marginTop: 3 }}>학력: {fd.ed_level || '-'}</div>
                                            <div style={{ fontSize: 12, color: 'var(--gray-600)' }}>학과: {fd.dept || '-'}</div>
                                        </div>
                                    </div>
                                    <div style={{ background: 'var(--gray-50)', borderTop: '1px solid var(--gray-200)', padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: hasBooked ? 'var(--primary)' : 'var(--gray-400)' }}>
                                            {hasBooked ? `면접일 ${schedule.scheduled_date} ${schedule.scheduled_start_time || ''}` : '일정 미제출'}
                                        </div>
                                        <span className={`badge ${hasBooked ? 'b-green' : 'b-gray'}`} style={{ fontSize: 10 }}>{hasBooked ? '제출완료' : '미제출'}</span>
                                    </div>
                                    <div style={{ padding: '10px 14px 14px' }} onClick={(e) => e.stopPropagation()}>
                                        <div style={{ marginBottom: 8 }}>
                                            <div style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 700, marginBottom: 4 }}>평가상태</div>
                                            <StatusDropdown
                                                value={evaluationStatusText}
                                                options={EVAL_OPTIONS}
                                                onChange={(v) => onChangeStage(app.id, v)}
                                                disabled={stageSaving || evaluationStatus === '평가완료'}
                                                fullWidth
                                                size="sm"
                                            />
                                        </div>
                                        <button
                                            disabled={!hasReport}
                                            onClick={() => { setSelectedApp(app); setSelectedTab('ai') }}
                                            className="btn btn-secondary btn-sm"
                                            style={{
                                                width: '100%',
                                                opacity: hasReport ? 1 : 0.45,
                                                cursor: hasReport ? 'pointer' : 'not-allowed',
                                                borderColor: hasReport ? 'var(--primary-border)' : undefined,
                                                color: hasReport ? 'var(--primary)' : undefined,
                                                background: hasReport ? 'var(--primary-light)' : undefined,
                                            }}>
                                            {hasReport ? 'AI 면접 리포트' : 'AI 면접 리포트 (미생성)'}
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {selectedApp && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.45)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 24, overflowY: 'auto' }}
                    onClick={(e) => { if (e.target === e.currentTarget) setSelectedApp(null) }}>
                    <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 860, boxShadow: '0 20px 40px rgba(0,0,0,.15)', marginBottom: 24 }}>
                        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: 20, fontWeight: 800 }}>{selectedApp.name || '-'}</div>
                                <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>{companyName}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <StatusDropdown
                                    value={toEvaluationStatus(selectedApp.stage)}
                                    options={EVAL_OPTIONS}
                                    onChange={(v) => onChangeStage(selectedApp.id, v)}
                                    disabled={stageSaving || evaluationStatus === '평가완료'}
                                />
                                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedApp(null)}>닫기</button>
                            </div>
                        </div>
                        <div style={{ padding: '0 24px', borderBottom: '1px solid var(--gray-200)', display: 'flex', gap: 0 }}>
                            {[
                                { id: 'info', label: '지원 정보' },
                                { id: 'ai', label: 'AI 면접 리포트' },
                            ].map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setSelectedTab(t.id)}
                                    style={{
                                        padding: '14px 18px',
                                        border: 'none',
                                        background: 'none',
                                        cursor: 'pointer',
                                        fontSize: 14,
                                        fontWeight: 700,
                                        color: selectedTab === t.id ? 'var(--primary)' : 'var(--gray-500)',
                                        borderBottom: selectedTab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
                                        marginBottom: -1,
                                    }}>
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {selectedTab === 'info' && (
                            <div style={{ padding: '20px 24px', display: 'grid', gap: 20 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>기본 정보</div>
                                        {[
                                            ['이름', selectedApp.name],
                                            ['생년월일', selectedApp.form_data?.birth],
                                            ['연락처', selectedApp.form_data?.phone || selectedApp.phone],
                                            ['이메일', selectedApp.form_data?.email || selectedApp.email],
                                            ['면접 일정', selectedApp._schedule?.scheduled_date ? `${selectedApp._schedule?.scheduled_date} ${selectedApp._schedule?.scheduled_start_time || ''}` : '미제출'],
                                        ].map(([k, v]) => (
                                            <div key={k} style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--gray-100)' }}>
                                                <div style={{ width: 120, fontSize: 12, color: 'var(--gray-500)', fontWeight: 700 }}>{k}</div>
                                                <div style={{ fontSize: 14, color: 'var(--gray-800)' }}>{v || '-'}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>학력 정보</div>
                                        {[
                                            ['학력', selectedApp.form_data?.ed_level],
                                            ['학교', selectedApp.form_data?.school],
                                            ['학부', selectedApp.form_data?.faculty],
                                            ['학과', selectedApp.form_data?.dept],
                                        ].map(([k, v]) => (
                                            <div key={k} style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--gray-100)' }}>
                                                <div style={{ width: 120, fontSize: 12, color: 'var(--gray-500)', fontWeight: 700 }}>{k}</div>
                                                <div style={{ fontSize: 14, color: 'var(--gray-800)' }}>{v || '-'}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>지원서 내용</div>
                                    {[
                                        ['지원 동기', selectedApp.form_data?.motivation],
                                        ['향후 비전 및 포부', selectedApp.form_data?.vision],
                                        ['관련 경력(경험)', selectedApp.form_data?.experience],
                                    ].map(([k, v]) => (
                                        <div key={k} style={{ marginBottom: 10 }}>
                                            <div style={{ fontSize: 12, color: 'var(--gray-500)', fontWeight: 700, marginBottom: 4 }}>{k}</div>
                                            <div style={{ fontSize: 14, color: 'var(--gray-800)', lineHeight: 1.6, background: 'var(--gray-50)', borderRadius: 8, border: '1px solid var(--gray-200)', padding: '10px 12px', minHeight: 42 }}>
                                                {v || '-'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                                    {[
                                        ['포트폴리오', selectedApp.form_data?.portfolio_link || selectedApp.form_data?.portfolio_url || selectedApp.form_data?.portfolio, 'portfolio.pdf'],
                                        ['이력서', selectedApp.form_data?.resume_link || selectedApp.form_data?.resume_url || selectedApp.form_data?.resume, 'resume.pdf'],
                                    ].map(([label, url, fname]) => {
                                        const isPdf = !!url && String(url).toLowerCase().includes('.pdf')
                                        return (
                                            <div key={label} style={{ background: 'var(--gray-50)', borderRadius: 8, border: '1px solid var(--gray-200)', padding: 12 }}>
                                                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{label}</div>
                                                {!url ? (
                                                    <div style={{ fontSize: 13, color: 'var(--gray-400)' }}>미등록</div>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                        {isPdf && (
                                                            <iframe
                                                                src={`${url}#toolbar=1&navpanes=0`}
                                                                title={label}
                                                                style={{ width: '100%', height: 220, border: '1px solid var(--gray-200)', borderRadius: 8 }}
                                                            />
                                                        )}
                                                        <div style={{ display: 'flex', gap: 6 }}>
                                                            {isPdf ? (
                                                                <a className="btn btn-secondary btn-sm" href={url} target="_blank" rel="noreferrer" style={{ flex: 1, textDecoration: 'none' }}>전체보기</a>
                                                            ) : (
                                                                <a className="btn btn-secondary btn-sm" href={url} target="_blank" rel="noreferrer" style={{ flex: 1, textDecoration: 'none' }}>링크 이동하기</a>
                                                            )}
                                                            <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => downloadFile(url, fname)}>다운로드</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {selectedTab === 'ai' && (
                            <div style={{ padding: '20px 24px' }}>
                                {(() => {
                                    const report = reportByAppId[selectedApp.id]
                                    const fmt = (ts) => {
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
                                    const reportJson = report?.report_json || null
                                    const summaryRaw = String(report?.summary_raw || '').trim()
                                    const analysisEmptyText = '분석된 내용이 없습니다.'
                                    const hasText = (v) => typeof v === 'string' && v.trim().length > 0
                                    const safeNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : null)

                                    if (!report) {
                                        return (
                                            <div style={{ padding: '40px 10px', textAlign: 'center', color: 'var(--gray-500)' }}>
                                                AI 면접 리포트가 아직 생성되지 않았습니다.
                                            </div>
                                        )
                                    }

                                    return (
                                        <div style={{ display: 'grid', gap: 12 }}>
                                            <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                                                생성일: {fmt(report.created_at)}
                                            </div>

                                            <div style={{ border: '1px solid var(--gray-200)', borderRadius: 10, padding: 14, background: '#fff' }}>
                                                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 8 }}>AI 요약</div>
                                                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'var(--gray-800)' }}>
                                                    {summaryRaw || <span style={{ color: 'var(--gray-400)' }}>{analysisEmptyText}</span>}
                                                </div>
                                            </div>

                                            <div style={{ border: '1px solid var(--gray-200)', borderRadius: 10, padding: 14, background: '#fff' }}>
                                                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 10 }}>면접 리포트</div>
                                                {!reportJson ? (
                                                    <div style={{ color: 'var(--gray-400)' }}>{analysisEmptyText}</div>
                                                ) : (
                                                    <div style={{ display: 'grid', gap: 12 }}>
                                                        {(() => {
                                                            const verdict = (hasText(reportJson?.verdict) ? reportJson.verdict.trim() : (hasText(report?.verdict) ? String(report.verdict).trim() : null))
                                                            const totalScore = safeNum(reportJson?.totalScore ?? report?.total_score)
                                                            const riskLevel = (hasText(reportJson?.riskDetail?.level) ? reportJson.riskDetail.level.trim() : (hasText(report?.risk_level) ? String(report.risk_level).trim() : null))
                                                            return (
                                                                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                                                    <span className="badge b-gray" style={{ fontSize: 11 }}>
                                                                        판정: {verdict || <span style={{ color: 'var(--gray-400)' }}>{analysisEmptyText}</span>}
                                                                    </span>
                                                                    <span className="badge b-gray" style={{ fontSize: 11 }}>
                                                                        총점: {totalScore === null ? <span style={{ color: 'var(--gray-400)' }}>{analysisEmptyText}</span> : totalScore}
                                                                    </span>
                                                                    <span className="badge b-gray" style={{ fontSize: 11 }}>
                                                                        위험도: {riskLevel || <span style={{ color: 'var(--gray-400)' }}>{analysisEmptyText}</span>}
                                                                    </span>
                                                                </div>
                                                            )
                                                        })()}

                                                        <div>
                                                            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gray-800)', marginBottom: 6 }}>항목별 점수</div>
                                                            {Array.isArray(reportJson.scores) && reportJson.scores.length > 0 ? (
                                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                                                                    {reportJson.scores.map((s, idx) => (
                                                                        <div key={`${s.criterion || 'c'}-${idx}`} style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 10, padding: 10 }}>
                                                                            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gray-800)' }}>{s.criterion || '-'}</div>
                                                                            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--gray-600)' }}>
                                                                                점수: {s.score === null || s.score === undefined ? <span style={{ color: 'var(--gray-400)' }}>{analysisEmptyText}</span> : s.score} / 5
                                                                            </div>
                                                                            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--gray-600)', lineHeight: 1.6 }}>
                                                                                {s.evidence ? `근거: ${s.evidence}` : <span style={{ color: 'var(--gray-400)' }}>{analysisEmptyText}</span>}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div style={{ color: 'var(--gray-400)' }}>{analysisEmptyText}</div>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gray-800)', marginBottom: 6 }}>종합 평가</div>
                                                            <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 10, padding: 12, lineHeight: 1.7, color: 'var(--gray-800)' }}>
                                                                {reportJson.summary ? reportJson.summary : <span style={{ color: 'var(--gray-400)' }}>{analysisEmptyText}</span>}
                                                            </div>
                                                        </div>

                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                                                            <div>
                                                                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gray-800)', marginBottom: 6 }}>강점</div>
                                                                <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 10, padding: 12, color: 'var(--gray-800)', lineHeight: 1.7 }}>
                                                                    {Array.isArray(reportJson.strengths) && reportJson.strengths.length > 0
                                                                        ? reportJson.strengths.map((t, i) => <div key={`st-${i}`}>- {t}</div>)
                                                                        : <span style={{ color: 'var(--gray-400)' }}>{analysisEmptyText}</span>}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gray-800)', marginBottom: 6 }}>보완</div>
                                                                <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 10, padding: 12, color: 'var(--gray-800)', lineHeight: 1.7 }}>
                                                                    {Array.isArray(reportJson.improvements) && reportJson.improvements.length > 0
                                                                        ? reportJson.improvements.map((t, i) => <div key={`im-${i}`}>- {t}</div>)
                                                                        : <span style={{ color: 'var(--gray-400)' }}>{analysisEmptyText}</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })()}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showEvaluateModal && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.45)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
                    onClick={(e) => { if (e.target === e.currentTarget) setShowEvaluateModal(false) }}>
                    <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 760, boxShadow: '0 20px 40px rgba(0,0,0,.18)' }}>
                        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--gray-200)' }}>
                            <div style={{ fontSize: 18, fontWeight: 800 }}>평가 결과 확인</div>
                            <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>모든 면접자의 평가 상태를 선택한 뒤 제출할 수 있습니다.</div>
                        </div>
                        <div style={{ padding: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                            {[
                                ['불합격 면접자', resultLists.reject],
                                ['예비합격 면접자', resultLists.reserve],
                                ['최종합격 면접자', resultLists.pass],
                                ['중도포기 면접자', resultLists.drop],
                            ].map(([title, list]) => (
                                <div key={title} style={{ border: '1px solid var(--gray-200)', borderRadius: 10, background: 'var(--gray-50)', padding: 10, minHeight: 180 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{title} ({list.length}명)</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {list.length === 0 ? (
                                            <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>없음</div>
                                        ) : list.map((a) => (
                                            <div key={a.id} style={{ fontSize: 12, color: 'var(--gray-700)' }}>
                                                {a.name || '-'}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ padding: '14px 18px', borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button className="btn btn-ghost" onClick={() => setShowEvaluateModal(false)}>닫기</button>
                            <button className="btn btn-primary" onClick={() => setShowEvaluateConfirmModal(true)}>제출하기</button>
                        </div>
                    </div>
                </div>
            )}

            {showEvaluateConfirmModal && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.45)', backdropFilter: 'blur(4px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
                    onClick={(e) => { if (e.target === e.currentTarget) setShowEvaluateConfirmModal(false) }}>
                    <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 420, boxShadow: '0 20px 40px rgba(0,0,0,.18)' }}>
                        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--gray-200)' }}>
                            <div style={{ fontSize: 16, fontWeight: 800 }}>최종 확인</div>
                            <div style={{ fontSize: 13, color: 'var(--gray-600)', marginTop: 6 }}>
                                면접자의 선발 상태를 운영진에게 제출하시겠어요?
                                <br />
                                제출 후에는 수정할 수 없으며, 변경이 필요하면 운영진에게 문의해주세요.
                            </div>
                        </div>
                        <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button className="btn btn-ghost" onClick={() => setShowEvaluateConfirmModal(false)}>닫기</button>
                            <button className="btn btn-primary" disabled={evaluateSaving} onClick={submitEvaluationComplete}>
                                {evaluateSaving ? '처리 중...' : '확인'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ── 공지사항 ──────────────────────────────────────────────────
function NoticeList({ brand }) {
    const [notices, setNotices] = useState([])
    const [loading, setLoading] = useState(true)
    const [selected, setSelected] = useState(null)

    useEffect(() => { loadNotices() }, [brand])

    async function loadNotices() {
        setLoading(true)
        try {
            const { data } = await supabase
                .from('notices').select('*')
                .in('type', ['interview-all', 'interview-company'])
                .eq('is_archived', false)
                .eq('is_hidden', false)
                .eq('brand', brand)
                .order('is_fixed', { ascending: false })
                .order('created_at', { ascending: false })
            setNotices(data || [])
        } catch (err) { console.error(err) } finally { setLoading(false) }
    }

    if (selected) {
        return (
            <div>
                <div className="page-header">
                    <div><div className="page-title">공지사항</div></div>
                    <button className="btn btn-secondary" onClick={() => setSelected(null)}>목록으로</button>
                </div>
                <div className="card">
                    <div className="card-body">
                        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>{selected.title}</h2>
                        <div style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 24 }}>
                            {new Date(selected.created_at).toLocaleDateString('ko-KR')} · {selected.author_name || '운영진'}
                        </div>
                        <div style={{ fontSize: 15, lineHeight: 1.8 }} dangerouslySetInnerHTML={{ __html: selected.content }} />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <div className="page-title">공지사항</div>
                    <div className="page-subtitle">운영진이 공지한 내용을 확인하세요.</div>
                </div>
            </div>
            <div className="card">
                {loading ? (
                    <div className="empty"><div className="empty-title">불러오는 중...</div></div>
                ) : notices.length === 0 ? (
                    <div className="empty"><div className="empty-title">공지사항이 없습니다.</div></div>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: 56, textAlign: 'center' }}>NO</th>
                                    <th>제목</th>
                                    <th style={{ width: 100 }}>작성자</th>
                                    <th style={{ width: 110 }}>등록일</th>
                                </tr>
                            </thead>
                            <tbody>
                                {notices.map((n, idx) => (
                                    <tr key={n.id} className="clickable" onClick={() => setSelected(n)}
                                        style={{ background: n.is_fixed ? 'var(--primary-light)' : '' }}>
                                        <td style={{ textAlign: 'center', color: 'var(--gray-500)', fontWeight: 600 }}>
                                            {n.is_fixed ? <span style={{ color: 'var(--primary)', display: 'inline-flex' }}><LineIcon.Pin /></span> : notices.length - idx}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                                                {n.is_fixed && <span className="badge b-blue" style={{ fontSize: 11 }}>필독</span>}
                                                {n.title}
                                            </div>
                                        </td>
                                        <td style={{ fontSize: 13, color: 'var(--gray-600)' }}>{n.author_name || '운영진'}</td>
                                        <td style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                                            {new Date(n.created_at).toLocaleDateString('ko-KR')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

// ── 메인 CompanyDashboard ────────────────────────────────────
export default function CompanyDashboard({ companyInfo, onChangeCourse }) {
    const { signOut, profile, brand } = useAuth()
    const navigate = useNavigate()
    const [menu, setMenu] = useState('settings') // 'settings' | 'interviewees' | 'notices'
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [showVideoRoom, setShowVideoRoom] = useState(() => {
        try {
            return sessionStorage.getItem('company_video_room_open') === '1'
        } catch (_) {
            return false
        }
    })
    const [showAlertPanel, setShowAlertPanel] = useState(false)
    const [alerts, setAlerts] = useState([])
    const [alertUnread, setAlertUnread] = useState(0)
    const [alertPanelPos, setAlertPanelPos] = useState({ top: 0, left: 0 })
    const alertBtnRef = useRef(null)
    const alertPanelRef = useRef(null)

    const alertReadEntryKey = `company_alert_read_entries_${companyInfo.programId}_${companyInfo.companyName}`

    useEffect(() => {
        loadAlerts()
        const channel = supabase
            .channel(`company-alert-${companyInfo.programId}-${companyInfo.companyName}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'interview_schedules' }, (payload) => {
                const p = payload.new || payload.old
                if (p?.program_id === companyInfo.programId && p?.company_name === companyInfo.companyName) {
                    loadAlerts()
                }
            })
            .subscribe()
        return () => {
            supabase.removeChannel(channel)
        }
    }, [companyInfo.companyName, companyInfo.programId])

    useEffect(() => {
        if (!showAlertPanel) return
        const updatePanelPosition = () => {
            const el = alertBtnRef.current
            if (!el) return
            const rect = el.getBoundingClientRect()
            const panelWidth = Math.min(360, Math.max(260, window.innerWidth - 24))
            const gap = 20
            const maxLeft = Math.max(12, window.innerWidth - panelWidth - 12)
            setAlertPanelPos({
                top: Math.max(72, rect.top),
                left: Math.min(rect.right + gap, maxLeft),
            })
        }
        updatePanelPosition()
        window.addEventListener('resize', updatePanelPosition)
        window.addEventListener('scroll', updatePanelPosition, true)
        return () => {
            window.removeEventListener('resize', updatePanelPosition)
            window.removeEventListener('scroll', updatePanelPosition, true)
        }
    }, [showAlertPanel])

    useEffect(() => {
        if (!showAlertPanel) return
        const onDown = (e) => {
            const btn = alertBtnRef.current
            const panel = alertPanelRef.current
            const t = e.target
            if (panel && panel.contains(t)) return
            if (btn && btn.contains(t)) return
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
            const raw = localStorage.getItem(alertReadEntryKey)
            const arr = raw ? JSON.parse(raw) : []
            return new Set(Array.isArray(arr) ? arr : [])
        } catch (_) {
            return new Set()
        }
    }

    function saveReadEntries(entries) {
        localStorage.setItem(alertReadEntryKey, JSON.stringify([...entries]))
    }

    function markAlertRead(alert) {
        if (!alert || alert.read) return
        const entries = getReadEntries()
        entries.add(alert.entryKey)
        saveReadEntries(entries)
        setAlerts((prev) => prev.map((a) => a.entryKey === alert.entryKey ? { ...a, read: true } : a))
        setAlertUnread((prev) => Math.max(0, prev - 1))
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
            const [{ data: schedules }, { data: apps }] = await Promise.all([
                supabase
                    .from('interview_schedules')
                    .select('id, created_at, updated_at, scheduled_date, scheduled_start_time, scheduled_end_time, application_id, status')
                    .eq('program_id', companyInfo.programId)
                    .eq('company_name', companyInfo.companyName)
                    .neq('status', 'cancelled')
                    .order('updated_at', { ascending: false })
                    .limit(80),
                supabase
                    .from('applications')
                    .select('id, name')
                    .eq('program_id', companyInfo.programId)
                    .eq('application_type', 'interview')
                    .filter('form_data->>company_name', 'eq', companyInfo.companyName),
            ])

            const appNameById = new Map((apps || []).map((a) => [a.id, a.name || '면접자']))
            const readEntries = getReadEntries()
            const mapped = (schedules || []).map((s) => {
                const isChanged = (s.updated_at || '') !== (s.created_at || '')
                const applicant = appNameById.get(s.application_id) || '면접자'
                const ts = s.updated_at || s.created_at
                const entryKey = `${s.id}:${ts}`
                return {
                    id: s.id,
                    ts,
                    entryKey,
                    title: isChanged ? '면접 일정 변경' : '면접 일정 등록',
                    body: `${applicant} · ${s.scheduled_date} ${s.scheduled_start_time || ''}${s.scheduled_end_time ? ` ~ ${s.scheduled_end_time}` : ''}`,
                    read: readEntries.has(entryKey),
                }
            })
            setAlerts(mapped)
            const unread = mapped.filter((a) => !a.read).length
            setAlertUnread(unread)
        } catch (err) {
            console.error('company schedule alerts load failed:', err)
        }
    }

    const menuItems = [
        { id: 'settings', label: '면접 설정', icon: LineIcon.Settings },
        { id: 'interviewees', label: '면접자 리스트', icon: LineIcon.Users },
        { id: 'notices', label: '공지사항', icon: LineIcon.Megaphone },
    ]

    useEffect(() => {
        try {
            sessionStorage.setItem('company_video_room_open', showVideoRoom ? '1' : '0')
        } catch (_) {
            // noop
        }
    }, [showVideoRoom])

    useEffect(() => {
        setMobileMenuOpen(false)
    }, [menu])

    useEffect(() => {
        if (!mobileMenuOpen) return
        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = prevOverflow
        }
    }, [mobileMenuOpen])


    return (
        <div style={{ minHeight: '100vh', background: 'var(--gray-50)', display: 'flex', flexDirection: 'column' }}>
            {/* 상단 바 */}
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
                    <span>면접 지원 시스템</span>
                </div>
                <div className="topbar-divider" />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-700)' }}>{companyInfo.companyName}</span>
                    <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>{companyInfo.program?.title || ''}</span>
                </div>
                <div className="topbar-spacer" />
                <button className="btn btn-secondary btn-sm" onClick={onChangeCourse}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                        <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                    </svg>
                    교육과정 변경
                </button>
                <div className="topbar-divider" />
                <span className="role-badge company">기업</span>
                <div className="topbar-divider" />
                <button className="btn-ghost-sm" onClick={async () => {
                    const companyBrand = brand || companyInfo.program?.brand
                    await signOut()
                    if (companyBrand) {
                        window.location.href = `/login?brand=${companyBrand}`
                    } else {
                        navigate('/login')
                    }
                }}>로그아웃</button>
            </header>

            <div className="layout-body dashboard-shell">
                {/* 사이드바 */}
                <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`} style={{ borderRight: '1px solid var(--gray-200)', background: '#FBFCFE' }}>
                    <div className="nav-section" style={{ position: 'relative' }}>
                        <div className="nav-label">메뉴</div>
                        {menuItems.map(item => (
                            <button key={item.id}
                                className={`nav-item ${menu === item.id ? 'active' : ''}`}
                                style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}
                                onClick={() => {
                                    setMenu(item.id)
                                    setMobileMenuOpen(false)
                                }}>
                                <span className="nav-icon"><item.icon /></span>
                                <span>{item.label}</span>
                            </button>
                        ))}
                        <button
                            ref={alertBtnRef}
                            className={`nav-item ${showAlertPanel ? 'active' : ''}`}
                            style={{ width: '100%', textAlign: 'left', position: 'relative', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}
                            onClick={() => {
                                setMobileMenuOpen(false)
                                setShowAlertPanel((v) => !v)
                            }}>
                            <span className="nav-icon"><LineIcon.Bell /></span>
                            <span>알림</span>
                            {alertUnread > 0 && (
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
                                    {alertUnread}
                                </span>
                            )}
                        </button>

                        {showAlertPanel && (
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
                        )}
                    </div>

                    {/* 화상 면접실 진입 버튼 */}
                    <div className="nav-section" style={{ marginTop: 'auto', paddingTop: 16 }}>
                        <button
                            onClick={() => {
                                setMobileMenuOpen(false)
                                setShowVideoRoom(true)
                            }}
                            style={{
                                width: '100%', padding: '10px 12px', borderRadius: 10,
                                border: '1.5px solid rgba(99,102,241,0.4)',
                                background: 'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.08))',
                                color: '#6366F1', cursor: 'pointer', textAlign: 'left',
                                display: 'flex', alignItems: 'center', gap: 8,
                                fontSize: 13, fontWeight: 700, transition: 'all .15s',
                            }}
                            onMouseOver={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.2)' }}
                            onMouseOut={e => { e.currentTarget.style.background = 'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.08))' }}
                        >
                            <span style={{ display: 'inline-flex', alignItems: 'center' }}><LineIcon.Video /></span>
                            화상 면접실
                        </button>
                    </div>
                </aside>
                {mobileMenuOpen && (
                    <button
                        type="button"
                        className="mobile-sidebar-overlay"
                        aria-label="메뉴 닫기"
                        onClick={() => setMobileMenuOpen(false)}
                    />
                )}

                {/* 메인 콘텐츠 */}
                <main className="main-content">
                    {menu === 'settings' && <InterviewSettings companyInfo={companyInfo} profile={profile} />}
                    {menu === 'interviewees' && <IntervieweeList companyInfo={companyInfo} />}
                    {menu === 'notices' && <NoticeList brand={brand || companyInfo.program?.brand} />}
                </main>
            </div>

            {/* 화상 면접실 (full-screen overlay) */}
            {showVideoRoom && (
                <VideoInterviewRoom
                    companyInfo={companyInfo}
                    onClose={() => setShowVideoRoom(false)}
                />
            )}
        </div>
    )
}
