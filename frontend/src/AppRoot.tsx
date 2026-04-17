import { useState } from 'react'
import App from './App'
import { HistoryPage } from './pages/HistoryPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { useAuth } from './hooks/useAuth'
import { AuthScreen } from './components/AuthScreen'
import { type Project } from './types/qr'

export type Route = 'generator' | 'history' | 'projects'

export const AppRoot = () => {
  const { user, logout, isBootstrapping } = useAuth()
  const [route, setRoute] = useState<Route>('generator')
  const [projectFilter, setProjectFilter] = useState<Project | null>(null)

  const goToFilteredHistory = (project: Project) => {
    setProjectFilter(project)
    setRoute('history')
  }

  const clearProjectFilter = () => setProjectFilter(null)

  if (isBootstrapping) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <p className="eyebrow">Luminescent QR</p>
          <h1>Loading…</h1>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthScreen />
  }

  return (
    <div className="app-shell">
      <header className="shell-nav">
        <span className="shell-brand">QR Generator</span>
        <div className="shell-links">
          <button
            type="button"
            className={`nav-btn${route === 'generator' ? ' active' : ''}`}
            onClick={() => setRoute('generator')}
          >
            Generator
          </button>
          <button
            type="button"
            className={`nav-btn${route === 'history' ? ' active' : ''}`}
            onClick={() => setRoute('history')}
          >
            History
          </button>
          <button
            type="button"
            className={`nav-btn${route === 'projects' ? ' active' : ''}`}
            onClick={() => setRoute('projects')}
          >
            Projects
          </button>
          <button type="button" className="nav-btn nav-btn-logout" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <main className="shell-body">
        {route === 'generator' && <App />}
        {route === 'history' && (
          <HistoryPage
            onBack={() => setRoute('generator')}
            projectFilter={projectFilter}
            onClearFilter={clearProjectFilter}
          />
        )}
        {route === 'projects' && (
          <ProjectsPage onSelectProject={goToFilteredHistory} />
        )}
      </main>
    </div>
  )
}
