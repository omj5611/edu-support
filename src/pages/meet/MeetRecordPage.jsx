import { useNavigate } from 'react-router-dom'
import MeetRecord from '../company/MeetRecord'

export default function MeetRecordPage() {
  const navigate = useNavigate()
  const programId = new URLSearchParams(window.location.search).get('program') || ''
  return (
    <MeetRecord onClose={() => navigate(programId ? `/student?program=${encodeURIComponent(programId)}` : '/student', { replace: true })} />
  )
}
