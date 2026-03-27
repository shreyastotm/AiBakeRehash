import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../utils/cn'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
  children: React.ReactNode
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:   'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 shadow-primary-sm focus:ring-primary-500',
  secondary: 'bg-secondary-500 text-white hover:bg-secondary-600 active:bg-secondary-700 focus:ring-secondary-500',
  accent:    'bg-accent-500 text-white hover:bg-accent-600 active:bg-accent-700 focus:ring-accent-500',
  outline:   'border-2 border-primary-500 text-primary-500 bg-transparent hover:bg-primary-50 active:bg-primary-100 focus:ring-primary-500',
  ghost:     'bg-transparent text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200 focus:ring-neutral-400',
  danger:    'bg-error text-white hover:bg-red-700 active:bg-red-800 focus:ring-red-500',
}

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  xs: 'px-2.5 py-1.5 text-xs min-h-[32px] gap-1',
  sm: 'px-3 py-2 text-sm min-h-[36px] gap-1.5',
  md: 'px-4 py-2.5 text-sm min-h-[40px] gap-2',
  lg: 'px-5 py-3 text-base min-h-[44px] gap-2',
  xl: 'px-6 py-3.5 text-lg min-h-[52px] gap-2',
}

const base =
  'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-fast ' +
  'focus:outline-none focus:ring-2 focus:ring-offset-2 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed select-none'

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'lg',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  className,
  disabled,
  ...props
}, ref) => (
  <button
    ref={ref}
    className={cn(
      base,
      variantClasses[variant],
      sizeClasses[size],
      fullWidth && 'w-full',
      className,
    )}
    disabled={disabled || loading}
    {...props}
  >
    {loading
      ? <Loader2 className="animate-spin" size={16} aria-hidden="true" />
      : leftIcon
    }
    {children}
    {!loading && rightIcon}
  </button>
))

Button.displayName = 'Button'
