import { useState } from 'react'
import App from './App'
import { HistoryPage } from './pages/HistoryPage'
import { useAuth } from './hooks/useAuth'
import { AuthScreen } from './components/AuthScreen'

export type Route = 'generator' | 'history'

const IconQR = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="5" y="5" width="3" height="3" rx="0.5" fill="currentColor" stroke="none" />
    <rect x="16" y="5" width="3" height="3" rx="0.5" fill="currentColor" stroke="none" />
    <rect x="5" y="16" width="3" height="3" rx="0.5" fill="currentColor" stroke="none" />
    <rect x="14" y="14" width="3" height="3" rx="0.5" fill="currentColor" stroke="none" />
    <rect x="19" y="14" width="2" height="2" rx="0.3" fill="currentColor" stroke="none" />
    <rect x="14" y="19" width="2" height="2" rx="0.3" fill="currentColor" stroke="none" />
    <rect x="19" y="19" width="2" height="2" rx="0.3" fill="currentColor" stroke="none" />
  </svg>
)

const IconVault = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

const IconSettings = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

const IconUser = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const IconHelp = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

const IconLogout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

export const AppRoot = () => {
  const { user, logout, isBootstrapping } = useAuth()
  const [route, setRoute] = useState<Route>('generator')

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
    <div className="lum-root">
      <aside className="lum-sidebar">
        <div className="sidebar-top">
          <button
            type="button"
            className={`sidebar-icon${route === 'generator' ? ' active' : ''}`}
            onClick={() => setRoute('generator')}
            title="Create"
          >
            <IconQR />
          </button>
          <button
            type="button"
            className={`sidebar-icon${route === 'history' ? ' active' : ''}`}
            onClick={() => setRoute('history')}
            title="Vault"
          >
            <IconVault />
          </button>
        </div>
        <div className="sidebar-bottom">
          <button type="button" className="sidebar-icon" title="Help">
            <IconHelp />
          </button>
          <button type="button" className="sidebar-icon" onClick={logout} title="Logout">
            <IconLogout />
          </button>
        </div>
      </aside>

      <div className="lum-main">
        <nav className="lum-topnav">
          <div className="topnav-logo">Luminescent QR</div>
          <div className="topnav-links">
            <button
              type="button"
              className={`topnav-link${route === 'generator' ? ' active' : ''}`}
              onClick={() => setRoute('generator')}
            >
              Create
            </button>
            <button
              type="button"
              className={`topnav-link${route === 'history' ? ' active' : ''}`}
              onClick={() => setRoute('history')}
            >
              Vault
            </button>
          </div>
          <div className="topnav-actions">
            <button type="button" className="topnav-icon-btn" title="Settings">
              <IconSettings />
            </button>
            <button type="button" className="topnav-icon-btn" title={user.email}>
              <IconUser />
            </button>
          </div>
        </nav>

        <div className="lum-page">
          {route === 'generator'
            ? <App />
            : <HistoryPage onBack={() => setRoute('generator')} />}
        </div>
      </div>
    </div>
  )
}
