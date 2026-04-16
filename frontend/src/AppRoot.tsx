import { useState } from 'react'
import App from './App'
import { HistoryPage } from './pages/HistoryPage'
import { useAuth } from './hooks/useAuth'
import { AuthScreen } from './components/AuthScreen'

export type Route = 'generator' | 'history'

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
          <button type="button" className="nav-btn nav-btn-logout" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <main className="shell-body">
        {route === 'generator'
          ? <App />
          : <HistoryPage onBack={() => setRoute('generator')} />}
      </main>
    </div>
  )
}
