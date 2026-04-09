import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const STAGE_BADGE = {
    '면접 예정': 'b-blue', '불합격': 'b-red',
    '예비합격': 'b-orange', '최종합격': 'b-green', '대기': 'b-gray',
}

export default function CompanyDashboard({ companyInfo, onChangeCourse }) {
    const { signOut } = useAuth()
    const navigate = useNavigate()
    const { companyName, programId, program } = companyInfo

    const [applicants, setApplicants] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterStage, setFilterStage] = useState('전체')

    useEffect(() => { loadApplicants() }, [companyName, programId])

    async function loadApplicants() {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('applications')
                .select('*')
                .eq('program_id', programId)
                .eq('application_type', 'interview')
                .filter('form_data->>company_name', 'eq', companyName)
                .order('created_at', { ascending: false })
            if (error) throw error
            setApplicants(data || [])
        } catch (err) {
            console.error('면접자 로드 실패:', err)
        } finally {
            setLoading(false)
        }
    }

    const stageOptions = ['전체', '면접 예정', '예비합격', '최종합격', '불합격']
    const filtered = applicants.filter(app => {
        const fd = app.form_data || {}
        if (search && !app.name?.includes(search) && !fd.phone?.includes(search)) return false
        if (filterStage !== '전체' && app.stage !== filterStage) return false
        return true
    })

    return (
        <div style={{ minHeight: '100vh', background: 'var(--gray-50)', display: 'flex', flexDirection: 'column' }}>
            {/* 상단 바 */}
            <header className="topbar">
                <div className="logo">
                    <div className="logo-icon">M</div>
                    <span>면접 지원 시스템</span>
                </div>
                <div className="topbar-divider" />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-700)' }}>{companyName}</span>
                <div className="topbar-spacer" />
                <button className="btn btn-secondary btn-sm" onClick={onChangeCourse}
                    style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M3 12h18M3 6h18M3 18h18" />
                    </svg>
                    교육과정 변경
                </button>
                <div className="topbar-divider" />
                <span className="role-badge company">기업</span>
                <div className="topbar-divider" />
                <button className="btn-ghost-sm" onClick={async () => { await signOut(); navigate('/login') }}>
                    로그아웃
                </button>
            </header>

            {/* 메인 */}
            <div style={{ flex: 1, padding: '32px 40px', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
                {/* 헤더 */}
                <div style={{ marginBottom: 28 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 4 }}>
                        {companyName} 대시보드
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--gray-500)' }}>
                        {program?.title || '교육과정'} · 배정된 면접자를 확인하세요.
                    </div>
                </div>

                {/* 통계 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
                    {[
                        ['전체 면접자', applicants.length, 'var(--gray-900)'],
                        ['일정 제출', applicants.filter(a => a.form_data?.booked_date).length, 'var(--primary)'],
                        ['면접 예정', applicants.filter(a => a.stage === '면접 예정').length, 'var(--warning)'],
                        ['최종 합격', applicants.filter(a => a.stage === '최종합격').length, 'var(--success)'],
                    ].map(([label, val, color]) => (
                        <div key={label} style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 10, padding: '16px 20px' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', marginBottom: 6 }}>{label}</div>
                            <div style={{ fontSize: 24, fontWeight: 800, color }}>
                                {val}<span style={{ fontSize: 14, color: 'var(--gray-500)', marginLeft: 2 }}>명</span>
                            </div>
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
                            placeholder="이름, 연락처 검색" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div className="seg">
                        {stageOptions.map(opt => (
                            <button key={opt} className={`seg-btn ${filterStage === opt ? 'on' : ''}`}
                                onClick={() => setFilterStage(opt)}>{opt}</button>
                        ))}
                    </div>
                </div>

                {/* 면접자 목록 */}
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">배정된 면접자 목록</div>
                        <div style={{ fontSize: 13, color: 'var(--gray-400)' }}>{filtered.length}/{applicants.length}명</div>
                    </div>
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
        </div>
    )
}