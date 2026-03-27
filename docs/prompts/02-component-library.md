# Prompt 02 — Component Library Standardization

## Objective
Refactor every component in `frontend/src/components/common/` to:
1. Use design token classes exclusively (primary-500, neutral-700, etc.)
2. Fix broken Tailwind class strings (spaces inside class names like `p - 1.5` → `p-1.5`)
3. Import and use the `cn()` utility from `src/utils/cn`
4. Use `lucide-react` icons instead of inline SVGs where possible
5. Ensure every interactive element has `min-h-[44px]` touch targets
6. Add `data-testid` attributes on root elements for testability

**Prerequisite**: Prompt 01 (Design System) must be complete — `tailwind.config.js` must have the full color token definitions and `src/utils/cn.ts` must exist.

---

## Files to Modify (read each file before editing)

- `frontend/src/components/common/Button.tsx`
- `frontend/src/components/common/Card.tsx`
- `frontend/src/components/common/Input.tsx`
- `frontend/src/components/common/Select.tsx`
- `frontend/src/components/common/Badge.tsx`
- `frontend/src/components/common/Modal.tsx`
- `frontend/src/components/common/LoadingSpinner.tsx`
- `frontend/src/components/common/SearchInput.tsx`
- `frontend/src/components/common/EmptyState.tsx`
- `frontend/src/components/common/Toast.tsx`
- `frontend/src/components/common/Skeleton.tsx`
- `frontend/src/components/common/TagInput.tsx`

---

## Component Specifications

### Button.tsx
The current `Button` uses `amber-600` instead of the `primary` design token. Replace with token-based classes.

**Variants**:
| variant | classes |
|---------|---------|
| `primary` | `bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 shadow-primary-sm focus:ring-primary-500` |
| `secondary` | `bg-secondary-500 text-white hover:bg-secondary-600 active:bg-secondary-700 focus:ring-secondary-500` |
| `accent` | `bg-accent-500 text-white hover:bg-accent-600 active:bg-accent-700 focus:ring-accent-500` |
| `outline` | `border-2 border-primary-500 text-primary-500 hover:bg-primary-50 active:bg-primary-100 focus:ring-primary-500 bg-transparent` |
| `ghost` | `bg-transparent text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200 focus:ring-neutral-400` |
| `danger` | `bg-error-DEFAULT text-white hover:bg-red-700 active:bg-red-800 focus:ring-red-500` |

**Sizes**:
| size | classes |
|------|---------|
| `xs` | `px-2.5 py-1.5 text-xs min-h-[32px]` |
| `sm` | `px-3 py-2 text-sm min-h-[36px]` |
| `md` | `px-4 py-2.5 text-sm min-h-[40px]` |
| `lg` | `px-5 py-3 text-base min-h-[44px]` |
| `xl` | `px-6 py-3.5 text-lg min-h-[52px]` |

**Base classes**: `inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-fast focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none`

**Loading state**: Replace the inline SVG with `<Loader2 className="animate-spin" size={16} />` from `lucide-react`.

**New prop**: Add `leftIcon?: React.ReactNode` and `rightIcon?: React.ReactNode` props.

**Full interface**:
```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
  children: React.ReactNode
}
```

---

### Card.tsx
Standardize the card with design token classes and a `variant` prop.

**Variants**:
| variant | classes |
|---------|---------|
| `default` | `bg-white rounded-xl border border-neutral-200 shadow-sm` |
| `elevated` | `bg-white rounded-xl shadow-md` |
| `flat` | `bg-neutral-50 rounded-xl border border-neutral-200` |
| `brand` | `bg-gradient-to-br from-primary-50 to-white rounded-xl border border-primary-100 shadow-sm` |

**Interface**:
```tsx
interface CardProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'elevated' | 'flat' | 'brand'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  interactive?: boolean
  onClick?: () => void
  as?: 'div' | 'article' | 'section' | 'li'
  'aria-label'?: string
  'data-testid'?: string
}
```

---

### Input.tsx
Read the current file and standardize to use form token classes from `globals.css`.

**Interface**:
```tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  loading?: boolean
  'data-testid'?: string
}
```

**Wrapper structure**:
```tsx
<div className="w-full">
  {label && <label className="form-label">{label}</label>}
  <div className="relative">
    {leftIcon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">{leftIcon}</span>}
    <input className={cn('form-input', leftIcon && 'pl-10', rightIcon && 'pr-10', error && 'border-error focus:ring-error focus:border-error', className)} />
    {rightIcon && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">{rightIcon}</span>}
  </div>
  {error && <p className="form-error"><AlertCircle size={12} />{error}</p>}
  {hint && !error && <p className="text-xs text-neutral-500 mt-1">{hint}</p>}
</div>
```

---

### Badge.tsx
Read the current file and ensure it has these variants:

