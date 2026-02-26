# AiBake Frontend Routing Implementation Guide

## Task 20.2: Setup Routing and Navigation

This document describes the implementation of React Router configuration with protected routes, navigation components, and breadcrumb navigation for the AiBake frontend.

## Requirements Met

- **Requirement 27.4**: Frontend application implements client-side routing for single-page application experience
- **Requirement 28.5**: Frontend application redirects unauthenticated users to the login page

## Implementation Overview

### Files Created

1. **`src/router/routes.tsx`** - Centralized route configuration
2. **`src/router/index.ts`** - Router exports
3. **`src/components/ProtectedRoute.tsx`** - Authentication guard component
4. **`src/components/Navigation.tsx`** - Responsive navigation bar
5. **`src/components/Breadcrumb.tsx`** - Automatic breadcrumb navigation
6. **`src/components/Layout.tsx`** - Page layout wrapper
7. **`src/App.tsx`** - Updated to use new routing configuration

### Files Modified

- **`src/App.tsx`** - Refactored to use centralized route configuration

## Component Details

### ProtectedRoute Component

**Purpose**: Guards protected routes and ensures user authentication

**Features**:
- Checks authentication status via `useAuth` hook
- Shows loading spinner while checking auth
- Redirects to `/login` if not authenticated
- Renders protected content if authenticated

**Usage**:
```tsx
<ProtectedRoute>
  <Layout>
    <YourComponent />
  </Layout>
</ProtectedRoute>
```

### Navigation Component

**Purpose**: Provides consistent navigation across the application

**Features**:
- Responsive design (desktop, tablet, mobile)
- Mobile hamburger menu
- Active link highlighting
- User profile display
- Logout functionality
- Logo and branding

**Navigation Links**:
- Dashboard (/)
- Recipes (/recipes)
- Inventory (/inventory)
- Costing (/costing)
- Journal (/journal)

**Mobile Behavior**:
- Hamburger menu on screens < 768px
- Collapsible navigation menu
- Auto-closes on navigation

### Breadcrumb Component

**Purpose**: Provides automatic breadcrumb navigation

**Features**:
- Auto-generated from URL path
- Clickable links to parent routes
- Current page highlighted
- Hidden on home and auth pages
- Formatted labels (kebab-case → Title Case)

**Example**:
- URL: `/recipes/123/edit` → Home / Recipes / 123 / Edit

### Layout Component

**Purpose**: Wraps protected pages with consistent structure

**Structure**:
```
Navigation (top)
Breadcrumb
Main Content (max-width container)
```

## Route Structure

### Public Routes (No Authentication)
```
/login          - User login
/register       - User registration
```

### Protected Routes (Authentication Required)
```
/                    - Dashboard
/recipes             - Recipe list
/recipes/new         - Create recipe
/recipes/:id         - View recipe
/recipes/:id/edit    - Edit recipe
/inventory           - Inventory management
/costing             - Costing & pricing
/journal             - Baking journal
```

### Special Routes
```
*                    - Catch-all (redirects to /)
```

## Authentication Flow

1. User visits protected route
2. `ProtectedRoute` component checks `isAuthenticated`
3. If not authenticated:
   - Redirects to `/login`
4. If loading:
   - Shows loading spinner
5. If authenticated:
   - Renders protected content with layout

## Styling

All components use Tailwind CSS with AiBake color scheme:

- **Primary**: `#FF6B35` (Orange) - Main brand color
- **Secondary**: `#004E89` (Blue) - Secondary actions
- **Accent**: `#F7931E` (Gold) - Highlights

### Responsive Breakpoints

- Mobile: < 768px (md breakpoint)
- Tablet: 768px - 1024px
- Desktop: > 1024px

## Adding New Routes

### Step 1: Create Page Component
```tsx
// src/pages/your-feature/YourPage.tsx
export const YourPage: React.FC = () => {
  return <div>Your content</div>
}
```

### Step 2: Add Route to routes.tsx
```tsx
{
  path: '/your-path',
  element: (
    <ProtectedRoute>
      <Layout>
        <YourPage />
      </Layout>
    </ProtectedRoute>
  ),
}
```

### Step 3: Add Navigation Link (if needed)
```tsx
// In Navigation.tsx navLinks array
{ path: '/your-path', label: 'Your Label' }
```

## Testing

Run routing tests:
```bash
npm run test -- router/routes.test.tsx
```

Test coverage includes:
- All required routes are defined
- Catch-all route exists
- Correct number of routes

## Performance Considerations

### Current Implementation
- All routes loaded upfront
- No code splitting

### Future Enhancements
- Implement route-level code splitting with `React.lazy()`
- Add route transition animations
- Implement scroll-to-top on route change
- Add route-level error boundaries

## Mobile Optimization

### Navigation
- Hamburger menu on mobile
- Touch-friendly button sizes (min 44x44px)
- Collapsible menu closes on navigation

### Breadcrumb
- Hidden on mobile for space
- Visible on tablet and desktop

### Layout
- Responsive padding and margins
- Mobile-first design
- Touch-optimized spacing

## Accessibility Features

- Semantic HTML structure
- ARIA labels for mobile menu button
- Keyboard navigation support
- Focus management
- Screen reader friendly

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Android)

## Troubleshooting

### Issue: Routes not working
**Solution**: Ensure `npm install` has been run to install dependencies

### Issue: Protected routes not redirecting
**Solution**: Check that `useAuth` hook is properly configured and returns `isAuthenticated`

### Issue: Navigation not showing
**Solution**: Verify `Layout` component is wrapping protected routes

### Issue: Breadcrumbs not appearing
**Solution**: Check that `Breadcrumb` component is included in `Layout`

## Future Enhancements

1. **Role-Based Access Control**: Add role checking to protected routes
2. **Route Animations**: Add page transition animations
3. **Lazy Loading**: Implement code splitting for better performance
4. **Error Boundaries**: Add error handling for route components
5. **Analytics**: Track page views and navigation patterns
6. **Deep Linking**: Support deep links with state restoration
7. **Offline Support**: Cache routes for offline access
