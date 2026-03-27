# Prompt 03 — Layout & Navigation

## Objective
Replace the current top-nav-only layout with a professional **sidebar + top-bar** layout that is:
- Collapsible (full labels ↔ icon-only) with persistent state in localStorage
- Responsive (mobile: drawer overlay; desktop: persistent sidebar)
- Branded with the primary color scheme
- Accessible with keyboard navigation and ARIA roles

**Prerequisite**: Prompts 01 and 02 complete.

---

## Files to Modify / Create

| File | Action |
|------|--------|
| `frontend/src/components/Layout.tsx` | Rewrite |
| `frontend/src/components/Navigation.tsx` | Repurpose → `MobileNav` drawer only |
| `frontend/src/components/Sidebar.tsx` | **Create** |
| `frontend/src/components/TopBar.tsx` | **Create** |
| `frontend/src/components/Breadcrumb.tsx` | Update to use new layout context |

---

## Architecture

```
<Layout>
  ├── <Sidebar />              — Desktop: left column (256px expanded / 64px collapsed)
  │    ├── Logo area
  │    ├── Nav items (with icons)
  │    ├── Collapse toggle
  │    └── User section (bottom)
  ├── <div className="flex-1 flex flex-col">
  │    ├── <TopBar />           — Sticky top: page title, search, notifications, user
  │    └── <main>
  │         ├── <Breadcrumb />
  │         └── {children}
  └── <TimerWidget />          — Floating bottom-right
```

On mobile (`< md`): Sidebar is hidden; TopBar has a hamburger that opens a `<MobileNav>` drawer overlay.

---

## Sidebar.tsx — Full Specification

### Nav Items
```ts
const NAV_ITEMS = [
  { path: '/',          label: 'Dashboard',  icon: LayoutDashboard },
  { path: '/recipes',   label: 'Recipes',    icon: BookOpen,        badge?: number },
  { path: '/inventory', label: 'Inventory',  icon: Package,         badge?: 'alert' },
  { path: '/costing',   label: 'Costing',    icon: Calculator },
  { path: '/journal',   label: 'Journal',    icon: NotebookPen },
  { path: '/settings',  label: 'Settings',   icon: Settings2 },
]
```
(All icons from `lucide-react`)

### Sidebar Styles
```tsx
// Outer sidebar container
<aside
  className={cn(
    'hidden md:flex flex-col h-screen sticky top-0',
    'bg-secondary-900 text-white',
    'transition-all duration-slow ease-smooth',
    isCollapsed ? 'w-16' : 'w-sidebar',
    'shrink-0 border-r border-secondary-800'
  )}
>
```

### Logo Area
```tsx
<div className="h-topbar flex items-center px-4 border-b border-secondary-800 shrink-0">
  {/* Icon always visible */}
  <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center shrink-0">
    <ChefHat size={18} className="text-white" />
  </div>
  {/* Name only when expanded */}
  {!isCollapsed && (
    <span className="ml-3 text-lg font-bold font-display text-white truncate">
      AiBake
    </span>
  )}
</div>
```

### Nav Item
Each nav link:
```tsx
<Link
  to={item.path}
  className={cn(
    'flex items-center gap-3 px-3 py-2.5 rounded-lg mx-2 my-0.5',
    'text-secondary-300 hover:bg-secondary-800 hover:text-white',
    'transition-colors duration-fast group touch-target',
    isActive && 'bg-primary-500 text-white shadow-primary-sm hover:bg-primary-600'
  )}
>
  <item.icon size={20} className="shrink-0" />
  {!isCollapsed && (
    <span className="text-sm font-medium truncate">{item.label}</span>
  )}
  {!isCollapsed && item.badge && (
    <Badge variant={item.badge === 'alert' ? 'warning' : 'primary'} className="ml-auto text-xs">
      {item.badge}
    </Badge>
  )}
</Link>
```

### Collapse Toggle (bottom of nav section, above user area)
```tsx
<button
  onClick={() => setIsCollapsed(!isCollapsed)}
  className="flex items-center justify-center h-9 w-9 rounded-lg
             text-secondary-400 hover:bg-secondary-800 hover:text-white
             transition-colors mx-auto my-2"
  aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
>
  {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
</button>
```

