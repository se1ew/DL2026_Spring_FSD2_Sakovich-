import { useCallback, useEffect, useRef, useState } from 'react'
import { HISTORY_UPDATED_EVENT } from '../constants/events'
import { type QrHistoryItem, type Project } from '../types/qr'
import { useAuth } from '../hooks/useAuth'
import { useProjects } from '../hooks/useProjects'

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
  projectFilter?: Project | null
  onClearFilter?: () => void
}

export const HistoryPage = ({ projectFilter, onClearFilter }: HistoryPageProps) => {
  const { token } = useAuth()
  const { projects } = useProjects(token)
  const [items, setItems] = useState<QrHistoryItem[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dlMenuId, setDlMenuId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [editDynamicId, setEditDynamicId] = useState<string | null>(null)
  const [editDynamicUrl, setEditDynamicUrl] = useState('')
  const [savingDynamic, setSavingDynamic] = useState(false)
  const [moveId, setMoveId] = useState<string | null>(null)
  const dlMenuRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!dlMenuId) return
    const handler = (e: MouseEvent) => {
      if (dlMenuRef.current && !dlMenuRef.current.contains(e.target as Node)) {
        setDlMenuId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dlMenuId])

  useEffect(() => {
    setPage(1)
  }, [projectFilter])

  const loadHistory = useCallback(async (targetPage: number) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    try {
      if (!token) throw new Error('Session expired')
      const projectParam = projectFilter?.id ? `&projectId=${projectFilter.id}` : ''
      const res = await fetch(`${API_BASE_URL}/api/qr?page=${targetPage}&limit=6${projectParam}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Failed to load history')
      setItems(payload.items ?? [])
      setTotal(payload.total ?? 0)
      setTotalPages(payload.totalPages ?? 1)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Failed to load history')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [token, projectFilter])

  useEffect(() => {
    loadHistory(page)
    return () => abortRef.current?.abort()
  }, [loadHistory, page])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<QrHistoryItem | undefined>).detail
      if (!detail) return
      setItems((prev) => [detail, ...prev.filter((i) => i.id !== detail.id)])
    }
    window.addEventListener(HISTORY_UPDATED_EVENT, handler as EventListener)
    return () => window.removeEventListener(HISTORY_UPDATED_EVENT, handler as EventListener)
  }, [])

  const handleDownload = (item: QrHistoryItem, format: 'png' | 'svg') => {
    const thumb = normalizeThumb(item)
    if (!thumb) return
    const a = document.createElement('a')
    a.href = thumb
    a.download = `qr-${item.id.slice(0, 8)}.${format}`
    a.click()
    setDlMenuId(null)
  }

  const handleCopyLink = async (item: QrHistoryItem) => {
    const link = `${API_BASE_URL}/api/qr/${item.id}/view`
    await navigator.clipboard.writeText(link).catch(() => {})
    setCopiedId(item.id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const handleOpen = (item: QrHistoryItem) => {
    window.open(`${API_BASE_URL}/api/qr/${item.id}/view`, '_blank', 'noopener')
  }

  const handleEditDynamic = (item: QrHistoryItem) => {
    setEditDynamicId(item.id)
    setEditDynamicUrl(item.dynamicUrl ?? '')
  }

  const handleSaveDynamic = async (item: QrHistoryItem) => {
    if (!token) return
    setSavingDynamic(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/qr/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ dynamicUrl: editDynamicUrl }),
      })
      if (res.ok) {
        const updated = await res.json() as QrHistoryItem
        setItems(prev => prev.map(i => i.id === updated.id ? { ...i, dynamicUrl: updated.dynamicUrl } : i))
        setEditDynamicId(null)
      }
    } finally {
      setSavingDynamic(false)
    }
  }

  const handleMoveToProject = async (item: QrHistoryItem, newProjectId: string | null) => {
    if (!token) return
    const res = await fetch(`${API_BASE_URL}/api/qr/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ projectId: newProjectId }),
    })
    if (res.ok) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, projectId: newProjectId } : i))
    }
    setMoveId(null)
  }

  const handleDelete = async (item: QrHistoryItem) => {
    if (!token) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/qr/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setItems((prev) => {
          const next = prev.filter((i) => i.id !== item.id)
          if (next.length === 0 && page > 1) setPage((p) => p - 1)
          return next
        })
        setTotal((t) => Math.max(0, t - 1))
      }
    } catch {
      // silent
    }
  }

  return (
    <div className="hist-page">
      <div className="hist-header">
        <h2>History{projectFilter ? `: ${projectFilter.name}` : ''}</h2>
        <button type="button" className="btn-clear" onClick={() => setItems([])}>
          Clear history
        </button>
      </div>

      {loading && <p className="hist-status">Loading…</p>}
      {error && <p className="form-error">{error}</p>}
      {projectFilter && (
        <div className="filter-chip">
          <span>Project: <strong>{projectFilter.name}</strong></span>
          <button type="button" className="filter-chip-clear" onClick={onClearFilter}>×</button>
        </div>
      )}
      {!loading && !error && items.length === 0 && (
        <p className="hist-status">
          {projectFilter ? 'No QR codes in this project yet.' : 'No QR codes yet. Create your first one.'}
        </p>
      )}

      <div className="hist-cards">
        {items.map((item) => {
          const thumb = normalizeThumb(item)
          return (
            <div key={item.id} className="hist-card" style={{ position: 'relative' }}>
              <button
                type="button"
                className="hist-card-delete"
                title="Delete"
                onClick={() => handleDelete(item)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
              <div className="hist-card-thumb">
                {thumb
                  ? <img src={thumb} alt={item.data} />
                  : <div className="hist-thumb-empty" />}
              </div>
              <div className="hist-card-info">
                <div className="hist-card-badges">
                  {item.dynamicUrl && <span className="badge badge-dynamic">Dynamic</span>}
                  {item.projectId && <span className="badge badge-project">Project</span>}
                </div>
                <p className="hist-card-id">QR {item.id.slice(0, 8)}</p>
                <p className="hist-card-date">{formatDate(item.createdAt)}</p>
                <p className="hist-card-url">{item.data}</p>
                {item.dynamicUrl && editDynamicId !== item.id && (
                  <p className="hist-card-dynamic-url" title={item.dynamicUrl}>
                    → {item.dynamicUrl.length > 40 ? item.dynamicUrl.slice(0, 40) + '…' : item.dynamicUrl}
                  </p>
                )}
                {editDynamicId === item.id && (
                  <div className="dynamic-edit-row">
                    <input
                      className="lum-input"
                      type="url"
                      value={editDynamicUrl}
                      onChange={e => setEditDynamicUrl(e.target.value)}
                      placeholder="New target URL"
                    />
                    <button type="button" className="hist-btn" disabled={savingDynamic} onClick={() => handleSaveDynamic(item)}>
                      {savingDynamic ? 'Saving…' : 'Save'}
                    </button>
                    <button type="button" className="hist-btn" onClick={() => setEditDynamicId(null)}>Cancel</button>
                  </div>
                )}
                <div className="hist-card-btns">
                  <div style={{ position: 'relative' }} ref={dlMenuId === item.id ? dlMenuRef : undefined}>
                    <button
                      type="button"
                      className="hist-btn"
                      onClick={() => setDlMenuId(dlMenuId === item.id ? null : item.id)}
                    >
                      Download ▾
                    </button>
                    {dlMenuId === item.id && (
                      <div className="dl-menu">
                        <button type="button" className="dl-menu-item" onClick={() => handleDownload(item, 'png')}>PNG</button>
                        <button type="button" className="dl-menu-item" onClick={() => handleDownload(item, 'svg')}>SVG</button>
                      </div>
                    )}
                  </div>
                  <button type="button" className="hist-btn" onClick={() => handleCopyLink(item)}>
                    {copiedId === item.id ? 'Copied!' : 'Copy link'}
                  </button>
                  <button type="button" className="hist-btn" onClick={() => handleOpen(item)}>Open</button>
                  {item.dynamicUrl && editDynamicId !== item.id && (
                    <button type="button" className="hist-btn hist-btn-dynamic" onClick={() => handleEditDynamic(item)}>
                      Edit target
                    </button>
                  )}
                  {moveId === item.id ? (
                    <select
                      className="hist-move-select"
                      defaultValue={item.projectId ?? ''}
                      onChange={e => handleMoveToProject(item, e.target.value || null)}
                      onBlur={() => setMoveId(null)}
                      autoFocus
                    >
                      <option value="">— No project —</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  ) : (
                    <button type="button" className="hist-btn" onClick={() => setMoveId(item.id)}>
                      Move
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div className="hist-pagination">
          <button
            type="button"
            className="hist-btn"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Prev
          </button>
          <span className="hist-page-info">
            {page} / {totalPages} &nbsp;·&nbsp; {total} total
          </span>
          <button
            type="button"
            className="hist-btn"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
