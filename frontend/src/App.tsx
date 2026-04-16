import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import * as QRCode from 'qrcode'
import { io, type Socket } from 'socket.io-client'
import './App.css'
import { HISTORY_UPDATED_EVENT, QR_CREATED_EVENT, REUSE_EVENT_NAME } from './constants/events'
import { type QrHistoryItem } from './types/qr'
import { useAuth } from './hooks/useAuth'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const TONE_PRESETS = ['#2ee8c7', '#00d4aa', '#00b8d9', '#7eb8b4', '#e8f5f3']

type PreviewState = {
  image: string
  mimeType: string
  qr?: QrHistoryItem
}

type ClientPreview = {
  png?: string
  svg?: string
}

type QrFormat = 'png' | 'svg'

type FormState = {
  text: string
  format: QrFormat
  size: number
  color: string
  background: string
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H'
  margin: number
}

const normalizeImage = (raw: string, mimeType: string) => {
  if (!raw) return ''
  if (raw.startsWith('data:')) return raw
  if (mimeType === 'image/svg+xml') {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(raw)}`
  }
  return raw
}

const normalizeHistoryFormat = (value?: string): QrFormat => (value === 'svg' ? 'svg' : 'png')

function App() {
  const { token } = useAuth()
  const [form, setForm] = useState<FormState>({
    text: '',
    format: 'png',
    size: 320,
    color: '#111111',
    background: '#ffffff',
    errorCorrectionLevel: 'M',
    margin: 2,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [clientPreview, setClientPreview] = useState<ClientPreview>({})
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [logo, setLogo] = useState<string | null>(null)
  const [logoName, setLogoName] = useState<string | null>(null)
  const [composedPreview, setComposedPreview] = useState<string | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const colorPickerRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      return
    }

    const socket = io(API_BASE_URL, {
      auth: { token },
      transports: ['websocket'],
    })

    socketRef.current = socket

    const handleQrCreated = (item: QrHistoryItem) => {
      const historyEvent = new CustomEvent<QrHistoryItem>(HISTORY_UPDATED_EVENT, {
        detail: item,
      })
      window.dispatchEvent(historyEvent)
    }

    socket.on(QR_CREATED_EVENT, handleQrCreated)
    socket.on('connect_error', (error) => {
      console.warn('Realtime connection error', error)
    })

    return () => {
      socket.off(QR_CREATED_EVENT, handleQrCreated)
      socket.disconnect()
      socketRef.current = null
    }
  }, [token])

  const handleInputChange =
    <K extends keyof FormState>(
      key: K,
      parser?: (value: string) => FormState[K],
    ) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const rawValue = event.target.value
      const value = parser ? parser(rawValue) : (rawValue as FormState[K])
      setForm((prev) => ({ ...prev, [key]: value }))
    }

  const handleLogoFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 512_000) {
      setFormError('Logo must be under 500 KB')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result as string
      setLogo(result)
      setLogoName(file.name)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!form.text.trim()) {
      setFormError('Enter text or URL to create a QR')
      return
    }

    const looksLikeUrl = /^https?:\/\//i.test(form.text.trim())
    if (looksLikeUrl) {
      try {
        new URL(form.text.trim())
      } catch {
        setFormError('Invalid URL format')
        return
      }
    }

    if (!token) {
      setFormError('Сессия недействительна, войдите заново')
      return
    }

    setIsSubmitting(true)
    setFormError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          size: Number(form.size),
          margin: Number(form.margin),
          ...(composedPreview ? { precomposedImage: composedPreview } : {}),
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error || 'Не удалось создать QR-код')
      }

      const nextPreview: PreviewState = {
        image: normalizeImage(payload.image, payload.mimeType),
        mimeType: payload.mimeType,
        qr: payload.qr,
      }

      setPreview(nextPreview)
      setForm((prev) => ({ ...prev, text: '' }))
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Произошла ошибка')
    } finally {
      setIsSubmitting(false)
    }
  }

  const applyHistoryItem = useCallback((item: QrHistoryItem) => {
    const mimeType = item.imageUrl.trim().startsWith('<svg')
      ? 'image/svg+xml'
      : 'image/png'

    setPreview({
      image: normalizeImage(item.imageUrl, mimeType),
      mimeType,
      qr: item,
    })

    setForm((prev) => ({
      ...prev,
      text: item.data,
      format: normalizeHistoryFormat(item.format),
      size: item.size,
      color: item.color,
      background: item.background,
      errorCorrectionLevel:
        (item.errorCorrectionLevel as 'L' | 'M' | 'Q' | 'H') ?? prev.errorCorrectionLevel,
      margin: item.margin ?? prev.margin,
    }))
  }, [])

  const handleCopyLink = async () => {
    const link = preview?.qr?.data ?? form.text.trim() ?? preview?.image ?? clientPreview.png
    if (!link) return

    try {
      await navigator.clipboard.writeText(link)
      setCopyStatus('success')
      setTimeout(() => setCopyStatus('idle'), 1500)
    } catch (error) {
      console.error(error)
      setCopyStatus('error')
      setTimeout(() => setCopyStatus('idle'), 2000)
    }
  }

  const handleShareCode = async () => {
    const shareText = preview?.qr?.data ?? form.text.trim()
    if (!shareText) return

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Minted Flow QR',
          text: shareText,
        })
        return
      }

      await navigator.clipboard.writeText(shareText)
      setCopyStatus('success')
      setTimeout(() => setCopyStatus('idle'), 1500)
    } catch (error) {
      console.error(error)
      setCopyStatus('error')
      setTimeout(() => setCopyStatus('idle'), 2000)
    }
  }

  const downloadData = (dataUrl: string, fileName: string) => {
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = fileName
    link.click()
  }

  const handleDownloadPng = () => {
    const png = clientPreview.png ?? (preview?.mimeType.includes('png') ? preview.image : null)
    if (!png) return
    downloadData(png, 'qr-code.png')
  }

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<QrHistoryItem | undefined>).detail
      if (detail) {
        applyHistoryItem(detail)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }

    window.addEventListener(REUSE_EVENT_NAME, handler as EventListener)
    return () => {
      window.removeEventListener(REUSE_EVENT_NAME, handler as EventListener)
    }
  }, [applyHistoryItem])

  useEffect(() => {
    if (!form.text.trim()) {
      setClientPreview({})
      return
    }

    let cancelled = false
    const options: QRCode.QRCodeToDataURLOptions = {
      width: form.size,
      margin: form.margin,
      errorCorrectionLevel: form.errorCorrectionLevel as QRCode.QRCodeErrorCorrectionLevel,
      color: {
        dark: form.color,
        light: form.background,
      },
    }

    const generate = async () => {
      try {
        const [png, svg] = await Promise.all([
          QRCode.toDataURL(form.text, options),
          QRCode.toString(form.text, { ...options, type: 'svg' }),
        ])

        if (!cancelled) {
          setClientPreview({ png, svg })
        }
      } catch (error) {
        console.error('Не удалось построить live preview', error)
      }
    }

    generate()

    return () => {
      cancelled = true
    }
  }, [form.text, form.size, form.margin, form.color, form.background, form.errorCorrectionLevel])

  useEffect(() => {
    if (!clientPreview.png || !logo) {
      setComposedPreview(null)
      return
    }

    let cancelled = false
    const canvas = document.createElement('canvas')
    canvas.width = form.size
    canvas.height = form.size
    const ctx = canvas.getContext('2d')!

    const qrImg = new Image()
    qrImg.onload = () => {
      ctx.drawImage(qrImg, 0, 0, form.size, form.size)
      const logoImg = new Image()
      logoImg.onload = () => {
        if (cancelled) return
        const logoSize = Math.round(form.size * 0.22)
        const pad = 6
        const bgSize = logoSize + pad * 2
        const x = (form.size - bgSize) / 2
        const y = (form.size - bgSize) / 2
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(x, y, bgSize, bgSize)
        ctx.drawImage(logoImg, x + pad, y + pad, logoSize, logoSize)
        setComposedPreview(canvas.toDataURL('image/png'))
      }
      logoImg.src = logo
    }
    qrImg.src = clientPreview.png

    return () => { cancelled = true }
  }, [clientPreview.png, logo, form.size])

  const previewImage = composedPreview ?? clientPreview.png ?? preview?.image ?? ''

  const copyLabel =
    copyStatus === 'success' ? 'Copied!' : copyStatus === 'error' ? 'Error' : 'Copy'

  const hasPreview = Boolean(previewImage)

  return (
    <div className="create-page">

      {/* ── Left: control panel ── */}
      <div className="create-left">
        <div className="create-heading">
          <p className="eyebrow">Engine Configuration</p>
          <h1>Control Panel</h1>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
          {/* Destination URL */}
          <div className="field-group">
            <p className="field-label">Destination URL</p>
            <div className="lum-input-wrap">
              <input
                className="lum-input"
                type="text"
                placeholder="https://luminescent.tech/vault/..."
                value={form.text}
                onChange={handleInputChange('text')}
              />
              <span className="lum-input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </span>
            </div>
          </div>

          {/* Synthesis Tone */}
          <div className="field-group">
            <p className="field-label">Synthesis Tone</p>
            <div className="tone-swatches">
              {TONE_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`tone-swatch${form.color === color ? ' selected' : ''}`}
                  style={{ background: color }}
                  onClick={() => setForm((prev) => ({ ...prev, color }))}
                  title={color}
                />
              ))}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="tone-swatch-add"
                  onClick={() => colorPickerRef.current?.click()}
                  title="Custom color"
                >
                  +
                </button>
                <input
                  ref={colorPickerRef}
                  type="color"
                  className="tone-color-hidden"
                  value={form.color}
                  onChange={handleInputChange('color')}
                />
              </div>
            </div>
          </div>

          {/* Synthesis Resolution */}
          <div className="field-group">
            <div className="resolution-header">
              <p className="field-label" style={{ margin: 0 }}>Synthesis Resolution</p>
              <span className="resolution-value">{form.size}px</span>
            </div>
            <input
              className="lum-slider"
              type="range"
              min={200}
              max={600}
              step={20}
              value={form.size}
              onChange={handleInputChange('size', (v) => Number(v) as FormState['size'])}
            />
            <div className="slider-labels">
              <span>Low-Fi</span>
              <span>Ultra-HD</span>
            </div>
          </div>

          {/* Advanced */}
          <div className="field-group">
            <p className="field-label">Error Correction · Format</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select
                className="lum-select"
                value={form.errorCorrectionLevel}
                onChange={handleInputChange('errorCorrectionLevel', (v) => v as FormState['errorCorrectionLevel'])}
                style={{ flex: 1 }}
              >
                <option value="L">L — 7%</option>
                <option value="M">M — 15%</option>
                <option value="Q">Q — 25%</option>
                <option value="H">H — 30%</option>
              </select>
              <select
                className="lum-select"
                value={form.format}
                onChange={handleInputChange('format', (v) => (v === 'svg' ? 'svg' : 'png'))}
                style={{ flex: 1 }}
              >
                <option value="png">PNG</option>
                <option value="svg">SVG</option>
              </select>
            </div>
          </div>

          {/* Monolith Branding */}
          <div className="field-group">
            <p className="field-label">Monolith Branding</p>
            <div
              className={`upload-area${logo ? ' has-logo' : ''}`}
              onClick={() => logoInputRef.current?.click()}
              style={{ cursor: 'pointer' }}
            >
              {logo ? (
                <>
                  <img src={logo} alt="logo preview" className="logo-thumb" />
                  <p>{logoName}</p>
                  <button
                    type="button"
                    className="logo-remove"
                    onClick={(e) => { e.stopPropagation(); setLogo(null); setLogoName(null) }}
                  >
                    Remove
                  </button>
                </>
              ) : (
                <>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                  <p>Upload SVG or PNG</p>
                  <small>Max file size 500 KB</small>
                </>
              )}
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              style={{ display: 'none' }}
              onChange={handleLogoFile}
            />
          </div>

          {formError && <p className="form-error">{formError}</p>}

          <button type="submit" className="btn-generate" disabled={isSubmitting}>
            {isSubmitting ? 'Generating…' : 'Generate & Download'}
          </button>
        </form>
      </div>

      {/* ── Right: live preview ── */}
      <div className="create-right">
        <div className="preview-card">
          <div className="preview-canvas">
            {hasPreview ? (
              <img src={previewImage} alt="QR preview" />
            ) : (
              <div className="preview-empty">
                <div className="preview-empty-grid">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <span key={i} />
                  ))}
                </div>
                <p>Synthesis engine standing by.</p>
              </div>
            )}
          </div>

          <div className="preview-bar">
            <span className="preview-bar-label">Live Synthesis Preview V2.4</span>
            <span className="preview-encrypted">Encrypted</span>
          </div>

          <div className="preview-actions-row">
            <button
              type="button"
              className="btn-action"
              onClick={handleDownloadPng}
              disabled={!hasPreview}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Inspect
            </button>
            <button
              type="button"
              className={`btn-action${copyStatus === 'success' ? ' success' : ''}`}
              onClick={handleCopyLink}
              disabled={!hasPreview}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              {copyLabel}
            </button>
            <button
              type="button"
              className="btn-action"
              onClick={handleShareCode}
              disabled={!hasPreview}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              Share
            </button>
          </div>
        </div>

        <p className="preview-hint">
          {hasPreview
            ? 'Changes are reflected in real-time.'
            : 'Synthesis engine standing by. Changes are reflected in real-time.'}
        </p>
      </div>
    </div>
  )
}

export default App
