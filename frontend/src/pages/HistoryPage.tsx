import { useCallback, useEffect, useState } from 'react'
import { HISTORY_UPDATED_EVENT, REUSE_EVENT_NAME } from '../constants/events'
import { type QrHistoryItem } from '../types/qr'
import { useAuth } from '../hooks/useAuth'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(new Date(value))

const normalizeThumb = (item: QrHistoryItem) => {
  if (!item.imageUrl) return ''
  if (item.imageUrl.trim().startsWith('<svg'))
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(item.imageUrl)}`
  return item.imageUrl
}

export type HistoryPageProps = {
  onBack?: () => void
}

export const HistoryPage = ({ onBack }: HistoryPageProps) => {
  const { token } = useAuth()
  const [items, setItems] = useState<QrHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (!token) throw new Error('Session expired')
      const res = await fetch(`${API_BASE_URL}/api/qr`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Failed to load history')
      setItems(payload.items ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { loadHistory() }, [loadHistory])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<QrHistoryItem | undefined>).detail
      if (!detail) return
      setItems((prev) => [detail, ...prev.filter((i) => i.id !== detail.id)])
    }
    window.addEventListener(HISTORY_UPDATED_EVENT, handler as EventListener)
    return () => window.removeEventListener(HISTORY_UPDATED_EVENT, handler as EventListener)
  }, [])

  const handleReuse = (item: QrHistoryItem) => {
    window.dispatchEvent(new CustomEvent(REUSE_EVENT_NAME, { detail: item }))
    onBack?.()
  }

  const handleDownload = (item: QrHistoryItem) => {
    const thumb = normalizeThumb(item)
    if (!thumb) return
    const a = document.createElement('a')
    a.href = thumb
    a.download = `qr-${item.id.slice(0, 8)}.png`
    a.click()
  }

  const handleCopyLink = async (item: QrHistoryItem) => {
    await navigator.clipboard.writeText(item.data).catch(() => {})
  }

  return (
    <div className="hist-page">
      <div className="hist-header">
        <h2>History</h2>
        <button type="button" className="btn-clear" onClick={() => setItems([])}>
          Clear history
        </button>
      </div>

      {loading && <p className="hist-status">Loading…</p>}
      {error && <p className="form-error">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="hist-status">No QR codes yet. Create your first one.</p>
      )}

      <div className="hist-cards">
        {items.map((item) => {
          const thumb = normalizeThumb(item)
          return (
            <div key={item.id} className="hist-card">
              <div className="hist-card-thumb">
                {thumb
                  ? <img src={thumb} alt={item.data} />
                  : <div className="hist-thumb-empty" />}
              </div>
              <div className="hist-card-info">
                <p className="hist-card-id">QR {item.id.slice(0, 8)}</p>
                <p className="hist-card-date">{formatDate(item.createdAt)}</p>
                <p className="hist-card-url">{item.data}</p>
                <div className="hist-card-btns">
                  <button type="button" className="hist-btn" onClick={() => handleDownload(item)}>Download</button>
                  <button type="button" className="hist-btn" onClick={() => handleCopyLink(item)}>Copy link</button>
                  <button type="button" className="hist-btn" onClick={() => handleReuse(item)}>Open</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
