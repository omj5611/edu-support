import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const BRAND_LINKS = {
    SNIPERFACTORY: 'https://edu-support-seven.vercel.app/login?brand=SNIPERFACTORY',
    INSIDEOUT: 'https://edu-support-seven.vercel.app/login?brand=INSIDEOUT',
}

export default function CompanyUserPage() {
    const { progId } = useParams()
    const [teams, setTeams] = useState([])           // program_teams
    const [users, setUsers] = useState([])           // users 테이블 (company role)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterJoined, setFilterJoined] = useState('전체') // 전체 / 가입완료 / 미가입
    const [programBrand, setProgramBrand] = useState('')
    const [toast, setToast] = useState('')

    useEffect(() => { loadData() }, [progId])

    function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }

    async function loadData() {
        setLoading(true)
        try {
            // 교육과정 브랜드 조회
            const { data: prog } = await supabase.from('programs').select('brand').eq('id', progId).single()
            setProgramBrand(prog?.brand || '')

            // 해당 교육과정에 등록된 기업팀 목록
            const { data: teamData, error: te } = await supabase
                .from('program_teams')
                .select('*')
                .eq('program_id', progId)
                .order('sort_order', { ascending: true })
            if (te) throw te

            // company role 유저 중 해당 교육과정 매핑된 유저
            // users 테이블의 metadata.program_team_id로 연결
            const { data: userData } = await supabase
                .from('users')
                .select('id, name, email, phone, created_at, metadata, brand')
                .eq('role', 'COMPANY')

            setTeams(teamData || [])
            setUsers(userData || [])
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    // 기업팀별로 가입한 유저 찾기
    function getUserForTeam(team) {
        return users.find(u =>
            u.metadata?.program_team_id === team.id ||
            u.metadata?.company_name === team.name
        ) || null
    }

    // 필터 적용
    const filtered = teams.filter(team => {
        if (search && !team.name.toLowerCase().includes(search.toLowerCase())) return false
        const user = getUserForTeam(team)
        if (filterJoined === '가입완료' && !user) return false
        if (filterJoined === '미가입' && user) return false
        return true
    })

    const joinedCount = teams.filter(t => !!getUserForTeam(t)).length
    const brandLink = BRAND_LINKS[programBrand] || null

    return (
        <div>
            <div className="page-header">
                <div>
                    <div className="page-title">기업 및 면접자 관리</div>
                    <div className="page-subtitle">기업 가입 현황 및 시스템 접속 링크를 관리합니다.</div>
                </div>
                {brandLink && (
                    <a href={brandLink} target="_blank" rel="noreferrer" className="btn btn-secondary">
                        기업용 접속 링크 열기
                    </a>
                )}
            </div>

            {/* 접속 링크 안내 카드 */}
            <div className="card" style={{ marginBottom: 24, padding: '20px 24px', background: 'var(--primary-light)', border: '1px solid var(--primary-border)' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', marginBottom: 8 }}>
                    기업 담당자 접속 안내
                </div>
                <div style={{ fontSize: 13, color: 'var(--gray-700)', lineHeight: 1.8 }}>
                    기업 담당자는 아래 링크를 통해 가입 및 로그인해야 합니다.
                    브랜드별 별도 링크를 사용하며, 운영진 계정으로는 접속할 수 없습니다.
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {Object.entries(BRAND_LINKS).map(([brand, link]) => (
                        <div key={brand} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: '#fff', borderRadius: 8, border: '1px solid var(--primary-border)' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-800)' }}>
                                {brand === 'SNIPERFACTORY' ? '스나이퍼팩토리' : '인사이드아웃'}
                            </span>
                            <a href={link} target="_blank" rel="noreferrer"
                                style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, padding: '3px 10px', background: 'var(--primary-light)', borderRadius: 6, border: '1px solid var(--primary-border)' }}>
                                {link}
                            </a>
                            <button onClick={() => { navigator.clipboard.writeText(link); showToast('링크가 복사되었습니다.') }}
                                style={{ fontSize: 12, color: 'var(--gray-500)', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 8px', borderRadius: 4, transition: 'all .15s' }}
                                onMouseOver={e => e.currentTarget.style.background = 'var(--gray-100)'}
                                onMouseOut={e => e.currentTarget.style.background = 'none'}>
                                복사
                            </button>
                        </div>
                    ))}
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

            {/* 테이블 */}
            <div className="card">
                {loading ? (
                    <div className="empty"><div className="empty-title">불러오는 중...</div></div>
                ) : teams.length === 0 ? (
                    <div className="empty">
                        <div className="empty-title">등록된 기업이 없습니다.</div>
                        <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 4 }}>
                            면접자 등록 시 기업이 자동으로 추가됩니다.
                        </div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="empty"><div className="empty-title">검색 결과가 없습니다.</div></div>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: 48, textAlign: 'center' }}>NO</th>
                                    <th>기업명</th>
                                    <th style={{ width: 110, textAlign: 'center' }}>가입 여부</th>
                                    <th style={{ width: 160 }}>담당자명</th>
                                    <th style={{ width: 160 }}>이메일</th>
                                    <th style={{ width: 130 }}>연락처</th>
                                    <th style={{ width: 120 }}>가입일</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((team, idx) => {
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

            {toast && (
                <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--gray-900)', color: '#fff', padding: '10px 20px', borderRadius: 999, fontSize: 14, zIndex: 9999 }}>
                    {toast}
                </div>
            )}
        </div>
    )
}