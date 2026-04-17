import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useProjects } from '../hooks/useProjects'
import { type Project } from '../types/qr'

type Props = {
  onSelectProject?: (project: Project) => void
}

export const ProjectsPage = ({ onSelectProject }: Props) => {
  const { token } = useAuth()
  const { projects, loading, create, remove } = useProjects(token)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    setError(null)
    try {
      const project = await create(newName.trim())
      if (!project) throw new Error('Failed to create project')
      setNewName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="projects-page">
      <div className="projects-header">
        <h2>Projects / Series</h2>
        <p className="projects-subtitle">Group your QR codes into collections</p>
      </div>

      <form className="project-create-form" onSubmit={handleCreate}>
        <input
          className="lum-input"
          type="text"
          placeholder="New project name…"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          maxLength={100}
        />
        <button type="submit" className="btn-generate" disabled={creating || !newName.trim()}>
          {creating ? 'Creating…' : 'Create'}
        </button>
      </form>
      {error && <p className="form-error">{error}</p>}

      {loading && <p className="hist-status">Loading…</p>}
      {!loading && projects.length === 0 && (
        <p className="hist-status">No projects yet. Create your first collection above.</p>
      )}

      <div className="projects-list">
        {projects.map(project => (
          <div key={project.id} className="project-card">
            <div className="project-card-info">
              <span className="project-name">{project.name}</span>
              <span className="project-count">{project._count?.qrCodes ?? 0} QR codes</span>
            </div>
            <div className="project-card-actions">
              {onSelectProject && (
                <button
                  type="button"
                  className="hist-btn"
                  onClick={() => onSelectProject(project)}
                >
                  View QRs
                </button>
              )}
              <button
                type="button"
                className="hist-card-delete"
                title="Delete project"
                onClick={() => remove(project.id)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
