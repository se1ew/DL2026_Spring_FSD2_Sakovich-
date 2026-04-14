import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import QRCode from 'qrcode'
import './App.css'
import { REUSE_EVENT_NAME } from './constants/events'
import { type QrHistoryItem } from './types/qr'
import { useAuth } from './hooks/useAuth'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

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

const formatDate = (value?: string) => {
  if (!value) return '—'
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
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
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [history, setHistory] = useState<QrHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [clientPreview, setClientPreview] = useState<ClientPreview>({})
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const hasServerResult = Boolean(preview?.image)
  const hasLivePreview = Boolean(clientPreview.png)

  const loadHistory = useCallback(async () => {
    if (!token) return

    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/api/qr`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Не удалось загрузить историю')
      }

      setHistory(payload.items ?? [])
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Не удалось загрузить историю'
      setHistoryError(message)
    } finally {
      setHistoryLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!form.text.trim()) {
      setFormError('Введите текст или ссылку, чтобы создать QR')
      return
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
      await loadHistory()
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

  const handleHistorySelect = (item: QrHistoryItem) => {
    applyHistoryItem(item)
  }

  const handleCopyLink = async () => {
    const link = preview?.image ?? clientPreview.png
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
    const png = clientPreview.png ?? (preview?.mimeType.includes('png') ? preview.image : null)
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

  const latestCreatedAt = preview?.qr?.createdAt ?? history[0]?.createdAt

  const previewMeta = useMemo(() => {
    if (!preview?.qr) return null
    return {
      data: preview.qr.data,
      createdAt: preview.qr.createdAt,
      format: preview.qr.format.toUpperCase(),
      size: preview.qr.size,
    }
  }, [preview])

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

  const previewImage = clientPreview.png ?? preview?.image ?? ''

  const copyButtonLabel =
    copyStatus === 'success'
      ? 'Скопировано!'
      : copyStatus === 'error'
        ? 'Ошибка'
        : 'Скопировать ссылку'

  return (
    <div className="app-shell">
      <header className="app-header">
        <p className="eyebrow">QR LAB · Beta</p>
        <h1>Создавайте QR-коды за секунды</h1>
        <p className="lede">
          Введите текст или ссылку, настройте внешний вид и получайте готовый QR вместе с
          историей всех генераций.
        </p>
      </header>

      <main className="workspace">
        <section className="panel form-panel">
          <div className="panel-head">
            <h2>Параметры</h2>
            <p>Мы поддерживаем PNG и SVG, а также уровни коррекции L · M · Q · H.</p>
          </div>

          <form className="qr-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Текст или URL</span>
              <textarea
                placeholder="https://example.com/"
                value={form.text}
                onChange={handleInputChange('text')}
                rows={3}
              />
            </label>

            <div className="field-grid">
              <label className="field">
                <span>Формат</span>
                <select
                  value={form.format}
                  onChange={handleInputChange('format', (value) => (value === 'svg' ? 'svg' : 'png'))}
                >
                  <option value="png">PNG (по умолчанию)</option>
                  <option value="svg">SVG</option>
                </select>
              </label>

              <label className="field">
                <span>Размер · {form.size}px</span>
                <input
                  type="range"
                  min={200}
                  max={600}
                  step={20}
                  value={form.size}
                  onChange={handleInputChange('size', (value) => Number(value) as FormState['size'])}
                />
              </label>
            </div>

            <div className="field-grid">
              <label className="field color-field">
                <span>Цвет точки</span>
                <input
                  type="color"
                  value={form.color}
                  onChange={handleInputChange('color')}
                />
                <input
                  type="text"
                  value={form.color}
                  onChange={handleInputChange('color')}
                />
              </label>
              <label className="field color-field">
                <span>Фон</span>
                <input
                  type="color"
                  value={form.background}
                  onChange={handleInputChange('background')}
                />
                <input
                  type="text"
                  value={form.background}
                  onChange={handleInputChange('background')}
                />
              </label>
            </div>

            <div className="field-grid">
              <label className="field">
                <span>Коррекция ошибок</span>
                <select
                  value={form.errorCorrectionLevel}
                  onChange={handleInputChange('errorCorrectionLevel', (value) => value as FormState['errorCorrectionLevel'])}
                >
                  <option value="L">L — до 7%</option>
                  <option value="M">M — до 15%</option>
                  <option value="Q">Q — до 25%</option>
                  <option value="H">H — до 30%</option>
                </select>
              </label>

              <label className="field">
                <span>Отступ · {form.margin}</span>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={form.margin}
                  onChange={handleInputChange('margin', (value) => Number(value) as FormState['margin'])}
                />
              </label>
            </div>

            {formError && <p className="form-error">{formError}</p>}

            <button type="submit" className="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Создаём…' : 'Создать QR'}
            </button>
          </form>
        </section>

        <section className="panel preview-panel">
          <div className="panel-head">
            <h2>Предпросмотр</h2>
            <p>
              {hasLivePreview
                ? 'Live preview обновляется при изменении параметров.'
                : 'Введите текст, чтобы увидеть лайв-превью и сгенерировать QR.'}
            </p>
          </div>

          <div className="preview-stage">
            {previewImage ? (
              <>
                <img src={previewImage} alt="Предпросмотр QR-кода" />
                <span className="badge live">Live</span>
              </>
            ) : (
              <div className="preview-placeholder">
                <p>Здесь появится ваш QR</p>
              </div>
            )}
          </div>

          <div className="preview-meta">
            <div>
              <span>Последнее обновление</span>
              <strong>{formatDate(latestCreatedAt)}</strong>
            </div>
            <div>
              <span>Формат</span>
              <strong>{previewMeta?.format ?? form.format.toUpperCase()}</strong>
            </div>
            <div>
              <span>Размер</span>
              <strong>{previewMeta?.size ?? form.size} px</strong>
            </div>
          </div>

          <div className="preview-actions">
            <button
              className="primary subtle"
              type="button"
              onClick={handleDownloadPng}
              disabled={!clientPreview.png && !hasServerResult}
            >
              Скачать PNG
            </button>
            <button
              className="primary subtle"
              type="button"
              onClick={handleDownloadSvg}
              disabled={!clientPreview.svg && !hasServerResult}
            >
              Скачать SVG
            </button>
            <button
              className="ghost"
              type="button"
              onClick={handleCopyLink}
              disabled={!clientPreview.png && !hasServerResult}
            >
              {copyButtonLabel}
            </button>
          </div>
        </section>
      </main>

      <section className="panel history-panel">
        <div className="panel-head">
          <h2>История QR</h2>
          <p>Последние генерации хранятся в PostgreSQL · Prisma.</p>
        </div>

        {historyLoading ? (
          <p className="muted">Загружаем историю…</p>
        ) : historyError ? (
          <p className="form-error">{historyError}</p>
        ) : history.length === 0 ? (
          <p className="muted">История пока пуста — создайте первый QR.</p>
        ) : (
          <ul className="history-list">
            {history.slice(0, 6).map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => handleHistorySelect(item)}>
                  <div>
                    <strong>{item.data.length > 42 ? `${item.data.slice(0, 42)}…` : item.data}</strong>
                    <span>{formatDate(item.createdAt)}</span>
                  </div>
                  <span className="pill">{item.format.toUpperCase()}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default App
