import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useProgram } from '../../contexts/ProgramContext'
import { supabase } from '../../lib/supabase'

const BRANDS = [
  { id: 'SNIPERFACTORY', label: '스나이퍼팩토리' },
  { id: 'INSIDEOUT', label: '인사이드아웃' },
]

// programs.category_temp enum → 한글 칩
const CATEGORY_CHIP = {
  intern: { label: '인턴형', color: '#2563EB', bg: '#EFF6FF' },
  project: { label: '프로젝트형', color: '#7C3AED', bg: '#EDE9FE' },
  kdt: { label: 'KDT', color: '#059669', bg: '#D1FAE5' },
  saessak: { label: '새싹', color: '#D97706', bg: '#FEF3C7' },
}

function getProgramStatus(prog) {
  const now = new Date()
  const start = prog.start_date ? new Date(prog.start_date) : null
  const end = prog.end_date ? new Date(prog.end_date) : null
  if (!start) return 'upcoming'
  if (end && now > end) return 'done'
  if (now >= start) return 'active'
  return 'upcoming'
}

const STATUS_LABEL = { active: '진행중', upcoming: '예정', done: '완료' }
const STATUS_COLOR = { active: 'b-green', upcoming: 'b-blue', done: 'b-gray' }

export default function ProgramSelectPage() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const { setSelectedProgram } = useProgram()

  const [programs, setPrograms] = useState([])
  const [categories, setCategories] = useState({}) // { categoryId: name }
  const [loading, setLoading] = useState(true)
  const [activeBrand, setActiveBrand] = useState(BRANDS[0].id)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      // programs + categories 병렬 로드
      const [{ data: progs, error: progErr }, { data: cats, error: catErr }] = await Promise.all([
        supabase
          .from('programs')
          .select('*, categories(id, name)')   // ← categories join 추가
          .eq('is_archived', false)
          .order('created_at', { ascending: false }),
        supabase
          .from('categories')
          .select('id, name'),
      ])

      if (progErr) throw progErr

      setPrograms(progs || [])

      // categories를 { id: name } 맵으로 변환
      const catMap = {}
        ; (cats || []).forEach(c => { catMap[c.id] = c.name })
      setCategories(catMap)

    } catch (err) {
      console.error('데이터 로드 실패:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleSelect(prog) {
    setSelectedProgram(prog)
    navigate(`/admin/${prog.id}/settings`)
  }

  // 브랜드 필터
  const filtered = programs.filter(p => p.brand === activeBrand)

  // 카테고리 칩 렌더
  function renderCategoryChip(prog) {
    // join된 categories 객체에서 name 바로 사용
    const catName = prog.categories?.name || null
    const chipKey = (prog.category_temp || '').toString().toLowerCase()
    const chip = CATEGORY_CHIP[chipKey]
    const label = catName || chip?.label || prog.category_temp || null
    if (!label) return null

    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '2px 10px', borderRadius: 999,
        fontSize: 12, fontWeight: 700,
        background: chip?.bg || '#F3F4F6',
        color: chip?.color || '#374151',
        border: `1px solid ${chip?.color || '#D1D5DB'}22`,
      }}>
        {label}
      </span>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '10vh' }}>
      <div style={{ width: 640, maxWidth: '92%' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--gray-900)', letterSpacing: '-0.02em' }}>
              워크스페이스 선택
            </div>
            <div style={{ fontSize: 14, color: 'var(--gray-500)', marginTop: 4 }}>
              참여할 브랜드와 교육과정을 선택하세요.
            </div>
          </div>
          <button className="btn btn-secondary btn-sm"
            onClick={async () => { await signOut(); navigate('/login') }}>
            로그아웃
          </button>
        </div>

        {/* 브랜드 탭 */}
        <div style={{
          display: 'flex', gap: 0, marginBottom: 24,
          border: '1px solid var(--gray-200)', borderRadius: 10, overflow: 'hidden',
          background: '#fff', boxShadow: 'var(--shadow-sm)',
        }}>
          {BRANDS.map((b, i) => (
            <button key={b.id}
              onClick={() => setActiveBrand(b.id)}
              style={{
                flex: 1, height: 44, fontSize: 14, fontWeight: 700,
                border: 'none', cursor: 'pointer', transition: 'all .2s',
                borderRight: i < BRANDS.length - 1 ? '1px solid var(--gray-200)' : 'none',
                background: activeBrand === b.id ? 'var(--primary)' : '#fff',
                color: activeBrand === b.id ? '#fff' : 'var(--gray-600)',
              }}>
              {b.label}
            </button>
          ))}
        </div>

        {/* 교육과정 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading ? (
            <div className="card">
              <div className="empty"><div className="empty-title">불러오는 중...</div></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="card">
              <div className="empty">
                <div style={{ fontSize: 40, marginBottom: 12, opacity: .4 }}>📁</div>
                <div className="empty-title">등록된 교육과정이 없습니다.</div>
                <div style={{ fontSize: 14, color: 'var(--gray-400)', marginTop: 4 }}>
                  {BRANDS.find(b => b.id === activeBrand)?.label} 브랜드의 교육과정이 없어요.
                </div>
              </div>
            </div>
          ) : filtered.map(prog => {
            const status = getProgramStatus(prog)
            const catChip = renderCategoryChip(prog)

            return (
              <div key={prog.id}
                onClick={() => handleSelect(prog)}
                className="card"
                style={{
                  padding: '18px 24px', cursor: 'pointer', transition: 'all .2s',
                  display: 'flex', alignItems: 'center', gap: 16,
                }}
                onMouseOver={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)'
                  e.currentTarget.style.borderColor = 'var(--primary-border)'
                }}
                onMouseOut={e => {
                  e.currentTarget.style.transform = 'none'
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                  e.currentTarget.style.borderColor = 'var(--gray-200)'
                }}>

                {/* 아이콘 */}
                <div style={{
                  width: 44, height: 44, borderRadius: 8,
                  background: 'var(--primary-light)', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                }}>
                  🎓
                </div>

                {/* 텍스트 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* 제목 + 상태 + 유형 칩 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-900)' }}>
                      {prog.title}
                    </div>
                    <span className={`badge ${STATUS_COLOR[status]}`}>
                      {STATUS_LABEL[status]}
                    </span>
                    {catChip}
                  </div>

                  {/* 모집 기간 */}
                  <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                    모집: {prog.recruit_start_date
                      ? new Date(prog.recruit_start_date).toLocaleDateString('ko-KR')
                      : '미설정'}
                    {' ~ '}
                    {prog.recruit_end_date
                      ? new Date(prog.recruit_end_date).toLocaleDateString('ko-KR')
                      : '미설정'}
                  </div>
                </div>

                {/* 화살표 */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="var(--gray-300)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            )
          })}
        </div>

        {/* 총 개수 표시 */}
        {!loading && filtered.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--gray-400)' }}>
            총 {filtered.length}개의 교육과정
          </div>
        )}
      </div>
    </div>
  )
}