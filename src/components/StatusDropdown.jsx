import { useEffect, useMemo, useRef, useState } from 'react'

export default function StatusDropdown({
  value,
  options,
  onChange,
  disabled = false,
  placeholder = '-',
  fullWidth = false,
  size = 'md', // 'sm' | 'md'
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  const selected = useMemo(
    () => (options || []).find((o) => o.value === value) || null,
    [options, value],
  )

  useEffect(() => {
    if (!open) return

    const onDown = (e) => {
      const el = wrapRef.current
      if (!el) return
      if (!el.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function pick(nextValue) {
    setOpen(false)
    if (disabled) return
    if (nextValue === value) return
    onChange?.(nextValue)
  }

  const label = selected?.label ?? placeholder
  const badgeClass = selected?.badgeClass || 'b-gray'

  return (
    <div
      ref={wrapRef}
      className={`sd ${fullWidth ? 'sd-full' : ''} ${size === 'sm' ? 'sd-sm' : ''}`}
    >
      <button
        type="button"
        className="sd-btn"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open ? 'true' : 'false'}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`badge ${badgeClass}`} style={{ fontSize: size === 'sm' ? 11 : 12 }}>
          {label}
        </span>
        <span className="sd-chevron" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="sd-menu" role="menu">
          {(options || []).map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="menuitem"
              className={`sd-item ${opt.value === value ? 'on' : ''}`}
              onClick={() => pick(opt.value)}
            >
              <span className={`badge ${opt.badgeClass || 'b-gray'}`}>{opt.label}</span>
              {opt.value === value && <span className="sd-check" aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

