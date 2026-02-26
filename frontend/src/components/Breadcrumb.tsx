import React from 'react'
import { Link, useLocation } from 'react-router-dom'

interface BreadcrumbItem {
  label: string
  path: string
}

const getBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = [{ label: 'Home', path: '/' }]

  let currentPath = ''
  segments.forEach((segment) => {
    currentPath += `/${segment}`
    const label = segment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

    breadcrumbs.push({ label, path: currentPath })
  })

  return breadcrumbs
}

export const Breadcrumb: React.FC = () => {
  const location = useLocation()
  const breadcrumbs = getBreadcrumbs(location.pathname)

  // Don't show breadcrumb on home page or auth pages
  if (
    location.pathname === '/' ||
    location.pathname === '/login' ||
    location.pathname === '/register'
  ) {
    return null
  }

  return (
    <nav aria-label="Breadcrumb" className="bg-gray-50 px-4 py-3 sm:px-6 lg:px-8 border-b border-gray-200">
      <ol className="flex items-center space-x-2 text-sm">
        {breadcrumbs.map((breadcrumb, index) => (
          <li key={breadcrumb.path} className="flex items-center">
            {index > 0 && <span className="text-gray-400 mx-2" aria-hidden="true">/</span>}
            {index === breadcrumbs.length - 1 ? (
              <span className="text-gray-900 font-medium" aria-current="page">{breadcrumb.label}</span>
            ) : (
              <Link
                to={breadcrumb.path}
                className="text-primary hover:text-opacity-80 transition-colors"
              >
                {breadcrumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
