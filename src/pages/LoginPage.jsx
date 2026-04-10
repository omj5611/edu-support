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

function EyeIcon({ off = false }) {
  if (off) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6A3 3 0 0 0 13.4 13.4" />
        <path d="M9.9 4.2A10.6 10.6 0 0 1 12 4c7 0 11 8 11 8a20.2 20.2 0 0 1-5 5.9" />
        <path d="M6.6 6.6A20.7 20.7 0 0 0 1 12s4 8 11 8a10.7 10.7 0 0 0 4-.8" />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function PasswordInput({ value, onChange, showPassword, onToggle, placeholder = '비밀번호 입력', minLength }) {
  return (
    <div style={{ position: 'relative' }}>
      <input
        className="form-input"
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required
        minLength={minLength}
        style={{ paddingRight: 44 }}
      />
      <button
        type="button"
        aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
        onClick={onToggle}
        style={{
          position: 'absolute',
          right: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 28,
          height: 28,
          borderRadius: 6,
          border: '1px solid var(--gray-200)',
          background: '#fff',
          fontSize: 14,
          color: 'var(--gray-500)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <EyeIcon off={showPassword} />
      </button>
    </div>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()

  const [role_, setRole] = useState('admin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [registerRole, setRegisterRole] = useState('company') // 'company' | 'student'

  const [regName, setRegName] = useState('')
  const [regBirth, setRegBirth] = useState('')
  const [regPhone, setRegPhone] = useState('')

  const detectedBrand = detectBrand()
  const isBrandPortal = !!detectedBrand

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

  async function handleRegister(e) {
    e.preventDefault()
    if (!detectedBrand) {
      setError('브랜드 전용 페이지에서만 가입할 수 있습니다.')
      return
    }

    const isStudent = registerRole === 'student'

    if (isStudent && (!regName.trim() || !regBirth || !regPhone.trim())) {
      setError('이름, 생년월일, 전화번호를 모두 입력해주세요.')
      return
    }

    setError('')
    setLoading(true)
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })
      if (signUpError) throw signUpError

      if (data.user) {
        const role = isStudent ? 'USER' : 'COMPANY'
        const metadata = isStudent
          ? { name: regName.trim(), birth: regBirth, phone: regPhone.trim() }
          : {}

        const { error: insertError } = await supabase.from('users').upsert({
          id: data.user.id,
          email: email.trim(),
          name: isStudent ? regName.trim() : null,
          phone: isStudent ? regPhone.trim() : null,
          role,
          brand: detectedBrand,
          metadata,
        })
        if (insertError) console.warn('users upsert 실패:', insertError)

        await supabase.auth.updateUser({
          data: {
            role,
            brand: detectedBrand,
            ...(isStudent ? { name: regName.trim(), birth: regBirth, phone: regPhone.trim() } : {}),
          },
        })
      }

      alert('가입이 완료되었습니다. 이메일을 확인한 뒤 로그인해주세요.')
      setShowRegister(false)
      setPassword('')
      setRegName('')
      setRegBirth('')
      setRegPhone('')
    } catch (err) {
      console.error('가입 에러:', err)
      setError('가입 실패: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (isBrandPortal) {
    const brandName = detectedBrand === 'SNIPERFACTORY' ? '스나이퍼팩토리' : '인사이드아웃'

    return (
      <div className="login-wrap">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">M</div>
            <h1>면접 관리 시스템</h1>
            <p>{brandName} 전용</p>
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
                <PasswordInput
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  showPassword={showPassword}
                  onToggle={() => setShowPassword(v => !v)}
                  placeholder="비밀번호 입력"
                />
              </div>
              {error && <div className="error-msg">{error}</div>}
              <button className="login-btn" type="submit" disabled={loading}>
                {loading ? '로그인 중...' : '로그인'}
              </button>
              <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--gray-500)' }}>
                계정이 없으신가요?{' '}
                <button type="button" onClick={() => { setShowRegister(true); setError('') }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontWeight: 600, fontSize: 13 }}>
                  회원가입
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div style={{ padding: '12px 16px', background: 'var(--primary-light)', borderRadius: 8, marginBottom: 20, fontSize: 13, color: 'var(--primary)', lineHeight: 1.6 }}>
                {brandName} 전용 계정 가입입니다.
              </div>

              <div className="form-group">
                <label className="form-label">가입 유형</label>
                <div className="seg" style={{ width: 'fit-content' }}>
                  <button type="button" className={`seg-btn ${registerRole === 'company' ? 'on' : ''}`} onClick={() => setRegisterRole('company')}>기업</button>
                  <button type="button" className={`seg-btn ${registerRole === 'student' ? 'on' : ''}`} onClick={() => setRegisterRole('student')}>면접자</button>
                </div>
              </div>

              {registerRole === 'student' && (
                <>
                  <div className="form-group">
                    <label className="form-label">이름</label>
                    <input className="form-input" value={regName} onChange={e => setRegName(e.target.value)} placeholder="홍길동" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">생년월일</label>
                    <input className="form-input" type="date" value={regBirth} onChange={e => setRegBirth(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">전화번호</label>
                    <input className="form-input" value={regPhone} onChange={e => setRegPhone(e.target.value)} placeholder="010-0000-0000" required />
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="form-label">이메일</label>
                <input className="form-input" type="email" value={email}
                  onChange={e => setEmail(e.target.value)} placeholder="이메일 입력" required />
              </div>
              <div className="form-group">
                <label className="form-label">비밀번호</label>
                <PasswordInput
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  showPassword={showPassword}
                  onToggle={() => setShowPassword(v => !v)}
                  placeholder="8자 이상"
                  minLength={8}
                />
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

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">M</div>
          <h1>면접 관리 시스템</h1>
          <p>통합 비즈니스 관리자 플랫폼</p>
        </div>

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

        <div style={{ padding: '14px 16px', background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 10, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-600)', marginBottom: 8 }}>브랜드 접속 링크</div>
          {Object.entries(BRAND_LINKS).map(([brand, link]) => (
            <div key={`brand-${brand}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--gray-700)', fontWeight: 600 }}>
                {brand === 'SNIPERFACTORY' ? '스나이퍼팩토리' : '인사이드아웃'}
              </span>
              <a href={link} target="_blank" rel="noreferrer"
                style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', padding: '3px 10px', background: 'var(--primary-light)', borderRadius: 6, border: '1px solid var(--primary-border)' }}>
                접속하기
              </a>
            </div>
          ))}

          <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 8 }}>
            접속 후 브랜드 페이지에서 기업/면접자를 선택해 로그인합니다.
          </div>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">이메일</label>
            <input className="form-input" type="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="이메일 입력" required />
          </div>
          <div className="form-group">
            <label className="form-label">비밀번호</label>
            <PasswordInput
              value={password}
              onChange={e => setPassword(e.target.value)}
              showPassword={showPassword}
              onToggle={() => setShowPassword(v => !v)}
              placeholder="비밀번호 입력"
            />
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
