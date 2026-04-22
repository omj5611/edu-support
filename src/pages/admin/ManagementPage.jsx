import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useProgram } from '../../contexts/ProgramContext'
import { supabase } from '../../lib/supabase'
import VideoInterviewRoom from '../company/VideoInterviewRoom'
import StatusDropdown from '../../components/StatusDropdown'

// ── XLSX 로더 ─────────────────────────────────────────────
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

const STAGE_OPTIONS = ['평가 전', '불합격', '예비합격', '최종합격', '중도포기']
const STAGE_BADGE = {
  '평가 전': 'b-blue', '면접 예정': 'b-blue', '불합격': 'b-red',
  '예비합격': 'b-orange', '최종합격': 'b-green', '대기': 'b-gray',
  '중도포기': 'b-purple',
}

const STAGE_DROPDOWN_OPTIONS = [
  { value: '평가 전', label: '평가 전', badgeClass: 'b-blue' },
  { value: '예비합격', label: '예비합격', badgeClass: 'b-orange' },
  { value: '최종합격', label: '최종합격', badgeClass: 'b-green' },
  { value: '불합격', label: '불합격', badgeClass: 'b-red' },
  { value: '중도포기', label: '중도포기', badgeClass: 'b-purple' },
]
const MODE_OPTIONS = ['전체', '비대면(화상)', '대면']
const TYPE_OPTIONS = ['전체', '1:1 면접', '그룹 면접']
const SCHEDULE_OPTIONS = ['전체', '제출 완료', '미제출']

function normalizeCompanyName(v) {
  return (v || '').trim().toLowerCase()
}

function normalizeApplicantName(v) {
  return (v || '').trim().toLowerCase()
}

function normalizeApplicantBirth(v) {
  const raw = String(v || '').trim()
  if (!raw) return ''
  return raw.replace(/\D/g, '')
}

function getApplicantIdentityKey({ name = '', birth = '' } = {}) {
  const normalizedName = normalizeApplicantName(name)
  const normalizedBirth = normalizeApplicantBirth(birth)
  if (!normalizedName || !normalizedBirth) return ''
  return `name:${normalizedName}|birth:${normalizedBirth}`
}

function findDuplicateApplicantMessage(rows = [], existingApps = []) {
  const seen = new Map()

  const register = (companyName, name, birth) => {
    const companyKey = normalizeCompanyName(companyName)
    if (!companyKey) return ''
    const identityKey = getApplicantIdentityKey({ name, birth })
    if (!identityKey) return ''

    const key = `${companyKey}|${identityKey}`
    if (seen.has(key)) {
      const prev = seen.get(key)
      const companyLabel = String(companyName || prev.companyName || '').trim() || '미지정 기업'
      const personLabel = String(name || prev.name || '').trim() || '이름 미기재'
      return `같은 기업(${companyLabel})에 이름과 생년월일이 같은 면접자(${personLabel})가 있습니다.`
    }
    seen.set(key, { companyName, name })
    return ''
  }

  for (const app of existingApps || []) {
    const fd = app?.form_data || {}
    const msg = register(fd.company_name || '', app?.name || fd.name || '', fd.birth || app?.birth || '')
    if (msg) return msg
  }

  for (const row of rows || []) {
    const msg = register(row.companyName || row.company_name || '', row.name || '', row.birth || '')
    if (msg) return msg
  }

  return ''
}

async function fetchExistingInterviewAppsByProgram(programId) {
  if (!programId) return []
  const { data, error } = await supabase
    .from('applications')
    .select('id, name, phone, email, form_data')
    .eq('program_id', programId)
    .eq('application_type', 'interview')
  if (error) throw error
  return data || []
}

function normalizeEvaluationStatus(value) {
  const raw = String(value || '').trim()
  if (raw === '평가완료' || raw === '평가 완료') return '평가완료'
  return '평가 전'
}

function normalizeApplicantStage(value) {
  return ['예비합격', '최종합격', '불합격', '중도포기'].includes(value) ? value : '평가 전'
}

function normalizeEvaluationBucket(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function getEvaluationStageFromBucket(bucket, appId) {
  if (!appId) return ''
  const raw = normalizeEvaluationBucket(bucket)?.[appId]
  if (typeof raw === 'string') return normalizeApplicantStage(raw)
  if (raw && typeof raw === 'object') return normalizeApplicantStage(raw.stage || raw.value || raw.status)
  return ''
}

function setEvaluationStageInBucket(bucket, appId, stage, updatedBy) {
  if (!appId) return normalizeEvaluationBucket(bucket)
  const next = { ...normalizeEvaluationBucket(bucket) }
  next[appId] = {
    stage: normalizeApplicantStage(stage),
    updated_at: new Date().toISOString(),
    updated_by: updatedBy || 'admin',
  }
  return next
}

function getCompanySetting(settings = [], companyName = '') {
  const key = normalizeCompanyName(companyName)
  return (settings || []).find((s) => normalizeCompanyName(s.company_name) === key) || null
}

function getAdminStage(app) {
  return normalizeApplicantStage(app?.evaluation_admin_stage || app?.stage)
}

function getMeetingLinkFromSchedule(schedule) {
  return String(schedule?.meeting_link || '').trim()
}

function parseMeetingRoomCode(link) {
  if (!link) return ''
  try {
    const url = new URL(String(link), window.location.origin)
    return String(url.searchParams.get('room') || '').trim()
  } catch (_) {
    const m = String(link).match(/[?&]room=([^&#]+)/i)
    return m?.[1] ? decodeURIComponent(m[1]) : ''
  }
}

// ── SVG 아이콘 ────────────────────────────────────────────
const Icon = {
  Search: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  ChevronRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  ),
  Close: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
  Download: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Eye: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ),
  User: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Phone: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.23h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.37a16 16 0 0 0 6.72 6.72l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  Mail: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  GraduationCap: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  ),
  Calendar: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  FileText: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  Trash: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  Sparkle: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
    </svg>
  ),
  Building: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="2" y="3" width="20" height="18" /><path d="M9 21V9h6v12" /><path d="M9 12h6" />
    </svg>
  ),
  Plus: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
}

// ── 칩 필터 ───────────────────────────────────────────────
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

