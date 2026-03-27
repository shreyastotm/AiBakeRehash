import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UtensilsCrossed, User, Mail, Lock, Eye, EyeOff, Check, BookOpen, Calculator, PenLine, Package } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { validateEmail, validatePassword } from '../../utils/validation'
import { cn } from '../../utils/cn'

interface FormErrors {
  displayName?: string
  email?: string
  password?: string
  confirmPassword?: string
  form?: string
}

const features = [
  { Icon: BookOpen, text: 'Organise and scale recipes effortlessly' },
  { Icon: Calculator, text: 'Calculate costs and pricing automatically' },
  { Icon: PenLine, text: 'Log every baking session and improve' },
  { Icon: Package, text: 'Track ingredient inventory in real time' },
]

export const Register: React.FC = () => {
  const navigate = useNavigate()
  const { registerAsync, isRegisterLoading } = useAuth()

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
    <div className="min-h-screen flex">
      {/* LEFT — Brand panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-brand flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -left-16 -top-16 w-64 h-64 rounded-full bg-white/10" aria-hidden="true" />
        <div className="absolute -right-16 -bottom-16 w-80 h-80 rounded-full bg-white/5" aria-hidden="true" />

        <div className="relative z-10 text-center text-white max-w-sm">
          <div className="inline-flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
              <UtensilsCrossed size={26} className="text-white" />
            </div>
            <span className="text-2xl font-bold font-display">AiBake</span>
          </div>
          <h2 className="text-2xl font-bold font-display mb-3">Start baking smarter</h2>
          <p className="text-white/75 text-sm mb-8">
            Join bakers who manage their recipes and track their progress professionally.
          </p>
          <div className="space-y-3 text-left">
            {features.map(({ Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Icon size={16} className="text-white" />
                </div>
                <span className="text-sm text-white/90">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT — Form panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-white overflow-y-auto">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center">
              <UtensilsCrossed size={20} className="text-white" />
            </div>
            <span className="text-xl font-black font-display text-neutral-900">AiBake</span>
          </div>

          <h2 className="text-2xl font-bold font-display text-neutral-900 mb-1">
            Create your account
          </h2>
          <p className="text-neutral-500 text-sm mb-8">Join thousands of bakers</p>

          {errors.form && (
            <div
              role="alert"
              className="bg-error-light border border-error/30 text-error-dark px-4 py-3 rounded-lg mb-6 text-sm"
            >
              {errors.form}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="Display name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              error={errors.displayName}
              autoComplete="name"
              placeholder="Your name"
              leftIcon={<User size={16} />}
              disabled={isRegisterLoading}
            />

            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              autoComplete="email"
              placeholder="you@example.com"
              leftIcon={<Mail size={16} />}
              disabled={isRegisterLoading}
            />

            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                error={errors.password}
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                leftIcon={<Lock size={16} />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="pointer-events-auto text-neutral-400 hover:text-neutral-600 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                disabled={isRegisterLoading}
              />
              {passwordHints.length > 0 && !errors.password && (
                <ul className="text-xs space-y-1 text-neutral-500 mt-2" aria-label="Password requirements">
                  {passwordHints.map((h) => (
                    <li key={h} className="flex items-center gap-1.5">
                      <Check size={10} className="text-success flex-shrink-0" />
                      {h}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Input
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirmPassword}
              autoComplete="new-password"
              placeholder="Repeat your password"
              leftIcon={<Lock size={16} />}
              disabled={isRegisterLoading}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isRegisterLoading}
            >
              Create account
            </Button>
          </form>

          <p className="text-center text-sm text-neutral-500 mt-6">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-primary-500 hover:text-primary-600 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
