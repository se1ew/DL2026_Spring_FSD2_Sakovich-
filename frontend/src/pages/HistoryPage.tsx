import { useCallback, useEffect, useState } from 'react'
import { HISTORY_UPDATED_EVENT, REUSE_EVENT_NAME } from '../constants/events'
import { type QrHistoryItem } from '../types/qr'
import { useAuth } from '../hooks/useAuth'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

const formatCardDate = (value: string) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    .format(new Date(value))
    .toUpperCase()

const normalizeThumb = (item: QrHistoryItem) => {
  if (!item.imageUrl) return ''
  if (item.imageUrl.trim().startsWith('<svg'))
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(item.imageUrl)}`
  return item.imageUrl
}

const truncate = (str: string, n: number) =>
  str.length > n ? `${str.slice(0, n)}…` : str

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
      if (!token) throw new Error('Session expired')
      const response = await fetch(`${API_BASE_URL}/api/qr`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to load history')
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
    const event = new CustomEvent(REUSE_EVENT_NAME, { detail: item })
    window.dispatchEvent(event)
    onBack?.()
  }

  return (
    <div className="vault-page">
      <div className="vault-header">
        <div>
          <p className="eyebrow">Archive System</p>
          <h1>Vault</h1>
        </div>
        <div className="vault-filters">
          <button type="button" className="btn-filter active">All Assets</button>
          <button type="button" className="btn-filter">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="21" y1="4" x2="14" y2="4" /><line x1="10" y1="4" x2="3" y2="4" />
              <line x1="21" y1="12" x2="12" y2="12" /><line x1="8" y1="12" x2="3" y2="12" />
              <line x1="21" y1="20" x2="16" y2="20" /><line x1="12" y1="20" x2="3" y2="20" />
              <line x1="14" y1="2" x2="14" y2="6" /><line x1="8" y1="10" x2="8" y2="14" />
              <line x1="16" y1="18" x2="16" y2="22" />
            </svg>
            Sort
          </button>
        </div>
      </div>

      {loading && <p className="vault-loading">Loading vault…</p>}
      {error && <p className="form-error">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="vault-empty">No QR codes yet. Create your first one.</p>
      )}

      {items.length > 0 && (
        <div className="vault-grid">
          {items.map((item) => (
            <div
              key={item.id}
              className={`vault-card${selected?.id === item.id ? ' selected' : ''}`}
              onClick={() => { setSelected(item); handleReuse(item) }}
            >
              <div className="vault-card-thumb">
                {normalizeThumb(item) ? (
                  <img src={normalizeThumb(item)} alt={item.data} />
                ) : (
                  <svg className="no-thumb" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="5" y="5" width="3" height="3" rx="0.5" fill="currentColor" stroke="none" />
                    <rect x="16" y="5" width="3" height="3" rx="0.5" fill="currentColor" stroke="none" />
                    <rect x="5" y="16" width="3" height="3" rx="0.5" fill="currentColor" stroke="none" />
                  </svg>
                )}
              </div>
              <div className="vault-card-info">
                <div className="vault-card-meta">
                  <span className="vault-card-name">{truncate(item.data, 22)}</span>
                  <span className="vault-card-date">{formatCardDate(item.createdAt)}</span>
                </div>
                <span className="vault-card-link">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="vault-footer">
        <div className="vault-stats">
          <div className="vault-stat">
            <span className="vault-stat-label">Total Assets</span>
            <span className="vault-stat-value">{items.length}</span>
          </div>
        </div>
        <p className="vault-footer-right">
          All cryptographic data is localized &amp; end-to-end encrypted.<br />
          Luminescent QR © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