// ── 파일 다운로드 ─────────────────────────────────────────
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
          <div style={{ fontSize: 14, fontWeight: 700 }}>{name}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => downloadFile(url, name)}>
              <Icon.Download /> 다운로드
            </button>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--gray-100)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon.Close />
            </button>
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
  const [stage, setStage] = useState(getAdminStage(app))
  const [preview, setPreview] = useState(null)
  const [editingFiles, setEditingFiles] = useState(false)
  const [fileForm, setFileForm] = useState({
    portfolioLink: fd.portfolio_link || '',
    resumeLink: fd.resume_link || '',
    portfolioType: 'link',
    resumeType: 'link',
  })
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('info') // 'info' | 'ai'

  useEffect(() => {
    setStage(getAdminStage(app))
  }, [app.id, app.stage, app.evaluation_admin_stage])

  const otherApps = allApps.filter(a =>
    a.id !== app.id && a.name === app.name &&
    (a.form_data?.phone === fd.phone || a.email === app.email)
  )

  // 면접 완료 여부 (날짜가 지난 경우)
  const isInterviewDone = (() => {
    const bookedDate = fd.booked_date
    if (!bookedDate) return false
    return new Date(bookedDate) < new Date()
  })()

  async function handleStageChange(newStage) {
    setSaving(true)
    try {
      const targetApp = allApps.find((row) => row.id === app.id) || app
      const companyName = targetApp?.form_data?.company_name || ''
      const { data: settingRow, error: fetchErr } = await supabase
        .from('interview_settings')
        .select('id, evaluation_admin')
        .eq('program_id', targetApp?.program_id || null)
        .eq('company_name', companyName)
        .maybeSingle()
      if (fetchErr) throw fetchErr
      const nextStage = normalizeApplicantStage(newStage)
      if (!settingRow?.id) throw new Error('면접 설정 정보가 없습니다.')
      const nextBucket = setEvaluationStageInBucket(settingRow.evaluation_admin, app.id, nextStage, 'admin')
      const { error } = await supabase
        .from('interview_settings')
        .update({ evaluation_admin: nextBucket })
        .eq('id', settingRow.id)
      if (error) throw error
      setStage(nextStage)
      onStageChange(app.id, nextStage)
    } catch (err) { alert('변경 실패: ' + err.message) }
    finally { setSaving(false) }
  }

  const FileBtn = ({ url, name: fname, label }) => {
    if (!url) return <span style={{ fontSize: 13, color: 'var(--gray-400)' }}>미등록</span>
    const isPdf = fname?.toLowerCase().endsWith('.pdf') || url.includes('.pdf')
    return (
      <div style={{ display: 'flex', gap: 6 }}>
        {isPdf && (
          <button onClick={() => setPreview({ url, name: fname || label })} className="btn btn-secondary btn-sm">
            <Icon.Eye /> 미리보기
          </button>
        )}
        <button onClick={() => downloadFile(url, fname || label)} className="btn btn-secondary btn-sm">
          <Icon.Download /> 다운로드
        </button>
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
              <StatusDropdown
                value={stage}
                options={STAGE_DROPDOWN_OPTIONS}
                onChange={handleStageChange}
                disabled={saving}
              />
              <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gray-100)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon.Close />
              </button>
            </div>
          </div>

          {/* 탭 */}
          <div style={{ padding: '0 28px', borderBottom: '1px solid var(--gray-200)', display: 'flex', gap: 0 }}>
            {[['info', '지원 정보'], ['ai', 'AI 면접 리포트']].map(([key, label]) => (
              <button key={key} onClick={() => setActiveTab(key)}
                style={{
                  padding: '14px 20px', fontSize: 14, fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer',
                  color: activeTab === key ? 'var(--primary)' : 'var(--gray-500)',
                  borderBottom: activeTab === key ? '2px solid var(--primary)' : '2px solid transparent',
                  marginBottom: -1,
                }}>
                {key === 'ai' && <span style={{ marginRight: 6, opacity: !isInterviewDone ? .4 : 1 }}><Icon.Sparkle /></span>}
                {label}
                {key === 'ai' && !isInterviewDone && (
                  <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--gray-400)', fontWeight: 400 }}>면접 완료 후 활성화</span>
                )}
              </button>
            ))}
          </div>

          {/* 탭 콘텐츠 */}
          {activeTab === 'info' && (
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* 기본 정보 + 학력 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, alignItems: 'start' }}>
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
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditingFiles(v => !v)}>
                    {editingFiles ? '취소' : '수정'}
                  </button>
                </div>
                {editingFiles && (
                  <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: 16, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[['포트폴리오', 'portfolioLink', 'portfolioType'], ['이력서', 'resumeLink', 'resumeType']].map(([label, linkKey, typeKey]) => (
                      <div key={linkKey}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 6 }}>{label}</div>
                        <div className="seg" style={{ marginBottom: 8 }}>
                          <button className={`seg-btn ${fileForm[typeKey] === 'link' ? 'on' : ''}`} onClick={() => setFileForm(f => ({ ...f, [typeKey]: 'link' }))}>링크 입력</button>
                          <button className={`seg-btn ${fileForm[typeKey] === 'pdf' ? 'on' : ''}`} onClick={() => setFileForm(f => ({ ...f, [typeKey]: 'pdf' }))}>PDF 업로드</button>
                        </div>
                        {fileForm[typeKey] === 'link' ? (
                          <input className="form-input" placeholder="https://..." value={fileForm[linkKey]}
                            onChange={e => setFileForm(f => ({ ...f, [linkKey]: e.target.value }))} />
                        ) : (
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 12px', border: '1px solid var(--gray-300)', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: 'var(--gray-400)', background: '#fff' }}>
                            PDF 파일 선택
                            <input type="file" accept=".pdf" style={{ display: 'none' }}
                              onChange={async e => {
                                const file = e.target.files[0]
                                if (!file) return
                                try {
                                  const path = `applicants/${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`
                                  const { error } = await supabase.storage.from('interview').upload(path, file, { cacheControl: '3600', upsert: false })
                                  if (error) throw error
                                  const { data: urlData } = supabase.storage.from('interview').getPublicUrl(path)
                                  setFileForm(f => ({ ...f, [linkKey]: urlData.publicUrl }))
                                } catch (err) { alert('업로드 실패: ' + err.message) }
                              }} />
                          </label>
                        )}
                        {fileForm[linkKey] && (
                          <div style={{ fontSize: 11, color: 'var(--primary)', marginTop: 4 }}>업로드 완료</div>
                        )}
                      </div>
                    ))}
                    <button className="btn btn-primary"
                      onClick={async () => {
                        try {
                          const { data: current, error: fe } = await supabase.from('applications').select('form_data').eq('id', app.id).maybeSingle()
                          if (fe) throw fe
                          const merged = { ...(current?.form_data || {}), portfolio_link: fileForm.portfolioLink, resume_link: fileForm.resumeLink }
                          const { error } = await supabase.from('applications').update({ form_data: merged }).eq('id', app.id)
                          if (error) throw error
                          fd.portfolio_link = merged.portfolio_link
                          fd.resume_link = merged.resume_link
                          setEditingFiles(false)
                          onStageChange(app.id, stage)
                        } catch (err) { alert('저장 실패: ' + err.message) }
                      }}>
                      저장
                    </button>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                  {[['포트폴리오', fd.portfolio_link || fileForm.portfolioLink, 'portfolio.pdf'], ['이력서', fd.resume_link || fileForm.resumeLink, 'resume.pdf']].map(([label, url, fname]) => {
                    const isPdf = url && (url.toLowerCase().includes('.pdf') || fname.endsWith('.pdf'))
                    return (
                      <div key={label} style={{ background: 'var(--gray-50)', borderRadius: 8, padding: 14 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 8 }}>{label}</div>
                        {url ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {isPdf && <iframe src={`${url}#toolbar=1&navpanes=0`} style={{ width: '100%', height: 200, border: '1px solid var(--gray-200)', borderRadius: 6 }} title={label} />}
                            <div style={{ display: 'flex', gap: 6 }}>
                              {isPdf && <button onClick={() => setPreview({ url, name: fname })} className="btn btn-secondary btn-sm" style={{ flex: 1 }}><Icon.Eye /> 전체보기</button>}
                              {!isPdf && <a href={url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ flex: 1, textDecoration: 'none' }}>링크 열기</a>}
                              <button onClick={() => downloadFile(url, fname)} className="btn btn-secondary btn-sm" style={{ flex: 1 }}><Icon.Download /> 다운로드</button>
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
                    {fd.booked_date} {fd.booked_time || ''}
                  </div>
                  : <div style={{ fontSize: 14, color: 'var(--gray-400)' }}>면접 일정 미제출</div>
                }
              </div>

              {/* 다른 기업 지원 현황 */}
              {otherApps.length > 0 && (
                <div>
                  <SectionTitle>다른 기업 지원 현황 ({otherApps.length}개)</SectionTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {otherApps.map(oa => (
                      <div key={oa.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--warning-bg)', borderRadius: 8, fontSize: 13 }}>
                        <span style={{ fontWeight: 700 }}>{oa.form_data?.company_name || '기업명 미상'}</span>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span className={`badge ${STAGE_BADGE[getAdminStage(oa)] || 'b-gray'}`}>{getAdminStage(oa) || '대기'}</span>
                          {oa.form_data?.booked_date && <span style={{ fontSize: 12, color: 'var(--gray-600)' }}>{oa.form_data.booked_date}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI 면접 리포트 탭 */}
          {activeTab === 'ai' && (
            <div style={{ padding: '24px 28px', minHeight: 300 }}>
              {!isInterviewDone ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 240, gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)' }}>
                    <Icon.Sparkle />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-700)' }}>면접 완료 후 리포트가 생성됩니다.</div>
                  <div style={{ fontSize: 13, color: 'var(--gray-400)' }}>
                    면접 일정이 {fd.booked_date ? `${fd.booked_date}` : '아직 미정'}입니다.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 240, gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                    <Icon.Sparkle />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-700)' }}>AI 면접 리포트</div>
                  <div style={{ fontSize: 13, color: 'var(--gray-400)' }}>리포트 내용이 준비 중입니다.</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {preview && <PdfPreviewModal url={preview.url} name={preview.name} onClose={() => setPreview(null)} />}
    </>
  )
}

// ── 면접자 카드 ───────────────────────────────────────────
function ApplicantCard({ app, onClick, onStageChange, stageSaving, hasAiReport = false, onCopyMessage = () => {} }) {
  const fd = app.form_data || {}
  const meetingLink = getMeetingLinkFromSchedule(app._schedule)
  const roomCode = parseMeetingRoomCode(meetingLink)
  const hasMeetingLink = !!meetingLink
  const hasBooked = !!fd.booked_date
  const interviewStatus = app._schedule_status === 'completed' ? '면접 완료' : '면접 예정'
  const stageValue = getAdminStage(app)

  return (
    <div className="card" style={{ cursor: 'pointer', transition: 'all .2s' }}
      onClick={onClick}
      onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
      onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}>

      {/* 카드 상단 */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
              {(app.name || '?')[0]}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--gray-900)' }}>{app.name || '-'}</div>
              <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 1 }}>
                {[fd.birth, fd.ed_level].filter(Boolean).join(' · ') || '-'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <span className={`badge ${interviewStatus === '면접 완료' ? 'b-green' : 'b-blue'}`} style={{ fontSize: 10 }}>
              {interviewStatus}
            </span>
            <div onClick={(e) => e.stopPropagation()}>
              <StatusDropdown
                value={stageValue}
                options={STAGE_DROPDOWN_OPTIONS}
                onChange={(v) => onStageChange?.(app.id, v)}
                disabled={!!stageSaving}
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* 연락처/학과 */}
        <div style={{ background: 'var(--gray-50)', borderRadius: 7, padding: '8px 10px', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            [<Icon.Phone />, fd.phone || app.phone || '-'],
            [<Icon.Mail />, fd.email || app.email || '-'],
            [<Icon.GraduationCap />, [fd.faculty, fd.dept].filter(Boolean).join(' / ') || '-'],
          ].map(([icon, val], i) => (
            <div key={i} style={{ display: 'flex', gap: 7, fontSize: 12, alignItems: 'center', color: 'var(--gray-600)' }}>
              <span style={{ color: 'var(--gray-400)', flexShrink: 0 }}>{icon}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 면접 일정 + 일정 제출 상태 */}
      <div style={{ background: 'var(--gray-50)', borderTop: '1px solid var(--gray-200)', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: hasBooked ? 'var(--primary)' : 'var(--gray-400)' }}>
          <Icon.Calendar />
          {hasBooked ? `${fd.booked_date} ${fd.booked_time || ''}` : '일정 미제출'}
        </div>
        <span className={`badge ${hasBooked ? 'b-green' : 'b-gray'}`} style={{ fontSize: 10 }}>
          {hasBooked ? '제출완료' : '미제출'}
        </span>
      </div>

      {/* 포트폴리오/이력서 + AI 리포트 버튼 */}
      <div style={{ padding: '8px 16px 10px', display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
        <button onClick={() => fd.portfolio_link && downloadFile(fd.portfolio_link, '포트폴리오.pdf')}
          disabled={!fd.portfolio_link}
          style={{ flex: 1, height: 28, fontSize: 11, fontWeight: 600, borderRadius: 6, border: '1px solid var(--gray-200)', background: fd.portfolio_link ? '#fff' : 'var(--gray-50)', color: fd.portfolio_link ? 'var(--gray-700)' : 'var(--gray-300)', cursor: fd.portfolio_link ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <Icon.FileText /> 포트폴리오
        </button>
        <button onClick={() => fd.resume_link && downloadFile(fd.resume_link, '이력서.pdf')}
          disabled={!fd.resume_link}
          style={{ flex: 1, height: 28, fontSize: 11, fontWeight: 600, borderRadius: 6, border: '1px solid var(--gray-200)', background: fd.resume_link ? '#fff' : 'var(--gray-50)', color: fd.resume_link ? 'var(--gray-700)' : 'var(--gray-300)', cursor: fd.resume_link ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <Icon.FileText /> 이력서
        </button>
      </div>

      {/* 화상 면접 링크 */}
      <div style={{ padding: '0 16px 10px' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '8px 10px', border: '1px solid var(--gray-200)', borderRadius: 8, background: 'var(--gray-50)' }}>
          <div style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 700, marginBottom: 6 }}>비대면 화상 면접실</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <button
              type="button"
              disabled={!hasMeetingLink}
              className="btn btn-secondary btn-sm"
              style={{ flex: 1, opacity: hasMeetingLink ? 1 : 0.5, cursor: hasMeetingLink ? 'pointer' : 'not-allowed' }}
              onClick={() => {
                if (!hasMeetingLink) return
                navigator.clipboard.writeText(meetingLink)
                  .then(() => onCopyMessage('면접 링크를 복사했습니다.'))
                  .catch(() => onCopyMessage('면접 링크 복사에 실패했습니다.'))
              }}>
              링크 복사
            </button>
            <button
              type="button"
              disabled={!roomCode}
              className="btn btn-secondary btn-sm"
              style={{ flex: 1, opacity: roomCode ? 1 : 0.5, cursor: roomCode ? 'pointer' : 'not-allowed' }}
              onClick={() => {
                if (!roomCode) return
                navigator.clipboard.writeText(roomCode)
                  .then(() => onCopyMessage('면접 코드(room)를 복사했습니다.'))
                  .catch(() => onCopyMessage('면접 코드 복사에 실패했습니다.'))
              }}>
              코드 복사
            </button>
          </div>
          <div style={{ fontSize: 11, color: hasMeetingLink ? 'var(--gray-700)' : 'var(--gray-400)', wordBreak: 'break-all' }}>
            {hasMeetingLink ? meetingLink : '면접 링크 미등록'}
          </div>
        </div>
      </div>

      {/* AI 면접 리포트 버튼 */}
      <div style={{ padding: '0 16px 12px' }} onClick={e => e.stopPropagation()}>
        <button
          disabled={!hasAiReport}
          onClick={() => { /* 상세 모달의 AI 탭으로 이동 — onClick prop으로 처리 */ }}
          style={{
            width: '100%', height: 28, fontSize: 11, fontWeight: 600, borderRadius: 6,
            border: `1px solid ${hasAiReport ? 'var(--primary-border)' : 'var(--gray-200)'}`,
            background: hasAiReport ? 'var(--primary-light)' : 'var(--gray-50)',
            color: hasAiReport ? 'var(--primary)' : 'var(--gray-300)',
            cursor: hasAiReport ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          }}>
          <Icon.Sparkle />
          {hasAiReport ? 'AI 면접 리포트' : 'AI 리포트 (미생성)'}
        </button>
      </div>
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
          인원 추가
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
                  <button className={`seg-btn ${d.useDriveLink ? '' : 'on'}`} onClick={() => update(idx, 'useDriveLink', false)}>파일 업로드</button>
                  <button className={`seg-btn ${d.useDriveLink ? 'on' : ''}`} onClick={() => update(idx, 'useDriveLink', true)}>링크 입력</button>
                </div>
              </div>
              {d.useDriveLink ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                  {[['포트폴리오 링크', 'portfolioLink', '포트폴리오 URL'], ['이력서 링크', 'resumeLink', '이력서 URL']].map(([l, k, ph]) => (
                    <div key={k}>
                      <label className="form-label" style={{ fontSize: 12 }}>{l}</label>
                      <input className="form-input" placeholder={ph} value={d[k]} onChange={e => update(idx, k, e.target.value)} />
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                  {[['portfolioFile', '포트폴리오 (PDF)', 'portfolioLink'], ['resumeFile', '이력서 (PDF)', 'resumeLink']].map(([k, l, linkKey]) => (
                    <div key={k}>
                      <label className="form-label" style={{ fontSize: 12 }}>{l}</label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 12px', border: '1px solid var(--gray-300)', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: d[k] ? 'var(--gray-900)' : 'var(--gray-400)', background: '#fff' }}>
                        {d[k] ? d[k].name : 'PDF 파일 선택'}
                        <input type="file" accept=".pdf" style={{ display: 'none' }}
                          onChange={async e => {
                            const file = e.target.files[0]
                            if (!file) return
                            update(idx, k, file)
                            try {
                              const path = `applicants/${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`
                              const { error } = await supabase.storage.from('interview').upload(path, file, { cacheControl: '3600', upsert: false })
                              if (error) throw error
                              const { data: urlData } = supabase.storage.from('interview').getPublicUrl(path)
                              update(idx, linkKey, urlData.publicUrl)
                            } catch (err) { console.error('업로드 실패:', err) }
                          }} />
                      </label>
                      {d[linkKey] && <div style={{ fontSize: 11, color: 'var(--primary)', marginTop: 4 }}>업로드 완료</div>}
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
  const [processing, setProcessing] = useState(false)

  async function processFiles(files) {
    if (!files || files.length === 0) return
    setProcessing(true)
    try {
      const XLSX = await loadXLSX()
      const allResults = []
      for (const file of files) {
        const result = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = e => {
            try {
              const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' })
              const ws = wb.Sheets[wb.SheetNames[0]]
              const rows = XLSX.utils.sheet_to_json(ws, { header: 1 })
              const headers = rows[1] || []
              const data = rows.slice(2).filter(r => r.some(c => c !== null && c !== undefined && c !== '')).map(row => {
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
                  motivation: get('지원동기'), vision: get('향후 비전 및 포부(수행계획)'), experience: get('관련 경력(경험)'),
                  portfolioLink: '', resumeLink: '', _sourceFile: file.name,
                }
              })
              resolve(data)
            } catch (err) { reject(err) }
          }
          reader.onerror = () => reject(new Error('파일 읽기 실패: ' + file.name))
          reader.readAsArrayBuffer(file)
        })
        allResults.push(...result)
      }
      setParsed(prev => [...(prev || []), ...allResults])
    } catch (err) { alert('파일 처리 실패: ' + err.message) }
    finally { setProcessing(false) }
  }

  const byCompany = parsed ? parsed.reduce((acc, r) => { const k = r.companyName; if (!acc[k]) acc[k] = []; acc[k].push(r); return acc }, {}) : null

  return (
    <div>
      <div style={{ background: 'var(--primary-light)', border: '1px solid var(--primary-border)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, lineHeight: 1.7 }}>
        1행 메타정보, 2행 컬럼 헤더, 3행~ 데이터 형식. <code>[기업명]</code> 형식으로 자동 분류. 여러 파일 동시 업로드 가능.
      </div>
      <label onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); processFiles(Array.from(e.dataTransfer.files).filter(f => f.name.match(/\.(xlsx|xls|csv)$/i))) }}
        style={{ display: 'block', border: `2px dashed ${dragging ? 'var(--primary)' : 'var(--gray-300)'}`, borderRadius: 10, padding: 32, textAlign: 'center', background: dragging ? 'var(--primary-light)' : '#fff', cursor: 'pointer', transition: 'all .2s', marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{processing ? '처리 중...' : '클릭하거나 파일 드래그'}</div>
        <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>.xlsx / .csv · 여러 파일 동시 업로드 가능</div>
        <input type="file" accept=".xlsx,.xls,.csv" multiple style={{ display: 'none' }} onChange={e => { processFiles(Array.from(e.target.files)); e.target.value = '' }} disabled={processing} />
      </label>
      {parsed && parsed.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '10px 14px', background: 'var(--primary-light)', borderRadius: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>총 {parsed.length}명 파싱 완료</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setParsed(null)}>초기화</button>
        </div>
      )}
      {byCompany && Object.entries(byCompany).map(([company, rows]) => (
        <div key={company} className="card" style={{ marginBottom: 12 }}>
          <div className="card-header"><div className="card-title">{company} ({rows.length}명)</div></div>
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
  const [stageSaving, setStageSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [selectedApp, setSelectedApp] = useState(null)
  const [checkedApps, setCheckedApps] = useState([])
  const [showVideoRoom, setShowVideoRoom] = useState(false)
  const [reportReadyByAppId, setReportReadyByAppId] = useState({})

  // 면접자 리스트 필터 상태
  const [search, setSearch] = useState('')
  const [filterSchedule, setFilterSchedule] = useState('전체')
  const [filterEdLevel, setFilterEdLevel] = useState('전체')
  const [filterInterview, setFilterInterview] = useState('전체')
  const [filterStage, setFilterStage] = useState('전체')

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    let canceled = false
    loadAiReportReadyMap()
    return () => {
      canceled = true
    }

    async function loadAiReportReadyMap() {
      const appIds = (apps || []).map((a) => a.id).filter(Boolean)
      if (!appIds.length) {
        if (!canceled) setReportReadyByAppId({})
        return
      }
      try {
        const { data, error } = await supabase
          .from('interview_ai_reports')
          .select('application_id')
          .in('application_id', appIds)
        if (error) throw error
        const next = {}
        ;(data || []).forEach((row) => {
          if (row?.application_id) next[row.application_id] = true
        })
        if (!canceled) setReportReadyByAppId(next)
      } catch (err) {
        console.error('loadAiReportReadyMap failed:', err)
        if (!canceled) setReportReadyByAppId({})
      }
    }
  }, [apps])

  async function updateApplicantStage(appId, nextStage) {
    if (!appId || !nextStage) return
    setStageSaving(true)
    try {
      const targetApp = applications.find((app) => app.id === appId) || selectedApp
      const companyName = targetApp?.form_data?.company_name || ''
      const settingRow = getCompanySetting(settings, companyName)
      if (!settingRow?.id) {
        throw new Error('면접 설정 정보가 없습니다.')
      }
      const nextBucket = setEvaluationStageInBucket(settingRow.evaluation_admin, appId, nextStage, 'admin')
      const { error } = await supabase
        .from('interview_settings')
        .update({ evaluation_admin: nextBucket })
        .eq('id', settingRow.id)
      if (error) throw error
      setSelectedApp((prev) => prev && prev.id === appId
        ? { ...prev, evaluation_admin_stage: normalizeApplicantStage(nextStage) }
        : prev)
      showToast('면접자 상태가 변경되었습니다.')
      onRefresh()
    } catch (err) {
      showToast(`상태 변경 실패: ${err.message}`)
    } finally {
      setStageSaving(false)
    }
  }

  async function handleDeleteApplicant(appId) {
    try {
      const { error } = await supabase.from('applications').delete().eq('id', appId)
      if (error) throw error
      showToast('면접자가 삭제되었습니다.')
      onRefresh()
    } catch (err) { showToast('삭제 실패: ' + err.message) }
  }

  async function handleAddApplicant() {
    setSaving(true)
    try {
      const valid = drafts.filter(d => d.name.trim())
      if (!valid.length) { showToast('이름을 입력해주세요.'); return }

      const freshExistingApps = await fetchExistingInterviewAppsByProgram(progId)
      const duplicateMsg = findDuplicateApplicantMessage(
        valid.map((r) => ({
          companyName: company,
          name: r.name,
          birth: r.birth,
        })),
        freshExistingApps
      )
      if (duplicateMsg) {
        showToast(duplicateMsg)
        return
      }

      const payload = valid.map(r => ({
        program_id: progId, brand: selectedProgram?.brand || null,
        application_type: 'interview', stage: '평가 전',
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

      // ── program_teams 자동 upsert ──────────────────────────
      const { data: existing, error: existingError } = await supabase
        .from('program_teams')
        .select('id')
        .eq('program_id', progId)
        .eq('name', company)
        .maybeSingle()
      if (existingError) throw existingError

      if (!existing) {
        const { error: insertTeamError } = await supabase.from('program_teams').insert({
          program_id: progId,
          name: company,
          brand: selectedProgram?.brand || null,
          sort_order: 0,
        })
        if (insertTeamError) throw insertTeamError
      }
      // ── 여기까지 ───────────────────────────────────────────

      showToast(`${payload.length}명 등록 완료`)
      setShowAddModal(false)
      setDrafts([{ ...createEmptyDraft(), companyName: company }])
      onRefresh()
    } catch (err) { showToast('실패: ' + err.message) }
    finally { setSaving(false) }
  }

  // 학력 고유값 추출 (실제 데이터 기반)
  const edLevels = ['전체', ...Array.from(new Set(apps.map(a => a.form_data?.ed_level).filter(Boolean)))]

  // 면접자 필터 적용
  const filteredApps = apps.filter(app => {
    const fd = app.form_data || {}

    // 검색
    if (search && !app.name?.includes(search) && !fd.phone?.includes(search) && !fd.email?.includes(search)) return false

    // 일정 제출
    if (filterSchedule === '제출완료' && !fd.booked_date) return false
    if (filterSchedule === '미제출' && fd.booked_date) return false

    // 학력
    if (filterEdLevel !== '전체' && fd.ed_level !== filterEdLevel) return false

    // 면접 상태
    const interviewStatus = app._schedule_status === 'completed' ? '면접 완료' : '면접 예정'
    if (filterInterview !== '전체' && interviewStatus !== filterInterview) return false

    // 평가 상태
    const adminStage = getAdminStage(app)
    if (filterStage === '평가 전' && ['불합격', '예비합격', '최종합격', '중도포기'].includes(adminStage)) return false
    if (filterStage === '불합격' && adminStage !== '불합격') return false
    if (filterStage === '예비합격' && adminStage !== '예비합격') return false
    if (filterStage === '최종합격' && adminStage !== '최종합격') return false
    if (filterStage === '중도포기' && adminStage !== '중도포기') return false

    return true
  })

  const isSubmitted = setting?.status === 'submitted'
  const fd = setting || {}
  const evaluationStatus = normalizeEvaluationStatus(fd.evaluation_status)

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Icon.ChevronLeft /> 목록으로
          </button>
          <div>
            <div className="page-title">{company}</div>
            <div className="page-subtitle">기업 대시보드 — 면접 설정 및 면접자 관리</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {fd?.interview_mode === 'online' && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowVideoRoom(true)}
            >
              화상 면접실 입장
            </button>
          )}
          <span className={`badge ${isSubmitted ? 'b-green' : 'b-gray'}`} style={{ fontSize: 13, padding: '6px 14px' }}>
            {isSubmitted ? '일정 선택 완료' : '일정 미선택'}
          </span>
          <span className={`badge ${evaluationStatus === '평가완료' ? 'b-green' : 'b-gray'}`} style={{ fontSize: 13, padding: '6px 14px' }}>
            평가 상태: {evaluationStatus}
          </span>
        </div>
      </div>

      <div className="seg" style={{ marginBottom: 24 }}>
        <button className={`seg-btn ${tab === 'settings' ? 'on' : ''}`} onClick={() => setTab('settings')}>면접 설정</button>
        <button className={`seg-btn ${tab === 'applicants' ? 'on' : ''}`} onClick={() => setTab('applicants')}>
          면접자 리스트 ({apps.length}명)
        </button>
      </div>

      {/* 면접 설정 탭 */}
      {tab === 'settings' && (
        <div style={{ maxWidth: 720 }}>
          {!isSubmitted ? (
            <div className="card">
              <div className="empty" style={{ padding: '60px 24px' }}>
                <div className="empty-title">아직 일정을 선택하지 않았습니다.</div>
                <div style={{ fontSize: 14, color: 'var(--gray-400)', marginTop: 6 }}>기업 담당자가 면접 설정을 제출하면 여기에 표시됩니다.</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card">
                <div className="card-header"><div className="card-title">담당자 정보</div></div>
                <div className="card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
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
                <div className="card-header"><div className="card-title">면접 방식 및 형태</div></div>
                <div className="card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', marginBottom: 4 }}>면접 방식</div>
                      <span className={`badge ${fd.interview_mode === 'online' ? 'b-blue' : 'b-green'}`} style={{ fontSize: 13, padding: '4px 12px' }}>
                        {fd.interview_mode === 'online' ? '비대면(화상)' : '대면'}
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
                      <span className="badge b-gray" style={{ fontSize: 13, padding: '4px 12px' }}>{fd.slot_minutes || '-'}분</span>
                    </div>
                  </div>
                  {fd.interview_mode === 'face' && fd.face_address && (
                    <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 8, padding: '12px 16px', fontSize: 13 }}>
                      대면 면접 주소: {fd.face_address}
                    </div>
                  )}
                </div>
              </div>
              <div className="card">
                <div className="card-header"><div className="card-title">제출된 면접 가능 일정</div></div>
                <div className="card-body">
                  {(!fd.available_slots || fd.available_slots.length === 0) ? (
                    <div style={{ color: 'var(--gray-400)', fontSize: 14 }}>제출된 일정이 없습니다.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {fd.available_slots.map((slot, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--gray-50)', borderRadius: 8, border: '1px solid var(--gray-200)' }}>
                          <div style={{ fontSize: 14, fontWeight: 700, width: 100 }}>{slot.date}</div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {(slot.timeSlots || slot.time_slots || []).map((ts, j) => (
                              <span key={j} className="badge b-blue" style={{ fontSize: 12 }}>{ts.start} ~ {ts.end}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {fd.interview_mode === 'online' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={() => setShowVideoRoom(true)}>
                    화상 면접실 입장하기
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 면접자 리스트 탭 */}
      {tab === 'applicants' && (
        <div>
          {/* 필터 카드 */}
          <div className="card" style={{ marginBottom: 20, overflow: 'hidden' }}>
            {/* 검색 */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--gray-200)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 12px', border: '1px solid var(--gray-200)', borderRadius: 8, background: 'var(--gray-50)' }}>
                <Icon.Search />
                <input style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 14, color: 'var(--gray-700)' }}
                  placeholder="이름, 전화번호, 이메일 검색" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <ChipFilter label="일정 제출" options={['전체', '제출완료', '미제출']} value={filterSchedule} onChange={setFilterSchedule} />
            <ChipFilter label="학력" options={edLevels} value={filterEdLevel} onChange={setFilterEdLevel} />
            <ChipFilter label="면접 상태" options={['전체', '면접 예정', '면접 완료']} value={filterInterview} onChange={setFilterInterview} />
            <ChipFilter label="평가 상태" options={['전체', '평가 전', '불합격', '예비합격', '최종합격', '중도포기']} value={filterStage} onChange={setFilterStage} />
          </div>

          {/* 액션 바 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {checkedApps.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--danger-bg)', borderRadius: 8, border: '1px solid #FCA5A5' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger-text)' }}>{checkedApps.length}명 선택됨</span>
                  <button className="btn btn-danger btn-sm"
                    onClick={async () => {
                      if (!window.confirm(`선택한 ${checkedApps.length}명을 삭제하시겠습니까?`)) return
                      for (const id of checkedApps) await handleDeleteApplicant(id)
                      setCheckedApps([])
                    }}>
                    <Icon.Trash /> 선택 삭제
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setCheckedApps([])}>선택 해제</button>
                </div>
              )}
              {filteredApps.length > 0 && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--gray-600)', cursor: 'pointer' }}>
                  <input type="checkbox"
                    checked={filteredApps.every(a => checkedApps.includes(a.id))}
                    onChange={e => setCheckedApps(e.target.checked ? filteredApps.map(a => a.id) : [])}
                    style={{ width: 15, height: 15, accentColor: 'var(--primary)', cursor: 'pointer' }} />
                  전체 선택
                </label>
              )}
              <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                {filteredApps.length}/{apps.length}명
              </span>
            </div>
            <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => { setDrafts([{ ...createEmptyDraft(), companyName: company }]); setShowAddModal(true) }}>
              <Icon.Plus /> 면접자 추가
            </button>
          </div>

          {filteredApps.length === 0 ? (
            <div className="card"><div className="empty">
              <div style={{ color: 'var(--gray-300)', marginBottom: 12 }}><Icon.User /></div>
              <div className="empty-title">해당하는 면접자가 없습니다.</div>
            </div></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {filteredApps.map(app => {
                const isChecked = checkedApps.includes(app.id)
                return (
                  <div key={app.id} style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10 }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isChecked}
                        onChange={e => setCheckedApps(prev => e.target.checked ? [...prev, app.id] : prev.filter(id => id !== app.id))}
                        style={{ width: 15, height: 15, accentColor: 'var(--primary)', cursor: 'pointer' }} />
                    </div>
                    <ApplicantCard
                      app={app}
                      onClick={() => setSelectedApp(app)}
                      onStageChange={updateApplicantStage}
                      stageSaving={stageSaving}
                      hasAiReport={!!reportReadyByAppId[app.id]}
                      onCopyMessage={showToast}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 면접자 상세 모달 */}
      {selectedApp && (
        <ApplicantDetailModal
          app={selectedApp} allApps={allApps}
          onClose={() => setSelectedApp(null)}
          onStageChange={(id, stage) => {
            setSelectedApp((prev) => prev && prev.id === id
              ? { ...prev, evaluation_admin_stage: stage }
              : prev)
            onRefresh()
          }}
        />
      )}

      {/* 면접자 추가 모달 */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.45)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 24, overflowY: 'auto' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false) }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 860, boxShadow: '0 20px 40px rgba(0,0,0,.15)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{company} — 면접자 추가</div>
              <button onClick={() => setShowAddModal(false)} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gray-100)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon.Close />
              </button>
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
          {toast}
        </div>
      )}

      {showVideoRoom && (
        <VideoInterviewRoom
          companyInfo={{
            programId: progId,
            companyName: company,
            program: selectedProgram || null,
          }}
          onClose={() => setShowVideoRoom(false)}
        />
      )}
    </div>
  )
}

function InterviewTimetableModal({ schedules, applications, programId, onSaved, onClose }) {
  const [tab, setTab] = useState('online')
  const [period, setPeriod] = useState({ start: '', end: '' })
  const [savingPeriod, setSavingPeriod] = useState(false)

  useEffect(() => {
    if (!programId) return
    loadInterviewPeriod()
  }, [programId])

  async function loadInterviewPeriod() {
    try {
      const { data } = await supabase
        .from('interview_date')
        .select('start_date, end_date')
        .eq('program_id', programId)
        .maybeSingle()
      setPeriod({
        start: data?.start_date || '',
        end: data?.end_date || '',
      })
    } catch (e) {
      console.warn('loadInterviewPeriod failed:', e)
    }
  }

  async function saveInterviewPeriod() {
    if (!programId) return
    if (!period.start || !period.end) {
      alert('면접 시작일/종료일을 모두 입력해주세요.')
      return
    }
    setSavingPeriod(true)
    try {
      const { data: existing } = await supabase
        .from('interview_date')
        .select('id')
        .eq('program_id', programId)
        .maybeSingle()
      if (existing?.id) {
        const { error } = await supabase
          .from('interview_date')
          .update({ start_date: period.start, end_date: period.end })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('interview_date')
          .insert({ program_id: programId, start_date: period.start, end_date: period.end })
        if (error) throw error
      }
      if (onSaved) onSaved()
      alert('면접 기간이 저장되었습니다.')
    } catch (e) {
      alert(`면접 기간 저장 실패: ${e.message}`)
    } finally {
      setSavingPeriod(false)
    }
  }

  const appMap = applications.reduce((acc, app) => {
    acc[app.id] = app
    return acc
  }, {})

  const filtered = schedules
    .filter(s => s.status !== 'cancelled')
    .filter(s => s.interview_mode === tab)
    .sort((a, b) => {
      if (a.scheduled_date !== b.scheduled_date) return a.scheduled_date.localeCompare(b.scheduled_date)
      if (a.scheduled_start_time !== b.scheduled_start_time) return a.scheduled_start_time.localeCompare(b.scheduled_start_time)
      return a.company_name.localeCompare(b.company_name)
    })

  const groupedByDate = filtered.reduce((acc, s) => {
    if (!acc[s.scheduled_date]) acc[s.scheduled_date] = []
    acc[s.scheduled_date].push(s)
    return acc
  }, {})

  const dates = Object.keys(groupedByDate).sort((a, b) => a.localeCompare(b))

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.45)', backdropFilter: 'blur(4px)', zIndex: 1100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 24, overflowY: 'auto' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 960, boxShadow: '0 20px 40px rgba(0,0,0,.15)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--gray-900)' }}>면접 타임테이블</div>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>일자별 면접 진행 타임라인</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gray-100)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon.Close />
          </button>
        </div>

        <div style={{ padding: '16px 28px 0', flexShrink: 0 }}>
          <div className="seg">
            <button className={`seg-btn ${tab === 'online' ? 'on' : ''}`} onClick={() => setTab('online')}>비대면</button>
            <button className={`seg-btn ${tab === 'face' ? 'on' : ''}`} onClick={() => setTab('face')}>대면</button>
          </div>
          <div style={{ marginTop: 12, padding: '10px 12px', border: '1px solid var(--gray-200)', borderRadius: 10, background: '#fff', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-700)' }}>면접 기간 설정</span>
            <input type="date" className="form-input" style={{ width: 150, height: 34, fontSize: 12 }} value={period.start} onChange={(e) => setPeriod((p) => ({ ...p, start: e.target.value }))} />
            <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>~</span>
            <input type="date" className="form-input" style={{ width: 150, height: 34, fontSize: 12 }} value={period.end} onChange={(e) => setPeriod((p) => ({ ...p, end: e.target.value }))} />
            <button className="btn btn-secondary btn-sm" onClick={saveInterviewPeriod} disabled={savingPeriod}>
              {savingPeriod ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 28px', background: 'var(--gray-50)' }}>
          {dates.length === 0 ? (
            <div className="card">
              <div className="empty">
                <div className="empty-title">{tab === 'online' ? '비대면' : '대면'} 일정이 없습니다.</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {dates.map((date) => (
                <div key={date} className="card">
                  <div className="card-header">
                    <div className="card-title">{date}</div>
                    <span className={`badge ${tab === 'online' ? 'b-blue' : 'b-green'}`}>{tab === 'online' ? '비대면' : '대면'}</span>
                  </div>
                  <div className="card-body" style={{ paddingTop: 14, paddingBottom: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {groupedByDate[date].map((s) => {
                        const app = appMap[s.application_id]
                        const applicantName = app?.name || app?.form_data?.name || '미확인 면접자'
                        return (
                          <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 180px', gap: 10, alignItems: 'center', padding: '10px 12px', border: '1px solid var(--gray-200)', borderRadius: 8, background: '#fff' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-800)' }}>
                              {s.scheduled_start_time} ~ {s.scheduled_end_time}
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--gray-700)' }}>
                              <span style={{ fontWeight: 700 }}>{s.company_name}</span>
                              <span style={{ margin: '0 8px', color: 'var(--gray-300)' }}>|</span>
                              <span>{applicantName}</span>
                            </div>
                            <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--gray-500)' }}>
                              {tab === 'face' ? (s.face_address || '-') : (s.meeting_link ? '링크 등록' : '링크 미등록')}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 메인 ManagementPage ────────────────────────────────────
export default function ManagementPage() {
  const { progId } = useParams()
  const { selectedProgram } = useProgram()
  const [applications, setApplications] = useState([])
  const [settings, setSettings] = useState([])
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterMode, setFilterMode] = useState('전체')
  const [filterType, setFilterType] = useState('전체')
  const [filterSchedule, setFilterSchedule] = useState('전체')
  const [activeCompany, setActiveCompany] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState('excel')
  const [manualDrafts, setManualDrafts] = useState([createEmptyDraft()])
  const [excelParsed, setExcelParsed] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [publishingEval, setPublishingEval] = useState(false)
  const [checkedCompanies, setCheckedCompanies] = useState([])
  const [showTimetable, setShowTimetable] = useState(false)
  const [quickVideoCompany, setQuickVideoCompany] = useState('')

  useEffect(() => { loadData() }, [progId])
  useEffect(() => {
    if (!progId) return
    const channel = supabase
      .channel(`admin-management-${progId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interview_schedules' }, (payload) => {
        const p = payload.new || payload.old
        if (p?.program_id === progId) loadData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, (payload) => {
        const p = payload.new || payload.old
        if (p?.program_id === progId && p?.application_type === 'interview') loadData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interview_settings' }, (payload) => {
        const p = payload.new || payload.old
        if (p?.program_id === progId) loadData()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [progId])

  async function loadData() {
    setLoading(true)
    try {
      const [{ data: apps, error: appsError }, { data: teams }, { data: rawSettings, error: settingsError }, { data: schedulesData, error: schedulesError }] = await Promise.all([
        supabase
          .from('applications').select('*')
          .eq('program_id', progId).eq('application_type', 'interview')
          .order('created_at', { ascending: false }),
        supabase
          .from('program_teams').select('id,name')
          .eq('program_id', progId),
        supabase
          .from('interview_settings').select('*').eq('program_id', progId),
        supabase
          .from('interview_schedules').select('*').eq('program_id', progId),
      ])
      if (appsError) throw appsError
      if (settingsError) console.warn('interview_settings 조회 실패:', settingsError)
      if (schedulesError) console.warn('interview_schedules 조회 실패:', schedulesError)

      const teamNameById = new Map((teams || []).map(t => [String(t.id), t.name]))
      const stgs = (rawSettings || []).map((s) => ({
        ...s,
        company_name: s.company_name || teamNameById.get(String(s.program_teams_id)) || '',
      }))

      const scheduleByApp = new Map()
      ;(schedulesData || [])
        .filter((s) => s.status !== 'cancelled')
        .forEach((s) => {
          if (s.application_id) scheduleByApp.set(s.application_id, s)
        })
      const settingByCompany = new Map((stgs || []).map((s) => [normalizeCompanyName(s.company_name), s]))
      const mergedApps = (apps || []).map((app) => {
        const sc = scheduleByApp.get(app.id)
        const fd = app.form_data || {}
        const setting = settingByCompany.get(normalizeCompanyName(fd.company_name || '')) || null
        const companyStage = getEvaluationStageFromBucket(setting?.evaluation_company, app.id) || '평가 전'
        const adminStage = getEvaluationStageFromBucket(setting?.evaluation_admin, app.id) || '평가 전'
        return {
          ...app,
          _schedule_status: sc?.status || null,
          _schedule: sc,
          evaluation_company_stage: companyStage,
          evaluation_admin_stage: adminStage,
          form_data: {
            ...fd,
            booked_date: sc?.scheduled_date || fd.booked_date || '',
            booked_time: sc?.scheduled_start_time || fd.booked_time || '',
          },
        }
      })

      setApplications(mergedApps)
      setSettings(stgs)
      setSchedules(schedulesData || [])
    } catch (err) { console.error('loadData 실패:', err) }
    finally { setLoading(false) }
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function handleDeleteCompany(company) {
    try {
      const { data: teams, error: teamsError } = await supabase
        .from('program_teams')
        .select('id,name')
        .eq('program_id', progId)
      if (teamsError) throw teamsError

      const matchedTeamIds = (teams || [])
        .filter((team) => normalizeCompanyName(team.name) === normalizeCompanyName(company))
        .map((team) => team.id)

      if (matchedTeamIds.length) {
        const { error: teamsDeleteError } = await supabase
          .from('program_teams')
          .delete()
          .in('id', matchedTeamIds)
        if (teamsDeleteError) throw teamsDeleteError
      }

      const { error } = await supabase.from('applications').delete()
        .eq('program_id', progId).eq('application_type', 'interview')
        .filter('form_data->>company_name', 'eq', company)
      if (error) throw error
    } catch (err) { showToast('삭제 실패: ' + err.message); throw err }
  }

  async function handleBulkDeleteCompanies() {
    if (!checkedCompanies.length) return
    if (!window.confirm(`선택한 ${checkedCompanies.length}개 기업과 소속 면접자 전체를 삭제하시겠습니까?`)) return
    try {
      for (const company of checkedCompanies) await handleDeleteCompany(company)
      showToast(`${checkedCompanies.length}개 기업이 삭제되었습니다.`)
      setCheckedCompanies([])
      await loadData()
    } catch (err) { showToast('일부 삭제 실패: ' + err.message); await loadData() }
  }

  const grouped = applications.reduce((acc, app) => {
    const k = app.form_data?.company_name || '미분류'
    if (!acc[k]) acc[k] = []
    acc[k].push(app)
    return acc
  }, {})

  const companyCards = Object.entries(grouped).map(([company, apps]) => {
    const setting = settings.find(s => normalizeCompanyName(s.company_name) === normalizeCompanyName(company))
    return {
      company, apps, setting,
      mode: setting?.interview_mode || null,
      type: setting?.interview_type || null,
      evaluationStatus: normalizeEvaluationStatus(setting?.evaluation_status),
      isSubmitted: setting?.status === 'submitted',
      totalCount: apps.length,
      submittedCount: apps.filter(a => a.form_data?.booked_date).length,
    }
  })

  const submittedCompanyCount = companyCards.filter((c) => c.evaluationStatus === '평가완료').length
  const notSubmittedCompanyCount = Math.max(0, companyCards.length - submittedCompanyCount)
  const submittedCompanyNames = useMemo(() => (
    new Set(companyCards.filter((c) => c.evaluationStatus === '평가완료').map((c) => c.company))
  ), [companyCards])
  const eligibleApps = useMemo(() => (
    applications.filter((app) => {
      const companyName = app.form_data?.company_name || ''
      return submittedCompanyNames.has(companyName) && ['예비합격', '최종합격', '불합격', '중도포기'].includes(getAdminStage(app))
    })
  ), [applications, submittedCompanyNames])
  const sharedEligibleCount = useMemo(() => (
    eligibleApps.filter((app) => !!app.form_data?.evaluation_shared).length
  ), [eligibleApps])
  const evalAllShared = eligibleApps.length > 0 && sharedEligibleCount === eligibleApps.length

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

  async function publishEvaluationToStudents() {
    if (!applications?.length) return
    if (!window.confirm(
      `평가 정보를 면접자 대시보드에 반영하시겠습니까?\n\n평가 제출 완료한 기업 수: ${submittedCompanyCount}개\n평가 미제출 기업 수: ${notSubmittedCompanyCount}개\n\n(반영 후 면접자는 기업별 합격 현황을 확인할 수 있습니다.)`
    )) return
    setPublishingEval(true)
    try {
      let updated = 0
      for (const app of applications) {
        const companyName = app.form_data?.company_name || ''
        if (!submittedCompanyNames.has(companyName)) continue
        const setting = getCompanySetting(settings, companyName)
        const normalizedStage = getEvaluationStageFromBucket(setting?.evaluation_admin, app.id) || getAdminStage(app)
        const next = {
          ...(app.form_data || {}),
          evaluation_shared: true,
          evaluation_shared_at: new Date().toISOString(),
          evaluation_shared_stage: normalizedStage,
        }
        const { error: uErr } = await supabase
          .from('applications')
          .update({ form_data: next, stage: normalizedStage })
          .eq('id', app.id)
        if (uErr) throw uErr
        updated += 1
      }

      showToast(`${updated}명 평가 정보 반영 완료`)
      await loadData()
    } catch (err) {
      showToast(`반영 실패: ${err.message}`)
    } finally {
      setPublishingEval(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const toSave = activeTab === 'manual'
        ? manualDrafts.filter(d => d.name.trim())
        : (excelParsed || []).filter(r => r.name?.trim())
      if (!toSave.length) { showToast('등록할 데이터가 없습니다.'); return }

      const freshExistingApps = await fetchExistingInterviewAppsByProgram(progId)
      const duplicateMsg = findDuplicateApplicantMessage(toSave, freshExistingApps)
      if (duplicateMsg) {
        showToast(duplicateMsg)
        return
      }

      const payload = toSave.map(r => ({
        program_id: progId, brand: selectedProgram?.brand || null,
        application_type: 'interview', stage: '평가 전',
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

      // ── program_teams 자동 upsert ──────────────────────────
      // 등록된 기업명 고유값 추출
      const uniqueCompanies = [...new Set(toSave.map(r => r.companyName).filter(Boolean))]
      for (const name of uniqueCompanies) {
        // 이미 있는지 확인 후 없으면 insert
        const { data: existing, error: existingError } = await supabase
          .from('program_teams')
          .select('id')
          .eq('program_id', progId)
          .eq('name', name)
          .maybeSingle()
        if (existingError) throw existingError

        if (!existing) {
          const { error: insertTeamError } = await supabase.from('program_teams').insert({
            program_id: progId,
            name,
            brand: selectedProgram?.brand || null,
            sort_order: 0,
          })
          if (insertTeamError) throw insertTeamError
        }
      }
      // ── 여기까지 ───────────────────────────────────────────

      showToast(`${payload.length}명 등록 완료`)
      setShowModal(false); setManualDrafts([createEmptyDraft()]); setExcelParsed(null)
      await loadData()
    } catch (err) { showToast('저장 실패: ' + err.message) }
    finally { setSaving(false) }
  }

  const allChecked = filtered.length > 0 && filtered.every(c => checkedCompanies.includes(c.company))

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">면접 관리</div>
          <div className="page-subtitle">기업별 면접 현황 및 면접자를 관리합니다.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => setShowTimetable(true)}>
            <Icon.Calendar /> 면접 타임테이블
          </button>
          <button
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            disabled={publishingEval || !applications.length || evalAllShared}
            onClick={publishEvaluationToStudents}
          >
            {evalAllShared ? '평가 반영 완료' : (publishingEval ? '평가 반영 중...' : '평가 정보 면접자에게 반영')}
          </button>
          <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => { setManualDrafts([createEmptyDraft()]); setExcelParsed(null); setActiveTab('excel'); setShowModal(true) }}>
            <Icon.Plus /> 면접자 등록
          </button>
        </div>
      </div>

      {/* 필터 */}
      <div className="card" style={{ marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--gray-200)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 12px', border: '1px solid var(--gray-200)', borderRadius: 8, background: 'var(--gray-50)', color: 'var(--gray-400)' }}>
            <Icon.Search />
            <input style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 14, color: 'var(--gray-700)' }}
              placeholder="기업명으로 검색" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <ChipFilter label="면접 방식" options={MODE_OPTIONS} value={filterMode} onChange={setFilterMode} />
        <ChipFilter label="면접 형태" options={TYPE_OPTIONS} value={filterType} onChange={setFilterType} />
        <ChipFilter label="일정 제출" options={SCHEDULE_OPTIONS} value={filterSchedule} onChange={setFilterSchedule} />
      </div>

      {/* 선택 삭제 액션바 */}
      {checkedCompanies.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '10px 16px', background: 'var(--danger-bg)', borderRadius: 8, border: '1px solid #FCA5A5' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger-text)' }}>{checkedCompanies.length}개 기업 선택됨</span>
          <button className="btn btn-danger btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={handleBulkDeleteCompanies}>
            <Icon.Trash /> 선택 기업 삭제
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setCheckedCompanies([])}>선택 해제</button>
        </div>
      )}

      {/* 기업 카드 */}
      {loading ? (
        <div className="card"><div className="empty"><div className="empty-title">불러오는 중...</div></div></div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div style={{ color: 'var(--gray-300)', marginBottom: 12 }}><Icon.Building /></div>
            <div className="empty-title">등록된 기업이 없습니다.</div>
            <div style={{ fontSize: 14, color: 'var(--gray-400)', marginTop: 4 }}>면접자를 등록하면 기업별로 자동 분류됩니다.</div>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--gray-600)', cursor: 'pointer' }}>
              <input type="checkbox" checked={allChecked}
                onChange={e => setCheckedCompanies(e.target.checked ? filtered.map(c => c.company) : [])}
                style={{ width: 15, height: 15, accentColor: 'var(--primary)', cursor: 'pointer' }} />
              전체 선택
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {filtered.map(({ company, mode, type, isSubmitted, totalCount, submittedCount, evaluationStatus }) => {
              const isChecked = checkedCompanies.includes(company)
              return (
                <div key={company} style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 14, left: 14, zIndex: 10 }} onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={isChecked}
                      onChange={e => setCheckedCompanies(prev => e.target.checked ? [...prev, company] : prev.filter(c => c !== company))}
                      style={{ width: 15, height: 15, accentColor: 'var(--primary)', cursor: 'pointer' }} />
                  </div>
                  <div className="card" style={{ cursor: 'pointer', transition: 'all .2s', outline: isChecked ? '2px solid var(--primary)' : 'none' }}
                    onClick={() => setActiveCompany(company)}
                    onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
                    onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}>
                    <div style={{ padding: '20px 20px 0 40px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div>
                          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 2 }}>{company}</div>
                          <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>기업 면접 운영 현황</div>
                        </div>
                        <span style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: isSubmitted ? 'var(--success-text)' : 'var(--gray-600)',
                          background: isSubmitted ? 'var(--success-bg)' : 'var(--gray-100)',
                          border: `1px solid ${isSubmitted ? 'rgba(16,185,129,.25)' : 'var(--gray-200)'}`,
                          borderRadius: 999,
                          padding: '4px 10px',
                          whiteSpace: 'nowrap',
                        }}>
                          {isSubmitted ? '일정 제출 완료' : '일정 미제출'}
                        </span>
                      </div>
                      <div style={{ marginBottom: 14, borderTop: '1px solid var(--gray-100)', borderBottom: '1px solid var(--gray-100)', padding: '10px 0', display: 'grid', gap: 7 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 12, color: 'var(--gray-500)', fontWeight: 700 }}>면접 방식</span>
                          <span style={{ fontSize: 13, color: 'var(--gray-800)', fontWeight: 700 }}>
                            {mode ? (mode === 'online' ? '비대면(화상)' : '대면') : '미설정'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 12, color: 'var(--gray-500)', fontWeight: 700 }}>면접 형태</span>
                          <span style={{ fontSize: 13, color: 'var(--gray-800)', fontWeight: 700 }}>
                            {type ? (type === '1on1' ? '1:1 면접' : '그룹 면접') : '미설정'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 12, color: 'var(--gray-500)', fontWeight: 700 }}>평가 상태</span>
                          <span style={{ fontSize: 13, color: evaluationStatus === '평가완료' ? 'var(--success)' : 'var(--gray-600)', fontWeight: 800 }}>
                            {evaluationStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ background: 'var(--gray-50)', borderTop: '1px solid var(--gray-200)', padding: '14px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', marginBottom: 4 }}>면접자 수</div>
                        <div style={{ fontSize: 20, fontWeight: 800 }}>{totalCount}<span style={{ fontSize: 13, color: 'var(--gray-500)', marginLeft: 2 }}>명</span></div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', marginBottom: 4 }}>일정 제출</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: submittedCount === totalCount && totalCount > 0 ? 'var(--success)' : 'var(--warning)' }}>
                          {submittedCount}<span style={{ fontSize: 13, color: 'var(--gray-500)', marginLeft: 2 }}>/ {totalCount}명</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ padding: '10px 20px 14px', borderTop: '1px solid var(--gray-100)' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setActiveCompany(company)}>
                          기업 관리 보기
                        </button>
                        {mode === 'online' && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => setQuickVideoCompany(company)}
                          >
                            화상 면접실 입장
                          </button>
                        )}
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
              <button onClick={() => setShowModal(false)} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gray-100)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon.Close />
              </button>
            </div>
            <div style={{ padding: '16px 28px 0', flexShrink: 0 }}>
              <div className="seg">
                <button className={`seg-btn ${activeTab === 'manual' ? 'on' : ''}`} onClick={() => setActiveTab('manual')}>직접 입력</button>
                <button className={`seg-btn ${activeTab === 'excel' ? 'on' : ''}`} onClick={() => setActiveTab('excel')}>엑셀 일괄 등록</button>
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

      {showTimetable && (
        <InterviewTimetableModal
          schedules={schedules}
          applications={applications}
          programId={progId}
          onSaved={loadData}
          onClose={() => setShowTimetable(false)}
        />
      )}

      {quickVideoCompany && (
        <VideoInterviewRoom
          companyInfo={{
            programId: progId,
            companyName: quickVideoCompany,
            program: selectedProgram || null,
          }}
          onClose={() => setQuickVideoCompany('')}
        />
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--gray-900)', color: '#fff', padding: '10px 20px', borderRadius: 999, fontSize: 14, zIndex: 9999 }}>
          {toast}
        </div>
      )}
    </div>
  )
}
