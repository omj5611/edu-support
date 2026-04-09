import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import CompanyDashboard from './CompanyDashboard'

// ── 교육과정 + 기업 선택 팝업 ──────────────────────────────
function CourseSelectorModal({ brand, userId, onSelect, onClose }) {
  const [step, setStep] = useState(1)           // 1: 교육과정 선택, 2: 기업 선택
  const [programs, setPrograms] = useState([])
  const [selectedProg, setSelectedProg] = useState(null)
  const [companies, setCompanies] = useState([])
  const [selectedCompany, setSelectedCompany] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadPrograms() }, [])

  async function loadPrograms() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('id, title, brand, start_date, end_date, recruit_start_date, recruit_end_date')
        .eq('brand', brand)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
      if (error) throw error
      setPrograms(data || [])
    } catch {
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
      // program_teams에서 기업 목록 조회
      const { data: teams, error: te } = await supabase
        .from('program_teams')
        .select('id, name')
        .eq('program_id', prog.id)
        .order('sort_order', { ascending: true })
      if (te) throw te

      if (teams && teams.length > 0) {
        setCompanies(teams)
      } else {
        // fallback: applications에서 company_name 고유값
        const { data: apps } = await supabase
          .from('applications')
          .select('form_data')
          .eq('program_id', prog.id)
          .eq('application_type', 'interview')
        const nameSet = new Set((apps || []).map(a => a.form_data?.company_name).filter(Boolean))
        setCompanies([...nameSet].sort().map(name => ({ id: null, name })))
      }
      setStep(2)
    } catch {
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
      // program_teams에서 해당 기업 row 찾기
      let teamId = selectedCompany.id

      if (!teamId) {
        // id가 없으면 이름으로 다시 조회
        const { data: found } = await supabase
          .from('program_teams')
          .select('id')
          .eq('program_id', selectedProg.id)
          .eq('name', selectedCompany.name)
          .maybeSingle()
        teamId = found?.id || null
      }

      // program_teams.user_id 업데이트 (기업 담당자 매칭)
      if (teamId) {
        await supabase
          .from('program_teams')
          .update({ user_id: userId })
          .eq('id', teamId)
      }

      // users.metadata 업데이트
      const { data: currentUser } = await supabase
        .from('users').select('metadata').eq('id', userId).maybeSingle()
      const updatedMeta = {
        ...(currentUser?.metadata || {}),
        program_team_id: teamId,
        company_name: selectedCompany.name,
        program_id: selectedProg.id,
        onboarding_done: true,
      }
      await supabase.from('users').update({ metadata: updatedMeta }).eq('id', userId)

      onSelect({
        teamId,
        companyName: selectedCompany.name,
        programId: selectedProg.id,
        program: selectedProg,
      })
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
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
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
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 6 }}>{prog.title}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {prog.start_date && (
                          <span style={{ fontSize: 11, color: 'var(--gray-500)', background: 'var(--gray-100)', padding: '2px 8px', borderRadius: 4 }}>
                            교육 {new Date(prog.start_date).toLocaleDateString('ko-KR')} ~ {prog.end_date ? new Date(prog.end_date).toLocaleDateString('ko-KR') : '미설정'}
                          </span>
                        )}
                        {prog.recruit_start_date && (
                          <span style={{ fontSize: 11, color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: 4 }}>
                            면접 {new Date(prog.recruit_start_date).toLocaleDateString('ko-KR')} ~ {prog.recruit_end_date ? new Date(prog.recruit_end_date).toLocaleDateString('ko-KR') : '미설정'}
                          </span>
                        )}
                        {!prog.recruit_start_date && (
                          <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>면접 기간 미설정</span>
                        )}
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
            <div>
              {companies.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gray-400)', fontSize: 14 }}>
                  등록된 기업이 없습니다. 운영진에게 문의해주세요.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {companies.map(company => (
                    <button key={company.id || company.name} onClick={() => setSelectedCompany(company)}
                      style={{
                        padding: '12px 16px', borderRadius: 9,
                        border: `1.5px solid ${selectedCompany?.name === company.name ? 'var(--primary)' : 'var(--gray-200)'}`,
                        background: selectedCompany?.name === company.name ? 'var(--primary-light)' : '#fff',
                        cursor: 'pointer', textAlign: 'left', fontSize: 14,
                        fontWeight: selectedCompany?.name === company.name ? 700 : 500,
                        color: selectedCompany?.name === company.name ? 'var(--primary)' : 'var(--gray-800)',
                        transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 10,
                      }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%',
                        border: `2px solid ${selectedCompany?.name === company.name ? 'var(--primary)' : 'var(--gray-300)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {selectedCompany?.name === company.name && (
                          <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--primary)' }} />
                        )}
                      </div>
                      {company.name}
                    </button>
                  ))}
                </div>
              )}

              {/* 안내 문구 */}
              <div style={{ padding: '12px 16px', background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 8, fontSize: 12, color: '#92400E', lineHeight: 1.7 }}>
                본인의 소속 기업을 정확히 선택해주세요. 본인 소속이 아닌 기업을 선택하거나 허위 정보로 등록할 경우, 서비스 이용이 제한될 수 있습니다.
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
        <div style={{ padding: '14px 28px', borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          {step === 2 ? (
            <>
              <button className="btn btn-secondary" onClick={() => { setStep(1); setSelectedCompany(''); setError('') }}>
                이전
              </button>
              <button className="btn btn-primary" onClick={handleConfirm} disabled={saving || !selectedCompany}>
                {saving ? '저장 중...' : '선택 완료'}
              </button>
            </>
          ) : (
            <button className="btn btn-secondary" onClick={onClose}>
              취소
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 메인 CompanyRouter ──────────────────────────────────────
export default function CompanyRouter() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [brand, setBrand] = useState(null)
  const [myPrograms, setMyPrograms] = useState([])      // 이미 선택한 교육과정 목록
  const [selectedInfo, setSelectedInfo] = useState(null) // 현재 보고 있는 교육과정
  const [showSelector, setShowSelector] = useState(false) // 팝업 표시

  useEffect(() => {
    if (!profile) return
    init()
  }, [profile])

  async function init() {
    setLoading(true)
    try {
      // DB에서 최신 profile 조회
      const { data: dbUser } = await supabase
        .from('users').select('brand, metadata').eq('id', user.id).maybeSingle()

      const userBrand = dbUser?.brand || profile?.brand
      setBrand(userBrand)

      const meta = dbUser?.metadata || {}

      // 이미 교육과정을 선택한 이력이 있으면 해당 교육과정 로드
      if (meta.program_id) {
        const { data: prog } = await supabase
          .from('programs').select('*').eq('id', meta.program_id).maybeSingle()
        if (prog) {
          const info = {
            teamId: meta.program_team_id || null,
            companyName: meta.company_name || '',
            programId: meta.program_id,
            program: prog,
          }
          setMyPrograms([info])
          setSelectedInfo(info)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function handleSelect(info) {
    setSelectedInfo(info)
    // 이미 목록에 없으면 추가
    setMyPrograms(prev => {
      const exists = prev.find(p => p.programId === info.programId)
      if (exists) return prev.map(p => p.programId === info.programId ? info : p)
      return [...prev, info]
    })
    setShowSelector(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)', fontSize: 14 }}>
        불러오는 중...
      </div>
    )
  }

  return (
    <>
      {/* 교육과정이 선택된 경우 → 대시보드 */}
      {selectedInfo ? (
        <CompanyDashboard
          companyInfo={selectedInfo}
          onChangeCourse={() => setShowSelector(true)}
        />
      ) : (
        /* 아직 교육과정 미선택 → 선택 안내 화면 */
        <div style={{ minHeight: '100vh', background: 'var(--gray-50)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '48px 40px', maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>
              🏢
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 8 }}>
              면접 관리 시스템
            </div>
            <div style={{ fontSize: 14, color: 'var(--gray-500)', marginBottom: 32, lineHeight: 1.6 }}>
              참여 중인 교육과정을 선택하면<br />배정된 면접자를 확인할 수 있습니다.
            </div>
            <button className="btn btn-primary" style={{ width: '100%', height: 48, fontSize: 15 }}
              onClick={() => setShowSelector(true)}>
              교육과정 선택하기
            </button>
            <button className="btn btn-ghost" style={{ width: '100%', marginTop: 10, fontSize: 14 }}
              onClick={async () => { await supabase.auth.signOut(); navigate('/login') }}>
              로그아웃
            </button>
          </div>
        </div>
      )}

      {/* 교육과정 선택 팝업 */}
      {showSelector && brand && (
        <CourseSelectorModal
          brand={brand}
          userId={user.id}
          onSelect={handleSelect}
          onClose={() => setShowSelector(false)}
        />
      )}
    </>
  )
}