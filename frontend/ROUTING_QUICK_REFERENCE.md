# Routing Quick Reference

## Route Map

| Path | Component | Auth Required | Description |
|------|-----------|---------------|-------------|
| `/login` | Login | ❌ | User login page |
| `/register` | Register | ❌ | User registration page |
| `/` | Dashboard | ✅ | Home/dashboard page |
| `/recipes` | RecipeList | ✅ | List all recipes |
| `/recipes/new` | RecipeForm | ✅ | Create new recipe |
| `/recipes/:id` | RecipeDetail | ✅ | View recipe details |
| `/recipes/:id/edit` | RecipeForm | ✅ | Edit recipe |
| `/inventory` | Placeholder | ✅ | Inventory management |
| `/costing` | Placeholder | ✅ | Costing & pricing |
| `/journal` | Placeholder | ✅ | Baking journal |

## Navigation Usage

### Link to a Route
```tsx
import { Link } from 'react-router-dom'

<Link to="/recipes">View Recipes</Link>
```

### Programmatic Navigation
```tsx
import { useNavigate } from 'react-router-dom'

const navigate = useNavigate()
navigate('/recipes')
```

### Get Current Route
```tsx
import { useLocation } from 'react-router-dom'

const location = useLocation()
console.log(location.pathname) // e.g., "/recipes/123"
```

## Component Structure

### Protected Page
```tsx
<ProtectedRoute>
  <Layout>
    <YourComponent />
  </Layout>
</ProtectedRoute>
```

### Public Page
```tsx
<YourComponent />
```

## Adding a New Route

1. Create component in `src/pages/`
2. Add to `src/router/routes.tsx`:
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
3. Add to navigation in `src/components/Navigation.tsx` if needed

## Mobile Breakpoints

- Mobile: < 768px (hamburger menu)
- Tablet: 768px - 1024px (full menu)
- Desktop: > 1024px (full menu)

## Colors

- Primary: `#FF6B35` (Orange)
- Secondary: `#004E89` (Blue)
- Accent: `#F7931E` (Gold)

## Common Tasks

### Check if User is Authenticated
```tsx
import { useAuth } from '../hooks/useAuth'

const { isAuthenticated } = useAuth()
```

### Get Current User
```tsx
const { currentUser } = useAuth()
console.log(currentUser?.display_name)
```

### Logout User
```tsx
const { logout } = useAuth()
logout()
```

### Check Active Route
```tsx
import { useLocation } from 'react-router-dom'

const location = useLocation()
const isActive = location.pathname === '/recipes'
```

## Testing Routes

```bash
# Run routing tests
npm run test -- router/routes.test.tsx

# Run all tests
npm run test

# Run tests in watch mode
npm run test -- --watch
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Routes not working | Run `npm install` to install dependencies |
| Protected routes not redirecting | Check `useAuth` hook configuration |
| Navigation not showing | Verify `Layout` wraps protected routes |
| Breadcrumbs not appearing | Check `Breadcrumb` is in `Layout` |
| Mobile menu not working | Check Tailwind CSS is properly configured |

## Files Reference

- Routes config: `src/router/routes.tsx`
- Protected route: `src/components/ProtectedRoute.tsx`
- Navigation: `src/components/Navigation.tsx`
- Breadcrumb: `src/components/Breadcrumb.tsx`
- Layout: `src/components/Layout.tsx`
- App: `src/App.tsx`

## Documentation

- Full guide: `ROUTING_GUIDE.md`
- Router README: `src/router/README.md`
- Implementation summary: `src/router/IMPLEMENTATION_SUMMARY.md`
