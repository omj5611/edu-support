import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const MEET_SERVER_URL = 'https://meet-server-diix.onrender.com'

const LineIcon = {
  Calendar: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Bell: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
      <path d="M9 17a3 3 0 0 0 6 0" />
    </svg>
  ),
}

function normalizePhone(v) {
  return String(v || '').replace(/\D/g, '')
}

function normalizeBirth(v) {
  const s = String(v || '').trim()
  if (!s) return ''
  return s.replace(/\./g, '-').replace(/\//g, '-').replace(/\s/g, '')
}

function normalizeCompany(v) {
  return String(v || '').trim().toLowerCase()
}

function parseInviteCodeFromLink(link) {
  if (!link) return ''
  try {
    const url = new URL(link)
    return url.searchParams.get('room') || ''
  } catch (_) {
    return ''
  }
}

function toInternalPath(link) {
  if (!link) return ''
  try {
    const url = new URL(link, window.location.origin)
    if (url.origin !== window.location.origin) return link
    return `${url.pathname}${url.search}${url.hash}`
  } catch (_) {
    return link
  }
}

function makeDateKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function parseDateSafe(v) {
  if (!v) return null
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return null
  return d
}

function formatDateTimeNoSeconds(v) {
  const d = parseDateSafe(v)
  if (!d) return ''
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function DateCalendar({
  selectableDates,
  selectedDate,
  onSelectDate,
  viewYear,
  viewMonth,
  onChangeMonth,
}) {
  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
  const weekDays = ['일', '월', '화', '수', '목', '금', '토']
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div style={{ border: '1px solid var(--gray-200)', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--gray-100)', background: 'var(--gray-50)' }}>
        <button type="button" onClick={() => onChangeMonth(-1)}
          style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--gray-200)', background: '#fff', cursor: 'pointer' }}>
          ‹
        </button>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-900)' }}>{viewYear}년 {monthNames[viewMonth]}</span>
        <button type="button" onClick={() => onChangeMonth(1)}
          style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--gray-200)', background: '#fff', cursor: 'pointer' }}>
          ›
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '8px 10px 2px' }}>
        {weekDays.map((w, idx) => (
          <div key={w} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: idx === 0 ? 'var(--danger-text)' : idx === 6 ? 'var(--primary)' : 'var(--gray-500)', padding: '2px 0' }}>
            {w}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, padding: '0 10px 10px' }}>
        {cells.map((d, idx) => {
          if (!d) return <div key={`empty-${idx}`} />
          const dateKey = makeDateKey(viewYear, viewMonth, d)
          const selectable = selectableDates.has(dateKey)
          const isSelected = selectedDate === dateKey
          return (
            <button
              key={dateKey}
              type="button"
              disabled={!selectable}
              onClick={() => onSelectDate(dateKey)}
              style={{
                height: 34,
                borderRadius: 8,
                border: `1.5px solid ${isSelected ? 'var(--primary)' : selectable ? 'var(--gray-200)' : 'transparent'}`,
                background: isSelected ? 'var(--primary)' : selectable ? '#fff' : 'transparent',
                color: isSelected ? '#fff' : selectable ? 'var(--gray-700)' : 'var(--gray-300)',
                fontSize: 12,
                fontWeight: isSelected ? 700 : 500,
                cursor: selectable ? 'pointer' : 'not-allowed',
              }}>
              {d}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ScheduleSelectModal({
  open,
  row,
  schedule,
  slotState,
  selectedDate,
  selectedSlot,
  onClose,
  onPickDate,
  onPickSlot,
  onChangeMonth,
  onSubmit,
  submitting,
  canEdit,
  isBooked,
  isEditMode,
}) {
  if (!open || !row) return null

  const selectedDateSlots = (slotState?.slots || []).filter(s => s.date === selectedDate)
  const selectableDates = new Set((slotState?.slots || []).map(s => s.date))

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.45)', backdropFilter: 'blur(4px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="schedule-select-modal" style={{ width: '100%', maxWidth: 980, maxHeight: '82vh', background: '#fff', borderRadius: 16, border: '1px solid var(--gray-200)', boxShadow: '0 20px 44px rgba(2,6,23,.22)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="schedule-select-modal-header" style={{ padding: '16px 18px', borderBottom: '1px solid var(--gray-200)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--gray-900)' }}>{row.companyName}</div>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>
              {row.program?.title || '-'} · {isBooked ? (isEditMode ? '일정 수정' : '일정 확인') : '일정 선택'}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>닫기</button>
        </div>

        <div style={{ padding: 18, flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {!row.setting ? (
            <div style={{ fontSize: 13, color: 'var(--gray-400)' }}>기업에서 아직 면접 설정을 제출하지 않았습니다.</div>
          ) : !canEdit && (isEditMode || !isBooked) ? (
            <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 12, padding: '12px 14px', fontSize: 13, color: 'var(--gray-600)' }}>
              제출 마감일이 지나 일정 변경/선택이 불가능합니다.
            </div>
          ) : (
            <div className="schedule-select-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 1fr)', gap: 14, alignItems: 'stretch', height: '100%', minHeight: 0 }}>
              <DateCalendar
                selectableDates={selectableDates}
                selectedDate={selectedDate}
                onSelectDate={(date) => onPickDate(row.app.id, date)}
                viewYear={slotState?.viewYear || new Date().getFullYear()}
                viewMonth={slotState?.viewMonth ?? new Date().getMonth()}
                onChangeMonth={(delta) => onChangeMonth(row, delta)}
              />
              <div className="schedule-select-time-panel" style={{ border: '1px solid var(--gray-200)', borderRadius: 12, background: '#fff', padding: 14, display: 'flex', flexDirection: 'column', minHeight: 0, maxHeight: '52vh' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gray-800)', marginBottom: 10, flexShrink: 0 }}>
                  {selectedDate ? `${selectedDate} 시간 선택` : '시간 선택'}
                </div>
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 4 }}>
                  {selectedDate ? (
                    selectedDateSlots.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>선택한 날짜에 선택 가능한 시간이 없습니다.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {selectedDateSlots.map(slot => {
                          const selected = selectedSlot?.date === slot.date && selectedSlot?.start === slot.start
                          const full = slot.capacity > 0 && slot.bookedCount >= slot.capacity
                          return (
                            <button
                              key={`${slot.date}-${slot.start}`}
                              type="button"
                              disabled={full}
                              onClick={() => onPickSlot(row.app.id, slot)}
                              style={{
                                borderRadius: 10,
                                border: `1px solid ${selected ? 'var(--primary)' : 'var(--gray-200)'}`,
                                background: selected ? 'var(--primary-light)' : '#fff',
                                padding: '10px 12px',
                                textAlign: 'left',
                                cursor: full ? 'not-allowed' : 'pointer',
                                opacity: full ? 0.55 : 1,
                              }}>
                              <div style={{ fontSize: 13, fontWeight: 800, color: selected ? 'var(--primary)' : 'var(--gray-800)' }}>
                                {slot.start} ~ {slot.end}
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 3 }}>
                                {slot.capacity > 0 ? `${slot.bookedCount}/${slot.capacity} 선택 가능` : '선택 가능'}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>먼저 날짜를 선택해주세요.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '14px 18px', borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'flex-end', gap: 8, background: '#fff' }}>
          {isBooked && isEditMode && (
            <button className="btn btn-ghost" onClick={onClose}>취소</button>
          )}
          <button
            className="btn btn-primary"
            disabled={!selectedSlot || submitting || (!canEdit && (isEditMode || !isBooked))}
            onClick={() => onSubmit(row, selectedSlot)}
          >
            {submitting ? '예약 중...' : (isBooked ? '일정 수정 제출' : '제출하기')}
          </button>
        </div>
      </div>
    </div>
  )
}

function MyInterviews({
  rows,
  scheduleMap,
  canEditByProgram,
  editModeMap,
  onToggleEdit,
  submissionDeadlineText,
  onOpenSchedule,
}) {
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">내 면접</div>
          <div className="page-subtitle">기업별 면접 일정 예약 및 확인</div>
          {submissionDeadlineText && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--gray-500)' }}>
              면접자 제출 마감일: <b style={{ color: 'var(--gray-800)' }}>{submissionDeadlineText}</b>
            </div>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="empty-title">매칭된 면접 정보가 없습니다.</div>
            <div className="empty-desc">이름/생년월일/전화번호가 지원서와 일치하는지 확인해주세요.</div>
          </div>
        </div>
      ) : (
        <div className="my-interview-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 320px))', gap: 14, justifyContent: 'flex-start' }}>
          {rows.map(row => {
            const schedule = scheduleMap[row.app.id]
            const canEdit = canEditByProgram[row.app.program_id] ?? true
            const isBooked = !!schedule
            const isEditMode = !!editModeMap[row.app.id]
            const selectionStatus = isBooked ? '일정 선택 완료' : '일정 선택 전'
            const isEvalShared = !!row.app.form_data?.evaluation_shared
            const stageText = isEvalShared ? (row.app.stage || '평가 전') : '평가 전'
            const modeText = row.setting?.interview_mode === 'online' ? '비대면' : '대면'
            const typeText = row.setting?.interview_type === '1on1'
              ? '1:1'
              : `그룹(최대 ${row.setting?.group_max_count || '-'}명)`
            const minutesText = row.setting?.slot_minutes ? `${row.setting.slot_minutes}분` : null
            const metaLine = [stageText, modeText, typeText, minutesText].filter(Boolean).join(' · ')
            const meetingPath = schedule?.meeting_link ? toInternalPath(schedule.meeting_link) : ''
            const meetingIsInternal = !!meetingPath && meetingPath.startsWith('/')

            return (
              <div key={row.app.id} className="card" style={{ overflow: 'hidden' }}>
                <div className="card-header my-interview-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div>
                    <div className="card-title">{row.companyName}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>{row.program?.title || '-'}</div>
                  </div>
                  <div className="my-interview-card-meta" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, textAlign: 'right' }}>
                    <span className={`badge ${selectionStatus === '일정 선택 완료' ? 'b-green' : 'b-gray'}`}>
                      {selectionStatus}
                    </span>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', lineHeight: 1.35 }}>
                      {metaLine}
                    </div>
                  </div>
                </div>

                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {isBooked && (
                    <div style={{ background: 'var(--primary-light)', border: '1px solid var(--primary-border)', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>내 면접 일정</div>
                      <div style={{ fontSize: 14, color: 'var(--gray-800)' }}>
                        {schedule.scheduled_date} {schedule.scheduled_start_time} ~ {schedule.scheduled_end_time}
                      </div>
                      {row.setting?.interview_mode === 'online' && schedule.meeting_link && (
                        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          {meetingIsInternal ? (
                            <Link
                              to={meetingPath}
                              className="btn btn-primary btn-sm"
                              style={{ textDecoration: 'none' }}>
                              화상 링크 접속
                            </Link>
                          ) : (
                            <a
                              href={schedule.meeting_link}
                              className="btn btn-primary btn-sm"
                              style={{ textDecoration: 'none' }}>
                              화상 링크 접속
                            </a>
                          )}
                          <span style={{ fontSize: 12, color: 'var(--gray-600)' }}>
                            초대코드: <b>{parseInviteCodeFromLink(schedule.meeting_link) || '-'}</b>
                          </span>
                        </div>
                      )}
                      <div style={{ marginTop: 10, fontSize: 12, color: 'var(--gray-500)' }}>
                        AI 면접 리포트는 기업/운영진에서만 확인할 수 있습니다.
                      </div>
                      {row.setting?.interview_mode === 'face' && (schedule.face_address || row.setting?.face_address) && (
                        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--gray-600)' }}>장소: {schedule.face_address || row.setting?.face_address}</div>
                      )}
                    </div>
                  )}

                  {!row.setting ? (
                    <div style={{ fontSize: 13, color: 'var(--gray-400)' }}>기업에서 아직 면접 설정을 제출하지 않았습니다.</div>
                  ) : !canEdit ? (
                    <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: 'var(--gray-500)' }}>
                      제출 마감일 이후로는 수정할 수 없습니다.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      {isBooked && canEdit && !isEditMode && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => { onToggleEdit(row.app.id, true); onOpenSchedule(row) }}>
                          수정하기
                        </button>
                      )}
                      {(!isBooked || isEditMode) && (
                        <>
                          <button className="btn btn-primary btn-sm" onClick={() => onOpenSchedule(row)}>
                            면접 일정 선택하기
                          </button>
                          {isBooked && isEditMode && (
                            <button className="btn btn-ghost btn-sm" onClick={() => onToggleEdit(row.app.id, false)}>
                              취소
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StudentNotices({ brand }) {
  const [loading, setLoading] = useState(true)
  const [notices, setNotices] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        let query = supabase
          .from('notices')
          .select('*')
          .in('type', ['interview-all', 'interview-students'])
          .eq('is_archived', false)
          .eq('is_hidden', false)
          .order('is_fixed', { ascending: false })
          .order('created_at', { ascending: false })
        if (brand) query = query.eq('brand', brand)
        const { data, error } = await query
        if (error) throw error
        setNotices(data || [])
      } catch (e) {
        console.error('공지 조회 실패:', e)
        setNotices([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [brand])

  if (selected) {
    return (
      <div>
        <div className="page-header">
          <div>
            <div className="page-title">공지사항</div>
          </div>
          <button className="btn btn-secondary" onClick={() => setSelected(null)}>목록으로</button>
        </div>
        <div className="card">
          <div className="card-body">
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>{selected.title}</h2>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 20 }}>
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
          <div className="page-subtitle">면접자 대상 공지를 확인하세요.</div>
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
                  <tr key={n.id} className="clickable" onClick={() => setSelected(n)} style={{ background: n.is_fixed ? 'var(--primary-light)' : '' }}>
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
                    <td style={{ fontSize: 13, color: 'var(--gray-500)' }}>{new Date(n.created_at).toLocaleDateString('ko-KR')}</td>
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

function downloadDataUrl(dataUrl, filename) {
  try {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = filename || 'download'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  } catch (e) {
    console.warn(e)
  }
}

function wrapPdfLines(text, maxLen = 46) {
  const out = []
  const raw = String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
  for (const line of raw) {
    if (!line) {
      out.push('')
      continue
    }
    let s = line
    while (s.length > maxLen) {
      out.push(s.slice(0, maxLen))
      s = s.slice(maxLen)
    }
    out.push(s)
  }
  return out
}

async function loadJsPdf() {
  if (typeof window === 'undefined') return null
  if (window.jspdf?.jsPDF) return window.jspdf.jsPDF
  await new Promise((resolve, reject) => {
    const src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      existing.addEventListener('load', resolve)
      existing.addEventListener('error', reject)
      return
    }
    const s = document.createElement('script')
    s.src = src
    s.crossOrigin = 'anonymous'
    s.onload = resolve
    s.onerror = reject
    document.head.appendChild(s)
  })
  return window.jspdf?.jsPDF || null
}

function AiReportModal({
  open,
  row,
  schedule,
  report,
  loading,
  error,
  onClose,
}) {
  const [ssOpen, setSsOpen] = useState(false)
  const [ssChecked, setSsChecked] = useState([])

  useEffect(() => {
    if (!open) return
    setSsOpen(false)
    setSsChecked([])
  }, [open])

  if (!open || !row) return null

  const programTitle = row.program?.title || '-'
  const companyName = row.companyName || '-'
  const interviewDate = schedule?.scheduled_date || '-'
  const startTime = schedule?.scheduled_start_time || ''
  const endTime = schedule?.scheduled_end_time || ''
  const durationMin = report?.duration_minutes || null

  const keywords = Array.isArray(report?.report_json?.keywords) ? report.report_json.keywords : []
  const scores = Array.isArray(report?.report_json?.scores) ? report.report_json.scores : []
  const strengths = Array.isArray(report?.report_json?.strengths) ? report.report_json.strengths : []
  const improvements = Array.isArray(report?.report_json?.improvements) ? report.report_json.improvements : []
  const risk = report?.report_json?.riskDetail || null
  const totalScore = report?.report_json?.totalScore ?? null
  const verdict = report?.report_json?.verdict || ''

  const transcripts = Array.isArray(report?.transcripts) ? report.transcripts : []
  const behaviorLogs = Array.isArray(report?.behavior_logs) ? report.behavior_logs : []
  const screenshots = Array.isArray(report?.screenshots) ? report.screenshots : []

  const transcriptSorted = transcripts
    .map((t) => ({
      ...t,
      _ts: t?.ts ? new Date(t.ts) : null,
    }))
    .sort((a, b) => (a._ts?.getTime?.() || 0) - (b._ts?.getTime?.() || 0))

  async function onDownloadPdf() {
    try {
      const JsPDF = await loadJsPdf()
      if (!JsPDF) {
        alert('PDF 모듈을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
        return
      }
      const doc = new JsPDF({ unit: 'pt', format: 'a4' })
      const margin = 44
      const pageW = doc.internal.pageSize.getWidth()
      const pageH = doc.internal.pageSize.getHeight()
      const maxW = pageW - margin * 2
      let y = margin

      const write = (lines, fontSize = 11, gap = 6) => {
        doc.setFontSize(fontSize)
        for (const line of lines) {
          if (y > pageH - margin) {
            doc.addPage()
            y = margin
          }
          doc.text(String(line), margin, y, { maxWidth: maxW })
          y += fontSize + gap
        }
      }

      write([`${programTitle} — AI 면접 리포트`], 14, 8)
      write([`${companyName}`, `${interviewDate} ${startTime}${endTime ? ` ~ ${endTime}` : ''}${durationMin ? ` · ${durationMin}분` : ''}`], 11, 6)
      y += 6

      if (keywords.length) {
        write(['[키워드]'], 12, 6)
        write(wrapPdfLines(keywords.join(' / '), 60), 10, 4)
        y += 6
      }
      if (report?.summary_raw) {
        write(['[AI 요약본]'], 12, 6)
        write(wrapPdfLines(report.summary_raw, 70), 10, 4)
        y += 6
      }
      if (scores.length) {
        write(['[항목별 점수]'], 12, 6)
        scores.forEach((s) => write([`- ${s.criterion || '항목'}: ${s.score ?? '-'} / 5`], 10, 4))
        y += 6
      }
      if (strengths.length) {
        write(['[강점]'], 12, 6)
        strengths.forEach((t) => write([`- ${t}`], 10, 4))
        y += 6
      }
      if (improvements.length) {
        write(['[보완점]'], 12, 6)
        improvements.forEach((t) => write([`- ${t}`], 10, 4))
        y += 6
      }
      if (risk?.level) {
        write(['[위험감지]'], 12, 6)
        write([`레벨: ${risk.level}`], 10, 4)
        if (Array.isArray(risk.factors) && risk.factors.length) {
          risk.factors.forEach((t) => write([`- ${t}`], 10, 4))
        }
        if (risk.evidence) write(wrapPdfLines(String(risk.evidence), 70), 10, 4)
        y += 6
      }
      write(['[종합]'], 12, 6)
      write([`종합점수: ${totalScore ?? '-'} / 100`, `판정: ${verdict || '-'}`], 10, 4)

      doc.save(`${companyName}_AI리포트_${interviewDate || ''}.pdf`)
    } catch (e) {
      alert(`PDF 다운로드 실패: ${e.message}`)
    }
  }

  function toggleSs(idx) {
    setSsChecked((prev) => prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx])
  }

  function downloadSelectedScreenshots() {
    const targets = ssChecked.length ? ssChecked : []
    if (!targets.length) return
    targets.sort((a, b) => a - b).forEach((idx) => {
      const url = screenshots[idx]
      if (url) downloadDataUrl(url, `screenshot_${idx + 1}.jpg`)
    })
  }

  function downloadAllScreenshots() {
    screenshots.forEach((url, idx) => {
      if (url) downloadDataUrl(url, `screenshot_${idx + 1}.jpg`)
    })
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.55)', backdropFilter: 'blur(6px)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div style={{ width: '100%', maxWidth: 1120, maxHeight: '86vh', background: '#fff', borderRadius: 16, border: '1px solid var(--gray-200)', boxShadow: '0 24px 60px rgba(2,6,23,.28)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--gray-200)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--gray-500)' }}>[{programTitle}]</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--gray-900)', marginTop: 2 }}>AI 면접 리포트</div>
            <div style={{ fontSize: 12, color: 'var(--gray-600)', marginTop: 6 }}>
              {interviewDate} {startTime}{endTime ? ` ~ ${endTime}` : ''}{durationMin ? ` · 총 소요 ${durationMin}분` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setSsOpen(true)} disabled={!screenshots.length || loading}>
              스크린샷 확인하기
            </button>
            <button className="btn btn-primary btn-sm" onClick={onDownloadPdf} disabled={loading}>
              PDF 다운로드
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>닫기</button>
          </div>
        </div>

        <div style={{ padding: 18, background: 'var(--gray-50)', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {loading ? (
            <div className="card"><div className="empty"><div className="empty-title">불러오는 중...</div></div></div>
          ) : error ? (
            <div className="card"><div className="empty"><div className="empty-title">리포트를 불러오지 못했습니다.</div><div className="empty-desc">{error}</div></div></div>
          ) : !report ? (
            <div className="card"><div className="empty"><div className="empty-title">AI 면접 리포트가 없습니다.</div></div></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 14, height: '100%' }}>
              <div className="card" style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <div className="card-header" style={{ flexShrink: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="card-title">키워드 · 대화록</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>{companyName}</div>
                  </div>
                </div>
                <div className="card-body" style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {keywords.length ? keywords.map((k, idx) => (
                      <span key={`${k}-${idx}`} className="badge b-blue" style={{ fontSize: 11 }}>{k}</span>
                    )) : <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>키워드 없음</span>}
                  </div>
                  <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', border: '1px solid var(--gray-200)', borderRadius: 12, background: '#fff', padding: 12 }}>
                    {transcriptSorted.length ? transcriptSorted.map((t, idx) => (
                      <div key={idx} style={{ padding: '6px 0', borderBottom: idx === transcriptSorted.length - 1 ? 'none' : '1px solid var(--gray-100)' }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gray-800)' }}>
                          {t.speaker || '-'}
                          {t._ts && (
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', marginLeft: 8 }}>
                              {t._ts.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--gray-700)', marginTop: 3, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                          {t.text || ''}
                        </div>
                      </div>
                    )) : (
                      <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>대화록이 없습니다.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="card" style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <div className="card-header" style={{ flexShrink: 0 }}>
                  <div className="card-title">AI 분석</div>
                </div>
                <div className="card-body" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                    <div style={{ border: '1px solid var(--gray-200)', borderRadius: 12, background: '#fff', padding: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-500)', marginBottom: 6 }}>종합점수</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--gray-900)' }}>{totalScore ?? '-'}</div>
                    </div>
                    <div style={{ border: '1px solid var(--gray-200)', borderRadius: 12, background: '#fff', padding: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-500)', marginBottom: 6 }}>판정</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--gray-900)' }}>{verdict || '-'}</div>
                    </div>
                  </div>

                  <div style={{ border: '1px solid var(--gray-200)', borderRadius: 12, background: '#fff', padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--gray-800)', marginBottom: 8 }}>AI 요약본</div>
                    <div style={{ fontSize: 13, color: 'var(--gray-700)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                      {report.summary_raw || '-'}
                    </div>
                  </div>

                  <div style={{ border: '1px solid var(--gray-200)', borderRadius: 12, background: '#fff', padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--gray-800)', marginBottom: 8 }}>항목별 점수</div>
                    {scores.length ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {scores.map((s, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 10px', border: '1px solid var(--gray-200)', borderRadius: 10, background: 'var(--gray-50)' }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--gray-800)' }}>{s.criterion || '항목'}</div>
                            <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--primary)' }}>{s.score ?? '-'}/5</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>점수 정보가 없습니다.</div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
                    <div style={{ border: '1px solid var(--gray-200)', borderRadius: 12, background: '#fff', padding: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--gray-800)', marginBottom: 8 }}>강점</div>
                      {strengths.length ? strengths.map((t, idx) => (
                        <div key={idx} style={{ fontSize: 13, color: 'var(--gray-700)', lineHeight: 1.7 }}>- {t}</div>
                      )) : <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>없음</div>}
                    </div>
                    <div style={{ border: '1px solid var(--gray-200)', borderRadius: 12, background: '#fff', padding: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--gray-800)', marginBottom: 8 }}>보완점</div>
                      {improvements.length ? improvements.map((t, idx) => (
                        <div key={idx} style={{ fontSize: 13, color: 'var(--gray-700)', lineHeight: 1.7 }}>- {t}</div>
                      )) : <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>없음</div>}
                    </div>
                  </div>

                  <div style={{ border: '1px solid var(--gray-200)', borderRadius: 12, background: '#fff', padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--gray-800)', marginBottom: 8 }}>위험감지</div>
                    <div style={{ fontSize: 13, color: 'var(--gray-700)' }}>
                      레벨: <b style={{ color: 'var(--gray-900)' }}>{risk?.level || '-'}</b>
                    </div>
                    {Array.isArray(risk?.factors) && risk.factors.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        {risk.factors.map((t, idx) => (
                          <div key={idx} style={{ fontSize: 13, color: 'var(--gray-700)', lineHeight: 1.7 }}>- {t}</div>
                        ))}
                      </div>
                    )}
                    {risk?.evidence && (
                      <div style={{ marginTop: 8, fontSize: 13, color: 'var(--gray-700)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                        {String(risk.evidence)}
                      </div>
                    )}
                  </div>

                  <div style={{ border: '1px solid var(--gray-200)', borderRadius: 12, background: '#fff', padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--gray-800)', marginBottom: 8 }}>종합 평가</div>
                    <div style={{ fontSize: 13, color: 'var(--gray-700)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                      {report?.report_json?.summary || '-'}
                    </div>
                  </div>

                  <div style={{ border: '1px solid var(--gray-200)', borderRadius: 12, background: '#fff', padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--gray-800)', marginBottom: 8 }}>행동 로그</div>
                    {behaviorLogs.length ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {behaviorLogs.map((b, idx) => (
                          <div key={idx} style={{ fontSize: 12, color: 'var(--gray-700)', background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 10, padding: '8px 10px', whiteSpace: 'pre-wrap' }}>
                            {typeof b === 'string' ? b : JSON.stringify(b)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>없음</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {ssOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.65)', zIndex: 4500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}
          onClick={(e) => { if (e.target === e.currentTarget) setSsOpen(false) }}
        >
          <div style={{ width: '100%', maxWidth: 980, maxHeight: '86vh', background: '#fff', borderRadius: 16, border: '1px solid var(--gray-200)', boxShadow: '0 24px 60px rgba(2,6,23,.28)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 900 }}>스크린샷 미리보기</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary btn-sm" disabled={!ssChecked.length} onClick={downloadSelectedScreenshots}>선택 다운로드</button>
                <button className="btn btn-primary btn-sm" onClick={downloadAllScreenshots}>전체 다운로드</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setSsOpen(false)}>닫기</button>
              </div>
            </div>
            <div style={{ padding: 16, background: 'var(--gray-50)', flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                {screenshots.map((url, idx) => {
                  const checked = ssChecked.includes(idx)
                  return (
                    <div key={idx} style={{ border: '1px solid var(--gray-200)', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
                      <div style={{ position: 'relative', background: '#000' }}>
                        <img src={url} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                        <label style={{ position: 'absolute', top: 10, left: 10, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.9)', padding: '6px 8px', borderRadius: 999, border: '1px solid var(--gray-200)', cursor: 'pointer' }}>
                          <input type="checkbox" checked={checked} onChange={() => toggleSs(idx)} style={{ width: 14, height: 14, accentColor: 'var(--primary)' }} />
                          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--gray-800)' }}>선택</span>
                        </label>
                      </div>
                      <div style={{ padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ fontSize: 12, color: 'var(--gray-600)' }}>#{idx + 1}</div>
                        <button className="btn btn-secondary btn-sm" onClick={() => downloadDataUrl(url, `screenshot_${idx + 1}.jpg`)}>다운로드</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function StudentRouter() {
  const { user, profile, brand, signOut } = useAuth()
  const navigate = useNavigate()

  const [menu, setMenu] = useState('interviews')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [rows, setRows] = useState([])
  const [programMap, setProgramMap] = useState({})
  const [scheduleMap, setScheduleMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [submittingId, setSubmittingId] = useState('')
  const [toast, setToast] = useState('')

  const [slotLoadMap, setSlotLoadMap] = useState({})
  const [selectedDateMap, setSelectedDateMap] = useState({})
  const [selectedSlotMap, setSelectedSlotMap] = useState({})
  const [editModeMap, setEditModeMap] = useState({})
  const [showAlertPanel, setShowAlertPanel] = useState(false)
  const [alerts, setAlerts] = useState([])
  const [alertUnread, setAlertUnread] = useState(0)
  const [isTabletMobile, setIsTabletMobile] = useState(() => window.innerWidth <= 1024)
  const [alertPanelPos, setAlertPanelPos] = useState({ top: 0, left: 0 })
  const alertBtnRef = useRef(null)
  const topAlertBtnRef = useRef(null)
  const alertPanelRef = useRef(null)

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [scheduleModalRow, setScheduleModalRow] = useState(null)
  const [aiReportOpen, setAiReportOpen] = useState(false)
  const [aiReportRow, setAiReportRow] = useState(null)
  const [aiReportLoading, setAiReportLoading] = useState(false)
  const [aiReportError, setAiReportError] = useState('')
  const [aiReport, setAiReport] = useState(null)
  const [aiReportExistsMap, setAiReportExistsMap] = useState({})
  const rowAppIdsKey = useMemo(() => (
    rows.map(r => r?.app?.id).filter(Boolean).sort().join(',')
  ), [rows])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2600)
  }

  const myName = profile?.name || profile?.metadata?.name || user?.user_metadata?.name || ''
  const myBirth = normalizeBirth(profile?.metadata?.birth || user?.user_metadata?.birth || '')
  const myPhone = normalizePhone(profile?.phone || profile?.metadata?.phone || user?.user_metadata?.phone || '')
  const appIds = useMemo(() => rows.map((r) => r?.app?.id).filter(Boolean), [rowAppIdsKey])

  const refreshAiReportExists = useCallback(async () => {
    if (!appIds.length) {
      setAiReportExistsMap({})
      return
    }
    try {
      const { data, error } = await supabase
        .from('interview_ai_reports')
        .select('application_id')
        .in('application_id', appIds)
      if (error) throw error
      const exists = {}
      ;(data || []).forEach((row) => {
        if (row?.application_id) exists[row.application_id] = true
      })
      setAiReportExistsMap(exists)
      if (aiReportOpen && aiReportRow?.app?.id && !exists[aiReportRow.app.id]) {
        setAiReport(null)
        setAiReportError('해당 면접자의 AI 리포트가 삭제되었습니다.')
      }
    } catch (e) {
      console.error('ai report existence load failed:', e)
      setAiReportExistsMap({})
    }
  }, [appIds, aiReportOpen, aiReportRow])

  async function openAiReport(row) {
    const appId = row?.app?.id
    if (!appId) return
    setAiReportOpen(true)
    setAiReportRow(row)
    setAiReportLoading(true)
    setAiReportError('')
    setAiReport(null)
    try {
      const { data, error } = await supabase
        .from('interview_ai_reports')
        .select('id, created_at, duration_minutes, summary_raw, report_json, transcripts, behavior_logs, screenshots, interviewee_name, interviewer_name')
        .eq('application_id', appId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      setAiReport(data || null)
    } catch (e) {
      setAiReportError(e.message || '조회 실패')
    } finally {
      setAiReportLoading(false)
    }
  }

  const canEditByProgram = useMemo(() => {
    const out = {}
    Object.values(programMap).forEach((p) => {
      const deadline = p?.pre_recruit_end_date
      if (!deadline) {
        out[p.id] = true
        return
      }
      const now = new Date()
      const d = parseDateSafe(deadline)
      out[p.id] = d ? now <= d : true
    })
    return out
  }, [programMap])

  useEffect(() => {
    if (!user?.id) return
    loadAll()
  }, [user?.id, myName, myBirth, myPhone])

  // 기업/운영진이 평가(stage)를 바꾸면 면접자 화면에서도 바로 반영되도록 applications 변경을 구독합니다.
  useEffect(() => {
    if (!user?.id) return
    if (!rows.length) return
    const appIds = rows.map(r => r.app.id).filter(Boolean)
    if (!appIds.length) return

    const channel = supabase
      .channel(`student-app-updates-${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'applications' }, (payload) => {
        const next = payload.new
        if (!next?.id) return
        if (!appIds.includes(next.id)) return
        // stage(평가 상태) 등 즉시 반영
        setRows((prev) => prev.map((r) => (
          r.app.id === next.id
            ? { ...r, app: { ...r.app, stage: next.stage, form_data: next.form_data } }
            : r
        )))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [rowAppIdsKey, user?.id])

  useEffect(() => {
    refreshAiReportExists()
  }, [refreshAiReportExists])

  useEffect(() => {
    if (!appIds.length) return
    const channel = supabase
      .channel(`student-ai-report-updates-${user?.id || 'anonymous'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interview_ai_reports' }, (payload) => {
        const next = payload.new
        const prev = payload.old
        const touchedId = next?.application_id || prev?.application_id
        if (!touchedId || !appIds.includes(touchedId)) return
        refreshAiReportExists()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [appIds, refreshAiReportExists, user?.id])

  async function loadAll() {
    if (!myName || !myBirth || !myPhone) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data: apps, error } = await supabase
        .from('applications')
        .select('*')
        .eq('application_type', 'interview')
        .eq('name', myName)
        .order('created_at', { ascending: false })
      if (error) throw error

      const matchedApps = (apps || []).filter((a) => {
        const fd = a.form_data || {}
        const appBirth = normalizeBirth(fd.birth || a.birth || '')
        const appPhone = normalizePhone(fd.phone || a.phone || '')
        return appBirth === myBirth && appPhone === myPhone
      })

      if (matchedApps.length === 0) {
        setRows([])
        setProgramMap({})
        setScheduleMap({})
        return
      }

      const programIds = [...new Set(matchedApps.map(a => a.program_id).filter(Boolean))]
      const companyNames = [...new Set(matchedApps.map(a => a.form_data?.company_name).filter(Boolean))]
      const appIds = matchedApps.map(a => a.id)

      const [{ data: programs }, { data: settings }, { data: schedules }, { data: teams }] = await Promise.all([
        supabase.from('programs').select('*').in('id', programIds),
        supabase.from('interview_settings').select('*').in('program_id', programIds).eq('status', 'submitted'),
        supabase.from('interview_schedules').select('*').in('application_id', appIds).neq('status', 'cancelled'),
        supabase.from('program_teams').select('id,name,program_id').in('program_id', programIds),
      ])

      const pMap = {}
      ;(programs || []).forEach((p) => { pMap[p.id] = p })

      const sMap = {}
      ;(schedules || []).forEach((s) => { sMap[s.application_id] = s })
      const teamNameById = new Map((teams || []).map(t => [String(t.id), t.name]))

      const resultRows = matchedApps.map((app) => {
        const companyName = app.form_data?.company_name || '미분류'
        const setting = (settings || []).find(
          st => st.program_id === app.program_id && normalizeCompany((st.company_name || teamNameById.get(String(st.program_teams_id)) || '')) === normalizeCompany(companyName),
        )
        return {
          app,
          companyName,
          setting,
          program: pMap[app.program_id] || null,
        }
      })

      setRows(resultRows)
      setProgramMap(pMap)
      setScheduleMap(sMap)

      const nextSlotState = {}
      const nextSelectedDateMap = {}
      resultRows.forEach((row) => {
        const now = new Date()
        const y = now.getFullYear()
        const m = now.getMonth()
        nextSlotState[row.app.id] = {
          viewYear: y,
          viewMonth: m,
          slots: buildSlots(row, sMap[row.app.id], schedules || []),
        }
        if (sMap[row.app.id]?.scheduled_date) {
          nextSelectedDateMap[row.app.id] = sMap[row.app.id].scheduled_date
        }
      })
      setSlotLoadMap(nextSlotState)
      setSelectedDateMap(nextSelectedDateMap)
      setSelectedSlotMap({})
      setEditModeMap({})

      if (brand && companyNames.length === 0) {
        console.info('브랜드 기반 공지만 노출:', brand)
      }
    } catch (e) {
      console.error('면접자 대시보드 로드 실패:', e)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  function buildSlots(row, mySchedule, allSchedules) {
    const settingSlots = row.setting?.available_slots || []
    const groupMax = Number(row.setting?.interview_type === 'group' ? row.setting?.group_max_count || 0 : 1)
    const capacity = groupMax > 0 ? groupMax : 1

    const normalized = []
    settingSlots.forEach((daySlot) => {
      const date = daySlot?.date
      const tss = daySlot?.timeSlots || daySlot?.time_slots || []
      tss.forEach((ts) => {
        if (!date || !ts?.start || !ts?.end) return
        const bookedCount = (allSchedules || []).filter((s) => (
          s.program_id === row.app.program_id &&
          normalizeCompany(s.company_name) === normalizeCompany(row.companyName) &&
          s.scheduled_date === date &&
          s.scheduled_start_time === ts.start &&
          s.status !== 'cancelled'
        )).length

        normalized.push({
          date,
          start: ts.start,
          end: ts.end,
          bookedCount,
          capacity,
        })
      })
    })

    return normalized.sort((a, b) => (
      a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date)
    ))
  }

  async function onLoadSlots(row, monthDelta) {
    setSlotLoadMap((prev) => {
      const cur = prev[row.app.id] || { viewYear: new Date().getFullYear(), viewMonth: new Date().getMonth(), slots: [] }
      let y = cur.viewYear
      let m = cur.viewMonth + monthDelta
      if (m < 0) { m = 11; y -= 1 }
      if (m > 11) { m = 0; y += 1 }
      return { ...prev, [row.app.id]: { ...cur, viewYear: y, viewMonth: m } }
    })

    const { data: schedules } = await supabase
      .from('interview_schedules')
      .select('*')
      .eq('program_id', row.app.program_id)
      .eq('company_name', row.companyName)
      .neq('status', 'cancelled')

    setSlotLoadMap((prev) => {
      const cur = prev[row.app.id] || { viewYear: new Date().getFullYear(), viewMonth: new Date().getMonth(), slots: [] }
      return {
        ...prev,
        [row.app.id]: {
          ...cur,
          slots: buildSlots(row, scheduleMap[row.app.id], schedules || []),
        },
      }
    })
  }

  function onPickDate(appId, date) {
    setSelectedDateMap(prev => ({ ...prev, [appId]: date }))
    setSelectedSlotMap(prev => {
      const cur = prev[appId]
      if (!cur) return prev
      if (cur.date === date) return prev
      return { ...prev, [appId]: null }
    })
  }

  function onPickSlot(appId, slot) {
    if (!slot) return
    const capacity = Number(slot.capacity || 1)
    const bookedCount = Number(slot.bookedCount || 0)
    if (capacity > 0 && bookedCount >= capacity) return
    setSelectedSlotMap(prev => ({ ...prev, [appId]: slot }))
  }

  function onToggleEdit(appId, on) {
    setEditModeMap(prev => ({ ...prev, [appId]: on }))
    if (!on) {
      setSelectedSlotMap(prev => ({ ...prev, [appId]: null }))
    }
  }

  async function onReserve(row, slot) {
    if (!slot) return

    const canEdit = canEditByProgram[row.app.program_id] ?? true
    if (!canEdit) {
      showToast('면접자 일정 제출 마감일이 지나 수정할 수 없습니다.')
      return
    }

    setSubmittingId(row.app.id)
    try {
      const { data: latest } = await supabase
        .from('interview_schedules')
        .select('id,application_id,status')
        .eq('program_id', row.app.program_id)
        .eq('company_name', row.companyName)
        .eq('scheduled_date', slot.date)
        .eq('scheduled_start_time', slot.start)
        .neq('status', 'cancelled')

      const capacity = Number(slot.capacity || 1)
      const othersCount = (latest || []).filter(s => s.application_id !== row.app.id).length
      if (othersCount >= capacity) {
        showToast('이미 마감된 시간입니다. 다른 시간을 선택해주세요.')
        await loadAll()
        return
      }

      const { data: existingMine } = await supabase
        .from('interview_schedules')
        .select('*')
        .eq('application_id', row.app.id)
        .maybeSingle()

      let meetingLink = existingMine?.meeting_link || null
      if ((row.setting?.interview_mode || 'online') === 'online' && !meetingLink) {
        const roomRes = await fetch(`${MEET_SERVER_URL}/create-room`)
        if (!roomRes.ok) {
          throw new Error('면접 화상 회의실 생성에 실패했습니다. 잠시 후 다시 시도해주세요.')
        }
        const roomJson = await roomRes.json()
        const roomId = String(roomJson?.roomId || '').trim()
        if (!roomId) {
          throw new Error('면접 화상 초대코드를 생성하지 못했습니다. 잠시 후 다시 시도해주세요.')
        }
        meetingLink = `${window.location.origin}/meet-record?room=${encodeURIComponent(roomId)}`
      }

      const payload = {
        program_id: row.app.program_id,
        interview_setting_id: row.setting?.id || null,
        application_id: row.app.id,
        brand: row.program?.brand || brand || null,
        company_name: row.companyName,
        scheduled_date: slot.date,
        scheduled_start_time: slot.start,
        scheduled_end_time: slot.end,
        interview_mode: row.setting?.interview_mode || 'online',
        meeting_link: (row.setting?.interview_mode || 'online') === 'online' ? meetingLink : null,
        face_address: row.setting?.interview_mode === 'face' ? (row.setting?.face_address || null) : null,
        status: 'scheduled',
      }

      if (existingMine?.id) {
        const { error: updateErr } = await supabase
          .from('interview_schedules')
          .update(payload)
          .eq('id', existingMine.id)
        if (updateErr) throw updateErr
      } else {
        const { error: insertErr } = await supabase.from('interview_schedules').insert(payload)
        if (insertErr) throw insertErr
      }

      const mergedFormData = {
        ...(row.app.form_data || {}),
        booked_date: slot.date,
        booked_time: slot.start,
      }
      await supabase.from('applications').update({ form_data: mergedFormData }).eq('id', row.app.id)

      showToast(existingMine?.id ? '면접 일정이 수정되었습니다.' : '면접 일정이 예약되었습니다.')
      setEditModeMap(prev => ({ ...prev, [row.app.id]: false }))
      await loadAll()
      return true
    } catch (e) {
      console.error('예약 실패:', e)
      showToast(`예약 실패: ${e.message}`)
      return false
    } finally {
      setSubmittingId('')
    }
  }

  const menuItems = [
    { id: 'interviews', label: '내 면접', icon: LineIcon.Calendar },
    { id: 'notices', label: '공지사항', icon: LineIcon.Bell },
  ]

  const programCards = useMemo(() => {
    const grouped = {}
    rows.forEach((r) => {
      const pid = r.app.program_id
      if (!grouped[pid]) {
        grouped[pid] = {
          programId: pid,
          program: r.program,
          total: 0,
          booked: 0,
        }
      }
      grouped[pid].total += 1
      if (scheduleMap[r.app.id]) grouped[pid].booked += 1
    })
    return Object.values(grouped)
  }, [rows, scheduleMap])

  useEffect(() => {
    if (!programCards.length) {
      setSelectedProgramId('')
      return
    }
    if (selectedProgramId && programCards.some((pc) => pc.programId === selectedProgramId)) return
    setSelectedProgramId('')
  }, [programCards, selectedProgramId])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [menu, selectedProgramId])

  useEffect(() => {
    if (!mobileMenuOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [mobileMenuOpen])

  useEffect(() => {
    const onResize = () => setIsTabletMobile(window.innerWidth <= 1024)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const activeRows = useMemo(() => {
    if (!selectedProgramId) return []
    return rows.filter((r) => r.app.program_id === selectedProgramId)
  }, [rows, selectedProgramId])

  const activeProgram = useMemo(() => (
    selectedProgramId ? programMap[selectedProgramId] || null : null
  ), [programMap, selectedProgramId])
  const submissionDeadlineText = useMemo(() => (
    activeProgram?.pre_recruit_end_date ? formatDateTimeNoSeconds(activeProgram.pre_recruit_end_date) : ''
  ), [activeProgram?.pre_recruit_end_date])
  const alertReadKey = useMemo(() => (
    selectedProgramId ? `student_alert_read_${user?.id || 'anon'}_${selectedProgramId}` : ''
  ), [selectedProgramId, user?.id])
  const alertReadEntryKey = useMemo(() => (
    selectedProgramId ? `student_alert_read_entries_${user?.id || 'anon'}_${selectedProgramId}` : ''
  ), [selectedProgramId, user?.id])

  useEffect(() => {
    if (!rows.length) return
    const myProgramSet = new Set(rows.map(r => r.app.program_id))
    const channel = supabase
      .channel(`student-schedules-${user?.id || 'anon'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interview_schedules' }, (payload) => {
        const targetProgram = payload.new?.program_id || payload.old?.program_id
        if (targetProgram && myProgramSet.has(targetProgram)) {
          loadAll()
        }
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [rows, user?.id])

  useEffect(() => {
    if (!selectedProgramId) {
      setShowAlertPanel(false)
      setAlerts([])
      setAlertUnread(0)
      return
    }
    loadAlerts()
  }, [selectedProgramId, activeRows])

  useEffect(() => {
    if (!selectedProgramId) return
    const appIds = activeRows.map((r) => r.app.id).filter(Boolean)
    if (appIds.length === 0) return
    const channel = supabase
      .channel(`student-alert-${selectedProgramId}-${user?.id || 'anon'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interview_schedules' }, (payload) => {
        const targetAppId = payload.new?.application_id || payload.old?.application_id
        const targetProgram = payload.new?.program_id || payload.old?.program_id
        if (targetProgram === selectedProgramId && appIds.includes(targetAppId)) {
          loadAlerts()
        }
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedProgramId, user?.id, activeRows, alertReadKey])

  useEffect(() => {
    if (!showAlertPanel) return
    const updatePanelPosition = () => {
      const el = (isTabletMobile ? topAlertBtnRef.current : alertBtnRef.current) || alertBtnRef.current || topAlertBtnRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const panelWidth = Math.min(360, Math.max(260, window.innerWidth - 24))
      const gap = 20
      const maxLeft = Math.max(12, window.innerWidth - panelWidth - 12)
      const mobileLeft = Math.min(Math.max(12, rect.right - panelWidth), maxLeft)
      setAlertPanelPos({
        top: Math.max(72, rect.top + (isTabletMobile ? rect.height + 8 : 0)),
        left: isTabletMobile ? mobileLeft : Math.min(rect.right + gap, maxLeft),
      })
    }
    updatePanelPosition()
    window.addEventListener('resize', updatePanelPosition)
    window.addEventListener('scroll', updatePanelPosition, true)
    return () => {
      window.removeEventListener('resize', updatePanelPosition)
      window.removeEventListener('scroll', updatePanelPosition, true)
    }
  }, [showAlertPanel, isTabletMobile])

  useEffect(() => {
    if (!showAlertPanel) return
    const onDown = (e) => {
      const sidebarBtn = alertBtnRef.current
      const topBtn = topAlertBtnRef.current
      const panel = alertPanelRef.current
      const t = e.target
      if (panel && panel.contains(t)) return
      if (sidebarBtn && sidebarBtn.contains(t)) return
      if (topBtn && topBtn.contains(t)) return
      setShowAlertPanel(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [showAlertPanel])

  function getReadEntries() {
    try {
      const raw = localStorage.getItem(alertReadEntryKey)
      const arr = raw ? JSON.parse(raw) : []
      return new Set(Array.isArray(arr) ? arr : [])
    } catch (_) {
      return new Set()
    }
  }

  function saveReadEntries(entries) {
    if (!alertReadEntryKey) return
    localStorage.setItem(alertReadEntryKey, JSON.stringify([...entries]))
  }

  function markAlertRead(alert) {
    if (!alert || alert.read) return
    const entries = getReadEntries()
    entries.add(alert.entryKey)
    saveReadEntries(entries)
    setAlerts((prev) => prev.map((a) => a.entryKey === alert.entryKey ? { ...a, read: true } : a))
    setAlertUnread((prev) => Math.max(0, prev - 1))
  }

  function formatAlertTime(ts) {
    if (!ts) return '-'
    const d = new Date(ts)
    if (Number.isNaN(d.getTime())) return '-'
    return d.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  async function loadAlerts() {
    if (!selectedProgramId) return
    const appIds = activeRows.map((r) => r.app.id).filter(Boolean)
    if (appIds.length === 0) {
      setAlerts([])
      setAlertUnread(0)
      return
    }
    try {
      const [{ data: schedules }, { data: apps }] = await Promise.all([
        supabase
          .from('interview_schedules')
          .select('id, created_at, updated_at, scheduled_date, scheduled_start_time, scheduled_end_time, application_id, status')
          .eq('program_id', selectedProgramId)
          .in('application_id', appIds)
          .neq('status', 'cancelled')
          .order('updated_at', { ascending: false })
          .limit(80),
        supabase
          .from('applications')
          .select('id, name, form_data')
          .in('id', appIds),
      ])
      const appMetaById = new Map((apps || []).map((a) => [a.id, {
        name: a.name || '면접자',
        companyName: a.form_data?.company_name || '기업',
      }]))
      const readEntries = getReadEntries()

      const mapped = (schedules || []).map((s) => {
        const isChanged = (s.updated_at || '') !== (s.created_at || '')
        const appMeta = appMetaById.get(s.application_id) || { name: '면접자', companyName: '기업' }
        const ts = s.updated_at || s.created_at
        const entryKey = `${s.id}:${ts}`
        return {
          id: s.id,
          ts,
          entryKey,
          title: isChanged ? '면접 일정 변경' : '면접 일정 등록',
          body: `${appMeta.companyName} · ${appMeta.name} · ${s.scheduled_date} ${s.scheduled_start_time || ''}${s.scheduled_end_time ? ` ~ ${s.scheduled_end_time}` : ''}`,
          read: readEntries.has(entryKey),
        }
      })
      setAlerts(mapped)
      const unread = mapped.filter((a) => !a.read).length
      setAlertUnread(unread)
    } catch (e) {
      console.error('student alerts load failed:', e)
    }
  }

  if (loading) {
    return <div className="loading">불러오는 중...</div>
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', display: 'flex', flexDirection: 'column' }}>
      <header className="topbar">
        {selectedProgramId && (
          <button
            type="button"
            className="mobile-menu-btn"
            aria-label="메뉴 열기"
            onClick={() => setMobileMenuOpen((v) => !v)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          </button>
        )}
        <div className="logo">
          <div className="logo-icon">M</div>
          <span>면접 지원 시스템</span>
        </div>
        {selectedProgramId && (
          <>
            <div className="topbar-divider" />
            <button className="prog-chip" onClick={() => setSelectedProgramId('')}>
              {activeProgram?.title || '교육과정 선택'} ▾
            </button>
          </>
        )}
        <div className="topbar-spacer" />
        {selectedProgramId && (
          <button
            ref={topAlertBtnRef}
            type="button"
            className="mobile-top-alert"
            aria-label="알림"
            onClick={() => setShowAlertPanel((v) => !v)}>
            <LineIcon.Bell />
            {alertUnread > 0 && (
              <span style={{
                position: 'absolute',
                top: -5,
                right: -5,
                minWidth: 16,
                height: 16,
                borderRadius: 999,
                background: '#DC2626',
                color: '#fff',
                fontSize: 10,
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
                lineHeight: 1,
              }}>
                {alertUnread > 99 ? '99+' : alertUnread}
              </span>
            )}
          </button>
        )}
        <span className="role-badge student">면접자</span>
        <div className="topbar-divider" />
        <button className="btn-ghost-sm topbar-logout" onClick={async () => {
          await signOut()
          if (brand) {
            window.location.href = `/login?brand=${brand}`
            return
          }
          navigate('/login')
        }}>로그아웃</button>
      </header>

      {!selectedProgramId ? (
        <main className="main-content">
          <div className="page-header">
            <div>
              <div className="page-title">참여중인 교육과정</div>
              <div className="page-subtitle">참여한 교육과정을 선택하면 면접 대시보드로 이동합니다.</div>
            </div>
          </div>

          {programCards.length === 0 ? (
            <div className="card">
              <div className="empty">
                <div className="empty-title">참여중인 교육과정이 없습니다.</div>
                <div className="empty-desc">운영진에게 지원 정보 확인을 요청해주세요.</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
              {programCards.map((pc) => (
                <button
                  key={`${pc.programId}-${pc.total}-${pc.booked}`}
                  type="button"
                  onClick={() => {
                    setSelectedProgramId(pc.programId)
                    setMenu('interviews')
                  }}
                  style={{
                    border: '1px solid var(--gray-200)',
                    background: '#fff',
                    borderRadius: 12,
                    padding: '16px 16px 14px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all .15s',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 6 }}>교육과정 타이틀</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 10, lineHeight: 1.45 }}>
                    {pc.program?.title || '-'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--gray-600)' }}>
                    예약 완료 {pc.booked}/{pc.total}
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>
      ) : (
        <div className="layout-body dashboard-shell">
          <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <div className="nav-section" style={{ position: 'relative' }}>
              <div className="nav-label">메뉴</div>
              {menuItems.map(item => (
                <button
                  key={item.id}
                  className={`nav-item ${menu === item.id ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
                  onClick={() => {
                    setMenu(item.id)
                    setMobileMenuOpen(false)
                  }}>
                  <span className="nav-icon"><item.icon /></span>
                  {item.label}
                </button>
              ))}
              <button
                ref={alertBtnRef}
                className={`nav-item sidebar-alert-item ${showAlertPanel ? 'active' : ''}`}
                style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', position: 'relative', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}
                onClick={() => {
                  setMobileMenuOpen(false)
                  setShowAlertPanel((v) => !v)
                }}>
                <span className="nav-icon"><LineIcon.Bell /></span>
                <span>알림</span>
                {alertUnread > 0 && (
                  <span style={{
                    marginLeft: 'auto',
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: '#DC2626',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                    lineHeight: 1.3,
                  }}>
                    {alertUnread}
                  </span>
                )}
              </button>

              {showAlertPanel && !isTabletMobile && (
                <div ref={alertPanelRef} style={{
                  position: 'fixed',
                  left: alertPanelPos.left,
                  top: alertPanelPos.top,
                  width: 'min(360px, calc(100vw - 24px))',
                  maxHeight: 520,
                  overflowY: 'auto',
                  background: '#fff',
                  border: '1px solid var(--gray-200)',
                  borderRadius: 14,
                  boxShadow: '0 16px 46px rgba(15,23,42,.18)',
                  zIndex: 2200,
                }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--gray-900)' }}>일정 알림</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 600 }}>실시간 업데이트</span>
                      <button
                        type="button"
                        onClick={loadAlerts}
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, border: '1px solid var(--gray-200)', background: '#fff', color: 'var(--gray-600)' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="23 4 23 10 17 10" />
                          <polyline points="1 20 1 14 7 14" />
                          <path d="M3.5 9a9 9 0 0 1 14.1-3.36L23 10M1 14l5.4 4.36A9 9 0 0 0 20.5 15" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {alerts.length === 0 ? (
                    <div style={{ padding: '24px 16px', fontSize: 13, color: 'var(--gray-400)' }}>새로운 알림이 없습니다.</div>
                  ) : (
                    alerts.map((a) => (
                      <div key={a.id} onClick={() => markAlertRead(a)} style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--gray-100)',
                        display: 'grid',
                        gap: 5,
                        background: a.read ? '#fff' : 'var(--primary-light)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ fontSize: 12, fontWeight: a.read ? 600 : 800, color: a.read ? 'var(--gray-700)' : 'var(--gray-900)' }}>{a.title}</div>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: a.read ? 'var(--gray-400)' : 'var(--primary)',
                            background: a.read ? 'transparent' : '#DBEAFE',
                            border: a.read ? 'none' : '1px solid #BFDBFE',
                            padding: a.read ? 0 : '1px 7px',
                            borderRadius: 999,
                            whiteSpace: 'nowrap',
                          }}>
                            {a.read ? '읽음' : '안읽음'}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--gray-600)', lineHeight: 1.5 }}>{a.body}</div>
                        <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                          {formatAlertTime(a.ts)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="mobile-sidebar-logout">
              <button className="btn-ghost-sm" onClick={async () => {
                await signOut()
                if (brand) {
                  window.location.href = `/login?brand=${brand}`
                  return
                }
                navigate('/login')
              }}>
                로그아웃
              </button>
            </div>
          </aside>
          {showAlertPanel && isTabletMobile && (
            <div ref={alertPanelRef} style={{
              position: 'fixed',
              left: alertPanelPos.left,
              top: alertPanelPos.top,
              width: 'min(360px, calc(100vw - 24px))',
              maxHeight: 520,
              overflowY: 'auto',
              background: '#fff',
              border: '1px solid var(--gray-200)',
              borderRadius: 14,
              boxShadow: '0 16px 46px rgba(15,23,42,.18)',
              zIndex: 2200,
            }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--gray-900)' }}>일정 알림</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 600 }}>실시간 업데이트</span>
                  <button
                    type="button"
                    onClick={loadAlerts}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, border: '1px solid var(--gray-200)', background: '#fff', color: 'var(--gray-600)' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10" />
                      <polyline points="1 20 1 14 7 14" />
                      <path d="M3.5 9a9 9 0 0 1 14.1-3.36L23 10M1 14l5.4 4.36A9 9 0 0 0 20.5 15" />
                    </svg>
                  </button>
                </div>
              </div>
              {alerts.length === 0 ? (
                <div style={{ padding: '24px 16px', fontSize: 13, color: 'var(--gray-400)' }}>새로운 알림이 없습니다.</div>
              ) : (
                alerts.map((a) => (
                  <div key={a.id} onClick={() => markAlertRead(a)} style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--gray-100)',
                    display: 'grid',
                    gap: 5,
                    background: a.read ? '#fff' : 'var(--primary-light)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: a.read ? 600 : 800, color: a.read ? 'var(--gray-700)' : 'var(--gray-900)' }}>{a.title}</div>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: a.read ? 'var(--gray-400)' : 'var(--primary)',
                        background: a.read ? 'transparent' : '#DBEAFE',
                        border: a.read ? 'none' : '1px solid #BFDBFE',
                        padding: a.read ? 0 : '1px 7px',
                        borderRadius: 999,
                        whiteSpace: 'nowrap',
                      }}>
                        {a.read ? '읽음' : '안읽음'}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--gray-600)', lineHeight: 1.5 }}>{a.body}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                      {formatAlertTime(a.ts)}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          {mobileMenuOpen && (
            <button
              type="button"
              className="mobile-sidebar-overlay"
              aria-label="메뉴 닫기"
              onClick={() => setMobileMenuOpen(false)}
            />
          )}

          <main className="main-content">
            {menu === 'interviews' && (
              <MyInterviews
                rows={activeRows}
                scheduleMap={scheduleMap}
                canEditByProgram={canEditByProgram}
                editModeMap={editModeMap}
                onToggleEdit={onToggleEdit}
                submissionDeadlineText={submissionDeadlineText}
                onOpenSchedule={(row) => {
                  setScheduleModalRow(row)
                  setScheduleModalOpen(true)
                  const appId = row?.app?.id
                  if (!appId) return
                  setSelectedDateMap((prev) => {
                    if (prev?.[appId]) return prev
                    const firstDate = slotLoadMap?.[appId]?.slots?.[0]?.date
                    return firstDate ? { ...prev, [appId]: firstDate } : prev
                  })
                }}
              />
            )}

            {menu === 'notices' && <StudentNotices brand={brand || activeProgram?.brand || null} />}
          </main>
        </div>
      )}

      <ScheduleSelectModal
        open={scheduleModalOpen}
        row={scheduleModalRow}
        schedule={scheduleModalRow ? scheduleMap[scheduleModalRow.app.id] : null}
        slotState={scheduleModalRow ? slotLoadMap[scheduleModalRow.app.id] : null}
        selectedDate={scheduleModalRow ? selectedDateMap[scheduleModalRow.app.id] : ''}
        selectedSlot={scheduleModalRow ? selectedSlotMap[scheduleModalRow.app.id] : null}
        onClose={() => {
          const appId = scheduleModalRow?.app?.id
          setScheduleModalOpen(false)
          setScheduleModalRow(null)
          if (appId) onToggleEdit(appId, false)
        }}
        onPickDate={onPickDate}
        onPickSlot={onPickSlot}
        onChangeMonth={onLoadSlots}
        onSubmit={async (row, slot) => {
          const ok = await onReserve(row, slot)
          if (ok) {
            setScheduleModalOpen(false)
            setScheduleModalRow(null)
          }
        }}
        submitting={!!(scheduleModalRow && submittingId === scheduleModalRow.app.id)}
        canEdit={!!(scheduleModalRow && (canEditByProgram[scheduleModalRow.app.program_id] ?? true))}
        isBooked={!!(scheduleModalRow && scheduleMap[scheduleModalRow.app.id])}
        isEditMode={!!(scheduleModalRow && editModeMap[scheduleModalRow.app.id])}
      />

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--gray-900)', color: '#fff', padding: '10px 20px', borderRadius: 999, fontSize: 14, zIndex: 9999 }}>
          {toast}
        </div>
      )}
    </div>
  )
}
