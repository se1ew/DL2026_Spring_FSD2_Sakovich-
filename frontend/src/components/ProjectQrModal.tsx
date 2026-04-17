import { useEffect, useState } from 'react'
import { type Project, type QrHistoryItem } from '../types/qr'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

const normalizeThumb = (item: QrHistoryItem) => {
  if (item.imageUrl.trim().startsWith('<svg'))
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(item.imageUrl)}`
  return item.imageUrl
}

const shortData = (s: string) => (s.length > 44 ? s.slice(0, 44) + '…' : s)

type Props = {
  project: Project
  token: string
  onClose: () => void
}

export const ProjectQrModal = ({ project, token, onClose }: Props) => {
  const [projectQrs, setProjectQrs] = useState<QrHistoryItem[]>([])
  const [allQrs, setAllQrs] = useState<QrHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [loadingAll, setLoadingAll] = useState(false)

  const fetchProjectQrs = async () => {
    const res = await fetch(`${API_BASE_URL}/api/qr?projectId=${project.id}&limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const data = await res.json()
      setProjectQrs(data.items ?? [])
    }
  }

  const fetchAllQrs = async () => {
    setLoadingAll(true)
    const res = await fetch(`${API_BASE_URL}/api/qr?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const data = await res.json()
      setAllQrs(data.items ?? [])
    }
    setLoadingAll(false)
  }

  useEffect(() => {
    setLoading(true)
    fetchProjectQrs().finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id])

  const handleRemove = async (qr: QrHistoryItem) => {
    const res = await fetch(`${API_BASE_URL}/api/qr/${qr.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ projectId: null }),
    })
    if (res.ok) {
      setProjectQrs(prev => prev.filter(q => q.id !== qr.id))
      setAllQrs(prev => prev.map(q => q.id === qr.id ? { ...q, projectId: null } : q))
    }
  }

  const handleAdd = async (qr: QrHistoryItem) => {
    const res = await fetch(`${API_BASE_URL}/api/qr/${qr.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ projectId: project.id }),
    })
    if (res.ok) {
      const updated = { ...qr, projectId: project.id }
      setProjectQrs(prev => [...prev, updated])
      setAllQrs(prev => prev.map(q => q.id === qr.id ? updated : q))
    }
  }

  const handleToggleAdd = async () => {
    if (!showAdd && allQrs.length === 0) await fetchAllQrs()
    setShowAdd(s => !s)
  }

  const addableQrs = allQrs.filter(q => q.projectId !== project.id)

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal-card">
        {/* Header */}
        <div className="modal-header">
          <div>
            <h3 className="modal-title">{project.name}</h3>
            <span className="modal-subtitle">{projectQrs.length} QR code{projectQrs.length !== 1 ? 's' : ''}</span>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* QRs in project */}
        <div className="modal-body">
          {loading ? (
            <p className="hist-status">Loading…</p>
          ) : projectQrs.length === 0 ? (
            <p className="hist-status">No QR codes in this project yet.</p>
          ) : (
            <div className="modal-qr-list">
              {projectQrs.map(qr => (
                <div key={qr.id} className="modal-qr-row">
                  <div className="modal-qr-thumb">
                    <img src={normalizeThumb(qr)} alt={qr.data} />
                  </div>
                  <div className="modal-qr-info">
                    <span className="modal-qr-data">{shortData(qr.data)}</span>
                    {qr.dynamicUrl && <span className="badge badge-dynamic" style={{ fontSize: 10 }}>Dynamic</span>}
                  </div>
                  <button
                    type="button"
                    className="modal-qr-remove"
                    title="Remove from project"
                    onClick={() => handleRemove(qr)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer toggle */}
        <div className="modal-footer">
          <button type="button" className="modal-add-toggle" onClick={handleToggleAdd}>
            {showAdd ? '▲ Hide' : '＋ Add QR codes'}
          </button>
        </div>

        {/* Add section */}
        {showAdd && (
          <div className="modal-add-section">
            <p className="modal-add-label">Select QR codes to add to this project</p>
            {loadingAll ? (
              <p className="hist-status">Loading…</p>
            ) : addableQrs.length === 0 ? (
              <p className="hist-status">All your QR codes are already in this project.</p>
            ) : (
              <div className="modal-qr-list">
                {addableQrs.map(qr => (
                  <div key={qr.id} className="modal-qr-row">
                    <div className="modal-qr-thumb">
                      <img src={normalizeThumb(qr)} alt={qr.data} />
                    </div>
                    <div className="modal-qr-info">
                      <span className="modal-qr-data">{shortData(qr.data)}</span>
                      {qr.projectId && (
                        <span className="modal-qr-other-project">in another project</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="modal-qr-add"
                      onClick={() => handleAdd(qr)}
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
