import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useProgram } from '../../contexts/ProgramContext'
import { supabase } from '../../lib/supabase'
import { syncInterviewDates } from '../../lib/interviewDates'

const BRANDS = [
  { id: 'SNIPERFACTORY', label: '스나이퍼팩토리' },
  { id: 'INSIDEOUT', label: '인사이드아웃' },
]

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

function countDays(startStr, endStr, excludeWeekends) {
  if (!startStr || !endStr) return 0
  let cur = new Date(startStr + 'T00:00:00')
  const end = new Date(endStr + 'T00:00:00')
  let count = 0
  while (cur <= end) {
    const d = cur.getDay()
    if (!excludeWeekends || (d !== 0 && d !== 6)) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

function fmt(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

// ── 달력 Range Picker ──────────────────────────────────────
function DateRangePicker({ startDate, endDate, onChange }) {
  const [viewYear, setViewYear] = useState(() => {
    const d = startDate ? new Date(startDate) : new Date()
    return d.getFullYear()
  })
  const [viewMonth, setViewMonth] = useState(() => {
    const d = startDate ? new Date(startDate) : new Date()
    return d.getMonth()
  })
  const [hoverDate, setHoverDate] = useState(null)
  const [selecting, setSelecting] = useState(!(startDate && endDate))


  useEffect(() => {
    setSelecting(!(startDate && endDate))
  }, [startDate, endDate])

  const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
  const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

  function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate() }
  function getFirstDay(y, m) { return new Date(y, m, 1).getDay() }
  function toStr(y, m, d) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  function handleDayClick(ds) {
    if (!startDate || !selecting) {
      onChange(ds, null)
      setSelecting(true)
    } else {
      if (ds < startDate) onChange(ds, startDate)
      else onChange(startDate, ds)
      setSelecting(false)
    }
  }

  function isInRange(ds) {
    const end = selecting ? hoverDate : endDate
    if (!startDate || !end) return false
    const [s, e] = startDate <= end ? [startDate, end] : [end, startDate]
    return ds > s && ds < e
  }

  function goMonth(delta) {
    let m = viewMonth + delta, y = viewYear
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setViewMonth(m); setViewYear(y)
  }

  const dim = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDay(viewYear, viewMonth)
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)]
  while (cells.length % 7) cells.push(null)

  return (
    <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 10, overflow: 'hidden', userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--gray-100)', background: 'var(--gray-50)' }}>
        <button onClick={() => goMonth(-1)} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--gray-200)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>‹</button>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-900)' }}>{viewYear}년 {MONTHS[viewMonth]}</span>
        <button onClick={() => goMonth(1)} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--gray-200)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', padding: '6px 10px 2px' }}>
        {WEEKDAYS.map((w, i) => (
          <div key={w} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: i === 0 ? 'var(--danger-text)' : i === 6 ? 'var(--primary)' : 'var(--gray-500)', padding: '3px 0' }}>{w}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1, padding: '0 10px 10px' }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const ds = toStr(viewYear, viewMonth, d)
          const isStart = ds === startDate
          const isEnd = ds === endDate
          const inRange = isInRange(ds)
          const isSun = i % 7 === 0
          const isSat = i % 7 === 6
          let bg = 'transparent'
          let color = isSun ? 'var(--danger-text)' : isSat ? 'var(--primary)' : 'var(--gray-800)'
          let borderRadius = 6

          if (isStart || isEnd) { bg = 'var(--primary)'; color = '#fff' }
          else if (inRange) { bg = 'var(--primary-light)'; color = 'var(--primary)'; borderRadius = 0 }

          if (isStart && endDate) borderRadius = '6px 0 0 6px'
          if (isEnd && startDate) borderRadius = '0 6px 6px 0'

          return (
            <div key={i}
              onClick={() => handleDayClick(ds)}
              onMouseEnter={() => setHoverDate(ds)}
              onMouseLeave={() => setHoverDate(null)}
              style={{ textAlign: 'center', padding: '6px 0', fontSize: 12, fontWeight: (isStart || isEnd) ? 700 : 500, background: bg, color, borderRadius, cursor: 'pointer', transition: 'all .1s' }}>
              {d}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── 날짜 + 시간 입력 ──────────────────────────────────────
function DateTimeInput({ label, value, onChange }) {
  const dateVal = value ? value.slice(0, 10) : ''
  const timeMatch = value?.match(/T(\d{2}:\d{2})/)
  const timeVal = timeMatch?.[1] || '18:00'

  return (
    <div className="form-group" style={{ margin: 0 }}>
      <label className="form-label" style={{ fontSize: 12, marginBottom: 6 }}>{label}</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <input
          className="form-input"
          type="date"
          value={dateVal}
          onChange={e => onChange(e.target.value ? `${e.target.value}T${timeVal}` : '')}
          style={{ width: '100%', fontSize: 13 }}
        />
        <input
          className="form-input"
          type="time"
          value={timeVal}
          onChange={e => onChange(dateVal ? `${dateVal}T${e.target.value}` : '')}
          style={{ width: '100%', fontSize: 13 }}
        />
      </div>
    </div>
  )
}

// ── 면접 설정 다이얼로그 ──────────────────────────────────
function InterviewSettingDialog({ prog, onComplete, onLater }) {
  const [form, setForm] = useState({
    recruitStart: prog.recruit_start_date?.split('T')[0] || '',
    recruitEnd: prog.recruit_end_date?.split('T')[0] || '',
    coDeadline: prog.pre_recruit_start_date || '',
    stDeadline: prog.pre_recruit_end_date || '',
  })
  const [excludeWeekends, setExcludeWeekends] = useState(true)
  const [saving, setSaving] = useState(false)

  const dayCount = countDays(form.recruitStart, form.recruitEnd, excludeWeekends)
  const hasRange = !!(form.recruitStart && form.recruitEnd)

  async function handleSave() {
    if (!hasRange) { alert('면접 기간을 선택해주세요.'); return }
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('programs')
        .update({
          recruit_start_date: form.recruitStart || null,
          recruit_end_date: form.recruitEnd || null,
          pre_recruit_start_date: form.coDeadline || null,
          pre_recruit_end_date: form.stDeadline || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', prog.id)
        .select()
        .single()
      if (error) throw error

      await syncInterviewDates(prog.id, form.recruitStart, form.recruitEnd, excludeWeekends)

      onComplete(data)
    } catch (err) {
      alert('저장 실패: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(17,24,39,0.55)',
      backdropFilter: 'blur(6px)',
      zIndex: 2000,
      overflowY: 'auto',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '5vh 24px 48px',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        width: '100%',
        maxWidth: 580,
        boxShadow: '0 24px 48px rgba(0,0,0,.2)',
      }}>
        {/* 헤더 */}
        <div style={{ padding: '22px 28px 16px', borderBottom: '1px solid var(--gray-100)' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 4 }}>
            면접 기간을 설정해주세요.
          </div>
          <div style={{ fontSize: 13, color: 'var(--gray-500)', lineHeight: 1.5 }}>
            <span style={{ fontWeight: 700, color: 'var(--gray-800)' }}>{prog.title}</span>의 면접 일정이 아직 설정되지 않았습니다.
          </div>
        </div>

        {/* 바디 */}
        <div style={{ padding: '20px 28px', background: 'var(--gray-50)', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* 달력 */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 10 }}>
              면접 진행 기간 선택
            </div>
            <DateRangePicker
              startDate={form.recruitStart}
              endDate={form.recruitEnd}
              onChange={(s, e) => setForm(f => ({ ...f, recruitStart: s || '', recruitEnd: e || '' }))}
            />
          </div>

          {/* 주말 제외 + 일수 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--gray-700)' }}>
              <input
                type="checkbox"
                checked={excludeWeekends}
                onChange={e => setExcludeWeekends(e.target.checked)}
                style={{ width: 15, height: 15, accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
              주말 제외
            </label>
            {hasRange ? (
              <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '3px 12px', borderRadius: 999 }}>
                {fmt(form.recruitStart)} ~ {fmt(form.recruitEnd)} · 총 {dayCount}일
              </span>
            ) : (
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--gray-400)' }}>기간을 선택하면 자동 계산됩니다</span>
            )}
          </div>

          {/* 마감일+시간 — 세로 배치로 변경해 잘림 방지 */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 10 }}>
              일정 제출 마감일 설정 <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--gray-400)' }}>(선택)</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <DateTimeInput
                label="기업 일정 제출 마감"
                value={form.coDeadline}
                onChange={v => setForm(f => ({ ...f, coDeadline: v }))}
              />
              <DateTimeInput
                label="면접자 일정 제출 마감"
                value={form.stDeadline}
                onChange={v => setForm(f => ({ ...f, stDeadline: v }))}
              />
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn-secondary" onClick={onLater}>나중에 설정하기</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !hasRange}>
            {saving ? '저장 중...' : '완료'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────
export default function ProgramSelectPage() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const { setSelectedProgram } = useProgram()

  const [programs, setPrograms] = useState([])
  const [categories, setCategories] = useState([])
  const [activeBrand, setActiveBrand] = useState(BRANDS[0].id)
  const [activeCategory, setActiveCategory] = useState('전체')
  const [loading, setLoading] = useState(true)
  const [dialogProg, setDialogProg] = useState(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [{ data: progs, error: pe }, { data: cats }] = await Promise.all([
        supabase
          .from('programs')
          .select('*, categories(id, name)')
          .eq('is_archived', false)
          .order('created_at', { ascending: false }),
        supabase
          .from('categories')
          .select('id, name, brand')
          .order('sort_order', { ascending: true }),
      ])
      if (pe) throw pe
      setPrograms(progs || [])
      setCategories(cats || [])
    } catch (err) {
      console.error('데이터 로드 실패:', err)
    } finally {
      setLoading(false)
    }
  }

  const brandCategories = categories.filter(c => c.brand === activeBrand)

  function handleBrandChange(brandId) {
    setActiveBrand(brandId)
    setActiveCategory('전체')
  }

  const filtered = programs.filter(p => {
    if (p.brand !== activeBrand) return false
    if (activeCategory === '전체') return true
    return (p.categories?.name || '') === activeCategory
  })

  function renderCategoryChip(prog) {
    const catName = prog.categories?.name
    if (!catName) return null
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
        background: 'var(--primary-light)', color: 'var(--primary)',
        border: '1px solid var(--primary-border)',
      }}>
        {catName}
      </span>
    )
  }

  function handleSelect(prog) {
    if (!prog.recruit_start_date) {
      setDialogProg(prog)
      return
    }
    setSelectedProgram(prog)
    navigate(`/admin/${prog.id}/settings`)
  }

  function handleDialogComplete(updatedProg) {
    setDialogProg(null)
    setSelectedProgram(updatedProg)
    navigate(`/admin/${updatedProg.id}/settings`)
  }

  function handleDialogLater() {
    const prog = dialogProg
    setDialogProg(null)
    setSelectedProgram(prog)
    navigate(`/admin/${prog.id}/settings`)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '8vh' }}>
      <div style={{ width: 680, maxWidth: '92%', paddingBottom: 48 }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--gray-900)', letterSpacing: '-0.02em' }}>워크스페이스 선택</div>
            <div style={{ fontSize: 14, color: 'var(--gray-500)', marginTop: 4 }}>참여할 브랜드와 교육과정을 선택하세요.</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={async () => { await signOut(); navigate('/login') }}>
            로그아웃
          </button>
        </div>

        {/* 브랜드 탭 */}
        <div style={{ display: 'flex', marginBottom: 20, border: '1px solid var(--gray-200)', borderRadius: 10, overflow: 'hidden', background: '#fff', boxShadow: 'var(--shadow-sm)' }}>
          {BRANDS.map((b, i) => (
            <button key={b.id} onClick={() => handleBrandChange(b.id)}
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

        {/* 카테고리 칩 필터 */}
        {brandCategories.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {['전체', ...brandCategories.map(c => c.name)].map(name => (
              <button key={name} onClick={() => setActiveCategory(name)}
                style={{
                  padding: '5px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                  border: `1px solid ${activeCategory === name ? 'var(--primary)' : 'var(--gray-200)'}`,
                  background: activeCategory === name ? 'var(--primary-light)' : '#fff',
                  color: activeCategory === name ? 'var(--primary)' : 'var(--gray-600)',
                  cursor: 'pointer', transition: 'all .15s',
                }}>
                {name}
              </button>
            ))}
          </div>
        )}

        {/* 교육과정 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? (
            <div className="card"><div className="empty"><div className="empty-title">불러오는 중...</div></div></div>
          ) : filtered.length === 0 ? (
            <div className="card">
              <div className="empty">
                <div className="empty-title">등록된 교육과정이 없습니다.</div>
                <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 4 }}>
                  {BRANDS.find(b => b.id === activeBrand)?.label} 브랜드의 교육과정이 없어요.
                </div>
              </div>
            </div>
          ) : filtered.map(prog => {
            const status = getProgramStatus(prog)
            const catChip = renderCategoryChip(prog)
            const hasIP = !!prog.recruit_start_date

            return (
              <div key={prog.id} onClick={() => handleSelect(prog)}
                className="card"
                style={{ padding: '18px 24px', cursor: 'pointer', transition: 'all .2s', display: 'flex', alignItems: 'center', gap: 16 }}
                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = 'var(--primary-border)' }}
                onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'var(--gray-200)' }}>

                <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--primary-light)', flexShrink: 0 }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-900)' }}>{prog.title}</div>
                    <span className={`badge ${STATUS_COLOR[status]}`}>{STATUS_LABEL[status]}</span>
                    {catChip}
                    {!hasIP && <span className="badge b-orange">면접 기간 미설정</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                    면접 기간:{' '}
                    {prog.recruit_start_date
                      ? `${fmt(prog.recruit_start_date.split('T')[0])} ~ ${prog.recruit_end_date ? fmt(prog.recruit_end_date.split('T')[0]) : '미설정'}`
                      : '미설정'}
                  </div>
                </div>

                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            )
          })}
        </div>

        {!loading && filtered.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--gray-400)' }}>
            총 {filtered.length}개의 교육과정
          </div>
        )}
      </div>

      {dialogProg && (
        <InterviewSettingDialog
          prog={dialogProg}
          onComplete={handleDialogComplete}
          onLater={handleDialogLater}
        />
      )}
    </div>
  )
}