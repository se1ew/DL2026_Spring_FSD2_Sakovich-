import { type FormEvent, useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export const AuthScreen = () => {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!email.trim() || !password) {
      setError('Введите email и пароль')
      return
    }

    setIsSubmitting(true)
    try {
      if (mode === 'login') {
        await login({ email, password })
      } else {
        await register({ email, password })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось выполнить действие')
    } finally {
      setIsSubmitting(false)
    }
  }

  const title = mode === 'login' ? 'Войдите в аккаунт' : 'Создайте аккаунт'
  const subtitle =
    mode === 'login'
      ? 'Используйте email и пароль, чтобы получить доступ к генератору.'
      : 'Регистрация займёт пару секунд, email нужен для идентификации.'

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <p className="eyebrow">Luminescent QR · Secure Access</p>
        <h1>{title}</h1>
        <p style={{ fontSize: '13px', color: 'var(--text)', marginTop: '-8px' }}>{subtitle}</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              placeholder="Min. 6 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn-generate" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait…' : mode === 'login' ? 'Access Vault' : 'Create Account'}
          </button>
        </form>

        <div className="auth-toggle">
          <span>{mode === 'login' ? 'No account?' : 'Already have an account?'}</span>
          <button type="button" onClick={() => setMode((prev) => (prev === 'login' ? 'register' : 'login'))}>
            {mode === 'login' ? 'Register' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  )
}
