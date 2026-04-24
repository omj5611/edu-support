import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useProgram } from '../../contexts/ProgramContext'
import { supabase } from '../../lib/supabase'
import VideoInterviewRoom from '../company/VideoInterviewRoomNew'

function normalizeCompanyName(v) {
  return String(v || '').trim().toLowerCase()
}

export default function VideoDashboardPage() {
  const { progId } = useParams()
  const navigate = useNavigate()
  const { selectedProgram } = useProgram()

  const [loading, setLoading] = useState(true)
  const [onlineCompanies, setOnlineCompanies] = useState([])
  const [selectedCompany, setSelectedCompany] = useState('')
  const [openRoom, setOpenRoom] = useState(false)

  useEffect(() => {
    if (!progId) return
    loadOnlineCompanies()
  }, [progId])

  async function loadOnlineCompanies() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('interview_settings')
        .select('company_name, interview_mode, status')
        .eq('program_id', progId)
        .eq('interview_mode', 'online')
      if (error) throw error

      const names = []
      ;(data || []).forEach((row) => {
        const name = String(row?.company_name || '').trim()
        if (!name) return
        names.push(name)
      })
      const unique = []
      const seen = new Set()
      names.forEach((name) => {
        const key = normalizeCompanyName(name)
        if (!key || seen.has(key)) return
        seen.add(key)
        unique.push(name)
      })
      setOnlineCompanies(unique)
    } catch (e) {
      console.error('video dashboard company load failed:', e)
      setOnlineCompanies([])
    } finally {
      setLoading(false)
    }
  }

  const selectedCompanyInfo = useMemo(() => {
    const target = String(selectedCompany || '').trim()
    if (!target) return ''
    const found = onlineCompanies.find((name) => normalizeCompanyName(name) === normalizeCompanyName(target))
    return found || ''
  }, [onlineCompanies, selectedCompany])

  function onSelectCompany(e) {
    const next = String(e.target.value || '').trim()
    setSelectedCompany(next)
    setOpenRoom(false)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">화상 대시보드</div>
          <div className="page-subtitle">비대면으로 진행하는 기업의 화상 면접실로 바로 이동할 수 있습니다.</div>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate(`/admin/${progId}/management`)}>
          면접 관리로 이동
        </button>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-700)' }}>기업 선택</span>
          <select
            className="form-select"
            value={selectedCompanyInfo}
            onChange={onSelectCompany}
            style={{ width: 320, maxWidth: '100%' }}
            disabled={loading || onlineCompanies.length === 0}
          >
            {onlineCompanies.length === 0 ? (
              <option value="">{loading ? '불러오는 중...' : '비대면 기업 없음'}</option>
            ) : (
              onlineCompanies.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))
            )}
          </select>
          <button
            className="btn btn-primary"
            disabled={!selectedCompanyInfo}
            onClick={() => setOpenRoom(true)}
          >
            화상 대시보드 열기
          </button>
        </div>
      </div>

      {!loading && onlineCompanies.length === 0 && (
        <div className="card">
          <div className="empty">
            <div className="empty-title">비대면(화상)으로 설정된 기업이 없습니다.</div>
            <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 6 }}>
              기업의 면접 방식이 비대면으로 제출되면 여기서 바로 접근할 수 있습니다.
            </div>
          </div>
        </div>
      )}

      {selectedCompanyInfo && openRoom && (
        <VideoInterviewRoom
          companyInfo={{
            programId: progId,
            companyName: selectedCompanyInfo,
            program: selectedProgram || null,
          }}
          onClose={() => setOpenRoom(false)}
        />
      )}
    </div>
  )
}
