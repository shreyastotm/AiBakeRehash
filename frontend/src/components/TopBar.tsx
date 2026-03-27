import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Bell, LogOut, User, ChevronDown } from 'lucide-react'
import { cn } from '../utils/cn'
import { useAuth } from '../hooks/useAuth'

interface TopBarProps {
  sidebarCollapsed: boolean
}

// Map paths to page titles
const pageTitles: Record<string, string> = {
  '/':          'Dashboard',
  '/recipes':   'Recipes',
  '/inventory': 'Inventory',
  '/costing':   'Costing',
  '/journal':   'Journal',
  '/settings':  'Settings',
}

function getPageTitle(pathname: string): string {
  if (pathname === '/') return 'Dashboard'
  const key = Object.keys(pageTitles).find(k => k !== '/' && pathname.startsWith(k))
  return key ? pageTitles[key] : 'AiBake'
}

export const TopBar: React.FC<TopBarProps> = ({ sidebarCollapsed }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, logout, currentUser } = useAuth()
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const pageTitle = getPageTitle(location.pathname)

  const handleLogout = () => {
    logout()
    navigate('/login')
    setUserMenuOpen(false)
  }

  return (
    <header
      className={cn(
        'fixed top-0 right-0 h-16 bg-white border-b border-neutral-200 z-sticky',
        'flex items-center justify-between px-6 gap-4',
        'transition-all duration-slow ease-smooth',
        sidebarCollapsed ? 'left-16' : 'left-sidebar',
      )}
    >
      {/* Page title */}
      <h1 className="text-lg font-bold font-display text-neutral-900 truncate">
        {pageTitle}
      </h1>

      {/* Right actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Notification bell (placeholder) */}
        <button
          className="relative p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors touch-target"
          aria-label="Notifications"
        >
          <Bell size={20} aria-hidden="true" />
        </button>

        {/* User menu */}
        {isAuthenticated && (
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(prev => !prev)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg',
                'text-sm font-medium text-neutral-700',
                'hover:bg-neutral-100 transition-colors touch-target',
              )}
              aria-haspopup="true"
              aria-expanded={userMenuOpen}
              aria-label="User menu"
            >
              <div className="w-7 h-7 rounded-full gradient-brand flex items-center justify-center flex-shrink-0">
                <User size={14} className="text-white" aria-hidden="true" />
              </div>
              <span className="hidden sm:block max-w-[120px] truncate">
                {currentUser?.display_name ?? 'Baker'}
              </span>
              <ChevronDown
                size={14}
                className={cn('transition-transform duration-fast', userMenuOpen && 'rotate-180')}
                aria-hidden="true"
              />
            </button>

            {/* Dropdown */}
            {userMenuOpen && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-dropdown"
                  onClick={() => setUserMenuOpen(false)}
                  aria-hidden="true"
                />
                <div
                  className={cn(
                    'absolute right-0 top-full mt-1 w-52',
                    'bg-white rounded-xl shadow-lg border border-neutral-200',
                    'py-1 z-popover animate-scale-in',
                  )}
                  role="menu"
                  aria-label="User options"
                >
                  <div className="px-4 py-3 border-b border-neutral-100">
                    <p className="text-sm font-semibold text-neutral-900 truncate">
                      {currentUser?.display_name}
                    </p>
                    <p className="text-xs text-neutral-500 truncate">
                      {currentUser?.email}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5',
                      'text-sm text-error hover:bg-error-light',
                      'transition-colors min-h-[40px]',
                    )}
                    role="menuitem"
                  >
                    <LogOut size={16} aria-hidden="true" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
