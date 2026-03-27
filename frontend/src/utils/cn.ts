/**
 * cn — Class Name utility
 *
 * Merges Tailwind CSS classes safely:
 *  - clsx  → filters falsy values and flattens arrays
 *  - twMerge → resolves Tailwind conflicts (e.g. two bg-* classes)
 *
 * Usage:
 *   cn('px-4 py-2', isActive && 'bg-primary-500', className)
 */
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
