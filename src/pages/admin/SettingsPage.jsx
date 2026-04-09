import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useProgram } from '../../contexts/ProgramContext'
import { supabase } from '../../lib/supabase'

// 주말 포함/제외 일수 계산
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

// ── 날짜 범위 선택기 ────────────────────────────────────────
function DateRangePicker({ startDate, endDate, onChange }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [viewYear, setViewYear] = useState(() => {
    const d = startDate ? new Date(startDate) : new Date()
    return d.getFullYear()
  })
  const [viewMonth, setViewMonth] = useState(() => {
    const d = startDate ? new Date(startDate) : new Date()
    return d.getMonth()
  })
  const [hoverDate, setHoverDate] = useState(null)
  const [selecting, setSelecting] = useState(!startDate) // 첫 클릭 대기 여부

  const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
  const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

  function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate() }
  function getFirstDay(y, m) { return new Date(y, m, 1).getDay() }

  function toStr(y, m, d) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  function handleDayClick(ds) {
    if (!startDate || !selecting) {
      // 시작일 선택
      onChange(ds, null)
      setSelecting(true)
    } else {
      // 종료일 선택
      if (ds < startDate) {
        onChange(ds, startDate)
      } else {
        onChange(startDate, ds)
      }
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
    setViewMonth(m)
    setViewYear(y)
  }

  const dim = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDay(viewYear, viewMonth)
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)]
  while (cells.length % 7) cells.push(null)

  return (
    <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 10, overflow: 'hidden', userSelect: 'none' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--gray-100)', background: 'var(--gray-50)' }}>
        <button onClick={() => goMonth(-1)} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--gray-200)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>‹</button>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-900)' }}>{viewYear}년 {MONTHS[viewMonth]}</span>
        <button onClick={() => goMonth(1)} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--gray-200)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>›</button>
      </div>

      {/* 요일 헤더 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', padding: '8px 12px 4px' }}>
        {WEEKDAYS.map((w, i) => (
          <div key={w} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: i === 0 ? 'var(--danger)' : i === 6 ? 'var(--primary)' : 'var(--gray-500)', padding: '4px 0' }}>{w}</div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, padding: '0 12px 12px' }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const ds = toStr(viewYear, viewMonth, d)
          const isStart = ds === startDate
          const isEnd = ds === endDate
          const inRange = isInRange(ds)
          const isHover = selecting && ds === hoverDate && startDate
          const isSun = i % 7 === 0
          const isSat = i % 7 === 6

          let bg = 'transparent', color = isSun ? 'var(--danger)' : isSat ? 'var(--primary)' : 'var(--gray-800)'
          let borderRadius = 6, border = 'none'

          if (isStart || isEnd) { bg = 'var(--primary)'; color = '#fff' }
          else if (inRange) { bg = 'var(--primary-light)'; color = 'var(--primary)'; borderRadius = 0 }
          else if (isHover) { bg = 'var(--primary-light)'; color = 'var(--primary)' }

          if (isStart && endDate) borderRadius = '6px 0 0 6px'
          if (isEnd && startDate) borderRadius = '0 6px 6px 0'

          return (
            <div key={i}
              onClick={() => handleDayClick(ds)}
              onMouseEnter={() => setHoverDate(ds)}
              onMouseLeave={() => setHoverDate(null)}
              style={{
                textAlign: 'center', padding: '7px 0', fontSize: 13, fontWeight: (isStart || isEnd) ? 700 : 500,
                background: bg, color, borderRadius, border, cursor: 'pointer', transition: 'all .1s',
              }}>
              {d}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── 날짜+시간 입력 컴포넌트 ───────────────────────────────────
function DateTimeInput({ label, value, onChange }) {
  const dateVal = value ? value.split('T')[0] : ''
  const timeVal = value ? (value.split('T')[1] || '18:00') : '18:00'
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="form-input" type="date" value={dateVal}
          onChange={e => onChange(e.target.value ? `${e.target.value}T${timeVal}` : '')}
          style={{ flex: 1 }} />
        <input className="form-input" type="time" value={timeVal}
          onChange={e => onChange(dateVal ? `${dateVal}T${e.target.value}` : '')}
          style={{ width: 110 }} />
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ────────────────────────────────────────────
export default function SettingsPage() {
  const { progId } = useParams()
  const { selectedProgram, setSelectedProgram } = useProgram()

  const [form, setForm] = useState({
    recruitStart: '',
    recruitEnd: '',
    coDeadline: '',    // 기업 마감 (datetime)
    stDeadline: '',    // 면접자 마감 (datetime)
  })
  const [excludeWeekends, setExcludeWeekends] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [showDialog, setShowDialog] = useState(false)

  // 프로그램 로드 시 초기화
  useEffect(() => {
    if (!selectedProgram) return
    loadInterviewDate()
  }, [selectedProgram?.id])

  async function loadInterviewDate() {
    try {
      const { data } = await supabase
        .from('interview_date')
        .select('*')
        .eq('program_id', selectedProgram.id)
        .maybeSingle()
      const rs = data?.start_date || ''
      const re = data?.end_date || ''
      setForm(f => ({
        ...f,
        recruitStart: rs,
        recruitEnd: re,
        coDeadline: selectedProgram.pre_recruit_start_date || '',
        stDeadline: selectedProgram.pre_recruit_end_date || '',
      }))
      if (!rs) setShowDialog(true)
    } catch (e) {
      console.error(e)
      setShowDialog(true)
    }
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function handleSave(closeDialog = false) {
    setSaving(true)
    try {
      // interview_date 테이블에 upsert (program_id 기준)
      const { data: existing } = await supabase
        .from('interview_date')
        .select('id')
        .eq('program_id', progId)
        .maybeSingle()

      if (existing?.id) {
        const { error } = await supabase
          .from('interview_date')
          .update({
            start_date: form.recruitStart || null,
            end_date: form.recruitEnd || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('interview_date')
          .insert({
            program_id: progId,
            start_date: form.recruitStart || null,
            end_date: form.recruitEnd || null,
          })
        if (error) throw error
      }

      // 마감일시는 기존처럼 programs 테이블에 저장
      const { data, error: pe } = await supabase
        .from('programs')
        .update({
          pre_recruit_start_date: form.coDeadline || null,
          pre_recruit_end_date: form.stDeadline || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', progId)
        .select()
        .single()
      if (pe) throw pe
      setSelectedProgram(data)

      showToast('설정이 저장되었습니다.')
      if (closeDialog) setShowDialog(false)
    } catch (err) {
      showToast('저장 실패: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const dayCount = countDays(form.recruitStart, form.recruitEnd, excludeWeekends)
  const hasRange = !!(form.recruitStart && form.recruitEnd)

  // ── 초기 설정 다이얼로그 ──────────────────────────────────
  const Dialog = () => (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.45)',
      backdropFilter: 'blur(4px)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
    }}>
      <div style={{
        background: '#fff', borderRadius: 16,
        boxShadow: '0 20px 40px rgba(0,0,0,.15)',
        width: '100%', maxWidth: 680, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        {/* 다이얼로그 헤더 */}
        <div style={{ padding: '24px 32px 16px', borderBottom: '1px solid var(--gray-100)' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 4 }}>
            면접 기간을 설정해주세요.
          </div>
          <div style={{ fontSize: 14, color: 'var(--gray-500)' }}>
            교육과정의 면접 일정이 설정되지 않았습니다. 기본 설정을 완료해주세요.
          </div>
        </div>

        {/* 다이얼로그 바디 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 32px', background: 'var(--gray-50)' }}>

          {/* 달력 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 10 }}>
              📅 면접 진행 기간 선택
            </div>
            <DateRangePicker
              startDate={form.recruitStart}
              endDate={form.recruitEnd}
              onChange={(s, e) => setForm(f => ({ ...f, recruitStart: s || '', recruitEnd: e || '' }))}
            />
          </div>

          {/* 주말 제외 + 일수 카운트 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 8,
            background: '#fff', border: '1px solid var(--gray-200)', marginBottom: 20
          }}>
            <input type="checkbox" id="dlg-exc-wk" checked={excludeWeekends}
              onChange={e => setExcludeWeekends(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--primary)' }} />
            <label htmlFor="dlg-exc-wk" style={{ fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--gray-700)' }}>
              주말 제외
            </label>
            {hasRange ? (
              <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 10px', borderRadius: 999 }}>
                {fmt(form.recruitStart)} ~ {fmt(form.recruitEnd)} · 총 {dayCount}일
              </span>
            ) : (
              <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--gray-400)' }}>기간을 선택하면 자동 계산됩니다</span>
            )}
          </div>

          {/* 마감일시 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <DateTimeInput label="📋 기업 일정 제출 마감" value={form.coDeadline}
              onChange={v => setForm(f => ({ ...f, coDeadline: v }))} />
            <DateTimeInput label="👤 면접자 일정 제출 마감" value={form.stDeadline}
              onChange={v => setForm(f => ({ ...f, stDeadline: v }))} />
          </div>
        </div>

        {/* 다이얼로그 푸터 */}
        <div style={{ padding: '16px 32px', borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'flex-end', gap: 12, background: '#fff' }}>
          <button className="btn btn-secondary" onClick={() => setShowDialog(false)}>
            나중에 설정하기
          </button>
          <button className="btn btn-primary" onClick={() => handleSave(true)} disabled={saving || !hasRange}>
            {saving ? '저장 중...' : '완료'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      {showDialog && <Dialog />}

      {/* 페이지 헤더 */}
      <div className="page-header">
        <div>
          <div className="page-title">면접 설정</div>
          <div className="page-subtitle">현재 운영중인 프로젝트의 면접 기간 및 마감을 관리합니다.</div>
        </div>
        {!showDialog && (
          <button className="btn btn-secondary" onClick={() => setShowDialog(true)}>
            📅 기간 재설정
          </button>
        )}
      </div>

      {/* 프로그램 배너 */}
      {selectedProgram && (
        <div style={{
          background: 'linear-gradient(135deg,#2563EB,#7C3AED)',
          borderRadius: 12, padding: '20px 24px', marginBottom: 24
        }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{selectedProgram.title}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', marginTop: 4 }}>{selectedProgram.brand}</div>
        </div>
      )}

      {/* 현재 설정 카드 */}
      <div className="card" style={{ maxWidth: 700 }}>
        <div className="card-header">
          <div className="card-title">🗓 면접 가능 기간 설정</div>
        </div>
        <div className="card-body">

          {/* 달력 */}
          <div style={{ marginBottom: 16 }}>
            <DateRangePicker
              startDate={form.recruitStart}
              endDate={form.recruitEnd}
              onChange={(s, e) => setForm(f => ({ ...f, recruitStart: s || '', recruitEnd: e || '' }))}
            />
          </div>

          {/* 주말 제외 + 일수 카운트 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
            borderRadius: 8, background: 'var(--gray-50)', border: '1px solid var(--gray-200)', marginBottom: 28
          }}>
            <input type="checkbox" id="main-exc-wk" checked={excludeWeekends}
              onChange={e => setExcludeWeekends(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--primary)' }} />
            <label htmlFor="main-exc-wk" style={{ fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--gray-700)' }}>
              주말 제외
            </label>
            {hasRange ? (
              <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 10px', borderRadius: 999 }}>
                {fmt(form.recruitStart)} ~ {fmt(form.recruitEnd)} · 총 {dayCount}일
              </span>
            ) : (
              <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--gray-400)' }}>기간을 선택하면 자동 계산됩니다</span>
            )}
          </div>

          {/* 마감일시 */}
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--gray-200)' }}>
            ⏳ 기업 및 면접자 일정 제출 마감
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <DateTimeInput label="📋 기업 제출 마감" value={form.coDeadline}
              onChange={v => setForm(f => ({ ...f, coDeadline: v }))} />
            <DateTimeInput label="👤 면접자 제출 마감" value={form.stDeadline}
              onChange={v => setForm(f => ({ ...f, stDeadline: v }))} />
          </div>

          <button className="btn btn-primary btn-lg w-full"
            onClick={() => handleSave(false)} disabled={saving || !hasRange}>
            {saving ? '저장 중...' : '설정 적용 및 반영'}
          </button>
        </div>
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--gray-900)', color: '#fff', padding: '10px 20px',
          borderRadius: 999, fontSize: 14, fontWeight: 500, zIndex: 9999
        }}>
          ✓ {toast}
        </div>
      )}
    </div>
  )
}