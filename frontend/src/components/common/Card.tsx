import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  onClick?: () => void
  as?: 'div' | 'article' | 'section'
  'aria-label'?: string
}

const paddings = {
  none: '',
  sm: 'p-3',
  md: 'p-6',
  lg: 'p-8',
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  onClick,
  as: Tag = 'div',
  'aria-label': ariaLabel,
}) => {
  const interactive = !!onClick
  return (
    <Tag
      className={`bg-white rounded-lg shadow-md ${paddings[padding]} ${
        interactive ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''
      } ${className}`}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={ariaLabel}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
    >
      {children}
    </Tag>
  )
}
