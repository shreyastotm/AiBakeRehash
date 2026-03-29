import React from 'react'
import { FolderOpen } from 'lucide-react'
import { cn } from '../../utils/cn'
import { Button } from './Button'

interface EmptyStateAction {
  label: string
  onClick: () => void
  icon?: React.ReactNode
}

interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: EmptyStateAction
  secondaryAction?: EmptyStateAction
  actionNode?: React.ReactNode
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  secondaryAction,
  actionNode,
  className,
}) => (
  <div
    className={cn('empty-state', className)}
    role="status"
    aria-label={title}
  >
    <div className="empty-state-icon">
      {icon ?? <FolderOpen size={28} className="text-neutral-400" aria-hidden="true" />}
    </div>
    <p className="empty-state-title">{title}</p>
    {description && (
      <p className="empty-state-description mt-1">{description}</p>
    )}
    {(action || secondaryAction || actionNode) && (
      <div className="flex flex-col sm:flex-row items-center gap-3 mt-6">
        {actionNode}
        {action && (
          <Button
            variant="primary"
            size="md"
            leftIcon={action.icon}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button
            variant="ghost"
            size="md"
            leftIcon={secondaryAction.icon}
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.label}
          </Button>
        )}
      </div>
    )}
  </div>
)
