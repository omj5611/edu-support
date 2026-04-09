import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import VideoInterviewRoom from './VideoInterviewRoom'

const STAGE_BADGE = {
    '면접 예정': 'b-blue', '불합격': 'b-red',
    '예비합격': 'b-orange', '최종합격': 'b-green', '대기': 'b-gray',
}

// ── 면접 설정 ────────────────────────────────────────────────
function InterviewSettings({ companyInfo, profile }) {
    const { programId, companyName, teamId } = companyInfo

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

    useEffect(() => { loadSetting(); loadInterviewDate() }, [programId, teamId])

    function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }

    async function loadInterviewDate() {
        try {
            const { data } = await supabase
                .from('interview_date')
                .select('start_date, end_date')
                .eq('program_id', programId)
                .maybeSingle()
            setInterviewDate(data || null)
        } catch (e) { console.warn(e) }
    }

    async function loadSetting() {
        if (!teamId) return
        try {
            const { data } = await supabase
                .from('interview_settings')
                .select('*')
                .eq('program_id', programId)
                .eq('program_teams_id', teamId)
                .maybeSingle()
            if (data) {
                setExistingSetting(data)
                setMode(data.interview_mode || '')
                setFaceAddress(data.face_address || '')
                setInterviewType(data.interview_type || '')
                setGroupMax(data.group_max_count ? String(data.group_max_count) : '')
                setSlotMinutes(data.slot_minutes ? String(data.slot_minutes) : '')
                setDates(data.available_slots || [])
                setSaved(data.status === 'submitted')
            }
        } catch (e) { console.warn(e) }
    }

    // 날짜 추가
    function addDate() {
        setDates(prev => [...prev, { date: '', timeSlots: [] }])
    }

    function removeDate(idx) {
        setDates(prev => prev.filter((_, i) => i !== idx))
    }

    function setDateValue(idx, val) {
        setDates(prev => prev.map((d, i) => i === idx ? { ...d, date: val } : d))
    }

    // 시간 슬롯 생성 (날짜별, 슬롯 단위로)
    function generateTimeSlots(dateIdx, startHour, endHour) {
        const mins = parseInt(slotMinutes)
        if (!mins) return
        const slots = []
        let cur = startHour * 60
        const end = endHour * 60
        while (cur + mins <= end) {
            const startStr = `${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`
            const endStr = `${String(Math.floor((cur + mins) / 60)).padStart(2, '0')}:${String((cur + mins) % 60).padStart(2, '0')}`
            slots.push({ start: startStr, end: endStr })
            cur += mins
        }
        setDates(prev => prev.map((d, i) => i === dateIdx ? { ...d, timeSlots: slots } : d))
    }

    function toggleTimeSlot(dateIdx, slot) {
        setDates(prev => prev.map((d, i) => {
            if (i !== dateIdx) return d
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
        if (!mode) { showToast('면접 방식을 선택해주세요.'); return }
        if (!interviewType) { showToast('면접 형태를 선택해주세요.'); return }
        if (!slotMinutes) { showToast('1회 면접 진행 시간을 선택해주세요.'); return }
        if (dates.length === 0) { showToast('면접 날짜를 최소 1개 이상 선택해주세요.'); return }
        const validDates = dates.filter(d => d.date && d.timeSlots.length > 0)
        if (validDates.length === 0) { showToast('각 날짜에 최소 1개 이상의 시간을 선택해주세요.'); return }

        setSaving(true)
        try {
            const payload = {
                program_id: programId,
                program_teams_id: teamId || null,
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
            <div className="page-header">
                <div>
                    <div className="page-title">면접 설정</div>
                    <div className="page-subtitle">{companyName} · {saved ? '✅ 제출 완료' : '면접 정보 및 일정을 설정해주세요.'}</div>
                </div>
            </div>

            <div className="card" style={{ padding: '28px 32px' }}>
                {/* 담당자 정보 */}
                <Section title="담당자 정보">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
                            <input className="form-input" placeholder="면접 장소 주소 입력" value={faceAddress} onChange={e => setFaceAddress(e.target.value)} />
                        </div>
                    )}
                    {mode === 'online' && (
                        <div style={{ marginTop: 12, padding: '12px 16px', background: 'var(--primary-light)', borderRadius: 8, fontSize: 13, color: 'var(--primary)', lineHeight: 1.6 }}>
                            💡 화상 면접 링크는 면접 일정 확정 후 자동으로 생성됩니다.
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
                    {!slotMinutes && (
                        <div style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 12 }}>먼저 1회 면접 진행 시간을 선택해주세요.</div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {dates.map((d, idx) => (
                            <div key={idx} style={{ padding: '16px 20px', background: 'var(--gray-50)', borderRadius: 10, border: '1px solid var(--gray-200)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-700)' }}>날짜 {idx + 1}</span>
                                        <input type="date" value={d.date} onChange={e => setDateValue(idx, e.target.value)}
                                            min={interviewDate?.start_date || undefined}
                                            max={interviewDate?.end_date || undefined}
                                            style={{ height: 34, padding: '0 10px', border: '1px solid var(--gray-300)', borderRadius: 6, fontSize: 13, background: '#fff' }} />
                                    </div>
                                    <button onClick={() => removeDate(idx)}
                                        style={{ fontSize: 12, color: 'var(--danger-text)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
                                        삭제
                                    </button>
                                </div>

                                {d.date && slotMinutes && (
                                    <>
                                        <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 8 }}>
                                            선택된 시간: {d.timeSlots.length}개
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {availableSlots.map(slot => {
                                                const selected = d.timeSlots.some(s => s.start === slot.start)
                                                return (
                                                    <button key={slot.start} onClick={() => toggleTimeSlot(idx, slot)}
                                                        style={{
                                                            padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                                                            border: `1.5px solid ${selected ? 'var(--primary)' : 'var(--gray-200)'}`,
                                                            background: selected ? 'var(--primary)' : '#fff',
                                                            color: selected ? '#fff' : 'var(--gray-600)',
                                                            cursor: 'pointer', transition: 'all .1s',
                                                        }}>
                                                        {slot.start}~{slot.end}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>

                    {interviewDate && (
                        <div style={{ fontSize: 12, color: 'var(--primary)', background: 'var(--primary-light)', padding: '6px 12px', borderRadius: 6, marginBottom: 8, display: 'inline-block' }}>
                            📅 운영진 설정 면접 가능 기간: {interviewDate.start_date} ~ {interviewDate.end_date}
                        </div>
                    )}
                    {!interviewDate && (
                        <div style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 8 }}>운영진이 면접 기간을 설정하면 표시됩니다.</div>
                    )}
                    {slotMinutes && (
                        <button onClick={addDate} className="btn btn-secondary"
                            style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            날짜 추가
                        </button>
                    )}
                </Section>

                {/* 제출 버튼 */}
                <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}
                    style={{ width: '100%', height: 48, fontSize: 15, fontWeight: 700, marginTop: 8 }}>
                    {saving ? '저장 중...' : '면접 정보 및 일정 최종 제출하기'}
                </button>
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
    const { companyName, programId } = companyInfo
    const [applicants, setApplicants] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterStage, setFilterStage] = useState('전체')

    useEffect(() => { loadApplicants() }, [companyName, programId])

    async function loadApplicants() {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('applications').select('*')
                .eq('program_id', programId).eq('application_type', 'interview')
                .filter('form_data->>company_name', 'eq', companyName)
                .order('created_at', { ascending: false })
            if (error) throw error
            setApplicants(data || [])
        } catch (err) { console.error(err) } finally { setLoading(false) }
    }

    const stageOptions = ['전체', '면접 예정', '예비합격', '최종합격', '불합격']
    const filtered = applicants.filter(app => {
        const fd = app.form_data || {}
        if (search && !app.name?.includes(search) && !fd.phone?.includes(search)) return false
        if (filterStage !== '전체' && app.stage !== filterStage) return false
        return true
    })

    return (
        <div>
            <div className="page-header">
                <div>
                    <div className="page-title">면접자 리스트</div>
                    <div className="page-subtitle">{companyName} · 배정된 면접자를 확인하세요.</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
                {[
                    ['전체', applicants.length, 'var(--gray-900)'],
                    ['일정 제출', applicants.filter(a => a.form_data?.booked_date).length, 'var(--primary)'],
                    ['면접 예정', applicants.filter(a => a.stage === '면접 예정').length, 'var(--warning)'],
                    ['최종 합격', applicants.filter(a => a.stage === '최종합격').length, 'var(--success)'],
                ].map(([label, val, color]) => (
                    <div key={label} style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 10, padding: '14px 18px' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', marginBottom: 4 }}>{label}</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color }}>{val}<span style={{ fontSize: 13, color: 'var(--gray-500)', marginLeft: 2 }}>명</span></div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 12px', border: '1px solid var(--gray-200)', borderRadius: 8, background: '#fff', flex: 1, minWidth: 200 }}>
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

            <div className="card">
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
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: 48, textAlign: 'center' }}>NO</th>
                                    <th>이름</th>
                                    <th style={{ width: 100 }}>생년월일</th>
                                    <th style={{ width: 130 }}>연락처</th>
                                    <th>이메일</th>
                                    <th style={{ width: 150 }}>면접 일정</th>
                                    <th style={{ width: 90, textAlign: 'center' }}>일정 제출</th>
                                    <th style={{ width: 100, textAlign: 'center' }}>선발 상태</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((app, idx) => {
                                    const fd = app.form_data || {}
                                    const hasBooked = !!fd.booked_date
                                    return (
                                        <tr key={app.id}>
                                            <td style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: 12 }}>{idx + 1}</td>
                                            <td style={{ fontWeight: 700 }}>{app.name || '-'}</td>
                                            <td style={{ fontSize: 13, color: 'var(--gray-600)' }}>{fd.birth || '-'}</td>
                                            <td style={{ fontSize: 13, color: 'var(--gray-600)' }}>{fd.phone || app.phone || '-'}</td>
                                            <td style={{ fontSize: 13, color: 'var(--gray-600)' }}>{fd.email || app.email || '-'}</td>
                                            <td style={{ fontSize: 13, color: hasBooked ? 'var(--primary)' : 'var(--gray-400)', fontWeight: hasBooked ? 600 : 400 }}>
                                                {hasBooked ? `${fd.booked_date} ${fd.booked_time || ''}` : '미제출'}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className={`badge ${hasBooked ? 'b-green' : 'b-gray'}`} style={{ fontSize: 11 }}>
                                                    {hasBooked ? '제출' : '미제출'}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className={`badge ${STAGE_BADGE[app.stage] || 'b-gray'}`} style={{ fontSize: 11 }}>
                                                    {app.stage || '대기'}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
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
                                            {n.is_fixed ? <span style={{ color: 'var(--primary)' }}>★</span> : notices.length - idx}
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
    const [showVideoRoom, setShowVideoRoom] = useState(false)

    const menuItems = [
        { id: 'settings', label: '면접 설정', icon: '⚙️' },
        { id: 'interviewees', label: '면접자 리스트', icon: '👥' },
        { id: 'notices', label: '공지사항', icon: '📢' },
    ]


    return (
        <div style={{ minHeight: '100vh', background: 'var(--gray-50)', display: 'flex', flexDirection: 'column' }}>
            {/* 상단 바 */}
            <header className="topbar">
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

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* 사이드바 */}
                <aside className="sidebar">
                    <div className="nav-section">
                        <div className="nav-label">메뉴</div>
                        {menuItems.map(item => (
                            <button key={item.id}
                                className={`nav-item ${menu === item.id ? 'active' : ''}`}
                                style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
                                onClick={() => setMenu(item.id)}>
                                <span className="nav-icon">{item.icon}</span>
                                {item.label}
                            </button>
                        ))}
                    </div>

                    {/* 화상 면접실 진입 버튼 */}
                    <div className="nav-section" style={{ marginTop: 'auto', paddingTop: 16 }}>
                        <button
                            onClick={() => setShowVideoRoom(true)}
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
                            <span style={{ fontSize: 16 }}>📹</span>
                            화상 면접실
                        </button>
                    </div>
                </aside>

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