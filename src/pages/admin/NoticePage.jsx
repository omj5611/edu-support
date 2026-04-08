import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useProgram } from '../../contexts/ProgramContext'
import { supabase } from '../../lib/supabase'

const TYPE_MAP = {
  'interview-all': { label: '전체', badge: 'b-purple' },
  'interview-company': { label: '기업', badge: 'b-blue' },
  'interview-students': { label: '면접자', badge: 'b-orange' },
}

const TARGET_OPTIONS = [
  { value: 'interview-all', label: '전체 대상' },
  { value: 'interview-company', label: '기업만' },
  { value: 'interview-students', label: '면접자만' },
]

const FILTER_TARGET = ['전체', '전체 대상', '기업만', '면접자만']
const FILTER_STATUS = ['전체', '공개', '숨김']
const FILTER_FIXED = ['전체', '상단 고정', '일반']

// ── 칩 필터 ───────────────────────────────────────────────
function ChipFilter({ label, options, value, onChange }) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-200)' }}>
      <div style={{ width: 110, padding: '11px 16px', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', background: 'var(--gray-50)', borderRight: '1px solid var(--gray-200)', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
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

// ── 이미지 래퍼 ───────────────────────────────────────────
function getOrCreateImgWrapper(img) {
  if (img.parentElement?.classList.contains('img-resize-wrapper')) return img.parentElement
  const wrapper = document.createElement('div')
  wrapper.className = 'img-resize-wrapper'
  wrapper.style.cssText = 'display:block; position:relative; line-height:0; margin:8px 0; width:fit-content; max-width:100%;'
  wrapper.contentEditable = 'false'
  img.style.display = 'block'
  img.parentNode.insertBefore(wrapper, img)
  wrapper.appendChild(img)
  // 이미지 뒤에 입력 가능한 빈 단락 추가
  const next = wrapper.nextSibling
  if (!next || next.classList?.contains('img-resize-wrapper')) {
    const p = document.createElement('p')
    p.innerHTML = '<br>'
    wrapper.parentNode.insertBefore(p, wrapper.nextSibling)
  }
  return wrapper
}

function removeResizeHandles(img) {
  const wrapper = img.parentElement
  if (wrapper?.classList.contains('img-resize-wrapper')) {
    wrapper.querySelectorAll('.resize-handle').forEach(h => h.remove())
  }
}

function removeDeleteBtn(img) {
  const wrapper = img.parentElement
  if (wrapper?.classList.contains('img-resize-wrapper')) {
    wrapper.querySelector('.img-delete-btn')?.remove()
  }
}

function addDeleteBtn(img) {
  const imgWrapper = getOrCreateImgWrapper(img)
  imgWrapper.querySelector('.img-delete-btn')?.remove()
  const btn = document.createElement('button')
  btn.className = 'img-delete-btn'
  btn.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1L1 9" stroke="white" stroke-width="1.8" stroke-linecap="round"/></svg>`
  btn.title = '이미지 삭제'
  btn.style.cssText = `
    position:absolute; top:-10px; right:-10px;
    width:22px; height:22px; border-radius:50%;
    background:#EF4444; border:2px solid #fff;
    cursor:pointer; display:flex; align-items:center; justify-content:center;
    z-index:200; box-shadow:0 1px 4px rgba(0,0,0,.25); padding:0;
  `
  btn.addEventListener('mousedown', e => {
    e.preventDefault(); e.stopPropagation()
    const wrapper = img.parentElement
    if (wrapper?.classList.contains('img-resize-wrapper')) {
      wrapper.remove()
    } else {
      img.remove()
    }
  })
  imgWrapper.appendChild(btn)
}

function addResizeHandles(img) {
  removeResizeHandles(img)
  const imgWrapper = getOrCreateImgWrapper(img)
  const naturalRatio = img.naturalWidth / (img.naturalHeight || 1)
  const positions = ['nw', 'ne', 'sw', 'se']
  const cursorMap = { nw: 'nw-resize', ne: 'ne-resize', sw: 'sw-resize', se: 'se-resize' }

  positions.forEach(pos => {
    const handle = document.createElement('span')
    handle.className = `resize-handle resize-${pos}`
    handle.style.cssText = `
      position:absolute; width:10px; height:10px; background:#2563EB; border:1.5px solid #fff;
      border-radius:2px; z-index:100; cursor:${cursorMap[pos]};
      ${pos.includes('n') ? 'top:-5px;' : 'bottom:-5px;'}
      ${pos.includes('w') ? 'left:-5px;' : 'right:-5px;'}
    `
    let startX, startW
    handle.addEventListener('mousedown', e => {
      e.preventDefault(); e.stopPropagation()
      startX = e.clientX; startW = img.offsetWidth
      const onMove = e => {
        const dx = e.clientX - startX
        const newW = Math.max(80, pos.includes('e') ? startW + dx : startW - dx)
        img.style.width = newW + 'px'
        img.style.height = (newW / naturalRatio) + 'px'
      }
      const onUp = () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    })
    imgWrapper.appendChild(handle)
  })
}

function attachImageHandlers(editorEl) {
  if (!editorEl) return
  editorEl.querySelectorAll('img').forEach(img => {
    if (img.dataset.handled) return
    img.dataset.handled = '1'
    img.style.cursor = 'pointer'
    img.style.maxWidth = '100%'
    img.style.display = 'block'

    img.addEventListener('click', e => {
      e.stopPropagation()
      editorEl.querySelectorAll('img.selected-img').forEach(i => {
        i.classList.remove('selected-img')
        i.style.outline = 'none'
        removeResizeHandles(i)
        removeDeleteBtn(i)
      })
      img.classList.add('selected-img')
      img.style.outline = '2px solid var(--primary)'
      addResizeHandles(img)
      addDeleteBtn(img)
    })
  })

  editorEl.addEventListener('click', e => {
    const t = e.target
    if (t.tagName !== 'IMG' && !t.classList.contains('img-delete-btn') && !t.classList.contains('resize-handle')) {
      editorEl.querySelectorAll('img.selected-img').forEach(i => {
        i.classList.remove('selected-img')
        i.style.outline = 'none'
        removeResizeHandles(i)
        removeDeleteBtn(i)
      })
    }
  }, true)
}

// ── 링크 자동 인식 ─────────────────────────────────────────
function processLinks(editorEl) {
  if (!editorEl) return
  const walker = document.createTreeWalker(editorEl, NodeFilter.SHOW_TEXT)
  const urlRegex = /(https?:\/\/[^\s<>"']+)/g
  const nodes = []
  let node
  while (node = walker.nextNode()) {
    if (node.parentElement.tagName === 'A') continue
    if (urlRegex.test(node.textContent)) nodes.push(node)
  }
  nodes.forEach(textNode => {
    const frag = document.createDocumentFragment()
    const parts = textNode.textContent.split(/(https?:\/\/[^\s<>"']+)/g)
    parts.forEach(part => {
      if (/^https?:\/\//.test(part)) {
        const a = document.createElement('a')
        a.href = part; a.target = '_blank'; a.rel = 'noopener noreferrer'
        a.style.cssText = 'color:var(--primary);text-decoration:underline;cursor:pointer;'
        a.textContent = part; a.contentEditable = 'false'
        frag.appendChild(a)
      } else {
        frag.appendChild(document.createTextNode(part))
      }
    })
    textNode.parentNode.replaceChild(frag, textNode)
  })
}

// ── 에디터 SVG 아이콘 ─────────────────────────────────────
const Icons = {
  Bold: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /></svg>,
  Italic: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" /></svg>,
  Underline: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" /><line x1="4" y1="21" x2="20" y2="21" /></svg>,
  Strikethrough: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="4" y1="12" x2="20" y2="12" /><path d="M17.5 6.5C17 5 15.5 4 13 4c-3 0-5 1.5-5 4 0 1.2.5 2.2 1.5 3" /><path d="M6.5 17.5C7 19 8.5 20 11 20c3.5 0 5.5-1.5 5.5-4 0-1.2-.5-2.2-1.5-3" /></svg>,
  AlignLeft: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" /></svg>,
  AlignCenter: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></svg>,
  AlignRight: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="9" y1="12" x2="21" y2="12" /><line x1="6" y1="18" x2="21" y2="18" /></svg>,
  BulletList: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" /><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" /><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" /></svg>,
  NumberedList: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" /><path d="M4 6h1V3l-2 1" strokeWidth="1.5" /><path d="M3 14h2v1H3v1h3" strokeWidth="1.5" /><path d="M4 20l2-2c0-1.5-2-1.5-2 0v1" strokeWidth="1.5" /></svg>,
  Image: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>,
}

// ── 에디터 컴포넌트 ───────────────────────────────────────
function RichEditor({ editorRef, initialContent }) {
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current && editorRef.current) {
      initialized.current = true
      if (initialContent) {
        editorRef.current.innerHTML = initialContent
      }
      // 수정 시 기존 이미지에 핸들러 재등록
      setTimeout(() => attachImageHandlers(editorRef.current), 100)
    }
  }, [])

  // initialContent 변경 시 (수정 모드 전환) 재초기화
  useEffect(() => {
    if (editorRef.current && initialContent) {
      editorRef.current.innerHTML = initialContent
      initialized.current = true
      setTimeout(() => attachImageHandlers(editorRef.current), 100)
    }
  }, [initialContent])

  function exec(cmd, value = null) {
    editorRef.current?.focus()
    document.execCommand(cmd, false, value)
  }

  function handleInput() {
    attachImageHandlers(editorRef.current)
  }

  function handlePaste() {
    setTimeout(() => {
      processLinks(editorRef.current)
      attachImageHandlers(editorRef.current)
    }, 100)
  }

  function handleKeyDown(e) {
    const editor = editorRef.current
    if (!editor) return

    if (e.key === ' ') {
      const sel = window.getSelection()
      if (!sel.rangeCount) return
      const range = sel.getRangeAt(0)
      const node = range.startContainer

      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent

        // '-' + 스페이스 → 불릿 목록
        if (text === '-') {
          e.preventDefault()
          node.textContent = ''
          exec('insertUnorderedList')
          return
        }

        // '1.' + 스페이스 → 번호 목록
        if (/^\d+\.$/.test(text)) {
          e.preventDefault()
          node.textContent = ''
          exec('insertOrderedList')
          return
        }
      }
    }
  }

  function handleKeyUp(e) {
    if (e.key === ' ' || e.key === 'Enter') {
      setTimeout(() => processLinks(editorRef.current), 50)
    }
  }

  async function handleImageUpload(file) {
    const path = `notices/${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('notice').upload(path, file)
    let src
    if (error) {
      // base64 fallback
      src = await new Promise(res => {
        const reader = new FileReader()
        reader.onload = e => res(e.target.result)
        reader.readAsDataURL(file)
      })
    } else {
      const { data: urlData } = supabase.storage.from('notice').getPublicUrl(path)
      src = urlData.publicUrl
    }
    exec('insertImage', src)
    setTimeout(() => attachImageHandlers(editorRef.current), 150)
  }

  const btnStyle = {
    width: 30, height: 30, borderRadius: 6, border: 'none', background: 'transparent',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--gray-600)', flexShrink: 0, transition: 'background .15s',
  }
  const Btn = ({ icon: Icon, action, title }) => (
    <button title={title} style={btnStyle}
      onMouseDown={e => { e.preventDefault(); action() }}
      onMouseOver={e => e.currentTarget.style.background = 'var(--gray-200)'}
      onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
      <Icon />
    </button>
  )
  const Sep = () => <div style={{ width: 1, height: 16, background: 'var(--gray-200)', margin: '0 3px', flexShrink: 0 }} />

  return (
    <div style={{ border: '1px solid var(--gray-300)', borderRadius: 8, overflow: 'hidden' }}>
      <style>{`
        .notice-editor ul, .notice-editor ol { padding-left: 20px !important; margin: 4px 0 !important; }
        .notice-editor ul { list-style-type: disc !important; }
        .notice-editor ol { list-style-type: decimal !important; }
        .notice-editor li { padding-left: 0 !important; margin: 2px 0; }
        .notice-editor a { color: var(--primary); text-decoration: underline; cursor: pointer; }
        .notice-editor img { display: block; max-width: 100%; cursor: pointer; }
        .notice-editor .img-resize-wrapper { display: block !important; position: relative; line-height: 0; margin: 8px 0; width: fit-content; max-width: 100%; }
        .notice-editor .img-delete-btn { position: absolute; top: -10px; right: -10px; }
        .notice-editor .resize-handle:hover { background: #1D4ED8 !important; }
        .notice-editor blockquote { border-left: 3px solid var(--gray-300); margin: 8px 0; padding: 4px 12px; color: var(--gray-600); }
        .notice-editor h2 { font-size: 20px; font-weight: 700; margin: 8px 0; }
        .notice-editor h3 { font-size: 16px; font-weight: 700; margin: 6px 0; }
        .notice-editor p { margin: 4px 0; min-height: 1.4em; }
      `}</style>

      {/* 툴바 */}
      <div style={{ background: 'var(--gray-50)', padding: '5px 10px', borderBottom: '1px solid var(--gray-200)', display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Btn icon={Icons.Bold} action={() => exec('bold')} title="굵게" />
        <Btn icon={Icons.Italic} action={() => exec('italic')} title="기울임" />
        <Btn icon={Icons.Underline} action={() => exec('underline')} title="밑줄" />
        <Btn icon={Icons.Strikethrough} action={() => exec('strikeThrough')} title="취소선" />
        <Sep />
        <Btn icon={Icons.AlignLeft} action={() => exec('justifyLeft')} title="왼쪽 정렬" />
        <Btn icon={Icons.AlignCenter} action={() => exec('justifyCenter')} title="가운데 정렬" />
        <Btn icon={Icons.AlignRight} action={() => exec('justifyRight')} title="오른쪽 정렬" />
        <Sep />
        <Btn icon={Icons.BulletList} action={() => exec('insertUnorderedList')} title="불릿 목록" />
        <Btn icon={Icons.NumberedList} action={() => exec('insertOrderedList')} title="번호 목록" />
        <Sep />
        <label title="이미지 삽입" style={{ ...btnStyle, cursor: 'pointer' }}
          onMouseOver={e => e.currentTarget.style.background = 'var(--gray-200)'}
          onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
          <Icons.Image />
          <input type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files[0]; if (f) handleImageUpload(f); e.target.value = '' }} />
        </label>
      </div>

      {/* 에디터 본문 */}
      <div
        ref={editorRef}
        className="notice-editor"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        style={{ minHeight: 300, padding: '14px 16px', fontSize: 14, lineHeight: 1.7, outline: 'none', color: 'var(--gray-900)' }}
      />
    </div>
  )
}

// ── 공지 작성/수정 폼 ─────────────────────────────────────
function NoticeForm({ initial, onSave, onCancel, authorName, brand }) {
  const editorRef = useRef(null)
  const [title, setTitle] = useState(initial?.title || '')
  const [type, setType] = useState(initial?.type || 'interview-all')
  const [isHidden, setIsHidden] = useState(initial?.is_hidden ?? false)
  const [isFixed, setIsFixed] = useState(initial?.is_fixed ?? false)
  const [attachments, setAttachments] = useState([])
  const [saving, setSaving] = useState(false)
  const isEditMode = !!initial?.id   // ← 수정 모드 여부

  const toggleStyle = active => ({
    padding: '4px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
    border: `1px solid ${active ? 'var(--primary)' : 'var(--gray-200)'}`,
    background: active ? 'var(--primary-light)' : '#fff',
    color: active ? 'var(--primary)' : 'var(--gray-600)',
    cursor: 'pointer', transition: 'all .15s',
  })

  async function handleSave() {
    const content = editorRef.current?.innerHTML || ''
    if (!title.trim()) { alert('제목을 입력해주세요.'); return }
    if (!brand) { alert('교육과정 정보를 찾을 수 없습니다. 교육과정을 선택한 후 다시 시도해주세요.'); return }
    setSaving(true)
    try {
      const existFiles = initial?.files || []
      const newFileUrls = []
      for (const file of attachments) {
        const path = `notices/${Date.now()}_${file.name}`
        const { error } = await supabase.storage.from('notice').upload(path, file)
        if (!error) {
          const { data: urlData } = supabase.storage.from('notice').getPublicUrl(path)
          newFileUrls.push({ name: file.name, url: urlData.publicUrl, size: file.size })
        }
      }
      const payload = {
        title: title.trim(), content, type,
        is_hidden: isHidden, is_fixed: isFixed,
        author_name: authorName || '운영진',
        brand,
        files: [...existFiles, ...newFileUrls],
        updated_at: new Date().toISOString(),
      }
      if (initial?.id) {
        const { error } = await supabase.from('notices').update(payload).eq('id', initial.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('notices').insert({ ...payload, view_count: 0 })
        if (error) throw error
      }
      onSave()
    } catch (err) {
      alert('저장 실패: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="page-header">
        <div><div className="page-title">공지사항 {initial?.id ? '수정' : '작성'}</div></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => {
            const msg = isEditMode
              ? '수정한 내용이 사라집니다.\n취소하시겠습니까?'
              : '작성한 내용이 사라집니다.\n취소하시겠습니까?'
            if (window.confirm(msg)) onCancel()
          }}>취소</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : initial?.id ? '수정 완료' : '게시하기'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {/* 설정 행 */}
          <div style={{ display: 'flex', gap: 32, marginBottom: 24, flexWrap: 'wrap', alignItems: 'flex-start', padding: 16, background: 'var(--gray-50)', borderRadius: 8 }}>
            <div>
              <div className="form-label" style={{ marginBottom: 8 }}>공지 대상</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {TARGET_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setType(opt.value)} style={toggleStyle(type === opt.value)}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="form-label" style={{ marginBottom: 8 }}>공개 상태</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setIsHidden(false)} style={toggleStyle(!isHidden)}>공개</button>
                <button onClick={() => setIsHidden(true)} style={toggleStyle(isHidden)}>숨김</button>
              </div>
            </div>
            <div>
              <div className="form-label" style={{ marginBottom: 8 }}>상단 고정</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: isFixed ? 'var(--primary)' : 'var(--gray-700)' }}>
                <input type="checkbox" checked={isFixed} onChange={e => setIsFixed(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer' }} />
                상단에 고정
              </label>
            </div>
          </div>

          {/* 제목 */}
          <div className="form-group">
            <label className="form-label">공지 제목 *</label>
            <input className="form-input" placeholder="공지 제목을 입력하세요"
              value={title} onChange={e => setTitle(e.target.value)}
              style={{ fontSize: 16, fontWeight: 600, height: 48 }} />
          </div>

          {/* 에디터 */}
          <div className="form-group">
            <label className="form-label">
              공지 내용
              <span style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 400, marginLeft: 6 }}>
                — 입력 후 스페이스 시 자동 불릿 · URL 입력 시 자동 링크 변환
              </span>
            </label>
            <RichEditor editorRef={editorRef} initialContent={initial?.content || ''} />
          </div>

          {/* 첨부파일 */}
          <div className="form-group">
            <label className="form-label">첨부파일</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1px dashed var(--gray-300)', borderRadius: 8, cursor: 'pointer', background: 'var(--gray-50)', fontSize: 13, color: 'var(--gray-500)' }}>
              📎 파일 선택 (여러 파일 가능)
              <input type="file" multiple style={{ display: 'none' }}
                onChange={e => setAttachments(prev => [...prev, ...Array.from(e.target.files)])} />
            </label>
            {attachments.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {attachments.map((f, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--gray-100)', borderRadius: 6, fontSize: 13 }}>
                    <span>📄 {f.name} <span style={{ color: 'var(--gray-400)' }}>({(f.size / 1024).toFixed(0)}KB)</span></span>
                    <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 16, lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
            )}
            {initial?.files?.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 4 }}>기존 첨부파일</div>
                {initial.files.map((f, i) => (
                  <a key={i} href={f.url} target="_blank" rel="noreferrer"
                    style={{ display: 'inline-block', fontSize: 13, color: 'var(--primary)', marginBottom: 4, marginRight: 12 }}>
                    📄 {f.name}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* 작성자 */}
          <div style={{ padding: '10px 14px', background: 'var(--gray-50)', borderRadius: 8, fontSize: 13, color: 'var(--gray-500)' }}>
            ✏️ 작성자: <strong style={{ color: 'var(--gray-700)' }}>{authorName || '운영진'}</strong>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 공지 상세 뷰 ─────────────────────────────────────────
function NoticeDetail({ notice, onBack, onEdit, onDelete }) {
  const info = TYPE_MAP[notice.type] || { label: '전체', badge: 'b-purple' }

  async function downloadFile(f) {
    try {
      const res = await fetch(f.url)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl; a.download = f.name
      document.body.appendChild(a); a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(f.url, '_blank')
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="page-header">
        <div><div className="page-title">공지사항 상세</div></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={onBack}>목록으로</button>
          <button className="btn btn-secondary" onClick={onEdit}>수정</button>
          <button className="btn btn-danger" onClick={() => onDelete(notice.id)}>삭제</button>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {notice.is_fixed && <span className="badge b-blue">★ 상단 고정</span>}
            <span className={`badge ${info.badge}`}>{info.label}</span>
            <span className={`badge ${notice.is_hidden ? 'b-gray' : 'b-green'}`}>
              {notice.is_hidden ? '숨김' : '공개'}
            </span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, lineHeight: 1.4 }}>{notice.title}</h2>
          <div style={{ display: 'flex', gap: 16, paddingBottom: 20, borderBottom: '1px solid var(--gray-200)', marginBottom: 24, fontSize: 13, color: 'var(--gray-500)' }}>
            <span>작성자: {notice.author_name || '-'}</span>
            <span>|</span>
            <span>등록일: {notice.created_at ? new Date(notice.created_at).toLocaleDateString('ko-KR') : '-'}</span>
            <span>|</span>
            <span>조회수: {(notice.view_count || 0).toLocaleString()}</span>
          </div>
          <style>{`
            .notice-view ul, .notice-view ol { padding-left: 20px !important; margin: 4px 0; }
            .notice-view ul { list-style-type: disc !important; }
            .notice-view ol { list-style-type: decimal !important; }
            .notice-view a { color: var(--primary); text-decoration: underline; }
            .notice-view img { max-width: 100%; border-radius: 4px; display: block; margin: 8px 0; }
            .notice-view .img-resize-wrapper { display: block; }
            .notice-view .resize-handle, .notice-view .img-delete-btn { display: none !important; }
            .notice-view blockquote { border-left: 3px solid var(--gray-300); margin: 8px 0; padding: 4px 12px; color: var(--gray-600); }
            .notice-view h2 { font-size: 20px; font-weight: 700; margin: 8px 0; }
            .notice-view h3 { font-size: 16px; font-weight: 700; margin: 6px 0; }
          `}</style>
          <div className="notice-view" style={{ fontSize: 15, lineHeight: 1.8, minHeight: 120 }}
            dangerouslySetInnerHTML={{ __html: notice.content }} />

          {/* 첨부파일 다운로드 */}
          {notice.files?.length > 0 && (
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--gray-200)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>
                첨부파일 ({notice.files.length}개)
              </div>
              {notice.files.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--gray-50)', borderRadius: 6, border: '1px solid var(--gray-200)', marginBottom: 6 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--gray-800)' }}>
                    📄 {f.name}
                    {f.size && <span style={{ color: 'var(--gray-400)', fontSize: 12 }}>({(f.size / 1024).toFixed(0)}KB)</span>}
                  </span>
                  <button onClick={() => downloadFile(f)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 6, border: '1px solid var(--primary-border)', background: 'var(--primary-light)', color: 'var(--primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    onMouseOver={e => e.currentTarget.style.background = '#DBEAFE'}
                    onMouseOut={e => e.currentTarget.style.background = 'var(--primary-light)'}>
                    ↓ 다운로드
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 메인 NoticePage ───────────────────────────────────────
export default function NoticePage() {
  const { profile } = useAuth()
  const { selectedProgram } = useProgram()
  const [view, setView] = useState('list')
  const [notices, setNotices] = useState([])
  const [selected, setSelected] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTarget, setFilterTarget] = useState('전체')
  const [filterStatus, setFilterStatus] = useState('전체')
  const [filterFixed, setFilterFixed] = useState('전체')
  const [toast, setToast] = useState('')

  useEffect(() => { loadNotices() }, [selectedProgram])

  async function loadNotices() {
    setLoading(true)
    try {
      let query = supabase
        .from('notices')
        .select('*')
        .in('type', ['interview-all', 'interview-company', 'interview-students'])
        .eq('is_archived', false)
        .order('is_fixed', { ascending: false })
        .order('created_at', { ascending: false })
      if (selectedProgram?.brand) query = query.eq('brand', selectedProgram.brand)
      const { data, error } = await query
      if (error) throw error
      setNotices(data || [])
    } catch (err) {
      console.error('notices 로드 실패:', err)
      setNotices([])
    } finally {
      setLoading(false)
    }
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function handleDelete(id) {
    if (!confirm('공지사항을 삭제하시겠습니까?')) return
    try {
      const { error } = await supabase.from('notices').update({ is_archived: true }).eq('id', id)
      if (error) throw error
      showToast('삭제되었습니다.')
      await loadNotices()
      setView('list')
    } catch (err) {
      showToast('삭제 실패: ' + err.message)
    }
  }

  async function openDetail(notice) {
    const storageKey = `notice_viewed_${notice.id}`
    const alreadyViewed = localStorage.getItem(storageKey)
    let viewCount = notice.view_count || 0
    if (!alreadyViewed) {
      viewCount += 1
      await supabase.from('notices').update({ view_count: viewCount }).eq('id', notice.id)
      localStorage.setItem(storageKey, '1')
    }
    setSelected({ ...notice, view_count: viewCount })
    setView('detail')
    loadNotices()
  }

  // 필터 적용
  let displayed = [...notices]
  if (search) displayed = displayed.filter(n => n.title.includes(search) || (n.content || '').includes(search))
  if (filterTarget !== '전체') {
    const typeVal = TARGET_OPTIONS.find(o => o.label === filterTarget)?.value
    if (typeVal) displayed = displayed.filter(n => n.type === typeVal)
  }
  if (filterStatus !== '전체') displayed = displayed.filter(n => filterStatus === '공개' ? !n.is_hidden : n.is_hidden)
  if (filterFixed !== '전체') displayed = displayed.filter(n => filterFixed === '상단 고정' ? n.is_fixed : !n.is_fixed)

  if (view === 'write') return (
    <NoticeForm
      initial={editTarget || null}
      authorName={profile?.name || '운영진'}
      brand={selectedProgram?.brand || null}
      onSave={async () => {
        showToast(editTarget ? '수정되었습니다.' : '게시되었습니다.')
        await loadNotices()
        setView('list')
        setEditTarget(null)
      }}
      onCancel={() => { setView(editTarget ? 'detail' : 'list'); setEditTarget(null) }}
    />
  )

  if (view === 'detail' && selected) return (
    <NoticeDetail
      notice={selected}
      onBack={() => setView('list')}
      onEdit={() => { setEditTarget(selected); setView('write') }}
      onDelete={handleDelete}
    />
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">공지사항</div>
          <div className="page-subtitle">기업 및 면접자에게 공지할 내용을 관리합니다.</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditTarget(null); setView('write') }}>
          + 공지 등록
        </button>
      </div>

      {/* 필터 */}
      <div className="card" style={{ marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--gray-200)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 40, padding: '0 12px', border: '1px solid var(--gray-200)', borderRadius: 8, background: 'var(--gray-50)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 14, color: 'var(--gray-700)' }}
              placeholder="제목 또는 내용 검색" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <ChipFilter label="공지 대상" options={FILTER_TARGET} value={filterTarget} onChange={setFilterTarget} />
        <ChipFilter label="공개 상태" options={FILTER_STATUS} value={filterStatus} onChange={setFilterStatus} />
        <ChipFilter label="고정 여부" options={FILTER_FIXED} value={filterFixed} onChange={setFilterFixed} />
      </div>

      {/* 목록 */}
      <div className="card">
        {loading ? (
          <div className="empty"><div className="empty-title">불러오는 중...</div></div>
        ) : displayed.length === 0 ? (
          <div className="empty">
            <div style={{ fontSize: 36, opacity: .4, marginBottom: 12 }}>📢</div>
            <div className="empty-title">등록된 공지사항이 없습니다.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 56, textAlign: 'center' }}>NO</th>
                  <th style={{ width: 90, textAlign: 'center' }}>대상</th>
                  <th style={{ width: 70, textAlign: 'center' }}>상태</th>
                  <th>제목</th>
                  <th style={{ width: 100 }}>작성자</th>
                  <th style={{ width: 110 }}>등록일</th>
                  <th style={{ width: 70, textAlign: 'right' }}>조회</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((n, idx) => {
                  const info = TYPE_MAP[n.type] || { label: '전체', badge: 'b-purple' }
                  return (
                    <tr key={n.id} className="clickable"
                      style={{ background: n.is_fixed ? 'var(--primary-light)' : '' }}
                      onClick={() => openDetail(n)}>
                      <td style={{ textAlign: 'center', color: 'var(--gray-500)', fontWeight: 600 }}>
                        {n.is_fixed ? <span style={{ color: 'var(--primary)', fontSize: 16 }}>★</span> : displayed.length - idx}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${info.badge}`}>{info.label}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${n.is_hidden ? 'b-gray' : 'b-green'}`}>
                          {n.is_hidden ? '숨김' : '공개'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                          {n.is_fixed && <span className="badge b-blue" style={{ fontSize: 11 }}>필독</span>}
                          {n.files?.length > 0 && <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>📎</span>}
                          {n.title}
                        </div>
                      </td>
                      <td style={{ color: 'var(--gray-600)', fontSize: 13 }}>{n.author_name || '-'}</td>
                      <td style={{ color: 'var(--gray-500)', fontSize: 13 }}>
                        {n.created_at ? new Date(n.created_at).toLocaleDateString('ko-KR') : '-'}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--gray-500)', fontSize: 13 }}>
                        {(n.view_count || 0).toLocaleString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--gray-900)', color: '#fff', padding: '10px 20px', borderRadius: 999, fontSize: 14, fontWeight: 500, zIndex: 9999 }}>
          ✓ {toast}
        </div>
      )}
    </div>
  )
}