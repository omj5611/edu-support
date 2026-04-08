import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useProgram } from '../../contexts/ProgramContext'
import { supabase } from '../../lib/supabase'

function loadXLSX() {
  return new Promise(resolve => {
    if (window.XLSX) return resolve(window.XLSX)
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
    s.onload = () => resolve(window.XLSX)
    document.head.appendChild(s)
  })
}

function extractCompany(progName) {
  const m = (progName || '').match(/\[([^\]]+)\]/)
  return m ? m[1].trim() : (progName || '미분류')
}

function createEmptyDraft() {
  return {
    name: '', appDate: '', birth: '', addr: '', phone: '', email: '',
    edLevel: '', school: '', faculty: '', dept: '',
    participationCount: '0',
    nationalEmpSupport: 'N', empInsurance: 'N', privacyConsent: 'Y',
    anomalyCheck: 'N', hasAttachment: 'N',
    motivation: '', vision: '', experience: '',
    portfolioLink: '', resumeLink: '', useDriveLink: false,
    portfolioFile: null, resumeFile: null, companyName: '',
  }
}

const STAGE_OPTIONS = ['면접 예정', '불합격', '예비합격', '최종합격']
const STAGE_BADGE = {
  '면접 예정': 'b-blue', '불합격': 'b-red',
  '예비합격': 'b-orange', '최종합격': 'b-green', '대기': 'b-gray',
}
const MODE_OPTIONS = ['전체', '비대면(화상)', '대면']
const TYPE_OPTIONS = ['전체', '1:1 면접', '그룹 면접']
const SCHEDULE_OPTIONS = ['전체', '제출 완료', '미제출']

function ChipFilter({ label, options, value, onChange }) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-200)' }}>
      <div style={{ width: 120, padding: '11px 16px', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', background: 'var(--gray-50)', borderRight: '1px solid var(--gray-200)', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 8, padding: '9px 16px', flexWrap: 'wrap', alignItems: 'center' }}>
        {options.map(opt => (
          <button key={opt} onClick={() => onChange(opt)}
            style={{
              padding: '4px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
              border: `1px solid ${value === opt ? 'var(--primary)' : 'var(--gray-200)'}`,
              background: value === opt ? 'var(--primary-light)' : '#fff',
              color: value === opt ? 'var(--primary)' : 'var(--gray-600)',
              cursor: 'pointer', transition: 'all .15s',
            }}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

async function downloadFile(url, name) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl; a.download = name || 'file'
    document.body.appendChild(a); a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  } catch { window.open(url, '_blank') }
}

// ── PDF 미리보기 모달 ─────────────────────────────────────
function PdfPreviewModal({ url, name, onClose }) {
  const isPdf = name?.toLowerCase().endsWith('.pdf') || url?.includes('.pdf')
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '90vw', maxWidth: 900, height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>📄 {name}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => downloadFile(url, name)}>↓ 다운로드</button>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--gray-100)', border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {isPdf
            ? <iframe src={`${url}#toolbar=0`} width="100%" height="100%" style={{ border: 'none', display: 'block' }} title={name} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gray-50)' }}>
              <img src={url} alt={name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>
          }
        </div>
      </div>
    </div>
  )
}

