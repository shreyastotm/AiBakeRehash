import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { Card } from '../../components/common/Card'
import { validateEmail, validatePassword } from '../../utils/validation'

interface FormErrors {
  displayName?: string
  email?: string
  password?: string
  confirmPassword?: string
  form?: string
}

export const Register = () => {
  const navigate = useNavigate()
  const { registerAsync, isRegisterLoading } = useAuth()

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [passwordHints, setPasswordHints] = useState<string[]>([])

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    const { errors: hints } = validatePassword(value)
    setPasswordHints(hints)
  }

  const validate = (): boolean => {
    const next: FormErrors = {}

    if (!displayName.trim()) {
      next.displayName = 'Display name is required'
    }

    if (!email) {
      next.email = 'Email is required'
    } else if (!validateEmail(email)) {
      next.email = 'Please enter a valid email address'
    }

    const pwValidation = validatePassword(password)
    if (!password) {
      next.password = 'Password is required'
    } else if (!pwValidation.valid) {
      next.password = pwValidation.errors[0]
    }

    if (!confirmPassword) {
      next.confirmPassword = 'Please confirm your password'
    } else if (password !== confirmPassword) {
      next.confirmPassword = 'Passwords do not match'
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      await registerAsync({ email, display_name: displayName.trim(), password })
      navigate('/dashboard')
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Registration failed. Please try again.'
      setErrors({ form: message })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50 px-4 py-8">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-amber-800">🍞 AiBake</h1>
          <p className="text-gray-500 mt-1">Create your baker's account</p>
        </div>

        {errors.form && (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 text-sm">
            {errors.form}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Display Name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            error={errors.displayName}
            autoComplete="name"
            placeholder="Your name"
            disabled={isRegisterLoading}
          />

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            autoComplete="email"
            placeholder="you@example.com"
            disabled={isRegisterLoading}
          />

          <div>
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              error={errors.password}
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              disabled={isRegisterLoading}
              hint="Must be 8+ characters with uppercase, lowercase, and a number"
            />
            {passwordHints.length > 0 && !errors.password && (
              <ul className="text-amber-700 text-xs mt-1 space-y-0.5" aria-label="Password requirements">
                {passwordHints.map((hint, i) => (
                  <li key={i}>• {hint}</li>
                ))}
              </ul>
            )}
          </div>

          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
            autoComplete="new-password"
            placeholder="Repeat your password"
            disabled={isRegisterLoading}
          />

          <Button type="submit" className="w-full" loading={isRegisterLoading} disabled={isRegisterLoading}>
            {isRegisterLoading ? 'Creating account…' : 'Create Account'}
          </Button>
        </form>

        <p className="text-center mt-4 text-gray-600 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-amber-700 font-medium hover:underline">
            Sign in here
          </Link>
        </p>
      </Card>
    </div>
  )
}
