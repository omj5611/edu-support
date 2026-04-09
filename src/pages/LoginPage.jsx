import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './LoginPage.css'

const BRAND_LINKS = {
    SNIPERFACTORY: 'https://edu-support-seven.vercel.app/login?brand=SNIPERFACTORY',
    INSIDEOUT: 'https://edu-support-seven.vercel.app/login?brand=INSIDEOUT',
}

function detectBrand() {
    const params = new URLSearchParams(window.location.search)
    const brandParam = params.get('brand')
    if (brandParam === 'SNIPERFACTORY' || brandParam === 'INSIDEOUT') return brandParam
    const host = window.location.hostname
    if (host.includes('insideout')) return 'INSIDEOUT'
    if (host.includes('sniperfactory')) return 'SNIPERFACTORY'
    return null
}

const ROLES = [
    { value: 'admin', label: '운영진', desc: '프로그램 관리' },
    { value: 'student', label: '면접자', desc: '일정 예약' },
]

export default function LoginPage() {
    const navigate = useNavigate()

    const [role_, setRole] = useState('admin')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [showRegister, setShowRegister] = useState(false)

    const detectedBrand = detectBrand()

    // ── 공통 로그인 함수 ──────────────────────────────────────
    async function handleLogin(e) {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            })
            if (authError) throw authError

            // users 테이블에서 role 직접 조회 (maybeSingle: RLS 실패해도 에러 없음)
            let userRole = null
            try {
                const { data: userProfile } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', data.user.id)
                    .maybeSingle()
                userRole = userProfile?.role
            } catch (e) {
                console.warn('users 조회 실패:', e)
            }
            if (!userRole) userRole = data.user.user_metadata?.role

            // user_metadata에 role이 없으면 저장 → AuthContext fallback에서 바로 사용 가능
            if (userRole && !data.user.user_metadata?.role) {
                await supabase.auth.updateUser({ data: { role: userRole } })
            }

            if (userRole === 'ADMIN' || userRole === 'MASTER') navigate('/admin')
            else if (userRole === 'COMPANY') navigate('/company')
            else if (userRole === 'USER') navigate('/student')
            else navigate('/admin')
        } catch (err) {
            console.error('로그인 에러:', err)
            setError('이메일 또는 비밀번호가 올바르지 않습니다.')
        } finally {
            setLoading(false)
        }
    }

    // ── 기업 회원가입 함수 ────────────────────────────────────
    async function handleRegister(e) {
        e.preventDefault()
        if (!detectedBrand) { setError('기업 전용 페이지에서만 가입할 수 있습니다.'); return }
        setError('')
        setLoading(true)
        try {
            const { data, error: signUpError } = await supabase.auth.signUp({
                email: email.trim(),
                password,
            })
            if (signUpError) throw signUpError

            if (data.user) {
                // users 테이블에 저장
                const { error: insertError } = await supabase.from('users').upsert({
                    id: data.user.id,
                    email: email.trim(),
                    role: 'COMPANY',
                    brand: detectedBrand,
                    metadata: {},
                })
                if (insertError) console.warn('users insert 실패:', insertError)

                // user_metadata에도 role/brand 저장 → RLS fallback 시에도 role 확인 가능
                await supabase.auth.updateUser({
                    data: { role: 'COMPANY', brand: detectedBrand }
                })
            }

            alert('가입이 완료되었습니다. 이메일을 확인한 뒤 로그인해주세요.')
            setShowRegister(false)
            setPassword('')
        } catch (err) {
            console.error('가입 에러:', err)
            setError('가입 실패: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    // ── 기업 전용 페이지 ──────────────────────────────────────
    if (detectedBrand) {
        const brandName = detectedBrand === 'SNIPERFACTORY' ? '스나이퍼팩토리' : '인사이드아웃'
        return (
            <div className="login-wrap">
                <div className="login-card">
                    <div className="login-header">
                        <div className="login-logo">M</div>
                        <h1>면접 관리 시스템</h1>
                        <p>{brandName} 기업 담당자 전용</p>
                    </div>

                    {!showRegister ? (
                        <form onSubmit={handleLogin}>
                            <div className="form-group">
                                <label className="form-label">이메일</label>
                                <input className="form-input" type="email" value={email}
                                    onChange={e => setEmail(e.target.value)} placeholder="이메일 입력" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">비밀번호</label>
                                <input className="form-input" type="password" value={password}
                                    onChange={e => setPassword(e.target.value)} placeholder="비밀번호 입력" required />
                            </div>
                            {error && <div className="error-msg">{error}</div>}
                            <button className="login-btn" type="submit" disabled={loading}>
                                {loading ? '로그인 중...' : '로그인'}
                            </button>
                            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--gray-500)' }}>
                                계정이 없으신가요?{' '}
                                {detectedBrand === 'INSIDEOUT' ? (
                                    <a href="https://insideout.or.kr/signup" target="_blank" rel="noreferrer"
                                        style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 13 }}>
                                        회원가입
                                    </a>
                                ) : (
                                    <button type="button" onClick={() => { setShowRegister(true); setError('') }}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontWeight: 600, fontSize: 13 }}>
                                        회원가입
                                    </button>
                                )}
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleRegister}>
                            <div style={{ padding: '12px 16px', background: 'var(--primary-light)', borderRadius: 8, marginBottom: 20, fontSize: 13, color: 'var(--primary)', lineHeight: 1.6 }}>
                                {brandName} 면접 관리 시스템에 처음 가입하시는 경우입니다.
                                이메일과 비밀번호를 입력해 가입을 완료해주세요.
                            </div>
                            <div className="form-group">
                                <label className="form-label">이메일</label>
                                <input className="form-input" type="email" value={email}
                                    onChange={e => setEmail(e.target.value)} placeholder="이메일 입력" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">비밀번호</label>
                                <input className="form-input" type="password" value={password}
                                    onChange={e => setPassword(e.target.value)} placeholder="8자 이상" required minLength={8} />
                            </div>
                            {error && <div className="error-msg">{error}</div>}
                            <button className="login-btn" type="submit" disabled={loading}>
                                {loading ? '가입 중...' : '회원가입'}
                            </button>
                            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--gray-500)' }}>
                                이미 계정이 있으신가요?{' '}
                                <button type="button" onClick={() => { setShowRegister(false); setError('') }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontWeight: 600, fontSize: 13 }}>
                                    로그인
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        )
    }

    // ── 운영진 / 면접자 로그인 페이지 ────────────────────────
    return (
        <div className="login-wrap">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo">M</div>
                    <h1>면접 관리 시스템</h1>
                    <p>통합 비즈니스 관리자 플랫폼</p>
                </div>

                {/* 역할 선택 */}
                <div className="role-section">
                    <span className="form-label">접속 역할</span>
                    <div className="role-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                        {ROLES.map(r => (
                            <button key={r.value} type="button"
                                className={`role-btn ${role_ === r.value ? 'active' : ''}`}
                                onClick={() => { setRole(r.value); setError('') }}>
                                <span className="role-name">{r.label}</span>
                                <span className="role-desc">{r.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 기업 접속 안내 */}
                <div style={{ padding: '14px 16px', background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 10, marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-600)', marginBottom: 8 }}>기업 담당자 접속 링크</div>
                    {Object.entries(BRAND_LINKS).map(([brand, link]) => (
                        <div key={brand} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontSize: 12, color: 'var(--gray-700)', fontWeight: 600 }}>
                                {brand === 'SNIPERFACTORY' ? '스나이퍼팩토리' : '인사이드아웃'}
                            </span>
                            <a href={link} target="_blank" rel="noreferrer"
                                style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', padding: '3px 10px', background: 'var(--primary-light)', borderRadius: 6, border: '1px solid var(--primary-border)' }}>
                                접속하기
                            </a>
                        </div>
                    ))}
                    <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 6 }}>
                        기업은 위 링크로만 로그인 및 가입 가능합니다.
                    </div>
                </div>

                {/* 로그인 폼 */}
                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label className="form-label">이메일</label>
                        <input className="form-input" type="email" value={email}
                            onChange={e => setEmail(e.target.value)} placeholder="이메일 입력" required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">비밀번호</label>
                        <input className="form-input" type="password" value={password}
                            onChange={e => setPassword(e.target.value)} placeholder="비밀번호 입력" required />
                    </div>
                    {error && <div className="error-msg">{error}</div>}
                    <button className="login-btn" type="submit" disabled={loading}>
                        {loading ? '로그인 중...' : '로그인'}
                    </button>
                </form>
            </div>
        </div>
    )
}