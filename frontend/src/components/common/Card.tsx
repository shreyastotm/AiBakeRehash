import React from 'react'
import { cn } from '../../utils/cn'

export interface CardProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'elevated' | 'flat' | 'brand'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  interactive?: boolean
  onClick?: () => void
  as?: 'div' | 'article' | 'section' | 'li'
  'aria-label'?: string
  'data-testid'?: string
}

const variantClasses: Record<NonNullable<CardProps['variant']>, string> = {
  default:  'card',
  elevated: 'card-elevated',
  flat:     'card-flat',
  brand:    'card-brand',
}

const paddingClasses: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm:   'p-4',
  md:   'p-6',
  lg:   'p-8',
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(({
  children,
  className,
  variant = 'default',
  padding = 'md',
  interactive,
  onClick,
  as: Tag = 'div',
  'aria-label': ariaLabel,
  'data-testid': testId,
}, ref) => {
  const isInteractive = interactive || !!onClick

  return (
    // @ts-expect-error — polymorphic as prop
    <Tag
      ref={ref}
      className={cn(
        variantClasses[variant],
        paddingClasses[padding],
        isInteractive && 'card-interactive',
        className,
      )}
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={ariaLabel}
      data-testid={testId}
      onKeyDown={
        isInteractive && onClick
          ? (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
    >
      {children}
    </Tag>
  )
})

Card.displayName = 'Card'