| variant | classes |
|---------|---------|
| `default` | `bg-neutral-100 text-neutral-700` |
| `primary` | `bg-primary-50 text-primary-700 border border-primary-200` |
| `secondary` | `bg-secondary-50 text-secondary-700 border border-secondary-200` |
| `accent` | `bg-accent-50 text-accent-700 border border-accent-200` |
| `success` | `bg-success-light text-success-dark border border-green-200` |
| `warning` | `bg-warning-light text-warning-dark border border-yellow-200` |
| `error` | `bg-error-light text-error-dark border border-red-200` |
| `info` | `bg-info-light text-info-dark border border-blue-200` |

Base: `badge` (uses `.badge` from globals.css component layer)

Add a `dot` prop that renders a colored circle indicator before the text.

---

### LoadingSpinner.tsx
Replace inline SVG with a CSS-animation based spinner using brand colors.

```tsx
import { cn } from '../../utils/cn'

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'secondary' | 'accent' | 'white' | 'current'
  className?: string
  label?: string  // aria-label
}

const sizeMap = {
  xs: 'h-3 w-3 border',
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-[3px]',
  xl: 'h-12 w-12 border-4',
}
const colorMap = {
  primary: 'border-primary-200 border-t-primary-500',
  secondary: 'border-secondary-200 border-t-secondary-500',
  accent: 'border-accent-200 border-t-accent-500',
  white: 'border-white/30 border-t-white',
  current: 'border-current/20 border-t-current',
}

export const LoadingSpinner = ({ size = 'md', color = 'primary', className, label = 'Loading...' }) => (
  <div
    role="status"
    aria-label={label}
    className={cn('inline-block rounded-full animate-spin', sizeMap[size], colorMap[color], className)}
  />
)
```

---

### EmptyState.tsx
Standardize the empty state layout:

```tsx
interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    icon?: React.ReactNode
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  className?: string
}
```

Layout structure: centered column, `py-16`, icon at 56px, title in `text-xl font-semibold text-neutral-800`, description in `text-sm text-neutral-500`, action button using `Button` with `variant="primary"`.

---

### SearchInput.tsx
Add a clear button (X icon from lucide-react) when there's a value, and ensure loading state shows `LoadingSpinner` on the right side.

```tsx
interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  onSearch?: (value: string) => void
  placeholder?: string
  debounceMs?: number
  loading?: boolean
  className?: string
  autoFocus?: boolean
}
```

---

### Modal.tsx
Ensure the modal uses `scale-in` animation on open, proper focus trap, and consistent header/body/footer padding.

```tsx
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  children: React.ReactNode
  footer?: React.ReactNode
  showCloseButton?: boolean
  closeOnOverlayClick?: boolean
}
```

Size map:
- `sm`: `max-w-sm`
- `md`: `max-w-md`
- `lg`: `max-w-lg`
- `xl`: `max-w-2xl`
- `full`: `max-w-4xl`

Overlay: `fixed inset-0 bg-black/50 backdrop-blur-sm z-modal flex items-center justify-center p-4`
Panel: `card-elevated w-full animate-scale-in max-h-[90vh] flex flex-col`

---

### Skeleton.tsx
Use the `.skeleton` class from globals.css. Provide `SkeletonText`, `SkeletonCard`, `SkeletonAvatar` pre-built variants:

```tsx
// Base
export const Skeleton = ({ className }: { className?: string }) =>
  <div className={cn('skeleton', className)} />

// Text line
export const SkeletonText = ({ lines = 3 }: { lines?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className={cn('h-4 rounded', i === lines - 1 ? 'w-3/4' : 'w-full')} />
    ))}
  </div>
)

// Recipe card skeleton
export const SkeletonCard = () => (
  <div className="card overflow-hidden animate-pulse">
    <Skeleton className="aspect-video w-full rounded-none" />
    <div className="p-4 space-y-2">
      <Skeleton className="h-5 w-3/4 rounded" />
      <SkeletonText lines={2} />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  </div>
)

// Avatar
export const SkeletonAvatar = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeMap = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-12 w-12' }
  return <Skeleton className={cn('rounded-full', sizeMap[size])} />
}
```

---

## Global Rules for All Components

1. **Import order**: React, then libraries, then local `cn`, then types
2. **No inline SVGs** — use lucide-react equivalents
3. **No hardcoded color values** — use token classes
4. **cn() for all className merging** — replace template literals
5. **Every file must export a single named component** — no default exports
6. **data-testid on root element**: `data-testid={props['data-testid'] || 'component-name'}`

---

## Verification

After all files are updated, verify:
- [ ] No `amber-` color classes remain in any component file (replaced with `accent-` or `primary-`)
- [ ] No inline `<svg>` elements remain — all replaced with lucide-react
- [ ] No class strings with spaces like `p - 1.5` (these are broken)
- [ ] All components import `cn` from `../../utils/cn`
- [ ] TypeScript compiles: `cd frontend && npx tsc --noEmit`
