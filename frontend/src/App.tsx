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
import { type QrHistoryItem, type QrFormFields, type ErrorCorrectionLabels, type QrFormErrors } from './types/qr'
import { validateQrForm, isFormValid } from './utils/validateQrForm'
import { useAuth } from './hooks/useAuth'
import { QrPreviewStage, STAGE_SIZE, type QrPreviewStageHandle } from './components/QrPreviewStage'
import { ColorPicker } from './components/ColorPicker'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const QR_VIEWED_EVENT = 'qr:viewed'

type PreviewState = {
  image: string
  mimeType: string
  qr?: QrHistoryItem
}

type ClientPreview = {
  png?: string
  svg?: string
}

const ERROR_CORRECTION_LABELS: ErrorCorrectionLabels = {
  L: 'L — 7%',
  M: 'M — 15%',
  Q: 'Q — 25%',
  H: 'H — 30%',
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
  const [formErrors, setFormErrors] = useState<QrFormErrors>({})
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [clientPreview, setClientPreview] = useState<ClientPreview>({})
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [logo, setLogo] = useState<string | null>(null)
  const [logoName, setLogoName] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [viewNotif, setViewNotif] = useState<string | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const stageRef = useRef<QrPreviewStageHandle>(null)
  const submitAbortRef = useRef<AbortController | null>(null)

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

    const handleQrViewed = (data: { qrId: string; viewCount: number }) => {
      setViewNotif(`QR viewed! Total views: ${data.viewCount}`)
      setTimeout(() => setViewNotif(null), 3000)
    }

    socket.on(QR_CREATED_EVENT, handleQrCreated)
    socket.on(QR_VIEWED_EVENT, handleQrViewed)
    socket.on('connect_error', (error) => {
      console.warn('Realtime connection error', error)
    })

    return () => {
      socket.off(QR_CREATED_EVENT, handleQrCreated)
      socket.off(QR_VIEWED_EVENT, handleQrViewed)
      socket.disconnect()
      socketRef.current = null
    }
  }, [token])

  useEffect(() => {
    return () => submitAbortRef.current?.abort()
  }, [])

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

    const errors = validateQrForm(form)
    if (!isFormValid(errors)) {
      setFormErrors(errors)
      return
    }
    setFormErrors({})

    submitAbortRef.current?.abort()
    const controller = new AbortController()
    submitAbortRef.current = controller

    setIsSubmitting(true)
    setFormError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/qr`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          size: Number(form.size),
          margin: Number(form.margin),
          ...(logo ? { precomposedImage: getStageDataURL() ?? undefined } : {}),
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
      if (error instanceof Error && error.name === 'AbortError') return
      setFormError(error instanceof Error ? error.message : 'Произошла ошибка')
    } finally {
      if (!controller.signal.aborted) setIsSubmitting(false)
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

    const fields: QrFormFields = {
      data: item.data,
      color: item.color,
      background: item.background,
      size: item.size,
      format: item.format,
      errorCorrectionLevel: item.errorCorrectionLevel,
      margin: item.margin,
    }

    setForm((prev) => ({
      ...prev,
      text: fields.data,
      format: normalizeHistoryFormat(fields.format),
      size: fields.size,
      color: fields.color,
      background: fields.background,
      errorCorrectionLevel:
        (fields.errorCorrectionLevel as 'L' | 'M' | 'Q' | 'H') ?? prev.errorCorrectionLevel,
      margin: fields.margin ?? prev.margin,
    }))
  }, [])

  const handleCopyLink = async () => {
    const qrId = preview?.qr?.id
    const link = qrId
      ? `${API_BASE_URL}/api/qr/${qrId}/view`
      : null
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

  const downloadData = (dataUrl: string, fileName: string) => {
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = fileName
    link.click()
  }

  const handleDownloadPng = () => {
    const composed = getStageDataURL()
    const png = composed ?? clientPreview.png ?? (preview?.mimeType.includes('png') ? preview.image : null)
    if (!png) return
    downloadData(png, 'qr-code.png')
  }

  const handleDownloadSvg = () => {
    const svgRaw = clientPreview.svg
    const svgFromServer = preview?.mimeType.includes('svg') ? preview.image : null
    const svgData = svgRaw
      ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgRaw)}`
      : svgFromServer
    if (!svgData) return
    downloadData(svgData, 'qr-code.svg')
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
      const [pngResult, svgResult] = await Promise.allSettled([
        QRCode.toDataURL(form.text, options),
        QRCode.toString(form.text, { ...options, type: 'svg' }),
      ])

      if (pngResult.status === 'rejected') {
        console.error('PNG preview failed', pngResult.reason)
      }
      if (svgResult.status === 'rejected') {
        console.error('SVG preview failed', svgResult.reason)
      }

      if (!cancelled) {
        setClientPreview({
          png: pngResult.status === 'fulfilled' ? pngResult.value : undefined,
          svg: svgResult.status === 'fulfilled' ? svgResult.value : undefined,
        })
      }
    }

    generate()

    return () => {
      cancelled = true
    }
  }, [form.text, form.size, form.margin, form.color, form.background, form.errorCorrectionLevel])

  const getStageDataURL = () =>
    stageRef.current?.toDataURL(form.size / STAGE_SIZE) ?? null

  const hasPreview = Boolean(clientPreview.png ?? preview?.image)

  return (
    <div className="gen-page">
      <h2>Generator</h2>

      <div className="gen-layout">
        {/* ── Left: controls ── */}
        <form className="gen-controls" onSubmit={handleSubmit}>

          {/* Content */}
          <div className="field-group">
            <label className="field-label" htmlFor="gen-text">Content (text or URL)</label>
            <input
              id="gen-text"
              className={`lum-input${formErrors.data ? ' input-error' : ''}`}
              type="text"
              placeholder="https://example.com"
              value={form.text}
              onChange={handleInputChange('text')}
            />
            {formErrors.data && <p className="field-error">{formErrors.data}</p>}
          </div>

          {/* Colors */}
          <div className="color-row">
            <ColorPicker
              label="Foreground"
              value={form.color}
              onChange={(c) => setForm((p) => ({ ...p, color: c }))}
            />
            <ColorPicker
              label="Background"
              value={form.background}
              onChange={(c) => setForm((p) => ({ ...p, background: c }))}
            />
          </div>

          {/* Size */}
          <div className="slider-row">
            <div className="slider-label-row">
              <label className="field-label" style={{ margin: 0 }}>Size (px)</label>
              <span className="slider-value">{form.size}px</span>
            </div>
            <input
              className="lum-slider"
              type="range"
              min={100}
              max={600}
              step={20}
              value={form.size}
              onChange={handleInputChange('size', (v) => Number(v) as FormState['size'])}
            />
          </div>

          {/* Error correction + Format */}
          <div className="color-row">
            <div className="color-field">
              <label className="field-label">Error correction</label>
              <select
                className="lum-select"
                value={form.errorCorrectionLevel}
                onChange={handleInputChange('errorCorrectionLevel', (v) => v as FormState['errorCorrectionLevel'])}
              >
                {(['L', 'M', 'Q', 'H'] as const).map((level) => (
                  <option key={level} value={level}>{ERROR_CORRECTION_LABELS[level]}</option>
                ))}
              </select>
            </div>
            <div className="color-field">
              <label className="field-label">Format</label>
              <select
                className="lum-select"
                value={form.format}
                onChange={handleInputChange('format', (v) => (v === 'svg' ? 'svg' : 'png'))}
              >
                <option value="png">PNG</option>
                <option value="svg">SVG</option>
              </select>
            </div>
          </div>

          {/* Logo */}
          <div className="field-group">
            <label className="field-label">Logo (optional)</label>
            <div
              className={`logo-dropzone${logo ? ' has-logo' : ''}${dragOver ? ' drag-over' : ''}`}
              onClick={() => logoInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                const file = e.dataTransfer.files[0]
                if (file) {
                  const fakeEvent = { target: { files: [file] } } as unknown as ChangeEvent<HTMLInputElement>
                  handleLogoFile(fakeEvent)
                }
              }}
            >
              {logo ? (
                <div className="logo-dropzone-preview">
                  <img src={logo} alt="logo" />
                  <span>{logoName}</span>
                  <button
                    type="button"
                    className="logo-remove"
                    onClick={(e) => { e.stopPropagation(); setLogo(null); setLogoName(null) }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  <span className="logo-dropzone-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 16 12 12 8 16" />
                      <line x1="12" y1="12" x2="12" y2="21" />
                      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                    </svg>
                  </span>
                  <p>Drop image here or click to browse</p>
                  <small>PNG, JPEG, WebP, SVG · max 500 KB</small>
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

          {formErrors.color && <p className="field-error">Foreground: {formErrors.color}</p>}
          {formErrors.background && <p className="field-error">Background: {formErrors.background}</p>}
          {formErrors.size && <p className="field-error">Size: {formErrors.size}</p>}
          {formError && <p className="form-error">{formError}</p>}

          {/* Action buttons */}
          <div className="gen-actions">
            <button
              type="button"
              className="btn-dl"
              onClick={handleDownloadPng}
              disabled={!hasPreview}
            >
              Download PNG
            </button>
            <button
              type="button"
              className="btn-dl"
              onClick={handleDownloadSvg}
              disabled={!hasPreview}
            >
              Download SVG
            </button>
            <button
              type="button"
              className={`btn-dl${copyStatus === 'success' ? ' copied' : ''}`}
              onClick={handleCopyLink}
              disabled={!hasPreview}
            >
              {copyStatus === 'success' ? 'Copied link to clipboard' : 'Copy image link'}
            </button>
          </div>

          <button type="submit" className="btn-generate" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save to History'}
          </button>
        </form>

        {/* ── Right: preview ── */}
        <div className="gen-preview">
          {hasPreview ? (
            <>
              <QrPreviewStage
                ref={stageRef}
                qrDataUrl={clientPreview.png ?? preview?.image ?? null}
                logoDataUrl={logo}
              />
              {logo && (
                <p className="gen-preview-hint" style={{ color: 'var(--accent)' }}>
                  Drag or resize the logo on the preview
                </p>
              )}
            </>
          ) : (
            <div className="gen-preview-empty">
              <div className="preview-empty-grid">
                {Array.from({ length: 25 }).map((_, i) => (
                  <span key={i} />
                ))}
              </div>
            </div>
          )}
          {viewNotif && (
            <p className="gen-preview-hint" style={{ color: 'var(--accent)' }}>
              {viewNotif}
            </p>
          )}
          <p className="gen-preview-hint">
            Preview updates instantly. For link/history, QR is generated on the server.
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
