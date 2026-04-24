import { useNavigate } from 'react-router-dom'
import MeetRecord from '../company/MeetRecord'

export default function MeetRecordPage() {
  const navigate = useNavigate()
  return (
    <MeetRecord onClose={() => navigate('/student', { replace: true })} />
  )
}
