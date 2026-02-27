import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { Card } from '../../components/common/Card'
import { validateEmail } from '../../utils/validation'

export const Login = () => {
  const navigate = useNavigate()
  const { loginAsync, isLoginLoading } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({})

  const validate = (): boolean => {
    const next: typeof errors = {}
    if (!email) {
      next.email = 'Email is required'
    } else if (!validateEmail(email)) {
      next.email = 'Please enter a valid email address'
    }
    if (!password) {
      next.password = 'Password is required'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      await loginAsync({ email, password })
      navigate('/dashboard')
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Login failed. Please check your credentials.'
      setErrors({ form: message })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50 px-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-amber-800">🍞 AiBake</h1>
          <p className="text-gray-500 mt-1">Welcome back, baker!</p>
        </div>

        {errors.form && (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 text-sm">
            {errors.form}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            autoComplete="email"
            placeholder="you@example.com"
            disabled={isLoginLoading}
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            autoComplete="current-password"
            placeholder="Your password"
            disabled={isLoginLoading}
          />

          <Button type="submit" className="w-full" loading={isLoginLoading} disabled={isLoginLoading}>
            {isLoginLoading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>

        <p className="text-center mt-4 text-gray-600 text-sm">
          Don't have an account?{' '}
          <Link to="/register" className="text-amber-700 font-medium hover:underline">
            Create one here
          </Link>
        </p>
      </Card>
    </div>
  )
}
