import { useMemo, useState } from 'react'
import App from './App'
import { HistoryPage } from './pages/HistoryPage'

export type Route = 'generator' | 'history'

export const AppRoot = () => {
  const [route, setRoute] = useState<Route>('generator')

  const navItems: Array<{ id: Route; label: string }> = useMemo(
    () => [
      { id: 'generator', label: 'Генератор' },
      { id: 'history', label: 'История' },
    ],
    [],
  )

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
      </div>
      {route === 'generator' ? <App /> : <HistoryPage onBack={() => setRoute('generator')} />}
    </>
  )
}
