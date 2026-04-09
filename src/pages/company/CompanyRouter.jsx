import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import CompanyDashboard from './CompanyDashboard'

// ── 교육과정 + 기업 선택 팝업 ──────────────────────────────
function CourseSelectorModal({ brand, userId, myPrograms, onSelect, onClose }) {
  const [step, setStep] = useState(1)
  const [programs, setPrograms] = useState([])
  const [selectedProg, setSelectedProg] = useState(null)
  const [companies, setCompanies] = useState([])
  const [selectedCompany, setSelectedCompany] = useState(null)
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
      const { data: teams } = await supabase
        .from('program_teams')
        .select('id, name')
        .eq('program_id', prog.id)
        .order('sort_order', { ascending: true })

      if (teams && teams.length > 0) {
        setCompanies(teams)
      } else {
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
      let teamId = selectedCompany.id
      if (!teamId) {
        const { data: found } = await supabase
          .from('program_teams').select('id')
          .eq('program_id', selectedProg.id).eq('name', selectedCompany.name)
          .maybeSingle()
        teamId = found?.id || null
      }

      if (teamId) {
        await supabase.from('program_teams')
          .update({ user_id: userId }).eq('id', teamId)
      }

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
        <div style={{ padding: '24px 28px 16px', borderBottom: '1px solid var(--gray-100)' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {[1, 2].map(s => (
              <div key={s} style={{ height: 4, flex: 1, borderRadius: 2, background: step >= s ? 'var(--primary)' : 'var(--gray-200)', transition: 'background .3s' }} />
            ))}
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 4 }}>
            {step === 1 ? '참여할 교육과정을 선택해주세요.' : '본인의 소속 기업을 정확히 선택해주세요.'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>
            {step === 1 ? '기업 담당자로 참여 중인 교육과정을 선택하세요.' : `${selectedProg?.title} 교육과정의 기업 목록입니다.`}
          </div>
        </div>

        <div style={{ padding: '16px 28px 20px', maxHeight: '55vh', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gray-400)', fontSize: 14 }}>불러오는 중...</div>
          ) : step === 1 ? (
            programs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gray-400)', fontSize: 14 }}>현재 진행 중인 교육과정이 없습니다.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {programs.map(prog => {
                  const alreadyAdded = myPrograms.some(p => p.programId === prog.id)
                  return (
                    <button key={prog.id} onClick={() => !alreadyAdded && handleProgramSelect(prog)}
                      disabled={alreadyAdded}
                      style={{
                        padding: '14px 18px', borderRadius: 10, border: `1px solid ${alreadyAdded ? 'var(--gray-200)' : 'var(--gray-200)'}`,
                        background: alreadyAdded ? 'var(--gray-50)' : '#fff',
                        cursor: alreadyAdded ? 'default' : 'pointer', textAlign: 'left', transition: 'all .15s',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: alreadyAdded ? 0.6 : 1,
                      }}
                      onMouseOver={e => { if (!alreadyAdded) { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-light)' } }}
                      onMouseOut={e => { if (!alreadyAdded) { e.currentTarget.style.borderColor = 'var(--gray-200)'; e.currentTarget.style.background = '#fff' } }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 6 }}>
                          {prog.title}
                          {alreadyAdded && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: 4 }}>참여 중</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {prog.start_date && (
                            <span style={{ fontSize: 11, color: 'var(--gray-500)', background: 'var(--gray-100)', padding: '2px 8px', borderRadius: 4 }}>
                              교육 {new Date(prog.start_date).toLocaleDateString('ko-KR')} ~ {prog.end_date ? new Date(prog.end_date).toLocaleDateString('ko-KR') : '미설정'}
                            </span>
                          )}
                          {prog.recruit_start_date && (
                            <span style={{ fontSize: 11, color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: 4 }}>
                              면접 {new Date(prog.recruit_start_date).toLocaleDateString('ko-KR')} ~
                            </span>
                          )}
                        </div>
                      </div>
                      {!alreadyAdded && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" strokeWidth="2" strokeLinecap="round">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          ) : (
            <div>
              {companies.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gray-400)', fontSize: 14 }}>등록된 기업이 없습니다. 운영진에게 문의해주세요.</div>
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
                      <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${selectedCompany?.name === company.name ? 'var(--primary)' : 'var(--gray-300)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {selectedCompany?.name === company.name && <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--primary)' }} />}
                      </div>
                      {company.name}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ padding: '12px 16px', background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 8, fontSize: 12, color: '#92400E', lineHeight: 1.7 }}>
                본인의 소속 기업을 정확히 선택해주세요. 본인 소속이 아닌 기업을 선택하거나 허위 정보로 등록할 경우, 서비스 이용이 제한될 수 있습니다.
              </div>
            </div>
          )}
          {error && <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--danger-bg)', borderRadius: 8, fontSize: 13, color: 'var(--danger-text)' }}>{error}</div>}
        </div>

        <div style={{ padding: '14px 28px', borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          {step === 2 ? (
            <>
              <button className="btn btn-secondary" onClick={() => { setStep(1); setSelectedCompany(null); setError('') }}>이전</button>
              <button className="btn btn-primary" onClick={handleConfirm} disabled={saving || !selectedCompany}>
                {saving ? '저장 중...' : '선택 완료'}
              </button>
            </>
          ) : (
            <button className="btn btn-secondary" onClick={onClose}>취소</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 교육과정 목록 화면 ──────────────────────────────────────
function CourseListScreen({ myPrograms, brand, userId, onSelectCourse, onAddCourse }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', display: 'flex', flexDirection: 'column' }}>
      <header className="topbar">
        <div className="logo">
          <div className="logo-icon">M</div>
          <span>면접 지원 시스템</span>
        </div>
        <div className="topbar-spacer" />
        <span className="role-badge company">기업</span>
        <div className="topbar-divider" />
        <button className="btn-ghost-sm" onClick={async () => {
            const companyBrand = profile?.brand
            await signOut()
            if (companyBrand) {
                window.location.href = `/login?brand=${companyBrand}`
            } else {
                navigate('/login')
            }
        }}>로그아웃</button>
      </header>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '40px', maxWidth: 560, width: '100%', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 4 }}>참여 중인 교육과정</div>
          <div style={{ fontSize: 14, color: 'var(--gray-500)', marginBottom: 24 }}>교육과정을 선택해 대시보드로 이동하세요.</div>

          {myPrograms.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--gray-400)', fontSize: 14 }}>
              참여 중인 교육과정이 없습니다.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {myPrograms.map((info, idx) => (
                <button key={idx} onClick={() => onSelectCourse(info)}
                  style={{ padding: '16px 20px', borderRadius: 10, border: '1px solid var(--gray-200)', background: '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all .15s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-light)' }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--gray-200)'; e.currentTarget.style.background = '#fff' }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 2 }}>{info.program?.title || '교육과정'}</div>
                    <div style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>{info.companyName}</div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              ))}
            </div>
          )}

          {/* 교육과정 추가 버튼 */}
          <button className="btn btn-secondary" style={{ width: '100%', height: 44, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            onClick={onAddCourse}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            참여 중인 교육과정 추가하기
          </button>
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
  const [myPrograms, setMyPrograms] = useState([])
  const [selectedInfo, setSelectedInfo] = useState(null)
  const [showSelector, setShowSelector] = useState(false)
  const [showCourseList, setShowCourseList] = useState(false)

  useEffect(() => {
    if (!profile) return
    init()
  }, [profile])

  async function init() {
    setLoading(true)
    try {
      const { data: dbUser } = await supabase
        .from('users').select('brand, metadata').eq('id', user.id).maybeSingle()

      const userBrand = dbUser?.brand || profile?.brand
      setBrand(userBrand)
      const meta = dbUser?.metadata || {}

      if (meta.program_id) {
        const { data: prog } = await supabase
          .from('programs').select('*').eq('id', meta.program_id).maybeSingle()
        if (prog) {
          const info = { teamId: meta.program_team_id || null, companyName: meta.company_name || '', programId: meta.program_id, program: prog }
          setMyPrograms([info])
          setSelectedInfo(info)
        } else {
          setShowCourseList(true)
        }
      } else {
        setShowCourseList(true)
      }
    } catch (e) {
      console.error(e)
      setShowCourseList(true)
    } finally {
      setLoading(false)
    }
  }

  function handleSelect(info) {
    setMyPrograms(prev => {
      const exists = prev.find(p => p.programId === info.programId)
      if (exists) return prev.map(p => p.programId === info.programId ? info : p)
      return [...prev, info]
    })
    setSelectedInfo(info)
    setShowSelector(false)
    setShowCourseList(false)
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)', fontSize: 14 }}>불러오는 중...</div>
  }

  return (
    <>
      {/* 교육과정 목록 화면 */}
      {showCourseList && !showSelector && (
        <CourseListScreen
          myPrograms={myPrograms}
          brand={brand}
          userId={user.id}
          onSelectCourse={info => { setSelectedInfo(info); setShowCourseList(false) }}
          onAddCourse={() => setShowSelector(true)}
        />
      )}

      {/* 대시보드 */}
      {!showCourseList && selectedInfo && (
        <CompanyDashboard
          companyInfo={selectedInfo}
          onChangeCourse={() => setShowCourseList(true)}
        />
      )}

      {/* 초기 미선택 */}
      {!showCourseList && !selectedInfo && !showSelector && (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={() => setShowSelector(true)}>교육과정 선택하기</button>
        </div>
      )}

      {/* 교육과정 선택 팝업 */}
      {showSelector && brand && (
        <CourseSelectorModal
          brand={brand}
          userId={user.id}
          myPrograms={myPrograms}
          onSelect={handleSelect}
          onClose={() => setShowSelector(false)}
        />
      )}
    </>
  )
}