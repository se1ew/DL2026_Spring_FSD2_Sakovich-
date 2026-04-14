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
        <p className="eyebrow">QR LAB · Secure Access</p>
        <h1>{title}</h1>
        <p className="lede">{subtitle}</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>Пароль</span>
            <input
              type="password"
              placeholder="Минимум 6 символов"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="auth-toggle">
          <span>{mode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}</span>
          <button type="button" onClick={() => setMode((prev) => (prev === 'login' ? 'register' : 'login'))}>
            {mode === 'login' ? 'Создать' : 'Войти'}
          </button>
        </div>
      </div>
    </div>
  )
}
