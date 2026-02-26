import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Button } from './common/Button'

export const Navigation: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, logout, currentUser } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
    setIsMenuOpen(false)
  }

  const isActive = (path: string) => location.pathname === path

  const navLinks = [
    { path: '/', label: 'Dashboard' },
    { path: '/recipes', label: 'Recipes' },
    { path: '/inventory', label: 'Inventory' },
    { path: '/costing', label: 'Costing' },
    { path: '/journal', label: 'Journal' },
  ]

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2" aria-label="AiBake home">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center" aria-hidden="true">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="text-xl font-bold text-gray-900 hidden sm:inline">AiBake</span>
          </Link>

          {/* Desktop Navigation */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center space-x-1" role="list">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  role="listitem"
                  aria-current={isActive(link.path) ? 'page' : undefined}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(link.path)
                      ? 'bg-primary bg-opacity-10 text-primary'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* Right side - User menu and mobile toggle */}
          <div className="flex items-center space-x-4">
            {isAuthenticated && (
              <div className="hidden sm:flex items-center space-x-2">
                <span className="text-sm text-gray-700" aria-label={`Signed in as ${currentUser?.display_name}`}>
                  {currentUser?.display_name}
                </span>
                <Button
                  onClick={handleLogout}
                  variant="secondary"
                  size="sm"
                >
                  Logout
                </Button>
              </div>
            )}

            {!isAuthenticated && (
              <div className="hidden sm:flex items-center space-x-2">
                <Link to="/login">
                  <Button variant="secondary" size="sm">
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">
                    Register
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100 min-h-[44px] min-w-[44px]"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
              aria-label={isMenuOpen ? 'Close main menu' : 'Open main menu'}
            >
              <span className="sr-only">{isMenuOpen ? 'Close main menu' : 'Open main menu'}</span>
              {isMenuOpen ? (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div id="mobile-menu" className="md:hidden pb-4">
            {isAuthenticated && (
              <>
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsMenuOpen(false)}
                    aria-current={isActive(link.path) ? 'page' : undefined}
                    className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      isActive(link.path)
                        ? 'bg-primary bg-opacity-10 text-primary'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="px-3 py-2 border-t border-gray-200 mt-2 pt-2">
                  <p className="text-sm text-gray-700 mb-2">{currentUser?.display_name}</p>
                  <Button
                    onClick={handleLogout}
                    variant="secondary"
                    size="sm"
                    className="w-full"
                  >
                    Logout
                  </Button>
                </div>
              </>
            )}

            {!isAuthenticated && (
              <div className="space-y-2 px-3 py-2">
                <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="secondary" size="sm" className="w-full">
                    Login
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setIsMenuOpen(false)}>
                  <Button size="sm" className="w-full">
                    Register
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
