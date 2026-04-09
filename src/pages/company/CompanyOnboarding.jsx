import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

export default function CompanyOnboarding({ onComplete }) {
    const { user, profile } = useAuth()
    const navigate = useNavigate()

    const [step, setStep] = useState(1) // 1: 교육과정 선택, 2: 기업 선택
    const [programs, setPrograms] = useState([])
    const [selectedProg, setSelectedProg] = useState(null)
    const [companies, setCompanies] = useState([]) // 해당 교육과정의 기업명 목록
    const [selectedCompany, setSelectedCompany] = useState('')
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    // 브랜드 기반 교육과정 로드
    useEffect(() => {
        if (!profile?.brand) return
        loadPrograms()
    }, [profile])

    async function loadPrograms() {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('programs')
                .select('id, title, brand, start_date, end_date, recruit_start_date, recruit_end_date')
                .eq('brand', profile.brand)
                .eq('is_archived', false)
                .order('created_at', { ascending: false })
            if (error) throw error
            setPrograms(data || [])
        } catch (err) {
            setError('교육과정을 불러오지 못했습니다.')
        } finally {
            setLoading(false)
        }
    }

    async function handleProgramSelect(prog) {
        setSelectedProg(prog)
        setLoading(true)
        setError('')
        try {
            // 해당 교육과정의 엑셀에서 가져온 기업명 목록 (applications.form_data.company_name 고유값)
            const { data: apps, error: ae } = await supabase
                .from('applications')
                .select('form_data')
                .eq('program_id', prog.id)
                .eq('application_type', 'interview')
            if (ae) throw ae

            // company_name 고유값 추출
            const nameSet = new Set(
                (apps || []).map(a => a.form_data?.company_name).filter(Boolean)
            )
            setCompanies([...nameSet].sort())
            setStep(2)
        } catch (err) {
            setError('기업 목록을 불러오지 못했습니다.')
        } finally {
            setLoading(false)
        }
    }

    async function handleConfirm() {
        if (!selectedCompany) { setError('기업을 선택해주세요.'); return }
        setSaving(true)
        setError('')
        try {
            // 1. program_teams에 기업 등록 (없으면 생성)
            let teamId = null
            const { data: existing } = await supabase
                .from('program_teams')
                .select('id')
                .eq('program_id', selectedProg.id)
                .eq('name', selectedCompany)
                .single()

            if (existing) {
                teamId = existing.id
            } else {
                const { data: newTeam, error: te } = await supabase
                    .from('program_teams')
                    .insert({ program_id: selectedProg.id, name: selectedCompany, brand: profile.brand })
                    .select()
                    .single()
                if (te) throw te
                teamId = newTeam.id
            }

            // 2. users 테이블 metadata에 program_team_id, company_name, program_id 저장
            const updatedMeta = {
                ...(profile.metadata || {}),
                program_team_id: teamId,
                company_name: selectedCompany,
                program_id: selectedProg.id,
                onboarding_done: true,
            }
            const { error: ue } = await supabase
                .from('users')
                .update({ metadata: updatedMeta })
                .eq('id', user.id)
            if (ue) throw ue

            // 3. onComplete 콜백 (CompanyRouter에서 처리)
            onComplete({ teamId, companyName: selectedCompany, programId: selectedProg.id, program: selectedProg })
        } catch (err) {
            setError('저장 중 오류가 발생했습니다: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(6px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflowY: 'auto' }}>
            <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, boxShadow: '0 24px 48px rgba(0,0,0,.2)', overflow: 'hidden' }}>

                {/* 헤더 */}
                <div style={{ padding: '24px 28px 16px', borderBottom: '1px solid var(--gray-100)' }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        {[1, 2].map(s => (
                            <div key={s} style={{
                                height: 4, flex: 1, borderRadius: 2,
                                background: step >= s ? 'var(--primary)' : 'var(--gray-200)',
                                transition: 'background .3s',
                            }} />
                        ))}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 4 }}>
                        {step === 1 ? '참여 중인 교육과정을 선택해주세요.' : '본인의 소속 기업을 정확히 선택해주세요.'}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                        {step === 1
                            ? '기업 담당자로 참여 중인 교육과정을 선택하세요.'
                            : `${selectedProg?.title} 교육과정의 기업 목록입니다.`}
                    </div>
                </div>

                {/* 바디 */}
                <div style={{ padding: '16px 28px 20px', maxHeight: '60vh', overflowY: 'auto' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gray-400)', fontSize: 14 }}>불러오는 중...</div>
                    ) : step === 1 ? (
                        // 교육과정 목록
                        programs.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gray-400)', fontSize: 14 }}>
                                현재 진행 중인 교육과정이 없습니다.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {programs.map(prog => (
                                    <button key={prog.id} onClick={() => handleProgramSelect(prog)}
                                        style={{
                                            padding: '14px 18px', borderRadius: 10, border: '1px solid var(--gray-200)',
                                            background: '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all .15s',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        }}
                                        onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-light)' }}
                                        onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--gray-200)'; e.currentTarget.style.background = '#fff' }}>
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 2 }}>{prog.title}</div>
                                            <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                                                {prog.recruit_start_date
                                                    ? `${new Date(prog.recruit_start_date).toLocaleDateString('ko-KR')} ~ ${prog.recruit_end_date ? new Date(prog.recruit_end_date).toLocaleDateString('ko-KR') : '미설정'}`
                                                    : '면접 기간 미설정'}
                                            </div>
                                        </div>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" strokeWidth="2" strokeLinecap="round">
                                            <path d="M9 18l6-6-6-6" />
                                        </svg>
                                    </button>
                                ))}
                            </div>
                        )
                    ) : (
                        // 기업명 목록
                        <div>
                            {companies.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gray-400)', fontSize: 14 }}>
                                    등록된 기업이 없습니다. 운영진에게 문의해주세요.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                                    {companies.map(name => (
                                        <button key={name} onClick={() => setSelectedCompany(name)}
                                            style={{
                                                padding: '12px 16px', borderRadius: 9, border: `1.5px solid ${selectedCompany === name ? 'var(--primary)' : 'var(--gray-200)'}`,
                                                background: selectedCompany === name ? 'var(--primary-light)' : '#fff',
                                                cursor: 'pointer', textAlign: 'left', fontSize: 14, fontWeight: selectedCompany === name ? 700 : 500,
                                                color: selectedCompany === name ? 'var(--primary)' : 'var(--gray-800)',
                                                transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 10,
                                            }}>
                                            <div style={{
                                                width: 18, height: 18, borderRadius: '50%', border: `2px solid ${selectedCompany === name ? 'var(--primary)' : 'var(--gray-300)'}`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                            }}>
                                                {selectedCompany === name && <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--primary)' }} />}
                                            </div>
                                            {name}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* 경고 문구 */}
                            <div style={{ padding: '12px 16px', background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 8, fontSize: 12, color: '#92400E', lineHeight: 1.6 }}>
                                본인 소속이 아닌 기업을 선택하거나 허위 정보로 등록할 경우, 서비스 이용이 제한될 수 있습니다.
                            </div>
                        </div>
                    )}

                    {error && (
                        <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--danger-bg)', borderRadius: 8, fontSize: 13, color: 'var(--danger-text)' }}>
                            {error}
                        </div>
                    )}
                </div>

                {/* 푸터 */}
                {step === 2 && (
                    <div style={{ padding: '14px 28px', borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <button className="btn btn-secondary" onClick={() => { setStep(1); setSelectedCompany(''); setError('') }}>
                            이전
                        </button>
                        <button className="btn btn-primary" onClick={handleConfirm} disabled={saving || !selectedCompany}>
                            {saving ? '저장 중...' : '선택 완료'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}