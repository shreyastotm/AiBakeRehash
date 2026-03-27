import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UtensilsCrossed, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { validateEmail } from '../../utils/validation'
import { cn } from '../../utils/cn'

export const Login: React.FC = () => {
  const navigate = useNavigate()
  const { loginAsync, isLoginLoading } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({})

  const validate = (): boolean => {
    const next: typeof errors = {}
    if (!email) next.email = 'Email is required'
    else if (!validateEmail(email)) next.email = 'Enter a valid email address'
    if (!password) next.password = 'Password is required'
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
      const message = err instanceof Error ? err.message : 'Login failed. Please check your credentials.'
      setErrors({ form: message })
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Brand panel (left, hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden gradient-brand flex-col items-center justify-center p-12">
        <div className="relative z-10 text-center text-white max-w-md">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <UtensilsCrossed size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-black font-display mb-4">AiBake</h1>
          <p className="text-xl text-primary-100 font-medium mb-6">
            Your professional baking companion
          </p>
          <p className="text-primary-100/80 text-sm leading-relaxed">
            Manage recipes, track inventory, calculate costs, and keep a baking journal — all in one place.
          </p>
        </div>
        {/* Decorative circles */}
        <div className="absolute -left-16 -top-16 w-64 h-64 rounded-full bg-white/10" aria-hidden="true" />
        <div className="absolute -right-16 -bottom-16 w-80 h-80 rounded-full bg-white/5" aria-hidden="true" />
      </div>

      {/* ── Form panel (right) ── */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center">
              <UtensilsCrossed size={20} className="text-white" />
            </div>
            <span className="text-xl font-black font-display text-neutral-900">AiBake</span>
          </div>

          <h2 className="text-2xl font-bold font-display text-neutral-900 mb-1">
            Welcome back
          </h2>
          <p className="text-neutral-500 text-sm mb-8">
            Sign in to your baker's workspace
          </p>

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
              label="Email address"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              error={errors.email}
              autoComplete="email"
              placeholder="you@example.com"
              leftIcon={<Mail size={16} />}
            />
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              error={errors.password}
              autoComplete="current-password"
              placeholder="••••••••"
              leftIcon={<Lock size={16} />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="pointer-events-auto text-neutral-400 hover:text-neutral-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isLoginLoading}
            >
              Sign in
            </Button>
          </form>

          <p className="text-center text-sm text-neutral-500 mt-6">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-semibold text-primary-500 hover:text-primary-600 transition-colors"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
