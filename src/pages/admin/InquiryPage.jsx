import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

export default function InquiryPage() {
  const { brand, user } = useAuth()
  const [view, setView] = useState('list')
  const [inquiries, setInquiries] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState('')
  const [readFilter, setReadFilter] = useState('all')
  const [toast, setToast] = useState('')

  useEffect(() => { loadInquiries() }, [])

  async function loadInquiries() {
    try {
      // inquiries 테이블이 없으면 빈 배열 반환
      const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error) setInquiries(data || [])
    } catch { setInquiries([]) }
    finally { setLoading(false) }
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function handleReply() {
    if (!replyText.trim()) return
    try {
      const comments = selected.comments || []
      const newComment = {
        id: Date.now(), authorId: user?.id, authorName: '운영진',
        role: 'admin', text: replyText,
        date: new Date().toLocaleString('ko-KR')
      }
      const updated = [...comments, newComment]
      await supabase.from('inquiries').update({ comments: updated }).eq('id', selected.id)
      setSelected(s => ({ ...s, comments: updated }))
      setReplyText('')
      showToast('답변이 등록되었습니다.')
      await loadInquiries()
    } catch (err) { showToast('실패: ' + err.message) }
  }

  async function changeStatus(id, status) {
    try {
      await supabase.from('inquiries').update({ status }).eq('id', id)
      if (selected?.id === id) setSelected(s => ({ ...s, status }))
      await loadInquiries()
      showToast('상태가 변경되었습니다.')
    } catch (err) { showToast('실패: ' + err.message) }
  }

  const displayed = inquiries.filter(i => {
    if (readFilter === 'unread') return !i.is_read
    if (readFilter === 'read') return i.is_read
    return true
  })

  if (view === 'detail' && selected) return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="page-header">
        <div><div className="page-title">문의 상세</div></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setView('list')}>목록으로</button>
          <select className="form-select" style={{ width: 140, height: 36 }} value={selected.status || '진행중'}
            onChange={e => changeStatus(selected.id, e.target.value)}>
            <option value="진행중">진행중</option>
            <option value="해결완료">해결완료</option>
          </select>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <span className={`badge ${selected.status === '해결완료' ? 'b-green' : 'b-orange'}`}>{selected.status || '진행중'}</span>
            <span className="badge b-gray">{selected.role === 'company' ? '기업' : '면접자'}</span>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>{selected.title}</h2>
          <div style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>
            {selected.authorName} · {selected.created_at ? new Date(selected.created_at).toLocaleDateString('ko-KR') : '-'}
          </div>
          <div style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--gray-800)', whiteSpace: 'pre-wrap' }}>{selected.content}</div>
        </div>
      </div>

      {/* 댓글 목록 */}
      {(selected.comments || []).map(c => (
        <div key={c.id} className="card" style={{ marginBottom: 12 }}>
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, color: 'var(--gray-500)' }}>
              <span style={{ fontWeight: 700, color: c.role === 'admin' ? 'var(--primary)' : 'var(--gray-800)' }}>
                {c.authorName} {c.role === 'admin' && '(운영진)'}
              </span>
              <span>{c.date}</span>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{c.text}</div>
          </div>
        </div>
      ))}

      {/* 답변 입력 */}
      <div className="card">
        <div className="card-body">
          <div className="form-group">
            <label className="form-label">답변 작성</label>
            <textarea className="form-input" style={{ height: 120, resize: 'vertical', padding: 12 }}
              placeholder="답변 내용을 입력하세요..."
              value={replyText} onChange={e => setReplyText(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={handleReply} disabled={!replyText.trim()}>
            답변 등록
          </button>
        </div>
      </div>

      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--gray-900)', color: '#fff', padding: '10px 20px', borderRadius: 999, fontSize: 14, fontWeight: 500, zIndex: 9999 }}>✓ {toast}</div>}
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">문의 및 지원</div><div className="page-subtitle">기업 및 면접자 문의 관리</div></div>
      </div>

      <div className="seg" style={{ marginBottom: 24 }}>
        {[['all', '전체'], ['unread', '안읽음'], ['read', '읽음']].map(([val, label]) => (
          <button key={val} className={`seg-btn ${readFilter === val ? 'on' : ''}`} onClick={() => setReadFilter(val)}>{label}</button>
        ))}
      </div>

      <div className="card">
        {loading ? <div className="empty"><div className="empty-title">불러오는 중...</div></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th style={{ width: 80 }}>상태</th>
                <th>제목</th>
                <th style={{ width: 120 }}>문의자</th>
                <th style={{ width: 100 }}>구분</th>
                <th style={{ width: 120 }}>등록일</th>
              </tr></thead>
              <tbody>
                {displayed.length === 0 && <tr><td colSpan={5}><div className="empty"><div className="empty-title">문의 내역이 없습니다.</div></div></td></tr>}
                {displayed.map(inq => (
                  <tr key={inq.id} className="clickable" onClick={() => { setSelected(inq); setView('detail') }}>
                    <td><span className={`badge ${inq.status === '해결완료' ? 'b-green' : 'b-orange'}`}>{inq.status || '진행중'}</span></td>
                    <td>
                      <div style={{ fontWeight: inq.is_read ? 500 : 700, color: inq.is_read ? 'var(--gray-500)' : 'var(--gray-900)' }}>
                        {inq.title}
                        {(inq.comments?.length > 0) && <span style={{ marginLeft: 6, fontSize: 12, color: 'var(--gray-400)' }}>({inq.comments.length})</span>}
                      </div>
                    </td>
                    <td style={{ color: 'var(--gray-700)' }}>{inq.authorName || '-'}</td>
                    <td><span className={`badge ${inq.role === 'company' ? 'b-blue' : 'b-green'}`}>{inq.role === 'company' ? '기업' : '면접자'}</span></td>
                    <td style={{ color: 'var(--gray-500)' }}>{inq.created_at ? new Date(inq.created_at).toLocaleDateString('ko-KR') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}