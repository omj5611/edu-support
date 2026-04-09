import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import CompanyOnboarding from './CompanyOnboarding'
import CompanyDashboard from './CompanyDashboard'

export default function CompanyRouter() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [checking, setChecking] = useState(true)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [companyInfo, setCompanyInfo] = useState(null) // { teamId, companyName, programId, program }

  useEffect(() => {
    if (!profile) return
    checkOnboarding()
  }, [profile])

  async function checkOnboarding() {
    const meta = profile?.metadata || {}
    if (meta.onboarding_done && meta.program_team_id && meta.company_name) {
      // 온보딩 완료 — program 정보 로드
      try {
        const { data: prog } = await supabase
          .from('programs')
          .select('*')
          .eq('id', meta.program_id)
          .single()
        setCompanyInfo({ teamId: meta.program_team_id, companyName: meta.company_name, programId: meta.program_id, program: prog })
      } catch (e) { console.error(e) }
    } else {
      setNeedsOnboarding(true)
    }
    setChecking(false)
  }

  function handleOnboardingComplete(info) {
    setCompanyInfo(info)
    setNeedsOnboarding(false)
  }

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)', fontSize: 14 }}>
        불러오는 중...
      </div>
    )
  }

  return (
    <>
      {needsOnboarding && (
        <CompanyOnboarding onComplete={handleOnboardingComplete} />
      )}

      {!needsOnboarding && companyInfo && (
        <Routes>
          <Route path="/*" element={<CompanyDashboard companyInfo={companyInfo} />} />
        </Routes>
      )}

      {!needsOnboarding && !companyInfo && (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--gray-500)' }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>기업 정보를 불러올 수 없습니다.</div>
          <div style={{ fontSize: 13 }}>운영진에게 문의해주세요.</div>
        </div>
      )}
    </>
  )
}