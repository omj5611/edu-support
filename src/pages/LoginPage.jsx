import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './LoginPage.css'

const ROLE_MAP = {
    MASTER: ['admin', 'company', 'student'],
    ADMIN: ['admin'],
    COMPANY: ['company'],
    USER: ['student'],
}

const ROLES = [
    { value: 'admin', label: '운영진', desc: '프로그램 관리', icon: '🛠️' },
    { value: 'company', label: '기업', desc: '면접 설정', icon: '🏢' },
    { value: 'student', label: '면접자', desc: '일정 예약', icon: '🎓' },
]

export default function LoginPage() {
    const navigate = useNavigate()
    const [selectedRole, setSelectedRole] = useState('admin')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            // supabase를 동적 import로 처리 (크래시 방지)
            const { supabase } = await import('../lib/supabase')

            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            })

            if (authError) throw authError

            const { data: profile, error: profileError } = await supabase
                .from('users')
                .select('role, brand')
                .eq('id', authData.user.id)
                .single()

            if (profileError || !profile) {
                await supabase.auth.signOut()
                throw new Error('사용자 정보를 찾을 수 없습니다.')
            }

            const allowedRoles = ROLE_MAP[profile.role] || []

            if (!allowedRoles.includes(selectedRole)) {
                await supabase.auth.signOut()
                setError(
                    profile.role === 'ADMIN' ? '운영진 계정은 운영진으로만 로그인할 수 있습니다.' :
                        profile.role === 'COMPANY' ? '기업 계정은 기업으로만 로그인할 수 있습니다.' :
                            profile.role === 'USER' ? '면접자 계정은 면접자로만 로그인할 수 있습니다.' :
                                '선택한 역할로 접근할 수 없습니다.'
                )
                return
            }

            navigate(`/${selectedRole}`)

        } catch (err) {
            if (err.message?.includes('Invalid login credentials')) {
                setError('이메일 또는 비밀번호가 올바르지 않습니다.')
            } else {
                setError(err.message || '로그인 중 오류가 발생했습니다.')
            }
        } finally {
            setLoading(false)
        }
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
                    <div className="role-grid">
                        {ROLES.map(r => (
                            <button key={r.value} type="button"
                                className={`role-btn ${selectedRole === r.value ? 'active' : ''}`}
                                onClick={() => { setSelectedRole(r.value); setError('') }}>
                                <span className="role-icon">{r.icon}</span>
                                <span className="role-name">{r.label}</span>
                                <span className="role-desc">{r.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label className="form-label">이메일</label>
                        <input className="form-input" type="email" value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="이메일 입력" required autoComplete="email" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">비밀번호</label>
                        <input className="form-input" type="password" value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="비밀번호 입력" required autoComplete="current-password" />
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