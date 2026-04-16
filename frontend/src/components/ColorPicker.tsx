import { useEffect, useRef, useState } from 'react'
import { HexColorPicker } from 'react-colorful'

type Props = {
  label: string
  value: string
  onChange: (color: string) => void
}

export const ColorPicker = ({ label, value, onChange }: Props) => {
  const [open, setOpen] = useState(false)
  const [hex, setHex] = useState(value)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setHex(value) }, [value])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleHexInput = (v: string) => {
    setHex(v)
    if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v)
  }

  return (
    <div className="cpick-wrap" ref={wrapRef}>
      <span className="field-label">{label}</span>
      <button
        type="button"
        className="cpick-trigger"
        onClick={() => setOpen((p) => !p)}
      >
        <span className="cpick-swatch" style={{ background: value }} />
        <span className="cpick-hex">{value}</span>
      </button>

      {open && (
        <div className="cpick-popover">
          <HexColorPicker color={value} onChange={(c) => { onChange(c); setHex(c) }} />
          <input
            className="cpick-hex-input"
            type="text"
            value={hex}
            maxLength={7}
            onChange={(e) => handleHexInput(e.target.value)}
            spellCheck={false}
          />
        </div>
      )}
    </div>
  )
}
