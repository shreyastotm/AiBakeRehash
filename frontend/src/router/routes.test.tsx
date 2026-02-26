import { describe, it, expect } from 'vitest'
import { routes } from './routes'

describe('Router Configuration', () => {
  it('should have all required routes defined', () => {
    const routePaths = routes
      .map((route) => route.path)
      .filter((path) => path !== '*')

    expect(routePaths).toContain('/login')
    expect(routePaths).toContain('/register')
    expect(routePaths).toContain('/')
    expect(routePaths).toContain('/recipes')
    expect(routePaths).toContain('/recipes/new')
    expect(routePaths).toContain('/recipes/:id')
    expect(routePaths).toContain('/recipes/:id/edit')
    expect(routePaths).toContain('/inventory')
    expect(routePaths).toContain('/costing')
    expect(routePaths).toContain('/journal')
  })

  it('should have a catch-all route for 404s', () => {
    const catchAllRoute = routes.find((route) => route.path === '*')
    expect(catchAllRoute).toBeDefined()
  })

  it('should have correct number of routes', () => {
    expect(routes.length).toBe(11) // 10 named routes + 1 catch-all
  })
})