// ── 면접자 상세 모달 ──────────────────────────────────────
function ApplicantDetailModal({ app, allApps, onClose, onStageChange }) {
  const fd = app.form_data || {}
  const [stage, setStage] = useState(app.stage || '대기')
  const [preview, setPreview] = useState(null)
  const [editingFiles, setEditingFiles] = useState(false)  // ← 추가
  const [fileForm, setFileForm] = useState({               // ← 추가
    portfolioLink: fd.portfolio_link || '',
    resumeLink: fd.resume_link || '',
    portfolioType: 'link',  // 'link' | 'pdf'
    resumeType: 'link',
  })
  const [saving, setSaving] = useState(false)

  const otherApps = allApps.filter(a =>
    a.id !== app.id && a.name === app.name &&
    (a.form_data?.phone === fd.phone || a.email === app.email)
  )

  async function handleStageChange(newStage) {
    setSaving(true)
    try {
      // form_data 전체를 먼저 조회 후 merge
      const { data: current } = await supabase
        .from('applications')
        .select('form_data')
        .eq('id', app.id)
        .single()

      const merged = {
        ...(current?.form_data || {}),
        portfolio_link: fileForm.portfolioLink || (current?.form_data?.portfolio_link || ''),
        resume_link: fileForm.resumeLink || (current?.form_data?.resume_link || ''),
      }

      const { error } = await supabase
        .from('applications')
        .update({ form_data: merged })
        .eq('id', app.id)

      if (!error) {
        // 로컬 상태도 즉시 반영
        fd.portfolio_link = merged.portfolio_link
        fd.resume_link = merged.resume_link
        setEditingFiles(false)
        onStageChange(app.id, stage)
      } else {
        alert('저장 실패: ' + error.message)
      }
      if (error) throw error
      setStage(newStage)
      onStageChange(app.id, newStage)
    } catch (err) { alert('변경 실패: ' + err.message) }
    finally { setSaving(false) }
  }

  const FileBtn = ({ url, name: fname, label }) => {
    if (!url) return <span style={{ fontSize: 13, color: 'var(--gray-400)' }}>미등록</span>
    const isPdf = fname?.toLowerCase().endsWith('.pdf') || url.includes('.pdf')
    return (
      <div style={{ display: 'flex', gap: 6 }}>
        {isPdf && <button onClick={() => setPreview({ url, name: fname || label })} className="btn btn-secondary btn-sm">👁 미리보기</button>}
        <button onClick={() => downloadFile(url, fname || label)} className="btn btn-secondary btn-sm">↓ 다운로드</button>
      </div>
    )
  }

  const InfoRow = ({ label, value }) => (
    <div style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--gray-100)', fontSize: 14 }}>
      <div style={{ width: 160, flexShrink: 0, fontSize: 13, color: 'var(--gray-500)', fontWeight: 600 }}>{label}</div>
      <div style={{ flex: 1, color: 'var(--gray-900)' }}>{value || '-'}</div>
    </div>
  )

  const YNBadge = ({ val }) => (
    <span className={`badge ${val === 'Y' ? 'b-green' : 'b-gray'}`}>{val === 'Y' ? 'Y (예)' : 'N (아니오)'}</span>
  )

  const SectionTitle = ({ children }) => (
    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 8, paddingBottom: 6, borderBottom: '2px solid var(--primary-light)' }}>{children}</div>
  )

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.5)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 24, overflowY: 'auto' }}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 800, boxShadow: '0 20px 40px rgba(0,0,0,.2)', marginBottom: 24 }}>
          {/* 헤더 */}
          <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20 }}>
                {(app.name || '?')[0]}
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{app.name}</div>
                <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>{fd.company_name || '-'} 배정</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <select value={stage} onChange={e => handleStageChange(e.target.value)} disabled={saving}
                style={{ height: 36, padding: '0 10px', border: '1px solid var(--gray-300)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: '#fff' }}>
                <option value="대기">대기</option>
                {STAGE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gray-100)', border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
          </div>

          <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* 기본 정보 + 학력 정보 가로 배치 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
              <div>
                <SectionTitle>기본 정보</SectionTitle>
                <InfoRow label="이름" value={app.name} />
                <InfoRow label="신청일자" value={fd.app_date} />
                <InfoRow label="생년월일" value={fd.birth} />
                <InfoRow label="주소" value={fd.addr} />
                <InfoRow label="휴대전화번호" value={fd.phone || app.phone} />
                <InfoRow label="이메일" value={fd.email || app.email} />
              </div>
              <div>
                <SectionTitle>학력 정보</SectionTitle>
                <InfoRow label="학력" value={fd.ed_level} />
                <InfoRow label="학교" value={fd.school} />
                <InfoRow label="학부" value={fd.faculty} />
                <InfoRow label="학과" value={fd.dept} />
              </div>
            </div>

            {/* 행정 검증 */}
            <div>
              <SectionTitle>행정 검증</SectionTitle>
              <InfoRow label="연간참여횟수" value={`${fd.participation_count || 0}회`} />
              {[
                ['국민취업지원제도참여여부', fd.national_emp_support],
                ['고용보험가입여부', fd.emp_insurance],
                ['개인정보활용동의여부', fd.privacy_consent],
                ['확인내용이상여부', fd.anomaly_check],
                ['첨부파일유무', fd.has_attachment],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--gray-100)' }}>
                  <div style={{ width: 160, fontSize: 13, color: 'var(--gray-500)', fontWeight: 600 }}>{l}</div>
                  <YNBadge val={v} />
                </div>
              ))}
            </div>

            {/* 지원서 */}
            <div>
              <SectionTitle>지원서</SectionTitle>
              {[['지원 동기', fd.motivation], ['향후 비전 및 포부 (수행계획)', fd.vision], ['관련 경력 (경험)', fd.experience]].map(([l, v]) => (
                <div key={l} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 13, color: 'var(--gray-500)', fontWeight: 600, marginBottom: 4 }}>{l}</div>
                  <div style={{ fontSize: 14, color: 'var(--gray-800)', lineHeight: 1.7, background: 'var(--gray-50)', padding: '10px 12px', borderRadius: 8, whiteSpace: 'pre-wrap', minHeight: 40 }}>
                    {v || '-'}
                  </div>
                </div>
              ))}
            </div>


            {/* 포트폴리오 / 이력서 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 6, borderBottom: '2px solid var(--primary-light)' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-900)' }}>포트폴리오 / 이력서</div>
                <button className="btn btn-secondary btn-sm"
                  onClick={() => setEditingFiles(v => !v)}>
                  {editingFiles ? '취소' : '✏️ 수정'}
                </button>
              </div>

              {/* 수정 모드 */}
              {editingFiles && (
                <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: 16, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    ['포트폴리오', 'portfolioLink', 'portfolioType'],
                    ['이력서', 'resumeLink', 'resumeType'],
                  ].map(([label, linkKey, typeKey]) => (
                    <div key={linkKey}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 6 }}>{label}</div>
                      <div className="seg" style={{ marginBottom: 8 }}>
                        <button className={`seg-btn ${fileForm[typeKey] === 'link' ? 'on' : ''}`}
                          onClick={() => setFileForm(f => ({ ...f, [typeKey]: 'link' }))}>링크 입력</button>
                        <button className={`seg-btn ${fileForm[typeKey] === 'pdf' ? 'on' : ''}`}
                          onClick={() => setFileForm(f => ({ ...f, [typeKey]: 'pdf' }))}>PDF 업로드</button>
                      </div>
                      {fileForm[typeKey] === 'link' ? (
                        <input className="form-input" placeholder="https://..." value={fileForm[linkKey]}
                          onChange={e => setFileForm(f => ({ ...f, [linkKey]: e.target.value }))} />
                      ) : (
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 12px', border: '1px solid var(--gray-300)', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: 'var(--gray-400)', background: '#fff' }}>
                          📎 PDF 파일 선택
                          <input type="file" accept=".pdf" style={{ display: 'none' }}
                            onChange={async e => {
                              const file = e.target.files[0]
                              if (!file) return
                              try {
                                const ext = file.name.split('.').pop()
                                const path = `applicants/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
                                const { data, error } = await supabase.storage
                                  .from('interview')
                                  .upload(path, file, { cacheControl: '3600', upsert: false })
                                if (error) throw error
                                const { data: urlData } = supabase.storage.from('interview').getPublicUrl(path)
                                setFileForm(f => ({ ...f, [linkKey]: urlData.publicUrl }))
                              } catch (err) {
                                alert('업로드 실패: ' + err.message)
                                console.error(err)
                              }
                            }} />
                        </label>
                      )}
                      {fileForm[linkKey] && (
                        <div style={{ fontSize: 11, color: 'var(--primary)', marginTop: 4 }}>✓ {fileForm[linkKey]}</div>
                      )}
                    </div>
                  ))}
                  <button className="btn btn-primary"
                    onClick={async () => {
                      try {
                        // 1. 현재 form_data 조회
                        const { data: current, error: fetchErr } = await supabase
                          .from('applications')
                          .select('form_data')
                          .eq('id', app.id)
                          .single()
                        if (fetchErr) throw fetchErr

                        // 2. merge 후 저장
                        const merged = {
                          ...(current?.form_data || {}),
                          portfolio_link: fileForm.portfolioLink,
                          resume_link: fileForm.resumeLink,
                        }
                        const { error } = await supabase
                          .from('applications')
                          .update({ form_data: merged })
                          .eq('id', app.id)
                        if (error) throw error

                        // 3. 로컬 fd 즉시 반영
                        fd.portfolio_link = merged.portfolio_link
                        fd.resume_link = merged.resume_link
                        setEditingFiles(false)
                        onStageChange(app.id, stage)
                      } catch (err) {
                        alert('저장 실패: ' + err.message)
                      }
                    }}>
                    저장
                  </button>
                </div>
              )}

              {/* 뷰 모드 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  ['📋 포트폴리오', fd.portfolio_link || fileForm.portfolioLink, 'portfolio.pdf'],
                  ['📄 이력서', fd.resume_link || fileForm.resumeLink, 'resume.pdf'],
                ].map(([label, url, fname]) => {
                  const isPdf = url && (url.toLowerCase().includes('.pdf') || fname.endsWith('.pdf'))
                  return (
                    <div key={label} style={{ background: 'var(--gray-50)', borderRadius: 8, padding: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 8 }}>{label}</div>
                      {url ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {/* PDF → 브라우저 인라인 뷰어 */}
                          {isPdf && (
                            <iframe
                              src={`${url}#toolbar=1&navpanes=0`}
                              style={{ width: '100%', height: 200, border: '1px solid var(--gray-200)', borderRadius: 6 }}
                              title={label}
                            />
                          )}
                          <div style={{ display: 'flex', gap: 6 }}>
                            {isPdf && (
                              <button onClick={() => setPreview({ url, name: fname })}
                                className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                                🔍 전체보기
                              </button>
                            )}
                            {!isPdf && (
                              <a href={url} target="_blank" rel="noreferrer"
                                className="btn btn-secondary btn-sm" style={{ flex: 1, textDecoration: 'none' }}>
                                🔗 링크 열기
                              </a>
                            )}
                            <button onClick={() => downloadFile(url, fname)}
                              className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                              ↓ 다운로드
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: 13, color: 'var(--gray-400)' }}>미등록</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 면접 일정 */}
            <div>
              <SectionTitle>면접 일정</SectionTitle>
              {fd.booked_date
                ? <div style={{ background: 'var(--primary-light)', borderRadius: 8, padding: '12px 16px', fontSize: 14, fontWeight: 600, color: 'var(--primary)' }}>
                  📅 {fd.booked_date} {fd.booked_time || ''}
                </div>
                : <div style={{ fontSize: 14, color: 'var(--gray-400)' }}>면접 일정 미제출</div>
              }
            </div>

            {/* 다른 기업 지원 현황 */}
            {otherApps.length > 0 && (
              <div>
                <SectionTitle>⚠ 다른 기업 지원 현황 ({otherApps.length}개)</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {otherApps.map(oa => (
                    <div key={oa.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--warning-bg)', borderRadius: 8, fontSize: 13 }}>
                      <span style={{ fontWeight: 700 }}>🏢 {oa.form_data?.company_name || '기업명 미상'}</span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span className={`badge ${STAGE_BADGE[oa.stage] || 'b-gray'}`}>{oa.stage || '대기'}</span>
                        {oa.form_data?.booked_date && <span style={{ fontSize: 12, color: 'var(--gray-600)' }}>📅 {oa.form_data.booked_date}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {preview && <PdfPreviewModal url={preview.url} name={preview.name} onClose={() => setPreview(null)} />}
    </>
  )
}

// ── 면접자 카드 ───────────────────────────────────────────
// ── 면접자 카드 ───────────────────────────────────────────
function ApplicantCard({ app, onClick, onDelete }) {
  const fd = app.form_data || {}
  const hasBooked = !!fd.booked_date
  const stage = app.stage || '대기'

  return (
    <div className="card" style={{ cursor: 'pointer', transition: 'all .2s' }}
      onClick={onClick}
      onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
      onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}>
      <div style={{ padding: '18px 18px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
              {(app.name || '?')[0]}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--gray-900)' }}>{app.name || '-'}</div>
              <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>
                {[fd.birth, fd.ed_level].filter(Boolean).join(' · ') || '-'}
              </div>
            </div>
          </div>
          <span className={`badge ${STAGE_BADGE[stage] || 'b-gray'}`}>{stage}</span>
        </div>
        <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '10px 12px', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {[
            ['📞', fd.phone || app.phone || '-'],
            ['✉️', fd.email || app.email || '-'],
            ['🎓', [fd.faculty, fd.dept].filter(Boolean).join(' / ') || '-'],
          ].map(([icon, val]) => (
            <div key={icon} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
              <span style={{ flexShrink: 0 }}>{icon}</span>
              <span style={{ color: 'var(--gray-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: 'var(--gray-50)', borderTop: '1px solid var(--gray-200)', padding: '10px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: hasBooked ? 'var(--primary)' : 'var(--gray-400)' }}>
          📅 {hasBooked ? `${fd.booked_date} ${fd.booked_time || ''}` : '일정 미제출'}
        </div>
        <span className={`badge ${hasBooked ? 'b-green' : 'b-gray'}`} style={{ fontSize: 11 }}>
          {hasBooked ? '제출완료' : '미제출'}
        </span>
      </div>
      <div style={{ padding: '10px 18px', display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
        <button onClick={() => fd.portfolio_link && downloadFile(fd.portfolio_link, '포트폴리오.pdf')}
          disabled={!fd.portfolio_link}
          style={{ flex: 1, height: 30, fontSize: 12, fontWeight: 600, borderRadius: 6, border: '1px solid var(--gray-200)', background: fd.portfolio_link ? '#fff' : 'var(--gray-50)', color: fd.portfolio_link ? 'var(--gray-700)' : 'var(--gray-300)', cursor: fd.portfolio_link ? 'pointer' : 'default' }}>
          📋 포트폴리오
        </button>
        <button onClick={() => fd.resume_link && downloadFile(fd.resume_link, '이력서.pdf')}
          disabled={!fd.resume_link}
          style={{ flex: 1, height: 30, fontSize: 12, fontWeight: 600, borderRadius: 6, border: '1px solid var(--gray-200)', background: fd.resume_link ? '#fff' : 'var(--gray-50)', color: fd.resume_link ? 'var(--gray-700)' : 'var(--gray-300)', cursor: fd.resume_link ? 'pointer' : 'default' }}>
          📄 이력서
        </button>
      </div>
      {onDelete && (
        <div style={{ padding: '0 18px 12px' }} onClick={e => e.stopPropagation()}>
          <button
            onClick={() => {
              if (window.confirm(`${app.name} 면접자를 삭제하시겠습니까?\n삭제 후 복구가 불가능합니다.`)) {
                onDelete(app.id)
              }
            }}
            style={{ width: '100%', height: 30, fontSize: 12, fontWeight: 600, borderRadius: 6, border: '1px solid var(--danger-bg)', background: 'var(--danger-bg)', color: 'var(--danger-text)', cursor: 'pointer' }}>
            🗑 면접자 삭제
          </button>
        </div>
      )}
    </div>
  )
}

// ── 직접 입력 탭 ──────────────────────────────────────────
function ManualTab({ drafts, setDrafts, fixedCompany }) {
  function update(idx, key, val) {
    setDrafts(prev => prev.map((d, i) => i === idx ? { ...d, [key]: val } : d))
  }
  const ynSel = (idx, key, val) => (
    <select className="form-select" value={val} onChange={e => update(idx, key, e.target.value)} style={{ height: 36 }}>
      <option value="N">N</option><option value="Y">Y</option>
    </select>
  )
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>총 {drafts.length}명 작성 중</div>
        <button className="btn btn-secondary btn-sm"
          onClick={() => setDrafts(p => [...p, { ...createEmptyDraft(), companyName: fixedCompany || '' }])}>
          + 인원 추가
        </button>
      </div>
      {drafts.map((d, idx) => (
        <div key={idx} className="card" style={{ marginBottom: 20, border: '1px solid var(--primary-border)' }}>
          <div className="card-header" style={{ background: 'var(--primary-light)' }}>
            <div className="card-title" style={{ color: 'var(--primary)' }}>면접자 #{idx + 1}</div>
            {drafts.length > 1 && <button className="btn btn-danger btn-sm" onClick={() => setDrafts(p => p.filter((_, i) => i !== idx))}>삭제</button>}
          </div>
          <div className="card-body">
            {!fixedCompany && (
              <div className="form-group">
                <label className="form-label">배정 기업명 *</label>
                <input className="form-input" placeholder="기업명" value={d.companyName} onChange={e => update(idx, 'companyName', e.target.value)} />
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 12 }}>
              {[['이름 *', 'name', 'text'], ['신청일자', 'appDate', 'date'], ['생년월일', 'birth', 'date']].map(([l, k, t]) => (
                <div key={k} className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">{l}</label>
                  <input className="form-input" type={t} value={d[k]} onChange={e => update(idx, k, e.target.value)} />
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">주소</label>
                <input className="form-input" value={d.addr} onChange={e => update(idx, 'addr', e.target.value)} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">휴대전화번호</label>
                <input className="form-input" value={d.phone} onChange={e => update(idx, 'phone', e.target.value)} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">이메일</label>
                <input className="form-input" type="email" value={d.email} onChange={e => update(idx, 'email', e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
              {[['학력', 'edLevel'], ['학교', 'school'], ['학부', 'faculty'], ['학과', 'dept']].map(([l, k]) => (
                <div key={k} className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">{l}</label>
                  <input className="form-input" value={d[k]} onChange={e => update(idx, k, e.target.value)} />
                </div>
              ))}
            </div>
            <div style={{ background: 'var(--gray-50)', borderRadius: 8, border: '1px solid var(--gray-200)', padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 10 }}>행정 검증 데이터</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: 11 }}>연간참여횟수</label>
                  <input className="form-input" type="number" min="0" value={d.participationCount} onChange={e => update(idx, 'participationCount', e.target.value)} style={{ height: 36 }} />
                </div>
                {[['국민취업지원', 'nationalEmpSupport'], ['고용보험', 'empInsurance'], ['개인정보동의', 'privacyConsent'], ['내용이상', 'anomalyCheck'], ['첨부파일', 'hasAttachment']].map(([l, k]) => (
                  <div key={k} className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: 11 }}>{l}</label>
                    {ynSel(idx, k, d[k])}
                  </div>
                ))}
              </div>
            </div>
            {[['지원 동기', 'motivation'], ['향후 비전 및 포부', 'vision'], ['관련 경력 (경험)', 'experience']].map(([l, k]) => (
              <div key={k} className="form-group">
                <label className="form-label">{l}</label>
                <textarea className="form-input" style={{ height: 72, resize: 'vertical', padding: 10 }} value={d[k]} onChange={e => update(idx, k, e.target.value)} />
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <label className="form-label" style={{ margin: 0 }}>포트폴리오 / 이력서</label>
                <div className="seg">
                  <button className={`seg-btn ${d.useDriveLink ? '' : 'on'}`}
                    onClick={() => update(idx, 'useDriveLink', false)}>파일 업로드</button>
                  <button className={`seg-btn ${d.useDriveLink ? 'on' : ''}`}
                    onClick={() => update(idx, 'useDriveLink', true)}>링크 입력</button>
                </div>
              </div>

              {d.useDriveLink ? (
                // 링크 입력 모드
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[['포트폴리오 링크', 'portfolioLink', '포트폴리오 URL'], ['이력서 링크', 'resumeLink', '이력서 URL']].map(([l, k, ph]) => (
                    <div key={k}>
                      <label className="form-label" style={{ fontSize: 12 }}>{l}</label>
                      <input className="form-input" placeholder={ph} value={d[k]}
                        onChange={e => update(idx, k, e.target.value)} />
                    </div>
                  ))}
                </div>
              ) : (
                // 파일 업로드 모드 (PDF만)
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[['portfolioFile', '포트폴리오 (PDF)', 'portfolioLink'], ['resumeFile', '이력서 (PDF)', 'resumeLink']].map(([k, l, linkKey]) => (
                    <div key={k}>
                      <label className="form-label" style={{ fontSize: 12 }}>{l}</label>
                      <label style={{
                        display: 'flex', alignItems: 'center', gap: 8, height: 40,
                        padding: '0 12px', border: '1px solid var(--gray-300)', borderRadius: 8,
                        cursor: 'pointer', fontSize: 13,
                        color: d[k] ? 'var(--gray-900)' : 'var(--gray-400)', background: '#fff'
                      }}>
                        📎 {d[k] ? d[k].name : 'PDF 파일 선택'}
                        <input type="file" accept=".pdf" style={{ display: 'none' }}
                          onChange={async e => {
                            const file = e.target.files[0]
                            if (!file) return
                            // 로컬 파일 객체 저장 (UI 표시용)
                            update(idx, k, file)
                            try {
                              const ext = file.name.split('.').pop()
                              const path = `applicants/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
                              const { data, error } = await supabase.storage
                                .from('interview')
                                .upload(path, file, { cacheControl: '3600', upsert: false })
                              if (error) {
                                console.error('업로드 실패:', error)
                                // base64 fallback
                                const reader = new FileReader()
                                reader.onload = ev => update(idx, linkKey, ev.target.result)
                                reader.readAsDataURL(file)
                                return
                              }
                              const { data: urlData } = supabase.storage.from('interview').getPublicUrl(path)
                              update(idx, linkKey, urlData.publicUrl)
                            } catch (err) {
                              console.error('업로드 에러:', err)
                            }
                          }} />
                      </label>
                      {d[linkKey] && (
                        <div style={{ fontSize: 11, color: 'var(--primary)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          ✓ 업로드 완료
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── 엑셀 탭 ───────────────────────────────────────────────
function ExcelTab({ parsed, setParsed }) {
  const [dragging, setDragging] = useState(false)
  async function handleFile(file) {
    const XLSX = await loadXLSX()
    const reader = new FileReader()
    reader.onload = e => {
      const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 })
      const headers = rows[1]
      const result = rows.slice(2).filter(r => r.some(c => c !== null && c !== undefined && c !== '')).map(row => {
        const get = col => { const i = headers.indexOf(col); return i >= 0 ? String(row[i] ?? '') : '' }
        return {
          companyName: extractCompany(get('프로그램명')),
          name: get('이름'), appDate: get('신청일자'), birth: get('생년월일'),
          addr: get('주소'), phone: get('휴대전화번호'), email: get('이메일'),
          edLevel: get('학력'), school: get('학교'), faculty: get('학부'), dept: get('학과'),
          participationCount: get('연간참여횟수') || '0',
          nationalEmpSupport: get('국민취업지원제도참여여부') || 'N',
          empInsurance: get('고용보험가입여부') || 'N',
          privacyConsent: get('개인정보활용동의여부') || 'N',
          anomalyCheck: get('확인내용이상여부') || 'N',
          hasAttachment: get('첨부파일유무') || 'N',
          motivation: get('지원동기'),
          vision: get('향후 비전 및 포부(수행계획)'),
          experience: get('관련 경력(경험)'),
          portfolioLink: '', resumeLink: '',
        }
      })
      setParsed(result)
    }
    reader.readAsArrayBuffer(file)
  }
  const grouped = parsed ? parsed.reduce((acc, r) => { const k = r.companyName; if (!acc[k]) acc[k] = []; acc[k].push(r); return acc }, {}) : null
  return (
    <div>
      <div style={{ background: 'var(--primary-light)', border: '1px solid var(--primary-border)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, lineHeight: 1.7 }}>
        💡 <strong>1행</strong> 메타정보, <strong>2행</strong> 컬럼 헤더, <strong>3행~</strong> 데이터. <code>[기업명]</code> 형식으로 자동 분류.
      </div>
      <label onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        style={{ display: 'block', border: `2px dashed ${dragging ? 'var(--primary)' : 'var(--gray-300)'}`, borderRadius: 10, padding: 32, textAlign: 'center', background: dragging ? 'var(--primary-light)' : '#fff', cursor: 'pointer', transition: 'all .2s', marginBottom: 20 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>클릭하거나 파일 드래그</div>
        <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>.xlsx / .csv</div>
        <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) handleFile(f) }} />
      </label>
      {grouped && Object.entries(grouped).map(([company, rows]) => (
        <div key={company} className="card" style={{ marginBottom: 12 }}>
          <div className="card-header"><div className="card-title">🏢 {company} ({rows.length}명)</div></div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: 'var(--gray-50)' }}>
                {['이름', '신청일자', '연락처', '학교', '학과'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', borderBottom: '1px solid var(--gray-200)', fontWeight: 600, color: 'var(--gray-500)', textAlign: 'left' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 700 }}>{r.name || '-'}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--gray-600)' }}>{r.appDate || '-'}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--gray-600)' }}>{r.phone || '-'}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--gray-600)' }}>{r.school || '-'}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--gray-600)' }}>{r.dept || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── 기업별 대시보드 ───────────────────────────────────────
function CompanyDashboard({ company, apps, allApps, setting, progId, selectedProgram, onBack, onRefresh }) {
  const [tab, setTab] = useState('settings')
  const [applicantFilter, setApplicantFilter] = useState('전체')
  const [showAddModal, setShowAddModal] = useState(false)
  const [drafts, setDrafts] = useState([{ ...createEmptyDraft(), companyName: company }])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [selectedApp, setSelectedApp] = useState(null)
  const [checkedApps, setCheckedApps] = useState([])  // 선택된 면접자 id 목록

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function handleDeleteApplicant(appId) {
    try {
      const { error } = await supabase.from('applications').delete().eq('id', appId)
      if (error) throw error
      showToast('면접자가 삭제되었습니다.')
      onRefresh()
    } catch (err) {
      showToast('삭제 실패: ' + err.message)
    }
  }

  async function handleAddApplicant() {
    setSaving(true)
    try {
      const valid = drafts.filter(d => d.name.trim())
      if (!valid.length) { showToast('이름을 입력해주세요.'); return }
      const payload = valid.map(r => ({
        program_id: progId, brand: selectedProgram?.brand || null,
        application_type: 'interview', stage: '면접 예정',
        name: r.name, email: r.email || null, phone: r.phone || null,
        form_data: {
          company_name: company, name: r.name, email: r.email || '', phone: r.phone || '',
          app_date: r.appDate || '', birth: r.birth || '', addr: r.addr || '',
          ed_level: r.edLevel || '', school: r.school || '', faculty: r.faculty || '', dept: r.dept || '',
          participation_count: r.participationCount || '0',
          national_emp_support: r.nationalEmpSupport || 'N', emp_insurance: r.empInsurance || 'N',
          privacy_consent: r.privacyConsent || 'N', anomaly_check: r.anomalyCheck || 'N',
          has_attachment: r.hasAttachment || 'N',
          motivation: r.motivation || '', vision: r.vision || '', experience: r.experience || '',
          portfolio_link: r.portfolioLink || '', resume_link: r.resumeLink || '',
        },
      }))
      const { error } = await supabase.from('applications').insert(payload)
      if (error) throw error
      showToast(`${payload.length}명 등록 완료`)
      setShowAddModal(false)
      setDrafts([{ ...createEmptyDraft(), companyName: company }])
      onRefresh()
    } catch (err) { showToast('실패: ' + err.message) }
    finally { setSaving(false) }
  }
  const now = new Date()

  // 면접자 필터
  const filteredApps = apps.filter(app => {
    if (applicantFilter === '면접 예정') {
      // stage가 '면접 예정'인 사람만
      return app.stage === '면접 예정'
    }
    if (applicantFilter === '면접 완료') {
      // 면접 일정 날짜가 오늘보다 이전이면 자동으로 완료 탭
      const bookedDate = app.form_data?.booked_date
      const isPast = bookedDate && new Date(bookedDate) < now
      return isPast || ['최종합격', '불합격', '예비합격'].includes(app.stage)
    }
    return true
  })

  const isSubmitted = setting?.status === 'submitted'
  const fd = setting || {}

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={onBack}>← 목록으로</button>
          <div>
            <div className="page-title">{company}</div>
            <div className="page-subtitle">기업 대시보드 — 면접 설정 및 면접자 관리</div>
          </div>
        </div>
        <span className={`badge ${isSubmitted ? 'b-green' : 'b-gray'}`} style={{ fontSize: 13, padding: '6px 14px' }}>
          {isSubmitted ? '✅ 일정 선택 완료' : '⏳ 일정 미선택'}
        </span>
      </div>

      <div className="seg" style={{ marginBottom: 24 }}>
        <button className={`seg-btn ${tab === 'settings' ? 'on' : ''}`} onClick={() => setTab('settings')}>⚙️ 면접 설정</button>
        <button className={`seg-btn ${tab === 'applicants' ? 'on' : ''}`} onClick={() => setTab('applicants')}>
          👥 면접자 리스트 ({apps.length}명)
        </button>
      </div>

      {tab === 'settings' && (
        <div style={{ maxWidth: 720 }}>
          {!isSubmitted ? (
            <div className="card">
              <div className="empty" style={{ padding: '60px 24px' }}>
                <div style={{ fontSize: 40, marginBottom: 16, opacity: .4 }}>⏳</div>
                <div className="empty-title">아직 일정을 선택하지 않았습니다.</div>
                <div style={{ fontSize: 14, color: 'var(--gray-400)', marginTop: 6 }}>기업 담당자가 면접 설정을 제출하면 여기에 표시됩니다.</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card">
                <div className="card-header"><div className="card-title">👤 담당자 정보</div></div>
                <div className="card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {[['기업명', fd.company_name], ['담당자 이메일', fd.manager_email], ['담당자 연락처', fd.manager_phone], ['제출일시', fd.submitted_at ? new Date(fd.submitted_at).toLocaleString('ko-KR') : '-']].map(([l, v]) => (
                      <div key={l}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', marginBottom: 4 }}>{l}</div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{v || '-'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="card-header"><div className="card-title">🎯 면접 방식 및 형태</div></div>
                <div className="card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', marginBottom: 4 }}>면접 방식</div>
                      <span className={`badge ${fd.interview_mode === 'online' ? 'b-blue' : 'b-green'}`} style={{ fontSize: 13, padding: '4px 12px' }}>
                        {fd.interview_mode === 'online' ? '🖥 비대면(화상)' : '🏢 대면'}
                      </span>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', marginBottom: 4 }}>면접 형태</div>
                      <span className={`badge ${fd.interview_type === '1on1' ? 'b-purple' : 'b-orange'}`} style={{ fontSize: 13, padding: '4px 12px' }}>
                        {fd.interview_type === '1on1' ? '1:1 면접' : `그룹 면접 (최대 ${fd.group_max_count || '-'}명)`}
                      </span>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', marginBottom: 4 }}>소요 시간</div>
                      <span className="badge b-gray" style={{ fontSize: 13, padding: '4px 12px' }}>⏱ {fd.slot_minutes || '-'}분</span>
                    </div>
                  </div>
                  {fd.interview_mode === 'online' && (
                    <div style={{ background: 'var(--primary-light)', border: '1px solid var(--primary-border)', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>
                      🔗 화상 면접 링크는 면접 일정 확정 후 면접자별로 자동 생성됩니다.
                    </div>
                  )}
                  {fd.interview_mode === 'face' && fd.face_address && (
                    <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 8, padding: '12px 16px', fontSize: 13 }}>
                      📍 <strong>대면 면접 주소:</strong> {fd.face_address}
                    </div>
                  )}
                </div>
              </div>
              <div className="card">
                <div className="card-header"><div className="card-title">📅 제출된 면접 가능 일정</div></div>
                <div className="card-body">
                  {(!fd.available_slots || fd.available_slots.length === 0) ? (
                    <div style={{ color: 'var(--gray-400)', fontSize: 14 }}>제출된 일정이 없습니다.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {fd.available_slots.map((slot, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--gray-50)', borderRadius: 8, border: '1px solid var(--gray-200)' }}>
                          <div style={{ fontSize: 14, fontWeight: 700, width: 100 }}>{slot.date}</div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {(slot.time_slots || []).map((ts, j) => (
                              <span key={j} className="badge b-blue" style={{ fontSize: 12 }}>{ts.start} ~ {ts.end}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'applicants' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div className="seg">
              {['전체', '면접 예정', '면접 완료'].map(f => (
                <button key={f} className={`seg-btn ${applicantFilter === f ? 'on' : ''}`}
                  onClick={() => { setApplicantFilter(f); setCheckedApps([]) }}>{f}</button>
              ))}
            </div>
            <button className="btn btn-primary"
              onClick={() => { setDrafts([{ ...createEmptyDraft(), companyName: company }]); setShowAddModal(true) }}>
              + 면접자 추가
            </button>
          </div>

          {/* 선택 삭제 액션바 */}
          {checkedApps.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '10px 16px', background: 'var(--danger-bg)', borderRadius: 8, border: '1px solid #FCA5A5' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger-text)' }}>
                {checkedApps.length}명 선택됨
              </span>
              <button className="btn btn-danger btn-sm"
                onClick={async () => {
                  if (!window.confirm(`선택한 ${checkedApps.length}명을 삭제하시겠습니까?\n삭제 후 복구가 불가능합니다.`)) return
                  for (const id of checkedApps) await handleDeleteApplicant(id)
                  setCheckedApps([])
                }}>
                🗑 선택 삭제
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setCheckedApps([])}>선택 해제</button>
            </div>
          )}

          {/* 전체 선택 */}
          {filteredApps.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--gray-600)', cursor: 'pointer' }}>
                <input type="checkbox"
                  checked={filteredApps.every(a => checkedApps.includes(a.id))}
                  onChange={e => setCheckedApps(e.target.checked ? filteredApps.map(a => a.id) : [])}
                  style={{ width: 15, height: 15, accentColor: 'var(--primary)', cursor: 'pointer' }} />
                전체 선택
              </label>
            </div>
          )}

          {filteredApps.length === 0 ? (
            <div className="card"><div className="empty">
              <div style={{ fontSize: 36, opacity: .4, marginBottom: 12 }}>👥</div>
              <div className="empty-title">해당하는 면접자가 없습니다.</div>
            </div></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {filteredApps.map(app => {
                const isChecked = checkedApps.includes(app.id)
                return (
                  <div key={app.id} style={{ position: 'relative' }}>
                    {/* 체크박스 */}
                    <div style={{ position: 'absolute', top: 14, left: 14, zIndex: 10 }}
                      onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isChecked}
                        onChange={e => setCheckedApps(prev =>
                          e.target.checked ? [...prev, app.id] : prev.filter(id => id !== app.id)
                        )}
                        style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer' }} />
                    </div>
                    <ApplicantCard app={app} onClick={() => setSelectedApp(app)} />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {selectedApp && (
        <ApplicantDetailModal
          app={selectedApp} allApps={allApps}
          onClose={() => setSelectedApp(null)}
          onStageChange={() => onRefresh()}
        />
      )}

      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.45)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 24, overflowY: 'auto' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false) }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 860, boxShadow: '0 20px 40px rgba(0,0,0,.15)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{company} — 면접자 추가</div>
              <button onClick={() => setShowAddModal(false)} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gray-100)', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px', background: 'var(--gray-50)' }}>
              <ManualTab drafts={drafts} setDrafts={setDrafts} fixedCompany={company} />
            </div>
            <div style={{ padding: '16px 28px', borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'flex-end', gap: 12, flexShrink: 0 }}>
              <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={handleAddApplicant} disabled={saving}>{saving ? '저장 중...' : '등록 완료'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--gray-900)', color: '#fff', padding: '10px 20px', borderRadius: 999, fontSize: 14, zIndex: 9999 }}>
          ✓ {toast}
        </div>
      )}
    </div>
  )
}

// ── 메인 ManagementPage ────────────────────────────────────
// ── 메인 ManagementPage ────────────────────────────────────
export default function ManagementPage() {
  const { progId } = useParams()
  const { selectedProgram } = useProgram()
  const [applications, setApplications] = useState([])
  const [settings, setSettings] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterMode, setFilterMode] = useState('전체')
  const [filterType, setFilterType] = useState('전체')
  const [filterSchedule, setFilterSchedule] = useState('전체')
  const [activeCompany, setActiveCompany] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState('manual')
  const [manualDrafts, setManualDrafts] = useState([createEmptyDraft()])
  const [excelParsed, setExcelParsed] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [checkedCompanies, setCheckedCompanies] = useState([])

  useEffect(() => { loadData() }, [progId])

  async function loadData() {
    setLoading(true)
    try {
      const { data: apps, error: appsError } = await supabase
        .from('applications').select('*')
        .eq('program_id', progId).eq('application_type', 'interview')
        .order('created_at', { ascending: false })
      if (appsError) throw appsError

      let stgs = []
      try {
        const { data, error } = await supabase.from('interview_settings').select('*').eq('program_id', progId)
        if (!error) stgs = data || []
      } catch (e) { console.warn('interview_settings 조회 실패:', e) }

      setApplications(apps || [])
      setSettings(stgs)
    } catch (err) { console.error('loadData 실패:', err) }
    finally { setLoading(false) }
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function handleDeleteCompany(company) {
    try {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('program_id', progId)
        .eq('application_type', 'interview')
        .filter('form_data->>company_name', 'eq', company)
      if (error) throw error
    } catch (err) {
      showToast('삭제 실패: ' + err.message)
      throw err
    }
  }

  async function handleBulkDeleteCompanies() {
    if (!checkedCompanies.length) return
    if (!window.confirm(`선택한 ${checkedCompanies.length}개 기업과 소속 면접자 전체를 삭제하시겠습니까?\n삭제 후 복구가 불가능합니다.`)) return
    try {
      for (const company of checkedCompanies) {
        await handleDeleteCompany(company)
      }
      showToast(`${checkedCompanies.length}개 기업이 삭제되었습니다.`)
      setCheckedCompanies([])
      await loadData()
    } catch (err) {
      showToast('일부 삭제 실패: ' + err.message)
      await loadData()
    }
  }

  const grouped = applications.reduce((acc, app) => {
    const k = app.form_data?.company_name || '미분류'
    if (!acc[k]) acc[k] = []
    acc[k].push(app)
    return acc
  }, {})

  const companyCards = Object.entries(grouped).map(([company, apps]) => {
    const setting = settings.find(s => s.company_name === company)
    return {
      company, apps, setting,
      mode: setting?.interview_mode || null,
      type: setting?.interview_type || null,
      isSubmitted: setting?.status === 'submitted',
      totalCount: apps.length,
      submittedCount: apps.filter(a => a.form_data?.booked_date).length,
    }
  })

  const filtered = companyCards.filter(c => {
    if (search && !c.company.includes(search)) return false
    if (filterMode !== '전체') {
      if (filterMode === '비대면(화상)' && c.mode !== 'online') return false
      if (filterMode === '대면' && c.mode !== 'face') return false
    }
    if (filterType !== '전체') {
      if (filterType === '1:1 면접' && c.type !== '1on1') return false
      if (filterType === '그룹 면접' && c.type !== 'group') return false
    }
    if (filterSchedule !== '전체') {
      if (filterSchedule === '제출 완료' && !c.isSubmitted) return false
      if (filterSchedule === '미제출' && c.isSubmitted) return false
    }
    return true
  })

  if (activeCompany) {
    const card = companyCards.find(c => c.company === activeCompany)
    return (
      <CompanyDashboard
        company={activeCompany}
        apps={card?.apps || []}
        allApps={applications}
        setting={card?.setting || null}
        progId={progId}
        selectedProgram={selectedProgram}
        onBack={() => setActiveCompany(null)}
        onRefresh={loadData}
      />
    )
  }

  async function handleSave() {
    setSaving(true)
    try {
      const toSave = activeTab === 'manual'
        ? manualDrafts.filter(d => d.name.trim())
        : (excelParsed || []).filter(r => r.name?.trim())
      if (!toSave.length) { showToast('등록할 데이터가 없습니다.'); return }
      const payload = toSave.map(r => ({
        program_id: progId, brand: selectedProgram?.brand || null,
        application_type: 'interview', stage: '면접 예정',
        name: r.name, email: r.email || null, phone: r.phone || null,
        form_data: {
          company_name: r.companyName, name: r.name, email: r.email || '', phone: r.phone || '',
          app_date: r.appDate || '', birth: r.birth || '', addr: r.addr || '',
          ed_level: r.edLevel || '', school: r.school || '', faculty: r.faculty || '', dept: r.dept || '',
          participation_count: r.participationCount || '0',
          national_emp_support: r.nationalEmpSupport || 'N', emp_insurance: r.empInsurance || 'N',
          privacy_consent: r.privacyConsent || 'N', anomaly_check: r.anomalyCheck || 'N',
          has_attachment: r.hasAttachment || 'N',
          motivation: r.motivation || '', vision: r.vision || '', experience: r.experience || '',
          portfolio_link: r.portfolioLink || '', resume_link: r.resumeLink || '',
        },
      }))
      const { error } = await supabase.from('applications').insert(payload)
      if (error) throw error
      showToast(`${payload.length}명 등록 완료`)
      setShowModal(false); setManualDrafts([createEmptyDraft()]); setExcelParsed(null)
      await loadData()
    } catch (err) { showToast('저장 실패: ' + err.message) }
    finally { setSaving(false) }
  }

  // 전체 선택 여부
  const allChecked = filtered.length > 0 && filtered.every(c => checkedCompanies.includes(c.company))
  const someChecked = checkedCompanies.length > 0

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">면접 관리</div>
          <div className="page-subtitle">기업별 면접 현황 및 면접자를 관리합니다.</div>
        </div>
        <button className="btn btn-primary"
          onClick={() => { setManualDrafts([createEmptyDraft()]); setExcelParsed(null); setActiveTab('manual'); setShowModal(true) }}>
          + 면접자 등록
        </button>
      </div>

      {/* 필터 */}
      <div className="card" style={{ marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--gray-200)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 40, padding: '0 12px', border: '1px solid var(--gray-200)', borderRadius: 8, background: 'var(--gray-50)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 14 }}
              placeholder="기업명으로 검색" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <ChipFilter label="면접 방식" options={MODE_OPTIONS} value={filterMode} onChange={setFilterMode} />
        <ChipFilter label="면접 형태" options={TYPE_OPTIONS} value={filterType} onChange={setFilterType} />
        <ChipFilter label="일정 제출" options={SCHEDULE_OPTIONS} value={filterSchedule} onChange={setFilterSchedule} />
      </div>

      {/* 선택 삭제 액션바 */}
      {someChecked && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '10px 16px', background: 'var(--danger-bg)', borderRadius: 8, border: '1px solid #FCA5A5' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger-text)' }}>
            {checkedCompanies.length}개 기업 선택됨
          </span>
          <button className="btn btn-danger btn-sm" onClick={handleBulkDeleteCompanies}>
            🗑 선택 기업 삭제
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setCheckedCompanies([])}>
            선택 해제
          </button>
        </div>
      )}

      {/* 기업 카드 */}
      {loading ? (
        <div className="card"><div className="empty"><div className="empty-title">불러오는 중...</div></div></div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div style={{ fontSize: 40, opacity: .4, marginBottom: 12 }}>🏢</div>
            <div className="empty-title">등록된 기업이 없습니다.</div>
            <div style={{ fontSize: 14, color: 'var(--gray-400)', marginTop: 4 }}>면접자를 등록하면 기업별로 자동 분류됩니다.</div>
          </div>
        </div>
      ) : (
        <>
          {/* 전체 선택 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--gray-600)', cursor: 'pointer' }}>
              <input type="checkbox" checked={allChecked}
                onChange={e => setCheckedCompanies(e.target.checked ? filtered.map(c => c.company) : [])}
                style={{ width: 15, height: 15, accentColor: 'var(--primary)', cursor: 'pointer' }} />
              전체 선택
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {filtered.map(({ company, mode, type, isSubmitted, totalCount, submittedCount }) => {
              const isChecked = checkedCompanies.includes(company)
              return (
                <div key={company} style={{ position: 'relative' }}>
                  {/* 체크박스 */}
                  <div style={{ position: 'absolute', top: 14, left: 14, zIndex: 10 }}
                    onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={isChecked}
                      onChange={e => setCheckedCompanies(prev =>
                        e.target.checked ? [...prev, company] : prev.filter(c => c !== company)
                      )}
                      style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer' }} />
                  </div>

                  <div className="card" style={{ cursor: 'pointer', transition: 'all .2s', outline: isChecked ? '2px solid var(--primary)' : 'none' }}
                    onClick={() => setActiveCompany(company)}
                    onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
                    onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}>
                    <div style={{ padding: '20px 20px 0 40px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--gray-900)' }}>{company}</div>
                        <span className={`badge ${isSubmitted ? 'b-green' : 'b-gray'}`}>
                          {isSubmitted ? '제출 완료' : '미제출'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                        {mode
                          ? <span className={`badge ${mode === 'online' ? 'b-blue' : 'b-green'}`}>{mode === 'online' ? '비대면(화상)' : '대면'}</span>
                          : <span className="badge b-gray">방식 미설정</span>}
                        {type
                          ? <span className={`badge ${type === '1on1' ? 'b-purple' : 'b-orange'}`}>{type === '1on1' ? '1:1 면접' : '그룹 면접'}</span>
                          : <span className="badge b-gray">형태 미설정</span>}
                      </div>
                    </div>
                    <div style={{ background: 'var(--gray-50)', borderTop: '1px solid var(--gray-200)', padding: '14px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', marginBottom: 4 }}>면접자 수</div>
                        <div style={{ fontSize: 20, fontWeight: 800 }}>
                          {totalCount}<span style={{ fontSize: 13, color: 'var(--gray-500)', marginLeft: 2 }}>명</span>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', marginBottom: 4 }}>일정 제출</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: submittedCount === totalCount && totalCount > 0 ? 'var(--success)' : 'var(--warning)' }}>
                          {submittedCount}<span style={{ fontSize: 13, color: 'var(--gray-500)', marginLeft: 2 }}>/ {totalCount}명</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* 등록 모달 */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.45)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 24, overflowY: 'auto' }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 860, boxShadow: '0 20px 40px rgba(0,0,0,.15)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>면접자 등록</div>
              <button onClick={() => setShowModal(false)} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gray-100)', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div style={{ padding: '16px 28px 0', flexShrink: 0 }}>
              <div className="seg">
                <button className={`seg-btn ${activeTab === 'manual' ? 'on' : ''}`} onClick={() => setActiveTab('manual')}>✍️ 직접 입력</button>
                <button className={`seg-btn ${activeTab === 'excel' ? 'on' : ''}`} onClick={() => setActiveTab('excel')}>📊 엑셀 일괄 등록</button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px', background: 'var(--gray-50)' }}>
              {activeTab === 'manual'
                ? <ManualTab drafts={manualDrafts} setDrafts={setManualDrafts} />
                : <ExcelTab parsed={excelParsed} setParsed={setExcelParsed} />}
            </div>
            <div style={{ padding: '16px 28px', borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'flex-end', gap: 12, flexShrink: 0 }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? '저장 중...' : activeTab === 'manual' ? '등록 완료' : `${excelParsed?.length || 0}명 일괄 등록`}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--gray-900)', color: '#fff', padding: '10px 20px', borderRadius: 999, fontSize: 14, zIndex: 9999 }}>
          ✓ {toast}
        </div>
      )}
    </div>
  )
}