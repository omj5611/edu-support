import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const BRAND_LINKS = {
    SNIPERFACTORY: 'https://edu-support-seven.vercel.app/login?brand=SNIPERFACTORY',
    INSIDEOUT: 'https://edu-support-seven.vercel.app/login?brand=INSIDEOUT',
}

const STAGE_BADGE = {
    '면접 예정': 'b-blue', '불합격': 'b-red',
    '예비합격': 'b-orange', '최종합격': 'b-green', '대기': 'b-gray',
}

export default function CompanyUserPage() {
    const { progId } = useParams()
    const [tab, setTab] = useState('companies') // 'companies' | 'interviewees'

    // 기업 관리 탭
    const [teams, setTeams] = useState([])
    const [companyUsers, setCompanyUsers] = useState([])  // role=COMPANY 유저
    const [interviewSettings, setInterviewSettings] = useState([])
    const [programBrand, setProgramBrand] = useState('')
    const [search, setSearch] = useState('')
    const [filterJoined, setFilterJoined] = useState('전체')

    // 면접자 관리 탭
    const [applications, setApplications] = useState([])   // 전체 interview 지원서
    const [allUsers, setAllUsers] = useState([])            // role=USER 유저 (면접자 매칭용)
    const [appSearch, setAppSearch] = useState('')
    const [filterStage, setFilterStage] = useState('전체')
    const [filterCompany, setFilterCompany] = useState('전체')

    const [loading, setLoading] = useState(true)
    const [toast, setToast] = useState('')

    useEffect(() => { if (progId) loadData() }, [progId])
    useEffect(() => {
        if (!progId) return
        const channel = supabase
            .channel(`admin-company-user-${progId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'interview_schedules' }, (payload) => {
                const p = payload.new || payload.old
                if (p?.program_id === progId) loadData()
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, (payload) => {
                const p = payload.new || payload.old
                if (p?.program_id === progId && p?.application_type === 'interview') loadData()
            })
            .subscribe()
        return () => {
            supabase.removeChannel(channel)
        }
    }, [progId])

    function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }

    async function loadData() {
        setLoading(true)
        try {
            // 브랜드
            const { data: prog } = await supabase
                .from('programs').select('brand').eq('id', progId).maybeSingle()
            setProgramBrand(prog?.brand || '')

            // program_teams
            const { data: teamData } = await supabase
                .from('program_teams').select('*')
                .eq('program_id', progId).order('sort_order', { ascending: true })

            // 기업 담당자 유저
            const { data: cmpUsers } = await supabase
                .from('users').select('id, name, email, phone, created_at, metadata, brand')
                .eq('role', 'COMPANY')

            const { data: settingsData } = await supabase
                .from('interview_settings')
                .select('id, program_teams_id, evaluation_status, company_name')
                .eq('program_id', progId)

            // interview 지원서 전체 + 실제 예약 일정
            const [{ data: appData }, { data: schedulesData }] = await Promise.all([
                supabase
                    .from('applications').select('*')
                    .eq('program_id', progId)
                    .eq('application_type', 'interview')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('interview_schedules')
                    .select('application_id, scheduled_date, scheduled_start_time, status')
                    .eq('program_id', progId)
                    .neq('status', 'cancelled'),
            ])

            const scheduleByApp = new Map()
            ;(schedulesData || []).forEach((s) => {
                if (s.application_id) scheduleByApp.set(s.application_id, s)
            })
            const mergedApps = (appData || []).map((app) => {
                const sc = scheduleByApp.get(app.id)
                const fd = app.form_data || {}
                if (!sc) return app
                return {
                    ...app,
                    form_data: {
                        ...fd,
                        booked_date: sc.scheduled_date || fd.booked_date || '',
                        booked_time: sc.scheduled_start_time || fd.booked_time || '',
                    },
                }
            })

            // 면접자 매칭용 유저 (role=USER)
            const { data: userList } = await supabase
                .from('users').select('id, name, email, phone, metadata')
                .eq('role', 'USER')

            setTeams(teamData || [])
            setCompanyUsers(cmpUsers || [])
            setInterviewSettings(settingsData || [])
            setApplications(mergedApps)
            setAllUsers(userList || [])
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    // ── 기업 관리 탭 ────────────────────────────────────────
    function getUserForTeam(team) {
        return companyUsers.find(u =>
            u.metadata?.program_team_id === team.id ||
            u.metadata?.company_name === team.name
        ) || null
    }

    function getEvalStatusForTeam(team) {
        const byTeamId = interviewSettings.find(s => s.program_teams_id === team.id)
        if (byTeamId?.evaluation_status === '평가완료') return '평가완료'
        if (byTeamId) return '평가 전'
        const byName = interviewSettings.find(s => (s.company_name || '').trim().toLowerCase() === (team.name || '').trim().toLowerCase())
        if (byName?.evaluation_status === '평가완료') return '평가완료'
        if (byName) return '평가 전'
        return '평가 전'
    }

    const filteredTeams = teams.filter(team => {
        if (search && !team.name.toLowerCase().includes(search.toLowerCase())) return false
        const user = getUserForTeam(team)
        if (filterJoined === '가입완료' && !user) return false
        if (filterJoined === '미가입' && user) return false
        return true
    })

    const joinedCount = teams.filter(t => !!getUserForTeam(t)).length

    // ── 면접자 관리 탭 ───────────────────────────────────────
    // 같은 면접자가 여러 기업에 면접볼 수 있으므로 이름+전화번호로 그룹핑
    const intervieweeMap = {}
    for (const app of applications) {
        const fd = app.form_data || {}
        const key = `${app.name}__${fd.phone || app.phone || ''}__${fd.birth || ''}`
        if (!intervieweeMap[key]) {
            intervieweeMap[key] = {
                name: app.name,
                phone: fd.phone || app.phone || '',
                email: fd.email || app.email || '',
                birth: fd.birth || '',
                companies: [],  // [{ company_name, stage, booked_date }]
            }
        }
        intervieweeMap[key].companies.push({
            company_name: fd.company_name || '-',
            stage: app.stage || '대기',
            booked_date: fd.booked_date || '',
        })
    }

    // users 테이블 매칭
    // 1단계: 이름+생년월일 일치 → 2단계: 전화번호까지 일치하면 최종 매칭
    function matchUser(interviewee) {
        const step1 = allUsers.filter(u =>
            u.name === interviewee.name &&
            (u.metadata?.birth === interviewee.birth || !interviewee.birth)
        )
        if (step1.length === 0) return null
        if (step1.length === 1) return step1[0]
        // 동명이인: 전화번호로 추가 매칭
        return step1.find(u => u.phone === interviewee.phone) || step1[0]
    }

    const interviewees = Object.values(intervieweeMap)

    // 필터 옵션
    const companyOptions = ['전체', ...Array.from(new Set(applications.map(a => a.form_data?.company_name).filter(Boolean))).sort()]
    const stageOptions = ['전체', '면접 예정', '예비합격', '최종합격', '불합격']

    const filteredInterviewees = interviewees.filter(iv => {
        if (appSearch && !iv.name?.includes(appSearch) && !iv.phone?.includes(appSearch)) return false
        if (filterCompany !== '전체' && !iv.companies.some(c => c.company_name === filterCompany)) return false
        if (filterStage !== '전체' && !iv.companies.some(c => c.stage === filterStage)) return false
        return true
    })

    return (
        <div>
            <div className="page-header">
                <div>
                    <div className="page-title">기업 및 면접자 관리</div>
                    <div className="page-subtitle">기업 가입 현황과 전체 면접자를 관리합니다.</div>
                </div>
            </div>

            {/* 탭 */}
            <div className="seg" style={{ marginBottom: 24 }}>
                <button className={`seg-btn ${tab === 'companies' ? 'on' : ''}`} onClick={() => setTab('companies')}>
                    기업 관리 ({teams.length}개)
                </button>
                <button className={`seg-btn ${tab === 'interviewees' ? 'on' : ''}`} onClick={() => setTab('interviewees')}>
                    면접자 관리 ({interviewees.length}명)
                </button>
            </div>

            {/* ── 기업 관리 탭 ── */}
            {tab === 'companies' && (
                <>
                    {/* 접속 링크 */}
                    <div className="card" style={{ marginBottom: 24, padding: '20px 24px', background: 'var(--primary-light)', border: '1px solid var(--primary-border)' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', marginBottom: 12 }}>브랜드 접속 링크</div>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                            {Object.entries(BRAND_LINKS).map(([brand, link]) => (
                                <div key={brand} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: '#fff', borderRadius: 8, border: '1px solid var(--primary-border)' }}>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-800)' }}>
                                        {brand === 'SNIPERFACTORY' ? '스나이퍼팩토리' : '인사이드아웃'}
                                    </span>
                                    <span style={{ fontSize: 11, color: 'var(--gray-400)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link}</span>
                                    <button onClick={() => { navigator.clipboard.writeText(link); showToast('링크가 복사되었습니다.') }}
                                        style={{ fontSize: 12, color: 'var(--primary)', background: 'none', border: '1px solid var(--primary-border)', cursor: 'pointer', padding: '3px 10px', borderRadius: 6, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                        복사
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                            브랜드 페이지 진입 후 기업/면접자 중 선택하여 로그인합니다.
                        </div>
                    </div>

                    {/* 통계 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                        {[
                            ['전체 기업', teams.length, 'var(--gray-900)'],
                            ['가입 완료', joinedCount, 'var(--success)'],
                            ['미가입', teams.length - joinedCount, 'var(--warning)'],
                        ].map(([label, val, color]) => (
                            <div key={label} style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 10, padding: '16px 20px' }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', marginBottom: 6 }}>{label}</div>
                                <div style={{ fontSize: 24, fontWeight: 800, color }}>{val}<span style={{ fontSize: 14, color: 'var(--gray-500)', marginLeft: 2 }}>개</span></div>
                            </div>
                        ))}
                    </div>

                    {/* 필터 */}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 12px', border: '1px solid var(--gray-200)', borderRadius: 8, background: '#fff', flex: 1, minWidth: 200 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round">
                                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                            </svg>
                            <input style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 14 }}
                                placeholder="기업명 검색" value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <div className="seg">
                            {['전체', '가입완료', '미가입'].map(opt => (
                                <button key={opt} className={`seg-btn ${filterJoined === opt ? 'on' : ''}`}
                                    onClick={() => setFilterJoined(opt)}>{opt}</button>
                            ))}
                        </div>
                    </div>

                    <div className="card">
                        {loading ? (
                            <div className="empty"><div className="empty-title">불러오는 중...</div></div>
                        ) : teams.length === 0 ? (
                            <div className="empty">
                                <div className="empty-title">등록된 기업이 없습니다.</div>
                                <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 4 }}>면접자 등록 시 기업이 자동으로 추가됩니다.</div>
                            </div>
                        ) : filteredTeams.length === 0 ? (
                            <div className="empty"><div className="empty-title">검색 결과가 없습니다.</div></div>
                        ) : (
                            <div className="table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th style={{ width: 48, textAlign: 'center' }}>NO</th>
                                            <th>기업명</th>
                                            <th style={{ width: 110, textAlign: 'center' }}>가입 여부</th>
                                            <th style={{ width: 110, textAlign: 'center' }}>평가 상태</th>
                                            <th style={{ width: 140 }}>담당자명</th>
                                            <th style={{ width: 180 }}>이메일</th>
                                            <th style={{ width: 130 }}>연락처</th>
                                            <th style={{ width: 110 }}>가입일</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTeams.map((team, idx) => {
                                            const user = getUserForTeam(team)
                                            return (
                                                <tr key={team.id}>
                                                    <td style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: 12 }}>{idx + 1}</td>
                                                    <td style={{ fontWeight: 700 }}>{team.name}</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span className={`badge ${user ? 'b-green' : 'b-gray'}`}>
                                                            {user ? '가입완료' : '미가입'}
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span className={`badge ${getEvalStatusForTeam(team) === '평가완료' ? 'b-green' : 'b-gray'}`}>
                                                            {getEvalStatusForTeam(team)}
                                                        </span>
                                                    </td>
                                                    <td style={{ color: 'var(--gray-700)' }}>{user?.name || '-'}</td>
                                                    <td style={{ color: 'var(--gray-600)', fontSize: 13 }}>{user?.email || '-'}</td>
                                                    <td style={{ color: 'var(--gray-600)', fontSize: 13 }}>{user?.phone || '-'}</td>
                                                    <td style={{ color: 'var(--gray-500)', fontSize: 12 }}>
                                                        {user?.created_at ? new Date(user.created_at).toLocaleDateString('ko-KR') : '-'}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ── 면접자 관리 탭 ── */}
            {tab === 'interviewees' && (
                <>
                    {/* 필터 */}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 12px', border: '1px solid var(--gray-200)', borderRadius: 8, background: '#fff', flex: 1, minWidth: 200 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round">
                                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                            </svg>
                            <input style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 14 }}
                                placeholder="이름, 연락처 검색" value={appSearch} onChange={e => setAppSearch(e.target.value)} />
                        </div>
                        <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)}
                            style={{ height: 38, padding: '0 12px', border: '1px solid var(--gray-200)', borderRadius: 8, fontSize: 14, background: '#fff', color: 'var(--gray-700)', cursor: 'pointer' }}>
                            {companyOptions.map(c => <option key={c} value={c}>{c === '전체' ? '전체 기업' : c}</option>)}
                        </select>
                        <div className="seg">
                            {stageOptions.map(opt => (
                                <button key={opt} className={`seg-btn ${filterStage === opt ? 'on' : ''}`}
                                    onClick={() => setFilterStage(opt)}>{opt}</button>
                            ))}
                        </div>
                    </div>

                    <div style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12 }}>
                        {filteredInterviewees.length}/{interviewees.length}명
                    </div>

                    <div className="card">
                        {loading ? (
                            <div className="empty"><div className="empty-title">불러오는 중...</div></div>
                        ) : interviewees.length === 0 ? (
                            <div className="empty"><div className="empty-title">등록된 면접자가 없습니다.</div></div>
                        ) : filteredInterviewees.length === 0 ? (
                            <div className="empty"><div className="empty-title">검색 결과가 없습니다.</div></div>
                        ) : (
                            <div className="table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th style={{ width: 48, textAlign: 'center' }}>NO</th>
                                            <th style={{ width: 100 }}>이름</th>
                                            <th style={{ width: 110 }}>생년월일</th>
                                            <th style={{ width: 130 }}>연락처</th>
                                            <th>소속 기업 (면접 현황)</th>
                                            <th style={{ width: 110, textAlign: 'center' }}>가입 여부</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredInterviewees.map((iv, idx) => {
                                            const matchedUser = matchUser(iv)
                                            return (
                                                <tr key={idx}>
                                                    <td style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: 12 }}>{idx + 1}</td>
                                                    <td style={{ fontWeight: 700 }}>{iv.name || '-'}</td>
                                                    <td style={{ fontSize: 13, color: 'var(--gray-600)' }}>{iv.birth || '-'}</td>
                                                    <td style={{ fontSize: 13, color: 'var(--gray-600)' }}>{iv.phone || '-'}</td>
                                                    <td>
                                                        {/* 소속 기업 칩 — 여러 기업 표시 */}
                                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                            {iv.companies.map((c, ci) => (
                                                                <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'var(--gray-50)', borderRadius: 6, border: '1px solid var(--gray-200)', fontSize: 12 }}>
                                                                    <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{c.company_name}</span>
                                                                    <span className={`badge ${STAGE_BADGE[c.stage] || 'b-gray'}`} style={{ fontSize: 10, padding: '1px 6px' }}>{c.stage}</span>
                                                                    {c.booked_date && (
                                                                        <span style={{ color: 'var(--primary)', fontSize: 11 }}>{c.booked_date}</span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        {matchedUser ? (
                                                            <div>
                                                                <span className="badge b-green" style={{ fontSize: 11 }}>가입완료</span>
                                                                <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>{matchedUser.email}</div>
                                                            </div>
                                                        ) : (
                                                            <span className="badge b-gray" style={{ fontSize: 11 }}>미가입</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {toast && (
                <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--gray-900)', color: '#fff', padding: '10px 20px', borderRadius: 999, fontSize: 14, zIndex: 9999 }}>
                    {toast}
                </div>
            )}
        </div>
    )
}