### User section (bottom of sidebar)
```tsx
<div className="mt-auto border-t border-secondary-800 p-3">
  <div className={cn('flex items-center gap-3', isCollapsed && 'justify-center')}>
    {/* Avatar circle with initials */}
    <div className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center shrink-0 text-white text-sm font-bold">
      {getInitials(currentUser?.display_name)}
    </div>
    {!isCollapsed && (
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white truncate">{currentUser?.display_name}</p>
        <p className="text-xs text-secondary-400 truncate">{currentUser?.email}</p>
      </div>
    )}
    {!isCollapsed && (
      <button onClick={handleLogout} className="text-secondary-400 hover:text-white p-1 rounded">
        <LogOut size={16} />
      </button>
    )}
  </div>
</div>
```

### Persistence
Use `localStorage.getItem('sidebar:collapsed')` to persist the collapsed state. Default: expanded.

---

## TopBar.tsx — Full Specification

```tsx
<header className="h-topbar bg-white border-b border-neutral-200 sticky top-0 z-sticky flex items-center px-4 gap-4">
  {/* Mobile menu trigger */}
  <button className="md:hidden touch-target text-neutral-600 hover:text-neutral-900" onClick={openMobileNav}>
    <Menu size={20} />
  </button>

  {/* Page title — populated via context/prop */}
  <h1 className="text-base font-semibold text-neutral-900 hidden md:block">
    {pageTitle}
  </h1>

  {/* Global search — desktop only */}
  <div className="hidden md:block flex-1 max-w-md ml-4">
    <SearchInput placeholder="Search recipes, ingredients…" />
  </div>

  {/* Spacer */}
  <div className="flex-1 md:flex-none" />

  {/* Actions */}
  <div className="flex items-center gap-2">
    {/* Quick "New Recipe" button */}
    <Link to="/recipes/new">
      <Button size="sm" leftIcon={<Plus size={14} />}>
        New Recipe
      </Button>
    </Link>
  </div>
</header>
```

---

## Layout.tsx — Full Rewrite

```tsx
import React from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { Breadcrumb } from './Breadcrumb'
import { TimerWidget } from './common/TimerWidget'
import { MobileNav } from './MobileNav'
import { useState } from 'react'

interface LayoutProps {
  children: React.ReactNode
  pageTitle?: string
}

export const Layout: React.FC<LayoutProps> = ({ children, pageTitle }) => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden">
      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-toast focus:px-4 focus:py-2 focus:bg-primary-500 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile nav drawer */}
      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar pageTitle={pageTitle} onMobileMenuClick={() => setIsMobileNavOpen(true)} />

        <main id="main-content" className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Breadcrumb />
            <div className="animate-fade-in-up">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Floating timer widget */}
      <TimerWidget />
    </div>
  )
}
```

---

## MobileNav.tsx — Create New File

A slide-in drawer from the left for mobile:

```tsx
interface MobileNavProps {
  isOpen: boolean
  onClose: () => void
}
```

- Overlay: `fixed inset-0 bg-black/50 z-modal` (click to close)
- Drawer: `fixed left-0 top-0 bottom-0 w-72 bg-secondary-900 z-modal shadow-2xl transform transition-transform duration-slow`
- Same nav items as Sidebar but always full-label mode
- Close button (X) in top-right of drawer

---

## Router Integration

In `frontend/src/router/routes.tsx`, read the current route config and wrap each protected route with `<Layout pageTitle="...">`. Pass the appropriate page title for each route:

| Route | pageTitle |
|-------|-----------|
| `/` | `Dashboard` |
| `/recipes` | `My Recipes` |
| `/recipes/new` | `New Recipe` |
| `/recipes/:id` | `Recipe Detail` |
| `/recipes/:id/edit` | `Edit Recipe` |
| `/inventory` | `Inventory` |
| `/costing` | `Costing` |
| `/journal` | `Journal` |
| `/journal/new` | `New Journal Entry` |
| `/settings` | `Settings` |

---

## Breadcrumb.tsx Update

Update Breadcrumb to use the new design tokens:

- Container: `flex items-center gap-1.5 text-sm text-neutral-500 mb-6`
- Separator: `<ChevronRight size={14} className="text-neutral-300" />`
- Link: `hover:text-primary-500 transition-colors`
- Current page: `text-neutral-800 font-medium` (not a link)

---

## Verification

- [ ] Sidebar renders on desktop with all 6 nav items
- [ ] Active route highlights with `bg-primary-500` on the nav item
- [ ] Collapse/expand toggle persists in localStorage
- [ ] Mobile hamburger opens a drawer overlay
- [ ] TopBar shows page title passed from Layout
- [ ] Layout renders `animate-fade-in-up` on page content
- [ ] `TimerWidget` still renders floating bottom-right
- [ ] TypeScript compiles: `cd frontend && npx tsc --noEmit`
