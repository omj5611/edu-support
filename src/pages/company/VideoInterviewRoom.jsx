import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import MeetRecord from './MeetRecord'
import { useAuth } from '../../contexts/AuthContext'

const MEET_SERVER_URL = 'https://meet-server-diix.onrender.com'

// ─────────────────────────────────────────────────────────────
const STAGE_COLOR = {
    '평가 전':  '#64748B',
    '면접 예정': '#3B82F6',
    '최종합격':  '#10B981',
    '예비합격':  '#F59E0B',
    '불합격':    '#EF4444',
    '대기':      '#64748B',
}

const FIELD_LABELS = {
    birth:         '생년월일',
    phone:         '연락처',
    email:         '이메일',
    company_name:  '지원 기업',
    booked_date:   '면접 날짜',
    booked_time:   '면접 시간',
    introduce:     '자기소개',
    motivation:    '지원 동기',
    experience:    '경력사항',
    education:     '학력',
    address:       '주소',
}

// 포트폴리오/이력서로 판단하는 키 목록
const PORTFOLIO_KEYS = ['portfolio', 'portfolio_url', 'portfolio_link', '포트폴리오']
const RESUME_KEYS    = ['resume', 'resume_url', 'resume_link', '이력서', 'cv', 'cv_url']

function normalizeCompanyName(value) {
    return String(value || '').trim().toLowerCase()
}

function findDocField(fd, keys) {
    for (const k of keys) {
        const v = fd?.[k]
        if (v && typeof v === 'string' && v.trim()) return v.trim()
        if (v && typeof v === 'object') {
            const url = v.url || v.publicUrl || v.link || v.href
            if (url && typeof url === 'string' && url.trim()) return url.trim()
        }
    }
    return null
}

