import React from 'react'
import { cn } from '../../utils/cn'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'rect' | 'circle'
  width?: string | number
  height?: string | number
  lines?: number
}

const SkeletonBase: React.FC<{ className?: string; style?: React.CSSProperties }> = ({
  className,
  style,
}) => (
  <div
    className={cn('skeleton', className)}
    style={style}
    aria-hidden="true"
  />
)

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rect',
  width,
  height,
  lines = 1,
}) => {
  const style: React.CSSProperties = {
    width:  width  !== undefined ? (typeof width  === 'number' ? `${width}px`  : width)  : undefined,
    height: height !== undefined ? (typeof height === 'number' ? `${height}px` : height) : undefined,
  }

  if (variant === 'circle') {
    return <SkeletonBase className={cn('rounded-full', className)} style={style} />
  }

  if (variant === 'text') {
    return (
      <div className="space-y-2" role="status" aria-label="Loading content">
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonBase
            key={i}
            className={cn('h-4', i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full', className)}
          />
        ))}
      </div>
    )
  }

  return (
    <div role="status" aria-label="Loading content" style={style}>
      <SkeletonBase className={cn('w-full h-full', className)} />
    </div>
  )
}

export const RecipeCardSkeleton: React.FC = () => (
  <div className="card p-4 space-y-3" role="status" aria-label="Loading recipe">
    <Skeleton variant="rect" className="h-40 w-full rounded-lg" />
    <Skeleton variant="text" lines={2} />
    <div className="flex gap-2">
      <Skeleton variant="rect" className="h-6 w-16 rounded-full" />
      <Skeleton variant="rect" className="h-6 w-16 rounded-full" />
    </div>
  </div>
)

export const StatCardSkeleton: React.FC = () => (
  <div className="stat-card" role="status" aria-label="Loading stat">
    <Skeleton variant="circle" width={48} height={48} />
    <div className="flex-1 space-y-2">
      <Skeleton variant="rect" className="h-8 w-16" />
      <Skeleton variant="rect" className="h-4 w-24" />
    </div>
  </div>
)
