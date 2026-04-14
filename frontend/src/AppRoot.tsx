import { useMemo, useState } from 'react'
import App from './App'
import { HistoryPage } from './pages/HistoryPage'
import { useAuth } from './hooks/useAuth'
import { AuthScreen } from './components/AuthScreen'

export type Route = 'generator' | 'history'

export const AppRoot = () => {
  const { user, logout, isBootstrapping } = useAuth()
  const [route, setRoute] = useState<Route>('generator')

  const navItems: Array<{ id: Route; label: string }> = useMemo(
    () => [
      { id: 'generator', label: 'Генератор' },
      { id: 'history', label: 'История' },
    ],
    [],
  )

  if (isBootstrapping) {
    return (
      <div className="auth-screen">
        <div className="auth-card loading">
          <p className="eyebrow">QR LAB</p>
          <h1>Загружаем сессию…</h1>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthScreen />
  }

  return (
    <>
      <div className="app-nav">
        <div className="logo">QR LAB</div>
        <nav>
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={route === item.id ? 'active' : ''}
              onClick={() => setRoute(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="nav-user">
          <span>{user.email}</span>
          <button type="button" className="ghost" onClick={logout}>
            Выйти
          </button>
        </div>
      </div>
      {route === 'generator' ? <App /> : <HistoryPage onBack={() => setRoute('generator')} />}
    </>
  )
}
