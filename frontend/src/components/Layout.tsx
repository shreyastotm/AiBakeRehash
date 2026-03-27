import React, { useState } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { TimerWidget } from './common/TimerWidget'
import { cn } from '../utils/cn'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-toast focus:px-4 focus:py-2 focus:bg-primary-500 focus:text-white focus:rounded-lg focus:font-medium focus:outline-none focus:ring-2 focus:ring-primary-700"
      >
        Skip to main content
      </a>

      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(prev => !prev)}
      />

      {/* Top bar */}
      <TopBar sidebarCollapsed={sidebarCollapsed} />

      {/* Main content — offset by sidebar width + topbar height */}
      <main
        id="main-content"
        className={cn(
          'min-h-screen pt-16 transition-all duration-slow ease-smooth',
          sidebarCollapsed ? 'pl-16' : 'pl-sidebar',
        )}
      >
        <div className="page-container">
          {children}
        </div>
      </main>

      {/* Floating timer widget */}
      <TimerWidget />
    </div>
  )
}
