# Frontend Routing Configuration

## Overview

The AiBake frontend uses React Router v6 with a centralized route configuration. All routes are defined in `routes.tsx` and imported into the main `App.tsx` component.

## Route Structure

### Public Routes (No Authentication Required)
- `/login` - User login page
- `/register` - User registration page

### Protected Routes (Authentication Required)
All protected routes are wrapped with the `ProtectedRoute` component and include the `Layout` component for consistent navigation and breadcrumbs.

#### Recipe Management
- `/` - Dashboard (home page)
- `/recipes` - Recipe list view
- `/recipes/new` - Create new recipe form
- `/recipes/:id` - View recipe details
- `/recipes/:id/edit` - Edit recipe form

#### Inventory Management
- `/inventory` - Inventory list and management (placeholder)

#### Costing & Pricing
- `/costing` - Costing and pricing calculator (placeholder)

#### Baking Journal
- `/journal` - Baking journal entries (placeholder)

## Components

### ProtectedRoute
Wraps protected routes to ensure user authentication. Redirects unauthenticated users to `/login`.

**Usage:**
```tsx
<ProtectedRoute>
  <Layout>
    <YourComponent />
  </Layout>
</ProtectedRoute>
```

### Layout
Provides consistent page structure with:
- Navigation bar (top)
- Breadcrumb navigation
- Main content area with max-width container

**Usage:**
```tsx
<Layout>
  <YourComponent />
</Layout>
```

### Navigation
Responsive navigation bar with:
- Logo and branding
- Desktop navigation menu
- Mobile hamburger menu
- User profile dropdown
- Logout button

**Features:**
- Active link highlighting
- Mobile-responsive design
- User display name
- Automatic menu closing on navigation

### Breadcrumb
Automatic breadcrumb navigation based on current route.

**Features:**
- Auto-generated from URL path
- Hidden on home and auth pages
- Clickable links to parent routes
- Current page highlighted

## Authentication Flow

1. User visits protected route
2. `ProtectedRoute` checks `isAuthenticated` from `useAuth` hook
3. If not authenticated, redirects to `/login`
4. If loading, shows loading spinner
5. If authenticated, renders protected content with layout

## Adding New Routes

To add a new protected route:

1. Create your page component in `frontend/src/pages/`
2. Add route to `routes.tsx`:

```tsx
{
  path: '/your-path',
  element: (
    <ProtectedRoute>
      <Layout>
        <YourComponent />
      </Layout>
    </ProtectedRoute>
  ),
}
```

3. Add navigation link in `Navigation.tsx` if needed:

```tsx
const navLinks = [
  // ... existing links
  { path: '/your-path', label: 'Your Label' },
]
```

## Mobile Responsiveness

- Desktop: Full navigation menu visible
- Tablet (768px+): Full navigation menu visible
- Mobile (<768px): Hamburger menu with collapsible navigation

## Styling

All components use Tailwind CSS with the AiBake color scheme:
- Primary: `#FF6B35` (Orange)
- Secondary: `#004E89` (Blue)
- Accent: `#F7931E` (Gold)

## Future Enhancements

- Add route-level code splitting for better performance
- Implement route guards for role-based access control
- Add transition animations between routes
- Implement scroll-to-top on route change
