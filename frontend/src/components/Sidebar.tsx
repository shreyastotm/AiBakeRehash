import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, Package, Calculator,
  BookMarked, Settings, ChevronLeft, ChevronRight,
  UtensilsCrossed,
} from 'lucide-react'
import { cn } from '../utils/cn'

interface NavItem {
  path: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

const navItems: NavItem[] = [
  { path: '/',          label: 'Dashboard', icon: LayoutDashboard },
  { path: '/recipes',   label: 'Recipes',   icon: BookOpen },
  { path: '/inventory', label: 'Inventory', icon: Package },
  { path: '/costing',   label: 'Costing',   icon: Calculator },
  { path: '/journal',   label: 'Journal',   icon: BookMarked },
  { path: '/settings',  label: 'Settings',  icon: Settings },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const location = useLocation()

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full flex flex-col bg-secondary-900 text-white z-fixed',
        'sidebar-transition',
        collapsed ? 'w-16' : 'w-sidebar',
      )}
      aria-label="Main navigation sidebar"
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-16 px-4 border-b border-secondary-700 flex-shrink-0',
        collapsed ? 'justify-center' : 'gap-3',
      )}>
        <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center flex-shrink-0">
          <UtensilsCrossed size={18} className="text-white" aria-hidden="true" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold font-display text-white tracking-tight">
            AiBake
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 scrollbar-hide" aria-label="Sidebar navigation">
        <ul className="space-y-1 px-2" role="list">
          {navItems.map(({ path, label, icon: Icon }) => {
            const active = isActive(path)
            return (
              <li key={path}>
                <Link
                  to={path}
                  aria-current={active ? 'page' : undefined}
                  title={collapsed ? label : undefined}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                    'transition-all duration-fast group relative',
                    'min-h-[44px]',
                    active
                      ? 'bg-primary-500 text-white shadow-primary-sm'
                      : 'text-secondary-200 hover:bg-secondary-700 hover:text-white',
                    collapsed && 'justify-center px-2',
                  )}
                >
                  <Icon
                    size={20}
                    className={cn(
                      'flex-shrink-0 transition-colors',
                      active ? 'text-white' : 'text-secondary-300 group-hover:text-white',
                    )}
                    aria-hidden="true"
                  />
                  {!collapsed && (
                    <span className="truncate">{label}</span>
                  )}
                  {/* Tooltip on collapsed */}
                  {collapsed && (
                    <div
                      className={cn(
                        'absolute left-full ml-2 px-2 py-1 bg-neutral-800 text-white text-xs',
                        'rounded whitespace-nowrap opacity-0 group-hover:opacity-100',
                        'pointer-events-none transition-opacity duration-fast z-tooltip',
                        'shadow-lg',
                      )}
                      role="tooltip"
                    >
                      {label}
                    </div>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Collapse toggle */}
      <div className="p-3 border-t border-secondary-700 flex-shrink-0">
        <button
          onClick={onToggle}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg',
            'text-secondary-300 hover:bg-secondary-700 hover:text-white',
            'transition-all duration-fast text-sm font-medium min-h-[44px]',
            collapsed && 'justify-center',
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <ChevronRight size={18} aria-hidden="true" />
            : (
              <>
                <ChevronLeft size={18} aria-hidden="true" />
                <span>Collapse</span>
              </>
            )
          }
        </button>
      </div>
    </aside>
  )
}
