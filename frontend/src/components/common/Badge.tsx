import React from 'react'
import { cn } from '../../utils/cn'

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'draft'
  | 'active'
  | 'archived'

export interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  size?: 'sm' | 'md'
  dot?: boolean
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  default:  'bg-neutral-100  text-neutral-700',
  primary:  'bg-primary-100  text-primary-700',
  success:  'bg-success-light text-success-dark',
  warning:  'bg-warning-light text-warning-dark',
  danger:   'bg-error-light   text-error-dark',
  info:     'bg-info-light    text-info-dark',
  draft:    'bg-neutral-100  text-neutral-500',
  active:   'bg-success-light text-success-dark',
  archived: 'bg-warning-light text-warning-dark',
}

const dotColors: Record<BadgeVariant, string> = {
  default:  'bg-neutral-400',
  primary:  'bg-primary-500',
  success:  'bg-success',
  warning:  'bg-warning',
  danger:   'bg-error',
  info:     'bg-info',
  draft:    'bg-neutral-400',
  active:   'bg-success',
  archived: 'bg-warning',
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  dot = false,
  className,
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 font-medium rounded-full',
      variantClasses[variant],
      sizeClasses[size],
      className,
    )}
  >
    {dot && (
      <span
        className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotColors[variant])}
        aria-hidden="true"
      />
    )}
    {children}
  </span>
)
