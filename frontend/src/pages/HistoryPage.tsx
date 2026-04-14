import { useCallback, useEffect, useMemo, useState } from 'react'
import { HISTORY_UPDATED_EVENT, REUSE_EVENT_NAME } from '../constants/events'
import { type QrHistoryItem } from '../types/qr'
import { useAuth } from '../hooks/useAuth'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export type HistoryPageProps = {
  onBack?: () => void
}

export const HistoryPage = ({ onBack }: HistoryPageProps) => {
  const { token } = useAuth()
  const [items, setItems] = useState<QrHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<QrHistoryItem | null>(null)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (!token) {
        throw new Error('Сессия недействительна')
      }

      const response = await fetch(`${API_BASE_URL}/api/qr`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Не удалось загрузить историю')
      }

      setItems(payload.items ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить историю')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const empty = !loading && items.length === 0

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<QrHistoryItem | undefined>).detail
      if (!detail) return

      setItems((prev) => {
        const filtered = prev.filter((item) => item.id !== detail.id)
        return [detail, ...filtered]
      })

      setSelected((prev) => prev ?? detail)
    }

    window.addEventListener(HISTORY_UPDATED_EVENT, handler as EventListener)
    return () => {
      window.removeEventListener(HISTORY_UPDATED_EVENT, handler as EventListener)
    }
  }, [])

  useEffect(() => {
    if (!loading && !selected && items.length > 0) {
      setSelected(items[0])
    }
  }, [items, loading, selected])

  const selectedPreview = useMemo(() => {
    if (!selected) return null
    const isSvg = selected.imageUrl.trim().startsWith('<svg')
    const image = isSvg
      ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(selected.imageUrl)}`
      : selected.imageUrl
    return {
      image,
      format: selected.format.toUpperCase(),
      size: selected.size,
      createdAt: new Intl.DateTimeFormat('ru-RU', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(selected.createdAt)),
    }
  }, [selected])

  const handleReuse = () => {
    if (!selected) return
    const event = new CustomEvent(REUSE_EVENT_NAME, { detail: selected })
    window.dispatchEvent(event)
    onBack?.()
  }

  return (
    <div className="history-view">
      <header>
        <div>
          <p className="eyebrow">История</p>
          <h1>Последние QR-коды</h1>
          <p className="lede">
            Здесь хранятся все генерации. Выберите запись, чтобы посмотреть детали или
            переиспользовать данные.
          </p>
        </div>
        {onBack && (
          <button type="button" className="ghost" onClick={onBack}>
            Вернуться к генератору
          </button>
        )}
      </header>

      <div className="history-content">
        <section className="history-list-panel">
          {loading && <p className="muted">Загружаем историю…</p>}
          {error && <p className="form-error">{error}</p>}
          {empty && <p className="muted">История пуста</p>}

          <ul className="history-board">
            {items.map((item) => (
              <li key={item.id} className={selected?.id === item.id ? 'active' : ''}>
                <button type="button" onClick={() => setSelected(item)}>
                  <div>
                    <strong>
                      {item.data.length > 60 ? `${item.data.slice(0, 60)}…` : item.data}
                    </strong>
                    <span>
                      {new Intl.DateTimeFormat('ru-RU', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(item.createdAt))}
                    </span>
                  </div>
                  <span className="pill">{item.format.toUpperCase()}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <aside className="history-preview-panel">
          {selectedPreview ? (
            <div className="history-preview">
              <img src={selectedPreview.image} alt="QR" />
              <div className="history-preview-meta">
                <div>
                  <span>Формат</span>
                  <strong>{selectedPreview.format}</strong>
                </div>
                <div>
                  <span>Размер</span>
                  <strong>{selectedPreview.size} px</strong>
                </div>
                <div>
                  <span>Создан</span>
                  <strong>{selectedPreview.createdAt}</strong>
                </div>
              </div>
              <button className="primary" type="button" onClick={handleReuse}>
                Повторно использовать
              </button>
            </div>
          ) : (
            <div className="history-preview placeholder">
              <p>Выберите QR из списка, чтобы увидеть детали</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
