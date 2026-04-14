import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

type QrHistoryItem = {
  id: string
  data: string
  color: string
  background: string
  size: number
  format: string
  errorCorrectionLevel?: string | null
  margin?: number | null
  imageUrl: string
  createdAt: string
}

type PreviewState = {
  image: string
  mimeType: string
  qr?: QrHistoryItem
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

function App() {
  const [form, setForm] = useState({
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

  const hasResult = Boolean(preview?.image)

  const loadHistory = async () => {
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/api/qr`)
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Не удалось загрузить историю')
      }

      setHistory(payload.items ?? [])
    } catch (error) {
      setHistoryError(
        error instanceof Error ? error.message : 'Не удалось загрузить историю'
      )
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const handleInputChange = (
    key: keyof typeof form,
    parser: (value: string) => string | number = (value) => value,
  ) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = parser(event.target.value)
      setForm((prev) => ({ ...prev, [key]: value }))
    }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!form.text.trim()) {
      setFormError('Введите текст или ссылку, чтобы создать QR')
      return
    }

    setIsSubmitting(true)
    setFormError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const handleHistorySelect = (item: QrHistoryItem) => {
    const mimeType = item.imageUrl.trim().startsWith('<svg')
      ? 'image/svg+xml'
      : 'image/png'

    setPreview({
      image: normalizeImage(item.imageUrl, mimeType),
      mimeType,
      qr: item,
    })
  }

  const handleDownload = () => {
    if (!preview) return

    const extension = preview.mimeType.includes('svg') ? 'svg' : 'png'
    const link = document.createElement('a')
    link.href = preview.image
    link.download = `qr-${preview.qr?.id ?? 'code'}.${extension}`
    link.click()
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
                <select value={form.format} onChange={handleInputChange('format')}>
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
                  onChange={handleInputChange('size', Number)}
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
                  onChange={handleInputChange('errorCorrectionLevel')}
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
                  onChange={handleInputChange('margin', Number)}
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
            <p>{hasResult ? 'Обновлённые данные доступны ниже.' : 'Создайте QR, чтобы увидеть результат.'}</p>
          </div>

          <div className="preview-stage">
            {hasResult ? (
              <img src={preview?.image} alt="Предпросмотр QR-кода" />
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

          <button className="ghost" type="button" onClick={handleDownload} disabled={!hasResult}>
            Скачать изображение
          </button>
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