function formatTsNoSeconds(ts) {
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

function downloadTextFile(text, filename, mime = 'text/plain;charset=utf-8') {
    try {
        const blob = new Blob([text], { type: mime })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    } catch (_) {
        // noop
    }
}

// ─────────────────────────────────────────────────────────────
// PDF / 링크 뷰어
function DocViewer({ url, label }) {
    const [error, setError] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        setError(false)
        setLoading(!!url)
    }, [url])

    if (!url) {
        return (
            <div style={{
                height: '100%', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 12,
                color: '#334155',
            }}>
                <span style={{ fontSize: 32 }}>📄</span>
                <span style={{ fontSize: 13 }}>{label} 파일이 없습니다</span>
            </div>
        )
    }

    const isPdf = /\.pdf(\?|$)/i.test(url)
    const isHttpLink = /^https?:\/\//i.test(url)
    // Google Docs 임베드 우회 (X-Frame-Options 대응)
    const embedUrl = isPdf
        ? `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`
        : url

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* 툴바 */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 14px', flexShrink: 0,
                background: 'rgba(255,255,255,0.03)',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
                <span style={{ fontSize: 11, color: '#64748B', flex: 1,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {url}
                </span>
                {isPdf ? (
                    <>
                        <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                                fontSize: 10, fontWeight: 700, color: '#818CF8',
                                background: 'rgba(99,102,241,0.12)', padding: '3px 10px',
                                borderRadius: 6, border: '1px solid rgba(99,102,241,0.25)',
                                textDecoration: 'none', flexShrink: 0,
                            }}
                        >
                            전체보기 ↗
                        </a>
                        <a
                            href={url}
                            download
                            style={{
                                fontSize: 10, fontWeight: 700, color: '#22C55E',
                                background: 'rgba(34,197,94,0.12)', padding: '3px 10px',
                                borderRadius: 6, border: '1px solid rgba(34,197,94,0.25)',
                                textDecoration: 'none', flexShrink: 0,
                            }}
                        >
                            다운로드
                        </a>
                    </>
                ) : (
                    <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                            fontSize: 10, fontWeight: 700, color: '#818CF8',
                            background: 'rgba(99,102,241,0.12)', padding: '3px 10px',
                            borderRadius: 6, border: '1px solid rgba(99,102,241,0.25)',
                            textDecoration: 'none', flexShrink: 0,
                        }}
                    >
                        링크 이동하기 ↗
                    </a>
                )}
            </div>

            {/* 뷰어 */}
            {!error && isHttpLink ? (
                <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
                    {loading && (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#475569',
                            background: '#fff',
                            zIndex: 1,
                        }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#64748B' }}>미리보기 불러오는 중...</div>
                        </div>
                    )}
                    <iframe
                        key={embedUrl}
                        src={embedUrl}
                        title={label}
                        onLoad={() => setLoading(false)}
                        onError={() => { setLoading(false); setError(true) }}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            background: '#fff',
                        }}
                    />
                </div>
            ) : (
                <div style={{
                    flex: 1, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 14,
                    color: '#475569',
                }}>
                    <span style={{ fontSize: 32 }}>🔒</span>
                    <span style={{ fontSize: 13 }}>미리보기를 로드할 수 없습니다</span>
                    <a
                        href={url} target="_blank" rel="noreferrer"
                        style={{
                            fontSize: 12, fontWeight: 700, color: '#818CF8',
                            background: 'rgba(99,102,241,0.12)', padding: '7px 20px',
                            borderRadius: 8, border: '1px solid rgba(99,102,241,0.25)',
                            textDecoration: 'none',
                        }}
                    >
                        {isPdf ? 'PDF 열기 ↗' : '링크 이동하기 ↗'}
                    </a>
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// 하단 – 지원 정보 패널 (탭)
function ApplicantInfoPanel({ applicant, onStageChange, stageSaving, aiReport, aiReportNotice, canEditStage = false }) {
    const [tab, setTab] = useState('info') // 'info' | 'portfolio' | 'resume' | 'ai'

    // applicant 바뀌면 탭 초기화
    useEffect(() => { setTab('info') }, [applicant?.id])

    if (!applicant) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '100%', color: '#334155', fontSize: 13,
            }}>
                좌측에서 면접자를 선택하면 지원 정보가 표시됩니다
            </div>
        )
    }

    const fd            = applicant.form_data || {}
    const portfolioUrl  = findDocField(fd, PORTFOLIO_KEYS)
    const resumeUrl     = findDocField(fd, RESUME_KEYS)

    const TABS = [
        { id: 'info',      label: '기본 정보' },
        { id: 'portfolio', label: '포트폴리오' },
        { id: 'resume',    label: '이력서' },
    ]
    if (aiReport) {
        const resumeIdx = TABS.findIndex((t) => t.id === 'resume')
        const idx = resumeIdx >= 0 ? resumeIdx : (TABS.length - 1)
        TABS.splice(idx + 1, 0, { id: 'ai', label: 'AI 면접 리포트' })
    }

    const stageOptions = ['평가 전', '예비합격', '최종합격', '불합격', '중도포기']

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* 탭 바 */}
            <div style={{
                display: 'flex', alignItems: 'center',
                padding: '0 16px',
                background: 'rgba(255,255,255,0.02)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                flexShrink: 0, gap: 0,
            }}>
                {/* 면접자 이름 */}
                <div style={{
                    fontSize: 12, fontWeight: 700, color: '#94A3B8',
                    marginRight: 14, paddingRight: 14,
                    borderRight: '1px solid rgba(255,255,255,0.08)',
                    whiteSpace: 'nowrap',
                }}>
                    {applicant.name}
                    {applicant.stage && (
                        <span style={{
                            marginLeft: 7, fontSize: 10, fontWeight: 700,
                            padding: '1px 8px', borderRadius: 999,
                            background: `${STAGE_COLOR[applicant.stage] || '#64748B'}22`,
                            color: STAGE_COLOR[applicant.stage] || '#94A3B8',
                        }}>
                            {applicant.stage}
                        </span>
                    )}
                </div>

                {/* 탭 */}
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{
                        padding: '10px 14px', border: 'none', background: 'none',
                        cursor: 'pointer', fontSize: 11, fontWeight: 700,
                        color: tab === t.id ? '#818CF8' : '#475569',
                        borderBottom: `2px solid ${tab === t.id ? '#6366F1' : 'transparent'}`,
                        transition: 'all .15s', whiteSpace: 'nowrap',
                    }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* 탭 콘텐츠 */}
            <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
                {tab === 'info' && (
                    <div style={{ padding: '12px 16px', overflowY: 'auto', height: '100%' }}>
                        {!!aiReport && (
                            <div style={{
                                marginBottom: 10,
                                padding: '9px 12px',
                                borderRadius: 10,
                                background: 'rgba(34,197,94,0.10)',
                                border: '1px solid rgba(34,197,94,0.22)',
                                color: '#BBF7D0',
                                fontSize: 12,
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 10,
                            }}>
                                <span>{aiReportNotice || 'AI 면접 리포트가 생성되었습니다.'}</span>
                                <button
                                    type="button"
                                    onClick={() => setTab('ai')}
                                    style={{
                                        border: '1px solid rgba(34,197,94,0.28)',
                                        background: 'rgba(34,197,94,0.16)',
                                        color: '#BBF7D0',
                                        fontSize: 11,
                                        fontWeight: 800,
                                        padding: '6px 10px',
                                        borderRadius: 9,
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    리포트 보기
                                </button>
                            </div>
                        )}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))',
                            gap: 7,
                            marginBottom: 10,
                        }}>
                            {[
                                ['이름', applicant.name],
                                ['생년월일', fd.birth],
                                ['연락처', fd.phone || applicant.phone],
                                ['이메일', fd.email || applicant.email],
                                ['평가 상태', applicant.stage || '대기'],
                                ['주소', fd.address || fd.addr],
                            ].map(([label, value]) => (
                                <div key={label} style={{
                                    padding: '8px 11px', borderRadius: 8,
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                }}>
                                    <div style={{ fontSize: 9, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                                        {label}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#E2E8F0', fontWeight: 600 }}>{value || '-'}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{
                            marginBottom: 10,
                            padding: '10px 12px',
                            borderRadius: 8,
                            background: 'rgba(99,102,241,0.08)',
                            border: '1px solid rgba(99,102,241,0.18)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            flexWrap: 'wrap',
                        }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#A5B4FC' }}>면접 평가</div>
                            {canEditStage ? (
                                <>
                                    <select
                                        value={applicant.stage || '평가 전'}
                                        onChange={(e) => onStageChange?.(applicant.id, e.target.value)}
                                        disabled={stageSaving}
                                        style={{
                                            height: 32,
                                            borderRadius: 8,
                                            border: '1px solid rgba(99,102,241,0.35)',
                                            background: 'rgba(15,23,42,0.7)',
                                            color: '#E2E8F0',
                                            padding: '0 10px',
                                            fontSize: 12,
                                            fontWeight: 700,
                                            outline: 'none',
                                        }}>
                                        {stageOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    {stageSaving && <span style={{ fontSize: 11, color: '#94A3B8' }}>저장 중...</span>}
                                </>
                            ) : (
                                <div style={{
                                    height: 32,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: '0 12px',
                                    borderRadius: 8,
                                    border: '1px solid rgba(99,102,241,0.24)',
                                    background: 'rgba(15,23,42,0.45)',
                                    color: '#E2E8F0',
                                    fontSize: 12,
                                    fontWeight: 700,
                                }}>
                                    {applicant.stage || '평가 전'}
                                </div>
                            )}
                            {!canEditStage && (
                                <span style={{ fontSize: 11, color: '#94A3B8' }}>평가 수정은 기업 계정만 가능합니다.</span>
                            )}
                        </div>
                        {[
                            ['지원 동기', fd.motivation],
                            ['향후 비전 및 포부(수행계획)', fd.vision],
                            ['관련 경력(경험)', fd.experience],
                        ].map(([label, value]) => (
                            <div key={label} style={{
                                marginBottom: 10,
                                padding: '10px 12px',
                                borderRadius: 10,
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid rgba(255,255,255,0.05)',
                            }}>
                                <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 800, marginBottom: 6 }}>{label}</div>
                                <div style={{ fontSize: 12, color: '#CBD5E1', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                                    {value || '-'}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {tab === 'portfolio' && (
                    <DocViewer url={portfolioUrl} label="포트폴리오" />
                )}

                {tab === 'resume' && (
                    <DocViewer url={resumeUrl} label="이력서" />
                )}

                {tab === 'ai' && (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        {!aiReport ? (
                            <div style={{
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#94A3B8',
                                fontSize: 13,
                                fontWeight: 600,
                            }}>
                                AI 면접 리포트가 아직 생성되지 않았습니다.
                            </div>
                        ) : (
                            <>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 10,
                                    padding: '10px 14px',
                                    flexShrink: 0,
                                    background: 'rgba(255,255,255,0.02)',
                                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                                }}>
                                    <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700 }}>
                                        생성일: {formatTsNoSeconds(aiReport.created_at)}
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const payload = { ...aiReport, report_json: aiReport.report_json || null }
                                                downloadTextFile(
                                                    JSON.stringify(payload, null, 2),
                                                    `ai_report_${applicant?.name || 'interview'}.json`,
                                                    'application/json;charset=utf-8'
                                                )
                                            }}
                                            style={{
                                                border: '1px solid rgba(99,102,241,0.28)',
                                                background: 'rgba(99,102,241,0.14)',
                                                color: '#C7D2FE',
                                                fontSize: 11,
                                                fontWeight: 800,
                                                padding: '6px 10px',
                                                borderRadius: 9,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            JSON 다운로드
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const text = String(aiReport.summary_raw || '').trim() || '분석된 내용이 없습니다.'
                                                downloadTextFile(text, `ai_report_${applicant?.name || 'interview'}.txt`)
                                            }}
                                            style={{
                                                border: '1px solid rgba(226,232,240,0.14)',
                                                background: 'rgba(148,163,184,0.08)',
                                                color: '#E2E8F0',
                                                fontSize: 11,
                                                fontWeight: 800,
                                                padding: '6px 10px',
                                                borderRadius: 9,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            요약 다운로드
                                        </button>
                                    </div>
                                </div>

                                <div style={{ padding: '12px 14px', overflowY: 'auto', height: '100%' }}>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))',
                                        gap: 7,
                                        marginBottom: 10,
                                    }}>
                                        {[
                                            ['총점', aiReport.total_score ?? null],
                                            ['판정', aiReport.verdict || null],
                                            ['리스크', aiReport.risk_level || null],
                                            ['면접 시간(분)', aiReport.duration_minutes ?? null],
                                        ].map(([label, value]) => (
                                            <div key={label} style={{
                                                padding: '8px 11px',
                                                borderRadius: 8,
                                                background: 'rgba(255,255,255,0.03)',
                                                border: '1px solid rgba(255,255,255,0.06)',
                                            }}>
                                                <div style={{ fontSize: 9, color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                                                    {label}
                                                </div>
                                                <div style={{ fontSize: 12, color: '#E2E8F0', fontWeight: 700 }}>
                                                    {value === null || value === undefined || value === '' ? '분석된 내용이 없습니다.' : String(value)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{
                                        padding: '10px 12px',
                                        borderRadius: 10,
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                    }}>
                                        <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 800, marginBottom: 6 }}>AI 요약</div>
                                        <div style={{ fontSize: 12, color: '#CBD5E1', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                                            {String(aiReport.summary_raw || '').trim() || '분석된 내용이 없습니다.'}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// Mock 화상 피드
function MockVideoFeed({ label, isMain = false, roomTime = '' }) {
    const PALETTE = ['#6366F1','#8B5CF6','#3B82F6','#10B981','#F59E0B','#EC4899','#06B6D4']
    const seed  = label ? label.charCodeAt(0) : 0
    const color = PALETTE[seed % PALETTE.length]

    return (
        <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(145deg,#0D1629,#1A2440)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden',
        }}>
            <div style={{
                position: 'absolute', inset: 0,
                background: `radial-gradient(ellipse at 50% 45%,${color}18 0%,transparent 65%)`,
                animation: 'vPulse 4s ease-in-out infinite',
            }} />
            <div style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMain ? 14 : 5 }}>
                <div style={{
                    width: isMain ? 80 : 28, height: isMain ? 80 : 28,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg,${color},${color}88)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: isMain ? 30 : 11, fontWeight: 800, color: '#fff',
                    boxShadow: `0 0 ${isMain ? 30 : 8}px ${color}55`,
                }}>
                    {isMain ? '📹' : '🎥'}
                </div>
                {isMain && (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#94A3B8', marginBottom: 6 }}>{label}</div>
                        <div style={{
                            fontSize: 11, color: '#6366F1',
                            background: 'rgba(99,102,241,0.12)', padding: '3px 12px',
                            borderRadius: 999, border: '1px solid rgba(99,102,241,0.25)',
                        }}>
                            📹 화상 연결 준비 중
                        </div>
                    </div>
                )}
            </div>
            {roomTime && (
                <div style={{
                    position: 'absolute', bottom: isMain ? 16 : 5, left: isMain ? 14 : 5,
                    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
                    borderRadius: 4, padding: isMain ? '4px 10px' : '2px 5px',
                    fontSize: isMain ? 11 : 9, color: '#fff', fontWeight: 700,
                }}>
                    {roomTime}
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// 좌측 면접자 행
function ApplicantRow({ app, isSelected, onClick }) {
    const fd    = app.form_data || {}
    const color = STAGE_COLOR[app.stage] || STAGE_COLOR['대기']
    return (
        <button onClick={onClick} style={{
            width: '100%', textAlign: 'left',
            padding: '10px 12px', borderRadius: 10, marginBottom: 5,
            border: `1.5px solid ${isSelected ? 'rgba(99,102,241,0.65)' : 'rgba(255,255,255,0.05)'}`,
            background: isSelected ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.02)',
            cursor: 'pointer', transition: 'all .15s',
            display: 'flex', alignItems: 'center', gap: 10,
        }}>
            <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg,#6366F1,#8B5CF6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: '#fff',
            }}>
                {(app.name || '?').charAt(0)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: 13, fontWeight: 700, color: '#F1F5F9',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2,
                }}>
                    {app.name || '이름 없음'}
                </div>
                <div style={{ fontSize: 10, color: '#64748B' }}>
                    {fd.booked_date ? `${fd.booked_date} ${fd.booked_time || ''}` : '일정 미제출'}
                </div>
            </div>
            <div style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: color, boxShadow: `0 0 6px ${color}`,
            }} />
        </button>
    )
}

// ─────────────────────────────────────────────────────────────
// 메인 컴포넌트
export default function VideoInterviewRoom({ companyInfo, onClose }) {
    const { programId, companyName, program, teamId } = companyInfo
    const { profile, role } = useAuth()

    const roomStateKey = useMemo(() => `video_interview_room_state_${programId}_${companyName}`, [programId, companyName])
    const hasRestoredMeetRef = useRef(false)

    const [applicants,        setApplicants]        = useState([])
    const [selectedApplicant, setSelectedApplicant] = useState(null)
    const [selectedRoom,      setSelectedRoom]      = useState(null)
    const [loading,           setLoading]           = useState(true)
    const [showMeetRecord,    setShowMeetRecord]    = useState(() => {
        try {
            const raw = sessionStorage.getItem(roomStateKey)
            const v = raw ? JSON.parse(raw) : null
            return !!v?.showMeetRecord
        } catch (_) {
            return false
        }
    })
    const [stageSavingId,     setStageSavingId]     = useState('')
    const [entryNotice,       setEntryNotice]       = useState('')
    const [roomRecordingMap,  setRoomRecordingMap]  = useState({})
    const [endedRoomMap,      setEndedRoomMap]      = useState({})
    const [reportByAppId,     setReportByAppId]     = useState({})
    const [aiNoticeByAppId,   setAiNoticeByAppId]   = useState({})
    const [pendingAdmissions, setPendingAdmissions] = useState([])
    const [admitActionSignal, setAdmitActionSignal] = useState(null)
    const [settingRow,        setSettingRow]        = useState(null)
    const canEditStage = role === 'COMPANY'
        && String(settingRow?.evaluation_status || '').trim() !== '평가완료'
    const applicantsIdRef = useRef([])
    const pendingCountRef = useRef(0)

    async function markRoomCompleted(room) {
        if (!room?.roomCode) return
        try {
            const { error } = await supabase
                .from('interview_schedules')
                .update({ status: 'completed' })
                .eq('program_id', programId)
                .ilike('meeting_link', `%room=${room.roomCode}%`)
                .neq('status', 'cancelled')
            if (error) throw error
        } catch (e) {
            console.error('markRoomCompleted failed:', e)
        }
    }

    useEffect(() => { loadData() }, [programId, companyName, teamId])
    useEffect(() => {
        if (!programId || !companyName) return
        const normalizedCompany = normalizeCompanyName(companyName)
        const channel = supabase
            .channel(`company-video-room-${programId}-${companyName}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'interview_schedules' }, (payload) => {
                const p = payload.new || payload.old
                if (p?.program_id === programId && normalizeCompanyName(p?.company_name) === normalizedCompany) {
                    loadData()
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'interview_settings' }, (payload) => {
                const p = payload.new || payload.old
                if (p?.program_id === programId) {
                    loadData()
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, (payload) => {
                const p = payload.new || payload.old
                if (p?.program_id === programId && p?.application_type === 'interview') {
                    loadData()
                }
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'interview_ai_reports' }, (payload) => {
                const p = payload.new
                if (!p) return
                if (p?.program_id !== programId) return
                if (p?.application_id && applicantsIdRef.current.includes(p.application_id)) {
                    loadAiReports(applicantsIdRef.current)
                    setAiNoticeByAppId((prev) => ({
                        ...prev,
                        [p.application_id]: 'AI 면접 리포트가 생성되었습니다.',
                    }))
                }
            })
            .subscribe()
        return () => {
            supabase.removeChannel(channel)
        }
    }, [programId, companyName, teamId])

    function parseRoomCode(link) {
        if (!link) return ''
        try {
            const raw = String(link).trim()
            const url = new URL(raw, window.location.origin)
            const room = url.searchParams.get('room')
            if (room) return room
            return ''
        } catch (_) {
            const m = String(link).match(/[?&]room=([^&#]+)/i)
            return m?.[1] ? decodeURIComponent(m[1]) : ''
        }
    }

    function getRoomStartDate(room) {
        if (!room?.date || !room?.startTime) return null
        const d = new Date(`${room.date}T${String(room.startTime).slice(0, 8)}`)
        if (Number.isNaN(d.getTime())) return null
        return d
    }

    function isRoomEnterable(room) {
        if (role === 'ADMIN' || role === 'MASTER' || role === 'COMPANY') return true
        const start = getRoomStartDate(room)
        if (!start) return false
        const openAt = new Date(start.getTime() - (60 * 60 * 1000))
        return Date.now() >= openAt.getTime()
    }

    async function loadData() {
        setLoading(true)
        try {
            let resolvedTeamId = teamId || null
            if (!resolvedTeamId && programId && companyName) {
                const { data: teamByName } = await supabase
                    .from('program_teams')
                    .select('id')
                    .eq('program_id', programId)
                    .eq('name', companyName)
                    .maybeSingle()
                resolvedTeamId = teamByName?.id || null
            }
            const normalizedCompany = normalizeCompanyName(companyName)
            const appsQuery = supabase
                .from('applications')
                .select('*')
                .eq('program_id', programId)
                .eq('application_type', 'interview')
            let settingQuery = supabase
                .from('interview_settings')
                .select('id, status, evaluation_status, program_teams_id')
                .eq('program_id', programId)
            if (resolvedTeamId) {
                settingQuery = settingQuery.eq('program_teams_id', resolvedTeamId)
            } else {
                settingQuery = settingQuery.is('program_teams_id', null)
            }

            const [
                { data: apps, error: appsError },
                { data: schedules, error: schedulesError },
                { data: interviewSetting, error: settingError },
            ] = await Promise.all([
                appsQuery.order('created_at', { ascending: false }),
                supabase
                    .from('interview_schedules')
                    .select('*')
                    .eq('program_id', programId)
                    .neq('status', 'cancelled')
                    .order('scheduled_date', { ascending: true })
                    .order('scheduled_start_time', { ascending: true }),
                settingQuery.maybeSingle(),
            ])
            if (appsError) throw appsError
            if (schedulesError) throw schedulesError
            if (settingError) console.warn('VideoInterviewRoom setting load failed:', settingError)
            setSettingRow(interviewSetting || null)

            const schedulesList = (schedules || []).filter((sc) => (
                normalizeCompanyName(sc?.company_name) === normalizedCompany
            ))
            const filteredAppsByCompany = (apps || []).filter((app) => {
                const appCompanyName = normalizeCompanyName(
                    app?.form_data?.company_name || app?.form_data?.company || ''
                )
                return appCompanyName === normalizedCompany
            })
            const scheduleAppIds = new Set(
                schedulesList.map((s) => s?.application_id).filter(Boolean)
            )
            const filteredApps = filteredAppsByCompany.length > 0
                ? filteredAppsByCompany
                : (apps || []).filter((app) => scheduleAppIds.has(app?.id))
            const needsRepairSchedules = schedulesList.filter((sc) => {
                if ((sc?.interview_mode || 'online') !== 'online') return false
                const roomCode = parseRoomCode(sc?.meeting_link || '')
                if (!roomCode) return true
                const canonical = `${window.location.origin}/meet-record?room=${encodeURIComponent(roomCode)}`
                return String(sc?.meeting_link || '').trim() !== canonical
            })

            if (needsRepairSchedules.length > 0) {
                for (const sc of needsRepairSchedules) {
                    try {
                        let roomCode = parseRoomCode(sc?.meeting_link || '')
                        if (!roomCode) {
                            const roomRes = await fetch(`${MEET_SERVER_URL}/create-room`)
                            if (!roomRes.ok) continue
                            const roomJson = await roomRes.json()
                            roomCode = String(roomJson?.roomId || '').trim()
                            if (!roomCode) continue
                        }
                        const repairedLink = `${window.location.origin}/meet-record?room=${encodeURIComponent(roomCode)}`
                        const { error: updateErr } = await supabase
                            .from('interview_schedules')
                            .update({ meeting_link: repairedLink })
                            .eq('id', sc.id)
                        if (updateErr) continue
                        const idx = schedulesList.findIndex((it) => it.id === sc.id)
                        if (idx >= 0) {
                            schedulesList[idx] = { ...schedulesList[idx], meeting_link: repairedLink }
                        }
                    } catch (_) {
                        // noop
                    }
                }
            }

            const scheduleByApp = new Map()
            ;(schedulesList || []).forEach((s) => {
                if (!s.application_id) return
                scheduleByApp.set(s.application_id, s)
            })
            const appList = filteredApps.map((app) => {
                const sc = scheduleByApp.get(app.id) || null
                const fd = app.form_data || {}
                const sharedStage = normalizeApplicantStage(app.stage || '평가 전')
                return {
                    ...app,
                    stage: sharedStage,
                    _schedule: sc,
                    form_data: {
                        ...fd,
                        booked_date: sc?.scheduled_date || fd.booked_date || null,
                        booked_time: sc?.scheduled_start_time || fd.booked_time || null,
                    },
                }
            })
            setApplicants(appList)
            applicantsIdRef.current = appList.map((a) => a.id).filter(Boolean)
            setSelectedApplicant((prev) => {
                if (!appList.length) return null
                if (!prev) return appList[0]
                return appList.find((a) => a.id === prev.id) || appList[0]
            })
            await loadAiReports(appList.map((a) => a.id).filter(Boolean))
        } catch (err) {
            console.error('VideoInterviewRoom loadData:', err)
        } finally {
            setLoading(false)
        }
    }

    async function loadAiReports(appIds) {
        if (!appIds || appIds.length === 0) {
            setReportByAppId({})
            return
        }
        try {
            const { data } = await supabase
                .from('interview_ai_reports')
                .select('*')
                .in('application_id', appIds)
                .order('created_at', { ascending: false })
            const map = {}
            ;(data || []).forEach((r) => {
                if (!r.application_id) return
                if (map[r.application_id]) return
                map[r.application_id] = r
            })
            setReportByAppId(map)
        } catch (e) {
            console.error('loadAiReports failed:', e)
        }
    }

    const rooms = useMemo(() => {
        const map = {}
        applicants.forEach(app => {
            const sc = app._schedule
            if (!sc?.scheduled_date || !sc?.scheduled_start_time) return
            const roomCode = parseRoomCode(sc.meeting_link || '')
            if (!roomCode) return
            const key = `${sc.scheduled_date}_${sc.scheduled_start_time}_${roomCode}`
            if (!map[key]) {
                map[key] = {
                    id: key,
                    date: sc.scheduled_date,
                    timeLabel: `${sc.scheduled_start_time} ~ ${sc.scheduled_end_time || ''}`,
                    startTime: sc.scheduled_start_time,
                    endTime: sc.scheduled_end_time || '',
                    status: sc.status || null,
                    roomCode,
                    meetingLink: sc.meeting_link || '',
                    applicants: [],
                }
            }
            if (sc.status === 'completed') map[key].status = 'completed'
            map[key].applicants.push(app)
        })
        return Object.values(map).sort((a, b) => a.id.localeCompare(b.id))
    }, [applicants])

    useEffect(() => {
        if (!rooms.length) {
            setSelectedRoom(null)
            return
        }
        setSelectedRoom((prev) => {
            if (!prev) {
                try {
                    const raw = sessionStorage.getItem(roomStateKey)
                    const v = raw ? JSON.parse(raw) : null
                    const preferredId = v?.selectedRoomId
                    const preferred = preferredId ? rooms.find((r) => r.id === preferredId) : null
                    if (preferred) return preferred
                } catch (_) {
                    // noop
                }
                return rooms[0]
            }
            return rooms.find((r) => r.id === prev.id) || rooms[0]
        })
    }, [rooms])

    function isRoomEnded(room) {
        if (!room) return false
        if (room.status === 'completed') return true
        return !!endedRoomMap[room.id]
    }

    useEffect(() => {
        if (!selectedRoom) return
        if (showMeetRecord && (isRoomEnded(selectedRoom) || !isRoomEnterable(selectedRoom))) {
            setShowMeetRecord(false)
            setEntryNotice(isRoomEnded(selectedRoom) ? '' : '아직 면접 시간 전입니다. 1시간 전부터 입장 가능합니다.')
        }
    }, [selectedRoom, showMeetRecord])

    useEffect(() => {
        setPendingAdmissions([])
        pendingCountRef.current = 0
    }, [selectedRoom?.id, showMeetRecord])

    useEffect(() => {
        if (!(role === 'ADMIN' || role === 'MASTER')) return
        const prev = pendingCountRef.current
        const next = pendingAdmissions.length
        if (next > prev) {
            setEntryNotice(
                next === 1
                    ? '면접 대기실에 입장 승인 요청이 1건 있습니다.'
                    : `면접 대기실에 입장 승인 요청이 ${next}건 있습니다.`
            )
        }
        pendingCountRef.current = next
    }, [pendingAdmissions, role])

    useEffect(() => {
        // Restore "already entered" view once, after we have a selectedRoom.
        if (hasRestoredMeetRef.current) return
        if (!selectedRoom) return
        hasRestoredMeetRef.current = true
        try {
            const raw = sessionStorage.getItem(roomStateKey)
            const v = raw ? JSON.parse(raw) : null
            if (v?.showMeetRecord && !isRoomEnded(selectedRoom) && isRoomEnterable(selectedRoom)) {
                setShowMeetRecord(true)
            }
        } catch (_) {
            // noop
        }
    }, [selectedRoom, roomStateKey])

    useEffect(() => {
        try {
            sessionStorage.setItem(roomStateKey, JSON.stringify({
                selectedRoomId: selectedRoom?.id || '',
                showMeetRecord: !!showMeetRecord,
            }))
        } catch (_) {
            // noop
        }
    }, [roomStateKey, selectedRoom?.id, showMeetRecord])

    async function onChangeApplicantStage(appId, nextStage) {
        if (!appId || !nextStage) return
        if (role !== 'COMPANY') return
        if (!canEditStage) return
        setStageSavingId(appId)
        try {
            const { error: appErr } = await supabase
                .from('applications')
                .update({ stage: nextStage })
                .eq('id', appId)
            
            if (appErr) throw appErr
            setApplicants((prev) => prev.map((a) => (
                a.id === appId
                    ? { ...a, stage: normalizeApplicantStage(nextStage) }
                    : a
            )))
            setSelectedApplicant((prev) => prev && prev.id === appId
                ? { ...prev, stage: normalizeApplicantStage(nextStage) }
                : prev)
            alert('면접자 상태가 변경되었습니다')
        } catch (e) {
            console.error('stage update failed:', e)
            alert(`면접자 상태 변경 실패: ${e.message}`)
        } finally {
            setStageSavingId('')
        }
    }

    const centerLabel = selectedRoom
        ? `${selectedRoom.date}  ${selectedRoom.timeLabel}`
        : ''

    const selectedRoomStartAt = selectedRoom?.date && selectedRoom?.startTime
        ? `${selectedRoom.date}T${String(selectedRoom.startTime).slice(0, 8)}`
        : ''

    const isSelectedRoomRecording = selectedRoom ? !!roomRecordingMap[selectedRoom.id] : false
    const selectedRoomEndedInfo = selectedRoom ? (endedRoomMap[selectedRoom.id] || (selectedRoom.status === 'completed' ? { endedAt: null, reportGenerated: false } : null)) : null

    // ── 렌더 ──────────────────────────────────────────────
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 3000,
            background: '#080C18',
            display: 'flex', flexDirection: 'column',
            fontFamily: "'Inter','Pretendard',-apple-system,sans-serif",
        }}>
            <style>{`
                @keyframes vPulse {
                    0%,100%{opacity:.35;transform:scale(1);}
                    50%{opacity:.72;transform:scale(1.04);}
                }
                @keyframes recBlink {
                    0%,100%{opacity:1;}50%{opacity:.25;}
                }
            `}</style>

            {/* ══ 헤더 ════════════════════════════════════ */}
            <header style={{
                height: 50, flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 14, padding: '0 18px',
                background: 'rgba(8,12,24,0.97)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: '#EF4444', animation: 'recBlink 2s ease infinite',
                    }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>화상 면접실</span>
                </div>
                <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />
                <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>{companyName}</span>
                {program?.title && (
                    <div style={{
                        fontSize: 11, fontWeight: 600, color: '#818CF8',
                        background: 'rgba(99,102,241,0.12)', padding: '2px 10px',
                        borderRadius: 999, border: '1px solid rgba(99,102,241,0.2)',
                    }}>
                        {program.title}
                    </div>
                )}
                <div style={{ flex: 1 }} />
                {(role === 'ADMIN' || role === 'MASTER') && (
                    <div style={{ fontSize: 11, color: isSelectedRoomRecording ? '#22C55E' : '#94A3B8' }}>
                        {isSelectedRoomRecording ? '해당 면접이 기록됨' : '기록 대기 중'}
                    </div>
                )}
                {selectedRoom && (
                    <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: '#10B981', boxShadow: '0 0 6px #10B981', display: 'inline-block',
                        }} />
                        {centerLabel}
                    </div>
                )}
                <button onClick={onClose} style={{
                    height: 30, padding: '0 14px', borderRadius: 8,
                    border: '1px solid rgba(239,68,68,0.3)',
                    background: 'rgba(239,68,68,0.08)', color: '#FCA5A5',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>
                    ✕ 면접실 나가기
                </button>
            </header>

            {/* ══ 바디 ════════════════════════════════════ */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                {/* ── 좌측: 면접자 목록 ─────────────────── */}
                <aside style={{
                    width: 234, flexShrink: 0,
                    display: 'flex', flexDirection: 'column',
                    background: 'rgba(10,14,26,0.9)',
                    borderRight: '1px solid rgba(255,255,255,0.05)',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        padding: '13px 14px 9px',
                        borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0,
                    }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                            면접자 목록
                        </div>
                        <div style={{ fontSize: 11, color: '#334155' }}>총 {applicants.length}명</div>
                    </div>

                    {selectedApplicant && (
                        <div style={{
                            margin: '10px 10px 0', padding: '11px',
                            background: 'rgba(99,102,241,0.08)',
                            border: '1px solid rgba(99,102,241,0.17)',
                            borderRadius: 10, flexShrink: 0,
                        }}>
                            <div style={{ fontSize: 10, color: '#818CF8', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                선택된 면접자
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#F1F5F9', marginBottom: 4 }}>
                                {selectedApplicant.name}
                            </div>
                            {selectedApplicant.form_data?.phone && (
                                <div style={{ fontSize: 10, color: '#94A3B8' }}>📱 {selectedApplicant.form_data.phone}</div>
                            )}
                            {selectedApplicant.form_data?.booked_date && (
                                <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
                                    📅 {selectedApplicant.form_data.booked_date} {selectedApplicant.form_data.booked_time || ''}
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '30px 0', color: '#334155', fontSize: 12 }}>불러오는 중...</div>
                        ) : applicants.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: '#1E293B', fontSize: 12 }}>면접자가 없습니다</div>
                        ) : applicants.map(app => (
                            <ApplicantRow
                                key={app.id}
                                app={app}
                                isSelected={selectedApplicant?.id === app.id}
                                onClick={() => setSelectedApplicant(app)}
                            />
                        ))}
                    </div>
                </aside>

                {/* ── 중앙: 화상 + 지원정보 ─────────────── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

                    {/* 상단 62% – 화상 영역 */}
                    <div style={{
                        flex: '0 0 62%', position: 'relative',
                        background: '#0A0E1A',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        overflow: 'hidden',
                    }}>
                        {!selectedRoom ? (
                            <div style={{
                                width: '100%', height: '100%',
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center', gap: 10,
                                color: '#94A3B8',
                            }}>
                                <div style={{ fontSize: 16, fontWeight: 700, color: '#E2E8F0' }}>면접방이 선택되지 않았습니다</div>
                                <div style={{ fontSize: 13 }}>오른쪽 면접방 목록에서 선택해주세요.</div>
                            </div>
                        ) : selectedRoomEndedInfo ? (
                            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                                <MockVideoFeed label={centerLabel} isMain roomTime={selectedRoom.timeLabel} />
                                <div style={{
                                    position: 'absolute',
                                    left: '50%',
                                    top: 16,
                                    transform: 'translateX(-50%)',
                                    zIndex: 2,
                                }}>
                                    <div style={{
                                        minWidth: 280,
                                        maxWidth: 'min(86vw, 620px)',
                                        borderRadius: 999,
                                        background: 'rgba(15,23,42,0.88)',
                                        border: '1px solid rgba(148,163,184,0.34)',
                                        boxShadow: '0 10px 30px rgba(2,6,23,0.45)',
                                        padding: '11px 18px',
                                        textAlign: 'center',
                                        backdropFilter: 'blur(8px)',
                                    }}>
                                        <div style={{ fontSize: 14, fontWeight: 800, color: '#F8FAFC', whiteSpace: 'nowrap' }}>
                                            면접이 종료된 방입니다.
                                        </div>
                                        {selectedRoomEndedInfo.reportGenerated && (
                                            <div style={{ fontSize: 11, fontWeight: 700, color: '#22C55E', marginTop: 3 }}>
                                                AI 리포트가 생성되었습니다.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : !isRoomEnterable(selectedRoom) ? (
                            <div style={{
                                width: '100%', height: '100%',
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center', gap: 10,
                                color: '#94A3B8',
                            }}>
                                <div style={{ fontSize: 16, fontWeight: 700, color: '#E2E8F0' }}>아직 면접 시간 전입니다.</div>
                                <div style={{ fontSize: 13 }}>1시간 전부터 입장 가능합니다.</div>
                            </div>
                        ) : showMeetRecord ? (
                            <div style={{ position: 'absolute', inset: 0 }}>
                                <MeetRecord
                                    embedded
                                    onClose={(closeInfo = {}) => {
                                        setShowMeetRecord(false)
                                        if (closeInfo?.reason === 'meeting-ended') {
                                            setEntryNotice('면접이 종료되었습니다.')
                                            if (selectedRoom?.id) {
                                                setEndedRoomMap((prev) => ({
                                                    ...prev,
                                                    [selectedRoom.id]: {
                                                        endedAt: new Date().toISOString(),
                                                        reportGenerated: !!prev[selectedRoom.id]?.reportGenerated,
                                                    },
                                                }))
                                            }
                                        }
                                    }}
                                    onInterviewEnded={({ reportSaved, endedOnly }) => {
                                        if (!selectedRoom?.id) return
                                        if (endedOnly) {
                                            markRoomCompleted(selectedRoom)
                                        }
                                        setRoomRecordingMap((prev) => ({ ...prev, [selectedRoom.id]: false }))
                                        setEndedRoomMap((prev) => ({
                                            ...prev,
                                            [selectedRoom.id]: {
                                                endedAt: new Date().toISOString(),
                                                reportGenerated: !!reportSaved || !!prev[selectedRoom.id]?.reportGenerated,
                                            },
                                        }))
                                        if (!endedOnly) {
                                            markRoomCompleted(selectedRoom)
                                            setShowMeetRecord(false)
                                        }
                                        setEntryNotice('')
                                        if (reportSaved && selectedApplicant?.id) {
                                            // report insert가 비동기로 늦게 들어올 수 있어도, UX 안내는 즉시 보여줍니다.
                                            setAiNoticeByAppId((prev) => ({ ...prev, [selectedApplicant.id]: 'AI 면접 리포트가 생성되었습니다.' }))
                                            loadAiReports(applicantsIdRef.current)
                                        }
                                    }}
                                    hideHostRecordControls={false}
                                    forcedRoomCode={selectedRoom?.roomCode || ''}
                                    defaultUsername={profile?.name || profile?.email || companyName}
                                    autoJoin={Boolean(selectedRoom?.roomCode)}
                                    scheduledStartAt={selectedRoomStartAt}
                                    onRecordingStateChange={(isRecording) => {
                                        if (!selectedRoom?.id) return
                                        setRoomRecordingMap((prev) => ({ ...prev, [selectedRoom.id]: !!isRecording }))
                                    }}
                                    onPendingAdmissionsChange={(pending) => {
                                        if (!(role === 'ADMIN' || role === 'MASTER')) return
                                        setPendingAdmissions(Array.isArray(pending) ? pending : [])
                                    }}
                                    admitActionSignal={admitActionSignal}
                                    reportContext={{
                                        programId,
                                        companyName,
                                        applicationId: selectedApplicant?.id || null,
                                        applicantName: selectedApplicant?.name || null,
                                        roomId: selectedRoom?.id || null,
                                        roomDate: selectedRoom?.date || null,
                                        roomTime: selectedRoom?.timeLabel || null,
                                        interviewerName: profile?.name || profile?.email || null,
                                        interviewees: (selectedRoom?.applicants || []).map((a) => ({
                                            applicationId: a.id,
                                            name: a.name,
                                        })),
                                    }}
                                />
                            </div>
                        ) : (
                            <>
                                <MockVideoFeed label={centerLabel} isMain roomTime={selectedRoom.timeLabel} />
                                <div style={{
                                    position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
                                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
                                    borderRadius: 999, padding: '5px 16px',
                                    fontSize: 11, color: '#94A3B8', fontWeight: 600,
                                    border: '1px solid rgba(255,255,255,0.07)',
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    whiteSpace: 'nowrap',
                                }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#64748B', display: 'inline-block' }} />
                                    {selectedRoom.date}  {selectedRoom.timeLabel}  ·  {selectedRoom.applicants.length}명 배정
                                </div>
                                <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)' }}>
                                    <button className="btn btn-primary btn-sm" onClick={() => setShowMeetRecord(true)}>면접실 입장</button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* 하단 38% – 지원 정보 (탭) */}
                    <div style={{ flex: '0 0 38%', background: '#0B0F1E', overflow: 'hidden' }}>
                        <ApplicantInfoPanel
                            applicant={selectedApplicant}
                            onStageChange={onChangeApplicantStage}
                            stageSaving={stageSavingId === selectedApplicant?.id}
                            aiReport={selectedApplicant?.id ? reportByAppId[selectedApplicant.id] : null}
                            aiReportNotice={selectedApplicant?.id ? aiNoticeByAppId[selectedApplicant.id] : ''}
                            canEditStage={canEditStage}
                        />
                    </div>
                </div>

                {/* ── 우측: 면접자 목록 ───────────────────── */}
                <aside style={{
                    width: 234, flexShrink: 0,
                    display: 'flex', flexDirection: 'column',
                    background: 'rgba(10,14,26,0.9)',
                    borderLeft: '1px solid rgba(255,255,255,0.05)',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        padding: '13px 14px 9px',
                        borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0,
                    }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                            면접자 목록
                        </div>
                        <div style={{ fontSize: 11, color: '#334155' }}>총 {applicants.length}명</div>
                        <div style={{ fontSize: 10, color: '#64748B', marginTop: 4 }}>해당 기업에 배정된 면접자 목록입니다.</div>
                    </div>

                    {(role === 'ADMIN' || role === 'MASTER') && showMeetRecord && (
                        <div style={{
                            margin: '10px 10px 0',
                            padding: '10px 10px',
                            borderRadius: 10,
                            border: `1px solid ${pendingAdmissions.length > 0 ? 'rgba(245,158,11,0.45)' : 'rgba(148,163,184,0.25)'}`,
                            background: pendingAdmissions.length > 0 ? 'rgba(245,158,11,0.12)' : 'rgba(15,23,42,0.45)',
                            flexShrink: 0,
                        }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: pendingAdmissions.length > 0 ? '#FCD34D' : '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                면접 대기실
                            </div>
                            <div style={{ marginTop: 5, fontSize: 11, color: pendingAdmissions.length > 0 ? '#FDE68A' : '#64748B', fontWeight: 700 }}>
                                {pendingAdmissions.length > 0
                                    ? `입장 승인 대기 ${pendingAdmissions.length}명`
                                    : '입장 요청 없음'}
                            </div>
                            {pendingAdmissions.length > 0 && (
                                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 110, overflowY: 'auto' }}>
                                    {pendingAdmissions.slice(0, 5).map((p) => (
                                        <div key={p.sid} style={{
                                            background: 'rgba(15,23,42,0.55)',
                                            border: '1px solid rgba(245,158,11,0.3)',
                                            borderRadius: 7,
                                            padding: '6px 7px',
                                        }}>
                                            <div style={{
                                                fontSize: 11,
                                                color: '#F8FAFC',
                                                fontWeight: 700,
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                marginBottom: 5,
                                            }}>
                                                {p.username}
                                            </div>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setAdmitActionSignal({ sid: p.sid, action: 'approve', token: `${Date.now()}_${p.sid}_approve` })}
                                                    style={{
                                                        flex: 1,
                                                        border: '1px solid rgba(34,197,94,0.45)',
                                                        background: 'rgba(34,197,94,0.15)',
                                                        color: '#BBF7D0',
                                                        borderRadius: 6,
                                                        height: 24,
                                                        fontSize: 10,
                                                        fontWeight: 800,
                                                        cursor: 'pointer',
                                                    }}>
                                                    승인
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setAdmitActionSignal({ sid: p.sid, action: 'deny', token: `${Date.now()}_${p.sid}_deny` })}
                                                    style={{
                                                        flex: 1,
                                                        border: '1px solid rgba(248,113,113,0.45)',
                                                        background: 'rgba(248,113,113,0.14)',
                                                        color: '#FECACA',
                                                        borderRadius: 6,
                                                        height: 24,
                                                        fontSize: 10,
                                                        fontWeight: 800,
                                                        cursor: 'pointer',
                                                    }}>
                                                    거절
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {pendingAdmissions.length > 5 && (
                                        <div style={{ fontSize: 10, color: '#FCD34D', fontWeight: 700 }}>
                                            +{pendingAdmissions.length - 5}명 더 대기 중
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '30px 0', color: '#334155', fontSize: 11 }}>불러오는 중...</div>
                        ) : applicants.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '30px 8px', color: '#1E293B', fontSize: 11, lineHeight: 1.6 }}>
                                면접자가 없습니다.<br />면접자 배정 상태를 확인해주세요.
                            </div>
                        ) : applicants.map(app => (
                            <ApplicantRow
                                key={`right-${app.id}`}
                                app={app}
                                isSelected={selectedApplicant?.id === app.id}
                                onClick={() => setSelectedApplicant(app)}
                            />
                        ))}
                    </div>
                </aside>
            </div>
            {entryNotice && (
                <div style={{
                    position: 'fixed',
                    left: '50%',
                    bottom: 18,
                    transform: 'translateX(-50%)',
                    background: 'rgba(15,23,42,0.92)',
                    color: '#E2E8F0',
                    border: '1px solid rgba(148,163,184,0.35)',
                    borderRadius: 999,
                    padding: '8px 14px',
                    fontSize: 12,
                    zIndex: 3200,
                }}>
                    {entryNotice}
                </div>
            )}
        </div>
    )
}
