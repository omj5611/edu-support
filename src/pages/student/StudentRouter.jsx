import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

function makeDateKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function parseDateSafe(v) {
  if (!v) return null
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return null
  return d
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

function MyInterviews({
  rows,
  scheduleMap,
  slotLoadMap,
  onLoadSlots,
  selectedDateMap,
  onPickDate,
  selectedSlotMap,
  onPickSlot,
  submittingId,
  onReserve,
  canEditByProgram,
  editModeMap,
  onToggleEdit,
}) {
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">내 면접</div>
          <div className="page-subtitle">기업별 면접 일정 예약 및 확인</div>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {rows.map(row => {
            const schedule = scheduleMap[row.app.id]
            const slotState = slotLoadMap[row.app.id]
            const selectedDate = selectedDateMap[row.app.id] || ''
            const selectedSlot = selectedSlotMap[row.app.id] || null
            const deadline = row.program?.pre_recruit_end_date
            const canEdit = canEditByProgram[row.app.program_id] ?? true
            const isBooked = !!schedule
            const isEditMode = !!editModeMap[row.app.id]
            const selectedDateSlots = (slotState?.slots || []).filter(s => s.date === selectedDate)

            return (
              <div key={row.app.id} className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div className="card-title">{row.companyName}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>{row.program?.title || '-'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span className={`badge ${row.setting?.interview_mode === 'online' ? 'b-blue' : 'b-green'}`}>
                      {row.setting?.interview_mode === 'online' ? '비대면' : '대면'}
                    </span>
                    <span className={`badge ${row.setting?.interview_type === '1on1' ? 'b-purple' : 'b-orange'}`}>
                      {row.setting?.interview_type === '1on1' ? '1:1 면접' : `그룹 면접 (최대 ${row.setting?.group_max_count || '-'}명)`}
                    </span>
                    <span className="badge b-gray">{row.setting?.slot_minutes || '-'}분</span>
                  </div>
                </div>

                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {isBooked && (
                    <div style={{ background: 'var(--primary-light)', border: '1px solid var(--primary-border)', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>내 면접 일정</div>
                      <div style={{ fontSize: 14, color: 'var(--gray-800)' }}>
                        {schedule.scheduled_date} {schedule.scheduled_start_time} ~ {schedule.scheduled_end_time}
                      </div>
                      {row.setting?.interview_mode === 'online' && schedule.meeting_link && (
                        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <a
                            href={schedule.meeting_link}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-primary btn-sm"
                            style={{ textDecoration: 'none' }}>
                            화상 링크 접속
                          </a>
                          <span style={{ fontSize: 12, color: 'var(--gray-600)' }}>
                            초대코드: <b>{parseInviteCodeFromLink(schedule.meeting_link) || '-'}</b>
                          </span>
                        </div>
                      )}
                      {row.setting?.interview_mode === 'face' && (schedule.face_address || row.setting?.face_address) && (
                        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--gray-600)' }}>장소: {schedule.face_address || row.setting?.face_address}</div>
                      )}
                      {canEdit && !isEditMode && (
                        <div style={{ marginTop: 10 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => onToggleEdit(row.app.id, true)}>수정하기</button>
                        </div>
                      )}
                    </div>
                  )}

                  {!row.setting ? (
                    <div style={{ fontSize: 13, color: 'var(--gray-400)' }}>기업에서 아직 면접 설정을 제출하지 않았습니다.</div>
                  ) : !canEdit ? (
                    <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: 'var(--gray-500)' }}>
                      제출 마감일({deadline ? new Date(deadline).toLocaleString('ko-KR') : '-'}) 이후로는 수정할 수 없습니다.
                    </div>
                  ) : isBooked && !isEditMode ? null : (
                    <>
                      <div style={{ fontSize: 13, color: 'var(--gray-600)' }}>
                        {isBooked ? '마감 전이므로 면접 일정을 변경할 수 있습니다.' : '기업이 제출한 면접 가능 일정에서 선착순으로 예약하세요.'}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1fr)', gap: 12, alignItems: 'start' }}>
                        <DateCalendar
                          selectableDates={new Set((slotState?.slots || []).map(s => s.date))}
                          selectedDate={selectedDate}
                          onSelectDate={(date) => onPickDate(row.app.id, date)}
                          viewYear={slotState?.viewYear || new Date().getFullYear()}
                          viewMonth={slotState?.viewMonth ?? new Date().getMonth()}
                          onChangeMonth={(delta) => onLoadSlots(row, delta)}
                        />
                        <div style={{ border: '1px solid var(--gray-200)', borderRadius: 10, background: '#fff', padding: 12 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>
                            {selectedDate ? `${selectedDate} 시간 선택` : '시간 선택'}
                          </div>
                          {selectedDate ? (
                            selectedDateSlots.length === 0 ? (
                              <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>선택한 날짜에 선택 가능한 시간이 없습니다.</div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {selectedDateSlots.map(slot => {
                                  const selected = selectedSlot?.date === slot.date && selectedSlot?.start === slot.start
                                  const isMyCurrent = schedule && schedule.scheduled_date === slot.date && schedule.scheduled_start_time === slot.start
                                  const full = slot.capacity > 0 && slot.bookedCount >= slot.capacity && !isMyCurrent
                                  return (
                                    <button
                                      key={`${slot.date}-${slot.start}`}
                                      type="button"
                                      disabled={full}
                                      onClick={() => onPickSlot(row.app.id, slot)}
                                      style={{
                                        borderRadius: 8,
                                        border: `1px solid ${selected ? 'var(--primary)' : 'var(--gray-200)'}`,
                                        background: selected ? 'var(--primary-light)' : '#fff',
                                        padding: '10px 12px',
                                        textAlign: 'left',
                                        cursor: full ? 'not-allowed' : 'pointer',
                                        opacity: full ? 0.55 : 1,
                                      }}>
                                      <div style={{ fontSize: 13, fontWeight: 700, color: selected ? 'var(--primary)' : 'var(--gray-800)' }}>
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

                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        {isBooked && (
                          <button className="btn btn-ghost" style={{ marginRight: 8 }} onClick={() => onToggleEdit(row.app.id, false)}>취소</button>
                        )}
                        <button className="btn btn-primary" disabled={!selectedSlot || submittingId === row.app.id} onClick={() => onReserve(row, selectedSlot)}>
                          {submittingId === row.app.id ? '예약 중...' : (isBooked ? '일정 수정 제출' : '제출하기')}
                        </button>
                      </div>
                    </>
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

export default function StudentRouter() {
  const { user, profile, brand, signOut } = useAuth()
  const navigate = useNavigate()

  const [menu, setMenu] = useState('interviews')
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

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2600)
  }

  const myName = profile?.name || profile?.metadata?.name || user?.user_metadata?.name || ''
  const myBirth = normalizeBirth(profile?.metadata?.birth || user?.user_metadata?.birth || '')
  const myPhone = normalizePhone(profile?.phone || profile?.metadata?.phone || user?.user_metadata?.phone || '')

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
    } catch (e) {
      console.error('예약 실패:', e)
      showToast(`예약 실패: ${e.message}`)
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

  if (loading) {
    return <div className="loading">불러오는 중...</div>
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', display: 'flex', flexDirection: 'column' }}>
      <header className="topbar">
        <div className="logo">
          <div className="logo-icon">M</div>
          <span>면접 지원 시스템</span>
        </div>
        <div className="topbar-spacer" />
        <span className="role-badge student">면접자</span>
        <div className="topbar-divider" />
        <button className="btn-ghost-sm" onClick={async () => {
          await signOut()
          if (brand) {
            window.location.href = `/login?brand=${brand}`
            return
          }
          navigate('/login')
        }}>로그아웃</button>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <aside className="sidebar">
          <div className="nav-section">
            <div className="nav-label">메뉴</div>
            {menuItems.map(item => (
              <button
                key={item.id}
                className={`nav-item ${menu === item.id ? 'active' : ''}`}
                style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
                onClick={() => setMenu(item.id)}>
                <span className="nav-icon"><item.icon /></span>
                {item.label}
              </button>
            ))}
          </div>
        </aside>

        <main className="main-content">
          {programCards.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 18 }}>
              {programCards.map((pc) => (
                <div key={`${pc.program?.id || 'unknown'}-${pc.total}-${pc.booked}`} style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 4 }}>참여중인 교육과정</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 8 }}>{pc.program?.title || '-'}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-600)' }}>예약 완료 {pc.booked}/{pc.total}</div>
                </div>
              ))}
            </div>
          )}

          {menu === 'interviews' && (
            <MyInterviews
              rows={rows}
              scheduleMap={scheduleMap}
              slotLoadMap={slotLoadMap}
              onLoadSlots={onLoadSlots}
              selectedDateMap={selectedDateMap}
              onPickDate={onPickDate}
              selectedSlotMap={selectedSlotMap}
              onPickSlot={onPickSlot}
              submittingId={submittingId}
              onReserve={onReserve}
              canEditByProgram={canEditByProgram}
              editModeMap={editModeMap}
              onToggleEdit={onToggleEdit}
            />
          )}

          {menu === 'notices' && <StudentNotices brand={brand || rows[0]?.program?.brand || null} />}
        </main>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--gray-900)', color: '#fff', padding: '10px 20px', borderRadius: 999, fontSize: 14, zIndex: 9999 }}>
          {toast}
        </div>
      )}
    </div>
  )
}
